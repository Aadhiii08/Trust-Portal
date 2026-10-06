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

    const { id, ids, studentId, status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: ids } },
        data: { status },
      });
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (studentId) {
      await prisma.document.updateMany({
        where: { studentId },
        data: { status },
      });
      return NextResponse.json({ success: true, studentId });
    }

    if (id) {
      const document = await prisma.document.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ success: true, document });
    }

    return NextResponse.json({ error: 'Missing id, ids, or studentId' }, { status: 400 });
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
