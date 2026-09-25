import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Check, ChevronDown, Sparkles, Send, Search, Menu, X, Mail, AtSign, FileText, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import VideoLoader from '../components/VideoLoader';

const Button = ({ children, ghost = false, onClick }) => (
  <button onClick={onClick} className={`button ${ghost ? 'ghost' : ''}`}>
    {children}
    <ArrowUpRight size={16} />
  </button>
);
const Tag = ({ children }) => <span className="tag">{children}</span>;

function Nav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <nav>
        <a className="brand" href="#top"><i />HAMZO</a>
      <div className="navlinks">
        <a href="#product">Product</a>
        <a href="#workflow">Workflow</a>
        <a href="#faq">FAQ</a>
      </div>
      <button className="navCta" onClick={handleGetStarted}>
        {isAuthenticated ? 'Dashboard' : 'Get Started'} <ArrowRight size={15} />
      </button>
      <button className="menub" onClick={() => setOpen(!open)}>
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <div className="mobileNav">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#faq">FAQ</a>
          <Button onClick={handleGetStarted}>
            {isAuthenticated ? 'Dashboard' : 'Get started'}
          </Button>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  const [run, setRun] = useState(false);
  const [point, setPoint] = useState({ x: 50, y: 45 });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const terms = ['Job intelligence', 'Resume tailoring', 'Referral outreach', 'Email outreach', 'Application tracking', 'Follow-up planning'];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section
      className="hero editorialHero"
      id="top"
      onMouseMove={e => {
        let r = e.currentTarget.getBoundingClientRect();
        setPoint({ x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 });
      }}
      style={{ '--mx': `${point.x}%`, '--my': `${point.y}%` }}
    >
      <div className="heroGlow" />
      <div className="heroTerms">
        <div>
          {[...terms, ...terms].map((term, i) => <span key={i}>{term}</span>)}
        </div>
      </div>
      <div className="heroCopy">
        <Tag>THE OPPORTUNITY WORKSPACE</Tag>
        <h1>Your career move,<br /><em>thoughtfully</em> managed.</h1>
        <p>Wayin connects the application, tailored resume, professional outreach, follow-ups and progress around every opportunity.</p>
        <div className="actions">
          <Button onClick={handleGetStarted}>Get started</Button>
          <a className="textlink" href="#workflow">See how it works <ArrowRight size={16} /></a>
        </div>
        <span className="note">A calmer way to move your career forward.</span>
      </div>
      <div className={`heroVisual ${run ? 'running' : ''}`}>
        <div className="jobCard">
          <div className="cardTop">
            <span className="companyMark">N</span>
            <span>New opportunity</span>
            <span className="dot" />
          </div>
          <h3>Software Engineer</h3>
          <p>Northstar Labs · Bengaluru</p>
          <div className="skills"><b>Java</b><b>Spring Boot</b><b>SQL</b></div>
          <button className="agentButton" onClick={() => setRun(true)}>
            {run ? 'Agent working…' : 'Run Agent'} <Sparkles size={15} />
          </button>
        </div>
        <div className="float people"><Search size={17} /><div><small>PEOPLE</small><strong>3 relevant contacts</strong></div></div>
        <div className="float email"><Mail size={17} /><div><small>EMAIL</small><strong>{run ? 'Ready to send' : 'Drafting outreach'}</strong></div><Check size={16} /></div>
        <div className="float applied"><Check size={16} /><div><small>TRACKER</small><strong>Opportunity saved</strong></div></div>
        <svg className="lines" viewBox="0 0 650 500">
          <path d="M340 250 C180 190 140 155 70 100" />
          <path d="M355 260 C510 185 550 155 595 140" />
          <path d="M350 285 C490 350 525 375 580 380" />
          <path d="M320 290 C225 375 175 390 100 405" />
        </svg>
      </div>
    </section>
  );
}

