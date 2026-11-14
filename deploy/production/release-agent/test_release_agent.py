import importlib.util
import gzip
import json
import io
import os
import sqlite3
import stat
import subprocess
import tarfile
import tempfile
import urllib.error
import urllib.request
from contextlib import ExitStack, redirect_stdout
from http.client import HTTPMessage
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, call, patch
from pathlib import Path


AGENT_PATH = Path(__file__).with_name("fragments-release-agent.py")
SPEC = importlib.util.spec_from_file_location("fragments_release_agent", AGENT_PATH)
agent = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(agent)
if agent.fcntl is None:
    # The local Windows suite does not exercise process-level locking; Linux CI uses real flock.
    agent.fcntl = SimpleNamespace(LOCK_EX=2, LOCK_NB=4, flock=lambda *_args: None)


RELEASE_SHA = "1" * 40
TAG_OBJECT = "2" * 40


def release_fixture():
    tag = "v0.4.0"
    return {
        "schemaVersion": 1,
        "repository": "VGMil-dev/fragments",
        "repositoryId": agent.REPOSITORY_ID,
        "runId": "123456789",
        "tag": tag,
        "tagObject": TAG_OBJECT,
        "commit": RELEASE_SHA,
        "platform": "linux/arm64",
        "archiveName": "fragments-images.tar.gz",
        "archiveSha256": "a" * 64,
        "images": {"api": f"fragments-api:sha-{RELEASE_SHA}", "web": f"fragments-web:sha-{RELEASE_SHA}"},
    }


