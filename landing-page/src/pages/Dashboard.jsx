import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { DEMO_JOBS } from '../lib/mockData';
import { profileStore, applicationStore } from '../lib/api';
import { computeJobScores } from '../lib/matchScore';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const profile = profileStore.get();

  const displayName = user?.displayName || profile?.fullName || 'there';
  const firstName = displayName.split(' ')[0];

  const scored = useMemo(() => computeJobScores(profile || {}, DEMO_JOBS), [profile]);
  const topMatches = scored.sort((a, b) => (b.matchResult?.score || 0) - (a.matchResult?.score || 0)).slice(0, 3);

  return (
    <div className="page-overview">
      <section className="dash-hero">
        <h1>Welcome, {firstName} 👋</h1>
      </section>

      <section className="dash-section">
        <div className="section-header">
          <h2>Top Matches</h2>
          <button className="btn-ghost" onClick={() => navigate('/dashboard/jobs')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="top-matches-grid">
          {topMatches.map(job => (
            <article key={job.id} className="match-card" onClick={() => navigate(`/dashboard/jobs/${job.id}`)}>
              <div className="match-card-top">
                <div className="job-card-company-mark">{job.companyMark}</div>
                <div>
                  <h4>{job.title}</h4>
                  <p>{job.company} · {job.location}</p>
                </div>
                <span className="match-badge" style={{
                  color: job.matchResult?.score >= 70 ? '#22a65b' : '#445cf5',
                  background: job.matchResult?.score >= 70 ? '#22a65b14' : '#445cf514',
                }}>
                  {job.matchResult?.score || 0}%
                </span>
              </div>
              <div className="job-card-skills">
                {job.skills?.slice(0, 3).map(s => <span key={s} className="skill-tag">{s}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      {!profile?.fullName && (
        <section className="dash-prompt">
          <Sparkles size={20} />
          <div>
            <strong>Complete your profile</strong>
            <p>Add your skills and experience to unlock personalized job matching.</p>
          </div>
          <button className="btn-accent" onClick={() => navigate('/dashboard/profile')}>Set up profile</button>
        </section>
      )}
    </div>
  );
}
