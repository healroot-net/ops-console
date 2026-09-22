'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MetricCards } from '@/components/MetricCards';
import { PM2Table } from '@/components/PM2Table';
import { ServiceHealthGrid } from '@/components/ServiceHealthGrid';
import { LogTerminal } from '@/components/LogTerminal';
import { AuthModal } from '@/components/AuthModal';
import { NtfyAlertModal } from '@/components/NtfyAlertModal';
import { AddServiceModal } from '@/components/AddServiceModal';
import { SystemMetrics } from '@/lib/monitor/system';
import { PM2Process } from '@/lib/monitor/pm2';
import { HealthCheckResult } from '@/lib/monitor/health';
import { RefreshCw, Bell, Lock, Unlock, Activity } from 'lucide-react';

export default function DashboardPage() {
  const [system, setSystem] = useState<SystemMetrics | null>(null);
  const [pm2, setPm2] = useState<PM2Process[]>([]);
  const [services, setServices] = useState<HealthCheckResult[]>([]);
  const [ntfyInfo, setNtfyInfo] = useState<{ enabled: boolean; topic: string; server: string }>({
    enabled: true,
    topic: '',
    server: 'https://ntfy.sh',
  });

  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNtfyModalOpen, setIsNtfyModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeLogProcess, setActiveLogProcess] = useState<string | null>(null);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/metrics');
      const json = await res.json();
      if (json.success && json.data) {
        setSystem(json.data.system);
        setPm2(json.data.pm2 || []);
        setServices(json.data.services || []);
        if (json.data.ntfy) {
          setNtfyInfo(json.data.ntfy);
        }
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check auth session
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth');
      const json = await res.json();
      setIsAuthenticated(json.authenticated);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    checkAuth();
  }, [fetchMetrics, checkAuth]);

  // Polling loop (5s)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchMetrics, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchMetrics]);

  // PM2 Action handler (restart, stop, start, reset, flush)
  const handlePM2Action = async (
    target: string | number,
    action: 'restart' | 'stop' | 'start' | 'reset'
  ) => {
    try {
      const res = await fetch('/api/pm2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchMetrics();
      } else {
        alert(json.error || `Failed to execute ${action} on ${target}.`);
      }
    } catch {
      alert('Failed to connect to server.');
    }
  };

  // Add Target handler
  const handleAddTarget = async (target: { name: string; url: string; timeoutMs?: number; description?: string }) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return false;
    }
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });
      const json = await res.json();
      if (json.success) {
        await fetchMetrics();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Delete Target handler
  const handleDeleteTarget = async (id: string) => {
    if (!confirm('Are you sure you want to remove this monitoring target?')) return;
    try {
      const res = await fetch('/api/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchMetrics();
      }
    } catch {
      alert('Failed to remove target.');
    }
  };

  // Manual Probe Target
  const handleProbeTarget = async () => {
    await fetchMetrics();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono pb-20 selection:bg-cyan-500/30">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 shadow-sm">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Ops<span className="text-cyan-400">Console</span>
              </span>
            </div>
            {system?.hostname && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {system.hostname}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Auto refresh toggle */}
            <label className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none px-2 py-1 rounded bg-slate-900 border border-slate-800">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
              />
              <span>Live Poll (5s)</span>
            </label>

            {/* Refresh Button */}
            <button
              onClick={fetchMetrics}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* ntfy Modal Button */}
            <button
              onClick={() => setIsNtfyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all shadow-sm"
              title="Configure ntfy push alerts"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Alerts</span>
            </button>

            {/* Auth Unlock/Lock Button */}
            <button
              onClick={() => (isAuthenticated ? setIsAuthenticated(false) : setIsAuthModalOpen(true))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                isAuthenticated
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {isAuthenticated ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Unlocked</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Locked</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* 1. System Metrics */}
        <section>
          <MetricCards system={system} />
        </section>

        {/* 2. PM2 Process Manager */}
        <section>
          <PM2Table
            processes={pm2}
            onAction={handlePM2Action}
            onOpenLogs={(name) => setActiveLogProcess(name)}
            onRequestAuth={() => setIsAuthModalOpen(true)}
            isAuthenticated={isAuthenticated}
          />
        </section>

        {/* 3. Monitored Service Probes */}
        <section>
          <ServiceHealthGrid
            services={services}
            onOpenAddModal={() => (isAuthenticated ? setIsAddModalOpen(true) : setIsAuthModalOpen(true))}
            onDeleteTarget={handleDeleteTarget}
            onProbeTarget={handleProbeTarget}
            onProbeAll={handleProbeTarget}
            isAuthenticated={isAuthenticated}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 text-center text-xs text-slate-600">
        <p>Ops Console · Open-source lightweight server telemetry & control</p>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAuthenticated(true)}
      />

      <NtfyAlertModal
        isOpen={isNtfyModalOpen}
        onClose={() => setIsNtfyModalOpen(false)}
        topic={ntfyInfo.topic}
        serverUrl={ntfyInfo.server}
        onRequestAuth={() => setIsAuthModalOpen(true)}
        isAuthenticated={isAuthenticated}
      />

      <AddServiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTarget}
      />

      <LogTerminal
        processName={activeLogProcess}
        onClose={() => setActiveLogProcess(null)}
        onRequestAuth={() => setIsAuthModalOpen(true)}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
