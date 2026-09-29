import { NextRequest, NextResponse } from 'next/server';
import { verifyPin, createAuthToken, isAuthorized, AUTH_COOKIE_NAME } from '@/lib/auth';
import { loadOpsConfig, updatePin, isDefaultPin } from '@/lib/config';

export async function GET(req: NextRequest) {
  const config = loadOpsConfig();
  const authed = isAuthorized(req);
  return NextResponse.json({
    authenticated: authed,
    requireAuth: config.requireAuth,
    isDefaultPin: isDefaultPin(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || !verifyPin(pin)) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN code.' },
        { status: 401 }
      );
    }

    const token = createAuthToken();
    const response = NextResponse.json({
      success: true,
      token,
      isDefaultPin: isDefaultPin(),
      message: 'Authentication successful.',
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authed = isAuthorized(req);
    const { currentPin, newPin } = await req.json();

    if (!authed) {
      if (!currentPin || !verifyPin(currentPin)) {
        return NextResponse.json(
          { success: false, error: 'Current PIN is incorrect.' },
          { status: 401 }
        );
      }
    }

    if (!newPin || typeof newPin !== 'string' || newPin.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: 'New PIN must be at least 4 characters.' },
        { status: 400 }
      );
    }

    const success = updatePin(newPin.trim());
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update PIN.' },
        { status: 500 }
      );
    }

    const token = createAuthToken();
    const response = NextResponse.json({
      success: true,
      message: 'PIN successfully changed.',
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to change PIN' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Console locked.' });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
