import { NextResponse } from 'next/server';
import { getSystemMetrics } from '@/lib/monitor/system';
import { getPM2Processes } from '@/lib/monitor/pm2';
import { checkAllHealth } from '@/lib/monitor/health';
import { loadOpsConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = loadOpsConfig();
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
