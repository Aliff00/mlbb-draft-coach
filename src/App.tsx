import React, { useEffect } from 'react';
import { HeroGrid } from './components/HeroGrid';
import { OrientationOverlay } from './components/OrientationOverlay';
import { TeamColumn } from './components/TeamColumn';
import { TopBar } from './components/TopBar';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { useDraftStore } from './store/useDraftStore';

export const App: React.FC = () => {
  const {
    setIsFullscreen,
    setUser,
    setAuthLoading,
    fetchDrafts,
    setActiveSlot,
    userTeamSide,
    setUserTeamSide,
  } = useDraftStore();

  const isBlueUser = userTeamSide === 'blue';
  const isRedUser = userTeamSide === 'red';

  // Escape key deselects any active slot on the board
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSlot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveSlot]);

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

  // Initialize Supabase Auth Session listener
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchDrafts();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchDrafts();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setAuthLoading, fetchDrafts]);

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
      <main className="relative z-10 grid flex-1 min-h-0 grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        {/* Left Column: Blue Team's 5 Dedicated Lane Pick Slots (With left gap margin) */}
        <div className="col-span-3 h-full min-h-0 flex items-start justify-start relative">
          {/* Blue Team Ambient Glow Accent */}
          <div className="absolute -left-12 inset-y-6 w-56 bg-blue-600/15 blur-3xl pointer-events-none rounded-full" />
          <div className="w-[84%] max-w-[220px] h-full min-h-0 flex flex-col relative z-10 ml-1 sm:ml-2 gap-1.5">
            {/* Perspective Badge */}
            <div className="flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={() => setUserTeamSide('blue')}
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-hud font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isBlueUser
                    ? 'bg-blue-950/90 border border-blue-400/60 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-1 ring-blue-400/30'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isBlueUser ? 'Your drafted team' : 'Click to make Blue your team'}
              >
                <span>{isBlueUser ? '🛡️ YOUR TEAM' : '⚔️ OPPONENT'}</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <TeamColumn team="BLUE" />
            </div>
          </div>
        </div>

        {/* Center Column: 7-Column Hero Grid + Live Composition & Tactical Coach Panel */}
        <div className="col-span-6 h-full min-h-0 flex flex-col">
          <HeroGrid />
        </div>

        {/* Right Column: Red Team's 5 Dedicated Lane Pick Slots (With right gap margin) */}
        <div className="col-span-3 h-full min-h-0 flex items-start justify-end relative">
          {/* Red Team Ambient Glow Accent */}
          <div className="absolute -right-12 inset-y-6 w-56 bg-rose-600/15 blur-3xl pointer-events-none rounded-full" />
          <div className="w-[84%] max-w-[220px] h-full min-h-0 flex flex-col relative z-10 mr-1 sm:mr-2 gap-1.5">
            {/* Perspective Badge */}
            <div className="flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={() => setUserTeamSide('red')}
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-hud font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isRedUser
                    ? 'bg-rose-950/90 border border-rose-400/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)] ring-1 ring-rose-400/30'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isRedUser ? 'Your drafted team' : 'Click to make Red your team'}
              >
                <span>{isRedUser ? '🛡️ YOUR TEAM' : '⚔️ OPPONENT'}</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <TeamColumn team="RED" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
