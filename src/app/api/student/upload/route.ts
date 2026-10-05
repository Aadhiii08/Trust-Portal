import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { studentId: session.userId },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file || !documentType) {
      return NextResponse.json({ error: 'File and documentType are required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert file to Base64 to support Vercel serverless environment
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const fileUrl = `data:${mimeType};base64,${base64Data}`;

    // Check if document already exists
    const existingDoc = await prisma.document.findFirst({
      where: {
        studentId: session.userId,
        documentType: documentType
      }
    });

    let document;
    if (existingDoc) {
      document = await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl,
          originalName: file.name,
          status: 'PENDING',
        }
      });
    } else {
      document = await prisma.document.create({
        data: {
          studentId: session.userId,
          documentType,
          fileUrl,
          originalName: file.name,
          status: 'PENDING',
        },
      });
    }

    // Special case: If it's a photo, update the user profile photoUrl
    if (documentType === 'PASSPORT_PHOTO' || documentType === 'ADMIN_PROFILE') {
      await prisma.user.update({
        where: { id: session.userId },
        data: { photoUrl: fileUrl },
      });
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.studentId !== session.userId) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
