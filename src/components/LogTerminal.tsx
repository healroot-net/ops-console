'use client';

import React, { useEffect, useState } from 'react';
import { Terminal, X, RefreshCw, AlertCircle } from 'lucide-react';

interface LogTerminalProps {
  processName: string | null;
  onClose: () => void;
}

export function LogTerminal({ processName, onClose }: LogTerminalProps) {
  const [activeTab, setActiveTab] = useState<'out' | 'err'>('out');
  const [logs, setLogs] = useState<{ out: string[]; err: string[] }>({ out: [], err: [] });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    if (!processName) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?process=${encodeURIComponent(processName)}&lines=100`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [processName]);

  useEffect(() => {
    if (!autoRefresh || !processName) return;
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, processName]);

  if (!processName) return null;

  const currentLines = activeTab === 'out' ? logs.out : logs.err;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative flex flex-col w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-sm">PM2 Log Console:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-xs text-cyan-300 font-semibold">
              {processName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
              />
              <span>Auto-refresh (4s)</span>
            </label>

            <button
              onClick={fetchLogs}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-950/60 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('out')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'out'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Standard Output ({logs.out.length})
          </button>
          <button
            onClick={() => setActiveTab('err')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              activeTab === 'err'
                ? 'bg-rose-950/40 text-rose-300 font-semibold border border-rose-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Error Log ({logs.err.length})
          </button>
        </div>

        {/* Log Viewer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 text-xs font-mono select-text bg-black/90">
          {currentLines.length === 0 ? (
            <div className="py-12 text-center text-slate-600">No logs found in {activeTab} stream.</div>
          ) : (
            currentLines.map((line, idx) => (
              <div
                key={idx}
                className={`leading-relaxed whitespace-pre-wrap break-all ${
                  activeTab === 'err' ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 mr-2 select-none">[{idx + 1}]</span>
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
