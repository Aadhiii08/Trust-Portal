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

    const { userId, amountSponsored, amountPaid, sponsorStatus } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (amountSponsored !== undefined) dataToUpdate.amountSponsored = parseFloat(amountSponsored);
    if (amountPaid !== undefined) dataToUpdate.amountPaid = parseFloat(amountPaid);
    if (sponsorStatus !== undefined) dataToUpdate.sponsorStatus = sponsorStatus;

    const profile = await prisma.studentProfile.update({
      where: { userId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Fund update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
