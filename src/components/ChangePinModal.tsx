'use client';

import React, { useState } from 'react';
import { KeyRound, X, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePinModal({ isOpen, onClose, onSuccess }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPin.length < 4) {
      setError('New PIN must be at least 4 characters long.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess('PIN changed successfully!');
        setTimeout(() => {
          setCurrentPin('');
          setNewPin('');
          setConfirmPin('');
          setSuccess('');
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setError(json.error || 'Failed to update PIN.');
      }
    } catch {
      setError('Network or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative w-full max-w-sm rounded-2xl glass-panel border border-slate-800/80 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Change Admin PIN</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 text-emerald-300">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Current PIN</label>
            <input
              type="password"
              placeholder="••••"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center text-sm font-bold tracking-widest text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">New PIN (min 4 chars)</label>
            <input
              type="password"
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center text-sm font-bold tracking-widest text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Confirm New PIN</label>
            <input
              type="password"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center text-sm font-bold tracking-widest text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Changes are saved to <code className="text-slate-400">~/.ops/config.json</code> instantly.
          </p>

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
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Update PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
