#!/usr/bin/env python3
"""Pull approved Fragments release assets and update only the Fragments API/web."""

from __future__ import annotations

try:
    import fcntl
except ImportError:  # Test parsing and validation on Windows; production runs Linux ARM64.
    fcntl = None
import gzip
import hashlib
import json
import os
import re
import sqlite3
import stat
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


OWNER = "VGMil-dev"
REPOSITORY = "fragments"
REPOSITORY_ID = 1214734354
WORKFLOW_PATH = ".github/workflows/release.yml"
PUBLISH_JOB = "publish-approved-release"
TAG_PATTERN = re.compile(r"^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")
SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")
API_ROOT = f"https://api.github.com/repos/{OWNER}/{REPOSITORY}"
REPO_URL = f"https://github.com/{OWNER}/{REPOSITORY}.git"
USER_AGENT = "fragments-release-agent/1"
MAX_ARCHIVE_SIZE = 2_000_000_000
MAX_MANIFEST_SIZE = 1_000_000
MAX_ATTESTATION_BUNDLE_SIZE = 1_000_000
MAX_TRUSTED_ROOT_SIZE = 512_000
ATTESTATION_ASSET_NAME = "fragments-images.attestation.jsonl"


class AgentError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def request_json(url: str, max_bytes: int = 5_000_000) -> dict | list:
    if not url.startswith("https://api.github.com/"):
        raise AgentError("API URL fuera de api.github.com.")
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2026-03-10"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read(max_bytes + 1)
    except (urllib.error.URLError, TimeoutError) as error:
        raise AgentError("No se pudo consultar la API pública de GitHub.") from error
    if len(body) > max_bytes:
        raise AgentError("La respuesta de GitHub excede el tamaño permitido.")
    try:
        return json.loads(body)
    except json.JSONDecodeError as error:
        raise AgentError("GitHub devolvió JSON inválido.") from error


def require_tag(tag: object) -> str:
    if not isinstance(tag, str) or not TAG_PATTERN.fullmatch(tag):
        raise AgentError("La publicación no tiene una tag vMAJOR.MINOR.PATCH válida.")
    return tag


def require_sha(value: object, field: str) -> str:
    if not isinstance(value, str) or not SHA_PATTERN.fullmatch(value):
        raise AgentError(f"{field} no es un SHA-1 completo válido.")
    return value


def validate_release_run(run: dict, jobs: dict, manifest: dict, release_tag: str) -> None:
    sha = require_sha(manifest.get("commit"), "commit")
    run_id = str(manifest.get("runId", ""))
    expected_path = WORKFLOW_PATH
    actual_path = run.get("path", "")
    if not (actual_path == expected_path or actual_path.startswith(expected_path + "@")):
        raise AgentError("La ejecución no procede del workflow confiable de releases.")
    if run.get("event") != "push" or run.get("head_branch") != release_tag or run.get("head_sha") != sha:
        raise AgentError("La ejecución no coincide con el evento, tag y SHA publicados.")
    if run.get("status") != "completed" or run.get("conclusion") != "success":
        raise AgentError("El workflow de release no terminó correctamente.")
    if str(run.get("id")) != run_id or run.get("repository", {}).get("id") != REPOSITORY_ID:
        raise AgentError("La ejecución de Actions no pertenece al repositorio o ID esperado.")
    job_list = jobs.get("jobs")
    if not isinstance(job_list, list):
        raise AgentError("No se pudo verificar la lista de jobs del workflow.")
    publish = [job for job in job_list if job.get("name") == PUBLISH_JOB]
    if len(publish) != 1 or publish[0].get("status") != "completed" or publish[0].get("conclusion") != "success":
        raise AgentError("El job de publicación aprobada no terminó correctamente.")


def validate_manifest(manifest: dict, release: dict) -> tuple[str, str, str, str]:
    tag = require_tag(release.get("tag_name"))
    if manifest.get("schemaVersion") != 1 or manifest.get("repository") != f"{OWNER}/{REPOSITORY}" or manifest.get("repositoryId") != REPOSITORY_ID:
        raise AgentError("El manifiesto no identifica este repositorio y esquema.")
    if manifest.get("tag") != tag or manifest.get("platform") != "linux/arm64":
        raise AgentError("La tag o plataforma del manifiesto no coincide con el release.")
    tag_object = require_sha(manifest.get("tagObject"), "tagObject")
    commit = require_sha(manifest.get("commit"), "commit")
    digest = manifest.get("archiveSha256")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise AgentError("El hash SHA-256 del archivo de imágenes no es válido.")
    images = manifest.get("images")
    if images != {"api": f"fragments-api:sha-{commit}", "web": f"fragments-web:sha-{commit}"}:
        raise AgentError("Las referencias de imágenes no corresponden al SHA del release.")
    if manifest.get("archiveName") != "fragments-images.tar.gz":
        raise AgentError("Nombre de archivo de imágenes no permitido.")
    return tag, tag_object, commit, digest


