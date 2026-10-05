import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const document = await prisma.document.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
