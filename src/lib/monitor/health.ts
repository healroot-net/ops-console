import { loadOpsConfig, MonitoredTarget } from '../config';

export interface HealthCheckResult {
  id: string;
  name: string;
  type: 'internal_port' | 'public_domain';
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  httpStatus?: number;
  latencyMs: number;
  checkedAt: number;
  errorMessage?: string;
  retryCount?: number;
}

async function executeProbe(
  target: MonitoredTarget,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; latency: number; error?: any }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(target.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Ops-Console-HealthChecker/1.0',
      },
    });

    clearTimeout(timeoutId);
    if (res.body) {
      try {
        await res.body.cancel();
      } catch {}
    }

    return { ok: true, status: res.status, latency: Date.now() - start };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return { ok: false, status: 0, latency: Date.now() - start, error };
  }
}

export async function checkSingleHealth(
  target: MonitoredTarget,
  maxRetries: number = 1
): Promise<HealthCheckResult> {
  const defaultTimeout = target.type === 'public_domain' ? 15000 : 4000;
  const timeoutMs = target.timeoutMs || defaultTimeout;

  let attempt = 0;
  let lastResult = await executeProbe(target, timeoutMs);

  // If initial probe fails, retry once after 1s
  while (!lastResult.ok && attempt < maxRetries) {
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    lastResult = await executeProbe(target, timeoutMs);
  }

  const checkedAt = Date.now();

  if (lastResult.ok) {
    const expected = target.expectedStatus;
    const isExpected = expected ? lastResult.status === expected : (lastResult.status >= 200 && lastResult.status < 400);
    const latencyThreshold = target.type === 'public_domain' ? 7000 : 2000;
    const isDegraded = !isExpected || lastResult.latency > latencyThreshold;

    return {
      id: target.id,
      name: target.name,
      type: target.type,
      url: target.url,
      status: isExpected ? (isDegraded ? 'degraded' : 'healthy') : 'down',
      httpStatus: lastResult.status,
      latencyMs: lastResult.latency,
      checkedAt,
      retryCount: attempt,
    };
  } else {
    const error = lastResult.error;
    const isAbort = error?.name === 'AbortError';
    const timeoutSec = timeoutMs / 1000;

    return {
      id: target.id,
      name: target.name,
      type: target.type,
      url: target.url,
      status: 'down',
      latencyMs: lastResult.latency,
      checkedAt,
      retryCount: attempt,
      errorMessage: isAbort
        ? `Connection timeout (${timeoutSec}s)`
        : (error?.message || 'Connection refused'),
    };
  }
}

export async function checkAllHealth(customTargets?: MonitoredTarget[]): Promise<HealthCheckResult[]> {
  const targets = customTargets || loadOpsConfig().targets;
  if (!targets || targets.length === 0) return [];
  const results = await Promise.all(targets.map((target) => checkSingleHealth(target)));
  return results;
}
