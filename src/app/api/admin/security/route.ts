import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password } = await request.json();

    if (!email && !password) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.passwordHash = password; // In a real app, hash this!

    await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'Security settings updated successfully' });
  } catch (error) {
    console.error('Security update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
