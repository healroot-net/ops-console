import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface MonitoredTarget {
  id: string;
  name: string;
  type: 'internal_port' | 'public_domain';
  url: string;
  description?: string;
  timeoutMs?: number;
  expectedStatus?: number;
}

export interface OpsConfig {
  port: number;
  pin: string;
  secret: string;
  allowLocalOnly: boolean;
  requireAuth: boolean;
  ntfy: {
    enabled: boolean;
    server: string;
    topic: string;
    dashboardUrl?: string;
  };
  targets: MonitoredTarget[];
}

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.ops');
const CONFIG_FILE_PATH = process.env.OPS_CONFIG_PATH || path.join(DEFAULT_CONFIG_DIR, 'config.json');

function generateRandomSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getDefaultConfig(): OpsConfig {
  return {
    port: 3000,
    pin: process.env.OPS_PIN || '8888',
    secret: process.env.OPS_SECRET || generateRandomSecret(),
    allowLocalOnly: false,
    requireAuth: true,
    ntfy: {
      enabled: true,
      server: process.env.NTFY_SERVER || 'https://ntfy.sh',
      topic: process.env.NTFY_TOPIC || `ops-${crypto.randomBytes(4).toString('hex')}`,
      dashboardUrl: process.env.OPS_DASHBOARD_URL || 'http://localhost:3000',
    },
    targets: [
      {
        id: 'tgt-local-app',
        name: 'Local Web Service',
        type: 'internal_port',
        url: 'http://127.0.0.1:3000',
        description: 'Default internal web target',
        timeoutMs: 5000,
      },
    ],
  };
}

export function loadOpsConfig(): OpsConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const initial = getDefaultConfig();
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }

    const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    const merged: OpsConfig = {
      ...getDefaultConfig(),
      ...parsed,
      requireAuth: typeof parsed.requireAuth === 'boolean' ? parsed.requireAuth : true,
      ntfy: {
        ...getDefaultConfig().ntfy,
        ...(parsed.ntfy || {}),
      },
      targets: Array.isArray(parsed.targets) ? parsed.targets : getDefaultConfig().targets,
    };

    return merged;
  } catch (error) {
    console.error('Failed to load ops config, using defaults:', error);
    return getDefaultConfig();
  }
}

export function saveOpsConfig(newConfig: OpsConfig): boolean {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save ops config:', error);
    return false;
  }
}

export function updatePin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 4) return false;
  const config = loadOpsConfig();
  config.pin = newPin.trim();
  return saveOpsConfig(config);
}

export function isDefaultPin(): boolean {
  const config = loadOpsConfig();
  return config.pin === '8888';
}

export function addMonitoredTarget(target: Omit<MonitoredTarget, 'id'>): MonitoredTarget {
  const config = loadOpsConfig();
  const id = `tgt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newTarget: MonitoredTarget = {
    ...target,
    id,
  };
  config.targets.push(newTarget);
  saveOpsConfig(config);
  return newTarget;
}

export function removeMonitoredTarget(id: string): boolean {
  const config = loadOpsConfig();
  const initialLen = config.targets.length;
  config.targets = config.targets.filter((t) => t.id !== id);
  if (config.targets.length !== initialLen) {
    saveOpsConfig(config);
    return true;
  }
  return false;
}
