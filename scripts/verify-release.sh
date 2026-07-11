#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
cargo fmt --all -- --check
cargo test --workspace
cargo check --workspace
npm run tauri:build
