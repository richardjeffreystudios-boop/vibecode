import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { InstallModal } from './components/InstallModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { VictoryModal } from './components/VictoryModal';
import { StJosephGameEngine } from './game/engine';
import { HudSnapshot } from './game/types';
import { useOnlineStatus } from './hooks/usePWAInstall';

const INITIAL_HUD: HudSnapshot = {
  mode: 'title',
  realmId: 'downtown',
  realmTitle: 'State Street & Bluff Park',
  realmSubtitle: 'Downtown St. Joseph Hub',
  collectedArtifactIds: [],
  collectedGemCount: 0,
  totalGemCount: 60,
  health: 3,
  maxHealth: 3,
  elapsedSeconds: 0,
  isCharging: false,
  isGliding: false,
  isFlaming: false,
  nearbyPrompt: null,
  bannerToast: null,
  compassAngleDeg: null,
  compassLabel: null,
  muted: false,
  hasSavedProgress: false,
  realmArtifactCounts: {
    downtown: { collected: 0, total: 0 },
    north_pier: { collected: 0, total: 2 },
    silver_beach: { collected: 0, total: 2 },
    swing_bridge: { collected: 0, total: 2 },
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<StJosephGameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    try {
      const engine = new StJosephGameEngine(container, (snapshot) => {
        setHud(snapshot);
      });
      engineRef.current = engine;
    } catch (err) {
      setWebglError(
        err instanceof Error ? err.message : 'Unable to initialize 3D WebGL viewport.'
      );
    }

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => engineRef.current?.startGame(), []);
  const handlePause = useCallback(() => engineRef.current?.pauseGame(), []);
  const handleResume = useCallback(() => engineRef.current?.resumeGame(), []);
  const handleWarpDowntown = useCallback(() => engineRef.current?.warpToDowntown(), []);
  const handleReset = useCallback(() => engineRef.current?.resetJourney(), []);
  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleTouchMove = useCallback((x: number, y: number) => {
    engineRef.current?.setVirtualMove(x, y);
  }, []);
  const handleTouchJump = useCallback(() => engineRef.current?.triggerJump(), []);
  const handleTouchGlide = useCallback((held: boolean) => {
    engineRef.current?.setVirtualGlide(held);
  }, []);
  const handleTouchCharge = useCallback((held: boolean) => {
    engineRef.current?.setVirtualCharge(held);
  }, []);
  const handleTouchFlame = useCallback(() => engineRef.current?.triggerFlame(), []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b1926]">
      {/* Isolated WebGL canvas container — React HUD state never tears down the canvas */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Beacon of St. Joseph 3D Game Viewport"
      />

      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1926] p-6 text-center">
          <div className="max-w-md bg-[#122638] border border-[#d9a13b]/40 rounded-xl p-6">
            <h1 className="font-display text-2xl text-[#f4c44e]">Beacon of St. Joseph</h1>
            <p className="mt-2 text-sm text-[#cbd5e1]">
              WebGL 3D acceleration is required to explore St. Joseph in 3D.
            </p>
            <p className="mt-2 text-xs text-[#94a3b8] font-mono-num">{webglError}</p>
          </div>
        </div>
      )}

      {!webglError && hud.mode === 'title' && (
        <TitleScreen
          hud={hud}
          onStart={handleStart}
          onReset={handleReset}
          onToggleMute={handleToggleMute}
          onOpenInstall={() => setShowInstallModal(true)}
        />
      )}

      {!webglError && (hud.mode === 'playing' || hud.mode === 'warping') && (
        <GameHUD
          hud={hud}
          isOnline={isOnline}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onTouchMove={handleTouchMove}
          onTouchJump={handleTouchJump}
          onTouchGlide={handleTouchGlide}
          onTouchCharge={handleTouchCharge}
          onTouchFlame={handleTouchFlame}
        />
      )}

      {!webglError && hud.mode === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={handleResume}
          onWarpDowntown={handleWarpDowntown}
          onToggleMute={handleToggleMute}
          onOpenInstall={() => setShowInstallModal(true)}
          onReset={handleReset}
        />
      )}

      {!webglError && hud.mode === 'victory' && (
        <VictoryModal
          hud={hud}
          onContinueExploring={handleStart}
          onReturnToBeacon={handleWarpDowntown}
          onPlayAgain={handleReset}
        />
      )}

      {showInstallModal && <InstallModal onClose={() => setShowInstallModal(false)} />}
    </main>
  );
}
