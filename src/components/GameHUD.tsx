import React, { useEffect, useState } from 'react';
import { Compass, Flame, Pause, Volume2, VolumeX, Zap } from 'lucide-react';
import { ARTIFACT_CATALOG, HudSnapshot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  isOnline: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchJump: () => void;
  onTouchGlide: (held: boolean) => void;
  onTouchCharge: (held: boolean) => void;
  onTouchFlame: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  isOnline,
  onPause,
  onToggleMute,
  onTouchMove,
  onTouchJump,
  onTouchGlide,
  onTouchCharge,
  onTouchFlame,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setShowControls((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const realmStats = hud.realmArtifactCounts[hud.realmId];

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
      {/* Top Perimeter Status Clusters — solid dark translucent (NO backdrop-filter over WebGL) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Realm Location & Directional Beacon Compass */}
        <div className="bg-[#0b1926]/82 border border-[#d9a13b]/28 rounded-lg px-4 py-2.5 max-w-xs">
          <div className="text-sm font-semibold text-[#f7f2e8] leading-tight truncate">
            {hud.realmTitle}
          </div>
          <div className="mt-0.5 text-xs text-[#cbd5e1] flex items-center gap-2">
            <span>{hud.realmSubtitle}</span>
            {realmStats.total > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num text-[#f4c44e]">
                  {realmStats.collected}/{realmStats.total} here
                </span>
              </>
            )}
          </div>
          {hud.compassAngleDeg !== null && hud.compassLabel && (
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-[#e8dcc8]">
              <span
                className="inline-flex items-center justify-center w-5 h-5 text-[#f4c44e] shrink-0"
                style={{
                  transform: `rotate(${Math.round(hud.compassAngleDeg)}deg)`,
                  transition: 'transform 80ms linear',
                }}
                aria-hidden="true"
              >
                <Compass className="w-4 h-4" />
              </span>
              <span className="truncate">{hud.compassLabel}</span>
            </div>
          )}
        </div>

        {/* Top-Right: Artifact Count, Lake Glass Gems, Firefly Shield & Audio/Pause Controls */}
        <div className="flex items-start gap-2.5 pointer-events-auto">
          <div className="bg-[#0b1926]/82 border border-[#d9a13b]/28 rounded-lg px-4 py-2.5 flex items-center gap-5">
            {/* Lighthouse Artifacts */}
            <div className="flex items-center gap-2" title="Lost Lighthouse Artifacts">
              <svg className="w-4 h-4 text-[#f4c44e] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L9 6h6l-3-4zm-2 5v4h4V7h-4zm-1 5l-1 9h8l-1-9H9z" />
              </svg>
              <div className="leading-none">
                <div className="text-[10px] text-[#cbd5e1]">Artifacts</div>
                <div className="text-sm font-semibold font-mono-num text-[#f4c44e]">
                  {hud.collectedArtifactIds.length}/{ARTIFACT_CATALOG.length}
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-white/12" aria-hidden="true" />

            {/* Lake Glass Gems */}
            <div className="flex items-center gap-2" title="Lake Glass Gems">
              <svg className="w-4 h-4 text-[#38bdf8] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L4 12l8 10 8-10L12 2z" />
              </svg>
              <div className="leading-none">
                <div className="text-[10px] text-[#cbd5e1]">Gems</div>
                <div className="text-sm font-semibold font-mono-num text-[#f4efe6]">
                  {hud.collectedGemCount}/{hud.totalGemCount}
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-white/12" aria-hidden="true" />

            {/* Firefly Shield Pips (static, no pulsing dots) */}
            <div className="flex items-center gap-2" title="Firefly Shield">
              <div className="leading-none">
                <div className="text-[10px] text-[#cbd5e1] mb-1">Shield</div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: hud.maxHealth }).map((_, idx) => {
                    const active = idx < hud.health;
                    const color =
                      hud.health >= 3 ? '#f4c44e' : hud.health === 2 ? '#38bdf8' : '#34d399';
                    return (
                      <span
                        key={idx}
                        className="w-2.5 h-2.5 rounded-sm block"
                        style={{
                          backgroundColor: active ? color : 'rgba(255,255,255,0.16)',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={hud.muted ? 'Unmute sound' : 'Mute sound'}
            className="w-10 h-10 flex items-center justify-center bg-[#0b1926]/82 border border-[#d9a13b]/28 rounded-lg text-[#f4efe6] hover:bg-[#17334d] transition-colors cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="w-10 h-10 flex items-center justify-center bg-[#0b1926]/82 border border-[#d9a13b]/28 rounded-lg text-[#f4efe6] hover:bg-[#17334d] transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Discovery Toast (brief, non-blocking) */}
      {hud.bannerToast && (
        <div className="self-center mt-auto mb-3 bg-[#0b1926]/90 border border-[#d9a13b]/45 rounded-lg px-5 py-2.5 text-center shadow-lg">
          <div className="text-sm font-semibold" style={{ color: hud.bannerToast.accentCss }}>
            {hud.bannerToast.title}
          </div>
          <div className="text-xs text-[#e2e8f0] mt-0.5">{hud.bannerToast.subtitle}</div>
        </div>
      )}

      {/* Portal warp transition overlay */}
      {hud.mode === 'warping' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b1926]/70 pointer-events-none">
          <div className="text-center">
            <div className="font-display text-2xl text-[#f4c44e]">Traversing Harbor Portal</div>
            <div className="text-xs text-[#cbd5e1] mt-1">St. Joseph, Michigan</div>
          </div>
        </div>
      )}

      {/* Bottom Area: Contextual Portal Prompt + Collapsible Controls Dock */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {hud.nearbyPrompt && (
          <div className="bg-[#0b1926]/88 border border-[#38bdf8]/45 rounded-lg px-4 py-2 text-center">
            <div className="text-xs font-semibold text-[#f4c44e]">{hud.nearbyPrompt.title}</div>
            <div className="text-xs text-[#e2e8f0]">{hud.nearbyPrompt.subtitle}</div>
          </div>
        )}

        {/* Touch controls (shown automatically on coarse-pointer tablets/phones) */}
        {isTouchDevice && (
          <div className="w-full flex items-end justify-between px-2 pb-2 pointer-events-auto">
            <div className="grid grid-cols-3 gap-1.5 w-36">
              <div />
              <button
                type="button"
                onPointerDown={() => onTouchMove(0, 1)}
                onPointerUp={() => onTouchMove(0, 0)}
                onPointerCancel={() => onTouchMove(0, 0)}
                className="h-11 rounded-lg bg-[#0b1926]/85 border border-white/20 text-xs font-semibold text-white"
              >
                W
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => onTouchMove(-1, 0)}
                onPointerUp={() => onTouchMove(0, 0)}
                onPointerCancel={() => onTouchMove(0, 0)}
                className="h-11 rounded-lg bg-[#0b1926]/85 border border-white/20 text-xs font-semibold text-white"
              >
                A
              </button>
              <button
                type="button"
                onPointerDown={() => onTouchMove(0, -1)}
                onPointerUp={() => onTouchMove(0, 0)}
                onPointerCancel={() => onTouchMove(0, 0)}
                className="h-11 rounded-lg bg-[#0b1926]/85 border border-white/20 text-xs font-semibold text-white"
              >
                S
              </button>
              <button
                type="button"
                onPointerDown={() => onTouchMove(1, 0)}
                onPointerUp={() => onTouchMove(0, 0)}
                onPointerCancel={() => onTouchMove(0, 0)}
                className="h-11 rounded-lg bg-[#0b1926]/85 border border-white/20 text-xs font-semibold text-white"
              >
                D
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={() => onTouchCharge(true)}
                onPointerUp={() => onTouchCharge(false)}
                onPointerCancel={() => onTouchCharge(false)}
                className="w-12 h-12 rounded-lg bg-[#0b1926]/85 border border-[#f4c44e]/45 text-[#f4c44e] flex items-center justify-center"
                aria-label="Horn Charge"
              >
                <Zap className="w-5 h-5" />
              </button>
              <button
                type="button"
                onPointerDown={onTouchFlame}
                className="w-12 h-12 rounded-lg bg-[#0b1926]/85 border border-[#f59e0b]/45 text-[#f59e0b] flex items-center justify-center"
                aria-label="Beacon Flame"
              >
                <Flame className="w-5 h-5" />
              </button>
              <button
                type="button"
                onPointerDown={() => {
                  onTouchJump();
                  onTouchGlide(true);
                }}
                onPointerUp={() => onTouchGlide(false)}
                onPointerCancel={() => onTouchGlide(false)}
                className="px-4 h-12 rounded-lg bg-[#f4c44e] text-[#0b1926] text-xs font-bold"
              >
                Jump
              </button>
            </div>
          </div>
        )}

        {/* Collapsible minimal bottom controls dock (H to toggle) */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {showControls && (
            <div className="bg-[#0b1926]/80 border border-[#d9a13b]/24 rounded-lg px-4 py-1.5 text-xs text-[#e2e8f0] whitespace-nowrap">
              WASD Move · Space Jump / Glide · Shift Charge · E Flame · Drag Orbit · Esc Pause
              {!isOnline && ' · Offline Mode'}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowControls((v) => !v)}
            className="bg-[#0b1926]/80 border border-[#d9a13b]/24 rounded-lg px-2.5 py-1.5 text-[11px] text-[#cbd5e1] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            {showControls ? 'Hide Controls (H)' : 'Controls (H)'}
          </button>
        </div>
      </div>
    </div>
  );
};
