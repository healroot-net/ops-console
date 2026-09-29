'use client';

import React, { useState, useMemo } from 'react';
import { PM2Process } from '@/lib/monitor/pm2';
import { RotateCw, Square, Play, Terminal, AlertTriangle, Search, Eraser, Layers } from 'lucide-react';

interface PM2TableProps {
  processes: PM2Process[];
  onAction: (target: string | number, action: 'restart' | 'stop' | 'start' | 'reset') => Promise<void>;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'errored' | 'stopped'>('all');
  const [loadingTarget, setLoadingTarget] = useState<string | number | null>(null);

  const handleActionClick = async (target: string | number, action: 'restart' | 'stop' | 'start' | 'reset') => {
    if (!isAuthenticated) {
      onRequestAuth();
      return;
    }
    setLoadingTarget(target);
    try {
      await onAction(target, action);
    } finally {
      setLoadingTarget(null);
    }
  };

  // Status Counts
  const counts = useMemo(() => {
    const online = processes.filter((p) => p.status === 'online' && !p.isFlapping).length;
    const errored = processes.filter((p) => p.status === 'errored' || p.isFlapping).length;
    const stopped = processes.filter((p) => p.status === 'stopped').length;
    return { all: processes.length, online, errored, stopped };
  }, [processes]);

  // Filtered List
  const filteredProcesses = useMemo(() => {
    return processes.filter((proc) => {
      // 1. Status Filter
      if (statusFilter === 'online' && (proc.status !== 'online' || proc.isFlapping)) return false;
      if (statusFilter === 'errored' && (proc.status !== 'errored' && !proc.isFlapping)) return false;
      if (statusFilter === 'stopped' && proc.status !== 'stopped') return false;

      // 2. Search Query (name or PID)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = proc.name.toLowerCase().includes(query);
        const pidMatch = String(proc.pid).includes(query);
        const idMatch = String(proc.id) === query;
        if (!nameMatch && !pidMatch && !idMatch) return false;
      }

      return true;
    });
  }, [processes, statusFilter, searchQuery]);

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
    <div className="glass-panel rounded-xl overflow-hidden border border-slate-800/80 font-mono">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">PM2 Process Manager</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400">
            {processes.length} Active
          </span>
        </div>

        {/* Global Batch Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Restart All */}
          <button
            disabled={loadingTarget === 'all' || processes.length === 0}
            onClick={() => handleActionClick('all', 'restart')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
            title="Restart all PM2 processes (pm2 restart all)"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingTarget === 'all' ? 'animate-spin' : ''}`} />
            <span>Restart All</span>
          </button>

          {/* Reset All Counters */}
          <button
            disabled={loadingTarget === 'all_reset' || processes.length === 0}
            onClick={() => handleActionClick('all', 'reset')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
            title="Reset restart counters to 0 for all processes (pm2 reset all)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Reset Counters</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-xs">
        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setStatusFilter('online')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'online'
                ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 font-bold'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Online ({counts.online})
          </button>

          {counts.errored > 0 && (
            <button
              onClick={() => setStatusFilter('errored')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'errored'
                  ? 'bg-rose-950/60 border border-rose-800/50 text-rose-300 font-bold'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Errored ({counts.errored})</span>
            </button>
          )}

          <button
            onClick={() => setStatusFilter('stopped')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'stopped'
                ? 'bg-slate-800 text-slate-200 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Stopped ({counts.stopped})
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search process, PID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-slate-400 hover:text-white absolute right-2.5 top-2 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Process Table */}
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
            {filteredProcesses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No processes matching your search criteria.'
                    : 'No PM2 processes found. Run pm2 start app.js to populate.'}
                </td>
              </tr>
            ) : (
              filteredProcesses.map((proc) => {
                const isLoading = loadingTarget === proc.id || loadingTarget === 'all';
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
                      <div className="flex items-center gap-1.5">
                        <span className={proc.restarts > 5 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {proc.restarts}
                        </span>
                        {proc.unstableRestarts > 0 && (
                          <span className="text-[10px] text-amber-500" title="Unstable crash count">
                            (!{proc.unstableRestarts})
                          </span>
                        )}
                        {/* Individual Counter Reset Button */}
                        {proc.restarts > 0 && (
                          <button
                            onClick={() => handleActionClick(proc.id, 'reset')}
                            className="p-1 rounded text-slate-500 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                            title="Reset restart counter to 0"
                          >
                            <Eraser className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {/* View Logs Button */}
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
