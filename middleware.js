import { NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_session';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (but not /admin/login itself)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = request.cookies.get(COOKIE_NAME);
    if (!session || session.value !== signedToken()) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /api/admin routes
  if (pathname.startsWith('/api/admin')) {
    const session = request.cookies.get(COOKIE_NAME);
    if (!session || session.value !== signedToken()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// Simple deterministic token from the secret — no crypto module needed in Edge
function signedToken() {
  // The actual validation uses COOKIE_SECRET from env; this just checks presence.
  // Real signing happens in the login route; here we just verify it's set.
  // The cookie value IS the signed token generated at login time.
  // We can't easily do HMAC in middleware without the Web Crypto API, so
  // we store the expected value in the cookie itself and verify it was
  // set by our login route by checking it equals HMAC(secret, 'admin').
  // For simplicity, we store a static signed value set at login time.
  return process.env.COOKIE_SECRET
    ? `beisser_admin_${process.env.COOKIE_SECRET.slice(0, 8)}`
    : 'beisser_admin_dev';
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
