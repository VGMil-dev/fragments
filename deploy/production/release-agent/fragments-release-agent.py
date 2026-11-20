#!/usr/bin/env python3
"""Pull approved Fragments release assets and update only the Fragments API/web."""

from __future__ import annotations

try:
    import fcntl
except ImportError:  # Test parsing and validation on Windows; production runs Linux ARM64.
    fcntl = None
import gzip
import http.client
import hashlib
import ipaddress
import json
import os
import re
import sqlite3
import socket
import stat
import subprocess
import sys
import tarfile
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
    def __init__(self, message: str, *, code: str = "unknown_error", http_status: int | None = None, observed_tag: str | None = None):
        super().__init__(message)
        self.code = code
        self.http_status = http_status
        self.observed_tag = observed_tag


class TransientError(AgentError):
    """A recognized, retryable failure that must not terminalize a release."""


def _http_error_code(status: int, headers: object) -> tuple[str, bool]:
    if status == 403:
        values = headers.get_all("X-RateLimit-Remaining", []) if hasattr(headers, "get_all") else []
        if len(values) == 1 and values[0].strip(" \t") == "0":
            return "http_rate_limited", True
        return "http_forbidden", False
    if status in {408, 425, 429} or 500 <= status <= 599:
        return "http_transient_status", True
    if status == 401:
        return "http_unauthorized", False
    if status == 404:
        return "http_not_found", False
    if status == 409:
        return "http_conflict", False
    if 300 <= status <= 399:
        return "http_unexpected_status", False
    return "http_unexpected_status", False


def _raise_http_error(error: urllib.error.HTTPError) -> None:
    code, transient = _http_error_code(error.code, error.headers)
    message = f"GitHub respondió con HTTP {error.code}."
    if transient:
        raise TransientError(message, code=code, http_status=error.code) from error
    raise AgentError(message, code=code, http_status=error.code) from error


def _transport_reason(error: BaseException) -> str | None:
    if isinstance(error, socket.gaierror):
        return "transport_error"
    if isinstance(error, (TimeoutError, socket.timeout, ConnectionError, http.client.RemoteDisconnected)):
        return "transport_error"
    if isinstance(error, urllib.error.URLError) and isinstance(error.reason, BaseException):
        return _transport_reason(error.reason)
    return None


def _raise_url_error(error: urllib.error.URLError) -> None:
    code = _transport_reason(error)
    if code is not None:
        raise TransientError("Error de transporte al consultar GitHub.", code=code) from error
    raise AgentError("La respuesta o el transporte remoto no es reconocido.", code="unknown_error") from error


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def request_json(url: str, max_bytes: int = 5_000_000) -> dict | list:
    try:
        parsed_url = urllib.parse.urlsplit(url)
        port = parsed_url.port
    except (TypeError, ValueError) as error:
        raise AgentError("API URL fuera de api.github.com.", code="provenance_mismatch") from error
    if parsed_url.scheme != "https" or parsed_url.hostname != "api.github.com" or parsed_url.username is not None or parsed_url.password is not None or port not in (None, 443):
        raise AgentError("API URL fuera de api.github.com.", code="provenance_mismatch")
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2026-03-10"},
    )
    opener = urllib.request.build_opener(_NoRedirect())
    try:
        with opener.open(request, timeout=20) as response:
            body = response.read(max_bytes + 1)
    except urllib.error.HTTPError as error:
        _raise_http_error(error)
    except urllib.error.URLError as error:
        _raise_url_error(error)
    except (socket.gaierror, TimeoutError, socket.timeout, ConnectionError, http.client.RemoteDisconnected) as error:
        raise TransientError("Error de transporte al consultar la API pública de GitHub.", code="transport_error") from error
    if len(body) > max_bytes:
        raise AgentError("La respuesta de GitHub excede el tamaño permitido.", code="invalid_response")
    try:
        result = json.loads(body)
    except json.JSONDecodeError as error:
        raise AgentError("GitHub devolvió JSON inválido.", code="invalid_response") from error
    if not isinstance(result, (dict, list)):
        raise AgentError("GitHub devolvió JSON con una forma no permitida.", code="invalid_response")
    return result


def require_tag(tag: object) -> str:
    if not isinstance(tag, str) or not TAG_PATTERN.fullmatch(tag):
        raise AgentError("La publicación no tiene una tag vMAJOR.MINOR.PATCH válida.", code="provenance_mismatch")
    return tag


def require_sha(value: object, field: str) -> str:
    if not isinstance(value, str) or not SHA_PATTERN.fullmatch(value):
        raise AgentError(f"{field} no es un SHA-1 completo válido.", code="provenance_mismatch")
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


def run_checked(arguments: list[str], timeout: int = 600, input_text: str | None = None, *, remote: bool = False) -> str:
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
    except subprocess.TimeoutExpired as error:
        if remote:
            raise TransientError("La operación remota agotó el tiempo.", code="command_timeout") from error
        raise AgentError("La operación local agotó el tiempo.", code="command_timeout") from error
    except OSError as error:
        raise AgentError("No se pudo iniciar el comando.", code="command_failed") from error
    if result.returncode != 0:
        if remote:
            raise TransientError("La operación remota terminó con error.", code="remote_command_unavailable")
        raise AgentError("La operación local terminó con error.", code="command_failed")
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
    ], remote=True)
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


