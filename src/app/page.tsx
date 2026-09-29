'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MetricCards } from '@/components/MetricCards';
import { PM2Table } from '@/components/PM2Table';
import { ServiceHealthGrid } from '@/components/ServiceHealthGrid';
import { LogTerminal } from '@/components/LogTerminal';
import { AuthModal } from '@/components/AuthModal';
import { ChangePinModal } from '@/components/ChangePinModal';
import { NtfyAlertModal } from '@/components/NtfyAlertModal';
import { AddServiceModal } from '@/components/AddServiceModal';
import { SystemMetrics } from '@/lib/monitor/system';
import { PM2Process } from '@/lib/monitor/pm2';
import { HealthCheckResult } from '@/lib/monitor/health';
import {
  RefreshCw,
  Bell,
  Lock,
  Unlock,
  Activity,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

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

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requireAuth, setRequireAuth] = useState(true);
  const [isDefaultPin, setIsDefaultPin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Entry Gate State
  const [entryPin, setEntryPin] = useState('');
  const [entryError, setEntryError] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [isNtfyModalOpen, setIsNtfyModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeLogProcess, setActiveLogProcess] = useState<string | null>(null);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/metrics');
      const json = await res.json();
      if (res.status === 401 || json.requireAuth) {
        setIsAuthenticated(false);
        return;
      }
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
      setIsAuthenticated(Boolean(json.authenticated));
      setRequireAuth(json.requireAuth !== false);
      setIsDefaultPin(Boolean(json.isDefaultPin));
      return Boolean(json.authenticated);
    } catch {
      setIsAuthenticated(false);
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth().then((authed) => {
      if (authed || !requireAuth) {
        fetchMetrics();
      }
    });
  }, [checkAuth, fetchMetrics, requireAuth]);

  // Polling loop (5s)
  useEffect(() => {
    if (!autoRefresh || (!isAuthenticated && requireAuth)) return;
    const timer = setInterval(fetchMetrics, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchMetrics, isAuthenticated, requireAuth]);

  // Handle Entry Login Form
  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError('');
    setEntryLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: entryPin }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAuthenticated(true);
        setIsDefaultPin(Boolean(json.isDefaultPin));
        setEntryPin('');
        await fetchMetrics();
      } else {
        setEntryError(json.error || 'Invalid PIN code.');
      }
    } catch {
      setEntryError('Server connection error.');
    } finally {
      setEntryLoading(false);
    }
  };

  // Logout / Lock Handler
  const handleLockConsole = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {}
    setIsAuthenticated(false);
  };

  // PM2 Action handler
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

  // 1. Initial Auth Check Skeleton
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-cyan-400">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-800/80 glass-panel">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-xs text-slate-300">Initializing Ops Console...</span>
        </div>
      </div>
    );
  }

  // 2. Entry Lock Gate (비밀번호 입력 진입 화면)
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen text-slate-100 font-mono flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
        <div className="w-full max-w-sm rounded-2xl glass-panel p-8 shadow-2xl space-y-6 text-center">
          {/* Glowing Shield Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Ops<span className="text-cyan-400">Console</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Enter Admin PIN to access telemetry & control
            </p>
          </div>

          <form onSubmit={handleEntrySubmit} className="space-y-4 text-left">
            {entryError && (
              <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs text-center">
                {entryError}
              </div>
            )}

            <div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••"
                  value={entryPin}
                  onChange={(e) => setEntryPin(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-xl font-bold tracking-[0.3em] text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-600 absolute right-3.5 top-4 pointer-events-none" />
              </div>
            </div>

            {isDefaultPin && (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-300 text-[11px] leading-relaxed text-center">
                <span>Default PIN is </span>
                <span className="font-bold underline text-amber-200">8888</span>
                <p className="text-[10px] text-amber-400/80 mt-0.5">You can change it immediately after login.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={entryLoading}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {entryLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <span>Unlock Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-600">
            Lightweight Self-Hosted Server Telemetry · Ops Console
          </p>
        </div>
      </div>
    );
  }

  // 3. Full Main Dashboard (인증 완료 대시보드)
  return (
    <div className="min-h-screen text-slate-100 font-mono pb-20 selection:bg-cyan-500/30">
      {/* Top Default PIN Warning Banner */}
      {isDefaultPin && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-2 text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Security Notice:</strong> You are currently using the default PIN (<code>8888</code>). Please change it for production use.
            </span>
          </div>
          <button
            onClick={() => setIsChangePinModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold transition-colors cursor-pointer"
          >
            <KeyRound className="w-3 h-3" />
            <span>Change PIN</span>
          </button>
        </div>
      )}

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 glass-panel">
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
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* ntfy Modal Button */}
            <button
              onClick={() => setIsNtfyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all shadow-sm cursor-pointer"
              title="Configure ntfy push alerts"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Alerts</span>
            </button>

            {/* Change PIN Button */}
            <button
              onClick={() => setIsChangePinModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all shadow-sm cursor-pointer"
              title="Change PIN"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">PIN</span>
            </button>

            {/* Lock / Logout Button */}
            <button
              onClick={handleLockConsole}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-semibold transition-all shadow-sm cursor-pointer"
              title="Click to lock console"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Unlocked</span>
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
        isDefaultPin={isDefaultPin}
      />

      <ChangePinModal
        isOpen={isChangePinModalOpen}
        onClose={() => setIsChangePinModalOpen(false)}
        onSuccess={() => {
          setIsDefaultPin(false);
          checkAuth();
        }}
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
