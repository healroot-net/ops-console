'use client';

import React from 'react';
import { SystemMetrics } from '@/lib/monitor/system';
import { Cpu, HardDrive, Clock, Server } from 'lucide-react';

interface MetricCardsProps {
  system: SystemMetrics | null;
}

export function MetricCards({ system }: MetricCardsProps) {
  if (!system) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 glass-panel rounded-xl" />
        ))}
      </div>
    );
  }

  const rootDisk = system.disks.find((d) => d.mount === '/' || d.mount === '/System/Volumes/Data') || system.disks[0];
  const memUsedGB = Math.round((system.memory.usedBytes / (1024 * 1024 * 1024)) * 10) / 10;
  const memTotalGB = Math.round((system.memory.totalBytes / (1024 * 1024 * 1024)) * 10) / 10;

  const getUsageColor = (pct: number) => {
    if (pct >= 85) return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
    if (pct >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 85) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
      {/* 1. CPU Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-all hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            CPU USAGE
          </span>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getUsageColor(system.cpu.usagePercent)}`}>
            {system.cpu.usagePercent}%
          </span>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white tracking-tight">{system.cpu.usagePercent}%</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(system.cpu.usagePercent)}`}
              style={{ width: `${Math.min(100, Math.max(2, system.cpu.usagePercent))}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{system.cpu.cores} Cores</span>
          <span>Load: {system.loadAverage.join(', ')}</span>
        </div>
      </div>

      {/* 2. Memory Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-all hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-indigo-400" />
            RAM USAGE
          </span>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getUsageColor(system.memory.usagePercent)}`}>
            {system.memory.usagePercent}%
          </span>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white tracking-tight">
            {memUsedGB} <span className="text-sm font-normal text-slate-400">/ {memTotalGB} GB</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(system.memory.usagePercent)}`}
              style={{ width: `${Math.min(100, Math.max(2, system.memory.usagePercent))}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>Free: {Math.round((system.memory.freeBytes / (1024 * 1024 * 1024)) * 10) / 10} GB</span>
          {system.memory.swapUsedBytes !== undefined && (
            <span>Swap: {Math.round((system.memory.swapUsedBytes / (1024 * 1024 * 1024)) * 10) / 10} GB</span>
          )}
        </div>
      </div>

      {/* 3. Disk Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-all hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            DISK USAGE
          </span>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getUsageColor(rootDisk ? rootDisk.usagePercent : 0)}`}>
            {rootDisk ? `${rootDisk.usagePercent}%` : 'N/A'}
          </span>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white tracking-tight">
            {rootDisk ? rootDisk.usedGB : 0} <span className="text-sm font-normal text-slate-400">/ {rootDisk ? rootDisk.totalGB : 0} GB</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(rootDisk ? rootDisk.usagePercent : 0)}`}
              style={{ width: `${Math.min(100, Math.max(2, rootDisk ? rootDisk.usagePercent : 0))}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>Mount: {rootDisk?.mount || '/'}</span>
          <span>Avail: {rootDisk?.availableGB || 0} GB</span>
        </div>
      </div>

      {/* 4. Host & Uptime Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-all hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            UPTIME & HOST
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="mt-4">
          <div className="text-xl font-bold text-white tracking-tight truncate" title={system.uptimeFormatted}>
            {system.uptimeFormatted}
          </div>
          <div className="mt-2 text-xs text-slate-400 truncate" title={system.hostname}>
            Host: <span className="text-white font-semibold">{system.hostname}</span>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-slate-500 truncate" title={system.platform}>
          {system.platform}
        </div>
      </div>
    </div>
  );
}