class ReleaseValidationTests(unittest.TestCase):
    def test_only_strict_stable_semver_tags_are_accepted(self):
        self.assertEqual(agent.require_tag("v0.4.0"), "v0.4.0")
        for invalid in ("v00.4.0", "v0.04.0", "v0.4.00", "v0.4", "v0.4.0-rc.1", "0.4.0", "v0.4.0+build"):
            with self.subTest(tag=invalid), self.assertRaises(agent.AgentError):
                agent.require_tag(invalid)

    def test_manifest_binds_repo_tag_commit_images_and_platform(self):
        manifest = release_fixture()
        release = {"tag_name": "v0.4.0"}
        self.assertEqual(agent.validate_manifest(manifest, release), ("v0.4.0", TAG_OBJECT, RELEASE_SHA, "a" * 64))
        manifest["images"]["api"] = "attacker/api:latest"
        with self.assertRaises(agent.AgentError):
            agent.validate_manifest(manifest, release)

    def test_manifest_rejects_tag_sha_or_archive_digest_disagreement(self):
        manifest = release_fixture()
        with self.assertRaises(agent.AgentError):
            agent.validate_manifest(manifest, {"tag_name": "v0.4.1"})
        manifest = release_fixture()
        manifest["archiveSha256"] = "not-a-digest"
        with self.assertRaises(agent.AgentError):
            agent.validate_manifest(manifest, {"tag_name": "v0.4.0"})

    def test_workflow_run_must_be_successful_push_from_expected_release_workflow(self):
        manifest = release_fixture()
        run = {
            "path": agent.WORKFLOW_PATH,
            "event": "push",
            "head_branch": "v0.4.0",
            "head_sha": RELEASE_SHA,
            "status": "completed",
            "conclusion": "success",
            "id": 123456789,
            "repository": {"id": agent.REPOSITORY_ID},
        }
        jobs = {"jobs": [{"name": agent.PUBLISH_JOB, "status": "completed", "conclusion": "success"}]}
        agent.validate_release_run(run, jobs, manifest, "v0.4.0")
        for key, bad_value in (("event", "workflow_dispatch"), ("head_sha", "3" * 40), ("path", ".github/workflows/ci.yml"), ("conclusion", "failure")):
            invalid = dict(run)
            invalid[key] = bad_value
            with self.subTest(field=key), self.assertRaises(agent.AgentError):
                agent.validate_release_run(invalid, jobs, manifest, "v0.4.0")

    def test_ledger_blocks_duplicate_tag_commit_and_release_id(self):
        ledger = {"schemaVersion": 1, "releases": [{"tag": "v0.4.0", "commit": RELEASE_SHA, "releaseId": 9}]}
        self.assertTrue(agent.ledger_contains(ledger, "v0.4.0", "4" * 40, 10))
        self.assertTrue(agent.ledger_contains(ledger, "v0.4.1", RELEASE_SHA, 10))
        self.assertTrue(agent.ledger_contains(ledger, "v0.4.1", "4" * 40, 9))
        self.assertFalse(agent.ledger_contains(ledger, "v0.4.1", "4" * 40, 11))

    def test_api_url_with_invalid_port_is_rejected_without_opening_request(self):
        with patch.object(agent.urllib.request, "build_opener") as opener:
            with self.assertRaises(agent.AgentError) as raised:
                agent.request_json("https://api.github.com:invalid/repos/example")
        self.assertEqual(raised.exception.code, "provenance_mismatch")
        opener.assert_not_called()

    def test_load_archive_classifies_local_timeout_and_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "images.tar.gz"
            with gzip.open(archive, "wb") as stream:
                stream.write(b"synthetic image bytes")
            with patch.object(agent, "archive_image_info", return_value={"fragments-api:target": {"id": "sha256:" + "a" * 64}, "fragments-web:target": {"id": "sha256:" + "b" * 64}}):
                for failure, expected_code in (
                    (subprocess.TimeoutExpired(["docker", "load"], 1), "command_timeout"),
                    (subprocess.CalledProcessError(1, ["docker", "load"]), "command_failed"),
                    (OSError("synthetic"), "command_failed"),
                ):
                    with self.subTest(code=expected_code), patch.object(agent.subprocess, "run", side_effect=failure):
                        with self.assertRaises(agent.AgentError) as raised:
                            agent.load_archive(archive, {"api": "fragments-api:target", "web": "fragments-web:target"}, "v0.4.0", RELEASE_SHA)
                        self.assertEqual(raised.exception.code, expected_code)

    def test_archive_image_info_binds_config_digest_tags_and_labels(self):
        refs = {"api": "fragments-api:sha-" + RELEASE_SHA, "web": "fragments-web:sha-" + RELEASE_SHA}
        config_blobs = {}
        for key in ("api", "web"):
            config_blobs[f"{key}.json"] = json.dumps({
                "architecture": "arm64",
                "config": {"Labels": {
                    "org.opencontainers.image.version": "v0.4.0",
                    "org.opencontainers.image.revision": RELEASE_SHA,
                }},
            }, separators=(",", ":")).encode("utf-8")
        manifest = json.dumps([
            {"Config": "api.json", "RepoTags": [refs["api"]]},
            {"Config": "web.json", "RepoTags": [refs["web"]]},
        ]).encode("utf-8")
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "images.tar.gz"
            with tarfile.open(archive_path, mode="w:gz") as archive:
                for name, data in {"manifest.json": manifest, **config_blobs}.items():
                    info = tarfile.TarInfo(name)
                    info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
            result = agent.archive_image_info(archive_path, refs, "v0.4.0", RELEASE_SHA)
            self.assertEqual(result[refs["api"]]["id"], "sha256:" + agent.hashlib.sha256(config_blobs["api.json"]).hexdigest())
            self.assertEqual(result[refs["web"]]["architecture"], "arm64")

            invalid_config = json.dumps({"architecture": "arm64", "config": {"Labels": []}}).encode("utf-8")
            invalid_path = Path(directory) / "invalid.tar.gz"
            with tarfile.open(invalid_path, mode="w:gz") as archive:
                for name, data in {"manifest.json": manifest, "api.json": invalid_config, "web.json": config_blobs["web.json"]}.items():
                    info = tarfile.TarInfo(name)
                    info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
            with self.assertRaises(agent.AgentError) as raised:
                agent.archive_image_info(invalid_path, refs, "v0.4.0", RELEASE_SHA)
            self.assertEqual(raised.exception.code, "artifact_invalid")

    def test_offline_attestation_binds_artifact_repository_workflow_tag_commit_run_and_hosted_runner(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "state"
            state.mkdir()
            archive = root / "fragments-images.tar.gz"
            archive.write_bytes(b"signed test artifact")
            digest = agent.sha256_file(archive)
            bundle = root / "attestation.jsonl"
            bundle.write_text(json.dumps({"mediaType": "application/vnd.dev.sigstore.bundle.v0.3+json"}) + "\n", encoding="utf-8")
            bundle.chmod(0o600)

            def verified_record(**overrides):
                certificate = {
                    "issuer": "https://token.actions.githubusercontent.com",
                    "sourceRepositoryURI": "https://github.com/VGMil-dev/fragments",
                    "buildSignerURI": "https://github.com/VGMil-dev/fragments/.github/workflows/release.yml@refs/tags/v0.4.0",
                    "githubWorkflowRepository": "VGMil-dev/fragments",
                    "githubWorkflowTrigger": "push",
                    "githubWorkflowRef": "refs/tags/v0.4.0",
                    "githubWorkflowSHA": RELEASE_SHA,
                    "sourceRepositoryIdentifier": str(agent.REPOSITORY_ID),
                    "sourceRepositoryDigest": RELEASE_SHA,
                    "sourceRepositoryRef": "refs/tags/v0.4.0",
                    "runnerEnvironment": "github-hosted",
                    "runInvocationURI": "https://github.com/VGMil-dev/fragments/actions/runs/123456789/attempts/1",
                }
                certificate.update(overrides)
                return {
                    "verificationResult": {
                        "signature": {"certificate": certificate},
                        "verifiedTimestamps": [{"type": "Tlog", "timestamp": "2026-11-13T00:00:00Z"}],
                        "verifiedIdentity": {"runnerEnvironment": "github-hosted"},
                        "statement": {
                            "predicateType": "https://slsa.dev/provenance/v1",
                            "subject": [{"name": "fragments-images.tar.gz", "digest": {"sha256": digest}}],
                        },
                    }
                }

            result = json.dumps([verified_record()])
            with patch.object(agent, "run_checked", side_effect=["{\"mediaType\":\"application/vnd.dev.sigstore.trustedroot+json;version=0.1\"}", result]) as checked:
                agent.verify_attestation(archive, "v0.4.0", RELEASE_SHA, 123456789, digest, bundle, state)
            verify_args = checked.call_args.args[0]
            for expected in ("--bundle", str(bundle), "--custom-trusted-root", str(state / "trusted_root.jsonl"), "--signer-workflow", "--signer-digest", RELEASE_SHA, "--source-ref", "refs/tags/v0.4.0", "--source-digest", "--deny-self-hosted-runners"):
                self.assertIn(expected, verify_args)

            invalid_records = (
                verified_record(githubWorkflowRepository="attacker/repo"),
                verified_record(buildSignerURI="https://github.com/VGMil-dev/fragments/.github/workflows/untrusted.yml@refs/tags/v0.4.0"),
                verified_record(githubWorkflowRef="refs/tags/v0.4.1", sourceRepositoryRef="refs/tags/v0.4.1"),
                verified_record(githubWorkflowSHA="3" * 40, sourceRepositoryDigest="3" * 40),
                verified_record(runnerEnvironment="self-hosted"),
                verified_record(runInvocationURI="https://github.com/VGMil-dev/fragments/actions/runs/999/attempts/1"),
            )
            for invalid in invalid_records:
                with self.subTest(certificate=invalid["verificationResult"]["signature"]["certificate"]), patch.object(
                    agent, "run_checked", side_effect=["{\"mediaType\":\"application/vnd.dev.sigstore.trustedroot+json;version=0.1\"}", json.dumps([invalid])]
                ), self.assertRaises(agent.AgentError):
                    agent.verify_attestation(archive, "v0.4.0", RELEASE_SHA, 123456789, digest, bundle, state)

            with patch.object(agent, "run_checked") as checked, self.assertRaises(agent.AgentError):
                agent.verify_attestation(archive, "v0.4.0", RELEASE_SHA, 123456789, "0" * 64, bundle, state)
            checked.assert_not_called()

            bundle.write_text("\n", encoding="utf-8")
            with patch.object(agent, "run_checked") as checked, self.assertRaises(agent.AgentError):
                agent.verify_attestation(archive, "v0.4.0", RELEASE_SHA, 123456789, digest, bundle, state)
            checked.assert_not_called()

    def test_archive_cache_reuses_only_exact_size_and_manifest_digest(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "images.tar.gz"
            payload = b"approved test archive"
            path.write_bytes(payload)
            asset = {"size": len(payload)}
            digest = agent.sha256_file(path)
            with patch.object(agent, "download_asset") as download:
                agent.ensure_archive_available(asset, path, digest)
            download.assert_not_called()
            path.write_bytes(b"corrupt")
            with patch.object(agent, "download_asset", side_effect=lambda _asset, destination: destination.write_bytes(payload)) as download:
                agent.ensure_archive_available(asset, path, digest)
            download.assert_called_once_with(asset, path)

    def test_deployment_override_accepts_only_fixed_fragments_image_names(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)
            override = agent.compose_override(state, f"fragments-api:sha-{RELEASE_SHA}", f"fragments-web:sha-{RELEASE_SHA}", "v0.4.0", RELEASE_SHA)
            self.assertIn(f"image: fragments-api:sha-{RELEASE_SHA}", override.read_text(encoding="utf-8"))
            with self.assertRaises(agent.AgentError):
                agent.compose_override(state, "attacker/api:latest", f"fragments-web:sha-{RELEASE_SHA}", "v0.4.0", RELEASE_SHA)
            for invalid_version, invalid_sha in (("", RELEASE_SHA), (None, RELEASE_SHA), ("v0.4.0", None)):
                with self.subTest(version=invalid_version, sha=invalid_sha), self.assertRaises(agent.AgentError):
                    agent.compose_override(state, f"fragments-api:sha-{RELEASE_SHA}", f"fragments-web:sha-{RELEASE_SHA}", invalid_version, invalid_sha)

    def test_root_queue_accepts_one_fixed_numeric_request_file(self):
        with tempfile.TemporaryDirectory() as directory:
            request_dir = Path(directory) / "requests"
            request_dir.mkdir()
            request = request_dir / "release.request"
            request.write_text("321\n", encoding="ascii")
            config = {"requestDirectory": str(request_dir)}
            with patch.object(agent, "process_release") as process:
                agent.apply_queue(config)
            process.assert_called_once_with(321, config)
            self.assertFalse(request.exists())

    def test_manual_rollback_uses_only_previous_code_images_and_keeps_database(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ledger_path = root / "ledger.json"
            state = root / "state"
            state.mkdir()
            old_api = "fragments-api:50e2ace697afc125bb3bfdd9a705f0e383796a83"
            old_web = "fragments-web:50e2ace697afc125bb3bfdd9a705f0e383796a83"
            target_images = {"api": "fragments-api:target", "web": "fragments-web:target"}
            previous_images = {"fragments-api-1": old_api, "fragments-web-1": old_web}
            target_ids = {"fragments-api-1": "sha256:" + "a" * 64, "fragments-web-1": "sha256:" + "b" * 64}
            previous_ids = {"fragments-api-1": "sha256:" + "c" * 64, "fragments-web-1": "sha256:" + "d" * 64}
            neighbors = {"pits-development-app-1": {"id": "stable", "state": "running|healthy"}}
            observation = {"imageIds": target_ids, "health": {"fragments-api-1": ("running", "healthy"), "fragments-web-1": ("running", "healthy")}, "httpOk": True, "volume": "fragments_data", "neighbors": neighbors}
            after_rollback = {**observation, "imageIds": previous_ids}
            ledger = {
                "schemaVersion": 1,
                "releases": [{
                    "releaseId": 77,
                    "tag": "v0.4.0",
                    "commit": RELEASE_SHA,
                    "status": "rollback_failed",
                    "targetImages": target_images,
                    "targetImageIds": target_ids,
                    "previousImages": previous_images,
                    "previousImageIds": previous_ids,
                    "previousVolume": "fragments_data",
                    "beforeNeighbors": neighbors,
                }],
            }
            ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
            config = {
                "stateDirectory": str(state),
                "ledgerPath": str(ledger_path),
                "composeDirectory": str(root),
                "composeFile": str(root / "compose.yml"),
            }
            metadata_api = {"id": previous_ids["fragments-api-1"], "version": "v0.3.0", "revision": "5" * 40, "architecture": "arm64"}
            metadata_web = {"id": previous_ids["fragments-web-1"], "version": "v0.3.0", "revision": "5" * 40, "architecture": "arm64"}
            with (
                patch.object(agent, "observe_recovery_state", side_effect=[observation, after_rollback]),
                patch.object(agent, "image_info", side_effect=[metadata_api, metadata_web]),
                patch.object(agent, "run_checked", return_value=""),
                patch.object(agent, "compose_up") as compose,
                patch.object(agent, "compose_override", return_value=root / "override.yml"),
                patch.object(agent, "wait_for_health") as health,
            ):
                agent.rollback_latest(config)
            compose.assert_called_once()
            health.assert_called_once_with("v0.4.0", RELEASE_SHA, {"fragments-api-1": old_api, "fragments-web-1": old_web}, rollback=True)
            result = json.loads(ledger_path.read_text(encoding="utf-8"))
            self.assertEqual(result["releases"][0]["status"], "rolled_back_manual")
            self.assertEqual(result["releases"][0]["rollback"], "code_images_restored_database_untouched")

    def test_manual_rollback_rejects_ineligible_latest_without_mutating_docker(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "state"
            state.mkdir()
            ledger_path = root / "ledger.json"
            config = {"stateDirectory": str(state), "ledgerPath": str(ledger_path)}
            older = {"status": "deployed", "tag": "v0.3.0", "commit": "3" * 40}
            for latest_status in ("recovery_required", "deploying", "rejected", "rolled_back_manual"):
                newest = {"status": latest_status, "tag": "v0.4.0", "commit": RELEASE_SHA}
                ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": [older, newest]}), encoding="utf-8")
                with self.subTest(status=latest_status):
                    with (
                        patch.object(agent, "compose_up") as compose,
                        patch.object(agent, "run_checked") as checked,
                        patch.object(agent, "image_info") as image,
                        patch.object(agent, "compose_override") as override,
                        self.assertRaises(agent.AgentError),
                    ):
                        agent.rollback_latest(config)
                compose.assert_not_called()
                checked.assert_not_called()
                image.assert_not_called()
                override.assert_not_called()
                self.assertEqual(json.loads(ledger_path.read_text(encoding="utf-8"))["releases"], [older, newest])

    def test_manual_rollback_rejects_target_identity_or_baseline_mismatch_without_mutating(self):
        target_ids = {"fragments-api-1": "sha256:" + "a" * 64, "fragments-web-1": "sha256:" + "b" * 64}
        record = {
            "releaseId": 77, "tag": "v0.4.0", "commit": RELEASE_SHA, "status": "deployed",
            "targetImages": {"fragments-api-1": "fragments-api:target", "fragments-web-1": "fragments-web:target"},
            "targetImageIds": target_ids,
            "previousImages": {"fragments-api-1": "fragments-api:old", "fragments-web-1": "fragments-web:old"},
            "previousImageIds": {"fragments-api-1": "sha256:" + "c" * 64, "fragments-web-1": "sha256:" + "d" * 64},
            "previousVolume": "fragments_data",
            "beforeNeighbors": {"pits-development-app-1": {"id": "stable", "state": "running|healthy"}},
        }
        healthy = {"fragments-api-1": ("running", "healthy"), "fragments-web-1": ("running", "healthy")}
        base = {"imageIds": target_ids, "health": healthy, "httpOk": True, "volume": "fragments_data", "neighbors": record["beforeNeighbors"]}
        invalid_observations = [
            {**base, "imageIds": {**target_ids, "fragments-web-1": "sha256:" + "e" * 64}},
            {**base, "volume": "changed_volume"},
            {**base, "neighbors": {}},
            {**base, "health": {**healthy, "fragments-api-1": ("running", "starting")}},
        ]
        for observation in invalid_observations:
            with self.subTest(observation=observation):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    state = root / "state"
                    state.mkdir()
                    ledger_path = root / "ledger.json"
                    ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": [record]}), encoding="utf-8")
                    config = {"stateDirectory": str(state), "ledgerPath": str(ledger_path)}
                    with (
                        patch.object(agent, "observe_recovery_state", return_value=observation),
                        patch.object(agent, "compose_up") as compose,
                        patch.object(agent, "run_checked") as checked,
                        patch.object(agent, "image_info") as image,
                        patch.object(agent, "compose_override") as override,
                        self.assertRaises(agent.AgentError),
                    ):
                        agent.rollback_latest(config)
                    compose.assert_not_called()
                    checked.assert_not_called()
                    image.assert_not_called()
                    override.assert_not_called()

    def test_backup_simulation_requires_private_root_owned_integral_sqlite_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            backup_dir = Path(directory)
            backup = backup_dir / "fragments-fixture.sqlite"
            database = sqlite3.connect(backup)
            try:
                database.execute("CREATE TABLE fixture (id INTEGER PRIMARY KEY)")
                database.execute("INSERT INTO fixture VALUES (1)")
            finally:
                database.close()
            backup.chmod(0o600)
            original_stat = Path.stat

            def simulated_stat(path, *args, **kwargs):
                if path == backup:
                    real = original_stat(path, *args, **kwargs)
                    return SimpleNamespace(st_uid=0, st_mode=stat.S_IFREG | 0o600, st_mtime_ns=1, st_size=real.st_size)
                return original_stat(path, *args, **kwargs)

            config = {"backupDirectory": str(backup_dir)}
            with patch.object(agent, "run_checked", return_value=""), patch.object(Path, "stat", simulated_stat):
                result = agent.integrity_check_backup(config, set())
            self.assertEqual(result["integrity"], "ok")
            self.assertEqual(result["sha256"], agent.sha256_file(backup))

            backup.write_bytes(b"not a sqlite database")
            with patch.object(agent, "run_checked", return_value=""), patch.object(Path, "stat", simulated_stat):
                with self.assertRaises(agent.AgentError):
                    agent.integrity_check_backup(config, set())

    def run_mock_release_transaction(self, fail_health=False, fail_backup=False):
        root_context = tempfile.TemporaryDirectory()
        self.addCleanup(root_context.cleanup)
        root = Path(root_context.name)
        state = root / "state"
        backup_dir = root / "backups"
        state.mkdir()
        backup_dir.mkdir()
        ledger_path = state / "ledger.json"
        ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": []}), encoding="utf-8")
        archive = root / "fragments-images.tar.gz"
        archive.write_bytes(b"synthetic-only archive")
        archive_asset = {"size": archive.stat().st_size}
        attestation = root / "attestation.jsonl"
        config = {
            "stateDirectory": str(state),
            "ledgerPath": str(ledger_path),
            "gitDirectory": str(root / "source.git"),
            "backupDirectory": str(backup_dir),
            "composeDirectory": str(root),
            "composeFile": str(root / "docker-compose.yml"),
            "requestDirectory": str(root / "requests"),
        }
        manifest = release_fixture()
        release = {"id": 123456789, "tag_name": manifest["tag"]}
        run = {
            "path": agent.WORKFLOW_PATH,
            "event": "push",
            "head_branch": manifest["tag"],
            "head_sha": RELEASE_SHA,
            "status": "completed",
            "conclusion": "success",
            "id": 123456789,
            "repository": {"id": agent.REPOSITORY_ID},
        }
        jobs = {"jobs": [{"name": agent.PUBLISH_JOB, "status": "completed", "conclusion": "success"}]}
        previous_images = {
            "fragments-api-1": "fragments-api:previous",
            "fragments-web-1": "fragments-web:previous",
        }
        neighbors = {"pits-development-app-1": {"id": "fixed-container-id", "state": "running|healthy"}}
        health_error = [agent.AgentError("synthetic health failure")] if fail_health else []
        backup_error = [agent.AgentError("synthetic backup command failure", code="command_failed")] if fail_backup else []

        def wait_health(*args, **kwargs):
            if health_error:
                raise health_error.pop(0)

        def backup(*args, **kwargs):
            if backup_error:
                raise backup_error.pop(0)
            return {"file": "fixture.sqlite", "bytes": 32, "sha256": "d" * 64, "integrity": "ok"}

        with (
            patch.object(agent, "get_release_assets", return_value=(manifest, release, archive_asset, archive, attestation)),
            patch.object(agent, "request_json", side_effect=lambda url: jobs if "/jobs?" in url else run),
            patch.object(agent, "validate_release_run"),
            patch.object(agent, "verify_git_source"),
            patch.object(agent, "verify_attestation"),
            patch.object(agent, "ensure_archive_available"),
            patch.object(agent, "archive_image_info", return_value={
                manifest["images"]["api"]: {"id": "sha256:" + "a" * 64},
                manifest["images"]["web"]: {"id": "sha256:" + "b" * 64},
            }),
            patch.object(agent, "load_archive"),
            patch.object(agent, "container_snapshot", return_value=neighbors),
            patch.object(agent, "image_refs_for_running", return_value=previous_images),
            patch.object(agent, "image_ids_for_running", return_value={"fragments-api-1": "sha256:" + "c" * 64, "fragments-web-1": "sha256:" + "d" * 64}),
            patch.object(agent, "fragments_data_volume", return_value="fragments-data"),
            patch.object(agent, "container_health", return_value=("running", "healthy", "fragments-api:current")),
            patch.object(agent, "integrity_check_backup", side_effect=backup),
            patch.object(agent, "image_info", return_value={"version": "v0.3.1", "revision": "5" * 40, "architecture": "arm64"}),
            patch.object(agent, "run_checked", return_value="") as checked_mock,
            patch.object(agent.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout="200")),
            patch.object(agent, "wait_for_health", side_effect=wait_health) as health_mock,
        ):
            if fail_backup or fail_health:
                with self.assertRaises(agent.AgentError):
                    agent.process_release(123456789, config)
            else:
                agent.process_release(123456789, config)

        result = json.loads(ledger_path.read_text(encoding="utf-8"))
        return result["releases"][0], health_mock, checked_mock, archive

    def test_full_approved_release_transaction_simulates_only_fixed_app_services(self):
        record, health, checked, archive = self.run_mock_release_transaction()
        self.assertEqual(record["status"], "deployed")
        self.assertEqual(record["backup"]["integrity"], "ok")
        self.assertFalse(archive.exists())
        health.assert_called_once()
        compose_args = [call.args[0] for call in checked.call_args_list if "up" in call.args[0]]
        self.assertEqual(len(compose_args), 1)
        self.assertEqual(compose_args[0][-2:], ["api", "web"])

    def test_failed_health_simulates_code_rollback_without_database_restore(self):
        record, health, checked, archive = self.run_mock_release_transaction(fail_health=True)
        self.assertEqual(record["status"], "rolled_back")
        self.assertEqual(record["rollback"], "code_images_restored_database_untouched")
        self.assertFalse(archive.exists())
        self.assertEqual(health.call_count, 2)
        self.assertTrue(health.call_args.kwargs["rollback"])
        compose_args = [call.args[0] for call in checked.call_args_list if "up" in call.args[0]]
        self.assertEqual(len(compose_args), 2)
        self.assertTrue(all(arguments[-2:] == ["api", "web"] for arguments in compose_args))

    def test_backup_failure_after_deploying_requires_manual_recovery_before_compose(self):
        record, _health, checked, archive = self.run_mock_release_transaction(fail_backup=True)
        self.assertEqual(record["status"], "recovery_required")
        self.assertEqual(record["error"], {"code": "command_failed"})
        checked.assert_not_called()
        self.assertFalse(archive.exists())


class NetworkPolicyTests(unittest.TestCase):
    def test_http_status_mapping_and_403_header_rules(self):
        self.assertEqual(agent._http_error_code(408, HTTPMessage()), ("http_transient_status", True))
        self.assertEqual(agent._http_error_code(425, HTTPMessage()), ("http_transient_status", True))
        self.assertEqual(agent._http_error_code(429, HTTPMessage()), ("http_transient_status", True))
        self.assertEqual(agent._http_error_code(503, HTTPMessage()), ("http_transient_status", True))
        self.assertEqual(agent._http_error_code(401, HTTPMessage()), ("http_unauthorized", False))
        self.assertEqual(agent._http_error_code(404, HTTPMessage()), ("http_not_found", False))
        self.assertEqual(agent._http_error_code(409, HTTPMessage()), ("http_conflict", False))
        self.assertEqual(agent._http_error_code(302, HTTPMessage()), ("http_unexpected_status", False))
        rate_limited = HTTPMessage()
        rate_limited.add_header("x-ratelimit-remaining", " \t0\t ")
        self.assertEqual(agent._http_error_code(403, rate_limited), ("http_rate_limited", True))
        for values in ([], ["1"], ["00"], ["0 0"], ["0", "0"]):
            headers = HTTPMessage()
            for value in values:
                headers.add_header("X-RateLimit-Remaining", value)
            with self.subTest(values=values):
                self.assertEqual(agent._http_error_code(403, headers), ("http_forbidden", False))

    def test_api_http_error_is_redacted_and_redirect_is_not_followed(self):
        for status in (301, 302, 303, 307, 308):
            headers = HTTPMessage()
            headers.add_header("Location", "https://api.github.com/redirected")
            body = io.BytesIO(b"SECRET_BODY_SENTINEL")
            error = urllib.error.HTTPError("https://api.github.com/example", status, "Found", headers, body)
            opener = SimpleNamespace(open=Mock(side_effect=error))
            with self.subTest(status=status), patch.object(agent.urllib.request, "build_opener", return_value=opener), self.assertRaises(agent.AgentError) as raised:
                agent.request_json("https://api.github.com/example")
            opener.open.assert_called_once()
            self.assertEqual(raised.exception.code, "http_unexpected_status")
            self.assertEqual(raised.exception.http_status, status)
            self.assertNotIn("SECRET_BODY_SENTINEL", str(raised.exception))
            request = urllib.request.Request("https://api.github.com/example")
            self.assertIsNone(agent._NoRedirect().redirect_request(request, None, status, "Found", headers, "https://api.github.com/redirected"))

    def test_unknown_urlerror_reasons_fail_closed(self):
        for reason in ("SECRET_URL_REASON_SENTINEL", ValueError("SECRET_EXCEPTION_SENTINEL")):
            opener = SimpleNamespace(open=Mock(side_effect=urllib.error.URLError(reason)))
            with self.subTest(reason=type(reason).__name__), patch.object(agent.urllib.request, "build_opener", return_value=opener), self.assertRaises(agent.AgentError) as raised:
                agent.request_json("https://api.github.com/example")
            self.assertEqual(raised.exception.code, "unknown_error")
            self.assertNotIn("SECRET_URL_REASON_SENTINEL", str(raised.exception))
            self.assertNotIn("SECRET_EXCEPTION_SENTINEL", str(raised.exception))

    def test_request_json_rejects_scalar_and_oversize_responses(self):
        for body, maximum, expected in ((b"null", 100, "invalid_response"), (b"{}", 1, "invalid_response")):
            opener = SimpleNamespace(open=Mock(return_value=io.BytesIO(body)))
            with self.subTest(body=body), patch.object(agent.urllib.request, "build_opener", return_value=opener), self.assertRaises(agent.AgentError) as raised:
                agent.request_json("https://api.github.com/example", max_bytes=maximum)
            self.assertEqual(raised.exception.code, expected)

    def test_remote_and_local_subprocess_failures_have_distinct_classes(self):
        with patch.object(agent.subprocess, "run", side_effect=subprocess.TimeoutExpired(["git"], 1)):
            with self.assertRaises(agent.AgentError) as local_timeout:
                agent.run_checked(["git", "status"], remote=False)
            with self.assertRaises(agent.TransientError) as remote_timeout:
                agent.run_checked(["git", "fetch"], remote=True)
        self.assertEqual(local_timeout.exception.code, "command_timeout")
        self.assertEqual(remote_timeout.exception.code, "command_timeout")
        with patch.object(agent.subprocess, "run", return_value=SimpleNamespace(returncode=2, stdout="", stderr="SECRET_STDERR_SENTINEL")):
            with self.assertRaises(agent.AgentError) as local_failure:
                agent.run_checked(["docker", "inspect"])
            with self.assertRaises(agent.TransientError) as remote_failure:
                agent.run_checked(["git", "fetch"], remote=True)
        self.assertEqual(local_failure.exception.code, "command_failed")
        self.assertEqual(remote_failure.exception.code, "remote_command_unavailable")
        with patch.object(agent.subprocess, "run", side_effect=OSError("SECRET_EXCEPTION_SENTINEL")):
            with self.assertRaises(agent.AgentError) as launch_failure:
                agent.run_checked(["gh", "attestation"], remote=True)
        self.assertEqual(launch_failure.exception.code, "command_failed")

    def test_retry_event_has_closed_redacted_json_shape(self):
        output = io.StringIO()
        error = agent.TransientError("SECRET_SENTINEL SECRET_BODY_SENTINEL SECRET_STDERR_SENTINEL SECRET_EXCEPTION_SENTINEL", code="http_transient_status", http_status=503)
        with redirect_stdout(output):
            agent.report_retry(77, "v0.4.0", error)
        event = json.loads(output.getvalue())
        self.assertEqual(event, {"event": "release_retry", "release_id": "77", "tag": "v0.4.0", "code": "http_transient_status", "http_status": 503})
        for sentinel in ("SECRET_SENTINEL", "SECRET_BODY_SENTINEL", "SECRET_STDERR_SENTINEL", "SECRET_EXCEPTION_SENTINEL"):
            self.assertNotIn(sentinel, output.getvalue())

    def test_asset_hostname_and_redirect_policy_boundaries(self):
        self.assertEqual(agent.canonical_dns_hostname("GitHub.COM"), "github.com")
        maximum = ".".join(["a" * 63, "b" * 63, "c" * 63, "d" * 61])
        self.assertEqual(len(agent.canonical_dns_hostname(maximum)), 253)
        for invalid in (
            "", "-bad.example", "bad-.example", "a..example", "example.",
            "a" * 64 + ".example", ".".join(["a" * 63, "b" * 63, "c" * 63, "d" * 62]),
            "127.0.0.1", "2001:db8::1", "idéntité.example",
        ):
            with self.subTest(host=invalid), self.assertRaises(agent.AgentError):
                agent.canonical_dns_hostname(invalid)
        self.assertTrue(agent._asset_host_allowed("github.com"))
        self.assertTrue(agent._asset_host_allowed("release-assets.githubusercontent.com"))
        self.assertTrue(agent._asset_host_allowed("x.githubusercontent.com"))
        self.assertFalse(agent._asset_host_allowed("githubusercontent.com"))
        self.assertFalse(agent._asset_host_allowed("notgithubusercontent.com"))
        self.assertFalse(agent._asset_host_allowed("evil.amazonaws.com"))
        for url in (
            "http://github.com/VGMil-dev/fragments/releases/download/v0.4.0/a",
            "https://user@github.com/VGMil-dev/fragments/releases/download/v0.4.0/a",
            "https://github.com:444/VGMil-dev/fragments/releases/download/v0.4.0/a",
            "https://github.com:/VGMil-dev/fragments/releases/download/v0.4.0/a",
            "https://127.0.0.1/VGMil-dev/fragments/releases/download/v0.4.0/a",
        ):
            with self.subTest(url=url), self.assertRaises(agent.AgentError):
                agent.asset_url_identity(url)
        handler = agent.GitHubAssetRedirect("https://release-assets.githubusercontent.com/start")
        request = urllib.request.Request("https://release-assets.githubusercontent.com/start")
        with self.assertRaises(agent.AgentError) as disallowed:
            handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example.test/file")
        self.assertEqual(disallowed.exception.code, "asset_redirect_rejected")

    def test_asset_redirect_rejects_cycles_and_sixth_hop(self):
        start = "https://release-assets.githubusercontent.com/start"
        handler = agent.GitHubAssetRedirect(start)
        request = urllib.request.Request(start)
        headers = {}
        handler.redirect_request(request, None, 302, "Found", headers, "https://objects.githubusercontent.com/next")
        with self.assertRaises(agent.AgentError) as cycle:
            handler.redirect_request(request, None, 302, "Found", headers, start + "#ignored")
        self.assertEqual(cycle.exception.code, "asset_redirect_rejected")

        handler = agent.GitHubAssetRedirect(start)
        current = start
        for index in range(5):
            current = f"https://release-assets.githubusercontent.com/hop-{index}"
            handler.redirect_request(request, None, 302, "Found", headers, current)
        with self.assertRaises(agent.AgentError) as sixth:
            handler.redirect_request(request, None, 302, "Found", headers, "https://objects.githubusercontent.com/hop-6")
        self.assertEqual(sixth.exception.code, "asset_redirect_rejected")


class PollRecoveryTests(unittest.TestCase):
    def poll_with_ledger(self, entry):
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        directory = Path(root.name)
        ledger_path = directory / "ledger.json"
        ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": [entry]}), encoding="utf-8")
        requests = directory / "requests"
        config = {"ledgerPath": str(ledger_path), "requestDirectory": str(requests)}
        release = {"id": 77, "tag_name": "v0.4.0", "draft": False, "prerelease": False, "assets": [{"name": "release-manifest.json"}]}
        with patch.object(agent, "request_json", side_effect=[[release], []]):
            agent.poll(config)
        return requests / "release.request"

    def test_poll_requeues_same_deploying_identity(self):
        request = self.poll_with_ledger({"releaseId": 77, "tag": "v0.4.0", "status": "deploying"})
        self.assertEqual(request.read_text(encoding="ascii"), "77\n")

    def test_poll_does_not_requeue_terminal_identity(self):
        for status in agent.TERMINAL_RELEASE_STATES:
            with self.subTest(status=status):
                request = self.poll_with_ledger({"releaseId": 77, "tag": "v0.4.0", "status": status})
                self.assertFalse(request.exists())

    def test_poll_fails_closed_for_duplicate_release_identity(self):
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        directory = Path(root.name)
        ledger_path = directory / "ledger.json"
        ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": [
            {"releaseId": 77, "tag": "v0.4.0", "status": "deploying"},
            {"releaseId": 77, "tag": "v0.4.0", "status": "deploying"},
        ]}), encoding="utf-8")
        requests = directory / "requests"
        release = {"id": 77, "tag_name": "v0.4.0", "draft": False, "prerelease": False, "assets": [{"name": "release-manifest.json"}]}
        with patch.object(agent, "request_json", side_effect=[[release], []]):
            agent.poll({"ledgerPath": str(ledger_path), "requestDirectory": str(requests)})
        self.assertFalse((requests / "release.request").exists())


