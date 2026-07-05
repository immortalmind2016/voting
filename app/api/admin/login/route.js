import { NextResponse } from 'next/server';
import { checkPassword, makeAdminToken, ADMIN_COOKIE } from '@/lib/auth';

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
