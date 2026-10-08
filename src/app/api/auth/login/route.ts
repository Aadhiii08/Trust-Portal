import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { emailOrPhone, password, expectedRole } = await request.json();
    const rawIdentifier = typeof emailOrPhone === 'string' ? emailOrPhone.trim() : '';
    const digitsOnly = rawIdentifier.replace(/\s+/g, '');

    // Auto-seed admin if no admin exists
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount === 0 && rawIdentifier === 'admin@trust.com' && password === 'admin123') {
      await prisma.user.create({
        data: {
          email: 'admin@trust.com',
          passwordHash: 'admin123', // In a real app, hash this!
          role: 'ADMIN',
        },
      });
    }

    // Auto-seed superadmin if no superadmin exists
    const superadminCount = await prisma.user.count({ where: { role: 'SUPERADMIN' } });
    if (superadminCount === 0 && rawIdentifier === 'superadmin@trust.com' && password === 'superadmin123') {
      await prisma.user.create({
        data: {
          email: 'superadmin@trust.com',
          passwordHash: 'superadmin123',
          role: 'SUPERADMIN',
        },
      });
    }

    // Find user by email, phone, or studentId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rawIdentifier },
          { phone: rawIdentifier },
          ...(digitsOnly ? [{ phone: digitsOnly }] : []),
          { studentId: rawIdentifier }
        ]
      }
    });

    // Extremely simple password check (plaintext for this simple local free app)
    if (!user || user.passwordHash !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (expectedRole && user.role !== expectedRole) {
      let roleName = 'Student';
      if (user.role === 'ADMIN') roleName = 'Admin';
      if (user.role === 'SUPERADMIN') roleName = 'Super Admin';
      return NextResponse.json({ 
        error: `Please use the ${roleName} login page.` 
      }, { status: 403 });
    }

    // Create session
    const sessionData = { userId: user.id, role: user.role };
    const sessionToken = await encrypt(sessionData);

    const response = NextResponse.json({ success: true, role: user.role });

    // Set cookie using response (safer in Route Handlers)
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