def canonical_dns_hostname(hostname: str) -> str:
    if not isinstance(hostname, str) or not hostname or not hostname.isascii() or hostname.endswith("."):
        raise AgentError("El hostname del asset no es DNS ASCII canónico.", code="asset_redirect_rejected")
    canonical = hostname.lower()
    try:
        ipaddress.ip_address(canonical)
    except ValueError:
        pass
    else:
        raise AgentError("No se aceptan IP literales como host de asset.", code="asset_redirect_rejected")
    if len(canonical.encode("ascii")) > 253:
        raise AgentError("El hostname excede el límite DNS.", code="asset_redirect_rejected")
    labels = canonical.split(".")
    if any(
        not 1 <= len(label) <= 63
        or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", label)
        for label in labels
    ):
        raise AgentError("El hostname no cumple la gramática DNS LDH.", code="asset_redirect_rejected")
    return canonical


def asset_url_identity(url: str) -> tuple[str, str, int, str, str]:
    try:
        parsed = urllib.parse.urlsplit(url)
        port = parsed.port
    except (TypeError, ValueError) as error:
        raise AgentError("URL de asset malformada.", code="asset_redirect_rejected") from error
    if parsed.scheme.lower() != "https" or parsed.username is not None or parsed.password is not None or parsed.netloc.endswith(":") or port not in (None, 443):
        raise AgentError("La URL de asset requiere HTTPS:443 y no permite userinfo.", code="asset_redirect_rejected")
    host = canonical_dns_hostname(parsed.hostname or "")
    return ("https", host, 443, parsed.path or "/", parsed.query)


def _asset_host_allowed(host: str) -> bool:
    if host in {"github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"}:
        return True
    suffix = ".githubusercontent.com"
    return host.endswith(suffix) and len(host) > len(suffix)


class GitHubAssetRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, initial_url: str, *, max_hops: int = 5):
        super().__init__()
        self.max_hops = max_hops
        self.hops = 0
        self.visited = {asset_url_identity(initial_url)}

    def redirect_request(self, request, response, code, message, headers, new_url):
        identity = asset_url_identity(new_url)
        host = identity[1]
        if not _asset_host_allowed(host):
            raise AgentError("El destino de redirección no pertenece a la allowlist de assets.", code="asset_redirect_rejected")
        if identity in self.visited:
            raise AgentError("Se rechazó un ciclo de redirección de asset.", code="asset_redirect_rejected")
        if self.hops >= self.max_hops:
            raise AgentError("La descarga excedió cinco redirecciones de asset.", code="asset_redirect_rejected")
        self.hops += 1
        self.visited.add(identity)
        return super().redirect_request(request, response, code, message, headers, new_url)


def _github_asset_opener(initial_url: str) -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(GitHubAssetRedirect(initial_url))


def download_asset(asset: dict, destination: Path, maximum_size: int = MAX_ARCHIVE_SIZE) -> None:
    url = asset.get("browser_download_url", "")
    identity = asset_url_identity(url)
    if identity[1] != "github.com" or not identity[3].startswith(f"/{OWNER}/{REPOSITORY}/releases/download/") or not isinstance(asset.get("size"), int) or not 0 < asset["size"] <= maximum_size:
        raise AgentError("La URL o el tamaño del asset no está permitido.", code="artifact_invalid")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/octet-stream"})
    if destination.is_symlink():
        raise AgentError("El destino del asset no puede ser un enlace simbólico.")
    partial = destination.with_name(destination.name + ".partial")
    partial.unlink(missing_ok=True)
    total = 0
    opener = _github_asset_opener(url)
    try:
        with opener.open(request, timeout=60) as response, partial.open("xb") as output:
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > maximum_size:
                    raise AgentError("El asset excedió el tamaño máximo.")
                output.write(chunk)
    except urllib.error.HTTPError as error:
        partial.unlink(missing_ok=True)
        _raise_http_error(error)
    except urllib.error.URLError as error:
        partial.unlink(missing_ok=True)
        _raise_url_error(error)
    except (socket.gaierror, TimeoutError, socket.timeout, ConnectionError, http.client.RemoteDisconnected) as error:
        partial.unlink(missing_ok=True)
        raise TransientError("Error de transporte al descargar el asset.", code="transport_error") from error
    except OSError as error:
        partial.unlink(missing_ok=True)
        raise AgentError("No se pudo escribir el asset temporal.", code="command_failed") from error
    except AgentError:
        partial.unlink(missing_ok=True)
        raise
    if total != asset.get("size"):
        partial.unlink(missing_ok=True)
        raise AgentError("El tamaño descargado no coincide con la API de GitHub.", code="artifact_invalid")
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
    output = run_checked(["gh", "attestation", "trusted-root"], timeout=300, remote=True)
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
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    payload = json.dumps(data, indent=2) + "\n"
    try:
        with temporary.open("x", encoding="utf-8") as output:
            output.write(payload)
            output.flush()
            if os.name == "posix":
                os.fsync(output.fileno())
        os.chmod(temporary, 0o600)
        if os.name == "posix":
            with temporary.open("rb") as output:
                os.fsync(output.fileno())
        os.replace(temporary, path)
        if os.name == "posix":
            directory_fd = os.open(path.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
    finally:
        temporary.unlink(missing_ok=True)


def ledger_contains(ledger: dict, tag: str, commit: str, release_id: int) -> bool:
    return any(
        (bool(tag) and item.get("tag") == tag)
        or (bool(commit) and item.get("commit") == commit)
        or (release_id is not None and item.get("releaseId") == release_id)
        for item in ledger["releases"]
    )


TERMINAL_RELEASE_STATES = {
    "deployed", "reconciled_previous_state", "rejected", "recovery_required",
    "rolled_back", "rolled_back_manual", "rollback_failed",
}
RETRY_ERROR_CODES = {
    "transport_error", "http_transient_status", "http_rate_limited", "command_timeout", "remote_command_unavailable",
}


def error_record(error: AgentError) -> dict:
    result = {"code": error.code}
    if error.http_status is not None:
        result["http_status"] = error.http_status
    return result


def report_retry(release_id: int, tag: str | None, error: TransientError) -> None:
    event = {
        "event": "release_retry",
        "release_id": str(release_id),
        "tag": tag or "",
        "code": error.code,
    }
    if error.http_status is not None:
        event["http_status"] = error.http_status
    print(json.dumps(event, separators=(",", ":"), ensure_ascii=True))


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
        "database": config.get("Labels", {}).get("org.opencontainers.image.database"),
    }


