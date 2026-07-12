# Installation

Install IceScope from [GitHub Releases](https://github.com/muhammad-rajib/icescope/releases/latest) or build it from source. For the full installer selection guide, see [Download IceScope](/download).

## macOS

1. Download the DMG for your CPU architecture from the [latest release](https://github.com/muhammad-rajib/icescope/releases/latest).
2. Open the DMG.
3. Drag IceScope into `Applications`.
4. Launch IceScope.

If macOS blocks a preview build, open **System Settings → Privacy & Security** and allow the app only if it came from the official release page.

If Finder says `IceScope` is damaged, remove quarantine for trusted preview builds only:

```bash
xattr -dr com.apple.quarantine /Applications/IceScope.app
open /Applications/IceScope.app
```

This is a temporary preview-build process. Public production DMGs should be signed with an Apple Developer ID certificate and notarized in CI.

## Windows

Use `IceScope_*_x64-setup.exe` for most users. Use `IceScope_*_x64_en-US.msi` for managed installation workflows.

1. Download the EXE installer or MSI package from the [latest release](https://github.com/muhammad-rajib/icescope/releases/latest).
2. Run the installer.
3. If SmartScreen appears, verify the publisher/source and continue only for trusted preview builds.
4. Launch IceScope from the Start menu.

## Linux

Choose AppImage for most distributions, DEB for Ubuntu/Debian, and RPM for Fedora/RHEL/openSUSE.

### AppImage

```bash
chmod +x IceScope_*.AppImage
./IceScope_*.AppImage
```

### DEB

```bash
sudo apt install ./IceScope_*_amd64.deb
```

### RPM

```bash
sudo rpm -i IceScope-*.x86_64.rpm
```

## Build from Source

Install build prerequisites:

- Node.js 22+
- Rust stable
- Tauri 2 system dependencies for your operating system

For Linux, install WebKitGTK and app indicator packages required by Tauri.

```bash
npm ci
npm run build
cargo build --workspace
npm run tauri:build
```

## Troubleshooting

- If a macOS preview says it is damaged, follow the temporary preview instructions on [Download IceScope](/download#macos-preview-build).
- If Windows SmartScreen appears, continue only after verifying the installer came from the official IceScope repository.
- If Linux AppImage fails to launch, confirm it is executable and that your desktop environment supports AppImage execution.
