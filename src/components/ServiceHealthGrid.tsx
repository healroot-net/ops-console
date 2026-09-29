'use client';

import React, { useState, useMemo } from 'react';
import { HealthCheckResult } from '@/lib/monitor/health';
import { ExternalLink, CheckCircle2, AlertTriangle, XCircle, Plus, Trash2, RefreshCw, Search } from 'lucide-react';

interface ServiceHealthGridProps {
  services: HealthCheckResult[];
  onOpenAddModal: () => void;
  onDeleteTarget: (id: string) => Promise<void>;
  onProbeTarget?: (id: string) => Promise<void>;
  onProbeAll?: () => Promise<void>;
  isAuthenticated: boolean;
}

export function ServiceHealthGrid({
  services,
  onOpenAddModal,
  onDeleteTarget,
  onProbeTarget,
  onProbeAll,
  isAuthenticated,
}: ServiceHealthGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [probingId, setProbingId] = useState<string | null>(null);

  const handleProbe = async (id: string) => {
    if (!onProbeTarget) return;
    setProbingId(id);
    try {
      await onProbeTarget(id);
    } finally {
      setProbingId(null);
    }
  };

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase().trim();
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'down':
        return <XCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  const getStatusBadge = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400';
      case 'degraded':
        return 'border-amber-500/30 bg-amber-950/20 text-amber-400';
      case 'down':
        return 'border-rose-500/30 bg-rose-950/20 text-rose-400';
    }
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-slate-800/80 font-mono">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">Monitored Service Probes</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400">
            {services.length} Endpoints
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Probe All Now */}
          {onProbeAll && (
            <button
              onClick={onProbeAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
              title="Probe all targets right now"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Probe All</span>
            </button>
          )}

          {/* Add Target Modal */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Target</span>
          </button>
        </div>
      </div>

      {/* 2. Search Bar (if > 3 targets) */}
      {services.length > 3 && (
        <div className="px-4 py-2 border-b border-slate-800/70 bg-slate-950/30">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search target URL or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 pl-7 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* 3. Grid of Target Cards */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredServices.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 text-xs">
            {searchQuery
              ? 'No targets matching search.'
              : 'No targets monitored yet. Click "+ Add Target" to register your first endpoint.'}
          </div>
        ) : (
          filteredServices.map((svc) => {
            const isProbing = probingId === svc.id;
            return (
              <div
                key={svc.id}
                className="relative group rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-white text-sm truncate">
                      {getStatusIcon(svc.status)}
                      <span className="truncate">{svc.name}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 truncate flex items-center gap-1">
                      <span className="truncate">{svc.url}</span>
                      <a
                        href={svc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border uppercase ${getStatusBadge(svc.status)}`}>
                      {svc.status}
                    </span>

                    {/* Manual Probe Now Button */}
                    {onProbeTarget && (
                      <button
                        disabled={isProbing}
                        onClick={() => handleProbe(svc.id)}
                        className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                        title="Probe this target immediately"
                      >
                        <RefreshCw className={`w-3 h-3 ${isProbing ? 'animate-spin' : ''}`} />
                      </button>
                    )}

                    {/* Remove Target Button */}
                    {isAuthenticated && (
                      <button
                        onClick={() => onDeleteTarget(svc.id)}
                        className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Latency: <strong className="text-white">{svc.latencyMs}ms</strong>
                  </span>
                  <span>
                    HTTP: <strong className={svc.httpStatus && svc.httpStatus < 400 ? 'text-emerald-400' : 'text-rose-400'}>
                      {svc.httpStatus || 'ERR'}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
