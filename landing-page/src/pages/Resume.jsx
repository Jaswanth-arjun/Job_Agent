import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, CheckCircle, Clock } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { resumeStore } from '../lib/api';

export default function ResumeManager() {
  const [resumes, setResumes] = useState(() => resumeStore.getAll());
  const fileRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resume = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type,
    };
    setResumes(resumeStore.add(resume));
    e.target.value = '';
  };

  const handleSetActive = (id) => setResumes(resumeStore.setActive(id));
  const handleRemove = (id) => setResumes(resumeStore.remove(id));

  return (
    <div className="page-resume">
      <header className="page-header">
        <div>
          <h1>Resume</h1>
          <p>Manage your master resume and job-specific versions.</p>
        </div>
        <button className="btn-accent" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Upload Resume
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleUpload} style={{ display: 'none' }} />
      </header>

      {resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resume uploaded"
          description="Upload your master resume to unlock job matching and streamline applications."
          actionLabel="Upload Resume"
          onAction={() => fileRef.current?.click()}
        />
      ) : (
        <div className="resume-list">
          {resumes.map(r => (
            <article key={r.id} className={`resume-card ${r.isActive ? 'active' : ''}`}>
              <div className="resume-card-icon"><FileText size={24} /></div>
              <div className="resume-card-info">
                <strong>{r.name}</strong>
                <div className="resume-card-meta">
                  <span>{r.size}</span>
                  <span><Clock size={12} /> {new Date(r.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="resume-card-actions">
                {r.isActive ? (
                  <span className="status-badge connected"><CheckCircle size={14} /> Active</span>
                ) : (
                  <button className="btn-ghost sm" onClick={() => handleSetActive(r.id)}>Set Active</button>
                )}
                <button className="btn-ghost danger sm" onClick={() => handleRemove(r.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="resume-info">
        <h3>How resume management works</h3>
        <div className="resume-flow">
          <div className="flow-step"><span>1</span><p>Upload your master resume</p></div>
          <div className="flow-arrow">→</div>
          <div className="flow-step"><span>2</span><p>Job-specific versions (coming soon)</p></div>
          <div className="flow-arrow">→</div>
          <div className="flow-step"><span>3</span><p>Attached to applications</p></div>
        </div>
      </section>
    </div>
  );
}
