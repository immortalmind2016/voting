import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'admin_session';

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// A token an attacker cannot forge without knowing ADMIN_PASSWORD.
export function makeAdminToken() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error('Missing ADMIN_PASSWORD environment variable');
  return crypto.createHmac('sha256', pw).update('admin-ok').digest('hex');
}

export function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function isAdmin() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    return safeEqual(token, makeAdminToken());
  } catch {
    return false;
  }
}
