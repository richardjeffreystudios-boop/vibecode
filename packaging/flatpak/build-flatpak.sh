#!/usr/bin/env bash
set -euo pipefail

APP_ID="io.github.stjoseph.BeaconOfStJoseph"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build-flatpak"
REPO_DIR="${ROOT_DIR}/repo-flatpak"
BUNDLE_PATH="${ROOT_DIR}/BeaconOfStJoseph.flatpak"

echo "==> Installing required Freedesktop & Electron BaseApp runtimes..."
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user -y flathub \
  org.freedesktop.Platform//24.08 \
  org.freedesktop.Sdk//24.08 \
  org.freedesktop.Sdk.Extension.node20//24.08 \
  org.electronjs.Electron2.BaseApp//24.08

echo "==> Building Flatpak for ${APP_ID}..."
flatpak-builder --force-clean --user --repo="${REPO_DIR}" \
  "${BUILD_DIR}" \
  "${SCRIPT_DIR}/${APP_ID}.yml"

echo "==> Exporting single-file .flatpak bundle..."
flatpak build-bundle "${REPO_DIR}" "${BUNDLE_PATH}" "${APP_ID}"

echo "==> Installing locally for current user..."
flatpak install --user -y --reinstall "${BUNDLE_PATH}"

echo "Done! Launch with: flatpak run ${APP_ID}"
