'use client';

import React, { useState } from 'react';
import { X, Plus, Globe } from 'lucide-react';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (target: { name: string; url: string; timeoutMs?: number; description?: string }) => Promise<boolean>;
}

export function AddServiceModal({ isOpen, onClose, onAdd }: AddServiceModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [timeoutMs, setTimeoutMs] = useState('5000');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !url.trim()) {
      setError('Name and URL are required.');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onAdd({
        name: name.trim(),
        url: url.trim(),
        timeoutMs: parseInt(timeoutMs, 10) || 5000,
        description: description.trim(),
      });
      if (ok) {
        setName('');
        setUrl('');
        setDescription('');
        onClose();
      } else {
        setError('Failed to add target. Check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Add Monitored Target</h3>
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
            <label className="block text-slate-400 mb-1 font-semibold">Service Name</label>
            <input
              type="text"
              placeholder="e.g. Backend API, Next.js Web"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Endpoint URL</label>
            <input
              type="text"
              placeholder="e.g. http://127.0.0.1:3000 or https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Timeout (ms)</label>
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Description (Optional)</label>
              <input
                type="text"
                placeholder="Brief notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Register'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
