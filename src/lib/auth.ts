import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { loadOpsConfig } from './config';

const AUTH_COOKIE_NAME = 'ops_auth_token';

export function getAuthSecret(): string {
  const cfg = loadOpsConfig();
  return cfg.secret;
}

export function verifyPin(inputPin: string): boolean {
  if (!inputPin) return false;
  const cfg = loadOpsConfig();
  return inputPin === cfg.pin;
}

export function createAuthToken(): string {
  const secret = getAuthSecret();
  const timestamp = Date.now();
  const payload = `ops-auth:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

export function verifyAuthToken(token: string): boolean {
  if (!token) return false;
  try {
    const [b64Payload, signature] = token.split('.');
    if (!b64Payload || !signature) return false;

    const payload = Buffer.from(b64Payload, 'base64').toString('utf-8');
    const secret = getAuthSecret();
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return false;
    }

    // Expiry check: 30 days
    const parts = payload.split(':');
    if (parts[0] !== 'ops-auth' || !parts[1]) return false;
    const timestamp = parseInt(parts[1], 10);
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < maxAge;
  } catch {
    return false;
  }
}

export function isAuthorized(req: NextRequest): boolean {
  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (verifyAuthToken(token)) return true;
  }

  // 2. Check Cookie
  const cookie = req.cookies.get(AUTH_COOKIE_NAME);
  if (cookie && cookie.value && verifyAuthToken(cookie.value)) {
    return true;
  }

  return false;
}

export { AUTH_COOKIE_NAME };
