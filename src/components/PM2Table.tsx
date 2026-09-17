'use client';

import React, { useState } from 'react';
import { PM2Process } from '@/lib/monitor/pm2';
import { RotateCw, Square, Play, Terminal, AlertTriangle } from 'lucide-react';

interface PM2TableProps {
  processes: PM2Process[];
  onAction: (target: string | number, action: 'restart' | 'stop' | 'start') => Promise<void>;
  onOpenLogs: (processName: string) => void;
  onRequestAuth: () => void;
  isAuthenticated: boolean;
}

export function PM2Table({
  processes,
  onAction,
  onOpenLogs,
  onRequestAuth,
  isAuthenticated,
}: PM2TableProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleActionClick = async (target: number, action: 'restart' | 'stop' | 'start') => {
    if (!isAuthenticated) {
      onRequestAuth();
      return;
    }
    setLoadingId(target);
    try {
      await onAction(target, action);
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: PM2Process['status'], isFlapping?: boolean) => {
    if (isFlapping) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border border-rose-500/40 bg-rose-950/30 text-rose-400 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          FLAPPING
        </span>
      );
    }
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            online
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border border-slate-700 bg-slate-800 text-slate-400">
            stopped
          </span>
        );
      case 'errored':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border border-rose-500/40 bg-rose-950/30 text-rose-400">
            errored
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border border-amber-500/40 bg-amber-950/30 text-amber-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-md font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">PM2 Managed Processes</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400">
            {processes.length} Active
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Process Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">CPU</th>
              <th className="px-4 py-3">Memory</th>
              <th className="px-4 py-3">Uptime</th>
              <th className="px-4 py-3">Restarts</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {processes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No PM2 processes found. Run <code className="text-slate-400">pm2 start app.js</code> to populate.
                </td>
              </tr>
            ) : (
              processes.map((proc) => {
                const isLoading = loadingId === proc.id;
                return (
                  <tr key={proc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-bold">#{proc.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        {proc.name}
                        {proc.version && proc.version !== 'N/A' && (
                          <span className="text-[10px] text-slate-500">v{proc.version}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={proc.execPath}>
                        PID: {proc.pid || 'N/A'} · Mode: {proc.mode}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(proc.status, proc.isFlapping)}</td>
                    <td className="px-4 py-3">
                      <span className={proc.cpu > 50 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {proc.cpu}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{proc.memoryMB} MB</td>
                    <td className="px-4 py-3 text-slate-400">{proc.uptimeFormatted}</td>
                    <td className="px-4 py-3">
                      <span className={proc.restarts > 5 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {proc.restarts}
                      </span>
                      {proc.unstableRestarts > 0 && (
                        <span className="ml-1 text-[10px] text-amber-500" title="Unstable crashes">
                          (!{proc.unstableRestarts})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {/* Logs Button */}
                      <button
                        onClick={() => onOpenLogs(proc.name)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="View Process Logs"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                      </button>

                      {/* Restart Button */}
                      <button
                        disabled={isLoading}
                        onClick={() => handleActionClick(proc.id, 'restart')}
                        className="p-1.5 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 text-cyan-300 transition-colors disabled:opacity-50"
                        title="Restart Process"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>

                      {/* Stop/Start Button */}
                      {proc.status === 'online' ? (
                        <button
                          disabled={isLoading}
                          onClick={() => handleActionClick(proc.id, 'stop')}
                          className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 transition-colors disabled:opacity-50"
                          title="Stop Process"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          disabled={isLoading}
                          onClick={() => handleActionClick(proc.id, 'start')}
                          className="p-1.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-300 transition-colors disabled:opacity-50"
                          title="Start Process"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
