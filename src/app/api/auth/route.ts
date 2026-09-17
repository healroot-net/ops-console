import { NextRequest, NextResponse } from 'next/server';
import { verifyPin, createAuthToken, isAuthorized, AUTH_COOKIE_NAME } from '@/lib/auth';

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

export async function GET(req: NextRequest) {
  const authed = isAuthorized(req);
  return NextResponse.json({ authenticated: authed });
}
