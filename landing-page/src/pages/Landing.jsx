import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
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
  Zap,
  Users,
  Bell,
  Globe,
  Star,
  AtSign,
  Puzzle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import VideoLoader from '../components/VideoLoader';
import './Landing.css';

/* ================= helpers ================= */

function useCountUp(target, active, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
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
      (entries) => { if (entries[0].isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

/* ================= data (real app capabilities) ================= */

const PILLARS = [
  {
    icon: <Search size={22} />, tint: 'blue', name: 'Job Matches',
    title: 'Matched jobs, not endless scrolling',
    desc: 'Paste any job link or browse the board. Every role gets a skill-match score so you chase the right ones.',
    points: ['Match % on every role', 'Any public job link works', 'Save + filter + track'],
    route: '/dashboard/jobs', cta: 'Browse jobs',
  },
  {
    icon: <Puzzle size={22} />, tint: 'green', name: 'Copilot Extension',
    title: 'One-click apply, anywhere',
    desc: 'Hamzo Apply fills application forms on Greenhouse, Lever, Ashby, Workday, mynexthire and more — then asks before submitting.',
    points: ['Auto-fill + resume attach', 'Unknown fields? It asks you', 'Answers remembered (vault)'],
    route: '/dashboard/resume', cta: 'Get the extension',
  },
  {
    icon: <FileText size={22} />, tint: 'purple', name: 'AI Resume Builder',
    title: 'A tailored resume per job',
    desc: 'Paste a job link, get a one-page tailored resume in 3 polished formats with keyword-gap analysis.',
    points: ['3 one-page PDF formats', 'Keyword match breakdown', 'Master resume untouched'],
    route: '/dashboard/resume', cta: 'Tailor resume',
  },
  {
    icon: <LayoutDashboard size={22} />, tint: 'orange', name: 'Job Tracker',
    title: 'Every application, one timeline',
    desc: 'Resumes sent, outreach mails, LinkedIn invites, follow-ups — full history per opportunity, auto-synced.',
    points: ['Applied → interview stages', 'LinkedIn sync every 15 min', 'Follow-up reminders'],
    route: '/dashboard/applications', cta: 'Track applications',
  },
];

const STEPS = [
  { n: '01', title: 'Run the agent on any job', desc: 'One click on any job listing — LinkedIn, job boards, Greenhouse, company career pages. The agent activates right there.', tag: 'One Click' },
  { n: '02', title: 'It finds the right people', desc: 'Role-based LinkedIn campaigns plus Gmail outreach to recruiters and hiring managers — with personal, first-name notes.', tag: 'Auto Referrals' },
  { n: '03', title: 'You get replies, not ghosting', desc: 'Follow-ups run on autopilot, replies are tracked, and your resume lands in front of humans — past the ATS queue.', tag: 'More Interviews' },
];

const INTEGRATIONS = ['LinkedIn', 'Gmail', 'Greenhouse', 'Lever', 'Ashby', 'Workday', 'mynexthire', 'Naukri', 'Indeed', 'Any career page'];

const REVIEWS = [
  { name: 'Priya Sharma', initials: 'PS', tint: '#335CFF', role: 'Product Manager', text: 'Outreach, resume versions and follow-ups finally live in one place. I stopped losing recruiter replies in Gmail.' },
  { name: 'Amir Khan', initials: 'AK', tint: '#16a34a', role: 'Backend Engineer', text: 'The LinkedIn campaign runner saved me hours. Set roles, set limits, and every invite is tracked.' },
  { name: 'Sarah Jenkins', initials: 'SJ', tint: '#9333ea', role: 'UX Designer', text: 'Resume tailor from a job link is scary good. Three clean one-page formats, keywords included.' },
  { name: 'Daniel Kim', initials: 'DK', tint: '#ea580c', role: 'Marketing Lead', text: 'Mail summaries plus follow-up writer doubled my referral reply rate. No more blank-page anxiety.' },
  { name: 'Alex Rivera', initials: 'AR', tint: '#0891b2', role: 'Engineering Lead', text: 'Vault plus extension fills those endless Workday forms. My applications actually get finished now.' },
];

const FAQS = [
  ['What does HAMZO actually do?', 'It is your AI referral agent, not a job board: LinkedIn connection campaigns, Gmail referral outreach and follow-ups, resume tailoring from any job link, and application tracking. You approve what goes out — nothing sends silently.'],
  ['How do I connect LinkedIn and Gmail?', 'Dashboard → LinkedIn → Connect (login popup or li_at cookie). Mail page → connect with Google OAuth or an App Password. Disconnect anytime — your control.'],
  ['How does the Chrome extension work?', 'Load it unpacked via chrome://extensions. On any application page it fills the form, attaches your tailored resume, asks you about unknown fields (and remembers answers in the vault), and confirms before submitting.'],
  ['Will my master resume be overwritten?', 'No. Your master resume stays intact. HAMZO generates job-specific one-page versions so you always know which PDF went where.'],
  ['Is it free?', 'Yes — start free, no credit card. Connect your accounts, tailor resumes, run outreach and track everything from one workspace.'],
];

/* ================= live demo player ================= */

const DEMO_STEPS = [
  { id: 'link', label: 'Drop a job link', caption: 'Paste any job link — HAMZO reads the role, company and requirements in seconds.' },
  { id: 'match', label: 'Match + tailor', caption: 'Skill-match score plus a one-page tailored resume in 3 formats.' },
  { id: 'outreach', label: 'Outreach autopilot', caption: 'Personal referral mails and LinkedIn invites go out — follow-ups scheduled.' },
  { id: 'track', label: 'Track to interview', caption: 'Every reply lands on one timeline until Interview is scheduled.' },
];

function Typewriter({ text, speed = 24 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return undefined;
    const id = window.setInterval(() => {
      setN((v) => {
        if (v >= text.length) { window.clearInterval(id); return v; }
        return v + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  return <span className="hmz-type">{text.slice(0, n)}<span className="hmz-caret" /></span>;
}

function DemoStage({ step }) {
  if (step === 0) {
    return (
      <div className="hmz-dscene">
        <div className="hmz-dlink"><Globe size={15} /><Typewriter text="angelone.mynexthire.com/…/Agentic-AI-Intern" /></div>
        <div className="hmz-danalyze"><Sparkles size={15} /> Analyzing job…</div>
        <div className="hmz-dchips">
          {['Agentic AI Intern', 'Angel One', 'Bengaluru', 'Fresher'].map((t, i) => (
            <span key={t} className="hmz-dpop" style={{ animationDelay: `${0.9 + i * 0.35}s` }}>{t}</span>
          ))}
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="hmz-dscene">
        <div className="hmz-dmatch">
          <svg viewBox="0 0 44 44" className="hmz-ddonut">
            <circle cx="22" cy="22" r="19" fill="none" stroke="#e6e9f4" strokeWidth="5" />
            <circle cx="22" cy="22" r="19" fill="none" stroke="#335CFF" strokeWidth="5" strokeLinecap="round" strokeDasharray="0,100" pathLength="100" className="hmz-donutanim" transform="rotate(-90 22 22)" />
            <text x="22" y="26" textAnchor="middle" className="hmz-donuttxt">98%</text>
          </svg>
          <div><b>Profile match</b><small>12 keywords matched</small></div>
        </div>
        <div className="hmz-dchips">
          {['Python', 'LLM APIs', 'FastAPI', 'SQL', '+8'].map((t, i) => (
            <span key={t} className="hmz-dpop" style={{ animationDelay: `${0.5 + i * 0.25}s` }}>{t}</span>
          ))}
        </div>
        <div className="hmz-dresume"><FileText size={16} /><div><b>Arjun_AngelOne.pdf</b><span>Tailored · 1 page</span></div><Check size={15} /></div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="hmz-dscene">
        <div className="hmz-dmail"><Send size={14} /><div><b>Referral request sent</b><span>hiring@angelone · resume attached</span></div><Check size={15} /></div>
        <div className="hmz-dinvites">
          {['Recruiter', 'Talent Acquisition', 'Hiring Manager'].map((t, i) => (
            <div key={t} className="hmz-dinvite" style={{ animationDelay: `${0.6 + i * 0.5}s` }}>
              <span className="hmz-dava">{t[0]}</span><span>{t}</span><b>Sent ✓</b>
            </div>
          ))}
        </div>
        <div className="hmz-dfollow"><Bell size={14} /> Follow-up scheduled in 4 days</div>
      </div>
    );
  }
  return (
    <div className="hmz-dscene">
      <div className="hmz-dtimeline">
        {[['Resume tailored', 1], ['Outreach sent', 1], ['Reply received', 1], ['Interview', 0]].map(([label, done], i) => (
          <div key={label} className="hmz-dtrow" style={{ animationDelay: `${0.3 + i * 0.45}s` }}>
            {done ? <Check size={14} /> : <span className="hmz-ring" />}
            <span>{label}</span>
            {!done && <small className="next">next Tue</small>}
          </div>
        ))}
      </div>
      <div className="hmz-dtoast"><CheckCircle2 size={15} /> Recruiter replied: “Let’s schedule a call”</div>
    </div>
  );
}

function DemoPlayer() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((e) => setInView(e[0].isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !inView) return undefined;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % DEMO_STEPS.length), 4400);
    return () => window.clearTimeout(id);
  }, [playing, inView, step]);

  return (
    <div className="hmz-demo" id="demo" ref={wrapRef}>
      <div className="hmz-head center">
        <span className="hmz-kicker">LIVE DEMO</span>
        <h2>Watch HAMZO <em>work.</em></h2>
        <p>A real run, compressed into 18 seconds — from job link to interview.</p>
      </div>
      <div className="hmz-browser">
        <div className="hmz-bbar">
          <span className="hmz-bdots"><i /><i /><i /></span>
          <span className="hmz-burl"><Globe size={12} /> hamzo.app/dashboard</span>
          <span className="hmz-blive"><span className="hmz-pulse" />live demo</span>
        </div>
        <div className="hmz-dtabs">
          {DEMO_STEPS.map((s, i) => (
            <button key={s.id} onClick={() => { setStep(i); setPlaying(true); }} className={`hmz-dtab ${i === step ? 'on' : ''}`}>
              <span className="hmz-dtabn">{i + 1}</span>{s.label}
            </button>
          ))}
        </div>
        <div className="hmz-dstage" key={step}><DemoStage step={step} /></div>
        <div className="hmz-dprog">{DEMO_STEPS.map((s, i) => (
          <span key={s.id} className={i === step ? 'on' : i < step ? 'done' : ''}>
            {i === step && playing && inView && <i key={step} className="hmz-dfill" />}
          </span>
        ))}</div>
        <div className="hmz-dfoot">
          <span className="hmz-dcaption">{DEMO_STEPS[step].caption}</span>
          <span className="hmz-dctrl">
            <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚' : '▶'}</button>
            <button aria-label="Replay" onClick={() => { setStep(0); setPlaying(true); }}>↻</button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================= sections ================= */

function TopBar({ onGetStarted, authed }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <div className={`hmz-topwrap ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="hmz-top">
        <a className="hmz-brand" href="#top"><span className="hmz-dot" />HAMZO</a>
        <div className="hmz-links">
          <a href="#product">Product</a>
          <a href="#demo">Demo</a>
          <a href="#extension">Extension</a>
          <a href="#workflow">How it works</a>
          <a href="#reviews">Reviews</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="hmz-topright">
          <button className="hmz-cta" onClick={onGetStarted}>{authed ? 'Dashboard' : 'Get started — it’s free'} <ArrowRight size={15} /></button>
          <button className="hmz-menubtn" aria-label="Menu" onClick={() => setOpen((v) => !v)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && (
        <div className="hmz-mobile">
          <a href="#product" onClick={() => setOpen(false)}>Product</a>
          <a href="#demo" onClick={() => setOpen(false)}>Demo</a>
          <a href="#extension" onClick={() => setOpen(false)}>Extension</a>
          <a href="#workflow" onClick={() => setOpen(false)}>How it works</a>
          <a href="#reviews" onClick={() => setOpen(false)}>Reviews</a>
          <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
          <button className="hmz-cta full" onClick={() => { setOpen(false); onGetStarted(); }}>{authed ? 'Dashboard' : 'Get started — it’s free'} <ArrowRight size={15} /></button>
        </div>
      )}
    </div>
  );
}

function Hero({ onGetStarted, onOpen }) {
  const [statsRef, statsVisible] = useReveal();
  const cRoles = useCountUp(5, statsVisible, 900);
  const cInvites = useCountUp(10, statsVisible, 900);
  const cSync = useCountUp(15, statsVisible, 1100);
  const cFormats = useCountUp(3, statsVisible, 900);
  return (
    <div className="hmz-hero" id="top">
      <div className="hmz-heroinner">
        <div className="hmz-chips">
          <span className="hmz-chip"><Zap size={13} /> AI referral agent</span>
          <span className="hmz-chip ghost">Not a job board</span>
          <span className="hmz-chip ghost">60-second setup</span>
        </div>
        <h1>Get referrals,<br />not <em>ghosting.</em></h1>
        <p className="hmz-sub">HAMZO is your AI referral agent — it finds the right people inside target companies and gets your resume in front of them, so real recruiters reply. Your entire job search in one place.</p>
        <div className="hmz-actions">
          <button className="hmz-cta big" onClick={onGetStarted}>Get my first referral <ArrowUpRight size={16} /></button>
          <a className="hmz-textlink" href="#workflow">See how it works <ArrowRight size={15} /></a>
        </div>
        <div className="hmz-proof">
          <div className="hmz-avatars">{['PS', 'AK', 'SJ', 'DK', '+'].map((t, i) => <span key={i} className={`hmz-av a${i}`}>{t}</span>)}</div>
          <span>Free to start · No credit card · Chrome extension included</span>
        </div>

        <div className="hmz-herovisual">
          <div className="hmz-jobcard">
            <div className="hmz-jc-top">
              <span className="hmz-cmark">A</span>
              <div><small>ANGEL ONE · BENGALURU</small><b>Agentic AI Intern</b></div>
              <span className="hmz-match">98%<small>match</small></span>
            </div>
            <div className="hmz-jc-tags"><span>Python</span><span>LLM APIs</span><span>FastAPI</span><span>+9</span></div>
            <div className="hmz-jc-row">
              <button className="hmz-askbtn" onClick={() => onOpen('/dashboard/jobs')}>Ask a referral <ArrowRight size={14} /></button>
              <button className="hmz-tailorbtn" onClick={() => onOpen('/dashboard/resume')}><Sparkles size={14} /> Tailor resume</button>
            </div>
          </div>
          <div className="hmz-float f1"><Send size={15} /><div><small>OUTREACH</small><strong>Referral mail ready</strong></div><Check size={14} /></div>
          <div className="hmz-float f2"><Users size={15} /><div><small>LINKEDIN</small><strong>10 invites / role</strong></div></div>
          <div className="hmz-float f3"><Bell size={15} /><div><small>FOLLOW-UP</small><strong>Autopilot on</strong></div></div>
        </div>

        <div className="hmz-stats" ref={statsRef}>
          {[
            [`${cRoles}`, 'Role filters per campaign'],
            [`${cInvites}`, 'Invites per role filter'],
            [`${cSync} min`, 'LinkedIn auto-sync'],
            [`${cFormats}`, 'Resume PDF formats'],
          ].map(([v, l]) => (
            <div key={l} className="hmz-stat"><b>{v}</b><span>{l}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Integrations() {
  return (
    <div className="hmz-strip">
      <p><b>We are not a job board — we plug into all of them.</b> Works wherever you already apply. Same one-click flow.</p>
      <div className="hmz-logos"><div>{[...INTEGRATIONS, ...INTEGRATIONS].map((t, i) => <span key={i}>{t}</span>)}</div></div>
    </div>
  );
}

function Pillars({ onOpen }) {
  const [ref, visible] = useReveal();
  return (
    <div className="hmz-section" id="product" ref={ref}>
      <div className={`hmz-head ${visible ? 'show' : ''}`}>
        <span className="hmz-kicker">THE PLATFORM</span>
        <h2>Your entire job search<br />in <em>one place.</em></h2>
        <p>Job matches, copilot extension, resume builder and tracker — one workspace, free to start.</p>
      </div>
      <div className="hmz-grid">
        {PILLARS.map((f) => (
          <article key={f.name} className={`hmz-card tint-${f.tint}`}>
            <div className="hmz-cardicon">{f.icon}</div>
            <small className="hmz-pillarname">{f.name}</small>
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

function ExtensionSpot({ onOpen }) {
  const [ref, visible] = useReveal();
  return (
    <div className="hmz-ext" id="extension" ref={ref}>
      <div className={`hmz-extinner ${visible ? 'show' : ''}`}>
        <div>
          <span className="hmz-kicker">COPILOT EXTENSION</span>
          <h2>Meet your AI copilot for the job search.</h2>
          <p>Hamzo Apply autofills applications, attaches your tailored resume, asks about unknown fields — and remembers the answers in your vault for next time.</p>
          <ul className="hmz-checks">
            <li><CheckCircle2 size={16} /> Description page? It clicks Apply itself and continues</li>
            <li><CheckCircle2 size={16} /> Login walls, CAPTCHAs? It pauses and tells you exactly what to do</li>
            <li><CheckCircle2 size={16} /> Confirms with you before anything is submitted</li>
          </ul>
          <div className="hmz-actions">
            <button className="hmz-cta big" onClick={() => onOpen('/dashboard/resume')}><Globe size={16} /> Get the extension — it’s free</button>
          </div>
          <small className="hmz-note">Load unpacked via chrome://extensions · 60-second setup</small>
        </div>
        <div className="hmz-extmock">
          <div className="hmz-mockbar"><span /><span /><span /></div>
          <div className="hmz-mockrow"><FileText size={16} /><div><b>Arjun_AngelOne.pdf</b><span>Tailored · 98% match</span></div><Check size={15} /></div>
          <div className="hmz-mockrow"><AtSign size={15} /><div><b>Project link filled</b><span>From your vault — no asking twice</span></div><Check size={15} /></div>
          <div className="hmz-mockrow"><Send size={14} /><div><b>Ready to submit</b><span>Waiting for your confirmation</span></div></div>
          <div className="hmz-mockbtns"><span className="yes">✓ Submit</span><span>👁 Review</span></div>
        </div>
      </div>
    </div>
  );
}

function Compare() {
  const [ref, visible] = useReveal();
  return (
    <div className="hmz-section" ref={ref}>
      <div className={`hmz-head center ${visible ? 'show' : ''}`}>
        <span className="hmz-kicker">WHY IT WORKS</span>
        <h2>Manual grind vs <em>HAMZO agent.</em></h2>
      </div>
      <div className="hmz-compare">
        <div className="hmz-cmp pain">
          <h3>Manual job hunt</h3>
          <ul>
            <li>Hours searching, tailoring, tracking in spreadsheets</li>
            <li>ATS bot rejects your resume before a human reads it</li>
            <li>1–2 hrs to find the right referral contacts per company</li>
            <li>Follow-ups forgotten once you get busy</li>
          </ul>
        </div>
        <div className="hmz-cmp gain">
          <h3>With HAMZO agent</h3>
          <ol>
            <li><b>Send and track referrals</b> effortlessly in one place</li>
            <li><b>Skip the ATS queue</b> — reach hiring managers directly</li>
            <li><b>Under 60 seconds per job</b> after a one-time setup</li>
            <li><b>Automated follow-ups</b> until they answer</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Setup({ onOpen }) {
  return (
    <div className="hmz-setup">
      <div className="hmz-head center">
        <span className="hmz-kicker">SETUP</span>
        <h2>Configure in less than <em>60 seconds.</em></h2>
      </div>
      <div className="hmz-setupgrid">
        <div className="hmz-setupcard">
          <div className="hmz-cardicon"><Mail size={20} /></div>
          <h3>Gmail — any Gmail works</h3>
          <p>Send referral resumes directly to recruiters’ official inboxes.</p>
          <ul>
            <li><Check size={13} /> OAuth or App Password</li>
            <li><Check size={13} /> Disconnect anytime — your control</li>
          </ul>
          <button className="hmz-cardbtn" onClick={() => onOpen('/dashboard/mail')}>Enable email outreach <ArrowRight size={14} /></button>
        </div>
        <div className="hmz-setupcard">
          <div className="hmz-cardicon"><Briefcase size={20} /></div>
          <h3>LinkedIn — no Premium needed</h3>
          <p>Auto-send connection requests with personal notes to target companies.</p>
          <ul>
            <li><Check size={13} /> Login popup or li_at cookie</li>
            <li><Check size={13} /> Gmail alone works — LinkedIn doubles replies</li>
          </ul>
          <button className="hmz-cardbtn" onClick={() => onOpen('/dashboard/linkedin')}>Connect LinkedIn <ArrowRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function Workflow() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), 3400);
    return () => window.clearInterval(id);
  }, [paused]);
  return (
    <div className="hmz-work" id="workflow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="hmz-head center light">
        <span className="hmz-kicker light">HOW IT WORKS</span>
        <h2>One click. Automated referrals. <em>More interviews.</em></h2>
      </div>
      <div className="hmz-steps">
        {STEPS.map((s, i) => (
          <button key={s.n} onClick={() => setStep(i)} className={`hmz-step ${i === step ? 'on' : ''}`}>
            <span className="hmz-stepn">{s.n}</span>
            <span className="hmz-steptag">{s.tag}</span>
            <b>{s.title}</b>
            <p>{s.desc}</p>
          </button>
        ))}
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
    <div className="hmz-section" id="reviews">
      <div className="hmz-head center">
        <span className="hmz-kicker">TESTIMONIALS</span>
        <h2>What real users <em>say.</em></h2>
        <div className="hmz-stars">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />)}</div>
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

function FreeBand({ onGetStarted }) {
  return (
    <div className="hmz-free">
      <div className="hmz-freeinner">
        <span className="hmz-kicker">PRICING</span>
        <h2>Start free. <em>Pay nothing to start.</em></h2>
        <div className="hmz-freeticks">
          {['Unlimited job links + match scores', 'AI resume tailor (3 formats)', 'Gmail + LinkedIn outreach', 'Application tracker + vault', 'No credit card · Disconnect anytime'].map((t) => (
            <span key={t}><Check size={14} />{t}</span>
          ))}
        </div>
        <button className="hmz-cta big yellow" onClick={onGetStarted}>Get my first referral <ArrowUpRight size={16} /></button>
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="hmz-faq" id="faq">
      <div><span className="hmz-kicker">FAQ</span><h2>Questions before<br />you <em>start?</em></h2></div>
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
      <div className="hmz-finalinner">
        <span className="hmz-kicker light">GET STARTED</span>
        <h2>Stop getting ghosted.<br />Get your first <em>referral today.</em></h2>
        <p>An agent that gets your resume in front of humans — and follows up until they answer.</p>
        <button className="hmz-cta big yellow" onClick={onGetStarted}>Get started — it’s free <ArrowUpRight size={16} /></button>
      </div>
      <div className="hmz-footer">
        <a className="hmz-brand light" href="#top"><span className="hmz-dot" />HAMZO</a>
        <div className="hmz-fcols">
          <div><b>PRODUCT</b><a href="#product">Job matches</a><a href="#demo">Live demo</a><a href="#extension">Extension</a><a href="#workflow">How it works</a><a href="#faq">FAQ</a></div>
          <div><b>WORKS WITH</b><span>LinkedIn</span><span>Gmail</span><span>Greenhouse · Lever</span><span>Any career page</span></div>
        </div>
        <span className="hmz-copy">© 2026 Hamzo · AI referral agent</span>
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
    navigate(route || (isAuthenticated ? '/dashboard' : '/auth'));
  }, [navigate, isAuthenticated]);

  return (
    <div className="hmz-page">
      <VideoLoader isLoading={loading} maxWaitMs={2200} fadeDurationMs={350} />
      <TopBar onGetStarted={() => go()} authed={isAuthenticated} />
      <main>
        <Hero onGetStarted={() => go()} onOpen={(r) => go(isAuthenticated ? r : undefined)} />
        <Integrations />
        <DemoPlayer />
        <Pillars onOpen={(r) => go(isAuthenticated ? r : undefined)} />
        <ExtensionSpot onOpen={(r) => go(isAuthenticated ? r : undefined)} />
        <Compare />
        <Setup onOpen={(r) => go(isAuthenticated ? r : undefined)} />
        <Workflow />
        <Reviews />
        <FreeBand onGetStarted={() => go()} />
        <Faq />
        <FinalCta onGetStarted={() => go()} />
      </main>
    </div>
  );
}
