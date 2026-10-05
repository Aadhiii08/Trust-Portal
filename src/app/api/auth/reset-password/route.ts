import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { emailOrPhone, newPassword } = await request.json();

    if (!emailOrPhone || !newPassword) {
      return NextResponse.json({ error: 'Email/Phone and new password are required' }, { status: 400 });
    }

    const isEmail = emailOrPhone.includes('@');
    
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: emailOrPhone } : { phone: emailOrPhone },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Updating with plaintext to match existing login/register logic
    await prisma.user.updateMany({
      where: isEmail ? { email: emailOrPhone } : { phone: emailOrPhone },
      data: { passwordHash: newPassword },
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
