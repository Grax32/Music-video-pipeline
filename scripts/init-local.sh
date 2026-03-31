#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH." >&2
  exit 1
fi

echo "Using Node: $(node -v)"
echo "Using npm:  $(npm -v)"

echo "Installing dependencies..."
npm install

echo "Running type check..."
npm run check

echo "Building project..."
npm run build

echo "Init complete."
