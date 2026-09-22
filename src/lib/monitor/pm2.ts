import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export interface PM2Process {
  id: number;
  name: string;
  namespace: string;
  version: string;
  mode: string;
  pid: number;
  uptime: number;
  uptimeFormatted: string;
  restarts: number;
  unstableRestarts: number;
  status: 'online' | 'stopped' | 'errored' | 'launching' | 'stopping' | 'unknown';
  cpu: number;
  memory: number;
  memoryMB: number;
  user: string;
  watching: boolean;
  execPath: string;
  logOutPath: string;
  logErrPath: string;
  isFlapping?: boolean;
}

const SYSTEM_PATH = 'export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:~/.nvm/versions/node/$(ls ~/.nvm/versions/node 2>/dev/null | tail -n 1)/bin;';

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / (3600 * 24));
  const h = Math.floor((sec % (3600 * 24)) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export async function getPM2Processes(): Promise<PM2Process[]> {
  try {
    const { stdout } = await execAsync(`${SYSTEM_PATH} pm2 jlist`, {
      timeout: 5000,
    });

    const parsed = JSON.parse(stdout.trim() || '[]');
    const now = Date.now();
    const currentUser = os.userInfo().username;

    return parsed.map((proc: any): PM2Process => {
      const pm2Env = proc.pm2_env || {};
      const moniker = proc.monit || {};

      const uptimeMs = pm2Env.pm_uptime ? Math.max(0, now - pm2Env.pm_uptime) : 0;
      const restarts = pm2Env.restart_time || 0;
      const unstableRestarts = pm2Env.unstable_restarts || 0;
      const status = pm2Env.status || 'unknown';

      // Flapping condition: status errored OR unstable_restarts >= 5 OR (frequent crash loop)
      const isFlapping =
        status === 'errored' ||
        unstableRestarts >= 5 ||
        (restarts > 10 && uptimeMs < 1000 * 60 * 5 && status === 'online');

      const memBytes = moniker.memory || 0;

      return {
        id: proc.pm_id,
        name: proc.name,
        namespace: pm2Env.namespace || 'default',
        version: pm2Env.version || 'N/A',
        mode: pm2Env.exec_mode || 'fork',
        pid: proc.pid || 0,
        uptime: uptimeMs,
        uptimeFormatted: status === 'online' ? formatDuration(uptimeMs) : 'stopped',
        restarts,
        unstableRestarts,
        status,
        cpu: Math.round((moniker.cpu || 0) * 10) / 10,
        memory: memBytes,
        memoryMB: Math.round((memBytes / (1024 * 1024)) * 10) / 10,
        user: pm2Env.username || currentUser,
        watching: pm2Env.watch || false,
        execPath: pm2Env.pm_exec_path || '',
        logOutPath: pm2Env.pm_out_log_path || '',
        logErrPath: pm2Env.pm_err_log_path || '',
        isFlapping,
      };
    });
  } catch (error: any) {
    return [];
  }
}

export async function executePM2Action(
  target: string | number,
  action: 'restart' | 'stop' | 'start' | 'reload' | 'delete' | 'reset' | 'flush'
): Promise<{ success: boolean; message: string }> {
  try {
    const validActions = ['restart', 'stop', 'start', 'reload', 'delete', 'reset', 'flush'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid PM2 action: ${action}`);
    }

    const command = action === 'flush' && target === 'all'
      ? `${SYSTEM_PATH} pm2 flush`
      : `${SYSTEM_PATH} pm2 ${action} ${target}`;

    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    return {
      success: true,
      message: stdout || stderr || `Successfully executed pm2 ${action} on ${target}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.stderr || error.message || `Failed to execute pm2 ${action}`,
    };
  }
}
