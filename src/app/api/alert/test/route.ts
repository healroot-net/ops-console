import { NextRequest, NextResponse } from 'next/server';
import { sendNtfyAlert } from '@/lib/alerts/ntfy';
import { isAuthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const customMessage = body.message || 'This is a test alert from Ops Console. ntfy integration is working properly.';

    const result = await sendNtfyAlert({
      title: '🧪 Ops Console Test Notification',
      message: `${customMessage}\n- Timestamp: ${new Date().toISOString()}`,
      priority: 'default',
      tags: ['test_tube', 'white_check_mark'],
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to trigger test alert' },
      { status: 500 }
    );
  }
}
