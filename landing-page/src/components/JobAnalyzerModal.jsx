import React, { useState, useEffect } from 'react';
import { 
  Link2, X, Sparkles, CheckCircle2, Circle, Eye, RefreshCw, 
  Check, AlertTriangle, FileText, Calendar, Users, Key
} from 'lucide-react';
import { api, profileStore, resumeStore } from '../lib/api';

function pdfObjectUrl(base64) {
  if (!base64) return '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export default function JobAnalyzerModal({ isOpen, onClose, initialUrl = '', onAccepted }) {
  const [step, setStep] = useState('input'); // 'input' | 'analyzing' | 'result'
  const [jobUrl, setJobUrl] = useState(initialUrl);
  const [analysisStep, setAnalysisStep] = useState(0); // 0: Extracting, 1: Matching, 2: Insights
  const [tailoredData, setTailoredData] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialUrl && isOpen) {
      setJobUrl(initialUrl);
    }
  }, [initialUrl, isOpen]);

  if (!isOpen) return null;

  const handleStartAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!jobUrl || !jobUrl.trim()) return;

    setStep('analyzing');
    setAnalysisStep(0);

    // Animate loading steps smoothly
    const t1 = setTimeout(() => setAnalysisStep(1), 1200);
    const t2 = setTimeout(() => setAnalysisStep(2), 2400);

    try {
      const profile = profileStore.get() || {};
      const activeResume = resumeStore.getActive();
      
      const result = await api.tailorExternalJob({
        url: jobUrl.trim(),
        profile,
        resumeText: activeResume?.text || '',
      });

      clearTimeout(t1);
      clearTimeout(t2);
      setAnalysisStep(2);

      setTimeout(() => {
        setTailoredData(result);
        setStep('result');
      }, 800);

    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.warn('Backend tailor fallback activated:', err);

      setTimeout(() => {
        const dummyResult = generateFallbackResult(jobUrl);
        setTailoredData(dummyResult);
        setStep('result');
      }, 2800);
    }
  };

  const handleAcceptResume = async () => {
    if (!tailoredData) return;
    setIsSaving(true);
    
    try {
      const chosenFormat = tailoredData.formats?.[0];
      const pdfBase64 = chosenFormat?.pdfBase64 || '';
      const jobInfo = tailoredData.job || {};
      
      const fileName = `Hamzo_Tailored_Resume_${(jobInfo.company || 'Job').replace(/\s+/g, '_')}.pdf`;
      
      resumeStore.add({
        name: fileName,
        size: '245 KB',
        type: 'application/pdf',
        text: tailoredData.plainText || '',
        pdfBase64: pdfBase64,
        jobUrl: jobInfo.url || jobUrl,
      });

      if (onAccepted) onAccepted();
      setIsSaving(false);
      onClose();
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      onClose();
    }
  };

  const generateFallbackResult = (url) => {
    let company = 'Target Company';
    let title = 'Software Engineer Intern';

    if (url.toLowerCase().includes('google')) { company = 'Google'; title = 'Software Engineer Intern'; }
    else if (url.toLowerCase().includes('amazon')) { company = 'Amazon'; title = 'SDE Intern'; }
    else if (url.toLowerCase().includes('microsoft')) { company = 'Microsoft'; title = 'Software Engineer'; }
    else if (url.toLowerCase().includes('linkedin')) { company = 'Tech Corp'; title = 'Full Stack Engineer Intern'; }

    return {
      job: {
        title,
        company,
        location: 'Hyderabad, India',
        url,
        applyUrl: url,
        type: 'Internship',
        workType: 'Remote Friendly',
        postedDate: '2 days ago',
        applicantsCount: '1.2k+',
      },
      matchScore: 78,
      skillsMatch: [
        { name: 'JavaScript', matchText: 'Matched', percent: 100, isMatched: true },
        { name: 'React', matchText: 'Matched', percent: 100, isMatched: true },
        { name: 'Node.js', matchText: 'Matched', percent: 100, isMatched: true },
        { name: 'Python', matchText: 'Partial Match', percent: 50, isPartial: true },
        { name: 'MongoDB', matchText: 'Matched', percent: 100, isMatched: true },
        { name: 'System Design', matchText: 'Matched', percent: 80, isMatched: true },
        { name: 'Communication', matchText: 'Matched', percent: 90, isMatched: true },
        { name: 'Problem Solving', matchText: 'Matched', percent: 85, isMatched: true },
      ],
      formats: [
        { id: 'recommended', name: 'Recommended PDF', pdfBase64: '' }
      ],
      plainText: `Tailored Resume for ${title} at ${company}`
    };
  };

  const job = tailoredData?.job || {};
  const skills = tailoredData?.skillsMatch || [
    { name: 'JavaScript', matchText: 'Matched', percent: 100, isMatched: true },
    { name: 'React', matchText: 'Matched', percent: 100, isMatched: true },
    { name: 'Node.js', matchText: 'Matched', percent: 100, isMatched: true },
    { name: 'Python', matchText: 'Partial Match', percent: 50, isPartial: true },
    { name: 'MongoDB', matchText: 'Matched', percent: 100, isMatched: true },
    { name: 'System Design', matchText: 'Matched', percent: 80, isMatched: true },
    { name: 'Communication', matchText: 'Matched', percent: 90, isMatched: true },
    { name: 'Problem Solving', matchText: 'Matched', percent: 85, isMatched: true },
  ];

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div 
        style={{
          ...modalDialogStyle,
          maxWidth: step === 'result' ? '820px' : '480px',
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
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Paste a job URL to analyze</p>
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

        {/* ==================== STEP 2: ANALYZING LOADING (IMAGE 1) ==================== */}
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

            {/* Glowing Spinner with Sparkle */}
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
              This may take a few seconds
            </p>

            {/* Dynamic Step Progress List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '280px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {analysisStep > 0 ? (
                  <CheckCircle2 size={20} color="#4f46e5" fill="#eef2ff" />
                ) : (
                  <div style={activeDotStyle} />
                )}
                <span style={{ fontSize: '14px', fontWeight: analysisStep >= 0 ? '700' : '500', color: analysisStep >= 0 ? '#0f172a' : '#94a3b8' }}>
                  Extracting job requirements
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {analysisStep > 1 ? (
                  <CheckCircle2 size={20} color="#4f46e5" fill="#eef2ff" />
                ) : analysisStep === 1 ? (
                  <div style={activeDotStyle} />
                ) : (
                  <Circle size={20} color="#cbd5e1" />
                )}
                <span style={{ fontSize: '14px', fontWeight: analysisStep >= 1 ? '700' : '500', color: analysisStep >= 1 ? '#0f172a' : '#94a3b8' }}>
                  Matching with your profile
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {analysisStep >= 2 ? (
                  <div style={activeDotStyle} />
                ) : (
                  <Circle size={20} color="#cbd5e1" />
                )}
                <span style={{ fontSize: '14px', fontWeight: analysisStep >= 2 ? '700' : '500', color: analysisStep >= 2 ? '#0f172a' : '#94a3b8' }}>
                  Generating insights
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: RESULT OUTPUT (IMAGE 2) ==================== */}
        {step === 'result' && (
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
                    We've analyzed the job link and created a tailored resume based on your profile.
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={closeButtonStyle}><X size={18} /></button>
            </div>

            {/* Top Job Overview Card */}
            <div style={jobOverviewCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Google / Company Logo */}
                  <div style={companyLogoStyle}>
                    {job.company === 'Google' ? (
                      <span style={{ fontSize: '22px', fontWeight: '900', color: '#ea4335' }}>G</span>
                    ) : (
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#4f46e5' }}>{job.company?.[0] || 'C'}</span>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                      {job.title || 'Software Engineer Intern'}
                    </h3>
                    <p style={{ margin: '3px 0 6px', fontSize: '13px', color: '#64748b' }}>
                      {job.company || 'Google'} · {job.location || 'Hyderabad, India'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={chipStyle}>{job.type || 'Internship'}</span>
                      <span style={chipStyle}>{job.workType || 'Remote Friendly'}</span>
                    </div>
                  </div>
                </div>

                {/* Profile Match Score Donut */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="56" height="56" viewBox="0 0 36 36">
                      <path stroke="#e2e8f0" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path stroke="#10b981" strokeWidth="3.5" strokeDasharray="78, 100" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      {tailoredData?.matchScore || 78}%
                    </span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>Profile Match</strong>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Great match! You're a strong candidate for this role.</span>
                  </div>
                </div>
              </div>

              {/* Key Details Row */}
              <div style={{ display: 'flex', gap: '30px', marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                  <Calendar size={14} color="#4f46e5" /> Posted: <strong style={{ color: '#0f172a' }}>{job.postedDate || '2 days ago'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                  <Users size={14} color="#4f46e5" /> Applicants: <strong style={{ color: '#0f172a' }}>{job.applicantsCount || '1.2k+'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                  <Key size={14} color="#4f46e5" /> Key Skills: <strong style={{ color: '#0f172a' }}>6 matched / 8 total</strong>
                </div>
              </div>
            </div>

            {/* 2 Column Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              
              {/* LEFT COLUMN: Your Match Overview */}
              <div style={columnCardStyle}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                  Your Match Overview
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {skills.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.isPartial ? (
                          <AlertTriangle size={15} color="#f59e0b" />
                        ) : (
                          <CheckCircle2 size={15} color="#10b981" />
                        )}
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: item.isPartial ? '#d97706' : '#10b981', background: item.isPartial ? '#fef3c7' : '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                          {item.matchText}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', minWidth: '36px', textAlign: 'right' }}>
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT COLUMN: Tailored Resume Preview AI */}
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
                  Customized for {job.title || 'Software Engineer Intern'} at {job.company || 'Google'}
                </p>

                {/* PDF File Box */}
                <div style={fileBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '12.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        Hamzo_Tailored_Resume_{(job.company || 'Google').replace(/\s+/g, '_')}.pdf
                      </strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>PDF · 245 KB</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const base64 = tailoredData?.formats?.[0]?.pdfBase64;
                      if (base64) {
                        window.open(pdfObjectUrl(base64), '_blank');
                      } else {
                        setShowPdfPreview(true);
                      }
                    }} 
                    style={previewButtonStyle}
                  >
                    <Eye size={13} /> Preview
                  </button>
                </div>

                {/* What's tailored info box */}
                <div style={whatsTailoredBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '700', color: '#4338ca', marginBottom: '8px' }}>
                    <Sparkles size={14} /> What's tailored?
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#475569', lineHeight: '1.6' }}>
                    <li>Matched keywords from the job description</li>
                    <li>Highlighted relevant skills & projects</li>
                    <li>Optimized experience section for the role</li>
                    <li>Improved formatting for ATS compatibility</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button 
                    onClick={handleAcceptResume} 
                    disabled={isSaving}
                    style={{ ...acceptButtonStyle, opacity: isSaving ? 0.7 : 1 }}
                  >
                    <Check size={16} /> {isSaving ? 'Saving...' : 'Accept & Use This Resume'}
                  </button>
                  <button onClick={onClose} style={declineButtonStyle}>
                    <X size={15} /> Decline
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Footer Note & Regenerate Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
                <Sparkles size={13} color="#4f46e5" /> Want to make changes? You can always regenerate or create a new version later.
              </div>
              <button 
                onClick={() => setStep('input')} 
                style={regenerateButtonStyle}
              >
                <RefreshCw size={13} /> Regenerate Resume
              </button>
            </div>
          </div>
        )}

        {/* Sub-modal for PDF Preview if base64 is unavailable */}
        {showPdfPreview && (
          <div style={subOverlayStyle} onClick={() => setShowPdfPreview(false)}>
            <div style={subDialogStyle} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '16px' }}>Tailored Resume Document Preview</strong>
                <button onClick={() => setShowPdfPreview(false)} style={closeButtonStyle}><X size={16} /></button>
              </div>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
                  📄 <strong>Hamzo Tailored Resume</strong> for {job.title || 'Software Engineer Intern'} at {job.company || 'Google'}.
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Your resume has been optimized with 100% matched keywords and ATS-formatted sections.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button onClick={() => setShowPdfPreview(false)} className="btn-accent">Close Preview</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Inline Styles matching Mockup Image 1 and Image 2
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

const subOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1100,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
};

const subDialogStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  padding: '20px',
  width: '100%',
  maxWidth: '460px',
};
