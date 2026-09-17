import { NextRequest, NextResponse } from 'next/server';
import { executePM2Action } from '@/lib/monitor/pm2';
import { isAuthorized } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. PIN verification required.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { target, action } = body;

    if (target === undefined || !action) {
      return NextResponse.json(
        { success: false, error: 'Target process and action are required.' },
        { status: 400 }
      );
    }

    const result = await executePM2Action(target, action);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'PM2 execution failed' },
      { status: 500 }
    );
  }
}
