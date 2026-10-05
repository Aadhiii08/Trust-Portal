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

    const { targetUserId } = await request.json();
    if (!targetUserId) return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    // Validate they are siblings (same phone or same email, depending on what they used)
    const isSibling = (currentUser.phone && targetUser.phone && currentUser.phone === targetUser.phone) ||
                      (currentUser.email && targetUser.email && currentUser.email === targetUser.email);
                      
    if (!isSibling) {
      return NextResponse.json({ error: 'Unauthorized to switch to this account' }, { status: 403 });
    }

    // Switch session
    const newSessionData = { userId: targetUser.id, role: targetUser.role };
    const newSessionToken = await encrypt(newSessionData);

    const response = NextResponse.json({ success: true, studentName: targetUser.name });

    response.cookies.set('session', newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error) {
    console.error('Switch child error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
