import React from 'react';
import { Compass, RotateCcw } from 'lucide-react';
import { ARTIFACT_CATALOG, HudSnapshot } from '../game/types';

interface VictoryModalProps {
  hud: HudSnapshot;
  onContinueExploring: () => void;
  onReturnToBeacon: () => void;
  onPlayAgain: () => void;
}

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  hud,
  onContinueExploring,
  onReturnToBeacon,
  onPlayAgain,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#07111b]/84 p-4">
      <div className="w-full max-w-md bg-[#0f2233] border border-[#f4c44e]/55 rounded-xl p-7 text-center shadow-2xl">
        <div className="text-xs font-medium tracking-widest text-[#f4c44e] uppercase">
          St. Joseph North Pier Lighthouse
        </div>
        <h2 className="font-display text-3xl font-bold text-[#f7f2e8] mt-2">
          Harbor Beacon Restored
        </h2>
        <p className="text-sm text-[#cbd5e1] mt-3 leading-relaxed">
          All six lost lighthouse artifacts have been returned. The golden Fresnel beam sweeps cleanly across Lake Michigan once more.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-4">
          <div>
            <div className="text-[11px] text-[#94a3b8]">Artifacts</div>
            <div className="text-lg font-semibold font-mono-num text-[#f4c44e] mt-0.5">
              {hud.collectedArtifactIds.length}/{ARTIFACT_CATALOG.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#94a3b8]">Lake Glass Gems</div>
            <div className="text-lg font-semibold font-mono-num text-[#38bdf8] mt-0.5">
              {hud.collectedGemCount}/{hud.totalGemCount}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#94a3b8]">Time</div>
            <div className="text-lg font-semibold font-mono-num text-[#f4efe6] mt-0.5">
              {formatDuration(hud.elapsedSeconds)}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {hud.realmId !== 'downtown' ? (
            <button
              type="button"
              onClick={onReturnToBeacon}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[#0b1926] bg-[#f4c44e] hover:bg-[#ffd66b] rounded-lg transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              Admire Lit Beacon in Downtown St. Joseph
            </button>
          ) : (
            <button
              type="button"
              onClick={onContinueExploring}
              className="w-full px-4 py-3 text-sm font-semibold text-[#0b1926] bg-[#f4c44e] hover:bg-[#ffd66b] rounded-lg transition-colors cursor-pointer"
            >
              Keep Exploring St. Joseph
            </button>
          )}

          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#f4efe6] bg-white/8 hover:bg-white/14 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play New Journey
          </button>
        </div>
      </div>
    </div>
  );
};
