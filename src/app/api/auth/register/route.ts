import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, phone, password, role = 'USER' } = await request.json();

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone required' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    let studentId = null;
    if (role === 'USER') {
      const count = await prisma.user.count({ where: { role: 'USER' } });
      let nextId = count + 1;
      studentId = nextId.toString().padStart(3, '0');
      
      let isUnique = false;
      while (!isUnique) {
        const check = await prisma.user.findUnique({ where: { studentId } });
        if (!check) {
          isUnique = true;
        } else {
          nextId++;
          studentId = nextId.toString().padStart(3, '0');
        }
      }
    }

    const user = await prisma.user.create({
      data: {
        studentId,
        email: email || null,
        phone: phone || null,
        passwordHash: password, // In production, hash this
        role: role,
      },
    });

    // Create session
    const sessionData = { userId: user.id, role: user.role };
    const sessionToken = await encrypt(sessionData);

    const response = NextResponse.json({ success: true, role: user.role, studentId: user.studentId });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
