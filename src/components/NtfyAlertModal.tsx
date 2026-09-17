'use client';

import React, { useState } from 'react';
import { Bell, X, Send, ExternalLink, Smartphone, CheckCircle2 } from 'lucide-react';

interface NtfyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  serverUrl?: string;
  onRequestAuth: () => void;
  isAuthenticated: boolean;
}

export function NtfyAlertModal({
  isOpen,
  onClose,
  topic,
  serverUrl = 'https://ntfy.sh',
  onRequestAuth,
  isAuthenticated,
}: NtfyAlertModalProps) {
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSendTest = async () => {
    if (!isAuthenticated) {
      onRequestAuth();
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const res = await fetch('/api/alert/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage || undefined }),
      });
      const json = await res.json();
      setStatus({ success: json.success, message: json.message || (json.success ? 'Alert sent!' : 'Failed') });
    } catch {
      setStatus({ success: false, message: 'Network request error' });
    } finally {
      setSending(false);
    }
  };

  const ntfyWebUrl = `${serverUrl.replace(/\/$/, '')}/${topic}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">ntfy Push Notifications</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Status Box */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Active Topic:</span>
              <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 font-bold">
                {topic || 'ops-alerts'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Install the free <strong>ntfy app</strong> on iOS or Android, or open in browser to subscribe to this topic. You will receive real-time push alerts whenever a service goes down or a PM2 process crashes.
            </p>
            <a
              href={ntfyWebUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Open topic on ntfy.sh</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Test Alert Sender */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-slate-400 font-semibold">Dispatch Test Notification</label>
            <input
              type="text"
              placeholder="Optional test message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            />

            {status && (
              <div
                className={`p-2 rounded-lg border text-[11px] ${
                  status.success
                    ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                }`}
              >
                {status.message}
              </div>
            )}

            <button
              onClick={handleSendTest}
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-amber-500/40 bg-amber-600 text-white font-semibold hover:bg-amber-500 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Dispatching...' : 'Send Test Alert'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
