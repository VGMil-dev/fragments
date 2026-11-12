#!/usr/bin/env bash
set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "Run this Fragments dependency installer with sudo." >&2
  exit 1
fi
if [[ "$(dpkg --print-architecture)" != arm64 ]]; then
  echo "GitHub CLI installation is intended for the verified Oracle ARM64 host." >&2
  exit 1
fi

key_url=https://cli.github.com/packages/githubcli-archive-keyring.gpg
key_sha256=6084d5d7bd8e288441e0e94fc6275570895da18e6751f70f057485dc2d1a811b
key_tmp="$(mktemp)"
trap 'rm -f "$key_tmp"' EXIT
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 "$key_url" -o "$key_tmp"
printf '%s  %s\n' "$key_sha256" "$key_tmp" | sha256sum --check --status
fingerprints="$(gpg --show-keys --with-colons "$key_tmp" | awk -F: '$1 == "fpr" { print $10 }')"
if ! grep -qx '2C6106201985B60E6C7AC87323F3D4EA75716059' <<< "$fingerprints" &&
   ! grep -qx '7F38BBB59D064DBCB3D84D725612B36462313325' <<< "$fingerprints"; then
  echo "The official GitHub CLI package-signing key fingerprint is not recognized." >&2
  exit 1
fi

install -d -o root -g root -m 0755 /etc/apt/keyrings /etc/apt/sources.list.d
install -o root -g root -m 0644 "$key_tmp" /etc/apt/keyrings/githubcli-archive-keyring.gpg
printf 'deb [arch=arm64 signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\n' > /etc/apt/sources.list.d/github-cli.list
chmod 0644 /etc/apt/sources.list.d/github-cli.list
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y gh
gh version
gh attestation verify --help | grep -q -- '--deny-self-hosted-runners'
