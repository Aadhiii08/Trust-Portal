import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total users (role = USER) who have submitted their declaration
    const totalStudents = await prisma.user.count({
      where: { 
        role: 'USER',
        profile: {
          isDeclared: true
        }
      }
    });

    // Get all students with their profiles and documents
    const students = await prisma.user.findMany({
      where: { 
        role: 'USER',
        profile: {
          isDeclared: true
        }
      },
      include: {
        profile: true,
        documents: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate total amount sponsored
    const totalAmountSpent = students.reduce((sum, student) => {
      return sum + (student.profile?.amountSponsored || 0);
    }, 0);

    return NextResponse.json({ 
      totalStudents,
      totalAmountSpent,
      students
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
