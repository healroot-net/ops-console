import { checkAllHealth } from '../lib/monitor/health';
import { getPM2Processes } from '../lib/monitor/pm2';
import { getSystemMetrics } from '../lib/monitor/system';
import { sendNtfyAlert, isAlertOnCooldown, markAlertSent } from '../lib/alerts/ntfy';
import { loadOpsConfig } from '../lib/config';

let isRunning = false;
let checkInterval: NodeJS.Timeout | null = null;

export async function runMonitoringCycle(): Promise<void> {
  try {
    const config = loadOpsConfig();
    const [healthResults, pm2Processes, systemMetrics] = await Promise.all([
      checkAllHealth(),
      getPM2Processes(),
      getSystemMetrics(),
    ]);

    // 1. Check HTTP Targets Down
    for (const res of healthResults) {
      if (res.status === 'down') {
        const alertKey = `target-down-${res.id}`;
        if (!isAlertOnCooldown(alertKey)) {
          markAlertSent(alertKey);
          await sendNtfyAlert({
            title: `🚨 [Service Down] ${res.name}`,
            message: `**Service Alert**: ${res.name} (${res.url}) is unreachable.\n- **Error**: ${res.errorMessage || 'Unknown failure'}\n- **Latency**: ${res.latencyMs}ms`,
            priority: 'urgent',
            tags: ['rotating_light', 'warning', 'server'],
          });
        }
      }
    }

    // 2. Check PM2 Flapping / Errored Processes
    for (const proc of pm2Processes) {
      if (proc.status === 'errored' || proc.isFlapping) {
        const alertKey = `pm2-error-${proc.name}`;
        if (!isAlertOnCooldown(alertKey)) {
          markAlertSent(alertKey);
          await sendNtfyAlert({
            title: `⚠️ [PM2 Process Crash] ${proc.name}`,
            message: `**PM2 Alert**: Process \`${proc.name}\` (PID ${proc.pid}) is in errored/flapping state.\n- **Restarts**: ${proc.restarts} (Unstable: ${proc.unstableRestarts})\n- **Status**: ${proc.status}\n- **Uptime**: ${proc.uptimeFormatted}`,
            priority: 'high',
            tags: ['warning', 'repeat'],
          });
        }
      }
    }

    // 3. High Resource Warning (CPU > 90% or RAM > 90%)
    if (systemMetrics.cpu.usagePercent > 90) {
      const alertKey = 'high-cpu-load';
      if (!isAlertOnCooldown(alertKey)) {
        markAlertSent(alertKey);
        await sendNtfyAlert({
          title: `🔥 [High CPU Load] ${systemMetrics.cpu.usagePercent}%`,
          message: `CPU utilization reached ${systemMetrics.cpu.usagePercent}% on host \`${systemMetrics.hostname}\`.\n- **Load Average**: ${systemMetrics.loadAverage.join(', ')}`,
          priority: 'high',
          tags: ['fire', 'chart_with_upwards_trend'],
        });
      }
    }
  } catch (error: any) {
    console.error('[Ops Daemon] Error during monitoring cycle:', error.message);
  }
}

export function startMonitoringDaemon(intervalMs: number = 60000): void {
  if (isRunning) return;
  isRunning = true;
  console.log(`[Ops Daemon] Starting background health watcher (Interval: ${intervalMs / 1000}s)`);

  // Run initial cycle immediately
  runMonitoringCycle();

  checkInterval = setInterval(() => {
    runMonitoringCycle();
  }, intervalMs);
}

export function stopMonitoringDaemon(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  isRunning = false;
  console.log('[Ops Daemon] Background health watcher stopped.');
}

// Auto-start if executed directly (e.g., node daemon.js)
if (require.main === module) {
  startMonitoringDaemon();
}
