#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: ./scripts/release.sh 0.1.0" >&2
  exit 1
fi

VERSION="$1"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid semantic version: $VERSION" >&2
  exit 1
fi

VERSION="$VERSION" node <<'NODE'
const fs = require("fs");
const version = process.env.VERSION;

function writeJson(path, update) {
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  update(data);
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

writeJson("package.json", (data) => {
  data.version = version;
});

if (fs.existsSync("package-lock.json")) {
  writeJson("package-lock.json", (data) => {
    data.version = version;
    if (data.packages && data.packages[""]) {
      data.packages[""].version = version;
    }
  });
}

writeJson("src-tauri/tauri.conf.json", (data) => {
  data.version = version;
});

const cargoPath = "Cargo.toml";
const cargo = fs.readFileSync(cargoPath, "utf8").replace(
  /(\[workspace\.package\][\s\S]*?^version\s*=\s*")[^"]+(")/m,
  `$1${version}$2`,
);
fs.writeFileSync(cargoPath, cargo);

const today = new Date().toISOString().slice(0, 10);
const changelogPath = "CHANGELOG.md";
let changelog = fs.readFileSync(changelogPath, "utf8");
changelog = changelog.replace(
  /## \[0\.1\.0-preview\] - Unreleased/,
  `## [${version}] - ${today}`,
);
fs.writeFileSync(changelogPath, changelog);
NODE

npm install --package-lock-only

git diff -- package.json package-lock.json Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git add package.json package-lock.json Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore(release): v${VERSION}"
git tag "v${VERSION}"
git push origin main
git push origin "v${VERSION}"
