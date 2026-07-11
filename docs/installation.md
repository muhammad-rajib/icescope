# Installation

IceScope targets Windows, macOS, and Linux desktop builds through Tauri.

## Windows

Use the `.msi` or `.exe` installer from GitHub Releases when available.

Build prerequisites:

- Node.js 22+
- Rust stable
- Microsoft C++ Build Tools
- WebView2 runtime

## macOS

Use the `.dmg` artifact for your CPU architecture:

- Apple Silicon: `aarch64`
- Intel: `x86_64`

Build prerequisites:

- Node.js 22+
- Rust stable
- Xcode Command Line Tools

## Linux

Use the `.deb`, `.rpm`, or AppImage artifact when available.

Build prerequisites vary by distribution. Ubuntu/Debian packages:

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

## Build Prerequisites

All platforms require:

- Node.js 22+
- Rust stable
- npm
- Tauri 2 platform dependencies
