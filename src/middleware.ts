import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/auth';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const payload = await decrypt(session);
      // Basic role-based routing
      if (pathname.startsWith('/dashboard/admin') && payload.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard/user', request.url));
      }
      if (pathname.startsWith('/dashboard/user') && payload.role !== 'USER') {
        return NextResponse.redirect(new URL('/dashboard/admin', request.url));
      }
      if (pathname.startsWith('/dashboard/superadmin') && payload.role !== 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (e) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
