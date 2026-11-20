import React from 'react';
import { Compass, Download, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ARTIFACT_CATALOG, HudSnapshot } from '../game/types';

interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onWarpDowntown: () => void;
  onToggleMute: () => void;
  onOpenInstall: () => void;
  onReset: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  onResume,
  onWarpDowntown,
  onToggleMute,
  onOpenInstall,
  onReset,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#07111b]/82 p-4">
      <div className="w-full max-w-lg bg-[#0f2233] border border-[#d9a13b]/35 rounded-xl p-6 shadow-2xl">
        <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#f4efe6]">Harbor Log</h2>
            <p className="text-xs text-[#cbd5e1] mt-0.5">
              {hud.realmTitle} · {hud.collectedGemCount}/{hud.totalGemCount} Gems
            </p>
          </div>
          <span className="font-mono-num text-sm font-semibold text-[#f4c44e]">
            {hud.collectedArtifactIds.length}/{ARTIFACT_CATALOG.length} Artifacts
          </span>
        </div>

        {/* 6 Lost Lighthouse Artifacts Checklist */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ARTIFACT_CATALOG.map((art) => {
            const found = hud.collectedArtifactIds.includes(art.id);
            return (
              <div
                key={art.id}
                className="px-3 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: found ? 'rgba(244, 196, 78, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: found ? 'rgba(244, 196, 78, 0.38)' : 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${found ? 'text-[#f4c44e]' : 'text-[#94a3b8]'}`}>
                    {art.name}
                  </span>
                  <span className="text-[11px] text-[#cbd5e1]">
                    {found ? 'Recovered' : 'Missing'}
                  </span>
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-0.5">{art.landmark}</div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0b1926] bg-[#f4c44e] hover:bg-[#ffd66b] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume
          </button>

          {hud.realmId !== 'downtown' && (
            <button
              type="button"
              onClick={onWarpDowntown}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#f4efe6] bg-[#17364f] hover:bg-[#1f4766] border border-white/12 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#38bdf8]" />
              Return to State Street
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#e2e8f0] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {hud.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {hud.muted ? 'Sound Off' : 'Sound On'}
            </button>

            <button
              type="button"
              onClick={onOpenInstall}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#e2e8f0] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#f4c44e]" />
              Install / Flatpak
            </button>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#fca5a5] hover:text-[#fecaca] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart Journey
          </button>
        </div>
      </div>
    </div>
  );
};
