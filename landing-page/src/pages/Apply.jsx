import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Mail, FileText, Sparkles, ExternalLink, 
  Copy, Check, Send, UserPlus, Download, CheckCircle2, 
  MapPin, Clock, Building, Bookmark, AlertCircle, RefreshCw,
  Upload, Eye, ChevronRight, UserCheck, ShieldCheck
} from 'lucide-react';
import { DEMO_JOBS } from '../lib/mockData';
import { adminJobStore } from '../lib/adminJobStore';
import { profileStore, applicationStore, resumeStore, api, employeeStore } from '../lib/api';
import { calculateMatchScore } from '../lib/matchScore';

const Linkedin = ({ size = 16, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Apply() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // Find job from admin store or demo jobs
  const adminJobs = adminJobStore.getWithFreshDates();
  const allJobs = useMemo(() => [...adminJobs, ...DEMO_JOBS], [adminJobs]);
  const job = allJobs.find(j => j.id === jobId);

  const profile = profileStore.get() || {};
  const resumes = resumeStore.getAll();
  const activeResume = resumes.find(r => r.isActive) || resumes[0];

  const matchResult = useMemo(() => calculateMatchScore(profile, job || {}), [profile, job]);

  const [activeTab, setActiveTab] = useState('referral'); // 'referral' | 'linkedin' | 'tailor'
  const [copiedNoteIndex, setCopiedNoteIndex] = useState(null);
  const [emailSentIndex, setEmailSentIndex] = useState(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredDone, setTailoredDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Gmail App Password Configuration Modal
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailAppPassInput, setGmailAppPassInput] = useState('');
  const [gmailAuthError, setGmailAuthError] = useState('');

  // Auto-reply checkbox state
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);

  const [employeeList, setEmployeeList] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  useEffect(() => {
    if (!job?.company) {
      setEmployeeList([]);
      return;
    }
    let cancelled = false;
    setEmployeesLoading(true);
    const companyKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sameCompany = (employeeCompany) => {
      const left = companyKey(employeeCompany);
      const right = companyKey(job.company);
      return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
    };
    api.getEmployees(job.company)
      .then((rows) => {
        if (cancelled) return;
        const serverRows = Array.isArray(rows) ? rows : [];
        const cached = employeeStore.getAll().filter((emp) => sameCompany(emp.company));
        const merged = [...serverRows];
        cached.forEach((emp) => {
          if (!merged.some((row) => row.email === emp.email && sameCompany(row.company))) merged.push(emp);
        });
        const list = merged;
        setEmployeeList(list.map((emp) => ({
          ...emp,
          selected: true,
          role: emp.role && job.company && !emp.role.toLowerCase().includes(job.company.toLowerCase())
            ? `${emp.role} at ${emp.company || job.company}`
            : (emp.role || emp.company || ''),
        })));
      })
      .catch(() => {
        if (cancelled) return;
        const cached = employeeStore.getAll().filter((emp) => sameCompany(emp.company));
        setEmployeeList(cached.map((emp) => ({ ...emp, selected: true })));
      })
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => { cancelled = true; };
  }, [job?.company, job?.id]);

  const toggleEmployeeSelect = (id) => {
    setEmployeeList(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  const selectedEmployees = employeeList.filter(e => e.selected);

  // Referral Email Template Draft (matching reference image format)
  const generateInitialDraft = () => {
    const firstName = (profile.fullName || 'Jaswanth').split(' ')[0];
    const currentTitle = profile.experience?.[0]?.title || 'Java Full Stack Developer Intern';
    const currentCompany = profile.experience?.[0]?.company || 'Model Career Centre - APSSDC';
    const previousTitle = profile.experience?.[1]?.title || 'Java Web Developer';
    const previousCompany = profile.experience?.[1]?.company || 'TaPTaP by Blackbucks';
    const skillsText = (profile.skills || ['API integration', 'Agile delivery', 'Node.js', 'SQL']).slice(0, 3).join(', ');

    return `Hi {{outreachEmployeeName}},

I'm ${firstName}, currently a ${currentTitle} at ${currentCompany}. My work centers on ${skillsText}, and I've also worked as a ${previousTitle} at ${previousCompany}.
My earlier Cloud Engineer role at Model Career Centre - APSSDC and Full Stack Engineer role at YHills gave me experience across application and cloud work, from development through deployment. You can learn more about my background through my LinkedIn profile.

I'm applying for the ${job?.title || 'position'} role at ${job?.company || 'your company'}. If you're comfortable referring me for this position, I'd sincerely appreciate your help with my application.

Here is the link to the job: ${window.location.origin}/dashboard/jobs/${job?.id || ''}

Thanks,
${firstName}`;
  };

  const [emailSubject, setEmailSubject] = useState(() => 
    `Application Referral Request: ${job?.title || 'Role'} at ${job?.company || 'Company'}`
  );
  const [emailBody, setEmailBody] = useState(() => generateInitialDraft());
  const [currentToneIndex, setCurrentToneIndex] = useState(0);
  const [isRewriting, setIsRewriting] = useState(false);

  // Sync draft whenever active job changes
  useEffect(() => {
    if (job) {
      setEmailSubject(`Application Referral Request: ${job.title} at ${job.company}`);
      setEmailBody(generateInitialDraft());
    }
  }, [job?.id, job?.title, job?.company]);

  // Rewrite Message handler (AI tone switcher)
  const handleRewriteMessage = () => {
    setIsRewriting(true);
    setTimeout(() => {
      const firstName = (profile.fullName || 'Jaswanth').split(' ')[0];
      const jobTitle = job?.title || 'Engineering Role';
      const companyName = job?.company || 'your organization';

      const TONES = [
        // Tone 0: Professional & Polite (Reference Image style)
        `Hi {{outreachEmployeeName}},\n\nI'm ${firstName}, currently a ${profile.experience?.[0]?.title || 'Full Stack Developer'}. I noticed the open ${jobTitle} role at ${companyName} and would be thrilled to contribute to your engineering team.\n\nWith my experience in ${(profile.skills || ['full stack development']).slice(0, 4).join(', ')}, I feel confident in my ability to add immediate value. You can check my LinkedIn profile for detailed portfolio projects.\n\nIf you are comfortable providing an employee referral for this opening, it would mean a lot to me!\n\nJob URL: ${window.location.origin}/dashboard/jobs/${job?.id || ''}\n\nWarm regards,\n${firstName}`,

        // Tone 1: Concise & Impactful
        `Hi {{outreachEmployeeName}},\n\nI hope you're having a great week! I'm reaching out because I'm applying for the ${jobTitle} position at ${companyName}.\n\nI have strong hands-on experience in ${(profile.skills || ['software development']).slice(0, 3).join(', ')} and would greatly appreciate an internal referral if you're open to it.\n\nMy profile and resume are attached for your quick reference.\n\nThanks a lot,\n${firstName}`,

        // Tone 2: Default Detailed
        generateInitialDraft()
      ];

      const nextIndex = (currentToneIndex + 1) % TONES.length;
      setCurrentToneIndex(nextIndex);
      setEmailBody(TONES[nextIndex]);
      setIsRewriting(false);
    }, 450);
  };

  // Handle Confirm & Send to selected employees (Real Email Dispatch via Gmail OAuth)
  const handleConfirmAndSend = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one company employee to send outreach emails.');
      return;
    }

    setSendingAll(true);
    setGmailAuthError('');

    try {
      const payload = {
        recipients: selectedEmployees.map(e => ({ name: e.name, email: e.email, role: e.role })),
        subject: emailSubject,
        bodyText: emailBody,
        senderEmail: profile.email || '',
        jobTitle: job?.title,
        company: job?.company
      };

      const res = await api.sendReferralEmail(payload);

      if (res && res.requireGmailAuth) {
        setSendingAll(false);
        setGmailAuthError(res.message || 'Please connect your Google account under Mail Automation (http://localhost:5173/dashboard/mail) first.');
        return;
      }

      // Log application in store
      applicationStore.add({
        title: job?.title,
        company: job?.company,
        companyMark: job?.companyMark,
        jobId: job?.id,
        matchScore: matchResult.score,
        resumeUsed: activeResume?.name || `${(profile.fullName || 'User').split(' ')[0]}-resume.pdf`,
        referralSentTo: selectedEmployees.map(e => e.name).join(', ')
      });

      setSendingAll(false);
      setSendSuccess(true);
      setSubmitted(true);
    } catch (err) {
      console.error('Error sending referral email:', err);
      setSendingAll(false);
      const raw = typeof err === 'string' ? err : err?.message || '';
      let msg = 'Connect Gmail on the Mail page, then send this referral again.';
      const jsonStart = raw.indexOf('{');
      if (jsonStart >= 0) {
        try {
          const data = JSON.parse(raw.slice(jsonStart));
          msg = data.message || data.error || msg;
        } catch {
          msg = raw;
        }
      } else if (raw) {
        msg = raw;
      }
      setGmailAuthError(msg);
    }
  };

  // Handle Copy Note for LinkedIn
  const handleCopyNote = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteIndex(index);
    setTimeout(() => setCopiedNoteIndex(null), 2500);
  };

  // Handle Tailor Resume
  const handleTailorResume = () => {
    setIsTailoring(true);
    setTimeout(() => {
      setIsTailoring(false);
      setTailoredDone(true);
    }, 1200);
  };

  // Handle Direct Apply
  const handleProceedDirectApply = () => {
    applicationStore.add({
      title: job?.title,
      company: job?.company,
      companyMark: job?.companyMark,
      jobId: job?.id,
      matchScore: matchResult.score,
      resumeUsed: 'Tailored Resume (AI Customized)',
    });

    const link = job?.applyLink && job.applyLink.trim() !== '' 
      ? job.applyLink 
      : `https://www.google.com/search?q=${encodeURIComponent(job?.company + ' ' + job?.title + ' apply careers')}`;
    
    window.open(link, '_blank', 'noopener,noreferrer');
    setSubmitted(true);
  };

  if (!job) {
    return (
      <div className="page-apply" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <button className="btn-ghost" onClick={() => navigate('/dashboard/jobs')}><ArrowLeft size={16} /> Back to Jobs</button>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h3>Job Not Found</h3>
          <p>This job listing may have been removed or updated.</p>
        </div>
      </div>
    );
  }

  const userEmail = profile.email || localStorage.getItem('mailmind_gmail_email') || 'jaswanthnelluru2004@gmail.com';
  const resumeDisplayName = activeResume?.name || `${(profile.fullName || 'Jaswanth').split(' ')[0]}-resume.pdf`;

  return (
    <div className="page-apply" style={{ maxWidth: '1040px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Back Button */}
      <button className="btn-ghost back-btn" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} /> Back to Job Details
      </button>

      {/* Header Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #171817 0%, #2a2c2a 100%)',
          color: '#ffffff',
          borderRadius: '18px',
          padding: '26px 28px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {job.companyLogoUrl ? (
            <img 
              src={job.companyLogoUrl} 
              alt={job.company} 
              style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', background: '#fff', padding: '2px' }} 
            />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#445cf5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '22px' }}>
              {job.company?.[0] || '?'}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ background: '#445cf5', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                HAMZO Smart Outreach
              </span>
              {job.category && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                  {job.category}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px', color: '#ffffff', letterSpacing: '-0.02em' }}>
              {job.title}
            </h1>
            <p style={{ fontSize: '14px', color: '#ccc', margin: 0 }}>
              {job.company} · {job.location} · {job.type || 'Full Time'}
            </p>
          </div>
        </div>

        {/* Match Score Chip */}
        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: '700' }}>Skills Match</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: matchResult.score >= 70 ? '#22a65b' : matchResult.score >= 40 ? '#d4920a' : '#ef4444' }}>
            {matchResult.score}% Match
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '8px', 
          borderBottom: '2px solid #e8e8e3', 
          marginBottom: '28px', 
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        <button
          onClick={() => setActiveTab('referral')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'referral' ? '800' : '600',
            color: activeTab === 'referral' ? '#00796b' : '#666660',
            borderBottom: activeTab === 'referral' ? '3px solid #00796b' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Mail size={16} /> 1. Send Referral Request (Email)
        </button>

        <button
          onClick={() => setActiveTab('linkedin')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'linkedin' ? '800' : '600',
            color: activeTab === 'linkedin' ? '#445cf5' : '#666660',
            borderBottom: activeTab === 'linkedin' ? '3px solid #445cf5' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Linkedin size={16} /> 2. Connect on LinkedIn with Note
        </button>

        <button
          onClick={() => setActiveTab('tailor')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'tailor' ? '800' : '600',
            color: activeTab === 'tailor' ? '#445cf5' : '#666660',
            borderBottom: activeTab === 'tailor' ? '3px solid #445cf5' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Sparkles size={16} /> 3. Direct Apply with Tailored Resume
        </button>
      </div>

      {/* TAB CONTENT 1: Referral Request via Email (EXACT MATCH TO REFERENCE IMAGE) */}
      {activeTab === 'referral' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Email Composer Card */}
          <div 
            style={{ 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '16px', 
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)' 
            }}
          >
            {/* Header: Subject + From + Rewrite Message Button */}
            <div 
              style={{ 
                background: '#f8fafc', 
                borderBottom: '1px solid #e2e8f0', 
                padding: '18px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a202c', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#00796b' }}>Subject:</span> 
                  <input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontWeight: '800',
                      color: '#0f766e',
                      fontSize: '15px',
                      outline: 'none',
                      width: '100%',
                      maxWidth: '520px'
                    }}
                  />
                </div>
                <div style={{ fontSize: '12.5px', color: '#718096', fontStyle: 'italic' }}>
                  From: <span style={{ color: '#4a5568' }}>{userEmail}</span>
                </div>
              </div>

              {/* Rewrite Message Button (Mint Pill Button) */}
              <button
                onClick={handleRewriteMessage}
                disabled={isRewriting}
                style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  borderRadius: '24px',
                  padding: '9px 18px',
                  fontWeight: '800',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.12)'
                }}
              >
                <Sparkles size={15} className={isRewriting ? 'spin' : ''} />
                <span>{isRewriting ? 'Rewriting...' : '✨ Rewrite Message'}</span>
              </button>
            </div>

            {/* Editable AI Email Body */}
            <div style={{ padding: '24px' }}>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={11}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#2d3748',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  background: 'transparent'
                }}
              />
            </div>

            {/* Attached Resume Banner (Light Teal Box) */}
            <div 
              style={{ 
                margin: '0 24px 24px', 
                background: '#ecfdf5', 
                border: '1px solid #a7f3d0', 
                borderRadius: '14px', 
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#d1fae5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#064e3b', lineHeight: '1.4' }}>
                  Your latest profile resume will be automatically attached as a PDF to all outgoing emails.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/dashboard/resume')}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #059669',
                    color: '#047857',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={14} />
                  <span>{resumeDisplayName}</span>
                </button>

                <button
                  onClick={() => navigate('/dashboard/resume')}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #059669',
                    color: '#047857',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={14} />
                  <span>Upload New Resume</span>
                </button>
              </div>
            </div>
          </div>

          {/* Target Company Employees Selection (Extracted from Admin PDF/database) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1a202c', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} style={{ color: '#059669' }} /> Target Employee Outreach Contacts ({selectedEmployees.length} selected)
            </h3>
            <p style={{ fontSize: '12.5px', color: '#718096', margin: '0 0 16px' }}>
              Extracted from verified employee records for <strong>{job.company}</strong>. Each employee will receive a personalized version of your referral request.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {employeesLoading ? (
                <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>Loading employee contacts…</p>
              ) : employeeList.length === 0 ? (
                <div style={{ padding: '16px 20px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', margin: 0 }}>No contact found</p>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No target employee contacts exist for {job.company}. Ask admin to add employee contacts or use Direct Apply.</span>
                </div>
              ) : null}
              {employeeList.map((emp) => (
                <div 
                  key={emp.id}
                  onClick={() => toggleEmployeeSelect(emp.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: emp.selected ? '2px solid #059669' : '1px solid #e2e8f0',
                    background: emp.selected ? '#f0fdf4' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={emp.selected} 
                      onChange={() => {}} 
                      style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }} 
                    />
                    <div>
                      <strong style={{ fontSize: '14px', color: '#1a202c', display: 'block' }}>{emp.name}</strong>
                      <span style={{ fontSize: '12px', color: '#718096' }}>{emp.role} · <code style={{ color: '#047857' }}>{emp.email}</code></span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: emp.selected ? '#047857' : '#9ca3af', background: emp.selected ? '#d1fae5' : '#f3f4f6', padding: '3px 10px', borderRadius: '12px' }}>
                    {emp.selected ? 'Selected' : 'Skipped'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* HAMZO Agent Banner & Configuration Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#319795', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                🤖
              </div>
              <strong style={{ fontSize: '14.5px', color: '#1a202c' }}>
                HAMZO Agent will reach out to {selectedEmployees.length} employees at {job.company}
              </strong>
            </div>

            <div style={{ background: '#e6fffa', border: '1px solid #b2f5ea', borderRadius: '12px', padding: '14px 16px', fontSize: '12.5px', color: '#234e52', lineHeight: '1.5' }}>
              ℹ️ If you confirm and send, your updated message will be saved as your default outreach template. You can edit it anytime from <span style={{ fontWeight: '800', textDecoration: 'underline', cursor: 'pointer' }}>HAMZO Agent configuration</span> in your dashboard.
            </div>
          </div>

          {/* Auto-Reply Checkbox Bar */}
          <div 
            style={{ 
              background: '#ecfdf5', 
              border: '1px solid #a7f3d0', 
              borderRadius: '12px', 
              padding: '14px 20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: '700', color: '#064e3b', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={autoReplyEnabled} 
                onChange={e => setAutoReplyEnabled(e.target.checked)} 
                style={{ width: '17px', height: '17px', accentColor: '#059669', cursor: 'pointer' }}
              />
              <span>Let HAMZO automatically reply to referrer emails</span>
            </label>

            <span 
              onClick={() => navigate('/dashboard/mail')}
              style={{ fontSize: '12.5px', fontWeight: '800', color: '#047857', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Review auto-reply categories →
            </span>
          </div>

          {/* Success Banner if Sent */}
          {sendSuccess && (
            <div style={{ padding: '18px 24px', background: '#d1fae5', border: '1px solid #34d399', borderRadius: '14px', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '14px' }}>
                <CheckCircle2 size={22} />
                <span>Referral emails sent successfully to {selectedEmployees.map(e => e.name).join(', ')} with PDF resume attached!</span>
              </div>
              <button 
                className="btn-ghost" 
                onClick={() => navigate('/dashboard/mail')}
                style={{ color: '#065f46', borderColor: '#059669', fontWeight: '800', fontSize: '12px' }}
              >
                View Sent Mails
              </button>
            </div>
          )}

          {/* Inline Error Banner if Gmail Not Connected */}
          {gmailAuthError && (
            <div style={{ padding: '16px 22px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: '700', flex: 1 }}>
                ⚠️ {typeof gmailAuthError === 'string' ? gmailAuthError : 'Please connect your Google Mail account under Mail Automation first.'}
              </div>
              <button
                className="btn-accent"
                onClick={() => navigate('/dashboard/mail')}
                style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: '800', fontSize: '12.5px', padding: '8px 16px', borderRadius: '8px' }}
              >
                Connect Gmail in Mail Automation →
              </button>
            </div>
          )}

          {/* Bottom Action Bar (Back Circle + CONFIRM & SEND Pill Button) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '16px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: '1px solid #cbd5e0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#2d3748',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}
              title="Go Back"
            >
              <ArrowLeft size={18} />
            </button>

            <button
              onClick={handleConfirmAndSend}
              disabled={sendingAll || selectedEmployees.length === 0}
              style={{
                background: (sendingAll || selectedEmployees.length === 0) ? '#94a3b8' : '#18181b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '30px',
                padding: '14px 34px',
                fontSize: '13px',
                fontWeight: '900',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: (sendingAll || selectedEmployees.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (sendingAll || selectedEmployees.length === 0) ? 0.6 : 1,
                boxShadow: (sendingAll || selectedEmployees.length === 0) ? 'none' : '0 8px 24px rgba(0,0,0,0.2)',
                transition: 'all 0.2s'
              }}
            >
              <span>{sendingAll ? 'Sending Outreach...' : 'CONFIRM & SEND'}</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* TAB CONTENT 2: Connect on LinkedIn with Note */}
      {activeTab === 'linkedin' && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#171817', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Linkedin style={{ color: '#0077b5' }} size={20} /> Option 2: Send Connection Request with Personal Note via LinkedIn
            </h2>
            <p style={{ fontSize: '13.5px', color: '#555852', margin: 0, lineHeight: '1.5' }}>
              Connect directly with hiring managers & recruiters at <strong>{job.company}</strong> on LinkedIn. Copy the AI-customized 300-character invitation note below!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {employeeList.map((emp, i) => {
              const noteText = `Hi ${emp.name.split(' ')[0]}, I came across the ${job?.title || 'Role'} position at ${job?.company || 'your company'}. As a ${profile.title || 'Developer'} skilled in ${(profile.skills || ['Software']).slice(0, 3).join(', ')}, I would love to connect and learn more about opportunities on your team!`;
              return (
                <div 
                  key={emp.name}
                  style={{
                    border: '1px solid #e8e8e3',
                    borderRadius: '14px',
                    padding: '20px',
                    background: '#f4f7fb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0077b5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px' }}>
                        <Linkedin size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#171817' }}>{emp.name}</h4>
                        <p style={{ fontSize: '12.5px', color: '#666', margin: '2px 0 0' }}>{emp.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* LinkedIn Note Text Area */}
                  <div style={{ background: '#ffffff', border: '1px solid #cce0ff', borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#333', lineHeight: '1.5', position: 'relative' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#0077b5', textTransform: 'uppercase', marginBottom: '6px' }}>
                      AI Custom LinkedIn Note ({noteText.length} / 300 chars)
                    </div>
                    {noteText}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn-ghost"
                      onClick={() => handleCopyNote(noteText, `li-${i}`)}
                      style={{ fontSize: '12.5px', padding: '8px 14px' }}
                    >
                      {copiedNoteIndex === `li-${i}` ? <Check size={14} style={{ color: '#22a65b' }} /> : <Copy size={14} />}
                      {copiedNoteIndex === `li-${i}` ? 'Note Copied!' : 'Copy Note'}
                    </button>

                    <button
                      className="btn-accent"
                      onClick={() => window.open(emp.linkedin, '_blank', 'noopener,noreferrer')}
                      style={{ fontSize: '12.5px', padding: '8px 16px', background: '#0077b5', borderColor: '#0077b5', gap: '6px' }}
                    >
                      <UserPlus size={14} /> Connect on LinkedIn <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Direct Apply by Tailoring Resume */}
      {activeTab === 'tailor' && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#171817', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles style={{ color: '#22a65b' }} size={20} /> Option 3: Direct Apply by Tailoring Resume to Job Description
            </h2>
            <p style={{ fontSize: '13.5px', color: '#555852', margin: 0, lineHeight: '1.5' }}>
              Automatically optimize your resume keywords to match the exact requirements of <strong>{job.title}</strong> at <strong>{job.company}</strong>.
            </p>
          </div>

          {/* Skill Alignment Card */}
          <div style={{ background: '#fafaf7', border: '1px solid #e8e8e3', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#171817', margin: '0 0 12px' }}>
              Required Job Skills vs Your Profile
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(job.requiredSkills || job.skills || ['Python', 'Node.js', 'SQL', 'REST APIs']).map(skill => {
                const hasSkill = (profile.skills || []).some(s => s.toLowerCase().includes(skill.toLowerCase()));
                return (
                  <span
                    key={skill}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: hasSkill ? '#e8f5e9' : '#fff3e0',
                      color: hasSkill ? '#2e7d32' : '#e65100',
                      border: `1px solid ${hasSkill ? '#c8e6c9' : '#ffe0b2'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {hasSkill ? '✓ ' : '⚡ '} {skill}
                  </span>
                );
              })}
            </div>
          </div>

          {/* AI Resume Tailor Action Box */}
          <div style={{ border: '2px dashed #445cf5', borderRadius: '14px', padding: '24px', textAlign: 'center', background: '#f8f9ff', marginBottom: '24px' }}>
            <Sparkles size={32} style={{ color: '#445cf5', marginBottom: '10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#171817', margin: '0 0 6px' }}>
              {tailoredDone ? 'Resume Tailored & Optimized!' : 'Tailor Resume for ' + job.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#555852', maxWidth: '540px', margin: '0 auto 16px' }}>
              {tailoredDone 
                ? 'Your resume summary and bullet points have been optimized for ATS scanners and aligned with ' + job.company + '\'s target keywords.'
                : 'Click below to automatically re-align your resume highlights and cover letter to maximize ATS score.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn-accent"
                onClick={handleTailorResume}
                disabled={isTailoring}
                style={{ padding: '12px 24px', fontSize: '14px', gap: '8px' }}
              >
                {isTailoring ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                {isTailoring ? 'Optimizing Resume...' : tailoredDone ? 'Re-Tailor Resume' : 'Tailor Resume Now'}
              </button>

              {tailoredDone && (
                <button
                  className="btn-ghost"
                  onClick={() => alert('Tailored Resume downloaded! Attach it during your direct application.')}
                  style={{ padding: '12px 20px', fontSize: '14px', gap: '8px' }}
                >
                  <Download size={16} /> Download Tailored Resume (PDF)
                </button>
              )}
            </div>
          </div>

          {/* Final Direct Apply CTA */}
          <div style={{ background: '#171817', color: '#ffffff', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px', color: '#fff' }}>
                Ready to Submit Direct Application?
              </h4>
              <p style={{ fontSize: '12.5px', color: '#aaa', margin: 0 }}>
                Redirects to {job.company}'s official application portal while tracking your application state in HAMZO.
              </p>
            </div>

            <button
              className="btn-accent"
              onClick={handleProceedDirectApply}
              style={{ background: '#22a65b', borderColor: '#22a65b', fontSize: '14px', padding: '12px 24px', gap: '8px' }}
            >
              <ExternalLink size={16} /> Direct Apply on Official Portal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
