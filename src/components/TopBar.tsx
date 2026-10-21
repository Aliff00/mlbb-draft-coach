import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Ban,
  Check,
  ChevronDown,
  CloudUpload,
  FileText,
  FolderClock,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import {
  MAP_EFFECTS_CONFIG,
  MapTraitType,
  TeamSide,
} from '../types/draft';
import { DraftHistoryDrawer } from './DraftHistoryDrawer';
import { DraftSummaryModal } from './DraftSummaryModal';
import { HeroAvatar } from './HeroAvatar';
import { getMapEffectColorTheme, MapEffectIcon } from './MapEffectIcon';
import { ResetConfirmModal } from './ResetConfirmModal';
import { SaveDraftModal } from './SaveDraftModal';
import { signInWithOAuth, signOut } from '../lib/supabase';

const MAP_TRAITS: { id: MapTraitType; label: string }[] = [
  { id: 'standard', label: 'Standard (Sanctum Island)' },
  { id: 'broken_walls', label: 'Broken Walls' },
  { id: 'dangerous_grass', label: 'Dangerous Grass' },
  { id: 'flying_cloud', label: 'Flying Cloud' },
  { id: 'expanding_rivers', label: 'Expanding River' },
];

export const TopBar: React.FC = () => {
  const {
    mapTrait,
    blueBans,
    redBans,
    activeSlot,
    setActiveSlot,
    clearSlot,
    swapSides,
    swapBanSlots,
    resetBoard,
    setMapTrait,
    isFullscreen,
    toggleFullscreen,
    user,
    savedDrafts,
  } = useDraftStore();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];
  const mapTheme = getMapEffectColorTheme(mapTrait);

  const renderBanChip = (team: TeamSide, slotIdx: number) => {
    const isBlue = team === 'BLUE';
    const bans = isBlue ? blueBans : redBans;
    const hero = bans[slotIdx];
    const isActive =
      activeSlot?.type === 'BAN' &&
      activeSlot?.team === team &&
      activeSlot?.index === slotIdx;

    return (
      <div
        key={`${team}-ban-${slotIdx}`}
        draggable={Boolean(hero)}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'BAN', team, index: slotIdx }));
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'BAN' && data.team === team && data.index !== slotIdx) {
              swapBanSlots(team, data.index, slotIdx);
            }
          } catch {
            // Ignore parse errors
          }
        }}
        onClick={() => setActiveSlot({ type: 'BAN', team, index: slotIdx })}
        className="group relative h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 flex items-center justify-center cursor-pointer select-none"
        title={
          hero
            ? `${team} Ban ${slotIdx + 1}: ${hero.name} (Click to select/replace, drag to swap)`
            : `${team} Ban Slot ${slotIdx + 1} (Click to set active ban)`
        }
      >
        {/* Circular Avatar Container */}
        <div
          className={`relative h-full w-full rounded-full border overflow-hidden transition-all duration-150 flex items-center justify-center ${
            isActive
              ? isBlue
                ? 'border-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.45)] ring-1 ring-sky-400/40'
                : 'border-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.45)] ring-1 ring-rose-400/40'
              : hero
              ? isBlue
                ? 'border-sky-500/60 bg-slate-950 shadow-[0_0_4px_rgba(56,189,248,0.2)]'
                : 'border-rose-500/60 bg-slate-950 shadow-[0_0_4px_rgba(244,63,94,0.2)]'
              : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
          }`}
        >
          {hero ? (
            <HeroAvatar
              hero={hero}
              grayscale
              className="opacity-75 contrast-125 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            /* Empty Ban Slot: Enlarged Question Mark Icon */
            <div className="flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 sm:h-6 sm:w-6 opacity-65 group-hover:opacity-100 transition-all"
              >
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
          )}
        </div>

        {/* Banned Hero Prohibition Icon ONLY (NO outer circle, placed directly on the circular line border) */}
        {hero && (
          <div
            className={`absolute pointer-events-none z-20 ${
              isBlue
                ? 'bottom-0 right-0 translate-x-[15%] translate-y-[15%]'
                : 'bottom-0 left-0 -translate-x-[15%] translate-y-[15%]'
            }`}
          >
            <Ban className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-rose-500 stroke-[3] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]" />
          </div>
        )}

        {/* Dedicated Small Remove (x) Button (Top corner, doesn't interfere with clicking the avatar) */}
        {hero && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSlot('BAN', team, slotIdx);
            }}
            className={`absolute ${
              isBlue ? '-top-1 -right-1' : '-top-1 -left-1'
            } h-4 w-4 rounded-full bg-slate-950/90 border border-slate-700 text-slate-400 hover:text-white hover:bg-rose-600 hover:border-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md z-30 cursor-pointer`}
            title="Remove ban"
          >
            <X className="h-2.5 w-2.5 stroke-[3]" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onConfirm={() => {
          resetBoard();
          setIsResetModalOpen(false);
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />

      <DraftSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />

      <SaveDraftModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />

      <DraftHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
      />

      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2 shadow-xl">
        {/* Background Team Accents Container (contained without clipping dropdown menus) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Blue Team Left Accent Glow & Bottom Indicator Line */}
          <div className="absolute left-0 inset-y-0 w-80 sm:w-96 bg-gradient-to-r from-blue-600/30 via-blue-950/25 to-transparent" />
          <div className="absolute left-0 bottom-0 w-64 sm:w-80 h-[2px] bg-gradient-to-r from-blue-400 via-blue-500/60 to-transparent" />

          {/* Red Team Right Accent Glow & Bottom Indicator Line */}
          <div className="absolute right-0 inset-y-0 w-80 sm:w-96 bg-gradient-to-l from-rose-600/30 via-rose-950/25 to-transparent" />
          <div className="absolute right-0 bottom-0 w-64 sm:w-80 h-[2px] bg-gradient-to-l from-rose-400 via-rose-500/60 to-transparent" />
        </div>

        {/* Top-Rightmost Fullscreen Toggle: tiny, no container, pure icon */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-2 top-2 sm:right-3 sm:top-2 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer p-0.5 z-40"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          ) : (
            <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          )}
        </button>

        <div className="grid grid-cols-12 items-center gap-2">
          {/* Left: Blue Team 5 Quick Ban Chips */}
          <div className="col-span-12 sm:col-span-3 flex items-center justify-start relative">
            <div className="relative z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-950/70 border border-blue-500/40 shadow-[0_0_15px_rgba(37,99,235,0.25)]">
              <span className="text-[9.5px] font-hud font-black tracking-wider text-sky-400 uppercase select-none mr-0.5">
                BLUE
              </span>
              {[0, 1, 2, 3, 4].map((idx) => renderBanChip('BLUE', idx))}
            </div>
          </div>

          {/* Center: Tactician Toolbar Actions */}
          <div className="col-span-12 sm:col-span-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {/* Reset Board Button */}
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-950/40 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition cursor-pointer shadow-sm"
              title="Reset all picks and bans"
            >
              <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
              <span>Reset Board</span>
            </button>

            {/* Swap Sides (Blue <-> Red) */}
            <button
              type="button"
              onClick={swapSides}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/90 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-slate-200 hover:text-amber-300 hover:border-amber-400/60 transition cursor-pointer shadow-sm"
              title="Swap Blue and Red sides completely"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
              <span>Swap Sides</span>
            </button>

            {/* Map Trait Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMapDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider transition cursor-pointer select-none ${mapTheme.tagBg} ${mapTheme.glow} shadow-sm`}
                title={`Map Trait: ${mapConfig.name} — Click to change battlefield conditions`}
              >
                <MapEffectIcon effect={mapTrait} className="h-3.5 w-3.5" />
                <span className="truncate max-w-[110px] sm:max-w-none">
                  {mapConfig.shortName}
                </span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {/* Map Trait Popover Menu */}
              {isMapDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMapDropdownOpen(false)}
                  />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-72 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md z-50 text-left">
                    <div className="text-[10px] font-hud font-bold uppercase tracking-wider text-slate-400 pb-1.5 mb-1 border-b border-slate-800">
                      Select Battlefield Map Trait
                    </div>
                    <div className="flex flex-col gap-1 font-hud">
                      {MAP_TRAITS.map((item) => {
                        const cfg = MAP_EFFECTS_CONFIG[item.id];
                        const isSelected = mapTrait === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setMapTrait(item.id);
                              setIsMapDropdownOpen(false);
                            }}
                            className={`flex flex-col gap-0.5 p-2 rounded-lg text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-400/60 text-amber-200'
                                : 'hover:bg-slate-900 border border-transparent text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-1.5">
                                <MapEffectIcon effect={item.id} className="h-3.5 w-3.5" />
                                {cfg.name}
                              </span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                            </div>
                            <span className="text-[9.5px] text-slate-400 leading-tight">
                              {cfg.tacticalTip}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Export Draft Summary Button */}
            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-amber-400/70 bg-amber-500/20 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/30 transition cursor-pointer shadow-gold-glow"
              title="Open draft export & Discord scrim summary notes"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>Export</span>
            </button>

            {/* Save Draft to Supabase Button */}
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-sky-400/70 bg-sky-500/20 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-sky-300 hover:bg-sky-500/30 transition cursor-pointer shadow-sm"
              title="Save draft permanently to Supabase cloud storage"
            >
              <CloudUpload className="h-3.5 w-3.5 text-sky-400" />
              <span>Save</span>
            </button>

            {/* History / Saved Drafts Drawer Button */}
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/90 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:border-slate-500 transition cursor-pointer shadow-sm"
              title="View and load previously saved drafts"
            >
              <FolderClock className="h-3.5 w-3.5 text-amber-400" />
              <span>History</span>
              {user && savedDrafts.length > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500/30 text-amber-300 px-1 py-0.2 text-[9px] font-black border border-amber-400/40">
                  {savedDrafts.length}
                </span>
              )}
            </button>

            {/* User Auth Status / Sign In Dropdown */}
            <div className={`relative ${isAuthMenuOpen ? 'z-50' : ''}`}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setIsAuthMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-slate-200 hover:border-slate-500 transition cursor-pointer"
                  title={`Signed in as ${user.email || user.user_metadata?.full_name || 'User'}`}
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      className="h-3.5 w-3.5 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 text-sky-400" />
                  )}
                  <span className="max-w-[70px] truncate sm:max-w-[90px]">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/90 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:border-slate-500 transition cursor-pointer"
                  title="Sign in with Discord or Google (Guest Mode active)"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-400" />
                  <span>Sign In</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>
              )}

              {/* Auth Popover Menu */}
              {isAuthMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAuthMenuOpen(false)}
                  />
                  <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-64 rounded-xl border border-slate-700 bg-slate-950/98 p-3 shadow-2xl backdrop-blur-xl z-50 text-left font-hud">
                    {user ? (
                      <div className="space-y-2">
                        <div className="border-b border-slate-800 pb-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            Signed in as
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {user.email || user.user_metadata?.full_name || 'Coach'}
                          </div>
                          <div className="text-[9px] text-emerald-400 font-bold mt-0.5">
                            ● Cloud Storage Active
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await signOut();
                            setIsAuthMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 rounded-lg p-1.5 text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="border-b border-slate-800 pb-1.5">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            Account Access
                          </div>
                          <div className="text-[10px] text-slate-300 font-body">
                            Draft freely as guest or sign in for permanent cloud storage:
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            signInWithOAuth('discord');
                            setIsAuthMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] p-1.5 text-xs font-bold text-white transition cursor-pointer shadow-sm"
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                          </svg>
                          <span>Sign in with Discord</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            signInWithOAuth('google');
                            setIsAuthMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 p-1.5 text-xs font-bold text-white transition cursor-pointer border border-slate-700"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Sign in with Google</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Red Team 5 Quick Ban Chips */}
          <div className="col-span-12 sm:col-span-3 flex items-center justify-end relative">
            <div className="relative z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-950/70 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)] mr-4 sm:mr-5">
              {[0, 1, 2, 3, 4].map((idx) => renderBanChip('RED', idx))}
              <span className="text-[9.5px] font-hud font-black tracking-wider text-rose-400 uppercase select-none ml-0.5">
                RED
              </span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