def run_checked(arguments: list[str], timeout: int = 600, input_text: str | None = None) -> str:
    environment = {
        "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_TERMINAL_PROMPT": "0",
        "DOCKER_CONFIG": "/var/lib/fragments-release/docker-config",
        "GH_CONFIG_DIR": "/var/lib/fragments-release/gh-empty",
        "GH_PROMPT_DISABLED": "1",
    }
    try:
        result = subprocess.run(arguments, input=input_text, text=True, capture_output=True, timeout=timeout, env=environment, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise AgentError(f"No se pudo ejecutar {Path(arguments[0]).name}.") from error
    if result.returncode != 0:
        raise AgentError(f"{Path(arguments[0]).name} terminó con código {result.returncode}.")
    return result.stdout.strip()


def verify_git_source(git_directory: Path, tag: str, tag_object: str, commit: str) -> None:
    if not git_directory.exists():
        run_checked(["git", "init", "--bare", str(git_directory)])
        run_checked(["git", "--git-dir", str(git_directory), "remote", "add", "origin", REPO_URL])
    remote = run_checked(["git", "--git-dir", str(git_directory), "remote", "get-url", "origin"])
    if remote != REPO_URL:
        raise AgentError("El repositorio bare no tiene el origen fijado esperado.")
    tag_ref = f"refs/tags/{tag}"
    run_checked([
        "git", "--git-dir", str(git_directory), "fetch", "--no-tags", "origin",
        "+refs/heads/main:refs/remotes/origin/main", f"{tag_ref}:{tag_ref}",
    ])
    if run_checked(["git", "--git-dir", str(git_directory), "cat-file", "-t", tag_ref]) != "tag":
        raise AgentError("La tag remota no es anotada.")
    if run_checked(["git", "--git-dir", str(git_directory), "rev-parse", tag_ref]) != tag_object:
        raise AgentError("El objeto tag remoto no coincide con el manifiesto aprobado.")
    if run_checked(["git", "--git-dir", str(git_directory), "rev-parse", f"{tag_ref}^{{commit}}"]) != commit:
        raise AgentError("La tag no apunta al SHA aprobado.")
    run_checked(["git", "--git-dir", str(git_directory), "merge-base", "--is-ancestor", commit, "refs/remotes/origin/main"])
    release_workflow = run_checked(["git", "--git-dir", str(git_directory), "rev-parse", f"{tag_ref}^{{commit}}:{WORKFLOW_PATH}"])
    trusted_workflow = run_checked(["git", "--git-dir", str(git_directory), "rev-parse", f"refs/remotes/origin/main:{WORKFLOW_PATH}"])
    if release_workflow != trusted_workflow:
        raise AgentError("El workflow de la tag no coincide con el workflow confiable actual de main.")


def _github_asset_opener() -> urllib.request.OpenerDirector:
    class GitHubAssetRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, request, response, code, message, headers, new_url):
            parsed = urllib.parse.urlparse(new_url)
            host = (parsed.hostname or "").lower()
            permitted = host in {"github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"} or host.endswith(".githubusercontent.com") or host.endswith(".amazonaws.com")
            if parsed.scheme != "https" or not permitted:
                raise AgentError("La descarga salió de los dominios HTTPS permitidos de GitHub.")
            return super().redirect_request(request, response, code, message, headers, new_url)

    return urllib.request.build_opener(GitHubAssetRedirect())


def download_asset(asset: dict, destination: Path, maximum_size: int = MAX_ARCHIVE_SIZE) -> None:
    url = asset.get("browser_download_url", "")
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "github.com" or not parsed.path.startswith(f"/{OWNER}/{REPOSITORY}/releases/download/") or not isinstance(asset.get("size"), int) or not 0 < asset["size"] <= maximum_size:
        raise AgentError("La URL o el tamaño del asset no está permitido.")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/octet-stream"})
    if destination.is_symlink():
        raise AgentError("El destino del asset no puede ser un enlace simbólico.")
    partial = destination.with_name(destination.name + ".partial")
    partial.unlink(missing_ok=True)
    total = 0
    opener = _github_asset_opener()
    try:
        with opener.open(request, timeout=60) as response, partial.open("xb") as output:
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > maximum_size:
                    raise AgentError("El asset excedió el tamaño máximo.")
                output.write(chunk)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        partial.unlink(missing_ok=True)
        raise AgentError("No se pudo descargar el asset público de GitHub.") from error
    except AgentError:
        partial.unlink(missing_ok=True)
        raise
    if total != asset.get("size"):
        partial.unlink(missing_ok=True)
        raise AgentError("El tamaño descargado no coincide con la API de GitHub.")
    os.chmod(partial, 0o600)
    os.replace(partial, destination)


