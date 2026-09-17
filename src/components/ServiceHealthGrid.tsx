'use client';

import React from 'react';
import { HealthCheckResult } from '@/lib/monitor/health';
import { ExternalLink, CheckCircle2, AlertTriangle, XCircle, Plus, Trash2 } from 'lucide-react';

interface ServiceHealthGridProps {
  services: HealthCheckResult[];
  onOpenAddModal: () => void;
  onDeleteTarget: (id: string) => Promise<void>;
  isAuthenticated: boolean;
}

export function ServiceHealthGrid({
  services,
  onOpenAddModal,
  onDeleteTarget,
  isAuthenticated,
}: ServiceHealthGridProps) {
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
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-md font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">Monitored Service Probes</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400">
            {services.length} Endpoints
          </span>
        </div>
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 hover:text-white transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Target</span>
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 text-xs">
            No targets monitored yet. Click <span className="text-cyan-400 font-semibold">+ Add Target</span> to register your first endpoint.
          </div>
        ) : (
          services.map((svc) => (
            <div
              key={svc.id}
              className="relative group rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 hover:border-slate-700 transition-all"
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
          ))
        )}
      </div>
    </div>
  );
}
