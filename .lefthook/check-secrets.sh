#!/bin/bash
# Check for secrets using gitleaks

set -e

GITLEAKS_VERSION="8.30.0"

# Check if gitleaks is installed
if command -v gitleaks &> /dev/null; then
  gitleaks protect --staged --verbose
  exit $?
fi

# Download gitleaks if not installed
echo "Downloading gitleaks v${GITLEAKS_VERSION}..."

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_${OS}_${ARCH}.tar.gz" | tar -xz -C "$TMPDIR"

"$TMPDIR/gitleaks" protect --staged --verbose