def find_asset(release: dict, name: str) -> dict:
    matches = [asset for asset in release.get("assets", []) if asset.get("name") == name and asset.get("state") == "uploaded"]
    if len(matches) != 1:
        raise AgentError(f"El release debe tener exactamente un asset {name}.")
    return matches[0]


def find_optional_asset(release: dict, name: str) -> dict | None:
    matches = [asset for asset in release.get("assets", []) if asset.get("name") == name and asset.get("state") == "uploaded"]
    if len(matches) > 1:
        raise AgentError(f"El release no puede repetir el asset {name}.")
    return matches[0] if matches else None


def validate_bundle_file(path: Path, *, require_root_owned: bool = False) -> None:
    try:
        info = path.lstat()
    except OSError as error:
        raise AgentError("Falta el bundle de atestación Sigstore requerido.") from error
    if not stat.S_ISREG(info.st_mode) or info.st_size <= 0 or info.st_size > MAX_ATTESTATION_BUNDLE_SIZE:
        raise AgentError("El bundle de atestación no es un archivo regular de tamaño permitido.")
    if os.name == "posix" and (info.st_mode & 0o077 or (require_root_owned and info.st_uid != 0)):
        raise AgentError("El bundle local debe ser privado y estar bajo control de root.")
    try:
        contents = path.read_text(encoding="utf-8")
        try:
            parsed = json.loads(contents)
            if isinstance(parsed, dict):
                parsed = [parsed]
        except json.JSONDecodeError:
            parsed = [json.loads(line) for line in contents.splitlines() if line.strip()]
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AgentError("El bundle de atestación no contiene JSON válido.") from error
    if not parsed or any(not isinstance(item, dict) for item in parsed):
        raise AgentError("El bundle de atestación está vacío o tiene una estructura inválida.")


def ensure_archive_available(asset: dict, destination: Path, expected_digest: str) -> None:
    size = asset.get("size")
    if type(size) is not int or not 0 < size <= MAX_ARCHIVE_SIZE:
        raise AgentError("El tamaño del paquete de imágenes no está permitido.")
    if destination.is_symlink():
        raise AgentError("El paquete en caché no puede ser un enlace simbólico.")
    if destination.exists():
        info = destination.stat()
        if not stat.S_ISREG(info.st_mode):
            raise AgentError("El paquete en caché no es un archivo regular.")
        if info.st_size == asset.get("size") and sha256_file(destination) == expected_digest:
            return
        destination.unlink()
    download_asset(asset, destination)
    if sha256_file(destination) != expected_digest:
        destination.unlink(missing_ok=True)
        raise AgentError("El paquete descargado no coincide con el digest del manifiesto aprobado.")


def refresh_trusted_root(state_dir: Path) -> Path:
    output = run_checked(["gh", "attestation", "trusted-root"], timeout=300)
    encoded = (output + "\n").encode("utf-8")
    if not output or len(encoded) > MAX_TRUSTED_ROOT_SIZE:
        raise AgentError("GitHub CLI no devolvió un trust root Sigstore acotado.")
    try:
        roots = [json.loads(line) for line in output.splitlines() if line.strip()]
    except json.JSONDecodeError as error:
        raise AgentError("El trust root Sigstore devuelto por GitHub CLI no es JSONL válido.") from error
    if not roots or any(not isinstance(root, dict) or root.get("mediaType") != "application/vnd.dev.sigstore.trustedroot+json;version=0.1" for root in roots):
        raise AgentError("El trust root Sigstore tiene un formato no esperado.")
    path = state_dir / "trusted_root.jsonl"
    if path.is_symlink():
        raise AgentError("El trust root persistente no puede ser un enlace simbólico.")
    temporary = state_dir / f"trusted_root-{os.getpid()}.tmp"
    try:
        with temporary.open("x", encoding="utf-8") as output_file:
            output_file.write(output + "\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    return path


def read_ledger(path: Path) -> dict:
    if not path.exists():
        raise AgentError("Falta el ledger persistente inicializado; se detiene sin desplegar.")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schemaVersion") != 1 or not isinstance(data.get("releases"), list):
        raise AgentError("El ledger persistente no tiene el formato esperado.")
    return data


def write_ledger(path: Path, data: dict) -> None:
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)


def ledger_contains(ledger: dict, tag: str, commit: str, release_id: int) -> bool:
    return any(
        item.get("tag") == tag or item.get("commit") == commit or item.get("releaseId") == release_id
        for item in ledger["releases"]
    )


def image_info(image: str) -> dict:
    output = run_checked(["docker", "image", "inspect", image])
    try:
        details = json.loads(output)[0]
    except (json.JSONDecodeError, IndexError, TypeError) as error:
        raise AgentError("Docker no devolvió metadata válida de la imagen.") from error
    config = details.get("Config", {})
    return {
        "id": details.get("Id"),
        "architecture": details.get("Architecture"),
        "version": config.get("Labels", {}).get("org.opencontainers.image.version"),
        "revision": config.get("Labels", {}).get("org.opencontainers.image.revision"),
    }


