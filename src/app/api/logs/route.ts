import { NextRequest, NextResponse } from 'next/server';
import { readRecentLogs } from '@/lib/monitor/logWatcher';
import { isAuthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const processName = searchParams.get('process');
  const lines = parseInt(searchParams.get('lines') || '50', 10);

  if (!processName) {
    return NextResponse.json(
      { success: false, error: 'Process name is required.' },
      { status: 400 }
    );
  }

  try {
    const logs = await readRecentLogs(processName, lines);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to read logs' },
      { status: 500 }
    );
  }
}
