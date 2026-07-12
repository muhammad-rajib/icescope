# Download IceScope

Download the latest IceScope desktop preview for macOS, Windows, or Linux.

<div class="download-hero">
  <div>
    <p class="eyebrow">Desktop Preview</p>
    <h2>Get the newest IceScope installer from GitHub Releases.</h2>
    <p>Release assets are published through the official IceScope repository. Use the latest release page instead of bookmarking versioned installer filenames.</p>
  </div>
  <div class="download-actions">
    <a class="vp-button brand" href="https://github.com/muhammad-rajib/icescope/releases/latest">Download Latest Release</a>
    <a class="vp-button alt" href="https://github.com/muhammad-rajib/icescope/releases">View all releases</a>
    <a class="vp-button alt" href="https://github.com/muhammad-rajib/icescope">Source code</a>
  </div>
</div>

::: warning Preview notice
IceScope is currently an early desktop preview. Some installers may be unsigned. Download only from the official GitHub Releases page.
:::

## Choose Your Platform

<div class="download-card-grid">
  <div class="download-card">
    <span class="platform-icon"></span>
    <h3>macOS</h3>
    <p>Use the Apple Silicon DMG for M1, M2, M3, and M4 Macs. Use the Intel DMG only when an Intel asset is present on the latest release.</p>
    <ul>
      <li><strong>File type:</strong> DMG</li>
      <li><strong>Choose:</strong> Apple Silicon for modern Macs</li>
      <li><strong>Status:</strong> unsigned preview</li>
    </ul>
    <a class="vp-button brand compact" href="https://github.com/muhammad-rajib/icescope/releases/latest">View macOS Download</a>
  </div>
  <div class="download-card">
    <span class="platform-icon">⊞</span>
    <h3>Windows</h3>
    <p>Use the setup EXE for most Windows 10 and Windows 11 installs. The MSI is available for managed or scripted installation workflows.</p>
    <ul>
      <li><strong>Recommended:</strong> <code>IceScope_*_x64-setup.exe</code></li>
      <li><strong>Alternative:</strong> <code>IceScope_*_x64_en-US.msi</code></li>
      <li><strong>Status:</strong> unsigned preview</li>
    </ul>
    <a class="vp-button brand compact" href="https://github.com/muhammad-rajib/icescope/releases/latest">View Windows Download</a>
  </div>
  <div class="download-card">
    <span class="platform-icon">◆</span>
    <h3>Linux</h3>
    <p>Use AppImage for most distributions, DEB for Ubuntu/Debian, and RPM for Fedora, RHEL, or openSUSE systems.</p>
    <ul>
      <li><strong>Most distros:</strong> AppImage</li>
      <li><strong>Ubuntu/Debian:</strong> DEB</li>
      <li><strong>Fedora/RHEL/openSUSE:</strong> RPM</li>
    </ul>
    <a class="vp-button brand compact" href="https://github.com/muhammad-rajib/icescope/releases/latest">View Linux Download</a>
  </div>
</div>

## macOS Preview Build

::: danger Temporary preview-build process
The current macOS preview is unsigned and not notarized. macOS may report that IceScope is damaged or cannot be opened. This does not necessarily mean the file is corrupted; it usually means Gatekeeper blocked a browser-downloaded unsigned app.
:::

Only use these steps for builds downloaded from the official IceScope GitHub repository.

1. Download the correct DMG from [Latest Release](https://github.com/muhammad-rajib/icescope/releases/latest).
2. Open the DMG.
3. Drag `IceScope.app` into `Applications`.
4. Open Terminal.
5. Remove the quarantine flag:

```bash
sudo xattr -rd com.apple.quarantine /Applications/IceScope.app
```

6. Launch IceScope from Applications.

You can also use the Apple-supported prompt:

```text
System Settings → Privacy & Security → Open Anyway
```

Signed and notarized macOS builds are planned so this workaround is not needed in future releases.

## Windows Installation

Recommended installer:

```text
IceScope_*_x64-setup.exe
```

Alternative installer:

```text
IceScope_*_x64_en-US.msi
```

1. Download the installer from [GitHub Releases](https://github.com/muhammad-rajib/icescope/releases/latest).
2. Run the installer.
3. Follow the setup wizard.
4. Launch IceScope from the Start menu.

Windows SmartScreen may show an `Unknown publisher` warning for unsigned preview builds. Click `More info` only after verifying the download came from the official IceScope GitHub repository, and continue only when you trust the file.

## Linux Installation

Choose the package that matches your distribution.

### AppImage

Best for most Linux distributions.

```bash
chmod +x IceScope_*.AppImage
./IceScope_*.AppImage
```

### DEB

Best for Ubuntu and Debian-based distributions.

```bash
sudo apt install ./IceScope_*_amd64.deb
```

### RPM

Best for Fedora, RHEL, and openSUSE-based distributions.

```bash
sudo rpm -i IceScope-*.x86_64.rpm
```

## Verify Download

GitHub Releases may show SHA-256 values beside assets, or IceScope may attach a `SHA256SUMS.txt` file. Compare your local checksum with the value from the release page.

macOS or Linux:

```bash
shasum -a 256 <filename>
```

Linux alternative:

```bash
sha256sum <filename>
```

Windows PowerShell:

```powershell
Get-FileHash .\IceScope_*.exe -Algorithm SHA256
```

Do not use checksum values copied from old releases.

## Related Links

- [Latest release](https://github.com/muhammad-rajib/icescope/releases/latest)
- [View all releases](https://github.com/muhammad-rajib/icescope/releases)
- [Release notes](https://github.com/muhammad-rajib/icescope/releases/latest)
- [Source code](https://github.com/muhammad-rajib/icescope)
- [Installation details](/installation)
