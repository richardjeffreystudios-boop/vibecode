import React from 'react';
import { Download, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ARTIFACT_CATALOG, HudSnapshot } from '../game/types';

interface TitleScreenProps {
  hud: HudSnapshot;
  onStart: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onOpenInstall: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hud,
  onStart,
  onReset,
  onToggleMute,
  onOpenInstall,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
      {/* Subtle top-to-bottom contrast scrim keeping the live 3D St. Joseph streetscape visible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,25,38,0.68) 0%, rgba(11,25,38,0.12) 45%, rgba(11,25,38,0.78) 100%)',
        }}
      />

      {/* Top subtle utility strip */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6 pointer-events-auto">
        <div className="text-xs tracking-wide text-[#e8dcc8]/90">
          <span>St. Joseph, Michigan</span>
          <span className="mx-2 text-[#d9a13b]" aria-hidden="true">·</span>
          <span>Lake Michigan Harbor Adventure</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenInstall}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#f4efe6] bg-[#0f2537]/90 border border-[#d9a13b]/35 rounded-lg hover:bg-[#17364f] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#f4c44e]" />
            Install / Flatpak
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
            className="flex items-center justify-center w-9 h-9 text-[#f4efe6] bg-[#0f2537]/90 border border-[#d9a13b]/35 rounded-lg hover:bg-[#17364f] transition-colors cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center-lower bespoke SVG lockup & primary Start CTA over calm negative space */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pb-10 pointer-events-auto">
        {/* Bespoke inline SVG St. Joseph Lighthouse Title Lockup */}
        <svg
          viewBox="0 0 640 164"
          className="w-full max-w-[540px] h-auto mb-4 drop-shadow-[0_6px_24px_rgba(0,0,0,0.65)]"
          role="img"
          aria-label="Beacon of St. Joseph"
        >
          <defs>
            <linearGradient id="goldTitle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff6d6" />
              <stop offset="55%" stopColor="#f4c44e" />
              <stop offset="100%" stopColor="#c8832a" />
            </linearGradient>
            <linearGradient id="beamTitleL" x1="1" y1="0.5" x2="0" y2="0.5">
              <stop offset="0%" stopColor="#ffe599" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffe599" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="beamTitleR" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#ffe599" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffe599" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Emblem lighthouse crest at top center */}
          <polygon points="320,26 178,10 178,40" fill="url(#beamTitleL)" />
          <polygon points="320,26 462,10 462,40" fill="url(#beamTitleR)" />
          <polygon points="310,56 314,32 326,32 330,56" fill="#f7f3eb" />
          <rect x="309" y="29" width="22" height="4" rx="1.5" fill="#c93b2b" />
          <rect x="313" y="19" width="14" height="10" fill="#fff0ad" />
          <polygon points="310,20 320,10 330,20" fill="#c93b2b" />
          <line x1="190" y1="56" x2="296" y2="56" stroke="#d9a13b" strokeWidth="1.2" strokeOpacity="0.6" />
          <line x1="344" y1="56" x2="450" y2="56" stroke="#d9a13b" strokeWidth="1.2" strokeOpacity="0.6" />

          {/* Main Display Title */}
          <text
            x="320"
            y="112"
            textAnchor="middle"
            fill="url(#goldTitle)"
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: '54px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Beacon of St. Joseph
          </text>
          <text
            x="320"
            y="144"
            textAnchor="middle"
            fill="#e6d9c4"
            style={{
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '0.12em',
            }}
          >
            RECOVER THE SIX LOST LIGHTHOUSE ARTIFACTS
          </text>
        </svg>

        {hud.hasSavedProgress && (
          <p className="mb-4 text-xs text-[#e8dcc8]/90 font-mono-num">
            Saved Journey · {hud.collectedArtifactIds.length}/{ARTIFACT_CATALOG.length} Artifacts ·{' '}
            {hud.collectedGemCount}/{hud.totalGemCount} Lake Glass Gems
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-[#0b1926] bg-[#f4c44e] hover:bg-[#ffd66b] active:scale-[0.98] rounded-lg shadow-[0_6px_24px_rgba(244,196,78,0.32)] transition-transform transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {hud.hasSavedProgress ? 'Continue Adventure' : 'Start Adventure'}
          </button>

          {hud.hasSavedProgress && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-[#f4efe6] bg-[#0f2537]/90 hover:bg-[#193954] border border-[#d9a13b]/35 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </button>
          )}
        </div>

        {/* Single flat genre control-hint line */}
        <p className="mt-5 text-xs text-[#dfd5c5]/85 tracking-wide">
          WASD Move · Space Jump &amp; Hold Glide · Shift Charge · E / Click Flame · Drag Orbit Camera · Esc Pause
        </p>
      </div>
    </div>
  );
};
