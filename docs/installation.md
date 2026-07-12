# Installation

Install IceScope from [GitHub Releases](https://github.com/muhammad-rajib/icescope/releases/latest) or build it from source.

## macOS

1. Download the DMG for your CPU architecture.
2. Open the DMG.
3. Drag IceScope into `Applications`.
4. Launch IceScope.

If macOS blocks an unsigned preview build, open **System Settings → Privacy & Security** and allow the app only if it came from the official release page.

## Windows

1. Download the EXE installer or MSI package.
2. Run the installer.
3. If SmartScreen appears, verify the publisher/source and continue only for trusted preview builds.

## Linux

### AppImage

```bash
chmod +x IceScope*.AppImage
./IceScope*.AppImage
```

### DEB

```bash
sudo apt install ./icescope*.deb
```

### RPM

```bash
sudo rpm -i icescope*.rpm
```

## Build prerequisites

- Node.js 22+
- Rust stable
- Tauri 2 system dependencies for your operating system

For Linux, install WebKitGTK and app indicator packages required by Tauri.