def container_snapshot() -> dict:
    output = run_checked(["docker", "ps", "--no-trunc", "--format", "{{.ID}}|{{.Names}}"])
    result: dict[str, dict] = {}
    for line in output.splitlines():
        container_id, name = line.split("|", 1)
        if name.startswith("pits") or name.startswith("postgres"):
            state = run_checked(["docker", "inspect", "--format", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}", name])
            result[name] = {"id": container_id, "state": state}
    return result


def container_image(container: str) -> str:
    return run_checked(["docker", "inspect", "--format", "{{.Config.Image}}", container])


def fragments_data_volume() -> str:
    output = run_checked(["docker", "inspect", "--format", "{{json .Mounts}}", "fragments-api-1"])
    mounts = json.loads(output)
    data_mount = [mount for mount in mounts if mount.get("Destination") == "/app/data"]
    if len(data_mount) != 1 or data_mount[0].get("Type") != "volume":
        raise AgentError("No se confirmó el volumen SQLite persistente de Fragments.")
    return data_mount[0].get("Name", "")


def container_health(container: str) -> tuple[str, str, str]:
    output = run_checked(["docker", "inspect", "--format", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.Config.Image}}", container])
    return tuple(output.split("|", 2))


def wait_for_health(tag: str, sha: str, previous_images: dict[str, str], rollback: bool = False) -> None:
    expected_version = None if rollback else tag
    expected_sha = None if rollback else sha
    deadline = time.monotonic() + 180
    last_error = "aún no está saludable"
    while time.monotonic() < deadline:
        try:
            api = container_health("fragments-api-1")
            web = container_health("fragments-web-1")
            if api[0] == web[0] == "running" and api[1] == web[1] == "healthy":
                for container, observed in (("fragments-api-1", api), ("fragments-web-1", web)):
                    info = image_info(observed[2])
                    if expected_version is not None and (info["version"], info["revision"], info["architecture"]) != (expected_version, expected_sha, "arm64"):
                        raise AgentError("Labels o arquitectura del contenedor nuevo no coinciden con el release.")
                    if rollback and observed[2] != previous_images[container]:
                        raise AgentError("Rollback no restauró la referencia de imagen previa.")
                status = subprocess.run(["curl", "--silent", "--show-error", "--output", "/dev/null", "--write-out", "%{http_code}", "http://127.0.0.1:3001/health"], capture_output=True, text=True, timeout=10, check=False)
                if status.returncode == 0 and status.stdout.strip() == "200":
                    return
                last_error = "el endpoint local no devolvió HTTP 200"
        except (AgentError, subprocess.SubprocessError, OSError) as error:
            last_error = str(error)
        time.sleep(5)
    raise AgentError(f"Healthcheck de Fragments agotó 180 segundos: {last_error}")


def compose_override(
    state_dir: Path,
    api_image: str,
    web_image: str,
    api_version: str,
    api_sha: str,
    web_version: str | None = None,
    web_sha: str | None = None,
) -> Path:
    web_version = api_version if web_version is None else web_version
    web_sha = api_sha if web_sha is None else web_sha
    if not re.fullmatch(r"v?[0-9A-Za-z.+-]{1,64}", api_version + "x") or not SHA_PATTERN.fullmatch(api_sha):
        raise AgentError("Metadata de override API inválida.")
    if not re.fullmatch(r"v?[0-9A-Za-z.+-]{1,64}", web_version + "x") or not SHA_PATTERN.fullmatch(web_sha):
        raise AgentError("Metadata de override web inválida.")
    if not re.fullmatch(r"fragments-api:[A-Za-z0-9_.-]{1,128}", api_image) or not re.fullmatch(r"fragments-web:[A-Za-z0-9_.-]{1,128}", web_image):
        raise AgentError("Referencia de imagen fuera del espacio de nombres Fragments.")
    content = (
        "services:\n"
        "  api:\n"
        f"    image: {api_image}\n"
        "    labels:\n"
        f"      org.opencontainers.image.version: \"{api_version}\"\n"
        f"      org.opencontainers.image.revision: \"{api_sha}\"\n"
        "  web:\n"
        f"    image: {web_image}\n"
        "    labels:\n"
        f"      org.opencontainers.image.version: \"{web_version}\"\n"
        f"      org.opencontainers.image.revision: \"{web_sha}\"\n"
    )
    path = state_dir / "release-override.yml"
    temporary = path.with_suffix(".tmp")
    temporary.write_text(content, encoding="utf-8")
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)
    return path


def compose_up(config: dict, override: Path) -> None:
    run_checked([
        "docker", "compose", "--project-directory", config["composeDirectory"],
        "-f", config["composeFile"], "-f", str(override),
        "up", "-d", "--no-build", "--no-deps", "api", "web",
    ], timeout=300)


