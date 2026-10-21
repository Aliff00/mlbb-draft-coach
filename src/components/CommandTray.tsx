import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Clock,
  CloudUpload,
  FileText,
  FolderClock,
  History,
  LogOut,
  Play,
  User as UserIcon,
  X,
} from 'lucide-react';
import { SavedDraft, signInWithOAuth, signOut } from '../lib/supabase';
import { useDraftStore } from '../store/useDraftStore';

interface CommandTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSaveModal: () => void;
  onOpenHistoryDrawer: () => void;
  onOpenTacticalGuide: () => void;
  onOpenSummaryModal: () => void;
}

export const CommandTray: React.FC<CommandTrayProps> = ({
  isOpen,
  onClose,
  onOpenSaveModal,
  onOpenHistoryDrawer,
  onOpenTacticalGuide,
  onOpenSummaryModal,
}) => {
  const { user, savedDrafts, loadDraft } = useDraftStore();
  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'HISTORY'>('ACTIONS');
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleQuickLoad = (draft: SavedDraft) => {
    loadDraft(draft);
    setLoadedId(draft.id);
    setTimeout(() => {
      setLoadedId(null);
      onClose();
    }, 450);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-Down Overhead Command Tray */}
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl transition-all duration-300 ease-out transform ${
          isOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative rounded-b-2xl border-x border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-5 text-slate-100 font-body">
          {/* Subtle Glow Accent Line along bottom edge */}
          <div className="absolute bottom-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          {/* Close Handle / Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            title="Close command tray (Esc)"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Top Row: Account & Cloud Sync Status */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 pr-6">
            {user ? (
              /* Authenticated User Status */
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-9 w-9 rounded-full overflow-hidden border border-amber-400/50 bg-slate-900 shrink-0">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="User avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-amber-300 font-black">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate font-hud">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Coach User'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-black text-emerald-300 uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Cloud Synced
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {user.email || 'Authenticated Draft Session'}
                  </span>
                </div>
              </div>
            ) : (
              /* Guest State */
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200 font-hud">Guest Mode</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[9px] font-bold text-slate-400">
                      Local Only
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Sign in to save and sync scrim drafts permanently</p>
                </div>
              </div>
            )}

            {/* Auth Actions: Sign Out vs Quick OAuth Buttons */}
            <div>
              {user ? (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-rose-950/40 hover:border-rose-500/40 hover:text-rose-300 px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-slate-300 transition cursor-pointer"
                  title="Sign out of Supabase"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => signInWithOAuth('google')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[10.5px] font-hud font-bold text-slate-200 transition cursor-pointer shadow-sm"
                    title="Sign in with Google"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
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
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => signInWithOAuth('discord')}
                    className="flex items-center gap-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] px-2.5 py-1 text-[10.5px] font-hud font-bold text-white transition cursor-pointer shadow-sm"
                    title="Sign in with Discord"
                  >
                    <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    <span>Discord</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Middle Row: Quick Action Tabs Grid */}
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 1. Scrim History Tab */}
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'HISTORY') {
                    setActiveTab('ACTIONS');
                  } else {
                    setActiveTab('HISTORY');
                  }
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer font-hud ${
                  activeTab === 'HISTORY'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:text-slate-200 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FolderClock className="h-4 w-4 text-amber-400" />
                  {user && savedDrafts.length > 0 && (
                    <span className="rounded-full bg-amber-500/30 text-amber-300 px-1 py-0.2 text-[9px] font-black border border-amber-400/40">
                      {savedDrafts.length}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Scrim History</span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  {activeTab === 'HISTORY' ? 'Hide Drafts ▲' : 'View & Load ▼'}
                </span>
              </button>

              {/* 2. Tactical Guide Modal Trigger */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTacticalGuide();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-amber-400/50 hover:bg-slate-900 text-slate-300 hover:text-amber-300 transition-all cursor-pointer font-hud"
              >
                <BookOpen className="h-4 w-4 text-sky-400 mb-1" />
                <span className="text-xs font-bold uppercase tracking-wider">Tactical Guide</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Map rules & tips</span>
              </button>

              {/* 3. Save Active Draft Modal Trigger */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSaveModal();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-sky-500/30 bg-sky-950/30 hover:border-sky-400 hover:bg-sky-950/50 text-sky-300 transition-all cursor-pointer font-hud"
              >
                <CloudUpload className="h-4 w-4 text-sky-400 mb-1" />
                <span className="text-xs font-bold uppercase tracking-wider">Save Active Draft</span>
                <span className="text-[9px] text-sky-400/70 mt-0.5">Cloud snapshot</span>
              </button>

              {/* 4. Export Scrim Summary Notes */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSummaryModal();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-amber-400/50 hover:bg-slate-900 text-slate-300 hover:text-amber-300 transition-all cursor-pointer font-hud"
              >
                <FileText className="h-4 w-4 text-amber-400 mb-1" />
                <span className="text-xs font-bold uppercase tracking-wider">Export Scrim</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Discord / Copy</span>
              </button>
            </div>

            {/* Expandable Scrim History Preview Panel */}
            {activeTab === 'HISTORY' && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-hud font-bold uppercase tracking-wider text-white">
                      Recent Scrim Drafts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenHistoryDrawer();
                    }}
                    className="text-[10px] font-hud font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    Open Full History Drawer →
                  </button>
                </div>

                {!user ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400 mb-2 font-hud">
                      Sign in with Google or Discord to view and cloud-sync your saved scrim drafts.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => signInWithOAuth('google')}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold font-hud text-white border border-slate-700 cursor-pointer"
                      >
                        Sign in with Google
                      </button>
                      <button
                        type="button"
                        onClick={() => signInWithOAuth('discord')}
                        className="px-3 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-xs font-bold font-hud text-white cursor-pointer"
                      >
                        Sign in with Discord
                      </button>
                    </div>
                  </div>
                ) : savedDrafts.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400 mb-2 font-hud">
                      No saved drafts found yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSaveModal();
                      }}
                      className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold font-hud text-white cursor-pointer shadow-sm"
                    >
                      Save Current Draft Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {savedDrafts.slice(0, 4).map((draft) => {
                      const isLoaded = loadedId === draft.id;
                      const dateStr = new Date(draft.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div
                          key={draft.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
                        >
                          <div className="min-w-0 pr-2">
                            <h5 className="text-xs font-hud font-bold text-white truncate">
                              {draft.title}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {dateStr}
                              </span>
                              <span className="capitalize text-slate-500">
                                • {draft.map_trait || 'standard'}
                              </span>
                            </div>
                            {/* Mini preview avatars */}
                            <div className="flex items-center gap-1 mt-1">
                              {draft.blue_picks.filter(Boolean).slice(0, 3).map((hero, i) => (
                                <img
                                  key={`b-${i}`}
                                  src={hero?.avatar || hero?.image}
                                  alt={hero?.name}
                                  className="h-3.5 w-3.5 rounded-full object-cover border border-sky-400/50"
                                />
                              ))}
                              <span className="text-[9px] text-slate-600 font-bold">vs</span>
                              {draft.red_picks.filter(Boolean).slice(0, 3).map((hero, i) => (
                                <img
                                  key={`r-${i}`}
                                  src={hero?.avatar || hero?.image}
                                  alt={hero?.name}
                                  className="h-3.5 w-3.5 rounded-full object-cover border border-rose-400/50"
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleQuickLoad(draft)}
                            disabled={isLoaded}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-hud font-bold transition cursor-pointer shrink-0 ${
                              isLoaded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {isLoaded ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Loaded!</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 fill-current" />
                                <span>Load Draft</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Phone-style Notification Shade Bottom Pull Handle */}
          <div
            className="flex flex-col items-center justify-center pt-3 -mb-1 cursor-pointer group select-none"
            onClick={onClose}
            title="Slide up to close tray"
          >
            <div className="w-12 h-1 rounded-full bg-slate-700/80 group-hover:bg-amber-400/80 transition-colors" />
          </div>
        </div>
      </div>
    </>
  );
};
