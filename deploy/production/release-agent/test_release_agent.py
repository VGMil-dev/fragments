import importlib.util
import json
import sqlite3
import stat
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import call, patch
from pathlib import Path


AGENT_PATH = Path(__file__).with_name("fragments-release-agent.py")
SPEC = importlib.util.spec_from_file_location("fragments_release_agent", AGENT_PATH)
agent = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(agent)


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

    def test_deployment_override_accepts_only_fixed_fragments_image_names(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)
            override = agent.compose_override(state, f"fragments-api:sha-{RELEASE_SHA}", f"fragments-web:sha-{RELEASE_SHA}", "v0.4.0", RELEASE_SHA)
            self.assertIn(f"image: fragments-api:sha-{RELEASE_SHA}", override.read_text(encoding="utf-8"))
            with self.assertRaises(agent.AgentError):
                agent.compose_override(state, "attacker/api:latest", f"fragments-web:sha-{RELEASE_SHA}", "v0.4.0", RELEASE_SHA)

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
            ledger = {
                "schemaVersion": 1,
                "releases": [{
                    "releaseId": 77,
                    "tag": "v0.4.0",
                    "commit": RELEASE_SHA,
                    "status": "rollback_failed",
                    "previousImages": {"fragments-api-1": old_api, "fragments-web-1": old_web},
                }],
            }
            ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
            config = {
                "stateDirectory": str(state),
                "ledgerPath": str(ledger_path),
                "composeDirectory": str(root),
                "composeFile": str(root / "compose.yml"),
            }
            metadata = {"version": "v0.3.0", "revision": "5" * 40}
            with (
                patch.object(agent, "fragments_data_volume", return_value="fragments_data"),
                patch.object(agent, "container_snapshot", return_value={"pits-development-app-1": {"id": "stable", "state": "running|healthy"}}),
                patch.object(agent, "image_info", return_value=metadata),
                patch.object(agent, "run_checked", return_value=""),
                patch.object(agent, "compose_up") as compose,
                patch.object(agent, "wait_for_health") as health,
            ):
                agent.rollback_latest(config)
            compose.assert_called_once()
            health.assert_called_once_with("v0.4.0", RELEASE_SHA, {"fragments-api-1": old_api, "fragments-web-1": old_web}, rollback=True)
            result = json.loads(ledger_path.read_text(encoding="utf-8"))
            self.assertEqual(result["releases"][0]["status"], "rolled_back_manual")
            self.assertEqual(result["releases"][0]["rollback"], "code_images_restored_database_untouched")

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

    def run_mock_release_transaction(self, fail_health=False):
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

        def wait_health(*args, **kwargs):
            if health_error:
                raise health_error.pop(0)

        with (
            patch.object(agent, "get_release_assets", return_value=(manifest, release, archive)),
            patch.object(agent, "request_json", side_effect=lambda url: jobs if "/jobs?" in url else run),
            patch.object(agent, "validate_release_run"),
            patch.object(agent, "verify_git_source"),
            patch.object(agent, "verify_attestation"),
            patch.object(agent, "load_archive"),
            patch.object(agent, "container_snapshot", return_value=neighbors),
            patch.object(agent, "image_refs_for_running", return_value=previous_images),
            patch.object(agent, "fragments_data_volume", return_value="fragments-data"),
            patch.object(agent, "container_health", return_value=("running", "healthy", "fragments-api:current")),
            patch.object(agent, "integrity_check_backup", return_value={"file": "fixture.sqlite", "bytes": 32, "sha256": "d" * 64, "integrity": "ok"}),
            patch.object(agent, "image_info", return_value={"version": "v0.3.1", "revision": "5" * 40, "architecture": "arm64"}),
            patch.object(agent, "run_checked", return_value="") as checked_mock,
            patch.object(agent.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout="200")),
            patch.object(agent, "wait_for_health", side_effect=wait_health) as health_mock,
        ):
            if fail_health:
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
