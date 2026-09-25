import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, X, Edit3, FileText, Upload, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { profileStore, getUserName } from '../lib/api';
import { DEFAULT_PROFILE } from '../lib/mockData';

// Standalone ProfileField component declared outside of Profile to prevent unmounting & focus loss
const ProfileField = ({ label, value, editing, onChange, type = 'text' }) => (
  <div className="form-field">
    <label>{label}</label>
    {editing ? (
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    ) : (
      <p className="field-display">{value || <span className="placeholder">Not set</span>}</p>
    )}
  </div>
);

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(() => {
    const saved = profileStore.get();
    return saved || { ...DEFAULT_PROFILE, fullName: getUserName(user), email: user?.email || '' };
  });
  const [skillInput, setSkillInput] = useState('');
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && !profile.fullName) {
      setProfile(p => ({ ...p, fullName: user.displayName || '', email: user.email || '' }));
    }
  }, [user]);

  const handleSave = () => {
    profileStore.save(profile);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Handle Resume File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newResume = {
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dataUrl: event.target.result,
        fileType: file.type
      };
      setProfile(p => {
        const updated = { ...p, resume: newResume };
        profileStore.save(updated);
        return updated;
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    };
    reader.readAsDataURL(file);
  };

  // Remove Resume
  const handleRemoveResume = () => {
    setProfile(p => {
      const updated = { ...p, resume: null };
      profileStore.save(updated);
      return updated;
    });
  };

  // View Resume
  const handleViewResume = () => {
    if (profile.resume?.dataUrl) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${profile.resume.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile(p => ({ ...p, skills: [...p.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const removeSkill = (s) => setProfile(p => ({ ...p, skills: p.skills.filter(x => x !== s) }));

  const addEntry = (key) => {
    const templates = {
      education: { institution: '', degree: '', branch: '', graduationYear: '', cgpa: '' },
      experience: { title: '', company: '', duration: '', description: '' },
      projects: { title: '', description: '', technologies: '', link: '' },
    };
    setProfile(p => ({ ...p, [key]: [...p[key], templates[key]] }));
  };

  const updateEntry = (key, idx, field, val) => {
    setProfile(p => {
      const arr = [...p[key]];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...p, [key]: arr };
    });
  };

  const removeEntry = (key, idx) => {
    setProfile(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));
  };

  return (
    <div className="page-profile">
      <header className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Your career profile for job matching and automated applications.</p>
        </div>
        <div className="header-actions">
          {saved && <span className="save-indicator">✓ Saved</span>}
          {editing ? (
            <button className="btn-accent" onClick={handleSave}><Save size={16} /> Save Profile</button>
          ) : (
            <button className="btn-ghost" onClick={() => setEditing(true)}><Edit3 size={16} /> Edit Profile</button>
          )}
        </div>
      </header>

      <div className="profile-sections space-y-6">
        {/* Personal Information */}
        <section className="profile-section">
          <h2>Personal Information</h2>
          <div className="form-grid">
            <ProfileField
              label="Full Name"
              value={profile.fullName}
              editing={editing}
              onChange={val => setProfile(p => ({ ...p, fullName: val }))}
            />
            <ProfileField
              label="Email"
              value={profile.email}
              editing={editing}
              type="email"
              onChange={val => setProfile(p => ({ ...p, email: val }))}
            />
            <ProfileField
              label="Phone"
              value={profile.phone}
              editing={editing}
              type="tel"
              onChange={val => setProfile(p => ({ ...p, phone: val }))}
            />
            <ProfileField
              label="Location"
              value={profile.location}
              editing={editing}
              onChange={val => setProfile(p => ({ ...p, location: val }))}
            />
          </div>
        </section>

        {/* RESUME UPLOAD SECTION (Requires Edit Profile mode to add/upload/replace) */}
        <section className="profile-section">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800' }}>
              <FileText size={18} style={{ color: 'var(--accent)' }} /> Resume / CV Document
            </h2>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
          />

          {profile.resume ? (
            <div className="entry-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eef0ff', color: '#445cf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', shrink: 0 }}>
                  <FileText size={22} />
                </div>
                <div>
                  <strong style={{ fontSize: '14px', color: '#171817', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {profile.resume.fileName}
                    <span style={{ fontSize: '10px', background: '#e5f5e9', color: '#2a7645', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                      ✓ Active
                    </span>
                  </strong>
                  <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
                    {profile.resume.fileSize} · Uploaded on {profile.resume.uploadedAt}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" onClick={handleViewResume} className="btn-ghost sm" style={{ fontSize: '12px' }}>
                  <Eye size={14} /> View
                </button>
                {editing && (
                  <>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-ghost sm" style={{ fontSize: '12px' }}>
                      <Upload size={14} /> Replace
                    </button>
                    <button type="button" onClick={handleRemoveResume} className="btn-ghost danger sm" style={{ fontSize: '12px' }} title="Delete Resume">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : editing ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #d9d9d2',
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                background: '#fafaf7',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eef0ff', color: '#445cf5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Upload size={22} />
              </div>
              <strong style={{ fontSize: '14px', color: '#171817', display: 'block', marginBottom: '4px' }}>
                Click to upload your resume
              </strong>
              <span style={{ fontSize: '12px', color: '#777', display: 'block', marginBottom: '16px' }}>
                Supports PDF, DOC, DOCX files (Up to 10MB)
              </span>
              <button type="button" className="btn-accent sm" style={{ pointerEvents: 'none' }}>
                <Plus size={14} /> Select Resume File
              </button>
            </div>
          ) : (
            <p className="placeholder">
              No resume uploaded yet. Click <strong>Edit Profile</strong> at the top right to upload your resume.
            </p>
          )}
        </section>

        {/* Skills */}
        <section className="profile-section">
          <h2>Skills</h2>
          {editing && (
            <div className="skill-input-row">
              <input placeholder="Add a skill…" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} />
              <button className="btn-ghost" onClick={addSkill}><Plus size={16} /></button>
            </div>
          )}
          <div className="job-card-skills">
            {profile.skills.map(s => (
              <span key={s} className="skill-tag">
                {s}
                {editing && <button onClick={() => removeSkill(s)}><X size={12} /></button>}
              </span>
            ))}
            {profile.skills.length === 0 && <p className="placeholder">No skills added yet.</p>}
          </div>
        </section>

        {/* Education */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Education</h2>
            {editing && <button className="btn-ghost sm" onClick={() => addEntry('education')}><Plus size={14} /> Add</button>}
          </div>
          {profile.education.map((e, i) => (
            <div key={i} className="entry-card">
              {editing ? (
                <>
                  <div className="form-grid">
                    <div className="form-field"><label>Institution</label><input value={e.institution} onChange={ev => updateEntry('education', i, 'institution', ev.target.value)} /></div>
                    <div className="form-field"><label>Degree</label><input value={e.degree} onChange={ev => updateEntry('education', i, 'degree', ev.target.value)} /></div>
                    <div className="form-field"><label>Branch</label><input value={e.branch} onChange={ev => updateEntry('education', i, 'branch', ev.target.value)} /></div>
                    <div className="form-field"><label>Year</label><input value={e.graduationYear} onChange={ev => updateEntry('education', i, 'graduationYear', ev.target.value)} /></div>
                    <div className="form-field"><label>CGPA</label><input value={e.cgpa} onChange={ev => updateEntry('education', i, 'cgpa', ev.target.value)} /></div>
                  </div>
                  <button className="btn-ghost danger sm" onClick={() => removeEntry('education', i)}><X size={14} /> Remove</button>
                </>
              ) : (
                <div className="entry-display">
                  <strong>{e.degree || 'Degree'} {e.branch && `in ${e.branch}`}</strong>
                  <p>{e.institution || 'Institution'} {e.graduationYear && `· ${e.graduationYear}`} {e.cgpa && `· ${e.cgpa}`}</p>
                </div>
              )}
            </div>
          ))}
          {profile.education.length === 0 && <p className="placeholder">No education added yet.</p>}
        </section>

        {/* Experience */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Experience</h2>
            {editing && <button className="btn-ghost sm" onClick={() => addEntry('experience')}><Plus size={14} /> Add</button>}
          </div>
          {profile.experience.map((e, i) => (
            <div key={i} className="entry-card">
              {editing ? (
                <>
                  <div className="form-grid">
                    <div className="form-field"><label>Title</label><input value={e.title} onChange={ev => updateEntry('experience', i, 'title', ev.target.value)} /></div>
                    <div className="form-field"><label>Company</label><input value={e.company} onChange={ev => updateEntry('experience', i, 'company', ev.target.value)} /></div>
                    <div className="form-field"><label>Duration</label><input value={e.duration} onChange={ev => updateEntry('experience', i, 'duration', ev.target.value)} /></div>
                  </div>
                  <div className="form-field"><label>Description</label><textarea value={e.description} onChange={ev => updateEntry('experience', i, 'description', ev.target.value)} /></div>
                  <button className="btn-ghost danger sm" onClick={() => removeEntry('experience', i)}><X size={14} /> Remove</button>
                </>
              ) : (
                <div className="entry-display">
                  <strong>{e.title || 'Role'}</strong>
                  <p>{e.company || 'Company'} {e.duration && `· ${e.duration}`}</p>
                  {e.description && <p className="entry-desc">{e.description}</p>}
                </div>
              )}
            </div>
          ))}
          {profile.experience.length === 0 && <p className="placeholder">No experience added yet.</p>}
        </section>

        {/* Projects */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Projects</h2>
            {editing && <button className="btn-ghost sm" onClick={() => addEntry('projects')}><Plus size={14} /> Add</button>}
          </div>
          {profile.projects.map((p, i) => (
            <div key={i} className="entry-card">
              {editing ? (
                <>
                  <div className="form-grid">
                    <div className="form-field"><label>Title</label><input value={p.title} onChange={ev => updateEntry('projects', i, 'title', ev.target.value)} /></div>
                    <div className="form-field"><label>Technologies</label><input value={p.technologies} onChange={ev => updateEntry('projects', i, 'technologies', ev.target.value)} /></div>
                    <div className="form-field"><label>Link</label><input value={p.link} onChange={ev => updateEntry('projects', i, 'link', ev.target.value)} /></div>
                  </div>
                  <div className="form-field"><label>Description</label><textarea value={p.description} onChange={ev => updateEntry('projects', i, 'description', ev.target.value)} /></div>
                  <button className="btn-ghost danger sm" onClick={() => removeEntry('projects', i)}><X size={14} /> Remove</button>
                </>
              ) : (
                <div className="entry-display">
                  <strong>{p.title || 'Project'}</strong>
                  {p.technologies && <div className="job-card-skills small">{p.technologies.split(',').map(t => <span key={t} className="skill-tag">{t.trim()}</span>)}</div>}
                  {p.description && <p className="entry-desc">{p.description}</p>}
                </div>
              )}
            </div>
          ))}
          {profile.projects.length === 0 && <p className="placeholder">No projects added yet.</p>}
        </section>

        {/* Professional Links */}
        <section className="profile-section">
          <h2>Professional Links</h2>
          <div className="form-grid">
            <ProfileField
              label="GitHub"
              value={profile.links?.github}
              editing={editing}
              onChange={val => setProfile(p => ({ ...p, links: { ...(p.links || {}), github: val } }))}
            />
            <ProfileField
              label="LinkedIn"
              value={profile.links?.linkedin}
              editing={editing}
              onChange={val => setProfile(p => ({ ...p, links: { ...(p.links || {}), linkedin: val } }))}
            />
            <ProfileField
              label="Portfolio"
              value={profile.links?.portfolio}
              editing={editing}
              onChange={val => setProfile(p => ({ ...p, links: { ...(p.links || {}), portfolio: val } }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
