import React, { useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { HeroGrid } from './components/HeroGrid';
import { OrientationOverlay } from './components/OrientationOverlay';
import { TeamColumn } from './components/TeamColumn';
import { TopBar } from './components/TopBar';
import { useDraftStore } from './store/useDraftStore';

export const App: React.FC = () => {
  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useDraftStore();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [setIsFullscreen]);

  return (
    <div
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-[#03060f] text-slate-100 select-none bg-cover bg-center bg-no-repeat border-0 rounded-none"
      style={{
        backgroundImage: "url('/arena-bg.jpg'), url('/images/arena-bg.jpg')",
      }}
    >
      {/* Semi-transparent dark overlay so hero avatars, bans, and indicators pop with high contrast */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/40 backdrop-brightness-95" />

      {/* Mobile Portrait Rotate Prompt */}
      <OrientationOverlay />

      {/* Top Bar: Quick Bans (Blue & Red) | Tactician Toolbar [Reset, Swap Sides, Map Trait, Export] */}
      <div className="relative z-30">
        <TopBar />
      </div>

      {/* Main 3-Column Draft Stage */}
      <main className="relative z-10 grid flex-1 min-h-0 grid-cols-12 gap-2.5 p-2 sm:p-2.5">
        {/* Left Column: Blue Team's 5 Dedicated Lane Pick Slots (Aligned to the Left, Flush Top & Bottom) */}
        <div className="col-span-3 h-full min-h-0 flex items-start justify-start relative">
          {/* Blue Team Ambient Glow Accent */}
          <div className="absolute -left-12 inset-y-6 w-56 bg-blue-600/15 blur-3xl pointer-events-none rounded-full" />
          <div className="w-[84%] max-w-[220px] h-full min-h-0 flex flex-col relative z-10">
            <TeamColumn team="BLUE" />
          </div>
        </div>

        {/* Center Column: 7-Column Hero Grid + Live Composition & Tactical Coach Panel */}
        <div className="col-span-6 h-full min-h-0 flex flex-col">
          <HeroGrid />
        </div>

        {/* Right Column: Red Team's 5 Dedicated Lane Pick Slots (Aligned to the Right, Flush Top & Bottom) */}
        <div className="col-span-3 h-full min-h-0 flex items-start justify-end relative">
          {/* Red Team Ambient Glow Accent */}
          <div className="absolute -right-12 inset-y-6 w-56 bg-rose-600/15 blur-3xl pointer-events-none rounded-full" />
          <div className="w-[84%] max-w-[220px] h-full min-h-0 flex flex-col relative z-10">
            <TeamColumn team="RED" />
          </div>
        </div>
      </main>

      {/* Subtle Utility Fullscreen Button (Positioned lower outside main columns to avoid height misalignment) */}
      <div className="fixed bottom-1.5 right-3 z-40">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1 rounded-none border border-slate-800 bg-slate-950/85 px-2 py-0.5 text-[9.5px] font-hud font-bold uppercase tracking-wider text-slate-400 hover:text-slate-100 hover:border-slate-600 transition shadow-md backdrop-blur-sm cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
          <span>Fullscreen</span>
        </button>
      </div>
    </div>
  );
};

export default App;
