import React, { useState } from 'react';
import {
  Clock,
  FolderClock,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, SavedDraft, signInWithOAuth } from '../lib/supabase';
import { useDraftStore } from '../store/useDraftStore';
import { HeroAvatar } from './HeroAvatar';

interface DraftHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSaveModal: () => void;
}

export const DraftHistoryDrawer: React.FC<DraftHistoryDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSaveModal,
}) => {
  const {
    user,
    savedDrafts,
    isDraftsLoading,
    fetchDrafts,
    loadDraft,
    deleteDraft,
  } = useDraftStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredDrafts = savedDrafts.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (d.title.toLowerCase().includes(q)) return true;
    if (d.notes?.toLowerCase().includes(q)) return true;
    const blueNames = d.blue_picks.filter(Boolean).map((h) => h?.name.toLowerCase()).join(' ');
    const redNames = d.red_picks.filter(Boolean).map((h) => h?.name.toLowerCase()).join(' ');
    return blueNames.includes(q) || redNames.includes(q);
  });

  const handleLoad = (draft: SavedDraft) => {
    loadDraft(draft);
    setLoadedId(draft.id);
    setTimeout(() => {
      onClose();
      setLoadedId(null);
    }, 400);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved draft?')) return;
    setDeletingId(id);
    try {
      await deleteDraft(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-slate-900/95 border-l border-slate-800 shadow-2xl flex flex-col font-hud text-slate-100 z-10">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/40">
              <FolderClock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Saved Drafts
              </h2>
              <p className="text-[10px] text-slate-400">
                {user ? `${savedDrafts.length} cloud drafts available` : 'Sign in to access your cloud drafts'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {user && (
              <button
                type="button"
                onClick={() => fetchDrafts()}
                disabled={isDraftsLoading}
                title="Refresh drafts"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isDraftsLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Guest or Supabase Unconfigured Banner */}
        {!isSupabaseConfigured ? (
          <div className="m-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
            <h3 className="font-bold text-amber-300 uppercase mb-1">
              Configuration Needed
            </h3>
            <p className="text-[11px] text-slate-300 font-body leading-relaxed mb-2">
              Set <code className="text-amber-200">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> in your environment file to unlock permanent cloud storage.
            </p>
          </div>
        ) : !user ? (
          <div className="m-4 rounded-xl border border-slate-700 bg-slate-950/80 p-5 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">
              Cloud Drafts Locked
            </h3>
            <p className="text-[11px] text-slate-400 font-body mb-4">
              Sign in to sync your competitive drafts across any device with 1-click loading.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => signInWithOAuth('discord')}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] px-4 py-2 text-xs font-bold text-white transition cursor-pointer shadow-md"
              >
                <span>Sign in with Discord</span>
              </button>
              <button
                type="button"
                onClick={() => signInWithOAuth('google')}
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition cursor-pointer border border-slate-700"
              >
                <span>Sign in with Google</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search filter input */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by title, notes, hero name..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-slate-600 focus:outline-none font-body"
                />
              </div>
            </div>

            {/* Drafts List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
              {isDraftsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                  <span className="text-xs">Fetching your drafts...</span>
                </div>
              ) : filteredDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-center text-slate-400 px-4">
                  <FolderClock className="h-10 w-10 text-slate-600 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-300 uppercase mb-1">
                    No Drafts Found
                  </p>
                  <p className="text-[11px] text-slate-500 font-body mb-3">
                    {searchQuery ? 'Try a different search term.' : 'You have not saved any drafts to your Supabase account yet.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSaveModal();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/80 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
                  >
                    <span>Save Current Draft Now</span>
                  </button>
                </div>
              ) : (
                filteredDrafts.map((draft) => {
                  const isLoaded = loadedId === draft.id;
                  const isDeleting = deletingId === draft.id;

                  return (
                    <div
                      key={draft.id}
                      className="group rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 hover:bg-slate-950/90 transition shadow-sm"
                    >
                      {/* Top Bar: Title & Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate uppercase tracking-wide">
                            {draft.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[9.5px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(draft.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="capitalize text-amber-400/80">
                              · {draft.map_trait || 'standard'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* 1-Click Load Button */}
                          <button
                            type="button"
                            onClick={() => handleLoad(draft)}
                            title="Load this draft into the simulator"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                              isLoaded
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-400/50 hover:bg-sky-500/30'
                            }`}
                          >
                            <Play className="h-2.5 w-2.5 fill-current" />
                            <span>{isLoaded ? 'Loaded!' : 'Load'}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, draft.id)}
                            disabled={isDeleting}
                            title="Delete draft permanently"
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Visual Lineup Preview */}
                      <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2 my-1.5 flex items-center justify-between gap-1.5">
                        {/* Blue Picks */}
                        <div className="flex items-center gap-1">
                          {draft.blue_picks.map((h, i) => (
                            <div
                              key={`b-${draft.id}-${i}`}
                              className="h-6 w-6 rounded-full border border-sky-500/40 overflow-hidden bg-slate-950 flex items-center justify-center text-[8px] text-slate-600"
                              title={h ? `Blue ${i + 1}: ${h.name}` : `Empty`}
                            >
                              {h ? <HeroAvatar hero={h} variant="icon" /> : i + 1}
                            </div>
                          ))}
                        </div>

                        <span className="text-[9px] font-black text-slate-600">VS</span>

                        {/* Red Picks */}
                        <div className="flex items-center gap-1">
                          {draft.red_picks.map((h, i) => (
                            <div
                              key={`r-${draft.id}-${i}`}
                              className="h-6 w-6 rounded-full border border-rose-500/40 overflow-hidden bg-slate-950 flex items-center justify-center text-[8px] text-slate-600"
                              title={h ? `Red ${i + 1}: ${h.name}` : `Empty`}
                            >
                              {h ? <HeroAvatar hero={h} variant="icon" /> : i + 1}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tactical Notes if present */}
                      {draft.notes && (
                        <p className="text-[10px] text-slate-400 font-body line-clamp-2 mt-1 italic">
                          "{draft.notes}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <span>Row Level Security Active</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white font-bold transition"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
