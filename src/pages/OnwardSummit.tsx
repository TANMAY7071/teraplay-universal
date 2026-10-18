import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import './OnwardSummit.css';

// ==========================================
// TYPES & DATA
// ==========================================

interface AgendaSession {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  speakers?: string;
  tag: 'Breaks' | 'Keynote' | 'Panel' | 'Workshop' | 'Roundtable';
  description: string;
}

const AGENDA_DATA: AgendaSession[] = [
  {
    id: 'session-0',
    startTime: '8:00 AM',
    endTime: '8:50 AM',
    title: 'Doors, coffee and badge pickup',
    tag: 'Breaks',
    description: "Pick up your badge, find your table and meet the people you'll be trading notes with all day.",
  },
  {
    id: 'session-1',
    startTime: '9:00 AM',
    endTime: '9:45 AM',
    title: 'Opening keynote: the finance team of 2030',
    speakers: 'Maya Okafor',
    tag: 'Keynote',
    description: "What a ten-person finance team will be able to do in four years, and the three decisions to make this quarter so you're ready.",
  },
  {
    id: 'session-2',
    startTime: '10:00 AM',
    endTime: '10:50 AM',
    title: 'The five-day close, in practice',
    speakers: 'Daniel Reyes · Priya Natarajan',
    tag: 'Panel',
    description: 'Two controllers walk through the exact calendar, owners and checklists that took their close from twelve days to five.',
  },
  {
    id: 'session-3',
    startTime: '11:00 AM',
    endTime: '12:00 PM',
    title: 'Workshop: prompting for the general ledger',
    speakers: 'Lena Fischer',
    tag: 'Workshop',
    description: 'Bring a laptop. Build prompts that draft accrual memos, explain variances and flag mis-codings, with guardrails your auditors will sign off on.',
  },
  {
    id: 'session-4',
    startTime: '12:15 PM',
    endTime: '1:15 PM',
    title: 'Lunch roundtables by role',
    tag: 'Roundtable',
    description: 'Tables are grouped by role and company size, each hosted by a speaker. Pick yours at check-in.',
  },
  {
    id: 'session-5',
    startTime: '1:30 PM',
    endTime: '2:15 PM',
    title: 'Spend is strategy: procurement as a profit center',
    speakers: 'Sam Whitaker · Elena Varga',
    tag: 'Panel',
    description: 'How intake, approvals and renewals become a lever on margin, with the metrics that convince a board.',
  },
  {
    id: 'session-6',
    startTime: '2:30 PM',
    endTime: '3:30 PM',
    title: 'Workshop: a rolling forecast in an afternoon',
    speakers: 'Aiko Tanaka',
    tag: 'Workshop',
    description: "Start from last year's actuals and leave with a driver-based forecast that updates itself every month.",
  },
  {
    id: 'session-7',
    startTime: '3:45 PM',
    endTime: '4:30 PM',
    title: 'Fireside: raising, cutting and staying calm',
    speakers: 'Jordan Blake · Maya Okafor',
    tag: 'Keynote',
    description: 'An investor and an operator on the conversations a CFO has in a down round, and the ones to have before it.',
  },
  {
    id: 'session-8',
    startTime: '5:00 PM',
    endTime: '7:00 PM',
    title: 'Rooftop reception',
    tag: 'Breaks',
    description: 'Drinks, small plates and the view. The best conversations of the day usually happen here.',
  },
];

const GUEST_ROLES = [
  {
    id: 'CFO',
    label: 'CFO',
    pitch: "You're steering where the business goes next and watching which bets your peers are quietly placing. See how the best finance teams are modernizing and staying a step ahead.",
  },
  {
    id: 'Controller',
    label: 'Controller',
    pitch: "Closing the books without staying until midnight. Automate the reconciliation, eliminate manual journal entries, and build confidence into every number you present.",
  },
  {
    id: 'Head of procurement',
    label: 'Head of procurement',
    pitch: "Turning supplier relationships and renewals into margin advantage. Gain real-time visibility across spend, enforce approval guardrails, and unlock better terms.",
  },
  {
    id: 'Accountants',
    label: 'Accountants',
    pitch: "Less data re-entry, more high-impact advisory. Reclaim 15 hours a week from repetitive ledger maintenance and work directly with strategic business leads.",
  },
];

const FAQ_DATA = [
  {
    q: 'Who is Onward for?',
    a: 'Finance leaders and the people who run finance with them: CFOs, controllers, procurement leads and accountants at growing companies. Register and we confirm every seat within two business days.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing. Onward is free for confirmed guests, including all sessions, meals, and the evening rooftop reception.',
  },
  {
    q: 'Will sessions be recorded?',
    a: 'Keynotes are recorded and shared with every registered guest a week later. Workshops and roundtables stay in the room.',
  },
  {
    q: 'Can I bring a colleague?',
    a: 'Yes. Ask them to register on their own so they get their own ticket; we seat teams together when we can.',
  },
  {
    q: 'Is there help with travel?',
    a: 'We hold a room block at two hotels nearby at a reduced rate. The booking link arrives with your confirmation.',
  },
];