class TransactionRecoveryTests(unittest.TestCase):
    def baseline_record(self, status="deploying"):
        return {
            "releaseId": 77,
            "tag": "v0.4.0",
            "tagObject": TAG_OBJECT,
            "commit": RELEASE_SHA,
            "status": status,
            "targetImages": {"api": "fragments-api:sha-" + RELEASE_SHA, "web": "fragments-web:sha-" + RELEASE_SHA},
            "targetImageIds": {"fragments-api-1": "sha256:" + "a" * 64, "fragments-web-1": "sha256:" + "b" * 64},
            "previousImages": {"fragments-api-1": "fragments-api:previous", "fragments-web-1": "fragments-web:previous"},
            "previousImageIds": {"fragments-api-1": "sha256:" + "c" * 64, "fragments-web-1": "sha256:" + "d" * 64},
            "previousVolume": "fragments_data",
            "beforeNeighbors": {"pits-development-app-1": {"id": "stable", "state": "running|healthy"}},
        }

    def run_pending_release(self, record, release_effect):
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        directory = Path(root.name)
        state = directory / "state"
        state.mkdir()
        ledger_path = state / "ledger.json"
        ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": [record]}), encoding="utf-8")
        config = {"stateDirectory": str(state), "ledgerPath": str(ledger_path)}
        output = io.StringIO()
        with (
            patch.object(agent, "get_release_assets", side_effect=release_effect) as get_assets,
            patch.object(agent, "compose_up") as compose,
            patch.object(agent, "run_checked") as checked,
            redirect_stdout(output),
        ):
            agent.process_release(77, config)
        return ledger_path, output.getvalue(), get_assets, compose, checked

    def simulate_interruption_and_recovery(self, interruption, final_image_ids, expected_status):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "state"
            backups = root / "backups"
            state.mkdir()
            backups.mkdir()
            ledger_path = state / "ledger.json"
            ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": []}), encoding="utf-8")
            archive = root / "images.tar.gz"
            archive.write_bytes(b"synthetic-only archive")
            attestation = root / "attestation.jsonl"
            config = {
                "stateDirectory": str(state), "ledgerPath": str(ledger_path),
                "gitDirectory": str(root / "source.git"), "backupDirectory": str(backups),
                "composeDirectory": str(root), "composeFile": str(root / "compose.yml"),
                "requestDirectory": str(root / "requests"),
            }
            manifest = release_fixture()
            release = {"id": 77, "tag_name": manifest["tag"]}
            run = {
                "path": agent.WORKFLOW_PATH, "event": "push", "head_branch": manifest["tag"],
                "head_sha": RELEASE_SHA, "status": "completed", "conclusion": "success",
                "id": int(manifest["runId"]), "repository": {"id": agent.REPOSITORY_ID},
            }
            jobs = {"jobs": [{"name": agent.PUBLISH_JOB, "status": "completed", "conclusion": "success"}]}
            previous_images = {"fragments-api-1": "fragments-api:previous", "fragments-web-1": "fragments-web:previous"}
            previous_ids = {"fragments-api-1": "sha256:" + "c" * 64, "fragments-web-1": "sha256:" + "d" * 64}
            target_ids = {"fragments-api-1": "sha256:" + "a" * 64, "fragments-web-1": "sha256:" + "b" * 64}
            neighbors = {"pits-development-app-1": {"id": "fixed-container-id", "state": "running|healthy"}}
            healthy = {"fragments-api-1": ("running", "healthy"), "fragments-web-1": ("running", "healthy")}
            observation = {
                "imageIds": final_image_ids, "health": healthy, "httpOk": True,
                "volume": "fragments-data", "neighbors": neighbors,
            }
            output_asset = {"size": archive.stat().st_size}
            archive_data = {
                manifest["images"]["api"]: {"id": target_ids["fragments-api-1"]},
                manifest["images"]["web"]: {"id": target_ids["fragments-web-1"]},
            }
            original_write = agent.write_ledger
            write_count = 0

            def write_then_interrupt(path, data):
                nonlocal write_count
                original_write(path, data)
                write_count += 1
                if interruption == "ledger" and write_count == 1:
                    raise SystemExit("synthetic process interruption after ledger replace")
                if interruption == "backup" and write_count == 2:
                    raise SystemExit("synthetic process interruption after backup ledger update")

            def compose_effect(*_args):
                if interruption == "rollback" and compose.call_count == 2:
                    raise SystemExit("synthetic process interruption during rollback")

            def health_effect(*_args, **_kwargs):
                if interruption in {"api", "web"}:
                    raise SystemExit("synthetic process interruption after service recreation")
                if interruption == "rollback":
                    raise agent.AgentError("synthetic deployment health failure", code="command_failed")

            with ExitStack() as stack:
                stack.enter_context(patch.object(agent, "write_ledger", side_effect=write_then_interrupt))
                stack.enter_context(patch.object(agent, "get_release_assets", return_value=(manifest, release, output_asset, archive, attestation)))
                stack.enter_context(patch.object(agent, "request_json", side_effect=lambda url: jobs if "/jobs?" in url else run))
                stack.enter_context(patch.object(agent, "validate_release_run"))
                stack.enter_context(patch.object(agent, "verify_git_source"))
                stack.enter_context(patch.object(agent, "ensure_archive_available"))
                stack.enter_context(patch.object(agent, "verify_attestation"))
                stack.enter_context(patch.object(agent, "archive_image_info", return_value=archive_data))
                stack.enter_context(patch.object(agent, "load_archive"))
                stack.enter_context(patch.object(agent, "container_snapshot", return_value=neighbors))
                stack.enter_context(patch.object(agent, "image_refs_for_running", return_value=previous_images))
                stack.enter_context(patch.object(agent, "image_ids_for_running", return_value=previous_ids))
                stack.enter_context(patch.object(agent, "fragments_data_volume", return_value="fragments-data"))
                stack.enter_context(patch.object(agent, "container_health", return_value=("running", "healthy", "fragments-api:current")))
                stack.enter_context(patch.object(agent, "integrity_check_backup", return_value={"file": "fixture.sqlite", "bytes": 32, "sha256": "e" * 64, "integrity": "ok"}))
                stack.enter_context(patch.object(agent, "image_info", return_value={"id": previous_ids["fragments-api-1"], "version": "v0.3.0", "revision": "5" * 40, "architecture": "arm64"}))
                checked = stack.enter_context(patch.object(agent, "run_checked", return_value=""))
                stack.enter_context(patch.object(agent.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout="200")))
                stack.enter_context(patch.object(agent, "compose_override", return_value=state / "override.yml"))
                compose = stack.enter_context(patch.object(agent, "compose_up", side_effect=compose_effect))
                stack.enter_context(patch.object(agent, "wait_for_health", side_effect=health_effect))
                observe = stack.enter_context(patch.object(agent, "observe_recovery_state"))
                with self.assertRaises(SystemExit):
                    agent.process_release(77, config)
                before_recovery_compose_calls = compose.call_count
                before_recovery_command_calls = checked.call_count
                pending = json.loads(ledger_path.read_text(encoding="utf-8"))["releases"][0]
                self.assertEqual(pending["status"], "deploying")

                observe.side_effect = [observation, observation]
                agent.process_release(77, config)

                self.assertEqual(compose.call_count, before_recovery_compose_calls)
                self.assertEqual(checked.call_count, before_recovery_command_calls)
            final_record = json.loads(ledger_path.read_text(encoding="utf-8"))["releases"][0]
            self.assertEqual(final_record["status"], expected_status)

    def test_interruption_after_ledger_and_backup_reconciles_previous_state(self):
        previous_ids = {"fragments-api-1": "sha256:" + "c" * 64, "fragments-web-1": "sha256:" + "d" * 64}
        for interruption in ("ledger", "backup"):
            with self.subTest(interruption=interruption):
                self.simulate_interruption_and_recovery(interruption, previous_ids, "reconciled_previous_state")

    def test_interruption_after_api_web_recreation_or_during_rollback_reconciles_safely(self):
        target_ids = {"fragments-api-1": "sha256:" + "a" * 64, "fragments-web-1": "sha256:" + "b" * 64}
        previous_ids = {"fragments-api-1": "sha256:" + "c" * 64, "fragments-web-1": "sha256:" + "d" * 64}
        api_only = {"fragments-api-1": target_ids["fragments-api-1"], "fragments-web-1": previous_ids["fragments-web-1"]}
        for interruption, image_ids, expected in (
            ("api", api_only, "recovery_required"),
            ("web", target_ids, "deployed"),
            ("rollback", api_only, "recovery_required"),
        ):
            with self.subTest(interruption=interruption):
                self.simulate_interruption_and_recovery(interruption, image_ids, expected)

    def test_transient_pending_release_keeps_same_deploying_record_and_redacts_event(self):
        record = self.baseline_record()
        ledger_path, output, get_assets, compose, checked = self.run_pending_release(
            record, agent.TransientError("SECRET_BODY_SENTINEL", code="transport_error")
        )
        result = json.loads(ledger_path.read_text(encoding="utf-8"))
        self.assertEqual(result["releases"], [record])
        event = json.loads(output)
        self.assertEqual(event, {"event": "release_retry", "release_id": "77", "tag": "v0.4.0", "code": "transport_error"})
        self.assertNotIn("SECRET_BODY_SENTINEL", output)
        get_assets.assert_called_once()
        compose.assert_not_called()
        checked.assert_not_called()

    def test_terminal_request_is_noop_before_network_or_docker(self):
        record = self.baseline_record(status="deployed")
        ledger_path, output, get_assets, compose, checked = self.run_pending_release(
            record, AssertionError("network must not be reached")
        )
        self.assertEqual(json.loads(ledger_path.read_text(encoding="utf-8"))["releases"], [record])
        self.assertEqual(json.loads(output), {"event": "release_apply_noop", "release_id": "77", "tag": "v0.4.0", "code": "terminal_state"})
        get_assets.assert_not_called()
        compose.assert_not_called()
        checked.assert_not_called()

    def test_permanent_validation_failure_keeps_observed_tag_and_stable_error_only(self):
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        directory = Path(root.name)
        state = directory / "state"
        state.mkdir()
        ledger_path = state / "ledger.json"
        ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": []}), encoding="utf-8")
        output = io.StringIO()
        with patch.object(agent, "get_release_assets", side_effect=agent.AgentError("SECRET_EXCEPTION_SENTINEL", code="provenance_mismatch", observed_tag="v0.4.0")), redirect_stdout(output):
            agent.process_release(77, {"stateDirectory": str(state), "ledgerPath": str(ledger_path)})
        record = json.loads(ledger_path.read_text(encoding="utf-8"))["releases"][0]
        self.assertEqual((record["releaseId"], record["tag"], record["status"]), (77, "v0.4.0", "rejected"))
        self.assertEqual(record["error"], {"code": "provenance_mismatch"})
        self.assertNotIn("SECRET_EXCEPTION_SENTINEL", output.getvalue())

    def test_transient_validation_event_keeps_observed_release_tag(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "state"
            state.mkdir()
            ledger_path = state / "ledger.json"
            ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": []}), encoding="utf-8")
            output = io.StringIO()
            with patch.object(agent, "get_release_assets", side_effect=agent.TransientError("SECRET_SENTINEL", code="transport_error", observed_tag="v0.4.0")), redirect_stdout(output):
                agent.process_release(77, {"stateDirectory": str(state), "ledgerPath": str(ledger_path)})
            self.assertEqual(json.loads(output.getvalue())["tag"], "v0.4.0")
            self.assertEqual(json.loads(ledger_path.read_text(encoding="utf-8"))["releases"], [])

    @unittest.skipUnless(os.name == "posix", "flock contention is verified on Linux CI")
    def test_manual_rollback_cannot_enter_while_another_operation_holds_agent_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "state"
            state.mkdir()
            lock_path = state / "agent.lock"
            ledger_path = root / "ledger.json"
            ledger_path.write_text(json.dumps({"schemaVersion": 1, "releases": []}), encoding="utf-8")
            config = {"stateDirectory": str(state), "ledgerPath": str(ledger_path)}
            with lock_path.open("a", encoding="utf-8") as held_lock:
                agent.fcntl.flock(held_lock.fileno(), agent.fcntl.LOCK_EX | agent.fcntl.LOCK_NB)
                with patch.object(agent, "compose_up") as compose, patch.object(agent, "run_checked") as checked:
                    with self.assertRaises(BlockingIOError):
                        agent.rollback_latest(config)
                compose.assert_not_called()
                checked.assert_not_called()

    def test_reconcile_only_transitions_exact_healthy_target_or_previous_state(self):
        record = self.baseline_record()
        healthy = {"fragments-api-1": ("running", "healthy"), "fragments-web-1": ("running", "healthy")}
        for image_ids, expected in ((record["targetImageIds"], "deployed"), (record["previousImageIds"], "reconciled_previous_state")):
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as directory:
                ledger_path = Path(directory) / "ledger.json"
                ledger = {"schemaVersion": 1, "releases": [dict(record)]}
                observation = {"imageIds": image_ids, "health": healthy, "httpOk": True, "volume": record["previousVolume"], "neighbors": record["beforeNeighbors"]}
                with patch.object(agent, "observe_recovery_state", side_effect=[observation, observation]), patch.object(agent, "run_checked") as checked:
                    status = agent.reconcile_deploying_record(ledger, ledger_path, ledger["releases"][0])
                self.assertEqual(status, expected)
                checked.assert_not_called()

    def test_reconcile_marks_unknown_image_state_recovery_required_without_mutation(self):
        record = self.baseline_record()
        healthy = {"fragments-api-1": ("running", "healthy"), "fragments-web-1": ("running", "healthy")}
        unknown = {"fragments-api-1": "sha256:" + "e" * 64, "fragments-web-1": record["targetImageIds"]["fragments-web-1"]}
        observation = {"imageIds": unknown, "health": healthy, "httpOk": True, "volume": record["previousVolume"], "neighbors": record["beforeNeighbors"]}
        with tempfile.TemporaryDirectory() as directory:
            ledger_path = Path(directory) / "ledger.json"
            ledger = {"schemaVersion": 1, "releases": [record]}
            with patch.object(agent, "observe_recovery_state", side_effect=[observation, observation]), patch.object(agent, "run_checked") as checked, patch.object(agent, "compose_up") as compose:
                status = agent.reconcile_deploying_record(ledger, ledger_path, record)
            self.assertEqual(status, "recovery_required")
            self.assertEqual(record["error"], {"code": "unknown_error"})
            checked.assert_not_called()
            compose.assert_not_called()

    def test_reconcile_rejects_incomplete_baseline_before_observing_or_mutating(self):
        record = self.baseline_record()
        malformed_baselines = [
            {**record, "previousImageIds": {"fragments-api-1": "sha256:" + "c" * 64}},
            {**record, "previousImageIds": {**record["previousImageIds"], "fragments-api-1": "sha256:bad"}},
            {**record, "targetImageIds": {**record["targetImageIds"], "fragments-web-1": "sha256:bad"}},
        ]
        for malformed in malformed_baselines:
            with self.subTest(previousImageIds=malformed["previousImageIds"], targetImageIds=malformed["targetImageIds"]), tempfile.TemporaryDirectory() as directory:
                ledger_path = Path(directory) / "ledger.json"
                ledger = {"schemaVersion": 1, "releases": [malformed]}
                with patch.object(agent, "observe_recovery_state") as observe, patch.object(agent, "run_checked") as checked, patch.object(agent, "compose_up") as compose:
                    status = agent.reconcile_deploying_record(ledger, ledger_path, malformed)
                self.assertEqual(status, "recovery_required")
                self.assertEqual(malformed["error"], {"code": "unknown_error"})
                observe.assert_not_called()
                checked.assert_not_called()
                compose.assert_not_called()


class GitProvenanceTests(unittest.TestCase):
    def git(self, cwd, *args):
        result = subprocess.run(["git", *args], cwd=cwd, text=True, capture_output=True, check=True)
        return result.stdout.strip()

    def test_annotated_tag_exact_commit_and_main_ancestry(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            remote = root / "origin.git"
            source = root / "source"
            self.git(root, "init", "--bare", "--initial-branch=main", str(remote))
            self.git(root, "clone", str(remote), str(source))
            self.git(source, "config", "user.name", "F14 Test")
            self.git(source, "config", "user.email", "f14-test@example.invalid")
            (source / "source.txt").write_text("trusted main\n", encoding="utf-8")
            (source / ".github" / "workflows").mkdir(parents=True)
            (source / ".github" / "workflows" / "release.yml").write_text("trusted workflow\n", encoding="utf-8")
            self.git(source, "add", "source.txt")
            self.git(source, "add", ".github/workflows/release.yml")
            self.git(source, "commit", "-m", "trusted release source")
            self.git(source, "push", "origin", "main")
            self.git(source, "tag", "-a", "v0.4.0", "-m", "annotated release")
            self.git(source, "push", "origin", "refs/tags/v0.4.0")
            commit = self.git(source, "rev-parse", "HEAD")
            tag_object = self.git(source, "rev-parse", "refs/tags/v0.4.0")

            original_url = agent.REPO_URL
            try:
                agent.REPO_URL = str(remote)
                agent.verify_git_source(root / "verify.git", "v0.4.0", tag_object, commit)
                (source / ".github" / "workflows" / "release.yml").write_text("new trusted workflow\n", encoding="utf-8")
                self.git(source, "add", ".github/workflows/release.yml")
                self.git(source, "commit", "-m", "update trusted workflow")
                self.git(source, "push", "origin", "main")
                with self.assertRaises(agent.AgentError):
                    agent.verify_git_source(root / "verify.git", "v0.4.0", tag_object, commit)

                self.git(source, "tag", "v0.4.1", "HEAD")
                self.git(source, "push", "origin", "refs/tags/v0.4.1")
                with self.assertRaises(agent.AgentError):
                    agent.verify_git_source(root / "verify.git", "v0.4.1", self.git(source, "rev-parse", "refs/tags/v0.4.1"), commit)

                self.git(source, "checkout", "-b", "unmerged")
                (source / "outside.txt").write_text("not on main\n", encoding="utf-8")
                self.git(source, "add", "outside.txt")
                self.git(source, "commit", "-m", "outside main")
                self.git(source, "tag", "-a", "v0.4.2", "-m", "not merged")
                self.git(source, "push", "origin", "refs/tags/v0.4.2")
                outside_sha = self.git(source, "rev-parse", "HEAD")
                outside_tag = self.git(source, "rev-parse", "refs/tags/v0.4.2")
                with self.assertRaises(agent.AgentError):
                    agent.verify_git_source(root / "verify.git", "v0.4.2", outside_tag, outside_sha)
            finally:
                agent.REPO_URL = original_url


if __name__ == "__main__":
    unittest.main()