def container_snapshot() -> dict:
    output = run_checked(["docker", "ps", "--no-trunc", "--format", "{{.ID}}|{{.Names}}"])
    result: dict[str, dict] = {}
    for line in output.splitlines():
        container_id, name = line.split("|", 1)
        if name.startswith("pits") or name.startswith("postgres") or name.startswith("fragments-postgres"):
            state = run_checked(["docker", "inspect", "--format", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}", name])
            result[name] = {"id": container_id, "state": state}
    return result


def container_image(container: str) -> str:
    return run_checked(["docker", "inspect", "--format", "{{.Config.Image}}", container])


def container_image_id(container: str) -> str:
    value = run_checked(["docker", "inspect", "--format", "{{.Image}}", container])
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", value):
        raise AgentError("Docker no devolvió un ID inmutable de imagen.", code="unknown_error")
    return value


def fragments_postgres_volume() -> str:
    output = run_checked(["docker", "inspect", "--format", "{{json .Mounts}}", "fragments-postgres-1"])
    mounts = json.loads(output)
    data_mount = [mount for mount in mounts if mount.get("Destination") == "/var/lib/postgresql"]
    if len(data_mount) != 1 or data_mount[0].get("Type") != "volume":
        raise AgentError("No se confirmó el volumen PostgreSQL persistente de Fragments.")
    return data_mount[0].get("Name", "")


def initial_sqlite_source_volume() -> str:
    output = run_checked(["docker", "inspect", "--format", "{{json .Mounts}}", "fragments-api-1"])
    mounts = json.loads(output)
    data_mount = [mount for mount in mounts if mount.get("Destination") == "/app/data"]
    if len(data_mount) != 1 or data_mount[0].get("Type") != "volume":
        raise AgentError("No se confirmó el volumen SQLite anterior para crear la copia de emergencia.")
    return data_mount[0].get("Name", "")


def preserve_initial_sqlite_emergency(config: dict, api_image: str) -> dict:
    volume = initial_sqlite_source_volume()
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,128}", volume):
        raise AgentError("El nombre del volumen SQLite anterior no es válido.")
    backup_directory = Path(config["backupDirectory"])
    backup_directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(backup_directory, 0o700)
    name = "fragments-emergency-sqlite.sqlite"
    destination = backup_directory / name
    if not destination.exists():
        node_script = (
            "process.umask(0o077);"
            "const {DatabaseSync}=require('node:sqlite');"
            "const source=new DatabaseSync('/source/fragments.sqlite',{readOnly:true});"
            f"try{{source.exec(\"VACUUM INTO '/backups/{name}'\")}}finally{{source.close()}}"
        )
        run_checked([
            "docker", "run", "--rm", "--user", "0:0", "--network", "none", "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=16m",
            "--mount", f"type=volume,source={volume},target=/source,readonly",
            "--mount", f"type=bind,source={backup_directory},target=/backups",
            "--entrypoint", "node", api_image, "--disable-warning=ExperimentalWarning", "-e", node_script,
        ], timeout=300)
    if not destination.is_file():
        raise AgentError("No se creó el backup SQLite de emergencia antes de la migración.")
    os.chmod(destination, 0o600)
    info = destination.stat()
    if info.st_uid != 0 or info.st_mode & 0o077:
        raise AgentError("El backup SQLite de emergencia no tiene propietario/permisos privados.")
    database = None
    try:
        uri = f"file:{urllib.parse.quote(str(destination))}?mode=ro"
        database = sqlite3.connect(uri, uri=True, timeout=10)
        result = database.execute("PRAGMA integrity_check").fetchone()
    except sqlite3.Error as error:
        raise AgentError("No se pudo verificar el backup SQLite de emergencia.") from error
    finally:
        if database is not None:
            database.close()
    if result != ("ok",):
        raise AgentError("El backup SQLite de emergencia no pasó integrity_check.")
    return {"file": name, "bytes": info.st_size, "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(), "integrity": "sqlite_ok"}


def ensure_postgres_ready(config: dict, previous_api_image: str) -> tuple[str, dict | None]:
    emergency_backup = None
    if image_info(previous_api_image).get("database") != "postgresql":
        emergency_backup = preserve_initial_sqlite_emergency(config, previous_api_image)
    run_checked([
        "docker", "compose", "--project-directory", config["composeDirectory"],
        "-f", config["composeFile"], "up", "-d", "--no-build", "postgres",
    ], timeout=300)
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        try:
            observed = container_health("fragments-postgres-1")
            if observed[0] == "running" and observed[1] == "healthy":
                volume = fragments_postgres_volume()
                if not volume:
                    raise AgentError("PostgreSQL no tiene un volumen persistente identificable.")
                return volume, emergency_backup
        except AgentError:
            pass
        time.sleep(3)
    raise AgentError("PostgreSQL no alcanzó estado saludable durante el preflight.", code="command_timeout")


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
                    if expected_version is not None and container == "fragments-api-1" and info.get("database") != "postgresql":
                        raise AgentError("La imagen API del release no declara persistencia PostgreSQL.")
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
    if not isinstance(api_version, str) or not re.fullmatch(r"v?[0-9A-Za-z.+-]{1,64}", api_version) or not isinstance(api_sha, str) or not SHA_PATTERN.fullmatch(api_sha):
        raise AgentError("Metadata de override API inválida.")
    if not isinstance(web_version, str) or not re.fullmatch(r"v?[0-9A-Za-z.+-]{1,64}", web_version) or not isinstance(web_sha, str) or not SHA_PATTERN.fullmatch(web_sha):
        raise AgentError("Metadata de override web inválida.")
    if not re.fullmatch(r"fragments-api:[A-Za-z0-9_.-]{1,128}", api_image) or not re.fullmatch(r"fragments-web:[A-Za-z0-9_.-]{1,128}", web_image):
        raise AgentError("Referencia de imagen fuera del espacio de nombres Fragments.")
    content = (
        "services:\n"
        "  migrate:\n"
        f"    image: {api_image}\n"
        "  migrate-test:\n"
        f"    image: {api_image}\n"
        "  api:\n"
        f"    image: {api_image}\n"
        "    labels:\n"
        f"      org.opencontainers.image.version: \"{api_version}\"\n"
        f"      org.opencontainers.image.revision: \"{api_sha}\"\n"
        + "  web:\n"
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


def compose_up(config: dict, override: Path, run_migrations: bool = True) -> None:
    if run_migrations:
        prisma_migrate_deploy(config, override)
    run_checked([
        "docker", "compose", "--project-directory", config["composeDirectory"],
        "-f", config["composeFile"], "-f", str(override),
        "up", "-d", "--no-build", "--no-deps", "api", "web",
    ], timeout=300)


def prisma_migrate_deploy(config: dict, override: Path) -> None:
    for service in ("migrate", "migrate-test"):
        run_checked([
            "docker", "compose", "--project-directory", config["composeDirectory"],
            "-f", config["composeFile"], "-f", str(override),
            "run", "--rm", "--no-deps", service,
        ], timeout=300)


def integrity_check_backup(config: dict, existing: set[str]) -> dict:
    run_checked(["systemctl", "start", "fragments-backup.service"], timeout=300)
    candidates = [path for path in Path(config["backupDirectory"]).glob("fragments-prod-*.dump") if path.is_file() and str(path) not in existing]
    if not candidates:
        raise AgentError("El servicio de backup no produjo un snapshot PostgreSQL nuevo.")
    backup = max(candidates, key=lambda path: path.stat().st_mtime_ns)
    info = backup.stat()
    if info.st_uid != 0 or info.st_mode & 0o077:
        raise AgentError("El dump PostgreSQL no tiene propietario root ni permisos privados.")
    backup_bytes = backup.read_bytes()
    if len(backup_bytes) < 5 or backup_bytes[:5] != b"PGDMP":
        raise AgentError("El backup no tiene el formato archive custom de pg_dump.")
    digest = hashlib.sha256(backup_bytes).hexdigest()
    run_checked([
        "docker", "compose", "--project-directory", config["composeDirectory"],
        "-f", config["composeFile"], "--profile", "maintenance",
        "run", "--rm", "--no-deps", "restore-verify",
    ], timeout=900)
    return {"file": backup.name, "bytes": info.st_size, "sha256": digest, "integrity": "restored_to_temporary_database"}


def get_release_assets(release_id: int, config: dict, state_dir: Path) -> tuple[dict, dict, dict, Path, Path]:
    release = request_json(f"{API_ROOT}/releases/{release_id}")
    observed_tag = release.get("tag_name") if isinstance(release, dict) and isinstance(release.get("tag_name"), str) else None
    try:
        return _get_release_assets_for_release(release_id, release, config, state_dir)
    except AgentError as error:
        if error.observed_tag is None:
            error.observed_tag = observed_tag
        raise
    except Exception as error:
        raise AgentError("La metadata de la release no se pudo validar.", code="unknown_error", observed_tag=observed_tag) from error


def _get_release_assets_for_release(release_id: int, release: dict, config: dict, state_dir: Path) -> tuple[dict, dict, dict, Path, Path]:
    if not isinstance(release, dict):
        raise AgentError("GitHub devolvió metadata de release con una forma no permitida.", code="invalid_response")
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
    archived_images = archive_image_info(archive_path, images, tag, commit)
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
    except subprocess.TimeoutExpired as error:
        raise AgentError("docker load agotó el tiempo permitido.", code="command_timeout") from error
    except subprocess.CalledProcessError as error:
        raise AgentError("docker load terminó con error.", code="command_failed") from error
    except (gzip.BadGzipFile, EOFError) as error:
        raise AgentError("El paquete de imágenes no es un gzip válido.", code="artifact_invalid") from error
    except OSError as error:
        raise AgentError("No se pudo ejecutar docker load.", code="command_failed") from error
    for image_name in ("api", "web"):
        info = image_info(images[image_name])
        if info.get("id") != archived_images[images[image_name]]["id"] or (info["architecture"], info["version"], info["revision"]) != ("arm64", tag, commit) or info.get("database") != archived_images[images[image_name]].get("database"):
            raise AgentError("Identidad, labels o arquitectura de imagen no coinciden con el artefacto aprobado.", code="artifact_invalid")


def archive_image_info(archive_path: Path, images: dict[str, str], tag: str, commit: str) -> dict[str, dict]:
    expected_refs = {images.get("api"), images.get("web")}
    if None in expected_refs or len(expected_refs) != 2:
        raise AgentError("El manifiesto no contiene dos referencias de imagen únicas.", code="artifact_invalid")
    try:
        with tarfile.open(archive_path, mode="r:gz") as archive:
            manifest_member = archive.getmember("manifest.json")
            if not manifest_member.isfile() or not 0 < manifest_member.size <= 1_000_000:
                raise AgentError("El manifest del archivo Docker excede el tamaño permitido.", code="artifact_invalid")
            manifest_stream = archive.extractfile(manifest_member)
            if manifest_stream is None:
                raise AgentError("Falta el manifest del archivo Docker.", code="artifact_invalid")
            manifest = json.loads(manifest_stream.read(1_000_001))
            if not isinstance(manifest, list) or len(manifest) != 2:
                raise AgentError("El archivo Docker no contiene exactamente dos imágenes.", code="artifact_invalid")
            result: dict[str, dict] = {}
            for entry in manifest:
                if not isinstance(entry, dict) or not isinstance(entry.get("RepoTags"), list) or len(entry["RepoTags"]) != 1:
                    raise AgentError("El manifest Docker tiene referencias ambiguas.", code="artifact_invalid")
                reference = entry["RepoTags"][0]
                config_name = entry.get("Config")
                if reference not in expected_refs or reference in result or not isinstance(config_name, str) or not config_name.endswith(".json") or "/" in config_name or "\\" in config_name or config_name in {".", ".."}:
                    raise AgentError("El manifest Docker contiene una referencia o ruta no permitida.", code="artifact_invalid")
                config_member = archive.getmember(config_name)
                if not config_member.isfile() or not 0 < config_member.size <= 16_000_000:
                    raise AgentError("La configuración de imagen excede el tamaño permitido.", code="artifact_invalid")
                config_stream = archive.extractfile(config_member)
                if config_stream is None:
                    raise AgentError("Falta configuración de una imagen Docker.", code="artifact_invalid")
                config_bytes = config_stream.read(16_000_001)
                config = json.loads(config_bytes)
                labels = config.get("config", {}).get("Labels", {})
                image_id = f"sha256:{hashlib.sha256(config_bytes).hexdigest()}"
                info = {
                    "id": image_id,
                    "architecture": config.get("architecture"),
                    "version": labels.get("org.opencontainers.image.version"),
                    "revision": labels.get("org.opencontainers.image.revision"),
                }
                database_engine = labels.get("org.opencontainers.image.database")
                expected_database = "postgresql" if reference.startswith("fragments-api:") else None
                if (info["architecture"], info["version"], info["revision"]) != ("arm64", tag, commit) or database_engine != expected_database:
                    raise AgentError("Labels o arquitectura del archivo no coinciden con la metadata aprobada.", code="artifact_invalid")
                info["database"] = database_engine
                result[reference] = info
            if set(result) != expected_refs:
                raise AgentError("El archivo Docker no enlaza exactamente las imágenes aprobadas.", code="artifact_invalid")
            return result
    except AgentError:
        raise
    except (OSError, tarfile.TarError, json.JSONDecodeError, KeyError, TypeError, AttributeError) as error:
        raise AgentError("El archivo Docker no tiene un manifest verificable.", code="artifact_invalid") from error


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


def image_ids_for_running() -> dict[str, str]:
    return {"fragments-api-1": container_image_id("fragments-api-1"), "fragments-web-1": container_image_id("fragments-web-1")}


def _health_endpoint_is_ok() -> bool:
    try:
        response = subprocess.run(
            ["curl", "--silent", "--show-error", "--output", "/dev/null", "--write-out", "%{http_code}", "http://127.0.0.1:3001/health"],
            capture_output=True, text=True, timeout=10, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return response.returncode == 0 and response.stdout.strip() == "200"


def observe_recovery_state() -> dict:
    health = {
        name: container_health(name)[:2]
        for name in ("fragments-api-1", "fragments-web-1")
    }
    return {
        "imageIds": image_ids_for_running(),
        "health": health,
        "httpOk": _health_endpoint_is_ok(),
        "volume": fragments_postgres_volume(),
        "neighbors": container_snapshot(),
    }


def _baseline_matches(record: dict, observation: dict) -> bool:
    return observation.get("volume") == record.get("previousVolume") and observation.get("neighbors") == record.get("beforeNeighbors")


def _containers_healthy(observation: dict) -> bool:
    health = observation.get("health")
    expected = {"fragments-api-1", "fragments-web-1"}
    return (
        isinstance(health, dict)
        and set(health) == expected
        and all(health[name] == ("running", "healthy") for name in expected)
        and observation.get("httpOk") is True
    )


def _complete_recovery_baseline(record: dict) -> bool:
    names = {"fragments-api-1", "fragments-web-1"}
    image_refs = record.get("previousImages")
    image_ids = record.get("previousImageIds")
    target_ids = record.get("targetImageIds")
    target_refs = record.get("targetImages")
    neighbors = record.get("beforeNeighbors")
    return (
        isinstance(record.get("previousVolume"), str)
        and bool(record["previousVolume"])
        and isinstance(neighbors, dict)
        and all(isinstance(name, str) and isinstance(value, dict) and isinstance(value.get("id"), str) and isinstance(value.get("state"), str) for name, value in neighbors.items())
        and isinstance(image_refs, dict)
        and set(image_refs) == names
        and all(isinstance(value, str) and bool(value) for value in image_refs.values())
        and isinstance(image_ids, dict)
        and set(image_ids) == names
        and all(isinstance(value, str) and re.fullmatch(r"sha256:[0-9a-f]{64}", value) for value in image_ids.values())
        and isinstance(target_refs, dict)
        and set(target_refs) == {"api", "web"}
        and all(isinstance(value, str) and bool(value) for value in target_refs.values())
        and isinstance(target_ids, dict)
        and set(target_ids) == names
        and all(isinstance(value, str) and re.fullmatch(r"sha256:[0-9a-f]{64}", value) for value in target_ids.values())
    )


def reconcile_deploying_record(ledger: dict, ledger_path: Path, record: dict) -> str:
    required = {
        "releaseId", "tag", "tagObject", "commit", "targetImages", "targetImageIds",
        "previousImages", "previousImageIds", "previousVolume", "beforeNeighbors",
    }
    if not required.issubset(record) or not _complete_recovery_baseline(record):
        record["status"] = "recovery_required"
        record["error"] = {"code": "unknown_error"}
        record["recoveryAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        write_ledger(ledger_path, ledger)
        return record["status"]
    try:
        first = observe_recovery_state()
        second = observe_recovery_state()
    except Exception:
        first = second = None
    if first is None or second is None or first != second:
        status = "recovery_required"
    elif not _containers_healthy(first) or not _baseline_matches(record, first):
        status = "recovery_required"
    elif first["imageIds"] == record["targetImageIds"]:
        status = "deployed"
    elif first["imageIds"] == record["previousImageIds"]:
        status = "reconciled_previous_state"
    else:
        status = "recovery_required"
    record["status"] = status
    record["completedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if status == "recovery_required":
        record["error"] = {"code": "unknown_error"}
    else:
        record.pop("error", None)
    write_ledger(ledger_path, ledger)
    return status


def _entries_for_release_id(ledger: dict, release_id: int) -> list[dict]:
    return [item for item in ledger["releases"] if item.get("releaseId") == release_id]


def _record_permanent_validation_failure(ledger: dict, ledger_path: Path, release_id: int, error: AgentError, pending: dict | None) -> None:
    if pending is not None:
        pending["status"] = "recovery_required"
        pending["error"] = error_record(error)
        if error.observed_tag:
            pending["observedTag"] = error.observed_tag
        pending["recoveryAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        write_ledger(ledger_path, ledger)
        return
    tag = error.observed_tag or ""
    if ledger_contains(ledger, tag, "", release_id):
        print(json.dumps({"event": "release_apply_rejected", "release_id": str(release_id), "tag": tag, "code": error.code}, separators=(",", ":")))
        return
    record = {
        "releaseId": release_id,
        "tag": tag,
        "status": "rejected",
        "error": error_record(error),
        "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    ledger["releases"].append(record)
    write_ledger(ledger_path, ledger)


def _cleanup_release_files(release_id: int, state_dir: Path, archive_path: Path | None = None, attestation_path: Path | None = None) -> None:
    if archive_path is not None and archive_path.parent == state_dir:
        archive_path.unlink(missing_ok=True)
    (state_dir / f"incoming-{release_id}-manifest.json").unlink(missing_ok=True)
    if attestation_path is not None and attestation_path.parent == state_dir and attestation_path.name == f"incoming-{release_id}-attestation.jsonl":
        attestation_path.unlink(missing_ok=True)


def process_release(release_id: int, config: dict) -> None:
    state_dir = Path(config["stateDirectory"])
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    if fcntl is None:
        raise AgentError("El mecanismo de exclusión flock requiere Linux.")
    with (state_dir / "agent.lock").open("a", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        ledger_path = Path(config["ledgerPath"])
        ledger = read_ledger(ledger_path)
        matching_ids = _entries_for_release_id(ledger, release_id)
        if len(matching_ids) > 1:
            print(json.dumps({"event": "release_apply_rejected", "release_id": str(release_id), "tag": "", "code": "provenance_mismatch"}, separators=(",", ":")))
            return
        pending = matching_ids[0] if matching_ids else None
        if pending is not None and pending.get("status") in TERMINAL_RELEASE_STATES:
            print(json.dumps({"event": "release_apply_noop", "release_id": str(release_id), "tag": pending.get("tag", ""), "code": "terminal_state"}, separators=(",", ":")))
            return
        if pending is not None and pending.get("status") != "deploying":
            print(json.dumps({"event": "release_apply_rejected", "release_id": str(release_id), "tag": pending.get("tag", ""), "code": "unknown_error"}, separators=(",", ":")))
            return
        if pending is not None and not {
            "releaseId", "tag", "tagObject", "commit", "targetImages", "targetImageIds",
            "previousImages", "previousImageIds", "previousVolume", "beforeNeighbors",
        }.issubset(pending):
            pending["status"] = "recovery_required"
            pending["error"] = {"code": "unknown_error"}
            write_ledger(ledger_path, ledger)
            return

        archive_path: Path | None = None
        attestation_path: Path | None = None
        tag = pending.get("tag") if pending else None
        record: dict | None = pending
        try:
            manifest, release, archive_asset, archive_path, attestation_path = get_release_assets(release_id, config, state_dir)
            tag, tag_object, commit, archive_digest = validate_manifest(manifest, release)
            if pending is not None and (tag, tag_object, commit, release_id) != (pending.get("tag"), pending.get("tagObject"), pending.get("commit"), pending.get("releaseId")):
                raise AgentError("La identidad remota contradice la transacción pendiente.", code="provenance_mismatch", observed_tag=tag)

            run_id = int(manifest["runId"])
            run = request_json(f"{API_ROOT}/actions/runs/{run_id}")
            jobs = request_json(f"{API_ROOT}/actions/runs/{run_id}/jobs?per_page=100")
            validate_release_run(run, jobs, manifest, tag)
            verify_git_source(Path(config["gitDirectory"]), tag, tag_object, commit)
            ensure_archive_available(archive_asset, archive_path, archive_digest)
            verify_attestation(archive_path, tag, commit, run_id, archive_digest, attestation_path, state_dir)
            archived_image_data = archive_image_info(archive_path, manifest["images"], tag, commit)
            target_image_ids = {
                "fragments-api-1": archived_image_data[manifest["images"]["api"]]["id"],
                "fragments-web-1": archived_image_data[manifest["images"]["web"]]["id"],
            }

            if pending is not None:
                if target_image_ids != pending.get("targetImageIds") or manifest["images"] != pending.get("targetImages"):
                    raise AgentError("La identidad de imagen aprobada contradice el baseline pendiente.", code="provenance_mismatch", observed_tag=tag)
                status = reconcile_deploying_record(ledger, ledger_path, pending)
                print(json.dumps({"event": "release_reconciled", "release_id": str(release_id), "tag": tag, "code": status}, separators=(",", ":")))
                _cleanup_release_files(release_id, state_dir, archive_path, attestation_path)
                return

            conflicting = [item for item in ledger["releases"] if item.get("tag") == tag or item.get("commit") == commit]
            if conflicting:
                _record_permanent_validation_failure(
                    ledger, ledger_path, release_id,
                    AgentError("La tag o SHA ya tiene una entrada de ledger distinta.", code="provenance_mismatch", observed_tag=tag),
                    None,
                )
                _cleanup_release_files(release_id, state_dir, archive_path, attestation_path)
                return

            load_archive(archive_path, manifest["images"], tag, commit)
            previous_images = image_refs_for_running()
            previous_image_ids = image_ids_for_running()
            previous_volume, emergency_sqlite_backup = ensure_postgres_ready(config, previous_images["fragments-api-1"])
            override = compose_override(state_dir, manifest["images"]["api"], manifest["images"]["web"], tag, commit)
            run_checked(["docker", "compose", "--project-directory", config["composeDirectory"], "-f", config["composeFile"], "-f", str(override), "config", "--quiet"], timeout=60)
            prisma_migrate_deploy(config, override)
            before_neighbors = container_snapshot()
            if not previous_volume:
                raise AgentError("El volumen persistente no tiene nombre verificable.", code="unknown_error", observed_tag=tag)
            for container in ("fragments-api-1", "fragments-web-1"):
                observed_health = container_health(container)
                if observed_health[0] != "running" or observed_health[1] != "healthy":
                    raise AgentError("El servicio previo de Fragments no está saludable; se cancela el cambio.", code="unknown_error", observed_tag=tag)
            existing_backups = {str(path) for path in Path(config["backupDirectory"]).glob("fragments-prod-*.dump")}
            backup = integrity_check_backup(config, existing_backups)

            record = {
                "releaseId": release_id,
                "tag": tag,
                "tagObject": tag_object,
                "commit": commit,
                "status": "deploying",
                "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "targetImages": manifest["images"],
                "targetImageIds": target_image_ids,
                "previousImages": previous_images,
                "previousImageIds": previous_image_ids,
                "previousVolume": previous_volume,
                "beforeNeighbors": before_neighbors,
                "backup": backup,
            }
            if emergency_sqlite_backup is not None:
                record["emergencySqliteBackup"] = emergency_sqlite_backup
            ledger["releases"].append(record)
            write_ledger(ledger_path, ledger)
        except TransientError as error:
            if error.observed_tag:
                tag = error.observed_tag
            report_retry(release_id, tag, error)
            _cleanup_release_files(release_id, state_dir, archive_path, attestation_path)
            return
        except AgentError as error:
            if error.observed_tag is None:
                error.observed_tag = tag
            if error.code in {"command_failed", "command_timeout"} and pending is None:
                report_retry(release_id, tag, error)
                _cleanup_release_files(release_id, state_dir, archive_path, attestation_path)
                return
            _record_permanent_validation_failure(ledger, ledger_path, release_id, error, pending)
            _cleanup_release_files(release_id, state_dir, archive_path, attestation_path)
            return
        except Exception:
            error = AgentError("Error no clasificado durante validación del release.", code="unknown_error", observed_tag=tag)
            _record_permanent_validation_failure(ledger, ledger_path, release_id, error, pending)
            _cleanup_release_files(release_id, state_dir, archive_path, attestation_path)
            return

        assert record is not None
        images = manifest["images"]
        before_neighbors = record["beforeNeighbors"]
        previous_images = record["previousImages"]
        previous_volume = record["previousVolume"]

        deployment_started = False
        try:
            override = compose_override(state_dir, images["api"], images["web"], tag, commit)
            deployment_started = True
            compose_up(config, override, run_migrations=False)
            wait_for_health(tag, commit, previous_images)
            if fragments_postgres_volume() != previous_volume:
                raise AgentError("El volumen PostgreSQL cambió durante el despliegue.")
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
                    if old_api.get("database") != "postgresql":
                        record["status"] = "recovery_required"
                        record["rollback"] = "not_attempted_sqlite_not_supported"
                        recovery_error = error if isinstance(error, AgentError) else AgentError("Falló el primer corte PostgreSQL; no se restaura SQLite automáticamente.", code="unknown_error", observed_tag=tag)
                        record["error"] = error_record(recovery_error)
                    else:
                        old_web = image_info(previous_images["fragments-web-1"])
                        rollback_override = compose_override(
                            state_dir, previous_images["fragments-api-1"], previous_images["fragments-web-1"],
                            old_api["version"], old_api["revision"], old_web["version"], old_web["revision"],
                        )
                        compose_up(config, rollback_override, run_migrations=False)
                        wait_for_health(tag, commit, previous_images, rollback=True)
                        record["status"] = "rolled_back"
                        record["rollback"] = "code_images_restored_database_untouched"
                except Exception:
                    if record.get("status") != "recovery_required":
                        record["status"] = "rollback_failed"
                        record["rollback"] = "manual_intervention_required"
            else:
                record["status"] = "recovery_required"
                stable_error = error if isinstance(error, AgentError) else AgentError("Fallo no clasificado antes de cambiar servicios.", code="unknown_error")
                record["error"] = error_record(stable_error)
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
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (state_dir / "agent.lock").open("a", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        ledger_path = Path(config["ledgerPath"])
        ledger = read_ledger(ledger_path)
        if not ledger["releases"]:
            raise AgentError("El ledger no tiene una release reciente para revertir.")
        record = ledger["releases"][-1]
        if not isinstance(record, dict) or record.get("status") not in {"deployed", "rollback_failed"}:
            raise AgentError("Solo se puede revertir la última release si está deployed o rollback_failed.")
        required = {
            "releaseId", "tag", "commit", "targetImages", "targetImageIds", "previousImages",
            "previousImageIds", "previousVolume", "beforeNeighbors",
        }
        if not required.issubset(record):
            raise AgentError("El ledger no conserva el baseline completo para revertir.")
        require_tag(record.get("tag"))
        require_sha(record.get("commit"), "commit")
        expected_names = {"fragments-api-1", "fragments-web-1"}
        previous_images = record.get("previousImages")
        if not isinstance(previous_images, dict) or set(previous_images) != expected_names:
            raise AgentError("El ledger no conserva las dos referencias de imagen anteriores.")
        if not isinstance(record.get("targetImages"), dict) or set(record["targetImages"]) != {"api", "web"}:
            raise AgentError("El ledger no conserva las referencias de imagen objetivo.")
        for key in ("targetImageIds", "previousImageIds"):
            value = record.get(key)
            if not isinstance(value, dict) or set(value) != expected_names or any(
                not isinstance(image_id, str) or not re.fullmatch(r"sha256:[0-9a-f]{64}", image_id)
                for image_id in value.values()
            ):
                raise AgentError("El ledger no conserva IDs inmutables de las imágenes.")
        if not isinstance(record.get("previousVolume"), str) or not record["previousVolume"] or not isinstance(record.get("beforeNeighbors"), dict):
            raise AgentError("El ledger no conserva volumen y snapshot de vecinos válidos.")

        observation = observe_recovery_state()
        if not _containers_healthy(observation) or not _baseline_matches(record, observation):
            raise AgentError("La salud, el volumen o los servicios vecinos difieren del baseline guardado.")
        if observation.get("imageIds") != record["targetImageIds"]:
            raise AgentError("Las imágenes en ejecución no coinciden con los IDs objetivo guardados.")

        previous_image_ids = record["previousImageIds"]
        api_info = image_info(previous_images["fragments-api-1"])
        web_info = image_info(previous_images["fragments-web-1"])
        if api_info.get("database") != "postgresql":
            raise AgentError("F14 solo revierte código entre releases PostgreSQL; SQLite no forma parte del rollback permanente.")
        if api_info.get("id") != previous_image_ids["fragments-api-1"] or web_info.get("id") != previous_image_ids["fragments-web-1"]:
            raise AgentError("Una imagen previa ya no apunta al ID inmutable registrado.")
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
        previous_images = record.get("previousImages")
        try:
            compose_up(config, override, run_migrations=False)
            wait_for_health(record["tag"], record["commit"], previous_images, rollback=True)
            after = observe_recovery_state()
            if (
                after.get("imageIds") != previous_image_ids
                or not _containers_healthy(after)
                or not _baseline_matches(record, after)
            ):
                raise AgentError("La verificación posterior encontró una identidad, health o baseline distinto.")
            record["status"] = "rolled_back_manual"
            record["rollback"] = "code_images_restored_database_untouched"
            record["rollbackCompletedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            write_ledger(ledger_path, ledger)
            print(f"release_rollback tag={record['tag']} commit={record['commit']} status=ok database=untouched")
        except Exception:
            record["status"] = "rollback_failed"
            record["rollback"] = "manual_intervention_required"
            write_ledger(ledger_path, ledger)
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
            release_id = release.get("id")
            if not isinstance(release_id, int) or release_id <= 0:
                continue
            matching = _entries_for_release_id(ledger, release_id)
            if len(matching) > 1:
                print(json.dumps({"event": "release_apply_rejected", "release_id": str(release_id), "tag": tag, "code": "provenance_mismatch"}, separators=(",", ":")))
                continue
            if matching:
                # Only the same release identity in deploying is eligible for a recovery retry.
                if matching[0].get("status") != "deploying" or matching[0].get("tag") != tag:
                    continue
            elif ledger_contains(ledger, tag, "", None):
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
