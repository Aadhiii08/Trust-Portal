/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{url: string, name: string} | null>(null);

  // Data States
  const [userData, setUserData] = useState<any>({});
  const [siblings, setSiblings] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>({});
  const [documents, setDocuments] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState<any>({
    name: '', phone: '', email: '', photoUrl: '',
    gender: '', dob: '', aadharNumber: '',
    address: '', permanentAddress: '', city: '', state: '', pincode: '', durationOfStay: '',
    schoolCollegeName: '', schoolCollegeAddress: '', currentCourse: '', department: '', universityBoard: '', academicYear: '', semesterYear: '', mediumOfStudy: '', previousMarks: '',
    tuitionFee: 0, hostelFee: 0, otherFee: 0, totalFee: 0, totalAnnualFees: 0, scholarshipReceived: 0, balanceRequired: 0, paidAmount: 0, balanceAmount: 0,
    hasTerm2Fees: false,
    term2TuitionFee: 0, term2HostelFee: 0, term2OtherFee: 0, term2TotalFee: 0, term2TotalAnnualFees: 0, term2ScholarshipReceived: 0, term2BalanceRequired: 0, term2PaidAmount: 0, term2BalanceAmount: 0,
    fatherName: '', fatherOccupation: '', fatherIncome: 0, motherName: '', motherOccupation: '', motherIncome: 0, totalIncome: '',
    familyType: '', houseType: '', religion: '', caste: '', category: '',
    medicalIssue: '', singleParent: '', orphanStatus: '', existingLoan: '', loanAmount: 0, firstGraduate: '',
    appliedThrough: '', sourceType: '',
    referenceName: '', referenceDesignation: '', referenceContact: '', referenceOrg: '', referenceRelation: '',
    isDeclared: false, institutionType: 'COLLEGE'
  });

  const [file, setFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('AADHAR');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showLoading = true, updateForm = true) => {
    if (showLoading) setLoading(true);
    try {
      const timestamp = Date.now();
      const [profileRes, docsRes] = await Promise.all([
        fetch(`/api/student/profile?t=${timestamp}`),
        fetch(`/api/student/upload?t=${timestamp}`)
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setUserData(data.user || {});
        setSiblings(data.siblings || []);
        setProfileData(data.profile || {});
        
        if (updateForm) {
          // Merge into form state
          setFormData((prev: any) => ({
            ...prev,
            ...data.user,
            ...data.profile,
            hasTerm2Fees: Boolean(data.profile?.hasTerm2Fees),
            dob: data.profile?.dob ? new Date(data.profile.dob).toISOString().split('T')[0] : '',
            institutionType: data.profile?.universityBoard === 'NA' ? 'SCHOOL' : 'COLLEGE'
          }));
        } else {
          // Just update photoUrl if it changed
          setFormData((prev: any) => ({
            ...prev,
            photoUrl: data.user?.photoUrl || prev.photoUrl
          }));
        }
      }

      if (docsRes.ok) {
        const dData = await docsRes.json();
        setDocuments(dData.documents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'declaration') {
      const mandatoryText = [
        'name', 'phone', 'gender', 'dob', 'aadharNumber',
        'address', 'city', 'state', 'pincode', 'permanentAddress',
        'schoolCollegeName', 'schoolCollegeAddress', 'currentCourse', 'department', 'universityBoard', 'academicYear', 'semesterYear', 'mediumOfStudy', 'previousMarks',
        'fatherName', 'fatherOccupation', 'motherName', 'motherOccupation',
        'familyType', 'houseType', 'religion', 'medicalIssue', 'firstGraduate',
        'referenceName', 'referenceDesignation', 'referenceContact', 'referenceOrg'
      ];
      const missingField = mandatoryText.find(key => !formData[key] || formData[key].toString().trim() === '');
      
      if (missingField) {
        alert('Please fill out all mandatory fields in all tabs before submitting your final profile.');
        return;
      }
      
      if (!formData.isDeclared) {
        alert('Please complete all requirements and check the declaration box before submitting.');
        return;
      }
    }

    // Aadhar Validation (12 digits)
    if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
      alert('Please enter a correct 12-digit Aadhar Number');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch('/api/student/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        if (activeTab === 'declaration') {
          alert('🎉 Profile Submitted Successfully!');
          setActiveTab('overview');
          window.scrollTo(0, 0);
        } else {
          // Move to next tab immediately for better UX
          const tabs = ['overview', 'basic', 'residential', 'educational', 'fee', 'parent', 'background', 'reference', 'documents', 'declaration'];
          const currentIndex = tabs.indexOf(activeTab);
          if (currentIndex < tabs.length - 1) {
            setActiveTab(tabs[currentIndex + 1]);
            window.scrollTo(0, 0);
          }
        }
        // Refresh data silently in the background
        fetchData(false);
      } else {
        const errorData = await res.json();
        alert('Failed to save data: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('An error occurred while saving. Please check your connection.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePassportUpload = async () => {
    if (!passportFile) return;
    setUploadLoading(true);
    const fd = new FormData();
    fd.append('file', passportFile);
    fd.append('documentType', 'PASSPORT_PHOTO');

    try {
      const res = await fetch('/api/student/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setFormData((prev: any) => ({ ...prev, photoUrl: data.document.fileUrl }));
        alert('Photo uploaded successfully');
        setPassportFile(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUploadSubmit = async (type: string, uploadFile: File | null) => {
    if (!uploadFile) {
      alert('Please select a file first');
      return;
    }

    setUploadLoading(true);
    const fd = new FormData();
    fd.append('file', uploadFile);
    fd.append('documentType', type);

    try {
      const res = await fetch('/api/student/upload', {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        alert(`${type.replace('_', ' ')} uploaded successfully`);
        setFile(null); // Clear the generic file state
        // Clear any file inputs on the page to reset their display
        document.querySelectorAll('input[type="file"]').forEach((input: any) => input.value = '');
        fetchData(false, false);
      } else {
        alert('Upload failed');
      }
    } catch (e) {
      console.error(e);
      alert('Error uploading file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? You will need to upload a new one.')) return;
    try {
      setUploadLoading(true);
      const res = await fetch(`/api/student/upload?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('Document deleted successfully');
        fetchData(false, false);
      } else {
        alert('Failed to delete document');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting document');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you ABSOLUTELY sure you want to remove your account? This action cannot be undone and all your data will be permanently deleted.')) return;
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' });
      if (res.ok) {
        alert('Account removed successfully.');
        document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.push('/login');
      } else {
        alert('Failed to remove account.');
      }
    } catch (e) {
      console.error(e);
      alert('Error removing account.');
    }
  };

  const handleAddChild = async () => {
    if (!confirm('Are you sure you want to add another child profile?')) return;
    try {
      const res = await fetch('/api/student/add-child', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.newUserId) {
        handleSwitchChild(data.newUserId);
      } else {
        alert(data.error || 'Failed to add child.');
      }
    } catch (e) {
      alert('Error adding child.');
    }
  };

  const handleSwitchChild = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/auth/switch-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to switch profile.');
      }
    } catch (e) {
      alert('Error switching profile.');
    }
  };

  const handleLogout = () => {
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '100vh', fontWeight: 'bold' }}>Loading Student Portal...</div>;

  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' };
  const sectionCardStyle = { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: '300px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>Student Portal</span>
        </div>
        
        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {[
              { id: 'overview', label: 'Profile Overview', icon: '📋' },
              { id: 'basic', label: 'Basic Details', icon: '👤' },
              { id: 'residential', label: 'Residential Details', icon: '🏠' },
              { id: 'educational', label: 'Educational Details', icon: '🎓' },
              { id: 'fee', label: 'Fee Details', icon: '💳' },
              { id: 'parent', label: 'Parent/Guardian', icon: '👪' },
              { id: 'background', label: 'Financial/Social Background', icon: '💰' },
              { id: 'reference', label: 'Reference Details', icon: '🔗' },
              { id: 'documents', label: 'Upload Documents', icon: '📄' },
              { id: 'declaration', label: 'Declaration', icon: '✅' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  padding: '0.75rem 1rem', borderRadius: '8px', 
                  background: activeTab === tab.id ? '#ecfdf5' : 'transparent', 
                  color: activeTab === tab.id ? '#059669' : '#475569', 
                  border: 'none', textAlign: 'left', fontWeight: activeTab === tab.id ? 600 : 500, 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' 
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {siblings.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Switch Child Profile:</label>
              <select 
                onChange={(e) => handleSwitchChild(e.target.value)}
                value=""
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="" disabled>Select sibling...</option>
                {siblings.map(sib => (
                  <option key={sib.id} value={sib.id}>{sib.name || `"Student ID: ${sib.studentId}"`}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={handleAddChild} style={{ width: '100%', padding: '0.75rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            + Add Another Child
          </button>
          <button onClick={handleDeleteAccount} style={{ width: '100%', padding: '0.75rem', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            Remove Account
          </button>
          <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Dashboard - {activeTab.replace(/([A-Z])/g, ' $1').toUpperCase()}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {formData.photoUrl ? (
              <img src={formData.photoUrl} alt="P" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {formData.name ? formData.name.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{formData.name || userData?.name || 'Student Name'}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{formData.email || userData?.email}</div>
            </div>
          </div>
        </header>

        <form onSubmit={handleProfileSubmit}>
          {activeTab === 'overview' && (
            <div style={sectionCardStyle}>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt="P" style={{ width: '120px', height: '120px', borderRadius: '16px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '120px', height: '120px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>👤</div>
                )}
                <div>
                  <h1 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{formData.name || userData?.name || 'Your Name'}</h1>
                  <p style={{ color: '#64748b', fontSize: '1.1rem' }}>{formData.currentCourse || 'Course not specified'}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', background: '#ecfdf5', color: '#059669', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                      {formData.isDeclared ? '✓ Profile Complete' : '⚠️ Profile Pending'}
                    </span>
                    <span style={{ padding: '0.25rem 0.75rem', background: '#f1f5f9', color: '#475569', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                      {documents.length} Documents
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#059669' }}>Quick Info</h3>
                  <p><strong>Student ID:</strong> <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>{userData.studentId || 'N/A'}</span></p>
                  <p><strong>Mobile:</strong> {formData.phone || 'N/A'}</p>
                  <p><strong>Email:</strong> {formData.email || 'N/A'}</p>
                  <p><strong>Aadhar:</strong> {formData.aadharNumber || 'N/A'}</p>
                </div>
                <div>
                  <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#059669' }}>Education & Fees</h3>
                  <p><strong>{formData.institutionType === 'SCHOOL' ? 'School' : 'College'}:</strong> {formData.schoolCollegeName || 'N/A'}</p>
                  {formData.institutionType === 'SCHOOL' ? (
                    <p><strong>Standard:</strong> {formData.currentCourse || 'N/A'}</p>
                  ) : (
                    <p><strong>Year/Sem:</strong> {formData.semesterYear || 'N/A'}</p>
                  )}
                  <p><strong>Term 1 Tuition:</strong> ₹{formData.tuitionFee || 0} | <strong>Balance:</strong> ₹{formData.balanceAmount || 0}</p>
                  {formData.hasTerm2Fees && (
                    <p><strong>Term 2 Tuition:</strong> ₹{formData.term2TuitionFee || 0} | <strong>Balance:</strong> ₹{formData.term2BalanceAmount || 0}</p>
                  )}
                  <p><strong>Status:</strong> {formData.isDeclared ? 'Submitted for Verification' : 'In Progress'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'basic' && (
            <div style={sectionCardStyle}>
              <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Personal Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input style={inputStyle} name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                  <label style={labelStyle}>Gender <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required style={inputStyle} name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} type="date" name="dob" value={formData.dob} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Email ID</label>
                  <input style={inputStyle} type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Aadhar Number <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Passport Size Photo <span style={{ color: '#dc2626' }}>*</span></label>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem' }}>Supported: .png, .jpg, .jpeg (PDF not recommended for profile photo)</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="file" 
                      style={{ ...inputStyle, padding: '0.5rem', color: '#0f172a' }} 
                      onChange={e => setPassportFile(e.target.files?.[0] || null)} 
                    />
                    <button 
                      type="button" 
                      onClick={handlePassportUpload} 
                      style={{ padding: '0 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                      disabled={uploadLoading || !passportFile}
                    >
                      {uploadLoading ? '...' : 'Upload'}
                    </button>
                  </div>
                  {formData.photoUrl && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                      ✓ Photo Uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'residential' && (
            <div style={sectionCardStyle}>
              <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Residential Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Full Address <span style={{ color: '#dc2626' }}>*</span></label>
                  <textarea required style={{ ...inputStyle, height: '100px' }} name="address" value={formData.address} onChange={handleChange} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>City <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} name="city" value={formData.city} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>State <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} name="state" value={formData.state} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Pincode <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} name="pincode" value={formData.pincode} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration of Stay (in months)</label>
                    <input style={inputStyle} name="durationOfStay" value={formData.durationOfStay} onChange={handleChange} />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label style={labelStyle}>Permanent Address <span style={{ color: '#dc2626' }}>*</span></label>
                  <textarea required style={{ ...inputStyle, height: '80px', resize: 'vertical' }} name="permanentAddress" value={formData.permanentAddress} onChange={handleChange}></textarea>
                </div>

                {/* Proof Upload */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ ...labelStyle, color: '#047857', marginBottom: 0 }}>Upload Address Proof (Current or Permanent) <span style={{ color: '#dc2626' }}>*</span></label>
                    {documents.some(d => d.documentType === 'ADDRESS_PROOF') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span onClick={() => { const doc = documents.find(d => d.documentType === 'ADDRESS_PROOF'); if(doc) setPreviewDoc({url: doc.fileUrl, name: doc.originalName || 'Document'}); }} style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'underline', cursor: 'pointer' }}>{documents.find(d => d.documentType === 'ADDRESS_PROOF')?.originalName || 'View Document'}</span>
                        <span style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Supported: .png, .jpg, .jpeg, .pdf</p>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem', color: '#0f172a' }} />
                    <button 
                      type="button"
                      onClick={() => { handleUploadSubmit('ADDRESS_PROOF', file); }}
                      style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      {documents.some(d => d.documentType === 'ADDRESS_PROOF') ? 'Replace File' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'educational' && (
            <div style={sectionCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#10b981' }}>Educational Details</h2>
                <div style={{ display: 'flex', gap: '1rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input type="radio" name="institutionType" value="SCHOOL" checked={formData.institutionType === 'SCHOOL'} onChange={(e) => {
                      setFormData((prev: any) => ({ ...prev, institutionType: 'SCHOOL', department: 'NA', universityBoard: 'NA', semesterYear: 'NA' }));
                    }} /> School
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input type="radio" name="institutionType" value="COLLEGE" checked={formData.institutionType === 'COLLEGE'} onChange={(e) => {
                      setFormData((prev: any) => ({ ...prev, institutionType: 'COLLEGE', department: prev.department === 'NA' ? '' : prev.department, universityBoard: prev.universityBoard === 'NA' ? '' : prev.universityBoard, semesterYear: prev.semesterYear === 'NA' ? '' : prev.semesterYear }));
                    }} /> College/University
                  </label>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>{formData.institutionType === 'SCHOOL' ? 'School Name' : 'College Name'} <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="schoolCollegeName" value={formData.schoolCollegeName} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>{formData.institutionType === 'SCHOOL' ? 'School Address' : 'College Address'} <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="schoolCollegeAddress" value={formData.schoolCollegeAddress} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>{formData.institutionType === 'SCHOOL' ? 'Current Standard and Year' : 'Current Course and Year'} <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="currentCourse" value={formData.currentCourse} onChange={handleChange} placeholder={formData.institutionType === 'SCHOOL' ? "e.g. 10th Std, 2026" : "e.g. B.E 2nd Year"} />
                </div>
                
                {formData.institutionType === 'COLLEGE' && (
                  <>
                    <div>
                      <label style={labelStyle}>Department/Stream <span style={{ color: '#dc2626' }}>*</span></label>
                      <input required style={inputStyle} name="department" value={formData.department} onChange={handleChange} />
                    </div>
                    <div>
                      <label style={labelStyle}>University Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input required style={inputStyle} name="universityBoard" value={formData.universityBoard} onChange={handleChange} />
                    </div>
                    <div>
                      <label style={labelStyle}>Current Semester/Year <span style={{ color: '#dc2626' }}>*</span></label>
                      <input required style={inputStyle} name="semesterYear" value={formData.semesterYear} onChange={handleChange} />
                    </div>
                  </>
                )}

                <div>
                  <label style={labelStyle}>Academic Year <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="academicYear" value={formData.academicYear} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Medium of Study <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="mediumOfStudy" value={formData.mediumOfStudy} onChange={handleChange} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Previous Year Marks/Grade Details <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="previousMarks" value={formData.previousMarks} onChange={handleChange} />
                </div>
              </div>

              {/* ID Card Upload */}
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ ...labelStyle, color: '#047857', marginBottom: 0 }}>Upload College/School ID Card <span style={{ color: '#dc2626' }}>*</span></label>
                  {documents.some(d => d.documentType === 'STUDENT_ID_CARD') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span onClick={() => { const doc = documents.find(d => d.documentType === 'STUDENT_ID_CARD'); if(doc) setPreviewDoc({url: doc.fileUrl, name: doc.originalName || 'Document'}); }} style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'underline', cursor: 'pointer' }}>{documents.find(d => d.documentType === 'STUDENT_ID_CARD')?.originalName || 'View Document'}</span>
                      <span style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Supported: .png, .jpg, .jpeg, .pdf</p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                  <button 
                    type="button"
                    onClick={() => { handleUploadSubmit('STUDENT_ID_CARD', file); }}
                    style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {documents.some(d => d.documentType === 'STUDENT_ID_CARD') ? 'Replace File' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fee' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Term 1 Fee Details Card */}
              <div style={sectionCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#10b981', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>💳</span> Term 1 Fee Details
                    </h2>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Primary / Term 1 educational expenses</p>
                  </div>
                  <span style={{ padding: '0.3rem 0.75rem', background: '#ecfdf5', color: '#059669', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>
                    Term 1
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>Tuition Fee (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} type="number" name="tuitionFee" value={formData.tuitionFee} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hostel Fee (₹)</label>
                    <input style={inputStyle} type="number" name="hostelFee" value={formData.hostelFee} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Other Fees (₹)</label>
                    <input style={inputStyle} type="number" name="otherFee" value={formData.otherFee} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Total Annual / Term 1 Fees (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} type="number" name="totalAnnualFees" value={formData.totalAnnualFees} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Scholarship Received (₹)</label>
                    <input style={inputStyle} type="number" name="scholarshipReceived" value={formData.scholarshipReceived} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Balance Required (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} type="number" name="balanceRequired" value={formData.balanceRequired} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Paid Amount (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={labelStyle}>Final Balance (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required style={inputStyle} type="number" name="balanceAmount" value={formData.balanceAmount} onChange={handleChange} />
                  </div>
                </div>

                {/* Term 1 Fee Receipt Upload */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ ...labelStyle, color: '#047857', marginBottom: 0 }}>Upload Term 1 Fee Receipt <span style={{ color: '#dc2626' }}>*</span></label>
                    {documents.some(d => d.documentType === 'FEE_RECEIPT') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span onClick={() => { const doc = documents.find(d => d.documentType === 'FEE_RECEIPT'); if(doc) setPreviewDoc({url: doc.fileUrl, name: doc.originalName || 'Document'}); }} style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'underline', cursor: 'pointer' }}>{documents.find(d => d.documentType === 'FEE_RECEIPT')?.originalName || 'View Document'}</span>
                        <span style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Supported: .png, .jpg, .jpeg, .pdf</p>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                    <button 
                      type="button"
                      onClick={() => { handleUploadSubmit('FEE_RECEIPT', file); }}
                      style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {documents.some(d => d.documentType === 'FEE_RECEIPT') ? 'Replace File' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Term 2 Fee Details Section */}
              <div style={{ ...sectionCardStyle, border: formData.hasTerm2Fees ? '2px solid #3b82f6' : '1px dashed #94a3b8', background: formData.hasTerm2Fees ? '#ffffff' : '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ margin: 0, color: formData.hasTerm2Fees ? '#2563eb' : '#334155', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📑</span> Term 2 Fee Details
                      {formData.hasTerm2Fees && (
                        <span style={{ padding: '0.2rem 0.6rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                          ✓ Active
                        </span>
                      )}
                    </h2>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Add Term 2 fees for the same candidate without creating a new profile or separate registration.
                    </p>
                  </div>

                  {!formData.hasTerm2Fees ? (
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, hasTerm2Fees: true }))}
                      style={{ padding: '0.65rem 1.35rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>+</span> Add Term 2 Fees
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to disable Term 2 fees? Your entered Term 2 values will be preserved.')) {
                          setFormData((prev: any) => ({ ...prev, hasTerm2Fees: false }));
                        }
                      }}
                      style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      ✕ Disable Term 2
                    </button>
                  )}
                </div>

                {formData.hasTerm2Fees && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label style={labelStyle}>Term 2 Tuition Fee (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                        <input required style={inputStyle} type="number" name="term2TuitionFee" value={formData.term2TuitionFee} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={labelStyle}>Term 2 Hostel Fee (₹)</label>
                        <input style={inputStyle} type="number" name="term2HostelFee" value={formData.term2HostelFee} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={labelStyle}>Term 2 Other Fees (₹)</label>
                        <input style={inputStyle} type="number" name="term2OtherFee" value={formData.term2OtherFee} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={labelStyle}>Term 2 Total Fees (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                        <input required style={inputStyle} type="number" name="term2TotalAnnualFees" value={formData.term2TotalAnnualFees} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={labelStyle}>Term 2 Scholarship Received (₹)</label>
                        <input style={inputStyle} type="number" name="term2ScholarshipReceived" value={formData.term2ScholarshipReceived} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={labelStyle}>Term 2 Balance Required (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                        <input required style={inputStyle} type="number" name="term2BalanceRequired" value={formData.term2BalanceRequired} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={labelStyle}>Term 2 Paid Amount (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                        <input required style={inputStyle} type="number" name="term2PaidAmount" value={formData.term2PaidAmount} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={labelStyle}>Term 2 Final Balance (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                        <input required style={inputStyle} type="number" name="term2BalanceAmount" value={formData.term2BalanceAmount} onChange={handleChange} />
                      </div>
                    </div>

                    {/* Term 2 Fee Receipt Upload */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ ...labelStyle, color: '#1d4ed8', marginBottom: 0 }}>Upload Term 2 Fee Receipt</label>
                        {documents.some(d => d.documentType === 'FEE_RECEIPT_TERM2') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span onClick={() => { const doc = documents.find(d => d.documentType === 'FEE_RECEIPT_TERM2'); if(doc) setPreviewDoc({url: doc.fileUrl, name: doc.originalName || 'Document'}); }} style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>{documents.find(d => d.documentType === 'FEE_RECEIPT_TERM2')?.originalName || 'View Document'}</span>
                            <span style={{ padding: '0.2rem 0.5rem', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Supported: .png, .jpg, .jpeg, .pdf</p>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                        <button 
                          type="button"
                          onClick={() => { handleUploadSubmit('FEE_RECEIPT_TERM2', file); }}
                          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {documents.some(d => d.documentType === 'FEE_RECEIPT_TERM2') ? 'Replace File' : 'Upload'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Combined Fee Summary (If Term 2 is active) */}
              {formData.hasTerm2Fees && (
                <div style={{ ...sectionCardStyle, background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)', border: '1px solid #bbf7d0' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📊</span> Consolidated Fees Summary (Term 1 + Term 2)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem 1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Tuition Fees</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                        ₹{((Number(formData.tuitionFee) || 0) + (Number(formData.term2TuitionFee) || 0)).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem 1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Overall Fees</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                        ₹{((Number(formData.totalAnnualFees) || 0) + (Number(formData.term2TotalAnnualFees) || 0)).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem 1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid Amount</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>
                        ₹{((Number(formData.paidAmount) || 0) + (Number(formData.term2PaidAmount) || 0)).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem 1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Outstanding Balance</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginTop: '0.25rem' }}>
                        ₹{((Number(formData.balanceAmount) || 0) + (Number(formData.term2BalanceAmount) || 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trust Admin Sponsorship Info */}
              <div style={sectionCardStyle}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1.1rem', fontWeight: 700 }}>
                  Trust Sponsorship Details (Admin Managed)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>Trust Sponsored Amount (₹)</label>
                    <input style={{...inputStyle, background: '#f8fafc', color: '#64748b', cursor: 'not-allowed'}} type="number" value={profileData.amountSponsored || 0} readOnly disabled title="This amount is managed by the Trust admin." />
                  </div>
                  <div>
                    <label style={labelStyle}>Paid Amount (₹)</label>
                    <input style={{...inputStyle, background: '#f8fafc', color: '#64748b', cursor: 'not-allowed'}} type="number" value={profileData.amountPaid || 0} readOnly disabled title="This amount is managed by the Trust admin." />
                  </div>
                  <div>
                    <label style={labelStyle}>Sponsorship Status</label>
                    <input style={{...inputStyle, background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', fontWeight: 600, textTransform: 'capitalize'}} type="text" value={(profileData.sponsorStatus || 'PENDING').toLowerCase()} readOnly disabled title="This status is managed by the Trust admin." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parent' && (
            <div style={sectionCardStyle}>
              <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Parent/Guardian Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Father&apos;s Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="fatherName" value={formData.fatherName} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Father&apos;s Occupation <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Annual Income (Father)</label>
                  <input style={inputStyle} type="number" name="fatherIncome" value={formData.fatherIncome} onChange={handleChange} />
                </div>
                <div style={{ borderBottom: '1px solid #e2e8f0', gridColumn: 'span 2', margin: '0.5rem 0' }}></div>
                <div>
                  <label style={labelStyle}>Mother&apos;s Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="motherName" value={formData.motherName} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Mother&apos;s Occupation <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} />
                </div>


              </div>
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ ...labelStyle, color: '#047857', marginBottom: 0 }}>Upload Parent&apos;s PAN Card <span style={{ color: '#dc2626' }}>*</span></label>
                  {documents.some(d => d.documentType === 'PARENT_PAN_CARD') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span onClick={() => { const doc = documents.find(d => d.documentType === 'PARENT_PAN_CARD'); if(doc) setPreviewDoc({url: doc.fileUrl, name: doc.originalName || 'Document'}); }} style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'underline', cursor: 'pointer' }}>{documents.find(d => d.documentType === 'PARENT_PAN_CARD')?.originalName || 'View Document'}</span>
                      <span style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Supported: .png, .jpg, .jpeg, .pdf</p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                  <button 
                    type="button"
                    onClick={() => { handleUploadSubmit('PARENT_PAN_CARD', file); }}
                    style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {documents.some(d => d.documentType === 'PARENT_PAN_CARD') ? 'Replace File' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'background' && (
            <div style={sectionCardStyle}>
              <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Financial and Social Background</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Family Type <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required style={inputStyle} name="familyType" value={formData.familyType} onChange={handleChange}>
                    <option value="">Select Type</option>
                    <option value="JOINT">Joint Family</option>
                    <option value="NUCLEAR">Nuclear Family</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>House Type <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required style={inputStyle} name="houseType" value={formData.houseType} onChange={handleChange}>
                    <option value="">Select House Type</option>
                    <option value="OWNED">Owned</option>
                    <option value="RENTED">Rented</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Religion <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="religion" value={formData.religion} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Any Medical Issue in Family? <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required style={inputStyle} name="medicalIssue" value={formData.medicalIssue} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>First Graduate in Family? <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required style={inputStyle} name="firstGraduate" value={formData.firstGraduate} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </div>
              </div>

              {/* Ration Card Upload */}
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ ...labelStyle, color: '#047857', marginBottom: 0 }}>Upload Ration Card <span style={{ color: '#dc2626' }}>*</span></label>
                  {documents.some(d => d.documentType === 'RATION_CARD') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span onClick={() => { const doc = documents.find(d => d.documentType === 'RATION_CARD'); if(doc) setPreviewDoc({url: doc.fileUrl, name: doc.originalName || 'Document'}); }} style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'underline', cursor: 'pointer' }}>{documents.find(d => d.documentType === 'RATION_CARD')?.originalName || 'View Document'}</span>
                      <span style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Uploaded</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Supported: .png, .jpg, .jpeg, .pdf</p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                  <button 
                    type="button"
                    onClick={() => { handleUploadSubmit('RATION_CARD', file); }}
                    style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {documents.some(d => d.documentType === 'RATION_CARD') ? 'Replace File' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reference' && (
            <div style={sectionCardStyle}>
              <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Reference Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Reference Person Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="referenceName" value={formData.referenceName} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Designation <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="referenceDesignation" value={formData.referenceDesignation} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="referenceContact" value={formData.referenceContact} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Organization Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required style={inputStyle} name="referenceOrg" value={formData.referenceOrg} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Relationship with Student</label>
                  <input style={inputStyle} name="referenceRelation" value={formData.referenceRelation} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={sectionCardStyle}>
                <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Upload Documents</h2>
                <p style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                  Please upload all mandatory documents marked with an asterisk (<span style={{ color: '#dc2626' }}>*</span>). 
                  Supported formats: <strong>.png, .jpg, .jpeg, .pdf</strong>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  {[
                    { id: 'AADHAR', label: 'Aadhar Card', required: true },
                    { id: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', required: true },
                    { id: 'RATION_CARD', label: 'Ration Card', required: true },
                    { id: 'ADDRESS_PROOF', label: 'Address Proof', required: true },
                    { id: 'STUDENT_ID_CARD', label: 'Student ID Card', required: true },
                    { id: 'FEE_RECEIPT', label: 'Term 1 Fee Receipt', required: true },
                    ...(formData.hasTerm2Fees ? [{ id: 'FEE_RECEIPT_TERM2', label: 'Term 2 Fee Receipt', required: false }] : []),
                    { id: 'PARENT_PAN_CARD', label: "Parent's PAN Card", required: true },
                  ].map((doc) => {
                    const isUploaded = documents.some(d => d.documentType === doc.id);
                    return (
                      <div key={doc.id} style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                        backgroundColor: isUploaded ? '#f0fdf4' : '#ffffff'
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>
                            {doc.label} {doc.required && <span style={{ color: '#dc2626' }}>*</span>}
                          </span>
                          {isUploaded && (
                            <span style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span onClick={() => { const d = documents.find(x => x.documentType === doc.id); if(d) setPreviewDoc({url: d.fileUrl, name: d.originalName || 'Document'}); }} style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'underline', cursor: 'pointer' }}>{documents.find(x => x.documentType === doc.id)?.originalName || 'View Document'}</span>
                              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>✓ Uploaded</span>
                            </span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input 
                            type="file" 
                            id={`file-${doc.id}`}
                            style={{ display: 'none' }} 
                            onChange={(e) => {
                              const selectedFile = e.target.files?.[0];
                              if (selectedFile) {
                                handleUploadSubmit(doc.id, selectedFile);
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => document.getElementById(`file-${doc.id}`)?.click()}
                            style={{ 
                              padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                              background: isUploaded ? '#ecfdf5' : '#10b981',
                              color: isUploaded ? '#059669' : 'white',
                              border: isUploaded ? '1px solid #059669' : 'none'
                            }}
                            disabled={uploadLoading}
                          >
                            {isUploaded ? 'Replace File' : 'Upload File'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={sectionCardStyle}>
                <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Uploaded Documents</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Document Type</th>
                      <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>File Name</th>
                      <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc: any) => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#0f172a' }}>{doc.documentType.replace('_', ' ')}</td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>{doc.originalName || 'File uploaded'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: doc.status === 'VERIFIED' ? '#dcfce7' : doc.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                            color: doc.status === 'VERIFIED' ? '#166534' : doc.status === 'REJECTED' ? '#991b1b' : '#92400e'
                          }}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <a href={doc.fileUrl} download={doc.originalName || 'Document'} style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>Download</a>
                          {doc.status !== 'VERIFIED' && (
                            <button type="button" onClick={() => handleDeleteDocument(doc.id)} style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.2rem 0.5rem', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'declaration' && (
            <div style={sectionCardStyle}>
              <h2 style={{ marginBottom: '1.5rem', color: '#10b981' }}>Student Declaration</h2>
              
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem' }}>Document Verification Status:</h3>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { type: 'AADHAR', label: 'Aadhar Card', req: true },
                    { type: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', req: true },
                    { type: 'RATION_CARD', label: 'Ration Card', req: true },
                    { type: 'ADDRESS_PROOF', label: 'Address Proof', req: true },
                    { type: 'STUDENT_ID_CARD', label: 'Student ID Card', req: true },
                    { type: 'FEE_RECEIPT', label: 'Term 1 Fee Receipt', req: true },
                    ...(formData.hasTerm2Fees ? [{ type: 'FEE_RECEIPT_TERM2', label: 'Term 2 Fee Receipt', req: false }] : []),
                    { type: 'PARENT_PAN_CARD', label: "Parent's PAN Card", req: true }
                  ].map(doc => {
                    const isUploaded = documents.some(d => d.documentType === doc.type);
                    return (
                      <li key={doc.type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isUploaded ? '#059669' : '#dc2626' }}>
                        {isUploaded ? '✅' : '❌'} {doc.label} {isUploaded ? '(Uploaded)' : '(Required)'}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                <p style={{ color: '#166534', marginBottom: '1rem' }}>
                  I hereby declare that all the information provided above is true and correct to the best of my knowledge and belief.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    name="isDeclared" 
                    checked={formData.isDeclared} 
                    onChange={handleChange} 
                    style={{ width: '20px', height: '20px' }} 
                    disabled={!['AADHAR', 'BIRTH_CERTIFICATE', 'RATION_CARD', 'ADDRESS_PROOF', 'STUDENT_ID_CARD', 'FEE_RECEIPT', 'PARENT_PAN_CARD'].every(type => documents.some(d => d.documentType === type))}
                  />
                  <span style={{ fontWeight: 600 }}>I Agree to the Declaration</span>
                </label>
                {!['AADHAR', 'BIRTH_CERTIFICATE', 'RATION_CARD', 'ADDRESS_PROOF', 'STUDENT_ID_CARD', 'FEE_RECEIPT', 'PARENT_PAN_CARD'].every(type => documents.some(d => d.documentType === type)) && (
                  <p style={{ marginTop: '0.5rem', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                    Please upload all mandatory documents to agree.
                  </p>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ padding: '0.75rem 2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }} disabled={profileLoading}>
              {profileLoading ? 'Saving...' : (activeTab === 'declaration' ? 'Submit Final Profile' : 'Save and Continue')}
            </button>
          </div>
        </form>

        {previewDoc && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '80%', height: '80%', background: 'white', borderRadius: '8px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>{previewDoc.name}</h3>
                <button onClick={() => setPreviewDoc(null)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9', borderRadius: '4px' }}>
                {previewDoc.url.includes('application/pdf') ? (
                  <iframe src={previewDoc.url} width="100%" height="100%" style={{ border: 'none' }} title={previewDoc.name} />
                ) : (
                  <img src={previewDoc.url} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}



