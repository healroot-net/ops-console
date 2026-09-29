import { NextRequest, NextResponse } from 'next/server';
import { getSystemMetrics } from '@/lib/monitor/system';
import { getPM2Processes } from '@/lib/monitor/pm2';
import { checkAllHealth } from '@/lib/monitor/health';
import { loadOpsConfig } from '@/lib/config';
import { isAuthorized } from '@/lib/auth';
import { startMonitoringDaemon } from '@/worker/daemon';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const config = loadOpsConfig();

    if (config.requireAuth && !isAuthorized(req)) {
      return NextResponse.json(
        { success: false, requireAuth: true, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // Auto-start background monitoring daemon
    try {
      startMonitoringDaemon(30000);
    } catch {}

    const [system, pm2, services] = await Promise.all([
      getSystemMetrics(),
      getPM2Processes(),
      checkAllHealth(config.targets),
    ]);

    const topic = config.ntfy.topic;
    const maskedTopic = topic.length > 5 ? `${topic.slice(0, 3)}***` : topic;

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      data: {
        system,
        pm2,
        services,
        ntfy: {
          enabled: config.ntfy.enabled,
          server: config.ntfy.server,
          topic: maskedTopic,
        },
      },
    });
  } catch (error: any) {
    console.error('API /api/metrics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