def integrity_check_backup(config: dict, existing: set[str]) -> dict:
    run_checked(["systemctl", "start", "fragments-backup.service"], timeout=300)
    candidates = [path for path in Path(config["backupDirectory"]).glob("fragments-*.sqlite") if path.is_file() and str(path) not in existing]
    if not candidates:
        raise AgentError("El servicio de backup no produjo un snapshot nuevo.")
    backup = max(candidates, key=lambda path: path.stat().st_mtime_ns)
    info = backup.stat()
    if info.st_uid != 0 or info.st_mode & 0o077:
        raise AgentError("El snapshot no tiene propietario root ni permisos privados.")
    uri = f"file:{urllib.parse.quote(str(backup))}?mode=ro"
    database = None
    try:
        database = sqlite3.connect(uri, uri=True, timeout=10)
        result = database.execute("PRAGMA integrity_check").fetchone()
    except sqlite3.Error as error:
        raise AgentError("No se pudo validar la integridad del backup SQLite.") from error
    finally:
        if database is not None:
            database.close()
    if result != ("ok",):
        raise AgentError("PRAGMA integrity_check del backup no devolvió ok.")
    digest = hashlib.sha256(backup.read_bytes()).hexdigest()
    return {"file": backup.name, "bytes": info.st_size, "sha256": digest, "integrity": "ok"}


def get_release_assets(release_id: int, config: dict, state_dir: Path) -> tuple[dict, dict, dict, Path, Path]:
    release = request_json(f"{API_ROOT}/releases/{release_id}")
    if release.get("id") != release_id or release.get("draft") or release.get("prerelease"):
        raise AgentError("El release solicitado no es una publicación estable.")
    if release.get("author", {}).get("login") != "github-actions[bot]":
        raise AgentError("El release no fue publicado por el job aprobado de GitHub Actions.")
    tag = require_tag(release.get("tag_name"))
    manifest_asset = find_asset(release, "release-manifest.json")
    archive_asset = find_asset(release, "fragments-images.tar.gz")
    attestation_asset = find_optional_asset(release, ATTESTATION_ASSET_NAME)
    if archive_asset.get("size", MAX_ARCHIVE_SIZE + 1) > MAX_ARCHIVE_SIZE:
        raise AgentError("El paquete ARM64 excede el tamaño permitido.")
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    manifest_path = state_dir / f"incoming-{release_id}-manifest.json"
    archive_path = state_dir / f"incoming-{release_id}-images.tar.gz"
    download_asset(manifest_asset, manifest_path, MAX_MANIFEST_SIZE)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_tag, tag_object, commit, expected_digest = validate_manifest(manifest, release)
    if expected_tag != tag or archive_asset.get("size", MAX_ARCHIVE_SIZE + 1) > MAX_ARCHIVE_SIZE:
        raise AgentError("El asset de imágenes no coincide con la tag o el límite aprobado.")
    if manifest.get("runId") != str(manifest.get("runId", "")) or not str(manifest.get("runId", "")).isdigit():
        raise AgentError("El manifiesto no tiene un ID numérico de workflow.")
    run_id = int(manifest["runId"])
    run = request_json(f"{API_ROOT}/actions/runs/{run_id}")
    jobs = request_json(f"{API_ROOT}/actions/runs/{run_id}/jobs?per_page=100")
    validate_release_run(run, jobs, manifest, tag)
    if attestation_asset is not None:
        attestation_path = state_dir / f"incoming-{release_id}-attestation.jsonl"
        download_asset(attestation_asset, attestation_path, MAX_ATTESTATION_BUNDLE_SIZE)
        validate_bundle_file(attestation_path)
    else:
        attestation_path = state_dir / "attestations" / f"{release_id}.jsonl"
        validate_bundle_file(attestation_path, require_root_owned=True)
    return manifest, release, archive_asset, archive_path, attestation_path


def load_archive(archive_path: Path, images: dict[str, str], tag: str, commit: str) -> None:
    try:
        with gzip.open(archive_path, "rb") as image_stream:
            subprocess.run(
                ["docker", "load"], stdin=image_stream, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=600, check=True,
                env={
                    "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                    "LANG": "C.UTF-8",
                    "DOCKER_CONFIG": "/var/lib/fragments-release/docker-config",
                },
            )
    except (OSError, subprocess.SubprocessError) as error:
        raise AgentError("Docker no pudo cargar el paquete de imágenes verificado.") from error
    for image_name in ("api", "web"):
        info = image_info(images[image_name])
        if (info["architecture"], info["version"], info["revision"]) != ("arm64", tag, commit):
            raise AgentError("Labels o arquitectura de imagen no coinciden con la metadata aprobada.")


