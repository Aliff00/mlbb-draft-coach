import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-rose-500/60 bg-gradient-to-b from-[#1c0f20] via-[#120b18] to-[#09060e] p-6 shadow-[0_0_50px_rgba(244,63,94,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Warning Line */}
        <div className="absolute inset-x-12 top-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

        {/* Close Icon */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition cursor-pointer p-1"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-rose-400">
              Reset Current Draft?
            </h2>
            <p className="text-xs text-rose-200/70">
              Warning: All draft progress will be lost.
            </p>
          </div>
        </div>

        {/* Confirmation Body Description */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 rounded-lg border border-rose-950 p-3 mb-5">
          Resetting will clear all locked hero bans, picks, and composition assignments, returning the board to an empty state. Are you sure you want to proceed?
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-slate-500 hover:text-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-lg border border-rose-400 bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_15px_rgba(225,29,72,0.5)] hover:from-rose-500 hover:to-red-500 active:scale-95 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Confirm Reset</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
