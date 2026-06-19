import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

const PUBLIC_PATHS = ['/login', '/api/v1/auth/login'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.next();
  const token = request.cookies.get('nams_token')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  const decoded = verifyToken(token);
  if (!decoded) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('nams_token', '', { maxAge: 0, path: '/' });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