def verify_attestation(archive_path: Path, tag: str, commit: str, run_id: int, expected_digest: str, bundle_path: Path, state_dir: Path) -> None:
    if sha256_file(archive_path) != expected_digest:
        raise AgentError("El digest del archivo no coincide con el manifiesto aprobado.")
    validate_bundle_file(bundle_path, require_root_owned=bundle_path.parent.name == "attestations")
    trusted_root_path = refresh_trusted_root(state_dir)
    signer = f"{OWNER}/{REPOSITORY}/{WORKFLOW_PATH}"
    output = run_checked([
        "gh", "attestation", "verify", str(archive_path),
        "--repo", f"{OWNER}/{REPOSITORY}",
        "--signer-workflow", signer,
        "--signer-digest", commit,
        "--source-ref", f"refs/tags/{tag}",
        "--source-digest", commit,
        "--bundle", str(bundle_path),
        "--custom-trusted-root", str(trusted_root_path),
        "--deny-self-hosted-runners",
        "--format", "json",
    ], timeout=300)
    try:
        verified = json.loads(output)
    except json.JSONDecodeError as error:
        raise AgentError("GitHub CLI no devolvió una atestación verificable en JSON.") from error
    if not isinstance(verified, list) or not verified:
        raise AgentError("El archivo no tiene una atestación GitHub válida.")
    invocation_prefix = f"https://github.com/{OWNER}/{REPOSITORY}/actions/runs/{run_id}/attempts/"
    def matches_expected_policy(item: object) -> bool:
        if not isinstance(item, dict):
            return False
        result = item.get("verificationResult", {})
        if not isinstance(result, dict):
            return False
        signature = result.get("signature")
        if not isinstance(signature, dict):
            return False
        certificate = signature.get("certificate")
        timestamps = result.get("verifiedTimestamps")
        statement = result.get("statement")
        identity = result.get("verifiedIdentity")
        if not isinstance(certificate, dict) or not isinstance(timestamps, list) or not timestamps or not isinstance(statement, dict):
            return False
        if not isinstance(identity, dict) or not isinstance(statement.get("subject"), list):
            return False
        subjects = statement["subject"]
        required_certificate = {
            "issuer": "https://token.actions.githubusercontent.com",
            "sourceRepositoryURI": f"https://github.com/{OWNER}/{REPOSITORY}",
            "buildSignerURI": f"https://github.com/{OWNER}/{REPOSITORY}/{WORKFLOW_PATH}@refs/tags/{tag}",
            "githubWorkflowRepository": f"{OWNER}/{REPOSITORY}",
            "githubWorkflowTrigger": "push",
            "githubWorkflowRef": f"refs/tags/{tag}",
            "githubWorkflowSHA": commit,
            "sourceRepositoryIdentifier": str(REPOSITORY_ID),
            "sourceRepositoryDigest": commit,
            "sourceRepositoryRef": f"refs/tags/{tag}",
            "runnerEnvironment": "github-hosted",
        }
        if any(certificate.get(key) != value for key, value in required_certificate.items()) or identity.get("runnerEnvironment") != "github-hosted":
            return False
        invocation = certificate.get("runInvocationURI", "")
        if not isinstance(invocation, str) or not re.fullmatch(re.escape(invocation_prefix) + r"[1-9][0-9]*", invocation):
            return False
        return statement.get("predicateType") == "https://slsa.dev/provenance/v1" and any(
            subject.get("name") == "fragments-images.tar.gz"
            and subject.get("digest", {}).get("sha256") == expected_digest
            for subject in subjects if isinstance(subject, dict)
        )
    if not any(matches_expected_policy(item) for item in verified):
        raise AgentError("La atestación válida no enlaza archivo, workflow, tag, commit, runner y ejecución aprobados.")


def image_refs_for_running() -> dict[str, str]:
    return {"fragments-api-1": container_image("fragments-api-1"), "fragments-web-1": container_image("fragments-web-1")}


