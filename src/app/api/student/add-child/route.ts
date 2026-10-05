import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const sessionData = await decrypt(sessionCookie);
    if (!sessionData?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const currentUser = await prisma.user.findUnique({ where: { id: sessionData.userId } });
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Generate new student ID
    const count = await prisma.user.count({ where: { role: 'USER' } });
    let nextId = count + 1;
    let studentId = nextId.toString().padStart(3, '0');
    
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

    // Create the new child account
    const newChild = await prisma.user.create({
      data: {
        studentId,
        email: currentUser.email,
        phone: currentUser.phone,
        passwordHash: currentUser.passwordHash,
        role: 'USER',
      },
    });

    // We do NOT immediately switch the session here, we just return success.
    // The frontend can call switch-child after this.
    return NextResponse.json({ success: true, newUserId: newChild.id });
  } catch (error) {
    console.error('Add child error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
