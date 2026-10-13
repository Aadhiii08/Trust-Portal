import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'USER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, phone: true, photoUrl: true, email: true, studentId: true }
    });

    let siblings: any[] = [];
    if (user) {
      if (user.phone || user.email) {
        siblings = await prisma.user.findMany({
          where: {
            OR: [
              ...(user.phone ? [{ phone: user.phone }] : []),
              ...(user.email ? [{ email: user.email }] : [])
            ],
            id: { not: session.userId },
            role: 'USER'
          },
          select: { id: true, name: true, studentId: true }
        });
      }
    }

    return NextResponse.json({ profile, user, siblings }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'USER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Update User details if provided
    if (data.name !== undefined || data.phone !== undefined || data.photoUrl !== undefined || data.email !== undefined) {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
          ...(data.email !== undefined && { email: data.email === '' ? null : data.email }),
        },
      });
    }

    // Check existing profile to preserve declaration status once submitted
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      select: { isDeclared: true }
    });

    const finalIsDeclared = data.isDeclared === true ? true : (existingProfile?.isDeclared ?? false);

    const profile = await prisma.studentProfile.upsert({
      where: { userId: session.userId },
      update: {
        gender: data.gender,
        dob: data.dob ? new Date(data.dob) : undefined,
        aadharNumber: data.aadharNumber,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        durationOfStay: data.durationOfStay,
        permanentAddress: data.permanentAddress,
        schoolCollegeName: data.schoolCollegeName,
        schoolCollegeAddress: data.schoolCollegeAddress,
        currentCourse: data.currentCourse,
        department: data.department,
        universityBoard: data.universityBoard,
        academicYear: data.academicYear,
        semesterYear: data.semesterYear,
        mediumOfStudy: data.mediumOfStudy,
        previousMarks: data.previousMarks,
        tuitionFee: data.tuitionFee !== undefined && data.tuitionFee !== '' ? parseFloat(data.tuitionFee) : undefined,
        hostelFee: data.hostelFee !== undefined && data.hostelFee !== '' ? parseFloat(data.hostelFee) : undefined,
        otherFee: data.otherFee !== undefined && data.otherFee !== '' ? parseFloat(data.otherFee) : undefined,
        totalFee: data.totalFee !== undefined && data.totalFee !== '' ? parseFloat(data.totalFee) : undefined,
        totalAnnualFees: data.totalAnnualFees !== undefined && data.totalAnnualFees !== '' ? parseFloat(data.totalAnnualFees) : undefined,
        scholarshipReceived: data.scholarshipReceived !== undefined && data.scholarshipReceived !== '' ? parseFloat(data.scholarshipReceived) : undefined,
        balanceRequired: data.balanceRequired !== undefined && data.balanceRequired !== '' ? parseFloat(data.balanceRequired) : undefined,
        paidAmount: data.paidAmount !== undefined && data.paidAmount !== '' ? parseFloat(data.paidAmount) : undefined,
        balanceAmount: data.balanceAmount !== undefined && data.balanceAmount !== '' ? parseFloat(data.balanceAmount) : undefined,
        hasTerm2Fees: data.hasTerm2Fees !== undefined ? Boolean(data.hasTerm2Fees) : undefined,
        term2TuitionFee: data.term2TuitionFee !== undefined && data.term2TuitionFee !== '' ? parseFloat(data.term2TuitionFee) : undefined,
        term2HostelFee: data.term2HostelFee !== undefined && data.term2HostelFee !== '' ? parseFloat(data.term2HostelFee) : undefined,
        term2OtherFee: data.term2OtherFee !== undefined && data.term2OtherFee !== '' ? parseFloat(data.term2OtherFee) : undefined,
        term2TotalFee: data.term2TotalFee !== undefined && data.term2TotalFee !== '' ? parseFloat(data.term2TotalFee) : undefined,
        term2TotalAnnualFees: data.term2TotalAnnualFees !== undefined && data.term2TotalAnnualFees !== '' ? parseFloat(data.term2TotalAnnualFees) : undefined,
        term2ScholarshipReceived: data.term2ScholarshipReceived !== undefined && data.term2ScholarshipReceived !== '' ? parseFloat(data.term2ScholarshipReceived) : undefined,
        term2BalanceRequired: data.term2BalanceRequired !== undefined && data.term2BalanceRequired !== '' ? parseFloat(data.term2BalanceRequired) : undefined,
        term2PaidAmount: data.term2PaidAmount !== undefined && data.term2PaidAmount !== '' ? parseFloat(data.term2PaidAmount) : undefined,
        term2BalanceAmount: data.term2BalanceAmount !== undefined && data.term2BalanceAmount !== '' ? parseFloat(data.term2BalanceAmount) : undefined,
        fatherName: data.fatherName,
        fatherOccupation: data.fatherOccupation,
        fatherIncome: data.fatherIncome !== undefined && data.fatherIncome !== '' ? parseFloat(data.fatherIncome) : undefined,
        motherName: data.motherName,
        motherOccupation: data.motherOccupation,
        motherIncome: data.motherIncome !== undefined && data.motherIncome !== '' ? parseFloat(data.motherIncome) : undefined,
        familyType: data.familyType,
        houseType: data.houseType,
        religion: data.religion,
        caste: data.caste,
        category: data.category,
        medicalIssue: data.medicalIssue,
        singleParent: data.singleParent,
        orphanStatus: data.orphanStatus,
        existingLoan: data.existingLoan,
        loanAmount: data.loanAmount !== undefined && data.loanAmount !== '' ? parseFloat(data.loanAmount) : undefined,
        firstGraduate: data.firstGraduate,
        appliedThrough: data.appliedThrough,
        sourceType: data.sourceType,
        referenceName: data.referenceName,
        referenceDesignation: data.referenceDesignation,
        referenceContact: data.referenceContact,
        referenceOrg: data.referenceOrg,
        referenceRelation: data.referenceRelation,
        referenceMiplRelation: data.referenceMiplRelation,
        referenceAddress: data.referenceAddress,
        isDeclared: finalIsDeclared,
      },
      create: {
        userId: session.userId,
        gender: data.gender,
        dob: data.dob ? new Date(data.dob) : undefined,
        aadharNumber: data.aadharNumber,
        address: data.address,
        permanentAddress: data.permanentAddress,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        durationOfStay: data.durationOfStay,
        schoolCollegeName: data.schoolCollegeName,
        schoolCollegeAddress: data.schoolCollegeAddress,
        currentCourse: data.currentCourse,
        department: data.department,
        universityBoard: data.universityBoard,
        academicYear: data.academicYear,
        semesterYear: data.semesterYear,
        mediumOfStudy: data.mediumOfStudy,
        previousMarks: data.previousMarks,
        tuitionFee: data.tuitionFee !== undefined && data.tuitionFee !== '' ? parseFloat(data.tuitionFee) : undefined,
        hostelFee: data.hostelFee !== undefined && data.hostelFee !== '' ? parseFloat(data.hostelFee) : undefined,
        otherFee: data.otherFee !== undefined && data.otherFee !== '' ? parseFloat(data.otherFee) : undefined,
        totalFee: data.totalFee !== undefined && data.totalFee !== '' ? parseFloat(data.totalFee) : undefined,
        totalAnnualFees: data.totalAnnualFees !== undefined && data.totalAnnualFees !== '' ? parseFloat(data.totalAnnualFees) : undefined,
        scholarshipReceived: data.scholarshipReceived !== undefined && data.scholarshipReceived !== '' ? parseFloat(data.scholarshipReceived) : undefined,
        balanceRequired: data.balanceRequired !== undefined && data.balanceRequired !== '' ? parseFloat(data.balanceRequired) : undefined,
        paidAmount: data.paidAmount !== undefined && data.paidAmount !== '' ? parseFloat(data.paidAmount) : undefined,
        balanceAmount: data.balanceAmount !== undefined && data.balanceAmount !== '' ? parseFloat(data.balanceAmount) : undefined,
        hasTerm2Fees: data.hasTerm2Fees !== undefined ? Boolean(data.hasTerm2Fees) : undefined,
        term2TuitionFee: data.term2TuitionFee !== undefined && data.term2TuitionFee !== '' ? parseFloat(data.term2TuitionFee) : undefined,
        term2HostelFee: data.term2HostelFee !== undefined && data.term2HostelFee !== '' ? parseFloat(data.term2HostelFee) : undefined,
        term2OtherFee: data.term2OtherFee !== undefined && data.term2OtherFee !== '' ? parseFloat(data.term2OtherFee) : undefined,
        term2TotalFee: data.term2TotalFee !== undefined && data.term2TotalFee !== '' ? parseFloat(data.term2TotalFee) : undefined,
        term2TotalAnnualFees: data.term2TotalAnnualFees !== undefined && data.term2TotalAnnualFees !== '' ? parseFloat(data.term2TotalAnnualFees) : undefined,
        term2ScholarshipReceived: data.term2ScholarshipReceived !== undefined && data.term2ScholarshipReceived !== '' ? parseFloat(data.term2ScholarshipReceived) : undefined,
        term2BalanceRequired: data.term2BalanceRequired !== undefined && data.term2BalanceRequired !== '' ? parseFloat(data.term2BalanceRequired) : undefined,
        term2PaidAmount: data.term2PaidAmount !== undefined && data.term2PaidAmount !== '' ? parseFloat(data.term2PaidAmount) : undefined,
        term2BalanceAmount: data.term2BalanceAmount !== undefined && data.term2BalanceAmount !== '' ? parseFloat(data.term2BalanceAmount) : undefined,
        fatherName: data.fatherName,
        fatherOccupation: data.fatherOccupation,
        fatherIncome: data.fatherIncome !== undefined && data.fatherIncome !== '' ? parseFloat(data.fatherIncome) : undefined,
        motherName: data.motherName,
        motherOccupation: data.motherOccupation,
        motherIncome: data.motherIncome !== undefined && data.motherIncome !== '' ? parseFloat(data.motherIncome) : undefined,
        familyType: data.familyType,
        houseType: data.houseType,
        religion: data.religion,
        caste: data.caste,
        category: data.category,
        medicalIssue: data.medicalIssue,
        singleParent: data.singleParent,
        orphanStatus: data.orphanStatus,
        existingLoan: data.existingLoan,
        loanAmount: data.loanAmount !== undefined && data.loanAmount !== '' ? parseFloat(data.loanAmount) : undefined,
        firstGraduate: data.firstGraduate,
        appliedThrough: data.appliedThrough,
        sourceType: data.sourceType,
        referenceName: data.referenceName,
        referenceDesignation: data.referenceDesignation,
        referenceContact: data.referenceContact,
        referenceOrg: data.referenceOrg,
        referenceRelation: data.referenceRelation,
        referenceMiplRelation: data.referenceMiplRelation,
        referenceAddress: data.referenceAddress,
        isDeclared: Boolean(data.isDeclared),
      },
    });

    return NextResponse.json({ success: true, profile }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
