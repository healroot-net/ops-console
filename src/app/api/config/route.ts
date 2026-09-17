import { NextRequest, NextResponse } from 'next/server';
import { loadOpsConfig, saveOpsConfig, addMonitoredTarget, removeMonitoredTarget } from '@/lib/config';
import { isAuthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const config = loadOpsConfig();
    return NextResponse.json({
      success: true,
      data: {
        port: config.port,
        ntfy: config.ntfy,
        targets: config.targets,
        allowLocalOnly: config.allowLocalOnly,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, url, type, timeoutMs, description } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Name and URL are required.' },
        { status: 400 }
      );
    }

    const created = addMonitoredTarget({
      name,
      url,
      type: type || (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') ? 'internal_port' : 'public_domain'),
      timeoutMs: timeoutMs ? parseInt(timeoutMs, 10) : 5000,
      description: description || '',
    });

    return NextResponse.json({ success: true, target: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Target ID is required.' }, { status: 400 });
    }

    const removed = removeMonitoredTarget(id);
    return NextResponse.json({ success: removed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const config = loadOpsConfig();

    if (body.ntfy) {
      config.ntfy = {
        ...config.ntfy,
        ...body.ntfy,
      };
    }

    if (body.pin && body.pin.trim().length >= 4) {
      config.pin = body.pin.trim();
    }

    saveOpsConfig(config);
    return NextResponse.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
