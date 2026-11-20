# Installing & Packaging Beacon of St. Joseph

Beacon of St. Joseph supports both **Linux Flatpak** (sandboxed native desktop package) and **Cross-Platform Progressive Web App (PWA)** installation.

## 1. Linux Flatpak (Recommended for Linux Desktops)

### Prerequisites
- `flatpak` and `flatpak-builder` installed on your distribution (Fedora, Ubuntu, Arch, SteamOS, Mint, etc.)

### Build & Install Locally
```bash
chmod +x packaging/flatpak/build-flatpak.sh
./packaging/flatpak/build-flatpak.sh
```

Or build directly with `flatpak-builder`:
```bash
flatpak-builder --force-clean --user --install \
  build-flatpak packaging/flatpak/io.github.stjoseph.BeaconOfStJoseph.yml
```

### Run Installed Flatpak
```bash
flatpak run io.github.stjoseph.BeaconOfStJoseph
```

## 2. Cross-Platform Progressive Web App (Windows, macOS, Linux, ChromeOS, iOS)
- Open the game in Chromium, Edge, Brave, or Safari and click **Install / Package** on the Title Screen or Pause Menu to install it as a standalone offline desktop/mobile application.
