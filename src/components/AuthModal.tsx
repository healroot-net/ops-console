'use client';

import React, { useState } from 'react';
import { Lock, X, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const json = await res.json();
      if (json.success) {
        setPin('');
        onSuccess();
        onClose();
      } else {
        setError(json.error || 'Authentication failed.');
      }
    } catch {
      setError('Network or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Admin Authentication</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Enter Admin PIN</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-center text-lg font-bold tracking-widest text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                required
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Default PIN is configured in <code className="text-slate-400">~/.ops/config.json</code>
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Unlock Control'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