const testimonials = [
  { id: 1, name: "Priya Sharma", handle: "@Veeboo", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", quote: "\u201CWayin completely changed how I approach job applications. I no longer worry about tracking — everything is captured and managed automatically.\u201D", role: "Product Manager" },
  { id: 2, name: "Amir Khan", handle: "@Veeboo", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", quote: "\u201CI was skeptical at first, but Wayin is now essential for my job search. The match scoring helps me focus on the right opportunities.\u201D", role: "Lead Tech Engineer" },
  { id: 3, name: "Daniel Kim", handle: "@Veeboo", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80", quote: "\u201CThe connected workflow is incredible. Resume, outreach, application — everything lives in one place. I save hours every week.\u201D", role: "Marketing Lead" },
  { id: 4, name: "Sarah Jenkins", handle: "@Veeboo", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80", quote: "\u201CAutomatic follow-up tracking and outreach coordination doubled my response rate. An absolute must-have for serious job seekers.\u201D", role: "Senior UX Designer" },
  { id: 5, name: "Alex Rivera", handle: "@Veeboo", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80", quote: "\u201CThe seamless integration between Gmail, LinkedIn, and my applications saves me at least 5 hours a week. Extremely intuitive.\u201D", role: "Engineering Lead" },
];

function Social() {
  const [startIndex, setStartIndex] = useState(0);
  const handlePrev = () => setStartIndex(prev => (prev === 0 ? testimonials.length - 1 : prev - 1));
  const handleNext = () => setStartIndex(prev => (prev + 1) % testimonials.length);
  const visibleCards = [
    testimonials[startIndex % testimonials.length],
    testimonials[(startIndex + 1) % testimonials.length],
    testimonials[(startIndex + 2) % testimonials.length],
  ];

  return (
    <section className="socialSection" id="social-proof">
      <div className="socialAmbientGlow" />
      <div className="socialContent">
        <div className="socialBadge"><Heart size={13} fill="#5e65f4" color="#5e65f4" /><span>Social Proof</span></div>
        <h2>Backed by Our Growing Community<br />of <span className="blueHighlight">Engineers</span></h2>
        <p className="socialSubtext">Be part of the movement towards smarter, more efficient job searching.</p>
        <div className="socialTrustRow">
          <div className="avatarGroup">
            {testimonials.slice(0, 5).map((t, i) => (
              <img key={t.id} src={t.avatar} alt={t.name} className={`stackedAvatar av-${i}`} />
            ))}
          </div>
          <span className="trustText">Trusted by <b>500+</b> professionals and growing.</span>
        </div>
        <div className="cardsCarouselContainer">
          <div className="cardsRow">
            {visibleCards.map((card, idx) => (
              <article key={`${card.id}-${idx}`} className="testimonialCard">
                <div className="cardTopRow">
                  <img src={card.avatar} alt={card.name} className="authorAvatar" />
                  <div className="authorInfo">
                    <span className="authorName">{card.name}</span>
                    <span className="authorHandle">{card.handle}</span>
                  </div>
                </div>
                <p className="quoteBody">{card.quote}</p>
                <div className="cardBottomRow"><span className="roleTitle">{card.role}</span></div>
              </article>
            ))}
          </div>
          <div className="carouselNavButtons">
            <button onClick={handlePrev} className="carouselBtn" aria-label="Previous"><ChevronLeft size={18} /></button>
            <button onClick={handleNext} className="carouselBtn" aria-label="Next"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="problem">
      <div className="problemIntro">
        <Tag>THE OLD WAY</Tag>
        <h2>Applying is easy.<br /><em>Managing</em> it isn't.</h2>
        <p>A single opportunity fractures across tabs, files, inboxes and reminders. The work that gets you noticed is the work that is hardest to hold together.</p>
      </div>
      <div className="scatter">
        <article className="scrap s1"><small>LINKEDIN</small><b>Connection request sent</b><span>When should I follow up?</span></article>
        <article className="scrap s2"><small>GMAIL</small><b>Recruiter reply</b><span>Which application was this for?</span></article>
        <article className="scrap s3"><small>SPREADSHEET</small><b>100+ applications</b><span>Which resume did I use?</span></article>
        <article className="scrap s4"><small>JOB PORTAL</small><b>Application status</b><span>Submitted 12 days ago</span></article>
        <div className="chaosline">job portal <i /> resume <i /> linkedin <i /> gmail <i /> spreadsheet</div>
      </div>
      <div className="connected"><span>From scattered workflow</span><ArrowRight /><b>One connected opportunity.</b></div>
    </section>
  );
}

const features = [
  ['01', 'JOB INTELLIGENCE', 'Find what matters in every description', 'requirements'],
  ['02', 'SMART RESUME', 'Tailor the right version, not your whole story', 'match'],
  ['03', 'REFERRAL OUTREACH', 'Prepare personal outreach with context', 'people'],
  ['04', 'EMAIL OUTREACH', 'Keep conversations attached to the opportunity', 'emailv'],
  ['05', 'APPLICATION', 'Move into the appropriate application flow', 'applyv'],
  ['06', 'FOLLOW-UP', 'See what needs your attention next', 'followv'],
  ['07', 'APPLICATION MEMORY', 'Remember every action and document used', 'memory'],
  ['08', 'UNIFIED TRACKER', 'Every opportunity, with its full history', 'trackv'],
];

function Mini({ type }) {
  if (type === 'requirements') return <div className="mini req"><span>We're looking for an engineer with</span><b>Java · Spring Boot</b><b>REST APIs · SQL</b><span>and a sharp product instinct.</span></div>;
  if (type === 'match') return <div className="mini match"><span>Job description</span><b>Java</b><b>Spring Boot</b><span>Resume</span><b>Java <Check /></b><b>Spring Boot <Check /></b></div>;
  if (type === 'people') return <div className="mini contacts"><div><i>AP</i> Ananya Patel <Check /></div><div><i>RK</i> Rohan Khanna <Check /></div><div><i>SM</i> Sia Mehta <Check /></div></div>;
  if (type === 'emailv') return <div className="mini message"><small>To: hiring@northstar.com</small><b>Thoughts on the platform role</b><span>Hi Maya, I'm excited by how…</span><Send /></div>;
  if (type === 'applyv') return <div className="mini submit"><div><Check /></div><b>Application submitted</b><span>Northstar Labs · just now</span></div>;
  if (type === 'followv') return <div className="mini timeline"><b /><b /><b className="active" /><span>Applied</span><span>Reached out</span><span>Follow up</span></div>;
  if (type === 'memory') return <div className="mini mem"><span>Resume v4 — used</span><span>Outreach — sent</span><span>Application — submitted</span></div>;
  return <div className="mini board"><span><i />Applied</span><span><i />Outreach</span><span><i />Interview</span></div>;
}

function Solution() {
  return (
    <section className="solution" id="product">
      <div className="sectionHeading">
        <Tag>THE WAYIN AGENT</Tag>
        <h2>One Agent.<br />Your entire <em>opportunity.</em></h2>
        <p>Give Wayin a job. It keeps the supported work around it coordinated, visible and deliberate.</p>
      </div>
      <div className="featureGrid">
        {features.map(([n, t, d, v], i) => (
          <article className={`feature f${i}`} key={n}>
            <div className="featureMeta"><span>{n}</span><small>{t}</small></div>
            <h3>{d}</h3>
            <Mini type={v} />
          </article>
        ))}
      </div>
    </section>
  );
}

const stages = [
  ['01', 'JOB FOUND', 'A promising role arrives.'],
  ['02', 'UNDERSTAND', 'The details come into focus.'],
  ['03', 'TAILOR', 'Your experience meets the moment.'],
  ['04', 'REACH', 'The right people, thoughtfully approached.'],
  ['05', 'APPLY', 'A considered application moves forward.'],
  ['06', 'TRACK', 'Every next step stays visible.'],
];

function Workflow() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const f = () => {
      let e = document.getElementById('workflow');
      if (e) {
        let n = Math.max(0, Math.min(5, Math.floor((window.scrollY - e.offsetTop + window.innerHeight * 0.35) / (e.offsetHeight / 6))));
        setStage(n);
      }
    };
    window.addEventListener('scroll', f);
    f();
    return () => window.removeEventListener('scroll', f);
  }, []);

  let s = stages[stage];

  return (
    <section className="workflow" id="workflow">
      <div className="workflowSticky">
        <div className="workCopy">
          <Tag>THE WORKFLOW</Tag>
          <h2>Give it a job.<br />Watch it <em>unfold.</em></h2>
          <div className="stepLabel">
            <span>{s[0]}</span>
            <b>{s[1]}</b>
            <p>{s[2]}</p>
          </div>
          <div className="steps">
            {stages.map((x, i) => (
              <button onClick={() => setStage(i)} className={i === stage ? 'on' : ''} key={x[0]}>{x[0]}</button>
            ))}
          </div>
        </div>
        <div className={`workPanel stage${stage}`}>
          <div className="workJob">
            <span className="companyMark">N</span>
            <div><small>NORTHSTAR LABS</small><b>Software Engineer</b><span>Bengaluru · Full Time</span></div>
          </div>
          {stage >= 1 && <div className="workReq">Java <b>Spring Boot</b> SQL <b>REST APIs</b> Git</div>}
          {stage >= 2 && <div className="workResume"><FileText /><div><b>Arjun_Kumar_Northstar.pdf</b><span>Tailored for this role</span></div><Check /></div>}
          {stage >= 3 && <div className="workReach"><AtSign /><span>3 relevant contacts found</span><Mail /><span>Outreach prepared</span></div>}
          {stage >= 4 && <div className="workSubmit"><Check /> Application submitted <small>Today, 10:42 AM</small></div>}
          {stage >= 5 && <div className="workTrack"><span>Applied <Check /></span><span>Outreach <Check /></span><span>Follow up <i /></span><span>Response</span></div>}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  ['What does the Agent actually do?', 'It helps coordinate the supported work around a job: understanding the role, tailoring materials, preparing outreach, recording activity and keeping your next step visible.'],
  ['Can I connect my Gmail and LinkedIn?', 'Connected workflows depend on the integrations available to your account. You stay in control of what is prepared, sent and recorded.'],
  ['Will my resume be changed permanently?', 'No. Your master resume stays intact. Wayin creates job-specific versions so you can always see exactly what was used.'],
  ['Does the Agent automatically apply to every job?', 'No. Application routes and supported workflows vary by target platform. Wayin is designed to keep you deliberate, not indiscriminate.'],
  ['Can I see everything the Agent has done?', 'Yes. Each opportunity has a clear timeline of resumes, outreach, applications and follow-up actions.'],
];

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq" id="faq">
      <div>
        <Tag>FAQ</Tag>
        <h2>Questions before<br />you get <em>started?</em></h2>
      </div>
      <div className="accord">
        {faqs.map(([q, a], i) => (
          <article key={q} className={open === i ? 'open' : ''}>
            <button onClick={() => setOpen(open === i ? -1 : i)}>{q}<ChevronDown /></button>
            <p>{a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Final() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="final" id="cta">
      <div className="finalCopy">
        <Tag>YOUR NEXT MOVE</Tag>
        <h2>Your next opportunity<br />deserves more than<br /><em>an application.</em></h2>
        <p>Bring your application, resume, outreach, follow-ups and progress into one connected workflow.</p>
        <div className="actions">
          <Button onClick={handleGetStarted}>Get started</Button>
          <a className="textlink light" href="#top">Sign in <ArrowRight size={16} /></a>
        </div>
      </div>
      <div className="complete">
        <div className="completeHead"><i /> Northstar Labs <span>Active</span></div>
        {['Resume tailored', 'Outreach sent', 'Application submitted', 'Reply received', 'Interview'].map((x, i) => (
          <div className={i === 4 ? 'current' : ''} key={x}>
            {i < 4 ? <Check /> : <i />}
            <span>{x}</span>
            {i === 4 && <small>Next Tuesday</small>}
          </div>
        ))}
      </div>
      <footer>
      <a className="brand" href="#top"><i />HAMZO</a>
        <span>© 2026 Wayin</span>
        <div><a>About</a><a>Contact</a><a>Privacy</a><a>Terms</a></div>
      </footer>
    </section>
  );
}

export default function Landing() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const start = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const remaining = Math.max(0, 900 - (performance.now() - start));
      window.setTimeout(() => setIsLoading(false), remaining);
    };

    if (document.readyState === 'complete') {
      const t = window.setTimeout(finish, 400);
      window.addEventListener('load', finish, { once: true });
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('load', finish);
      };
    }

    window.addEventListener('load', finish, { once: true });
    const fallback = window.setTimeout(finish, 3000);
    return () => {
      window.removeEventListener('load', finish);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <>
      <VideoLoader isLoading={isLoading} />
      <Nav />
      <main>
        <Hero />
        <Social />
        <Problem />
        <Solution />
        <Workflow />
        <FAQ />
        <Final />
      </main>
    </>
  );
}
