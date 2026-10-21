import React, { useState } from 'react';
import {
  BookmarkCheck,
  CloudUpload,
  Info,
  Loader2,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, signInWithOAuth } from '../lib/supabase';
import { useDraftStore } from '../store/useDraftStore';
import { HeroAvatar } from './HeroAvatar';

interface SaveDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveDraftModal: React.FC<SaveDraftModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    user,
    bluePicks,
    redPicks,
    mapTrait,
    saveCurrentDraft,
  } = useDraftStore();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultTitle = `Draft ${new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${new Date().toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!user) {
      setErrorMessage('Please sign in to save your draft to the cloud.');
      return;
    }

    setIsSaving(true);
    try {
      await saveCurrentDraft(title.trim() || defaultTitle, notes.trim());
      setSuccessMessage('Draft saved permanently to Supabase!');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setTitle('');
        setNotes('');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg rounded-xl border border-slate-700/80 bg-slate-900/95 p-4 sm:p-6 shadow-2xl backdrop-blur-md text-slate-100 font-hud"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/40">
              <CloudUpload className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Save Draft to Cloud
              </h2>
              <p className="text-[10px] text-slate-400">
                Guaranteed permanent storage powered by Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {!isSupabaseConfigured ? (
          <div className="my-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
            <div className="flex items-center gap-2 font-bold mb-1">
              <Info className="h-4 w-4 shrink-0" />
              <span>Supabase Credentials Required</span>
            </div>
            <p className="text-[11px] text-slate-300 font-body leading-relaxed">
              Please configure <code className="text-amber-200">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> in your project{' '}
              <code className="text-amber-200">.env</code> file to enable cloud sync.
            </p>
          </div>
        ) : !user ? (
          <div className="my-4 rounded-lg border border-slate-700 bg-slate-950/70 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">
              Sign In to Save
            </h3>
            <p className="text-[11px] text-slate-400 font-body mb-3 max-w-xs mx-auto">
              Sign in with Discord or Google to permanently link drafts to your account with Row Level Security.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => signInWithOAuth('discord')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] px-4 py-2 text-xs font-bold text-white transition cursor-pointer shadow-md"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Discord</span>
              </button>
              <button
                type="button"
                onClick={() => signInWithOAuth('google')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition cursor-pointer border border-slate-700 shadow-md"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3.5 my-3">
            {/* Draft Preview Bar */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                <span>Composition Preview</span>
                <span className="text-amber-400 capitalize">{mapTrait}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {/* Blue Team Avatars */}
                <div className="flex items-center gap-1">
                  {bluePicks.map((hero, i) => (
                    <div
                      key={`blue-preview-${i}`}
                      className="h-7 w-7 rounded-full border border-sky-500/50 overflow-hidden bg-slate-950 flex items-center justify-center text-[9px] text-slate-500"
                    >
                      {hero ? (
                        <HeroAvatar hero={hero} variant="icon" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>

                <span className="text-[10px] font-black text-slate-500">VS</span>

                {/* Red Team Avatars */}
                <div className="flex items-center gap-1">
                  {redPicks.map((hero, i) => (
                    <div
                      key={`red-preview-${i}`}
                      className="h-7 w-7 rounded-full border border-rose-500/50 overflow-hidden bg-slate-950 flex items-center justify-center text-[9px] text-slate-500"
                    >
                      {hero ? (
                        <HeroAvatar hero={hero} variant="icon" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Draft Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={defaultTitle}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-body"
              />
            </div>

            {/* Tactical Notes Textarea */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Tactical Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g., Target early Lithowanderer control; watch enemy Tigreal flicker engage..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-body resize-none"
              />
            </div>

            {/* Messages */}
            {errorMessage && (
              <div className="rounded border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-[11px] text-rose-300">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-[11px] text-emerald-300 flex items-center gap-1.5">
                <BookmarkCheck className="h-3.5 w-3.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-gold-glow hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Save to Supabase</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
