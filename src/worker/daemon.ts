import { checkAllHealth } from '../lib/monitor/health';
import { getPM2Processes } from '../lib/monitor/pm2';
import { getSystemMetrics } from '../lib/monitor/system';
import { sendNtfyAlert, isAlertOnCooldown, markAlertSent, clearAlertCooldown } from '../lib/alerts/ntfy';
import { loadOpsConfig } from '../lib/config';

let isRunning = false;
let checkInterval: NodeJS.Timeout | null = null;
const consecutiveFailures = new Map<string, number>();

export async function runMonitoringCycle(): Promise<void> {
  try {
    const config = loadOpsConfig();
    const [healthResults, pm2Processes, systemMetrics] = await Promise.all([
      checkAllHealth(),
      getPM2Processes(),
      getSystemMetrics(),
    ]);

    // 1. Check HTTP Targets Down & Recovery
    for (const res of healthResults) {
      const alertKey = `target-down-${res.id}`;
      if (res.status === 'down') {
        const failures = (consecutiveFailures.get(res.id) || 0) + 1;
        consecutiveFailures.set(res.id, failures);

        // Alert only if confirmed down across 3 cycles (prevent transient spike false positives)
        if (failures >= 3 && !isAlertOnCooldown(alertKey)) {
          markAlertSent(alertKey);
          await sendNtfyAlert({
            title: `🚨 [Service Down] ${res.name}`,
            message: `**Service Alert**: ${res.name} (${res.url}) is unreachable.
- **Error**: ${res.errorMessage || 'Unknown failure'}
- **Latency**: ${res.latencyMs}ms
- **Consecutive Failures**: ${failures} cycles confirmed`,
            priority: 'urgent',
            tags: ['rotating_light', 'warning', 'server'],
          });
        }
      } else {
        // If recovered from persistent down state (>= 3 failures), send recovery notification
        const prevFailures = consecutiveFailures.get(res.id) || 0;
        if (prevFailures >= 3) {
          await sendNtfyAlert({
            title: `✅ [Service Restored] ${res.name}`,
            message: `**Service Restored**: ${res.name} (${res.url}) is now back online.
- **Status Code**: \`${res.httpStatus || 200}\`
- **Latency**: ${res.latencyMs}ms`,
            priority: 'default',
            tags: ['white_check_mark', 'shield'],
          });
          clearAlertCooldown(alertKey);
        }
        consecutiveFailures.delete(res.id);
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
            message: `**PM2 Alert**: Process \`${proc.name}\` (PID ${proc.pid}) is in errored/flapping state.
- **Restarts**: ${proc.restarts} (Unstable: ${proc.unstableRestarts})
- **Status**: ${proc.status}
- **Uptime**: ${proc.uptimeFormatted}`,
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
          message: `CPU utilization reached ${systemMetrics.cpu.usagePercent}% on host \`${systemMetrics.hostname}\`.
- **Load Average**: ${systemMetrics.loadAverage.join(', ')}`,
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
