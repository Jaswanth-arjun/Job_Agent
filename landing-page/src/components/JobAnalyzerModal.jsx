import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2, X, Sparkles, CheckCircle2, Circle, Eye, RefreshCw,
  Check, AlertTriangle, FileText, Calendar, Users, Key, Download
} from 'lucide-react';
import { api, profileStore, resumeStore } from '../lib/api';
import { adminJobStore } from '../lib/adminJobStore';
import { DEMO_JOBS } from '../lib/mockData';

/* ── helpers ─────────────────────────────────────────────── */

function pdfObjectUrl(base64) {
  if (!base64) return '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

function openPdf(base64) {
  if (!base64) return;
  window.open(pdfObjectUrl(base64), '_blank');
}

function downloadPdf(base64, filename) {
  if (!base64) return;
  const link = document.createElement('a');
  link.href = pdfObjectUrl(base64);
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  link.click();
}

/** Map Profile.jsx field names to the resume backend format */
function mapProfileForBackend(profile) {
  const mapped = { ...profile };
  if (profile.education?.length) {
    mapped.education = profile.education.map((e) => ({
      degree: [e.degree, e.branch].filter(Boolean).join(' in '),
      school: e.institution || e.school || '',
      dates: e.graduationYear || e.dates || '',
      detail: e.cgpa ? `CGPA: ${e.cgpa}` : (e.detail || ''),
    }));
  }
  if (profile.experience?.length) {
    mapped.experience = profile.experience.map((e) => ({
      title: e.title || '',
      company: e.company || '',
      dates: e.duration || e.dates || '',
      description: e.description || '',
      detail: e.description || e.detail || '',
    }));
  }
  if (profile.projects?.length) {
    mapped.projects = profile.projects.map((p) => ({
      name: p.title || p.name || '',
      stack: p.technologies || p.stack || '',
      url: p.link || p.url || '',
      detail: p.description || p.detail || '',
      linkLabel: (p.link || p.url) ? 'GitHub' : '',
    }));
  }
  if (profile.links) {
    if (!mapped.linkedin && profile.links.linkedin) mapped.linkedin = profile.links.linkedin;
    if (!mapped.github && profile.links.github) mapped.github = profile.links.github;
  }
  return mapped;
}

/** Build rich resumeText from profile + active resume text, using mapped field names */
function buildResumeText(profile, activeResumeText) {
  const mapped = mapProfileForBackend(profile);
  const profileResume = [
    profile.skills?.length ? `Skills: ${profile.skills.join(', ')}` : '',
    ...(mapped.experience || []).map(item =>
      [item.title, item.company, item.dates, item.description || item.detail].filter(Boolean).join(' ')
    ),
    ...(mapped.education || []).map(item =>
      [item.degree, item.school, item.dates, item.detail].filter(Boolean).join(' ')
    ),
    ...(mapped.projects || []).map(item =>
      [item.name, item.stack, item.detail].filter(Boolean).join(' ')
    ),
  ].filter(Boolean).join('\n');
  return [activeResumeText, profileResume].filter(Boolean).join('\n').slice(0, 8000);
}

/** Extract skills from the API response (addedKeywords / keywords) and compare with profile */
function buildSkillsMatch(apiResult, profile) {
  const jobKeywords = apiResult.job?.keywords || [];
  const addedKeywords = apiResult.addedKeywords || [];
  const removedKeywords = apiResult.removedKeywords || [];
  const profileSkills = (profile.skills || []).map(s => s.toLowerCase());

  const matchedSkills = [];
  const seenLower = new Set();

  // Skills that are both in the job and in the user's profile
  for (const kw of jobKeywords) {
    const lower = kw.toLowerCase();
    if (seenLower.has(lower)) continue;
    seenLower.add(lower);
    const inProfile = profileSkills.some(ps => ps.includes(lower) || lower.includes(ps));
    matchedSkills.push({
      name: kw,
      matchText: inProfile ? 'Matched' : 'Added',
      percent: inProfile ? 100 : 70,
      isMatched: inProfile,
      isPartial: !inProfile,
    });
  }

  // Added keywords not in original profile
  for (const kw of addedKeywords) {
    const lower = kw.toLowerCase();
    if (seenLower.has(lower)) continue;
    seenLower.add(lower);
    matchedSkills.push({
      name: kw,
      matchText: 'Added',
      percent: 70,
      isMatched: false,
      isPartial: true,
    });
  }

  // Profile skills that matched the job
  for (const sk of (profile.skills || [])) {
    const lower = sk.toLowerCase();
    if (seenLower.has(lower)) continue;
    seenLower.add(lower);
    const inJob = jobKeywords.some(jk => jk.toLowerCase().includes(lower) || lower.includes(jk.toLowerCase()));
    if (inJob) {
      matchedSkills.push({ name: sk, matchText: 'Matched', percent: 100, isMatched: true, isPartial: false });
    }
  }

  return matchedSkills.slice(0, 10);
}

/** Compute match score from skills */
function computeMatchScore(skillsMatch) {
  if (!skillsMatch.length) return 0;
  const totalPercent = skillsMatch.reduce((sum, s) => sum + s.percent, 0);
  return Math.round(totalPercent / skillsMatch.length);
}

/* ── main component ──────────────────────────────────────── */

export default function JobAnalyzerModal({ isOpen, onClose, initialUrl = '', onAccepted }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('input');         // 'input' | 'analyzing' | 'result' | 'error'
  const [jobUrl, setJobUrl] = useState(initialUrl);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [tailoredData, setTailoredData] = useState(null);
  const [skillsMatch, setSkillsMatch] = useState([]);
  const [matchScore, setMatchScore] = useState(0);
  const [formatId, setFormatId] = useState('recommended');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setJobUrl(initialUrl || '');
      setTailoredData(null);
      setSkillsMatch([]);
      setMatchScore(0);
      setFormatId('recommended');
      setShowPdfPreview(false);
      setIsSaving(false);
      setErrorMsg('');
      setAnalysisStep(0);
    }
  }, [isOpen, initialUrl]);

  if (!isOpen) return null;

  /* ── Actual API call with proper field mapping ── */
  const handleStartAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!jobUrl || !jobUrl.trim()) return;

    setStep('analyzing');
    setAnalysisStep(0);
    setErrorMsg('');

    // Animate loading steps independently as the real API works
    const t1 = setTimeout(() => setAnalysisStep(1), 2000);
    const t2 = setTimeout(() => setAnalysisStep(2), 5000);

    try {
      const rawProfile = profileStore.get() || {};
      const mappedProfile = mapProfileForBackend(rawProfile);
      const allResumes = resumeStore.getAll();
      const active = allResumes.find(r => r.isActive) || allResumes[0];
      const resumeText = buildResumeText(rawProfile, active?.text || '');

      const result = await api.tailorExternalJob({
        url: jobUrl.trim(),
        profile: mappedProfile,
        resumeText,
      });

      clearTimeout(t1);
      clearTimeout(t2);
      setAnalysisStep(2);

      // Build real skills match from API response
      const skills = buildSkillsMatch(result, rawProfile);
      const score = computeMatchScore(skills);

      setTimeout(() => {
        setTailoredData(result);
        setSkillsMatch(skills);
        setMatchScore(score);
        setFormatId(result.recommendedId || 'recommended');
        setStep('result');
      }, 600);

    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.error('Tailor API error:', err);

      // Parse meaningful error message
      const raw = err.message || '';
      let message = 'Could not tailor a resume for that link.';
      if (/failed to fetch|networkerror|load failed|fetch/i.test(raw)) {
        message = 'Could not connect to the server. Make sure the backend is running (npm start) and try again.';
      } else if (/timeout|timed out|aborted/i.test(raw)) {
        message = 'The request timed out. The job page may be slow or unreachable. Try a different link or try again.';
      } else {
        const jsonStart = raw.indexOf('{');
        if (jsonStart >= 0) {
          try { message = JSON.parse(raw.slice(jsonStart)).error || message; } catch { message = raw; }
        } else if (raw) message = raw;
      }

      setErrorMsg(message);
      setStep('error');
    }
  };

  /* ── Accept tailored resume — uses actual profile data ── */
  const handleAcceptResume = () => {
    if (!tailoredData) return;
    setIsSaving(true);

    try {
      const rawProfile = profileStore.get() || {};
      const profile = mapProfileForBackend(rawProfile);
      if (!profile.fullName) {
        const allResumes = resumeStore.getAll();
        const active = allResumes.find(r => r.isActive) || allResumes[0];
        profile.fullName = active?.name?.replace(/\.[^/.]+$/, '') || 'Candidate';
      }
      const chosen = tailoredData.formats?.find(f => f.id === formatId) || tailoredData.formats?.[0];
      if (!chosen?.pdfBase64) {
        setErrorMsg('The tailored PDF is missing. Please regenerate.');
        setIsSaving(false);
        return;
      }

      const firstName = (profile.fullName || 'resume').split(' ')[0];
      const company = (tailoredData.job?.company || 'job').replace(/\s+/g, '-');
      const fileName = `${firstName}-${company}-resume.pdf`;

      resumeStore.add({
        name: fileName,
        size: '1 page PDF',
        type: 'application/pdf',
        text: tailoredData.plainText || '',
        pdfBase64: chosen.pdfBase64,
        jobUrl: tailoredData.job?.applyUrl || tailoredData.job?.url || jobUrl,
      });

      // Find or register the job in adminJobStore so Apply page can load it
      const jobTitle = tailoredData.job?.title || 'Software Engineer';
      const companyName = tailoredData.job?.company || 'Company';
      const location = tailoredData.job?.location || 'Remote';
      
      const allJobs = [...adminJobStore.getWithFreshDates(), ...DEMO_JOBS];
      let targetJob = allJobs.find(j => 
        j.title?.toLowerCase().trim() === jobTitle.toLowerCase().trim() &&
        j.company?.toLowerCase().trim() === companyName.toLowerCase().trim()
      );

      if (!targetJob) {
        targetJob = adminJobStore.add({
          title: jobTitle,
          company: companyName,
          companyLogoUrl: tailoredData.job?.logo || '',
          location: location,
          category: 'Freshers',
          type: 'Full Time',
          applyLink: tailoredData.job?.applyUrl || jobUrl,
          skills: tailoredData.job?.keywords || ['Software Development'],
          description: tailoredData.plainText || '',
        });
      }

      if (onAccepted) onAccepted();
      setIsSaving(false);
      onClose();

      // Navigate to Apply page for this job
      navigate(`/dashboard/apply/${targetJob.id}`);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to save resume. Try again.');
      setIsSaving(false);
    }
  };

  /* ── Derived values ── */
  const job = tailoredData?.job || {};
  const chosenFormat = tailoredData?.formats?.find(f => f.id === formatId) || tailoredData?.formats?.[0];
  const profile = profileStore.get() || {};
  const matchedCount = skillsMatch.filter(s => s.isMatched).length;
  const totalCount = skillsMatch.length;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        style={{
          ...modalDialogStyle,
          maxWidth: step === 'result' ? '860px' : '480px',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ==================== STEP 1: INPUT URL ==================== */}
        {step === 'input' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Link2 size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>Add Job Link</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Paste a job URL to analyze & tailor your resume</p>
                </div>
              </div>
              <button onClick={onClose} style={closeButtonStyle}><X size={16} /></button>
            </div>

            <form onSubmit={handleStartAnalysis}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
                  Job Page URL
                </label>
                <input
                  type="url"
                  placeholder="https://boards.greenhouse.io/... or https://jobs.lever.co/..."
                  value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    color: '#0f172a'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Analyze & Tailor <Sparkles size={15} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================== STEP 2: ANALYZING (Real API in progress) ==================== */}
        {step === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '20px 10px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Link2 size={18} />
                </div>
                <strong style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Add Job Link</strong>
              </div>
              <button onClick={onClose} style={closeButtonStyle}><X size={16} /></button>
            </div>

            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '30px auto 20px' }}>
              <div style={spinnerRingStyle} />
              <div style={spinnerCenterStyle}>
                <Sparkles size={28} color="#4f46e5" />
              </div>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
              Analyzing job...
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 32px' }}>
              Reading the job page and tailoring your resume — this may take 15–30 seconds
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '280px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {analysisStep > 0
                  ? <CheckCircle2 size={20} color="#4f46e5" fill="#eef2ff" />
                  : <div style={activeDotStyle} />}
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  Extracting job requirements
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {analysisStep > 1
                  ? <CheckCircle2 size={20} color="#4f46e5" fill="#eef2ff" />
                  : analysisStep === 1
                    ? <div style={activeDotStyle} />
                    : <Circle size={20} color="#cbd5e1" />}
                <span style={{ fontSize: '14px', fontWeight: analysisStep >= 1 ? '700' : '500', color: analysisStep >= 1 ? '#0f172a' : '#94a3b8' }}>
                  Matching with your profile
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {analysisStep >= 2
                  ? <div style={activeDotStyle} />
                  : <Circle size={20} color="#cbd5e1" />}
                <span style={{ fontSize: '14px', fontWeight: analysisStep >= 2 ? '700' : '500', color: analysisStep >= 2 ? '#0f172a' : '#94a3b8' }}>
                  Generating tailored resume
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ERROR STATE ==================== */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <strong style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Analysis Failed</strong>
              <button onClick={onClose} style={closeButtonStyle}><X size={16} /></button>
            </div>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={32} />
            </div>
            <p style={{ fontSize: '14px', color: '#b91c1c', fontWeight: '600', margin: '0 0 8px' }}>{errorMsg}</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 24px' }}>
              Make sure the backend server is running and the job URL is a valid public page.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => { setStep('input'); setErrorMsg(''); }} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} /> Try Again
              </button>
              <button onClick={onClose} className="btn-accent">Close</button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: REAL RESULT OUTPUT ==================== */}
        {step === 'result' && tailoredData && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Link2 size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Job Analysis & Tailored Resume
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                    We've analyzed the job and created a tailored one-page resume for you.
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={closeButtonStyle}><X size={18} /></button>
            </div>

            {/* Job Overview Card */}
            <div style={jobOverviewCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={companyLogoStyle}>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#4f46e5' }}>
                      {(job.company || 'C')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                      {job.title || 'Job Role'}
                    </h3>
                    <p style={{ margin: '3px 0 6px', fontSize: '13px', color: '#64748b' }}>
                      {job.company || 'Company'} {profile.location ? `· ${profile.location}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(job.keywords || []).slice(0, 4).map(kw => (
                        <span key={kw} style={chipStyle}>{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Match Score Donut */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="56" height="56" viewBox="0 0 36 36">
                      <path stroke="#e2e8f0" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path
                        stroke={matchScore >= 70 ? '#10b981' : matchScore >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="3.5"
                        strokeDasharray={`${matchScore}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      {matchScore}%
                    </span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>Profile Match</strong>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {matchScore >= 70 ? "Great match! You're a strong candidate." : matchScore >= 50 ? 'Good match with room to grow.' : 'Consider improving key skills.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Details Row */}
              <div style={{ display: 'flex', gap: '30px', marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                  <Key size={14} color="#4f46e5" /> Key Skills: <strong style={{ color: '#0f172a' }}>{matchedCount} matched / {totalCount} total</strong>
                </div>
                {tailoredData.addedKeywords?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                    <Sparkles size={14} color="#10b981" /> Added: <strong style={{ color: '#0f172a' }}>{tailoredData.addedKeywords.slice(0, 3).join(', ')}</strong>
                  </div>
                )}
                {tailoredData.formats?.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                    <FileText size={14} color="#4f46e5" /> Formats: <strong style={{ color: '#0f172a' }}>{tailoredData.formats.length} versions</strong>
                  </div>
                )}
              </div>
            </div>

            {/* 2 Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

              {/* LEFT: Your Match Overview */}
              <div style={columnCardStyle}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                  Your Match Overview
                </h4>
                {skillsMatch.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>No keywords returned by the server. Add more skills to your profile.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {skillsMatch.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.isPartial
                            ? <AlertTriangle size={15} color="#f59e0b" />
                            : <CheckCircle2 size={15} color="#10b981" />}
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: '600',
                            color: item.isPartial ? '#d97706' : '#10b981',
                            background: item.isPartial ? '#fef3c7' : '#ecfdf5',
                            padding: '2px 8px', borderRadius: '6px'
                          }}>
                            {item.matchText}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', minWidth: '36px', textAlign: 'right' }}>
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: Tailored Resume Preview */}
              <div style={columnCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                      Tailored Resume Preview
                    </h4>
                    <span style={{ fontSize: '10px', fontWeight: '800', background: '#f3e8ff', color: '#9333ea', padding: '2px 6px', borderRadius: '6px' }}>
                      AI
                    </span>
                  </div>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
                  Customized for {job.title || 'this role'} at {job.company || 'the company'}
                </p>

                {/* Format Selector (if multiple formats) */}
                {tailoredData.formats?.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {tailoredData.formats.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFormatId(f.id)}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                          border: formatId === f.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          background: formatId === f.id ? '#eef2ff' : '#ffffff',
                          color: formatId === f.id ? '#4f46e5' : '#64748b',
                        }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* PDF File Box */}
                <div style={fileBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '12.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {(profile.fullName || 'Resume').split(' ')[0]}-{(job.company || 'job').replace(/\s+/g, '-')}-resume.pdf
                      </strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>PDF · 1 page</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openPdf(chosenFormat?.pdfBase64)}
                      disabled={!chosenFormat?.pdfBase64}
                      style={{ ...previewButtonStyle, opacity: chosenFormat?.pdfBase64 ? 1 : 0.4 }}
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      onClick={() => {
                        const name = `${(profile.fullName || 'resume').split(' ')[0]}-${(job.company || 'job').replace(/\s+/g, '-')}-resume`;
                        downloadPdf(chosenFormat?.pdfBase64, name);
                      }}
                      disabled={!chosenFormat?.pdfBase64}
                      style={{ ...previewButtonStyle, opacity: chosenFormat?.pdfBase64 ? 1 : 0.4 }}
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>

                {/* What's tailored info box */}
                <div style={whatsTailoredBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '700', color: '#4338ca', marginBottom: '8px' }}>
                    <Sparkles size={14} /> What's tailored?
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#475569', lineHeight: '1.6' }}>
                    {tailoredData.addedKeywords?.length > 0 && (
                      <li>Added keywords: {tailoredData.addedKeywords.join(', ')}</li>
                    )}
                    {tailoredData.removedKeywords?.length > 0 && (
                      <li>Removed irrelevant: {tailoredData.removedKeywords.join(', ')}</li>
                    )}
                    <li>Rephrased summary to lead with "{job.title || 'the role'}"</li>
                    <li>Optimized for ATS compatibility</li>
                    <li>Fitted to one page</li>
                  </ul>
                </div>

                {/* Error message if any */}
                {errorMsg && (
                  <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>{errorMsg}</p>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={handleAcceptResume}
                    disabled={isSaving || !chosenFormat?.pdfBase64}
                    style={{ ...acceptButtonStyle, opacity: (isSaving || !chosenFormat?.pdfBase64) ? 0.6 : 1 }}
                  >
                    <Check size={16} /> {isSaving ? 'Saving...' : 'Accept & Save Resume'}
                  </button>
                  <button onClick={onClose} style={declineButtonStyle}>
                    <X size={15} /> Decline
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
                <Sparkles size={13} color="#4f46e5" /> Want different results? Regenerate or try a different URL.
              </div>
              <button onClick={() => { setStep('input'); setTailoredData(null); setErrorMsg(''); }} style={regenerateButtonStyle}>
                <RefreshCw size={13} /> Regenerate
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Inline Styles ─────────────────────────────────────── */

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(6px)',
  padding: '20px',
};

const modalDialogStyle = {
  background: '#ffffff',
  borderRadius: '24px',
  width: '100%',
  padding: '28px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  border: '1px solid #e2e8f0',
  position: 'relative',
  transition: 'max-width 0.25s ease',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeButtonStyle = {
  border: 'none',
  background: '#f1f5f9',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#64748b',
};

const spinnerRingStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  border: '4px solid #e0e7ff',
  borderTopColor: '#4f46e5',
  animation: 'spin 1s linear infinite',
};

const spinnerCenterStyle = {
  position: 'absolute',
  inset: '10px',
  borderRadius: '50%',
  background: '#eef2ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const activeDotStyle = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: '#4f46e5',
  boxShadow: '0 0 0 4px #e0e7ff',
};

const jobOverviewCardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
};

const companyLogoStyle = {
  width: '46px',
  height: '46px',
  borderRadius: '12px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const chipStyle = {
  fontSize: '11px',
  fontWeight: '700',
  background: '#ecfdf5',
  color: '#10b981',
  padding: '3px 10px',
  borderRadius: '20px',
};

const columnCardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
};

const fileBoxStyle = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '14px',
};

const previewButtonStyle = {
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: '700',
  color: '#334155',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const whatsTailoredBoxStyle = {
  background: '#f5f3ff',
  border: '1px solid #ddd6fe',
  borderRadius: '12px',
  padding: '14px',
  flex: 1,
};

const acceptButtonStyle = {
  flex: 1,
  background: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
};

const declineButtonStyle = {
  background: '#ef4444',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
};

const regenerateButtonStyle = {
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  borderRadius: '10px',
  padding: '7px 14px',
  fontSize: '12px',
  fontWeight: '700',
  color: '#334155',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};
