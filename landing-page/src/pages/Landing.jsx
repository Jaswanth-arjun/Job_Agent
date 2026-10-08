import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Mail,
  FileText,
  LayoutDashboard,
  Search,
  Send,
  Sparkles,
  Menu,
  X,
  ShieldCheck,
  Zap,
  Users,
  Bell,
  Globe,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import VideoLoader from '../components/VideoLoader';
import './Landing.css';

/* ---------- helpers ---------- */

function useCountUp(target, active, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

/* ---------- data (matches real backend routes) ---------- */

const TABS = [
  { id: 'linkedin', label: 'LinkedIn', icon: <Briefcase size={15} />, route: '/dashboard/linkedin' },
  { id: 'mail', label: 'Email', icon: <Mail size={15} />, route: '/dashboard/mail' },
  { id: 'resume', label: 'Resume', icon: <FileText size={15} />, route: '/dashboard/resume' },
  { id: 'track', label: 'Tracker', icon: <LayoutDashboard size={15} />, route: '/dashboard/applications' },
];

const FEATURES = [
  {
    icon: <Briefcase size={20} />,
    tint: 'blue',
    title: 'LinkedIn connect automation',
    desc: 'Role-based connection campaigns with personalized notes, per-account sessions and live status sync.',
    points: ['10 invites per role filter', 'li_at cookie or login window', 'Auto accept / withdraw sync'],
    route: '/dashboard/linkedin',
    cta: 'Open LinkedIn',
  },
  {
    icon: <Mail size={20} />,
    tint: 'green',
    title: 'Gmail outreach + follow-ups',
    desc: 'Send referral requests, AI summaries, replies and polite follow-ups — all attached to the opportunity.',
    points: ['OAuth + App-password send', 'Summarize / reply with AI', 'Sent-mail history'],
    route: '/dashboard/mail',
    cta: 'Open Mail',
  },
  {
    icon: <FileText size={20} />,
    tint: 'purple',
    title: 'AI resume tailor',
    desc: 'Paste any job link. Get a one-page tailored resume in 3 polished formats with match keywords.',
    points: ['External job link parser', '3 PDF formats', 'Keyword gap analysis'],
    route: '/dashboard/resume',
    cta: 'Tailor resume',
  },
  {
    icon: <Search size={20} />,
    tint: 'orange',
    title: 'Job board with match score',
    desc: 'Curated roles with skill-match scoring, filters and one-click apply flow.',
    points: ['Match % per role', 'Save + filter jobs', 'Guided apply steps'],
    route: '/dashboard/jobs',
    cta: 'Browse jobs',
  },
  {
    icon: <Bell size={20} />,
    tint: 'pink',
    title: 'Application tracker',
    desc: 'Every resume version, outreach mail and status change recorded on one timeline.',
    points: ['Applied → Interview stages', 'Follow-up reminders', 'Full history per job'],
    route: '/dashboard/applications',
    cta: 'Track apps',
  },
  {
    icon: <ShieldCheck size={20} />,
    tint: 'yellow',
    title: 'Vault + Chrome extension',
    desc: 'Hamzo Apply extension fills external ATS forms and reuses your approved answers.',
    points: ['Answer vault sync', 'One-click form fill', 'Works on Greenhouse, Lever, Ashby'],
    route: '/dashboard/profile',
    cta: 'Setup vault',
  },
];

const STEPS = [
  { n: '01', title: 'Connect accounts', desc: 'Link LinkedIn once and connect Gmail with OAuth. Sessions stay isolated per user.', detail: 'LinkedIn login window or li_at cookie · Gmail OAuth refresh tokens · per-user Chrome profiles' },
  { n: '02', title: 'Pick a job', desc: 'Choose from the board or paste any external job link to analyse it instantly.', detail: 'Greenhouse · Lever · Ashby · Workday · SmartRecruiters auto-detected' },
  { n: '03', title: 'Tailor + prepare', desc: 'AI builds a one-page resume and drafts personal outreach for the right contacts.', detail: 'Summary rewritten for the role · skills reordered · first-name notes' },
  { n: '04', title: 'Reach + apply', desc: 'Send connects, send referral mails, then move through the guided apply flow.', detail: 'Exactly the limits you set · every send logged · extension fills ATS forms' },
  { n: '05', title: 'Track + follow up', desc: 'Watch replies, sync LinkedIn status every 15 min and never miss a follow-up.', detail: 'Background sync · sent-mail log · next-step reminders' },
];

const REVIEWS = [
  { name: 'Priya Sharma', initials: 'PS', tint: '#445cf5', role: 'Product Manager', text: 'Outreach, resume versions and follow-ups finally live in one place. I stopped losing recruiter replies in Gmail.' },
  { name: 'Amir Khan', initials: 'AK', tint: '#16a34a', role: 'Backend Engineer', text: 'The LinkedIn campaign runner saved me hours. Set roles, set limits, and every invite is tracked.' },
  { name: 'Sarah Jenkins', initials: 'SJ', tint: '#9333ea', role: 'UX Designer', text: 'Resume tailor from a job link is scary good. Three clean one-page formats, keywords included.' },
  { name: 'Daniel Kim', initials: 'DK', tint: '#ea580c', role: 'Marketing Lead', text: 'Mail summaries + follow-up writer doubled my referral reply rate. No more blank-page anxiety.' },
  { name: 'Alex Rivera', initials: 'AR', tint: '#0891b2', role: 'Engineering Lead', text: 'Vault + extension fills those endless Workday forms. My applications actually get finished now.' },
];

const FAQS = [
  ['What does HAMZO actually automate?', 'LinkedIn connection campaigns, Gmail referral outreach and follow-ups, resume tailoring from a job link, and application tracking. You approve what goes out — nothing sends silently.'],
  ['How do I connect LinkedIn?', 'Dashboard → LinkedIn → Connect. Either log in via the popup window (2FA works) or paste your li_at cookie. The session is stored per-user and verified before any campaign.'],
  ['How does Gmail sending work?', 'Connect with Google OAuth on the Mail page, or use an App Password. All sends are logged under Sent, with summarize / reply / follow-up help from Gemini.'],
  ['Will my master resume be overwritten?', 'No. Your master resume stays intact. HAMZO generates job-specific one-page versions so you always know which PDF went where.'],
  ['Do I need the Chrome extension?', 'Only for external ATS auto-fill (Greenhouse, Lever, Ashby, Workday). The web dashboard works fully without it. Install from the Extension folder via chrome://extensions → Load unpacked.'],
];

/* ---------- sections ---------- */

function HmzNav({ onGetStarted, authed }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <div className={`hmz-navwrap ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="hmz-nav">
        <a className="hmz-brand" href="#top"><span className="hmz-dot" />HAMZO</a>
        <div className="hmz-links">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#reviews">Reviews</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="hmz-navright">
          <a className="hmz-ghostlink" href="#workflow">How it works</a>
          <button className="hmz-cta" onClick={onGetStarted}>{authed ? 'Dashboard' : 'Get started'} <ArrowRight size={15} /></button>
          <button className="hmz-menubtn" aria-label="Menu" onClick={() => setOpen((v) => !v)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && (
        <div className="hmz-mobile">
          <a href="#product" onClick={() => setOpen(false)}>Product</a>
          <a href="#workflow" onClick={() => setOpen(false)}>Workflow</a>
          <a href="#reviews" onClick={() => setOpen(false)}>Reviews</a>
          <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
          <button className="hmz-cta full" onClick={() => { setOpen(false); onGetStarted(); }}>{authed ? 'Dashboard' : 'Get started'} <ArrowRight size={15} /></button>
        </div>
      )}
    </div>
  );
}

function HeroPanel({ activeTab, onTab }) {
  return (
    <div className="hmz-panel">
      <div className="hmz-paneltabs">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => onTab(t.id)} className={`hmz-ptab ${activeTab === t.id ? 'on' : ''}`}>
            {t.icon}{t.label}
          </button>
        ))}
        <span className="hmz-live"><span className="hmz-pulse" />live</span>
      </div>
      {activeTab === 'linkedin' && (
        <div className="hmz-pbody">
          <div className="hmz-prow"><span className="hmz-cmark">N</span><div><small>NORTHSTAR LABS · RECRUITER</small><b>Send 10 connects</b></div><span className="hmz-pill green">ready</span></div>
          <div className="hmz-note">Hi Ananya — loved your team&apos;s work on realtime infra. Final-year engineer, 2 backend internships…</div>
          <div className="hmz-bar"><div className="hmz-fill" style={{ width: '70%' }} />7 / 10 sent</div>
        </div>
      )}
      {activeTab === 'mail' && (
        <div className="hmz-pbody">
          <div className="hmz-prow"><Mail size={16} /><div><small>TO HIRING@NORTHSTAR.COM</small><b>Referral request — SDE</b></div><span className="hmz-pill blue">draft</span></div>
          <div className="hmz-note">Attached: Arjun_Northstar.pdf · Follow-up scheduled in 4 days if no reply…</div>
          <div className="hmz-actions"><span className="hmz-chipbtn primary"><Send size={13} /> Send</span><span className="hmz-chipbtn"><Sparkles size={13} /> AI rewrite</span></div>
        </div>
      )}
      {activeTab === 'resume' && (
        <div className="hmz-pbody">
          <div className="hmz-prow"><FileText size={16} /><div><small>TAILORED FOR NORTHSTAR LABS</small><b>Arjun_Kumar_SDE.pdf</b></div><span className="hmz-pill purple">98% fit</span></div>
          <div className="hmz-tags"><span>Java</span><span>Spring Boot</span><span>REST</span><span>SQL</span><span>+4</span></div>
          <div className="hmz-bar"><div className="hmz-fill purple" style={{ width: '92%' }} />12 keywords matched</div>
        </div>
      )}
      {activeTab === 'track' && (
        <div className="hmz-pbody">
          {[['Resume tailored', 1], ['Outreach sent', 1], ['Applied', 1], ['Follow up', 0]].map(([label, done]) => (
            <div key={label} className="hmz-trow">{done ? <Check size={14} /> : <span className="hmz-ring" />}<span>{label}</span>{done ? <small>done</small> : <small className="next">next</small>}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Hero({ onGetStarted }) {
  const [point, setPoint] = useState({ x: 50, y: 30 });
  const [tab, setTab] = useState('linkedin');
  const [statsRef, statsVisible] = useReveal();
  const sent = useCountUp(12500, statsVisible);
  const replies = useCountUp(3400, statsVisible);
  const hours = useCountUp(5, statsVisible);
  const users = useCountUp(500, statsVisible);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTab((t) => {
        const i = TABS.findIndex((x) => x.id === t);
        return TABS[(i + 1) % TABS.length].id;
      });
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="hmz-hero"
      id="top"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPoint({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      style={{ ['--mx']: `${point.x}%`, ['--my']: `${point.y}%` }}
    >
      <div className="hmz-glow" />
      <div className="hmz-marquee"><div>{['JOB INTELLIGENCE', 'LINKEDIN OUTREACH', 'GMAIL FOLLOW-UPS', 'RESUME TAILORING', 'APPLICATION TRACKING', 'ANSWER VAULT', 'JOB INTELLIGENCE', 'LINKEDIN OUTREACH', 'GMAIL FOLLOW-UPS', 'RESUME TAILORING', 'APPLICATION TRACKING', 'ANSWER VAULT'].map((t, i) => <span key={i}>{t}</span>)}</div></div>
      <div className="hmz-herogrid">
        <div className="hmz-copy">
          <span className="hmz-badge"><Zap size={13} /> THE CAREER OPERATING SYSTEM</span>
          <h1>Every application,<br /><em>outreach</em> &amp; follow-up — in one flow.</h1>
          <p>HAMZO connects your LinkedIn campaigns, Gmail referrals, tailored resumes and tracker around every job. Deliberate, visible, and always under your control.</p>
          <div className="hmz-actions">
            <button className="hmz-cta big" onClick={onGetStarted}>Start free <ArrowUpRight size={16} /></button>
            <a className="hmz-textlink" href="#workflow">See how it works <ArrowRight size={15} /></a>
          </div>
          <div className="hmz-trust">
            <div className="hmz-avatars">{['PS', 'AK', 'SJ', 'DK', '+'].map((t, i) => <span key={i} className={`hmz-av a${i}`}>{t}</span>)}</div>
            <span>Trusted by <b>{users}+ professionals</b> · no credit card</span>
          </div>
        </div>
        <div className="hmz-visual">
          <HeroPanel activeTab={tab} onTab={setTab} />
          <div className="hmz-float f1"><Users size={16} /><div><small>CONTACTS</small><strong>3 relevant people</strong></div></div>
          <div className="hmz-float f2"><Check size={15} /><div><small>SYNC</small><strong>LinkedIn verified</strong></div></div>
        </div>
      </div>
      <div className="hmz-stats" ref={statsRef}>
        {[
          [`${sent.toLocaleString('en-IN')}+`, 'Outreach messages prepared'],
          [`${replies.toLocaleString('en-IN')}+`, 'Replies tracked'],
          [`${hours} hrs`, 'Saved every week'],
          [`${users}+`, 'Professionals onboard'],
        ].map(([v, l]) => (
          <div key={l} className="hmz-stat"><b>{v}</b><span>{l}</span></div>
        ))}
      </div>
    </div>
  );
}

function ProductGrid({ onOpen }) {
  const [ref, visible] = useReveal();
  return (
    <div className="hmz-section" id="product" ref={ref}>
      <div className={`hmz-head ${visible ? 'show' : ''}`}>
        <span className="hmz-kicker">THE HAMZO AGENT</span>
        <h2>One workspace.<br />Your entire <em>opportunity.</em></h2>
        <p>Everything the backend already does — exposed as one calm dashboard instead of ten tabs.</p>
      </div>
      <div className="hmz-grid">
        {FEATURES.map((f) => (
          <article key={f.title} className={`hmz-card tint-${f.tint}`}>
            <div className="hmz-cardicon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <ul>{f.points.map((p) => <li key={p}><Check size={13} />{p}</li>)}</ul>
            <button className="hmz-cardbtn" onClick={() => onOpen(f.route)}>{f.cta} <ArrowRight size={14} /></button>
          </article>
        ))}
      </div>
    </div>
  );
}

function Workflow() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), 3200);
    return () => window.clearInterval(id);
  }, [paused]);
  const s = STEPS[step];
  return (
    <div className="hmz-work" id="workflow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="hmz-workcopy">
        <span className="hmz-kicker light">THE WORKFLOW</span>
        <h2>Paste a job.<br />Watch it <em>unfold.</em></h2>
        <div className="hmz-stepnum">{s.n}</div>
        <h3>{s.title}</h3>
        <p>{s.desc}</p>
        <code>{s.detail}</code>
        <div className="hmz-stepbtns">{STEPS.map((x, i) => <button key={x.n} onClick={() => setStep(i)} className={i === step ? 'on' : ''} aria-label={x.title}>{x.n}</button>)}</div>
      </div>
      <div className="hmz-workpanel">
        <div className="hmz-wjob"><span className="hmz-cmark">N</span><div><small>NORTHSTAR LABS</small><b>Software Engineer</b><span>Bengaluru · Full-time</span></div></div>
        <div className="hmz-wtags">{['Java', 'Spring Boot', 'SQL', 'REST'].map((t) => <span key={t}>{t}</span>)}</div>
        {step >= 2 && <div className="hmz-wrow anim"><FileText size={15} /><div><b>Arjun_Northstar.pdf</b><span>Tailored · 98% match</span></div><Check size={15} /></div>}
        {step >= 3 && <div className="hmz-wrow anim"><Send size={14} /><div><b>3 contacts · outreach ready</b><span>First-name notes included</span></div></div>}
        {step >= 4 && <div className="hmz-wok anim"><Check size={14} /> Application + follow-up scheduled <small>Today</small></div>}
        <div className="hmz-progress"><div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>
    </div>
  );
}

function Reviews() {
  const [idx, setIdx] = useState(0);
  const [perView, setPerView] = useState(3);
  useEffect(() => {
    const fn = () => setPerView(window.innerWidth < 760 ? 1 : 3);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % REVIEWS.length), 5000);
    return () => window.clearInterval(id);
  }, []);
  const visible = Array.from({ length: perView }, (_, k) => REVIEWS[(idx + k) % REVIEWS.length]);
  return (
    <div className="hmz-section light" id="reviews">
      <div className="hmz-head center">
        <span className="hmz-kicker">SOCIAL PROOF</span>
        <h2>Loved by people<br />doing <em>serious</em> job search.</h2>
      </div>
      <div className="hmz-revrow">
        {visible.map((r, k) => (
          <article key={`${r.name}-${k}`} className="hmz-rev anim-in">
            <div className="hmz-revtop"><span className="hmz-ravatar" style={{ background: r.tint }}>{r.initials}</span><div><b>{r.name}</b><small>{r.role}</small></div></div>
            <p>“{r.text}”</p>
          </article>
        ))}
      </div>
      <div className="hmz-revnav">
        <button aria-label="Previous" onClick={() => setIdx((i) => (i - 1 + REVIEWS.length) % REVIEWS.length)}><ChevronLeft size={17} /></button>
        <span>{idx + 1} / {REVIEWS.length}</span>
        <button aria-label="Next" onClick={() => setIdx((i) => (i + 1) % REVIEWS.length)}><ChevronRight size={17} /></button>
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="hmz-faq" id="faq">
      <div><span className="hmz-kicker">FAQ</span><h2>Questions before<br />you <em>start?</em></h2><p className="hmz-muted">Backend runs on port 3000 · frontend on 5173 · Chrome required for automation.</p></div>
      <div className="hmz-acc">
        {FAQS.map(([q, a], i) => (
          <article key={q} className={open === i ? 'open' : ''}>
            <button onClick={() => setOpen(open === i ? -1 : i)}>{q}<ChevronDown size={17} /></button>
            <p>{a}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function FinalCta({ onGetStarted }) {
  return (
    <div className="hmz-final" id="cta">
      <div>
        <span className="hmz-kicker light">YOUR NEXT MOVE</span>
        <h2>Your next role deserves more than <em>an application.</em></h2>
        <p>Bring LinkedIn, Gmail, resume, tracker and vault into one connected workflow.</p>
        <div className="hmz-actions">
          <button className="hmz-cta big light" onClick={onGetStarted}>Get started free <ArrowUpRight size={16} /></button>
          <span className="hmz-chrome"><Globe size={15} /> Chrome extension included</span>
        </div>
      </div>
      <div className="hmz-complete">
        <div className="hmz-chead"><span className="hmz-sq" /> Northstar Labs <span className="hmz-active">Active</span></div>
        {['Resume tailored', 'Outreach sent', 'Application submitted', 'Reply received'].map((x) => (
          <div key={x} className="hmz-crow"><Check size={14} /><span>{x}</span></div>
        ))}
        <div className="hmz-crow current"><span className="hmz-ring" /><span>Interview</span><small>Next Tue</small></div>
      </div>
      <div className="hmz-footer">
        <a className="hmz-brand light" href="#top"><span className="hmz-dot" />HAMZO</a>
        <span>© 2026 Hamzo · Career Operating System</span>
        <div><a href="#product">Product</a><a href="#workflow">Workflow</a><a href="#faq">FAQ</a></div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 900);
    return () => window.clearTimeout(t);
  }, []);

  const go = useCallback((route) => {
    if (route) { navigate(route); return; }
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  }, [navigate, isAuthenticated]);

  return (
    <div className="hmz-page">
      <VideoLoader isLoading={loading} maxWaitMs={2200} fadeDurationMs={350} />
      <HmzNav onGetStarted={() => go()} authed={isAuthenticated} />
      <main>
        <Hero onGetStarted={() => go()} />
        <ProductGrid onOpen={(r) => go(isAuthenticated ? r : undefined)} />
        <Workflow />
        <Reviews />
        <Faq />
        <FinalCta onGetStarted={() => go()} />
      </main>
    </div>
  );
}
