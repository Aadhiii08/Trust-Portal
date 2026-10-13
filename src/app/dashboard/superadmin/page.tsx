/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const PdfViewer = ({ base64 }: { base64: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const renderPdf = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) return;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        const raw = atob(base64.split(',')[1]);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          uint8Array[i] = raw.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        
        const container = containerRef.current;
        if (!container || !isMounted) return;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.style.marginBottom = '1rem';
          canvas.style.borderRadius = '8px';
          canvas.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          
          container.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (e) {
        console.error('Error rendering PDF:', e);
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div style="color: #64748b; padding: 2rem;">Preview not available. Please click Download above to view the file.</div>';
        }
      }
    };

    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = renderPdf;
      document.body.appendChild(script);
    } else {
      renderPdf();
    }
    
    return () => { isMounted = false; };
  }, [base64]);

  return <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem', background: '#f1f5f9', borderRadius: '8px', overflow: 'auto' }}><div style={{ color: '#64748b' }}>Loading PDF pages...</div></div>;
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docFilter, setDocFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED'>('ALL');
  const [selectedDocs, setSelectedDocs] = useState<{ [docId: string]: boolean }>({});
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  // Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Security Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const timestamp = Date.now();
      const [userRes, dashRes] = await Promise.all([
        fetch(`/api/user/profile?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/dashboard?t=${timestamp}`, { cache: 'no-store' })
      ]);

      if (userRes.ok) {
        const uData = await userRes.json();
        if (uData.user) {
          setAdminProfile(uData.user);
          setName(uData.user.name || '');
          setPhone(uData.user.phone || '');
          setPhotoUrl(uData.user.photoUrl || '');
          setAdminEmail(uData.user.email || '');
        }
      }

      if (dashRes.ok) {
        const dData = await dashRes.json();
        setDashboardData(dData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, photoUrl }),
      });
      if (res.ok) {
        alert('Profile updated successfully');
        fetchData();
      } else {
        alert('Failed to update profile');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityLoading(true);
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: newPassword }),
      });
      if (res.ok) {
        alert('Security settings updated successfully. Please use the new credentials next time.');
        setNewPassword('');
        fetchData();
      } else {
        alert('Failed to update security settings');
      }
    } finally {
      setSecurityLoading(false);
    }
  };

  const [photoUploading, setPhotoUploading] = useState(false);

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', 'ADMIN_PROFILE');
    try {
      const res = await fetch('/api/student/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        const newPhotoUrl = data.document.fileUrl;
        setPhotoUrl(newPhotoUrl);
        
        // Update local adminProfile state for header without a full refresh
        setAdminProfile((prev: any) => ({ ...prev, photoUrl: newPhotoUrl }));

        alert('Profile photo updated successfully!');
      }
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDocumentStatus = async (docId: string, status: string) => {
    setProcessingDocId(docId);
    setDashboardData((prev: any) => {
      if (!prev || !prev.students) return prev;
      return {
        ...prev,
        students: prev.students.map((student: any) => ({
          ...student,
          documents: student.documents?.map((doc: any) =>
            doc.id === docId ? { ...doc, status } : doc
          )
        }))
      };
    });

    try {
      await fetch('/api/admin/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, status }),
      });
      setSelectedDocs(prev => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
    } catch (e) {
      console.error(e);
      fetchData(false);
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleBulkDocumentStatus = async (studentId: string, status: string, targetDocIds?: string[]) => {
    const student = dashboardData?.students?.find((s: any) => s.id === studentId);
    if (!student) return;

    const idsToUpdate = targetDocIds && targetDocIds.length > 0
      ? targetDocIds
      : student.documents?.filter((d: any) => d.status === 'PENDING').map((d: any) => d.id) || [];

    if (idsToUpdate.length === 0) {
      alert(`No pending documents to ${status.toLowerCase()}.`);
      return;
    }

    setDashboardData((prev: any) => {
      if (!prev || !prev.students) return prev;
      return {
        ...prev,
        students: prev.students.map((st: any) => {
          if (st.id !== studentId) return st;
          return {
            ...st,
            documents: st.documents?.map((doc: any) =>
              idsToUpdate.includes(doc.id) ? { ...doc, status } : doc
            )
          };
        })
      };
    });

    try {
      await fetch('/api/admin/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToUpdate, status }),
      });

      setSelectedDocs(prev => {
        const next = { ...prev };
        idsToUpdate.forEach((id: string) => delete next[id]);
        return next;
      });
    } catch (e) {
      console.error('Bulk update error:', e);
      fetchData(false);
    }
  };

  const toggleSelectAllForStudent = (student: any) => {
    const pendingDocIds = student.documents?.filter((d: any) => d.status === 'PENDING').map((d: any) => d.id) || [];
    if (pendingDocIds.length === 0) return;

    const allSelected = pendingDocIds.every((id: string) => !!selectedDocs[id]);

    setSelectedDocs(prev => {
      const next = { ...prev };
      if (allSelected) {
        pendingDocIds.forEach((id: string) => delete next[id]);
      } else {
        pendingDocIds.forEach((id: string) => next[id] = true);
      }
      return next;
    });
  };

  const downloadStudentPDF = (student: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const p = student.profile || {};
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Details - ${p.name || student.email}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #059669; margin: 0; }
            .photo { width: 120px; height: 120px; border: 2px solid #e2e8f0; border-radius: 8px; object-fit: cover; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 1.2rem; font-weight: bold; color: #059669; border-bottom: 1px solid #e2e8f0; margin-bottom: 15px; padding-bottom: 5px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .item { display: flex; align-items: flex-start; margin-bottom: 8px; }
            .label { font-weight: bold; color: #64748b; width: 140px; flex-shrink: 0; }
            .value { color: #0f172a; flex-grow: 1; word-break: break-word; }
            .full-width { grid-column: 1 / -1; }
            .doc-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .doc-table th, .doc-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            .doc-table th { backgroundColor: #f8fafc; color: #475569; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 10px;">
              <img src="${window.location.origin}/mipl-logo.png.png" style="height: 45px; width: auto;" onerror="this.style.display='none'" />
              <img src="${window.location.origin}/mint-logo.png.png" style="height: 30px; width: auto;" onerror="this.style.display='none'" />
            </div>
            <h2 style="margin: 0; color: #134e5e; font-size: 1.5rem; text-transform: uppercase;">Pushpa Mahaveer Chand Marlecha Charitable Trust</h2>
          </div>
          <div class="header">
            <div>
              <h1>Student Dossier: ${student.name || 'N/A'}</h1>
              <p style="color: #64748b; margin-top: 5px;">ID: ${student.studentId || student.id}</p>
            </div>
            ${student.photoUrl ? `<img src="${student.photoUrl}" class="photo" />` : ''}
          </div>

          <div class="section">
            <div class="section-title">Personal Information</div>
            <div class="grid">
              <div class="item full-width"><span class="label">Full Name:</span> <span class="value">${student.name || 'N/A'}</span></div>
              <div class="item"><span class="label">Reference Name:</span> <span class="value" style="font-weight: 600; color: #0f172a;">${p.referenceName || 'N/A'}</span></div>
              <div class="item"><span class="label">Ref. Mobile:</span> <span class="value">${p.referenceContact || 'N/A'}</span></div>
              <div class="item"><span class="label">Association with MIPL:</span> <span class="value">${p.referenceMiplRelation || 'N/A'}</span></div>
              <div class="item"><span class="label">Ref. Address:</span> <span class="value">${p.referenceAddress || 'N/A'}</span></div>
              <div class="item"><span class="label">Gender:</span> <span class="value">${p.gender || 'N/A'}</span></div>
              <div class="item"><span class="label">Date of Birth:</span> <span class="value">${p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A'}</span></div>
              <div class="item"><span class="label">Mobile:</span> <span class="value">${student.phone || 'N/A'}</span></div>
              <div class="item"><span class="label">Email:</span> <span class="value">${student.email || 'N/A'}</span></div>
              <div class="item full-width"><span class="label">Aadhar Number:</span> <span class="value">${p.aadharNumber || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Residential Details</div>
            <div class="item full-width"><span class="label">Full Address:</span> <span class="value">${p.address || 'N/A'}</span></div>
            <div class="grid">
              <div class="item"><span class="label">City:</span> <span class="value">${p.city || 'N/A'}</span></div>
              <div class="item"><span class="label">State:</span> <span class="value">${p.state || 'N/A'}</span></div>
              <div class="item"><span class="label">Pincode:</span> <span class="value">${p.pincode || 'N/A'}</span></div>
              <div class="item"><span class="label">Stay Duration:</span> <span class="value">${p.durationOfStay || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Educational Status</div>
            <div class="item"><span class="label">School Name:</span> <span class="value">${p.schoolCollegeName || 'N/A'}</span></div>
            <div class="grid">
              <div class="item"><span class="label">Course/Year:</span> <span class="value">${p.currentCourse || 'N/A'}</span></div>
              <div class="item"><span class="label">Department:</span> <span class="value">${p.department || 'N/A'}</span></div>
              <div class="item"><span class="label">University/College Name:</span> <span class="value">${p.universityBoard || 'N/A'}</span></div>
              <div class="item"><span class="label">Academic Year:</span> <span class="value">${p.academicYear || 'N/A'}</span></div>
              <div class="item"><span class="label">Medium:</span> <span class="value">${p.mediumOfStudy || 'N/A'}</span></div>
              <div class="item"><span class="label">Prev. Marks:</span> <span class="value">${p.previousMarks || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Parent/Guardian Information</div>
            <div class="grid">
              <div class="item"><span class="label">Father's Name:</span> <span class="value">${p.fatherName || 'N/A'}</span></div>
              <div class="item"><span class="label">Occupation:</span> <span class="value">${p.fatherOccupation || 'N/A'}</span></div>
              <div class="item"><span class="label">Father's Income:</span> <span class="value">₹${p.fatherIncome || 0}</span></div>
              <div class="item"></div>
              <div class="item"><span class="label">Mother's Name:</span> <span class="value">${p.motherName || 'N/A'}</span></div>
              <div class="item"><span class="label">Occupation:</span> <span class="value">${p.motherOccupation || 'N/A'}</span></div>
              <div class="item"><span class="label">Mother's Income:</span> <span class="value">₹${p.motherIncome || 0}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Fee Summary & Sponsorship</div>
            <div class="grid">
              <div class="item"><span class="label">Term 1 Tuition:</span> <span class="value">₹${p.tuitionFee || 0}</span></div>
              <div class="item"><span class="label">Term 1 Total:</span> <span class="value">₹${p.totalAnnualFees || p.totalFee || 0}</span></div>
              <div class="item"><span class="label">Term 1 Paid:</span> <span class="value">₹${p.paidAmount || 0}</span></div>
              <div class="item"><span class="label">Term 1 Balance:</span> <span class="value">₹${p.balanceAmount || 0}</span></div>
              ${p.hasTerm2Fees ? `
              <div class="item full-width" style="margin-top: 6px; font-weight: bold; color: #2563eb; border-top: 1px dashed #cbd5e1; padding-top: 6px;">Term 2 Fee Breakdown:</div>
              <div class="item"><span class="label">Term 2 Tuition:</span> <span class="value">₹${p.term2TuitionFee || 0}</span></div>
              <div class="item"><span class="label">Term 2 Total:</span> <span class="value">₹${p.term2TotalAnnualFees || p.term2TotalFee || 0}</span></div>
              <div class="item"><span class="label">Term 2 Paid:</span> <span class="value">₹${p.term2PaidAmount || 0}</span></div>
              <div class="item"><span class="label">Term 2 Balance:</span> <span class="value">₹${p.term2BalanceAmount || 0}</span></div>
              <div class="item full-width" style="font-weight: bold; color: #0f172a; background: #f1f5f9; padding: 6px 10px; border-radius: 4px;">
                Combined Tuition: ₹${(Number(p.tuitionFee || 0) + Number(p.term2TuitionFee || 0))} | Combined Balance: ₹${(Number(p.balanceAmount || 0) + Number(p.term2BalanceAmount || 0))}
              </div>
              ` : ''}
              <div class="item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 5px;">
                <span class="label" style="color: #059669; font-size: 1.1rem;">Amount Sponsored:</span> 
                <span class="value" style="font-size: 1.1rem; font-weight: bold;">₹${p.amountSponsored || 0}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Reference & Recommendation Details</div>
            <div class="grid">
              <div class="item full-width"><span class="label">Reference Name:</span> <span class="value" style="font-weight: bold; color: #0f172a;">${p.referenceName || 'N/A'}</span></div>
              <div class="item"><span class="label">Designation:</span> <span class="value">${p.referenceDesignation || 'N/A'}</span></div>
              <div class="item"><span class="label">Contact No:</span> <span class="value">${p.referenceContact || 'N/A'}</span></div>
              <div class="item"><span class="label">Organization:</span> <span class="value">${p.referenceOrg || 'N/A'}</span></div>
              <div class="item"><span class="label">Relationship:</span> <span class="value">${p.referenceRelation || 'N/A'}</span></div>
              <div class="item"><span class="label">Association with MIPL:</span> <span class="value">${p.referenceMiplRelation || 'N/A'}</span></div>
              <div class="item full-width"><span class="label">Ref. Address:</span> <span class="value">${p.referenceAddress || 'N/A'}</span></div>
              <div class="item full-width"><span class="label">Applied Through:</span> <span class="value">${p.appliedThrough || p.sourceType || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section" style="page-break-inside: avoid;">
            <div class="section-title">Trust Sponsorship Details</div>
            <div class="grid">
              <div class="item"><span class="label">Amount Sponsored:</span> <span class="value" style="color: #059669; font-weight: bold;">₹${p.amountSponsored || 0}</span></div>
              <div class="item"><span class="label">Amount Paid:</span> <span class="value" style="color: #2563eb; font-weight: bold;">₹${p.amountPaid || 0}</span></div>
              <div class="item"><span class="label">Status:</span> <span class="value" style="text-transform: uppercase;">${p.sponsorStatus || 'PENDING'}</span></div>
            </div>
          </div>

          <div class="section" style="page-break-inside: avoid;">
            <div class="section-title">Document Verification Status</div>
            <table class="doc-table">
              <thead>
                <tr><th>Document Type</th><th>File Link (Internal)</th><th>Verification Status</th></tr>
              </thead>
              <tbody>
                ${student.documents?.map((d: any) => `
                  <tr>
                    <td>${d.documentType.replace('_', ' ')}</td>
                    <td>${d.originalName || 'View Online'}</td>
                    <td>${d.status}</td>
                  </tr>
                `).join('') || '<tr><td colspan="3">No documents uploaded</td></tr>'}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 0.8rem;">
            Generated on ${new Date().toLocaleString()} | Trust Database Portal
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleLogout = () => {
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/superadmin-login');
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '100vh', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading Superadmin Portal...</div>;

  // Filtered Students for Overview & Directory
  const filteredStudents = (dashboardData?.students || []).filter((s: any) => {
    if (!studentSearchQuery.trim()) return true;
    const query = studentSearchQuery.toLowerCase().trim();
    const matchName = s.name?.toLowerCase().includes(query);
    const matchEmail = s.email?.toLowerCase().includes(query);
    const matchPhone = s.phone?.toLowerCase().includes(query);
    const matchStudentId = s.studentId?.toLowerCase().includes(query);
    const matchCourse = s.profile?.currentCourse?.toLowerCase().includes(query);
    const matchSchool = s.profile?.schoolCollegeName?.toLowerCase().includes(query);
    const matchRef = s.profile?.referenceName?.toLowerCase().includes(query);
    const matchRefDesig = s.profile?.referenceDesignation?.toLowerCase().includes(query);
    const matchRefOrg = s.profile?.referenceOrg?.toLowerCase().includes(query);
    return matchName || matchEmail || matchPhone || matchStudentId || matchCourse || matchSchool || matchRef || matchRefDesig || matchRefOrg;
  });

  // Flatten documents for verification tab
  const allDocuments = dashboardData?.students?.flatMap((s: any) => 
    s.documents.map((d: any) => ({ ...d, studentEmail: s.email, studentName: s.name || 'Unknown' }))
  ) || [];

  const pendingDocuments = allDocuments.filter((d: any) => d.status === 'PENDING');

  const filteredDocStudents = (dashboardData?.students || [])
    .filter((s: any) => s.documents && s.documents.length > 0)
    .filter((s: any) => {
      if (docSearchQuery.trim()) {
        const query = docSearchQuery.toLowerCase().trim();
        const matchName = s.name?.toLowerCase().includes(query);
        const matchEmail = s.email?.toLowerCase().includes(query);
        const matchStudentId = s.studentId?.toLowerCase().includes(query);
        const matchCourse = s.profile?.currentCourse?.toLowerCase().includes(query);
        const matchRef = s.profile?.referenceName?.toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchStudentId && !matchCourse && !matchRef) {
          return false;
        }
      }
      if (docFilter === 'PENDING') {
        return s.documents.some((d: any) => d.status === 'PENDING');
      }
      if (docFilter === 'VERIFIED') {
        return s.documents.every((d: any) => d.status === 'VERIFIED');
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const aPending = a.documents.filter((d: any) => d.status === 'PENDING').length;
      const bPending = b.documents.filter((d: any) => d.status === 'PENDING').length;
      return bPending - aPending;
    });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* SaaS Sidebar */}
      <aside style={{ width: '280px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mipl-logo.png.png" alt="MIPL" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mint-logo.png.png" alt="MINT" style={{ height: '16px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#134e5e', lineHeight: '1.3' }}>Pushpa Mahaveer Chand<br/>Marlecha Charitable Trust</span>
        </div>
        
        <div style={{ padding: '1.5rem 1rem', flex: 1, overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em', paddingLeft: '0.5rem' }}>Overview Dashboards</h3>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button 
                onClick={() => setActiveTab('overview')}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'overview' ? '#eef2ff' : 'transparent', color: activeTab === 'overview' ? '#4f46e5' : '#475569', border: 'none', textAlign: 'left', fontWeight: activeTab === 'overview' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <span style={{ fontSize: '1.1rem' }}>📊</span> Overview
              </button>
              <button 
                onClick={() => setActiveTab('funds')}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'funds' ? '#eef2ff' : 'transparent', color: activeTab === 'funds' ? '#4f46e5' : '#475569', border: 'none', textAlign: 'left', fontWeight: activeTab === 'funds' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <span style={{ fontSize: '1.1rem' }}>💰</span> Funds Overview
              </button>
            </nav>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em', paddingLeft: '0.5rem' }}>Key Dashboards</h3>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button 
                onClick={() => setActiveTab('directory')}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'directory' ? '#eef2ff' : 'transparent', color: activeTab === 'directory' ? '#4f46e5' : '#475569', border: 'none', textAlign: 'left', fontWeight: activeTab === 'directory' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <span style={{ fontSize: '1.1rem' }}>👥</span> Student Directory
              </button>
              <button 
                onClick={() => setActiveTab('documents')}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'documents' ? '#eef2ff' : 'transparent', color: activeTab === 'documents' ? '#4f46e5' : '#475569', border: 'none', textAlign: 'left', fontWeight: activeTab === 'documents' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ fontSize: '1.1rem' }}>📁</span> Documents Overview</div>
                {pendingDocuments.length > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>{pendingDocuments.length}</span>}
              </button>
            </nav>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em', paddingLeft: '0.5rem' }}>Account</h3>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button 
                onClick={() => setActiveTab('profile')}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'profile' ? '#eef2ff' : 'transparent', color: activeTab === 'profile' ? '#4f46e5' : '#475569', border: 'none', textAlign: 'left', fontWeight: activeTab === 'profile' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <span style={{ fontSize: '1.1rem' }}>⚙️</span> Profile Settings
              </button>
            </nav>
          </div>
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            Log Out
          </button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* SaaS Topbar */}
        <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 600, textTransform: 'capitalize' }}>
            {activeTab.replace('-', ' ')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => fetchData(false)}
              disabled={isRefreshing}
              title="Refresh student data from database"
              style={{
                padding: '0.45rem 0.9rem',
                backgroundColor: isRefreshing ? '#f1f5f9' : '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}>🔄</span>
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <div 
              onClick={() => setActiveTab('profile')} 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {adminProfile?.photoUrl ? (
                <img src={adminProfile.photoUrl} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '2px solid #4f46e5' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  {adminProfile?.name ? adminProfile.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>Total Students Enrolled</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#0f172a' }}>{dashboardData?.totalStudents || 0}</div>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>Total Funds Distributed</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#059669' }}>₹{dashboardData?.totalAmountSpent || 0}</div>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>Pending Verifications</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ef4444' }}>{pendingDocuments.length}</div>
                </div>
              </div>

              {/* Student List in Overview */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Recent Enrollments</h2>
                  <button onClick={() => setActiveTab('directory')} style={{ fontSize: '0.875rem', color: '#4f46e5', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>View All Directory</button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: '1 1 300px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search student by Name, Reference Name, ID, Course, Phone, Email..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery('')}
                      style={{ padding: '0.4rem 0.75rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Clear
                    </button>
                  )}
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Student Name</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Reference Name</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Course</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Aadhar</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Status</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No students found matching &quot;{studentSearchQuery}&quot;
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student: any) => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.name || 'N/A'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{student.email}</div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#475569' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.profile?.referenceName || '-'}</div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#475569' }}>{student.profile?.currentCourse || 'N/A'}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#475569' }}>{student.profile?.aadharNumber || 'N/A'}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: student.profile?.isDeclared ? '#dcfce7' : '#fff7ed', color: student.profile?.isDeclared ? '#166534' : '#9a3412' }}>
                              {student.profile?.isDeclared ? '✓ Submitted' : '○ Draft'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <button 
                              onClick={() => setSelectedStudent(student)}
                              style={{ padding: '0.4rem 0.8rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              View Full Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student Details Modal */}
          {selectedStudent && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '960px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                <button onClick={() => setSelectedStudent(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: '#64748b' }}>&times;</button>
                
                <div style={{ padding: '2.5rem' }}>
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', alignItems: 'center' }}>
                    {selectedStudent.photoUrl ? (
                      <img src={selectedStudent.photoUrl} alt="P" style={{ width: '120px', height: '120px', borderRadius: '16px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '120px', height: '120px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>👤</div>
                    )}
                    <div>
                      <h2 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{selectedStudent.name || 'N/A'}</h2>
                      <p style={{ color: '#64748b', fontSize: '1.1rem', margin: '0.5rem 0' }}>{selectedStudent.email} | {selectedStudent.phone}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                         <span style={{ padding: '0.25rem 0.75rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>{selectedStudent.profile?.currentCourse}</span>
                         <span style={{ padding: '0.25rem 0.75rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>ID: {selectedStudent.studentId || selectedStudent.id.slice(-6)}</span>
                         {selectedStudent.profile?.referenceName && (
                           <span style={{ padding: '0.25rem 0.75rem', background: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>Ref: {selectedStudent.profile.referenceName}</span>
                         )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 700 }}>Personal & Residential</h3>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Gender:</strong> {selectedStudent.profile?.gender || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>DOB:</strong> {selectedStudent.profile?.dob ? new Date(selectedStudent.profile.dob).toLocaleDateString() : 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Aadhar:</strong> {selectedStudent.profile?.aadharNumber || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Address:</strong> {selectedStudent.profile?.address || 'N/A'}, {selectedStudent.profile?.city || ''}, {selectedStudent.profile?.state || ''} - {selectedStudent.profile?.pincode || ''}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Stay Duration:</strong> {selectedStudent.profile?.durationOfStay || 'N/A'}</p>
                    </div>

                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 700 }}>Educational Details</h3>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>School Name:</strong> {selectedStudent.profile?.schoolCollegeName || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>University/College:</strong> {selectedStudent.profile?.universityBoard || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Course / Stream:</strong> {selectedStudent.profile?.currentCourse || 'N/A'} ({selectedStudent.profile?.department || 'N/A'})</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Year/Sem:</strong> {selectedStudent.profile?.semesterYear || 'N/A'} | {selectedStudent.profile?.academicYear || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Medium / Prev Marks:</strong> {selectedStudent.profile?.mediumOfStudy || 'N/A'} ({selectedStudent.profile?.previousMarks || 'N/A'})</p>
                    </div>

                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 700 }}>Family & Background</h3>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Father:</strong> {selectedStudent.profile?.fatherName || 'N/A'} ({selectedStudent.profile?.fatherOccupation || 'N/A'} - ₹{selectedStudent.profile?.fatherIncome || 0})</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Mother:</strong> {selectedStudent.profile?.motherName || 'N/A'} ({selectedStudent.profile?.motherOccupation || 'N/A'} - ₹{selectedStudent.profile?.motherIncome || 0})</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Family / House:</strong> {selectedStudent.profile?.familyType || 'N/A'} / {selectedStudent.profile?.houseType || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>First Graduate:</strong> {selectedStudent.profile?.firstGraduate || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Medical Issue:</strong> {selectedStudent.profile?.medicalIssue || 'None'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Existing Loan:</strong> {selectedStudent.profile?.existingLoan || 'No'} {selectedStudent.profile?.loanAmount ? `(₹${selectedStudent.profile?.loanAmount})` : ''}</p>
                    </div>

                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 700 }}>Reference & Recommendation</h3>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Reference Name:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedStudent.profile?.referenceName || 'N/A'}</span></p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Designation:</strong> {selectedStudent.profile?.referenceDesignation || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Contact Number:</strong> {selectedStudent.profile?.referenceContact || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Organization:</strong> {selectedStudent.profile?.referenceOrg || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Relationship with Student:</strong> {selectedStudent.profile?.referenceRelation || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Association with MIPL:</strong> {selectedStudent.profile?.referenceMiplRelation || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Reference Address:</strong> {selectedStudent.profile?.referenceAddress || 'N/A'}</p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}><strong>Applied Through:</strong> {selectedStudent.profile?.appliedThrough || selectedStudent.profile?.sourceType || 'N/A'}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Fee Details & Sponsorship</h3>
                      {selectedStudent.profile?.hasTerm2Fees && (
                        <span style={{ padding: '0.2rem 0.6rem', background: '#dbeafe', color: '#1e40af', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Term 1 & Term 2 Active</span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 1 Tuition Fee:</span>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>₹{selectedStudent.profile?.tuitionFee || 0}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 1 Total Fee:</span>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>₹{selectedStudent.profile?.totalAnnualFees || selectedStudent.profile?.totalFee || 0}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 1 Paid:</span>
                        <div style={{ fontWeight: 600, color: '#16a34a' }}>₹{selectedStudent.profile?.paidAmount || 0}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 1 Balance:</span>
                        <div style={{ fontWeight: 600, color: '#dc2626' }}>₹{selectedStudent.profile?.balanceAmount || 0}</div>
                      </div>
                    </div>

                    {selectedStudent.profile?.hasTerm2Fees && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.5rem' }}>Term 2 Fee Breakdown:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 2 Tuition Fee:</span>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>₹{selectedStudent.profile?.term2TuitionFee || 0}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 2 Total Fee:</span>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>₹{selectedStudent.profile?.term2TotalAnnualFees || selectedStudent.profile?.term2TotalFee || 0}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 2 Paid:</span>
                            <div style={{ fontWeight: 600, color: '#16a34a' }}>₹{selectedStudent.profile?.term2PaidAmount || 0}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Term 2 Balance:</span>
                            <div style={{ fontWeight: 600, color: '#dc2626' }}>₹{selectedStudent.profile?.term2BalanceAmount || 0}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
                          Combined Tuition: ₹{((Number(selectedStudent.profile?.tuitionFee) || 0) + (Number(selectedStudent.profile?.term2TuitionFee) || 0)).toLocaleString()} | Combined Balance: ₹{((Number(selectedStudent.profile?.balanceAmount) || 0) + (Number(selectedStudent.profile?.term2BalanceAmount) || 0)).toLocaleString()}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Trust Sponsored:</span>
                        <div style={{ fontWeight: 700, color: '#059669' }}>₹{selectedStudent.profile?.amountSponsored || 0}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Trust Paid:</span>
                        <div style={{ fontWeight: 700, color: '#2563eb' }}>₹{selectedStudent.profile?.amountPaid || 0}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sponsorship Status:</span>
                        <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{selectedStudent.profile?.sponsorStatus || 'PENDING'}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#0f172a' }}>Uploaded Documents</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                      {selectedStudent.documents?.map((doc: any) => (
                        <div key={doc.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{doc.documentType.replace('_', ' ')}</span>
                          <button onClick={(e) => { e.preventDefault(); setPreviewDoc(doc); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', color: '#4f46e5', textDecoration: 'underline', textAlign: 'left' }}>Preview Document</button>
                          <span style={{ fontSize: '0.7rem', color: doc.status === 'VERIFIED' ? '#059669' : '#dc2626' }}>● {doc.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => downloadStudentPDF(selectedStudent)}
                      style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Download Full Report (PDF)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'funds' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: '#0f172a' }}>Fund Management Overview (View Only)</h2>
              </div>
              <div style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Student Name</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Sponsorship Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.students?.map((student: any) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{student.name || student.email || 'Unnamed'}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#0f172a', fontSize: '0.9rem' }}>
                          <div style={{ marginBottom: '0.25rem' }}>Sponsored: <strong style={{ color: '#059669' }}>₹{student.profile?.amountSponsored || 0}</strong></div>
                          <div style={{ marginBottom: '0.25rem' }}>Paid: <strong style={{ color: '#2563eb' }}>₹{student.profile?.amountPaid || 0}</strong></div>
                          <div>Status: <span style={{ padding: '0.15rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{student.profile?.sponsorStatus || 'PENDING'}</span></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'directory' && (
             <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: '#0f172a' }}>Student Directory</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Total: {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
                </span>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 300px' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by Student Name, Reference Name, ID, Course, Phone, Email..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                {studentSearchQuery && (
                  <button
                    onClick={() => setStudentSearchQuery('')}
                    style={{ padding: '0.4rem 0.75rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Student Details</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Reference Name</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Education</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Docs Uploaded</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No students found matching &quot;{studentSearchQuery}&quot;
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student: any) => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.name || 'Unnamed'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{student.email}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{student.phone || 'No phone'}</div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#475569' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.profile?.referenceName || '-'}</div>
                            {student.profile?.referenceOrg && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{student.profile.referenceOrg}</div>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: '#475569', fontSize: '0.9rem' }}>
                            {student.profile?.currentCourse ? `${student.profile.currentCourse} at ${student.profile.schoolCollegeName || 'Unknown'}` : '-'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '4px', fontWeight: 600 }}>
                              {student.documents?.length || 0} files
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button 
                                onClick={() => setSelectedStudent(student)}
                                style={{ padding: '0.5rem 0.8rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                              >
                                View Details
                              </button>
                              <button 
                                onClick={() => downloadStudentPDF(student)} 
                                style={{ padding: '0.5rem 0.8rem', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                              >
                                📥 PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#0f172a' }}>Document Verifications</h2>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Review, preview, and approve or reject uploaded student verification documents.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '0.35rem 0.75rem', background: '#fee2e2', color: '#dc2626', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>
                      {pendingDocuments.length} Pending Documents
                    </span>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: '1 1 300px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1rem' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search student name, email, student ID, course..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 2.25rem 0.65rem 2.5rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    />
                    {docSearchQuery && (
                      <button
                        onClick={() => setDocSearchQuery('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', padding: '2px 6px', borderRadius: '50%' }}
                        title="Clear Search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                      { id: 'ALL', label: 'All Students' },
                      { id: 'PENDING', label: `Pending Action (${dashboardData?.students?.filter((s: any) => s.documents?.some((d: any) => d.status === 'PENDING')).length || 0})` },
                      { id: 'VERIFIED', label: 'All Approved' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setDocFilter(f.id as any)}
                        style={{
                          padding: '0.55rem 0.9rem',
                          borderRadius: '8px',
                          border: docFilter === f.id ? '1px solid #10b981' : '1px solid #e2e8f0',
                          background: docFilter === f.id ? '#ecfdf5' : '#ffffff',
                          color: docFilter === f.id ? '#059669' : '#475569',
                          fontWeight: docFilter === f.id ? 700 : 500,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student Cards List */}
              <div style={{ padding: '1.5rem' }}>
                {filteredDocStudents.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#0f172a' }}>No students match your search criteria</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try searching with a different student name or clearing the search filter.</div>
                    {docSearchQuery && (
                      <button onClick={() => setDocSearchQuery('')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  filteredDocStudents.map((student: any) => {
                    const studentPendingDocs = student.documents?.filter((d: any) => d.status === 'PENDING') || [];
                    const studentSelectedDocIds = student.documents?.filter((d: any) => selectedDocs[d.id])?.map((d: any) => d.id) || [];
                    const isAllPendingSelected = studentPendingDocs.length > 0 && studentPendingDocs.every((d: any) => selectedDocs[d.id]);

                    return (
                      <div key={student.id} style={{ marginBottom: '2rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        {/* Student Header */}
                        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{student.name || 'Unnamed'}</span>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{student.email}</span>
                            {student.studentId && (
                              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: '#ecfdf5', color: '#059669', borderRadius: '4px', fontWeight: 700 }}>
                                ID: {student.studentId}
                              </span>
                            )}
                            {student.profile?.currentCourse && (
                              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: '#eef2ff', color: '#4338ca', borderRadius: '4px', fontWeight: 600 }}>
                                {student.profile?.currentCourse}
                              </span>
                            )}
                          </div>

                          {/* Quick Bulk Action Buttons for Student */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {studentPendingDocs.length > 0 ? (
                              <>
                                <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 700 }}>
                                  ⏳ {studentPendingDocs.length} Pending
                                </span>

                                {studentSelectedDocIds.length > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleBulkDocumentStatus(student.id, 'VERIFIED', studentSelectedDocIds)}
                                      style={{ padding: '0.4rem 0.85rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 1px 2px rgba(16, 185, 129, 0.3)' }}
                                    >
                                      ✓ Approve Selected ({studentSelectedDocIds.length})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleBulkDocumentStatus(student.id, 'REJECTED', studentSelectedDocIds)}
                                      style={{ padding: '0.4rem 0.85rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                      ✕ Reject Selected ({studentSelectedDocIds.length})
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleBulkDocumentStatus(student.id, 'VERIFIED')}
                                    style={{ padding: '0.4rem 0.85rem', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 1px 2px rgba(5, 150, 105, 0.3)' }}
                                    title="Immediately approve all pending documents for this candidate"
                                  >
                                    ✓ Approve All Documents ({studentPendingDocs.length})
                                  </button>
                                )}
                              </>
                            ) : (
                              <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontWeight: 700 }}>
                                ✓ All Verified ({student.documents.length} Files)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Document Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '0.75rem 1.5rem', width: '40px', textAlign: 'center' }}>
                                {studentPendingDocs.length > 0 && (
                                  <input
                                    type="checkbox"
                                    checked={isAllPendingSelected}
                                    onChange={() => toggleSelectAllForStudent(student)}
                                    title="Select all pending documents"
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
                                  />
                                )}
                              </th>
                              <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Document Type</th>
                              <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>File Name</th>
                              <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status / Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {student.documents.map((doc: any) => {
                              const isSelected = !!selectedDocs[doc.id];
                              const isPending = doc.status === 'PENDING';

                              return (
                                <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSelected ? '#f0fdf4' : 'transparent' }}>
                                  <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                                    {isPending ? (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          setSelectedDocs(prev => ({ ...prev, [doc.id]: !prev[doc.id] }));
                                        }}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
                                      />
                                    ) : (
                                      <span style={{ color: doc.status === 'VERIFIED' ? '#10b981' : '#ef4444', fontSize: '0.9rem' }}>
                                        {doc.status === 'VERIFIED' ? '✓' : '✕'}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                                    {doc.documentType.replace('_', ' ')}
                                  </td>
                                  <td style={{ padding: '0.75rem 1.5rem' }}>
                                    <button
                                      onClick={(e) => { e.preventDefault(); setPreviewDoc(doc); }}
                                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.85rem', color: '#4f46e5', textDecoration: 'underline', fontWeight: 600, textAlign: 'left' }}
                                    >
                                      {doc.originalName || 'Preview File'}
                                    </button>
                                  </td>
                                  <td style={{ padding: '0.75rem 1.5rem' }}>
                                    {isPending ? (
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button
                                          type="button"
                                          disabled={processingDocId === doc.id}
                                          onClick={() => handleDocumentStatus(doc.id, 'VERIFIED')}
                                          style={{ padding: '0.35rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                        >
                                          {processingDocId === doc.id ? '...' : 'Approve'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={processingDocId === doc.id}
                                          onClick={() => handleDocumentStatus(doc.id, 'REJECTED')}
                                          style={{ padding: '0.35rem 0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          padding: '0.2rem 0.5rem',
                                          borderRadius: '4px',
                                          backgroundColor: doc.status === 'VERIFIED' ? '#dcfce7' : '#fee2e2',
                                          color: doc.status === 'VERIFIED' ? '#15803d' : '#b91c1c'
                                        }}>
                                          {doc.status === 'VERIFIED' ? '✓ VERIFIED' : '✕ REJECTED'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleDocumentStatus(doc.id, doc.status === 'VERIFIED' ? 'REJECTED' : 'VERIFIED')}
                                          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                          Change
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f8fafc, #ffffff)' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#0f172a' }}>Super Admin Profile Settings</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Manage your professional identity and contact details.</p>
              </div>
              
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                  <div style={{ position: 'relative' }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt="A" style={{ width: '100px', height: '100px', borderRadius: '24px', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', opacity: photoUploading ? 0.5 : 1 }} />
                    ) : (
                      <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                        {name ? name.charAt(0).toUpperCase() : 'S'}
                      </div>
                    )}
                    <label style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '36px', height: '36px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photoUploading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      <span style={{ fontSize: '1.2rem' }}>{photoUploading ? '⏳' : '📷'}</span>
                      <input type="file" style={{ display: 'none' }} onChange={handleAdminPhotoUpload} disabled={photoUploading} />
                    </label>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{name || 'MIPL MINT'}</h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>Super Admin Access (View Only)</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', transition: 'border-color 0.2s' }} value={name} onChange={e => setName(e.target.value)} required placeholder="Enter your full name" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Phone Number <span style={{ color: '#dc2626' }}>*</span></label>
                      <input style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }} value={phone} onChange={e => setPhone(e.target.value)} required placeholder="Enter your phone number" />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <button type="submit" style={{ width: '100%', padding: '0.875rem', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }} disabled={profileLoading}>
                        {profileLoading ? 'Updating...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </div>
                </form>

                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px dashed #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔐</span> Security & Login Credentials
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Update your admin login email and password here. <strong>Be careful:</strong> these will be required for your next login.</p>
                  
                  <form onSubmit={handleSecuritySubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Admin Login Email <span style={{ color: '#dc2626' }}>*</span></label>
                        <input style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }} type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>New Password (Leave blank to keep current) <span style={{ color: '#dc2626' }}>*</span></label>
                        <input style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                        <button type="submit" style={{ width: '100%', padding: '0.875rem', backgroundColor: '#1e293b', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }} disabled={securityLoading}>
                          {securityLoading ? 'Updating...' : 'Update Login Credentials'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
          {/* Document Preview Modal */}
          {previewDoc && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{previewDoc.originalName || 'Document Preview'}</h2>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {previewDoc.fileUrl?.includes('data:image/') && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                        <button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))} style={{ border: 'none', background: 'white', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
                        <button onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))} style={{ border: 'none', background: 'white', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                      </div>
                    )}
                    <a href={previewDoc.fileUrl} download={previewDoc.originalName || 'document'} style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>Download</a>
                    <button onClick={() => { setPreviewDoc(null); setZoomLevel(1); }} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: '#64748b' }}>&times;</button>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '1rem', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                  {previewDoc.fileUrl?.includes('data:application/pdf') ? (
                    <PdfViewer base64={previewDoc.fileUrl} />
                  ) : previewDoc.fileUrl?.includes('data:image/') ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%', width: '100%' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewDoc.fileUrl} alt="Preview" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center', transition: 'transform 0.2s ease', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                    </div>
                  ) : (
                    <div style={{ color: '#64748b' }}>Preview not available. <a href={previewDoc.fileUrl} download={previewDoc.originalName}>Download instead</a></div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