def process_release(release_id: int, config: dict) -> None:
    state_dir = Path(config["stateDirectory"])
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    if fcntl is None:
        raise AgentError("El mecanismo de exclusión flock requiere Linux.")
    with (state_dir / "agent.lock").open("a", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        ledger_path = Path(config["ledgerPath"])
        ledger = read_ledger(ledger_path)
        manifest, release, archive_asset, archive_path, attestation_path = get_release_assets(release_id, config, state_dir)
        tag, tag_object, commit, archive_digest = validate_manifest(manifest, release)
        if ledger_contains(ledger, tag, commit, release_id):
            raise AgentError("Tag, SHA o releaseId ya aparece en el ledger; se rechaza la repetición.")

        run_id = int(manifest["runId"])
        run = request_json(f"{API_ROOT}/actions/runs/{run_id}")
        jobs = request_json(f"{API_ROOT}/actions/runs/{run_id}/jobs?per_page=100")
        validate_release_run(run, jobs, manifest, tag)
        verify_git_source(Path(config["gitDirectory"]), tag, tag_object, commit)
        ensure_archive_available(archive_asset, archive_path, archive_digest)
        verify_attestation(archive_path, tag, commit, run_id, archive_digest, attestation_path, state_dir)
        load_archive(archive_path, manifest["images"], tag, commit)

        images = manifest["images"]

        before_neighbors = container_snapshot()
        previous_images = image_refs_for_running()
        previous_volume = fragments_data_volume()
        if not previous_volume:
            raise AgentError("El volumen persistente no tiene nombre verificable.")
        for container in ("fragments-api-1", "fragments-web-1"):
            if container_health(container)[1] != "healthy":
                raise AgentError("El servicio previo de Fragments no está saludable; se cancela el cambio.")

        record = {
            "releaseId": release_id,
            "tag": tag,
            "tagObject": tag_object,
            "commit": commit,
            "status": "deploying",
            "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "previousImages": previous_images,
        }
        ledger["releases"].append(record)
        write_ledger(ledger_path, ledger)

        deployment_started = False
        try:
            existing_backups = {str(path) for path in Path(config["backupDirectory"]).glob("fragments-*.sqlite")}
            backup = integrity_check_backup(config, existing_backups)
            record["backup"] = backup
            write_ledger(ledger_path, ledger)

            override = compose_override(state_dir, images["api"], images["web"], tag, commit)
            run_checked(["docker", "compose", "--project-directory", config["composeDirectory"], "-f", config["composeFile"], "-f", str(override), "config", "--quiet"], timeout=60)
            deployment_started = True
            compose_up(config, override)
            wait_for_health(tag, commit, previous_images)
            if fragments_data_volume() != previous_volume:
                raise AgentError("El volumen SQLite cambió durante el despliegue.")
            if container_snapshot() != before_neighbors:
                raise AgentError("Cambió el estado o la identidad de un contenedor vecino.")
            for url, expected in (("http://127.0.0.1:8081/", "200"),):
                check = subprocess.run(["curl", "--silent", "--show-error", "--output", "/dev/null", "--write-out", "%{http_code}", url], capture_output=True, text=True, timeout=10, check=False)
                if check.returncode != 0 or check.stdout.strip() != expected:
                    raise AgentError("La comprobación local del servicio vecino no pasó.")
            record["status"] = "deployed"
            record["completedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            write_ledger(ledger_path, ledger)
            print(f"release_deployed tag={tag} commit={commit} api={images['api']} web={images['web']} backup_sha256={backup['sha256']}")
        except Exception as error:
            if deployment_started:
                try:
                    old_api = image_info(previous_images["fragments-api-1"])
                    old_web = image_info(previous_images["fragments-web-1"])
                    rollback_override = compose_override(
                        state_dir, previous_images["fragments-api-1"], previous_images["fragments-web-1"],
                        old_api["version"], old_api["revision"], old_web["version"], old_web["revision"],
                    )
                    compose_up(config, rollback_override)
                    wait_for_health(tag, commit, previous_images, rollback=True)
                    record["status"] = "rolled_back"
                    record["rollback"] = "code_images_restored_database_untouched"
                except Exception:
                    record["status"] = "rollback_failed"
                    record["rollback"] = "manual_intervention_required"
            else:
                record["status"] = "failed_before_change"
            record["failure"] = type(error).__name__
            record["completedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            write_ledger(ledger_path, ledger)
            raise
        finally:
            archive_path.unlink(missing_ok=True)
            (state_dir / f"incoming-{release_id}-manifest.json").unlink(missing_ok=True)
            if attestation_path.parent == state_dir and attestation_path.name == f"incoming-{release_id}-attestation.jsonl":
                attestation_path.unlink(missing_ok=True)


def rollback_latest(config: dict) -> None:
    if fcntl is None:
        raise AgentError("El mecanismo de exclusión flock requiere Linux.")
    state_dir = Path(config["stateDirectory"])
    with (state_dir / "agent.lock").open("a", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        ledger = read_ledger(Path(config["ledgerPath"]))
        candidates = [item for item in ledger["releases"] if item.get("status") in {"deployed", "rollback_failed"}]
        if not candidates:
            raise AgentError("No hay un release desplegado con imágenes previas registradas para revertir.")
        record = candidates[-1]
        previous_images = record.get("previousImages")
        if not isinstance(previous_images, dict) or set(previous_images) != {"fragments-api-1", "fragments-web-1"}:
            raise AgentError("El ledger no conserva las dos referencias de imagen anteriores.")
        current_volume = fragments_data_volume()
        before_neighbors = container_snapshot()
        api_info = image_info(previous_images["fragments-api-1"])
        web_info = image_info(previous_images["fragments-web-1"])
        override = compose_override(
            state_dir,
            previous_images["fragments-api-1"],
            previous_images["fragments-web-1"],
            str(api_info["version"]),
            str(api_info["revision"]),
            str(web_info["version"]),
            str(web_info["revision"]),
        )
        run_checked([
            "docker", "compose", "--project-directory", config["composeDirectory"],
            "-f", config["composeFile"], "-f", str(override), "config", "--quiet",
        ], timeout=60)
        try:
            compose_up(config, override)
            wait_for_health(record["tag"], record["commit"], previous_images, rollback=True)
            if fragments_data_volume() != current_volume or container_snapshot() != before_neighbors:
                raise AgentError("La verificación posterior encontró cambios en SQLite o un servicio vecino.")
            record["status"] = "rolled_back_manual"
            record["rollback"] = "code_images_restored_database_untouched"
            record["rollbackCompletedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            write_ledger(Path(config["ledgerPath"]), ledger)
            print(f"release_rollback tag={record['tag']} commit={record['commit']} status=ok database=untouched")
        except Exception:
            record["status"] = "rollback_failed"
            record["rollback"] = "manual_intervention_required"
            write_ledger(Path(config["ledgerPath"]), ledger)
            raise


def load_config(path: str) -> dict:
    config = json.loads(Path(path).read_text(encoding="utf-8"))
    required = ("stateDirectory", "ledgerPath", "gitDirectory", "backupDirectory", "composeDirectory", "composeFile", "requestDirectory")
    if any(not isinstance(config.get(key), str) or not config[key] for key in required):
        raise AgentError("Falta configuración requerida del agente.")
    return config


def poll(config: dict) -> None:
    request_directory = Path(config["requestDirectory"])
    ledger_path = Path(config["ledgerPath"])
    ledger = read_ledger(Path(config["ledgerPath"]))
    request_directory.mkdir(parents=True, exist_ok=True, mode=0o730)
    page = 1
    while page <= 10:
        releases = request_json(f"{API_ROOT}/releases?per_page=100&page={page}")
        if not isinstance(releases, list) or not releases:
            return
        for release in releases:
            tag = release.get("tag_name")
            if not isinstance(tag, str) or not TAG_PATTERN.fullmatch(tag):
                continue
            if release.get("draft") or release.get("prerelease"):
                continue
            manifest_assets = [asset for asset in release.get("assets", []) if asset.get("name") == "release-manifest.json"]
            if len(manifest_assets) != 1:
                continue
            # A previous ledger entry prevents duplicate processing. The root transaction rechecks it under flock.
            try:
                if ledger_contains(ledger, tag, "", release.get("id")):
                    continue
            except (TypeError, ValueError):
                continue
            release_id = release.get("id")
            if not isinstance(release_id, int) or release_id <= 0:
                continue
            request_path = request_directory / "release.request"
            try:
                descriptor = os.open(request_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | getattr(os, "O_NOFOLLOW", 0), 0o640)
                with os.fdopen(descriptor, "w", encoding="ascii") as request_file:
                    request_file.write(f"{release_id}\n")
                print(f"release_request_queued release_id={release_id} tag={tag}")
            except FileExistsError:
                pass
            return
        page += 1


def apply_queue(config: dict) -> None:
    request_directory = Path(config["requestDirectory"])
    request_directory.mkdir(parents=True, exist_ok=True, mode=0o730)
    for request_path in sorted(request_directory.glob("*.request")):
        try:
            if request_path.name != "release.request":
                raise AgentError("Nombre de solicitud local no permitido.")
            descriptor = os.open(request_path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0))
            info = os.fstat(descriptor)
            if not stat.S_ISREG(info.st_mode):
                os.close(descriptor)
                raise AgentError("Solicitud local no es un archivo regular.")
            if info.st_size > 32:
                os.close(descriptor)
                raise AgentError("Solicitud local demasiado grande.")
            with os.fdopen(descriptor, "r", encoding="ascii") as request_file:
                request_id_text = request_file.read(33).strip()
            if not request_id_text.isdigit() or int(request_id_text) <= 0:
                raise AgentError("La solicitud local no tiene un ID positivo válido.")
            process_release(int(request_id_text), config)
        except BlockingIOError:
            print("release_apply_skipped reason=concurrent_run")
            return
        except Exception as error:
            print(f"release_apply_failed id={request_path.stem} type={type(error).__name__}", file=sys.stderr)
        finally:
            request_path.unlink(missing_ok=True)


def main() -> int:
    config_path = os.environ.get("FRAGMENTS_RELEASE_AGENT_CONFIG", "/etc/fragments-release-agent.json")
    try:
        config = load_config(config_path)
        if len(sys.argv) == 2 and sys.argv[1] == "--poll":
            poll(config)
            return 0
        if len(sys.argv) == 2 and sys.argv[1] == "--apply-queue":
            apply_queue(config)
            return 0
        if len(sys.argv) == 2 and sys.argv[1] == "--rollback-latest":
            rollback_latest(config)
            return 0
        raise AgentError("Uso: fragments-release-agent.py --poll|--apply-queue|--rollback-latest")
    except BlockingIOError:
        print("release_poll_skipped reason=concurrent_run")
        return 0
    except Exception as error:
        print(f"release_poll_failed type={type(error).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