// Helper to trigger .ics calendar file download
function downloadCalendarFile(event: {
  title: string;
  description: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}) {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Keel Financial//Onward Summit 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'SUMMARY:' + event.title,
    'DESCRIPTION:' + event.description.replace(/\n/g, '\\n'),
    'LOCATION:' + (event.location || 'Hudson Atrium, 600 West 22nd Street, New York, NY 10011'),
    'DTSTART:20261112T130000Z',
    'DTEND:20261112T230000Z',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// INTERACTIVE CANVAS COMPONENT
// ==========================================
const InteractiveCanvas: React.FC<{ heightMultiplier?: number }> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    // Particle nodes
    const particleCount = Math.floor(Math.min(width, 1400) / 38);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.5 + 1,
      alpha: Math.random() * 0.45 + 0.15,
    }));

    let mouseX = -1000;
    let mouseY = -1000;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const parent = canvas.parentElement;
    parent?.addEventListener('mousemove', onMouseMove);
    parent?.addEventListener('mouseleave', onMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Connect near particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Move
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0) p1.x = width;
        if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        if (p1.y > height) p1.y = 0;

        // Mouse displacement
        const dxMouse = p1.x - mouseX;
        const dyMouse = p1.y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 140) {
          const force = (140 - distMouse) / 140;
          p1.x += (dxMouse / distMouse) * force * 1.5;
          p1.y += (dyMouse / distMouse) * force * 1.5;
        }

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.22;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(169, 195, 243, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw dot
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(228, 242, 34, ${p1.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      parent?.removeEventListener('mousemove', onMouseMove);
      parent?.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="ows-canvas" />;
};

// ==========================================
// MAIN ONWARD SUMMIT PAGE
// ==========================================
export default function OnwardSummit() {
  // Navigation solid state on scroll
  const [navSolid, setNavSolid] = useState(false);

  // Guest role selector state
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Agenda states
  const [activeFilter, setActiveFilter] = useState<'All' | 'Breaks' | 'Keynote' | 'Panel' | 'Workshop' | 'Roundtable'>('All');
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);
  const [openSessionId, setOpenSessionId] = useState<string | null>('session-0');
  const [saveAnimate, setSaveAnimate] = useState(false);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Map mouse coordinate offset state
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });

  // Registration Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: 'CFO',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [ticketCode, setTicketCode] = useState('');

  // Live countdown to November 12, 2026
  const [countdown, setCountdown] = useState({
    days: 26,
    hrs: 5,
    min: 33,
    sec: 23,
  });

  // Track scroll for navigation transparency
  useEffect(() => {
    const handleScroll = () => {
      setNavSolid(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const targetDate = new Date('2026-11-12T08:00:00-05:00').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const min = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const sec = Math.floor((difference % (1000 * 60)) / 1000);

      setCountdown({ days, hrs, min, sec });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Guest list auto rotation effect
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setInterval(() => {
      setSelectedRoleIndex((prev) => (prev + 1) % GUEST_ROLES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [autoAdvance]);

  // Observer for reveal on scroll (.ows-rise)
  useEffect(() => {
    const elements = document.querySelectorAll('.ows-rise');
    elements.forEach((el) => el.classList.add('ows-pre'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('ows-pre');
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Toggle saving a session
  const toggleSaveSession = useCallback((id: string) => {
    setSavedSessionIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      setSaveAnimate(true);
      setTimeout(() => setSaveAnimate(false), 500);
      return next;
    });
  }, []);

  // Form submit handler
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const randomCode = 'ONW-' + Math.floor(10000 + Math.random() * 90000);
    setTicketCode(randomCode);
    setFormSubmitted(true);
  };

  // Filtered agenda sessions
  const filteredSessions = activeFilter === 'All' ? AGENDA_DATA : AGENDA_DATA.filter((s) => s.tag === activeFilter);

  // Active role pitch text split into words
  const activePitchWords = GUEST_ROLES[selectedRoleIndex].pitch.split(' ');

  return (
    <div className="ows-root">
      <Helmet>
        <title>Onward Summit — 21ST.DEV workshop</title>
        <meta name="description" content="Your invitation to the sharpest room in finance. November 12, 2026 at Hudson Atrium, New York." />
      </Helmet>

      {/* =========================================================================
          HEADER / STICKY NAV
          ========================================================================= */}
      <header className="ows-nav" data-solid={navSolid}>
        <a href="#hero" className="ows-brand" aria-label="Keel home">
          <span className="ows-brand-word">keel</span>
          <svg className="ows-svg" width="17" height="14" viewBox="0 0 17 14" aria-hidden="true">
            <path
              d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>

        <button
          type="button"
          className="ows-when"
          title="Add to calendar"
          onClick={() =>
            downloadCalendarFile({
              title: 'Onward Summit 2026',
              description: 'The sharpest room in finance. Candid conversations with rising finance leaders at Hudson Atrium.',
              location: 'Hudson Atrium, 600 West 22nd Street, New York, NY 10011',
            })
          }
        >
          <span>November 12, 2026</span>
          <span className="ows-when-bar" aria-hidden="true" />
          <span>New York</span>
          <span className="ows-when-cal">
            <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M1.75 5.75h10.5M4.5 1.25v2.5M9.5 1.25v2.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
        </button>

        <a href="#register" className="ows-btn ows-btn--accent ows-btn--nav">
          <span>Register now</span>
          <span className="ows-btn-arrow">
            <svg className="ows-svg" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
            </svg>
          </span>
        </a>
      </header>

      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section id="hero" className="ows-hero" aria-label="Onward">
        <div className="ows-hero-bg" aria-hidden="true" />
        <div className="ows-field" aria-hidden="true">
          <InteractiveCanvas />
        </div>
        <div className="ows-hero-copy">
          <h1 className="ows-title" aria-label="Onward">
            {'Onward'.split('').map((char, index) => (
              <span key={index} className="ows-title-ch" aria-hidden="true" style={{ '--i': index } as React.CSSProperties}>
                {char}
              </span>
            ))}
          </h1>
          <p className="ows-tagline">
            <span className="ows-tag-line" style={{ '--i': 0 } as React.CSSProperties}>
              Your invitation to the sharpest
            </span>
            <span className="ows-tag-line" style={{ '--i': 1 } as React.CSSProperties}>
              room in finance
            </span>
          </p>
        </div>
      </section>

      {/* =========================================================================
          MAIN CONTENT
          ========================================================================= */}
      <main className="ows-main">
        {/* ---- EXPECT SECTION ---- */}
        <section className="ows-sec ows-wrap" data-sec="expect">
          <h2 className="ows-h2 ows-rise">On what to expect</h2>
          <p className="ows-intro ows-rise">
            Our first summit is a day of candid conversations with rising finance leaders, tactical sessions you can use on Monday and fresh takes
            on where the industry goes next. You'll leave ready to turn insight into action.
          </p>

          <div className="ows-features">
            <article className="ows-feature ows-rise" style={{ '--d': '0ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <svg className="ows-svg ows-mark" data-kind="arrow" width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0fm0" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="var(--ows-icon-a)" />
                      <stop offset="1" stopColor="var(--ows-icon-b)" />
                    </linearGradient>
                  </defs>
                  <g className="ows-mark-g">
                    <path d="M22 6H70V54L57 41V27.5L17.2 67.3L8.7 58.8L48.5 19H35Z" fill="url(#r0fm0)" />
                  </g>
                </svg>
              </div>
              <h3 className="ows-feature-title">Sharper finance</h3>
              <p className="ows-feature-text">Field-tested playbooks from the CFOs who are setting the pace.</p>
            </article>

            <article className="ows-feature ows-rise" style={{ '--d': '90ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <svg className="ows-svg ows-mark" data-kind="ring" width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0fm1" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="var(--ows-icon-a)" />
                      <stop offset="1" stopColor="var(--ows-icon-b)" />
                    </linearGradient>
                  </defs>
                  <g className="ows-mark-g">
                    <circle cx="38" cy="38" r="25" fill="none" stroke="url(#r0fm1)" strokeWidth="15" />
                  </g>
                </svg>
              </div>
              <h3 className="ows-feature-title">Calmer workflows</h3>
              <p className="ows-feature-text">Retire the manual close and let operations run themselves.</p>
            </article>

            <article className="ows-feature ows-rise" style={{ '--d': '180ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <svg className="ows-svg ows-mark" data-kind="plus" width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0fm2" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="var(--ows-icon-a)" />
                      <stop offset="1" stopColor="var(--ows-icon-b)" />
                    </linearGradient>
                  </defs>
                  <g className="ows-mark-g">
                    <path d="M31 4H45V31H72V45H45V72H31V45H4V31H31Z" fill="url(#r0fm2)" />
                  </g>
                </svg>
              </div>
              <h3 className="ows-feature-title">Systems that scale</h3>
              <p className="ows-feature-text">Prompts, processes and controls that grow with your team.</p>
            </article>
          </div>
        </section>

        {/* ---- GUEST LIST SECTION ---- */}
        <section className="ows-sec ows-wrap" data-sec="guests">
          <h2 className="ows-h2 ows-rise">On the guest list</h2>

          <div className="ows-chips ows-rise" role="tablist" aria-label="Who it's for">
            {GUEST_ROLES.map((role, idx) => {
              const isSelected = selectedRoleIndex === idx;
              return (
                <button
                  key={role.id}
                  type="button"
                  role="tab"
                  id={`r0-aud-${idx}`}
                  aria-selected={isSelected}
                  aria-controls="r0-pitch"
                  tabIndex={isSelected ? 0 : -1}
                  className="ows-chip"
                  data-auto={isSelected && autoAdvance ? 'true' : 'false'}
                  onClick={() => {
                    setSelectedRoleIndex(idx);
                    setAutoAdvance(false);
                  }}
                >
                  {role.label}
                  <span className="ows-chip-bar" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <p id="r0-pitch" role="tabpanel" aria-labelledby={`r0-aud-${selectedRoleIndex}`} className="ows-pitch ows-rise" aria-live="polite">
            <span key={selectedRoleIndex} className="ows-pitch-in">
              {activePitchWords.map((word, wordIdx) => (
                <span key={wordIdx} className="ows-word" style={{ '--i': wordIdx } as React.CSSProperties}>
                  {word}{' '}
                </span>
              ))}
            </span>
          </p>
        </section>

        {/* ---- AGENDA SECTION ---- */}
        <section id="agenda" className="ows-sec ows-wrap" data-sec="agenda">
          <div className="ows-sec-head">
            <div>
              <h2 className="ows-h2 ows-rise">On the agenda</h2>
              <p className="ows-intro ows-rise">One room in the morning, three tracks after lunch. Save the sessions you want and take them with you.</p>
            </div>

            <div className="ows-saved ows-rise" aria-live="polite" data-on={saveAnimate ? 'true' : 'false'}>
              <span className="ows-saved-n">{savedSessionIds.length}</span>
              <span className="ows-saved-t">sessions saved</span>
              <button
                type="button"
                className="ows-btn ows-btn--dark ows-btn--sm"
                disabled={savedSessionIds.length === 0}
                onClick={() => {
                  const saved = AGENDA_DATA.filter((s) => savedSessionIds.includes(s.id));
                  downloadCalendarFile({
                    title: `My Onward Agenda (${saved.length} sessions)`,
                    description: saved.map((s) => `${s.startTime}-${s.endTime}: ${s.title}`).join('\n'),
                  });
                }}
              >
                <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M1.75 5.75h10.5M4.5 1.25v2.5M9.5 1.25v2.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <span>Download .ics</span>
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="ows-chips ows-chips--filter ows-rise" role="group" aria-label="Filter by track">
            {(['All', 'Breaks', 'Keynote', 'Panel', 'Workshop', 'Roundtable'] as const).map((filter) => {
              const count = filter === 'All' ? AGENDA_DATA.length : AGENDA_DATA.filter((s) => s.tag === filter).length;
              return (
                <button
                  key={filter}
                  type="button"
                  className="ows-chip"
                  aria-pressed={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                  <span className="ows-chip-n">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Agenda Rows */}
          <ol className="ows-agenda ows-rise">
            {filteredSessions.map((session, k) => {
              const isOpen = openSessionId === session.id;
              const isSaved = savedSessionIds.includes(session.id);

              return (
                <li key={session.id} className="ows-row" style={{ '--k': k } as React.CSSProperties} data-open={isOpen ? 'true' : 'false'}>
                  <div className="ows-row-main">
                    <button
                      type="button"
                      className="ows-row-btn"
                      aria-expanded={isOpen}
                      aria-controls={`r0-row-${session.id}`}
                      onClick={() => setOpenSessionId(isOpen ? null : session.id)}
                    >
                      <span className="ows-row-time">
                        {session.startTime}
                        <span className="ows-row-end">{session.endTime}</span>
                      </span>

                      <span className="ows-row-body">
                        <span className="ows-row-title">{session.title}</span>
                        {session.speakers && <span className="ows-row-who">{session.speakers}</span>}
                      </span>

                      <span className="ows-tag">{session.tag}</span>

                      <svg
                        className="ows-svg ows-chev"
                        data-open={isOpen ? 'true' : 'false'}
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        aria-hidden="true"
                      >
                        <path
                          d="M2.5 4.5 6 8l3.5-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="ows-save"
                      aria-pressed={isSaved}
                      aria-label={`Save ${session.title}`}
                      title={isSaved ? 'Remove from my agenda' : 'Save to my agenda'}
                      onClick={() => toggleSaveSession(session.id)}
                    >
                      <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path
                          d="M3.5 1.75h7v10.5L7 9.6l-3.5 2.65Z"
                          fill={isSaved ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <div id={`r0-row-${session.id}`} className="ows-row-more" role="region" aria-label={session.title}>
                    <div className="ows-row-inner">
                      <p>{session.description}</p>
                      <button
                        type="button"
                        className="ows-link"
                        onClick={() =>
                          downloadCalendarFile({
                            title: session.title,
                            description: session.description,
                          })
                        }
                      >
                        <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                          <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M1.75 5.75h10.5M4.5 1.25v2.5M9.5 1.25v2.5" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                        <span>Add this session to my calendar</span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---- SPEAKERS ON STAGE SECTION ---- */}
        <section id="speakers" className="ows-sec ows-wrap" data-sec="speakers">
          <h2 className="ows-h2 ows-rise">On stage</h2>
          <p className="ows-intro ows-rise">Operators, not keynote tourists. Everyone here has run the playbook they're sharing.</p>

          <ul className="ows-speakers">
            {/* Speaker 1: Maya Okafor */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '0ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt0" x1="0" y1="0" x2="0.95" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt0)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.5 5.4L5.4 2.5M3.6 2.5H5.4V4.2M10.4 5.3L13.2 2.5M11.5 2.5H13.2V4.2M18.2 5.4L21.1 2.5M19.4 2.5H21.1V4.2M26.1 5.3L28.9 2.5M27.2 2.5H28.9V4.2M34 5.3L36.8 2.5M35.1 2.5H36.8V4.2M41.8 5.4L44.6 2.5M42.9 2.5H44.6V4.2M49.6 5.4L52.5 2.5M50.8 2.5H52.5V4.2M57.5 5.3L60.3 2.5M58.6 2.5H60.3V4.2M65.3 5.4L68.2 2.5M66.5 2.5H68.2V4.2M73.2 5.4L76.1 2.4M74.3 2.4H76.1V4.2M81 5.4L84 2.5M82.2 2.5H84V4.2M88.9 5.4L91.8 2.4M90.1 2.4H91.8V4.2M96.8 5.3L99.6 2.5M97.9 2.5H99.6V4.2M104.6 5.4L107.5 2.5M105.8 2.5H107.5V4.2M112.5 5.4L115.4 2.5M113.6 2.5H115.4V4.2M120.4 5.4L123.2 2.5M121.5 2.5H123.2V4.2M128.2 5.4L131.1 2.5M129.3 2.5H131.1V4.2M136.1 5.4L138.9 2.5M137.2 2.5H138.9V4.2M143.9 5.4L146.8 2.5M145.1 2.5H146.8V4.2M151.7 5.4L154.7 2.4M152.9 2.4H154.7V4.2M159.7 5.3L162.5 2.5M160.8 2.5H162.5V4.2M167.5 5.3L170.3 2.5M168.6 2.5H170.3V4.2M175.4 5.3L178.2 2.5M176.5 2.5H178.2V4.2M183.2 5.4L186.1 2.5M184.4 2.5H186.1V4.2M191.1 5.3L193.9 2.5M192.2 2.5H193.9V4.2M198.9 5.4L201.8 2.4M200.1 2.4H201.8V4.2M206.8 5.3L209.6 2.5M207.9 2.5H209.6V4.2M214.6 5.4L217.5 2.5M215.8 2.5H217.5V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M80.6 52.9L84.4 49.2M82.1 49.2H84.4V51.4M111.6 53.4L116.3 48.7M113.5 48.7H116.3V51.5M119.8 53.1L123.8 49.1M121.4 49.1H123.8V51.5M72.6 60.9L76.6 56.9M74.2 56.9H76.6V59.3M111.6 61.3L116.3 56.6M113.5 56.6H116.3V59.4M119.6 61.1L124 56.7M121.3 56.7H124V59.4M127.7 60.8L131.5 57M129.3 57H131.5V59.3"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M87.7 53.7L93 48.4M89.8 48.4H93V51.6M95.6 53.7L100.9 48.4M97.7 48.4H100.9V51.6M103.5 53.6L108.6 48.5M105.6 48.5H108.6V51.6M79.9 61.6L85.1 56.3M82 56.3H85.1V59.5M87.6 61.7L93.1 56.2M89.8 56.2H93.1V59.5M95.7 61.5L100.7 56.4M97.7 56.4H100.7V59.4M103.6 61.4L108.6 56.4M105.6 56.4H108.6V59.4"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M78.9 86.1L86.1 78.9M81.8 78.9H86.1V83.2M86.7 86.1L94 78.9M89.6 78.9H94V83.2M94.6 86.1L101.8 78.9M97.5 78.9H101.8V83.2M102.6 86L109.6 79M105.4 79H109.6V83.2M110.8 85.7L117.1 79.3M113.3 79.3H117.1V83.1M71.4 93.6L77.9 87.1M74 87.1H77.9V91M78.9 94L86.1 86.7M81.8 86.7H86.1V91.1M86.7 94L94 86.7M89.6 86.7H94V91.1M94.6 94L101.8 86.7M97.5 86.7H101.8V91.1"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Took Northwind from Series A to public markets with a finance team of eleven.</p>
              </div>
              <p className="ows-speaker-name">Maya Okafor</p>
              <p className="ows-speaker-role">CFO, Northwind Labs</p>
            </li>

            {/* Speaker 2: Daniel Reyes */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '70ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt1" x1="0" y1="0" x2="0.99" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt1)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.5 5.4L5.4 2.5M3.6 2.5H5.4V4.2M10.3 5.4L13.3 2.5M11.5 2.5H13.3V4.2M18.2 5.4L21.1 2.5M19.4 2.5H21.1V4.2M26.1 5.4L28.9 2.5M27.2 2.5H28.9V4.2M34 5.3L36.8 2.5M35.1 2.5H36.8V4.2M41.8 5.3L44.6 2.5M42.9 2.5H44.6V4.2M49.6 5.4L52.5 2.5M50.8 2.5H52.5V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M104 37.4L108.1 33.3M105.7 33.3H108.1V35.8M111.5 37.7L116.3 33M113.5 33H116.3V35.8M127.7 37.3L131.6 33.4M129.3 33.4H131.6V35.7M96.2 45.2L100.2 41.2M97.8 41.2H100.2V43.6M88.5 53L92.2 49.2M90 49.2H92.2V51.4"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M119.3 37.8L124.3 32.9M121.3 32.9H124.3V35.9M103.7 45.6L108.5 40.8M105.6 40.8H108.5V43.7M111.5 45.6L116.3 40.8M113.4 40.8H116.3V43.7M119.2 45.8L124.4 40.6M121.3 40.6H124.4V43.7"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M103 77.7L109.1 71.6M105.5 71.6H109.1V75.3M110.5 78.1L117.3 71.2M113.2 71.2H117.3V75.3M118.2 78.3L125.4 71M121.1 71H125.4V75.4M126 78.3L133.3 71M128.9 71H133.3V75.4M133.9 78.3L141.1 71M136.8 71H141.1V75.4"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Runs a five-day close across nine entities and three currencies.</p>
              </div>
              <p className="ows-speaker-name">Daniel Reyes</p>
              <p className="ows-speaker-role">Corporate Controller, Fieldstone</p>
            </li>

            {/* Speaker 3: Priya Natarajan */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '140ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt2" x1="0" y1="0" x2="0.36" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt2)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.4 5.4L5.4 2.4M3.6 2.4H5.4V4.2M10.4 5.4L13.2 2.5M11.5 2.5H13.2V4.2M18.2 5.4L21.1 2.5M19.4 2.5H21.1V4.2M26 5.4L29 2.5M27.2 2.5H29V4.2M33.9 5.4L36.8 2.5M35.1 2.5H36.8V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M96.4 45L100 41.4M97.9 41.4H100V43.6M104.3 45L107.9 41.4M105.7 41.4H107.9V43.6M80.2 53.3L84.8 48.8M82 48.8H84.8V51.5M103.7 53.4L108.4 48.7M105.6 48.7H108.4V51.5"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M87.8 53.6L92.9 48.5M89.8 48.5H92.9V51.6M95.7 53.5L100.7 48.6M97.7 48.6H100.7V51.6M79.8 61.7L85.2 56.2M82 56.2H85.2V59.5M87.6 61.7L93.1 56.2M89.8 56.2H93.1V59.5"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M78.9 86.1L86.1 78.9M81.8 78.9H86.1V83.2M86.7 86.1L94 78.9M89.6 78.9H94V83.2M94.6 86.1L101.8 78.9M97.5 78.9H101.8V83.2M102.8 85.8L109.3 79.2M105.4 79.2H109.3V83.2"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Rebuilt Arcwell's reporting stack twice and wrote the playbook both times.</p>
              </div>
              <p className="ows-speaker-name">Priya Natarajan</p>
              <p className="ows-speaker-role">VP Finance, Arcwell</p>
            </li>

            {/* Speaker 4: Lena Fischer */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '210ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt3" x1="0" y1="0" x2="0.50" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt3)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.5 5.4L5.4 2.5M3.6 2.5H5.4V4.2M10.3 5.4L13.3 2.5M11.5 2.5H13.3V4.2M18.2 5.4L21.1 2.5M19.4 2.5H21.1V4.2M26 5.4L29 2.5M27.2 2.5H29V4.2M33.9 5.4L36.8 2.5M35.1 2.5H36.8V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M104.3 45L107.9 41.4M105.7 41.4H107.9V43.6M112 45.2L115.9 41.2M113.5 41.2H115.9V43.6M119.4 53.4L124.1 48.7M121.3 48.7H124.1V51.5M127.7 53L131.6 49.1M129.2 49.1H131.6V51.5"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M95.7 53.6L100.8 48.5M97.7 48.5H100.8V51.6M103.4 53.7L108.7 48.4M105.5 48.4H108.7V51.6M111.4 53.6L116.5 48.5M113.4 48.5H116.5V51.6M87.7 61.6L93.1 56.2M89.8 56.2H93.1V59.5"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M86.7 86.1L94 78.9M89.6 78.9H94V83.2M94.6 86.1L101.8 78.9M97.5 78.9H101.8V83.2M102.5 86.1L109.7 78.9M105.3 78.9H109.7V83.2M110.6 85.8L117.2 79.2M113.3 79.2H117.2V83.2"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Ships automations to the ledger the way engineers ship code.</p>
              </div>
              <p className="ows-speaker-name">Lena Fischer</p>
              <p className="ows-speaker-role">Head of Accounting Ops, Lumen & Co</p>
            </li>

            {/* Speaker 5: Sam Whitaker */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '0ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt4" x1="0" y1="0" x2="0.89" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt4)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.5 5.3L5.3 2.5M3.6 2.5H5.3V4.2M10.4 5.3L13.2 2.5M11.5 2.5H13.2V4.2M18.2 5.4L21.1 2.5M19.4 2.5H21.1V4.2M26.1 5.3L28.9 2.5M27.2 2.5H28.9V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M96.1 45.3L100.3 41.1M97.8 41.1H100.3V43.6M103.7 45.5L108.4 40.9M105.6 40.9H108.4V43.7M111.7 45.4L116.1 41M113.5 41H116.1V43.7M120 45L123.6 41.4M121.4 41.4H123.6V43.6"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M111.3 53.7L116.5 48.5M113.4 48.5H116.5V51.6M119.2 53.6L124.4 48.5M121.3 48.5H124.4V51.6M103.7 61.3L108.5 56.5M105.6 56.5H108.5V59.4M111.3 61.5L116.5 56.3M113.4 56.3H116.5V59.4"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M102.7 85.9L109.5 79.1M105.4 79.1H109.5V83.2M110.3 86.1L117.5 78.9M113.2 78.9H117.5V83.2M118.2 86.1L125.4 78.9M121.1 78.9H125.4V83.2M126 86.1L133.3 78.9M128.9 78.9H133.3V83.2"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Turned a 40-day approval queue into a four-day one.</p>
              </div>
              <p className="ows-speaker-name">Sam Whitaker</p>
              <p className="ows-speaker-role">Head of Procurement, Tidewater Supply</p>
            </li>

            {/* Speaker 6: Aiko Tanaka */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '70ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt5" x1="0" y1="0" x2="0.36" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt5)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.5 5.4L5.4 2.5M3.6 2.5H5.4V4.2M10.3 5.4L13.2 2.5M11.5 2.5H13.2V4.2M18.2 5.4L21.1 2.5M19.4 2.5H21.1V4.2M26 5.4L29 2.5M27.2 2.5H29V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M96.3 45.1L100.1 41.3M97.8 41.3H100.1V43.6M104 45.3L108.2 41.1M105.7 41.1H108.2V43.6M112 45.2L115.9 41.3M113.5 41.3H115.9V43.6M111.7 53.3L116.1 48.9M113.5 48.9H116.1V51.5"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M87.9 53.6L92.9 48.6M89.9 48.6H92.9V51.6M95.8 53.5L100.6 48.7M97.7 48.7H100.6V51.6M103.6 53.5L108.5 48.6M105.6 48.6H108.5V51.6M79.9 61.5L85.1 56.3M82 56.3H85.1V59.4"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M78.9 86.1L86.1 78.9M81.8 78.9H86.1V83.2M86.7 86.1L94 78.9M89.6 78.9H94V83.2M94.6 86.1L101.8 78.9M97.5 78.9H101.8V83.2M102.6 86L109.5 79M105.4 79H109.5V83.2"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Builds forecasts that leadership actually opens on Monday mornings.</p>
              </div>
              <p className="ows-speaker-name">Aiko Tanaka</p>
              <p className="ows-speaker-role">FP&amp;A Lead, Kiteline</p>
            </li>

            {/* Speaker 7: Jordan Blake */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '140ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt6" x1="0" y1="0" x2="0.99" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt6)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.5 5.4L5.4 2.5M3.6 2.5H5.4V4.2M10.3 5.4L13.3 2.4M11.5 2.4H13.3V4.2M18.2 5.3L21.1 2.5M19.4 2.5H21.1V4.2M26 5.4L29 2.5M27.2 2.5H29V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M104.2 37.2L107.9 33.5M105.7 33.5H107.9V35.7M111.9 37.4L116 33.3M113.5 33.3H116V35.8M119.7 37.5L123.9 33.2M121.4 33.2H123.9V35.8M88.6 45L92.2 41.4M90 41.4H92.2V43.6"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M111.5 45.7L116.4 40.7M113.4 40.7H116.4V43.7M119.3 45.7L124.3 40.7M121.3 40.7H124.3V43.7M126.9 45.9L132.3 40.5M129.1 40.5H132.3V43.8M135.1 45.6L139.9 40.8M137 40.8H139.9V43.7"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M103 77.7L109.1 71.6M105.5 71.6H109.1V75.3M110.6 78L117.3 71.3M113.3 71.3H117.3V75.3M118.3 78.2L125.3 71.1M121.1 71.1H125.3V75.3M126 78.3L133.3 71M128.9 71H133.3V75.4"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Has sat across the table from more than two hundred CFOs.</p>
              </div>
              <p className="ows-speaker-name">Jordan Blake</p>
              <p className="ows-speaker-role">General Partner, Meridian Hill</p>
            </li>

            {/* Speaker 8: Elena Varga */}
            <li className="ows-speaker ows-rise" tabIndex={0} style={{ '--d': '210ms' } as React.CSSProperties}>
              <div className="ows-portrait">
                <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <linearGradient id="r0pt7" x1="0" y1="0" x2="0.32" y2="1">
                      <stop offset="0" stopColor="var(--ows-deep)" />
                      <stop offset="1" stopColor="var(--ows-mid)" />
                    </linearGradient>
                  </defs>
                  <rect width="220" height="260" fill="url(#r0pt7)" />
                  <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
                    <path
                      d="M2.5 5.3L5.3 2.5M3.6 2.5H5.3V4.2M10.3 5.4L13.2 2.5M11.5 2.5H13.2V4.2M18.2 5.4L21.1 2.5M19.4 2.5H21.1V4.2M26 5.4L29 2.4M27.2 2.4H29V4.2"
                      style={{ opacity: 0.16 }}
                    />
                    <path
                      d="M96.3 45.1L100.1 41.3M97.8 41.3H100.1V43.6M103.9 45.4L108.2 41.1M105.6 41.1H108.2V43.6M111.6 45.5L116.2 40.9M113.5 40.9H116.2V43.7M119.8 45.2L123.8 41.2M121.4 41.2H123.8V43.6"
                      style={{ opacity: 0.42 }}
                    />
                    <path
                      d="M103.6 53.5L108.5 48.6M105.6 48.6H108.5V51.6M111.4 53.6L116.5 48.5M113.4 48.5H116.5V51.6M119.2 53.6L124.3 48.5M121.3 48.5H124.3V51.6M127.2 53.5L132 48.7M129.2 48.7H132V51.6"
                      style={{ opacity: 0.76 }}
                    />
                    <path
                      className="ows-pb3"
                      d="M95.2 85.5L101.2 79.5M97.6 79.5H101.2V83.1M102.8 85.7L109.3 79.3M105.4 79.3H109.3V83.1M110.4 86.1L117.5 78.9M113.2 78.9H117.5V83.2M118.2 86.1L125.4 78.9M121.1 78.9H125.4V83.2"
                      style={{ opacity: 1 }}
                    />
                  </g>
                </svg>
                <p className="ows-bio">Led three audits through migrations without a single restatement.</p>
              </div>
              <p className="ows-speaker-name">Elena Varga</p>
              <p className="ows-speaker-role">Chief Accounting Officer, Brightpath</p>
            </li>
          </ul>
        </section>

        {/* ---- LOCATION SECTION ---- */}
        <section id="venue" className="ows-sec ows-wrap" data-sec="venue">
          <h2 className="ows-h2 ows-rise">On location</h2>

          <div className="ows-venue ows-rise">
            <div className="ows-venue-info">
              <p className="ows-venue-name">Hudson Atrium</p>
              <p className="ows-venue-addr">
                600 West 22nd Street
                <br />
                New York, NY 10011
              </p>

              <ul className="ows-notes">
                <li>
                  <svg className="ows-svg" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                  Doors open at 8:00 AM
                </li>
                <li>
                  <svg className="ows-svg" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                  Business casual
                </li>
                <li>
                  <svg className="ows-svg" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                  Two blocks from the High Line
                </li>
                <li>
                  <svg className="ows-svg" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                  Step-free access throughout
                </li>
              </ul>

              <div className="ows-venue-actions">
                <a
                  className="ows-btn ows-btn--dark ows-btn--sm"
                  href="https://www.google.com/maps/search/?api=1&query=Hudson+Atrium,+600+West+22nd+Street,+New+York,+NY+10011"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Get directions</span>
                  <svg className="ows-svg" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                </a>

                <button
                  type="button"
                  className="ows-link"
                  onClick={() =>
                    downloadCalendarFile({
                      title: 'Onward Summit 2026',
                      description: 'Full day summit at Hudson Atrium, New York.',
                      location: 'Hudson Atrium, 600 West 22nd Street, New York, NY 10011',
                    })
                  }
                >
                  <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M1.75 5.75h10.5M4.5 1.25v2.5M9.5 1.25v2.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  <span>Add the day to my calendar</span>
                </button>
              </div>
            </div>

            {/* Interactive Street Map */}
            <div
              className="ows-map"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width - 0.5) * -16;
                const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
                setMapPan({ x, y });
              }}
              onMouseLeave={() => setMapPan({ x: 0, y: 0 })}
              style={{ '--ows-mx': `${mapPan.x}px`, '--ows-my': `${mapPan.y}px` } as React.CSSProperties}
            >
              <svg className="ows-svg ows-map-svg" viewBox="0 0 560 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map showing Hudson Atrium">
                <defs>
                  <clipPath id="r0mc">
                    <rect width="560" height="400" />
                  </clipPath>
                </defs>
                <g clipPath="url(#r0mc)">
                  <rect width="560" height="400" fill="var(--ows-tint)" />
                  <g className="ows-map-pan">
                    <g transform="translate(300 210) rotate(-29)">
                      {[-360, -330, -300, -270, -240, -210, -180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].map(
                        (y, idx) => (
                          <line key={idx} x1="-400" y1={y} x2="400" y2={y} className="ows-map-st" />
                        )
                      )}
                      {[-468, -390, -312, -234, -156, -78, 0, 78, 156, 234, 312, 390, 468].map((x, idx) => (
                        <line key={idx} x1={x} y1="-400" x2={x} y2="400" className="ows-map-av" />
                      ))}
                      <rect x="70" y="-310" width="156" height="210" className="ows-map-park" />
                      <rect x="-170" y="60" width="64" height="48" className="ows-map-park" />
                      <line x1="-400" y1="-260" x2="400" y2="190" className="ows-map-bway" />
                    </g>
                    <path d="M-20 -20H86C70 60 40 120 58 190C76 260 40 330 70 430H-20Z" className="ows-map-water" />
                    <path d="M600 280C540 300 500 340 470 430H600Z" className="ows-map-water" />
                  </g>
                </g>
              </svg>

              <div className="ows-pin" aria-hidden="true">
                <span className="ows-pin-pulse" />
                <span className="ows-pin-dot">
                  <svg className="ows-svg" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                </span>
              </div>
              <div className="ows-pin-label">Hudson Atrium</div>
            </div>
          </div>
        </section>

        {/* ---- FAQ SECTION ---- */}
        <section id="faq" className="ows-sec ows-wrap" data-sec="faq">
          <h2 className="ows-h2 ows-rise">On your mind</h2>

          <div className="ows-faq ows-rise">
            {FAQ_DATA.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="ows-faq-item" data-open={isOpen ? 'true' : 'false'}>
                  <h3 className="ows-faq-h">
                    <button
                      type="button"
                      className="ows-faq-q"
                      aria-expanded={isOpen}
                      aria-controls={`r0-faq-${idx}`}
                      id={`r0-faqq-${idx}`}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <span className="ows-faq-icon" aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`r0-faq-${idx}`} role="region" aria-labelledby={`r0-faqq-${idx}`} className="ows-faq-a">
                    <div className="ows-row-inner">
                      <p>{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* =========================================================================
          REGISTER / SAVE YOUR SEAT BAND
          ========================================================================= */}
      <section id="register" className="ows-band" data-sec="register">
        <div className="ows-field" aria-hidden="true">
          <InteractiveCanvas />
        </div>

        <div className="ows-wrap ows-band-grid">
          <div className="ows-band-copy">
            <span className="ows-kicker ows-kicker--light">On the list</span>
            <h2 className="ows-band-title">Save your seat</h2>
            <p className="ows-band-sub">Rooms stay small enough to actually talk, so seats are limited.</p>

            {/* Countdown widget */}
            <div className="ows-count" aria-live="off">
              <span className="ows-count-label">Doors open in</span>
              <div className="ows-count-cells">
                <span className="ows-count-cell">
                  <span className="ows-count-v">{String(countdown.days).padStart(2, '0')}</span>
                  <span className="ows-count-k">days</span>
                </span>
                <span className="ows-count-cell">
                  <span className="ows-count-v">{String(countdown.hrs).padStart(2, '0')}</span>
                  <span className="ows-count-k">hrs</span>
                </span>
                <span className="ows-count-cell">
                  <span className="ows-count-v">{String(countdown.min).padStart(2, '0')}</span>
                  <span className="ows-count-k">min</span>
                </span>
                <span className="ows-count-cell">
                  <span className="ows-count-v">{String(countdown.sec).padStart(2, '0')}</span>
                  <span className="ows-count-k">sec</span>
                </span>
              </div>
            </div>

            {/* Seats meter */}
            <div className="ows-seats">
              <div className="ows-seats-top">
                <span>
                  <strong>113</strong> of 400 seats left
                </span>
                <span>72% claimed</span>
              </div>
              <div className="ows-meter" role="meter" aria-label="Seats claimed" aria-valuemin={0} aria-valuemax={400} aria-valuenow={287}>
                <i style={{ width: '71.75%' }} />
              </div>
            </div>
          </div>

          {/* Form or Ticket */}
          <div className="ows-card">
            {!formSubmitted ? (
              <form className="ows-form" onSubmit={handleRegisterSubmit} noValidate>
                <label className="ows-field-row" htmlFor="r0-reg-name">
                  <span className="ows-label">Full name</span>
                  <input
                    id="r0-reg-name"
                    className="ows-input"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="e.g. Sarah Lin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>

                <label className="ows-field-row" htmlFor="r0-reg-email">
                  <span className="ows-label">Work email</span>
                  <input
                    id="r0-reg-email"
                    className="ows-input"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="sarah@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </label>

                <label className="ows-field-row" htmlFor="r0-reg-company">
                  <span className="ows-label">Company</span>
                  <input
                    id="r0-reg-company"
                    className="ows-input"
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme Corp"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </label>

                <label className="ows-field-row" htmlFor="r0-reg-role">
                  <span className="ows-label">Role</span>
                  <span className="ows-select">
                    <select
                      id="r0-reg-role"
                      className="ows-input"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="CFO">CFO</option>
                      <option value="Controller">Controller</option>
                      <option value="Head of procurement">Head of procurement</option>
                      <option value="Accountants">Accountants</option>
                      <option value="Other">Other</option>
                    </select>
                    <svg className="ows-svg ows-chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </label>

                <button type="submit" className="ows-btn ows-btn--accent ows-btn--wide">
                  <span>Request my seat</span>
                  <svg className="ows-svg" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                  </svg>
                </button>

                <p className="ows-fine">Free to attend. We confirm every seat within two business days.</p>
              </form>
            ) : (
              /* Generated Summit Pass */
              <div className="ows-ticket">
                <div className="ows-ticket-top">
                  <span className="ows-tag">Seat Confirmed</span>
                  <h3 className="ows-ticket-name">{formData.name}</h3>
                  <p className="ows-ticket-meta">
                    {formData.role} {formData.company ? `· ${formData.company}` : ''}
                  </p>
                </div>

                <div className="ows-ticket-perf" />

                <div className="ows-ticket-bot">
                  <div>
                    <span className="ows-ticket-label">Access Pass Code</span>
                    <span className="ows-ticket-code">{ticketCode}</span>
                  </div>

                  <div className="ows-ticket-actions">
                    <button
                      type="button"
                      className="ows-btn ows-btn--dark ows-btn--sm"
                      onClick={() =>
                        downloadCalendarFile({
                          title: 'Onward Summit 2026 (Confirmed Seat)',
                          description: `Attendee: ${formData.name}\nPass Code: ${ticketCode}\nVenue: Hudson Atrium`,
                        })
                      }
                    >
                      <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M1.75 5.75h10.5M4.5 1.25v2.5M9.5 1.25v2.5" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                      <span>Add to calendar</span>
                    </button>

                    <button type="button" className="ows-link" onClick={() => setFormSubmitted(false)}>
                      Register another attendee
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer className="ows-foot">
        <div className="ows-wrap ows-foot-grid">
          <div className="ows-brand ows-brand--foot">
            <span className="ows-brand-word">keel</span>
            <svg className="ows-svg" width="17" height="14" viewBox="0 0 17 14" aria-hidden="true">
              <path
                d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <nav className="ows-foot-links" aria-label="Footer">
            <a href="#agenda">Agenda</a>
            <a href="#speakers">Speakers</a>
            <a href="#venue">Venue</a>
            <a href="#faq">FAQ</a>
            <a href="#register">Register</a>
          </nav>

          <p className="ows-foot-note">© 2026 Keel Financial, Inc. Onward is free for confirmed guests.</p>
        </div>

        <div className="ows-foot-word" aria-hidden="true">
          Onward
        </div>
      </footer>
    </div>
  );
}
