import React, { useState } from 'react';
import { Check, Copy, Download, Monitor, Terminal, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  onClose: () => void;
}

const FLATPAK_CMD = `chmod +x packaging/flatpak/build-flatpak.sh && ./packaging/flatpak/build-flatpak.sh`;
const FLATPAK_RUN = `flatpak run io.github.stjoseph.BeaconOfStJoseph`;

export const InstallModal: React.FC<InstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, isLinux, installPWA } = usePWAInstall();
  const [tab, setTab] = useState<'flatpak' | 'pwa'>(isLinux ? 'flatpak' : 'pwa');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#07111b]/85 p-4">
      <div className="w-full max-w-lg bg-[#0f2233] border border-[#d9a13b]/40 rounded-xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#f4efe6]">
              Install Beacon of St. Joseph
            </h2>
            <p className="text-xs text-[#cbd5e1] mt-1">
              Linux Flatpak desktop package &amp; offline cross-platform PWA
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install dialog"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#cbd5e1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented selector */}
        <div className="mt-4 flex items-center gap-1 p-1 bg-[#091521] rounded-lg">
          <button
            type="button"
            onClick={() => setTab('flatpak')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              tab === 'flatpak' ? 'bg-[#1a3a54] text-[#f4c44e]' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Linux Flatpak Package
          </button>
          <button
            type="button"
            onClick={() => setTab('pwa')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              tab === 'pwa' ? 'bg-[#1a3a54] text-[#f4c44e]' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Desktop / Mobile PWA
          </button>
        </div>

        {tab === 'flatpak' ? (
          <div className="mt-4 space-y-3.5 text-xs text-[#e2e8f0]">
            <p className="text-[#cbd5e1] leading-relaxed">
              This project ships with a complete Flathub-compatible Flatpak manifest
              (<span className="font-mono-num text-[#f4efe6]">io.github.stjoseph.BeaconOfStJoseph</span>),
              XDG desktop launcher, AppStream metainfo, and Electron offline runner for Linux desktops and SteamOS.
            </p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-[#94a3b8]">
                  1. Build &amp; install Flatpak bundle
                </span>
                <button
                  type="button"
                  onClick={() => copyText('build', FLATPAK_CMD)}
                  className="flex items-center gap-1 text-[11px] text-[#f4c44e] hover:text-[#ffe082] cursor-pointer"
                >
                  {copiedId === 'build' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'build' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="bg-[#091521] border border-white/10 rounded-lg p-3 overflow-x-auto font-mono-num text-[11px] text-[#e8dcc8]">
                {FLATPAK_CMD}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-[#94a3b8]">
                  2. Launch installed Flatpak
                </span>
                <button
                  type="button"
                  onClick={() => copyText('run', FLATPAK_RUN)}
                  className="flex items-center gap-1 text-[11px] text-[#f4c44e] hover:text-[#ffe082] cursor-pointer"
                >
                  {copiedId === 'run' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'run' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="bg-[#091521] border border-white/10 rounded-lg p-3 overflow-x-auto font-mono-num text-[11px] text-[#e8dcc8]">
                {FLATPAK_RUN}
              </pre>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-xs text-[#cbd5e1]">
            <p className="leading-relaxed">
              Install Beacon of St. Joseph directly as a standalone offline application on Linux, Windows, macOS, ChromeOS, or mobile via Progressive Web App support.
            </p>

            {isInstalled ? (
              <div className="bg-[#12332c] border border-[#34d399]/35 rounded-lg p-3.5 text-[#a7f3d0]">
                Beacon of St. Joseph is already running in standalone installed mode.
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await installPWA();
                  if (ok) onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[#0b1926] bg-[#f4c44e] hover:bg-[#ffd66b] rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Install App Now
              </button>
            ) : isIOS ? (
              <div className="bg-[#091521] border border-white/10 rounded-lg p-3.5 space-y-1.5 text-[#e2e8f0]">
                <div>1. Tap the <strong>Share</strong> icon in the Safari toolbar.</div>
                <div>2. Scroll down and choose <strong>Add to Home Screen</strong>.</div>
              </div>
            ) : (
              <div className="bg-[#091521] border border-white/10 rounded-lg p-3.5 space-y-1.5 text-[#e2e8f0]">
                <div>
                  Open the browser address bar install icon (or browser menu &rarr;{' '}
                  <strong>Install Beacon of St. Joseph</strong>) to add a standalone desktop launcher with full offline support.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
