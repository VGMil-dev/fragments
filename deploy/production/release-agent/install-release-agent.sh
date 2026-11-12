#!/usr/bin/env bash
set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "Run the Fragments release agent installer with sudo." >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
agent_source="$repo_root/deploy/production/release-agent"
release_sha="50e2ace697afc125bb3bfdd9a705f0e383796a83"
release_tag="v0.3.1"
tag_object="3cf5185fc5d05edc9f5c6dee2a67c5bd8e9acbac"
config_path=/etc/fragments-release-agent.json
state_dir=/var/lib/fragments-release
request_dir=/var/spool/fragments-release-requests
production_dir=/opt/fragments/deploy/production

if [[ "$(uname -m)" != aarch64 ]]; then
  echo "Fragments release agent requires the verified Oracle ARM64 host." >&2
  exit 1
fi
for required in docker python3 gh systemctl; do
  command -v "$required" >/dev/null || { echo "Required executable missing: $required" >&2; exit 1; }
done
systemctl is-active --quiet docker.service
systemctl is-enabled --quiet fragments-backup.timer
test -f "$production_dir/.env"
test "$(stat -c '%U:%G:%a' "$production_dir/.env")" = root:root:600
test "$(stat -c '%U:%G:%a' /var/backups/fragments)" = root:root:700
test "$(stat -c '%U:%G' /var/run/docker.sock)" = root:docker
test "$(docker inspect --format '{{.Config.Labels "org.opencontainers.image.revision"}}' fragments-api-1)" = "$release_sha"
test "$(docker inspect --format '{{.Config.Labels "org.opencontainers.image.revision"}}' fragments-web-1)" = "$release_sha"
test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3001/health)" = 200
test "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' http://127.0.0.1:8081/)" = 200

if systemctl list-unit-files --no-legend | grep -q '^actions.runner.GAVANTI-STARTUP.gavanti-srv-arm64.service'; then
  runner_user="$(systemctl show actions.runner.GAVANTI-STARTUP.gavanti-srv-arm64.service --property=User --value)"
  runner_groups="$(id -nG "$runner_user")"
  if [[ " $runner_groups " == *" docker "* ]]; then
    echo "Existing shared runner has Docker group access and is explicitly excluded from this deployment path."
  fi
fi

if [[ -e "$config_path" || -e /etc/systemd/system/fragments-release-apply.service ]]; then
  echo "Fragments release agent already exists; refusing to overwrite its configuration." >&2
  exit 1
fi

getent group fragments-release-request >/dev/null || groupadd --system fragments-release-request
if id fragments-release >/dev/null 2>&1; then
  echo "The fragments-release account already exists; refusing to modify an unverified identity." >&2
  exit 1
fi
useradd --system --gid fragments-release-request --home-dir /var/lib/fragments-release-poller --create-home --shell /usr/sbin/nologin fragments-release
usermod -a -G fragments-release-request fragments-release
release_groups=" $(id -nG fragments-release) "
for forbidden_group in docker sudo lxd adm; do
  if [[ "$release_groups" == *" $forbidden_group "* ]]; then
    echo "fragments-release unexpectedly belongs to privileged group $forbidden_group." >&2
    exit 1
  fi
done
test "$(getent passwd fragments-release | cut -d: -s -f7)" = /usr/sbin/nologin

install -d -o root -g root -m 0700 "$state_dir" "$state_dir/docker-config" "$state_dir/gh-empty"
chown root:fragments-release-request "$state_dir"
chmod 0710 "$state_dir"
install -d -o root -g fragments-release-request -m 1730 "$request_dir"
install -d -o root -g root -m 0755 /usr/local/libexec
install -o root -g root -m 0755 "$agent_source/fragments-release-agent.py" /usr/local/libexec/fragments-release-agent.py
install -o root -g root -m 0644 "$agent_source"/systemd/fragments-release-poll.service /etc/systemd/system/
install -o root -g root -m 0644 "$agent_source"/systemd/fragments-release-poll.timer /etc/systemd/system/
install -o root -g root -m 0644 "$agent_source"/systemd/fragments-release-apply.path /etc/systemd/system/
install -o root -g root -m 0644 "$agent_source"/systemd/fragments-release-apply.service /etc/systemd/system/

cat > "$config_path" <<'JSON'
{
  "stateDirectory": "/var/lib/fragments-release",
  "ledgerPath": "/var/lib/fragments-release/ledger.json",
  "gitDirectory": "/var/lib/fragments-release/source.git",
  "backupDirectory": "/var/backups/fragments",
  "composeDirectory": "/opt/fragments/deploy/production",
  "composeFile": "/opt/fragments/deploy/production/docker-compose.yml",
  "requestDirectory": "/var/spool/fragments-release-requests"
}
JSON
chmod 0644 "$config_path"

cat > "$state_dir/ledger.json" <<JSON
{
  "schemaVersion": 1,
  "releases": [
    {
      "releaseId": 0,
      "tag": "$release_tag",
      "tagObject": "$tag_object",
      "commit": "$release_sha",
      "status": "already_deployed_baseline",
      "observedImageVersionLabel": "v0.3.0",
      "observedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  ]
}
JSON
chown root:fragments-release-request "$state_dir/ledger.json"
chmod 0640 "$state_dir/ledger.json"
chown root:root "$state_dir/docker-config" "$state_dir/gh-empty"
chmod 0700 "$state_dir/docker-config" "$state_dir/gh-empty"

systemd-analyze verify \
  /etc/systemd/system/fragments-release-poll.service \
  /etc/systemd/system/fragments-release-poll.timer \
  /etc/systemd/system/fragments-release-apply.path \
  /etc/systemd/system/fragments-release-apply.service
systemctl daemon-reload
systemctl enable --now fragments-release-apply.path fragments-release-poll.timer
systemctl start fragments-release-poll.service

printf 'fragments_release_agent_installed arch=%s baseline_tag=%s baseline_sha=%s\n' "$(uname -m)" "$release_tag" "$release_sha"
systemctl is-active fragments-release-apply.path fragments-release-poll.timer
