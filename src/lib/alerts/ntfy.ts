import { loadOpsConfig } from '../config';

export type AlertPriority = 'urgent' | 'high' | 'default' | 'low' | 'min';

export interface NtfyAlertOptions {
  title: string;
  message: string;
  priority?: AlertPriority;
  tags?: string[];
  clickUrl?: string;
  topic?: string;
  actions?: Array<{
    action: 'view' | 'http' | 'broadcast';
    label: string;
    url: string;
  }>;
}

// In-memory alert cooldown cache (Key -> timestamp ms)
const cooldownMap = new Map<string, number>();
const COOLDOWN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function isAlertOnCooldown(alertKey: string): boolean {
  const lastSent = cooldownMap.get(alertKey);
  if (!lastSent) return false;
  return Date.now() - lastSent < COOLDOWN_WINDOW_MS;
}

export function markAlertSent(alertKey: string): void {
  cooldownMap.set(alertKey, Date.now());
}

export function clearAlertCooldown(alertKey: string): void {
  cooldownMap.delete(alertKey);
}

const PRIORITY_MAP: Record<AlertPriority, number> = {
  urgent: 5,
  high: 4,
  default: 3,
  low: 2,
  min: 1,
};

export async function sendNtfyAlert(options: NtfyAlertOptions): Promise<{ success: boolean; message: string }> {
  const config = loadOpsConfig();

  if (!config.ntfy.enabled) {
    return { success: false, message: 'ntfy alerting is disabled in config.' };
  }

  const topic = options.topic || config.ntfy.topic;
  const server = config.ntfy.server || 'https://ntfy.sh';
  const priority = options.priority || 'default';
  const dashboardUrl = options.clickUrl || config.ntfy.dashboardUrl || 'http://localhost:9999';

  if (!topic) {
    return { success: false, message: 'No ntfy topic specified.' };
  }

  const url = `${server.replace(/\/$/, '')}/${topic}`;
  const encodedTitle = `=?utf-8?B?${Buffer.from(options.title, 'utf-8').toString('base64')}?=`;

  const headers: Record<string, string> = {
    'Title': encodedTitle,
    'Priority': String(PRIORITY_MAP[priority] || 3),
    'Content-Type': 'text/markdown; charset=utf-8',
  };

  if (options.tags && options.tags.length > 0) {
    headers['Tags'] = options.tags.join(',');
  }

  headers['Click'] = dashboardUrl;

  const actions = options.actions || [
    {
      action: 'view',
      label: 'Open Dashboard',
      url: dashboardUrl,
    },
  ];

  if (actions.length > 0) {
    headers['Actions'] = actions
      .map((a) => `${a.action}, ${a.label}, ${a.url}`)
      .join('; ');
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: options.message,
    });

    if (res.ok) {
      return { success: true, message: `Notification dispatched to ntfy (${topic})` };
    } else {
      const errText = await res.text();
      return { success: false, message: `ntfy returned status ${res.status}: ${errText}` };
    }
  } catch (error: any) {
    return { success: false, message: `Failed to connect to ntfy server: ${error.message}` };
  }
}
