.PHONY: install dev test check build icons

install:
	npm install

dev:
	npm run tauri:dev

test:
	cargo test --workspace
	npm test

check:
	cargo check --workspace
	npm run check

build:
	npm run tauri:build

icons:
	npx tauri icon public/icescope.svg

