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
    setInspectedHero,
  } = useDraftStore();

  // Escape key deselects any active slot on the board or inspected hero
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSlot(null);
        setInspectedHero(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveSlot, setInspectedHero]);

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
          <div className="w-[84%] max-w-[220px] h-full min-h-0 flex flex-col relative z-10 ml-1 sm:ml-2">
            <TeamColumn team="BLUE" />
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
          <div className="w-[84%] max-w-[220px] h-full min-h-0 flex flex-col relative z-10 mr-1 sm:mr-2">
            <TeamColumn team="RED" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
