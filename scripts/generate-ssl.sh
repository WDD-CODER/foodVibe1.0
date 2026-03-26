#!/usr/bin/env bash
# Generate self-signed SSL certificate for local dev
set -euo pipefail

SSL_DIR="$(cd "$(dirname "$0")/.." && pwd)/ssl"
mkdir -p "$SSL_DIR"

if [ -f "$SSL_DIR/server.key" ] && [ -f "$SSL_DIR/server.crt" ]; then
  echo "SSL certificates already exist in $SSL_DIR"
  echo "Delete them first if you want to regenerate."
  exit 0
fi

echo "Generating self-signed SSL certificate..."
openssl req -x509 -newkey rsa:2048 \
  -keyout "$SSL_DIR/server.key" \
  -out "$SSL_DIR/server.crt" \
  -days 365 -nodes \
  -subj "/CN=foodvibe-dev" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:0.0.0.0"

echo "Done! Certificates saved to $SSL_DIR/"
