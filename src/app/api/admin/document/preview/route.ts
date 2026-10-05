import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Missing id', { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document || !document.fileUrl) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // Extract base64 part
    const base64Data = document.fileUrl.split(',')[1];
    if (!base64Data) {
        return new NextResponse('Invalid document format', { status: 400 });
    }
    
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Document preview error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
