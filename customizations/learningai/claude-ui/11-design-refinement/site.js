/* LearningAI: Home, Course (+ parts), lesson cover and player, Toolkit, Projects, About, account pages.
   Premium through restraint: large type, silver numerals, one action per screen, nothing moving on its own.
   Course content comes from course.js (the real 15-lesson catalogue). Each fact has one home:
   where you are → Home; the map → Course; your cards → Toolkit; what we store → Privacy settings. */
(function () {
  const C = window.LAI_COURSE;
  const root = document.getElementById('root');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = () => reduced || document.documentElement.classList.contains('calm');

  /* ---------- helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const fmtDur = m => `${Math.floor(m / 60)} h ${pad(m % 60)}`;
  const AR = '<span class="ar" aria-hidden="true"></span>';
  const CHEV = '<span class="chev" aria-hidden="true">›</span>';
  const isEmail = v => /^\S+@\S+\.\S+$/.test(v);
  const stop = t => /[?!.]$/.test(t) ? '' : '.'; // end a sentence after a title without doubling punctuation
  const pressOne = (group, btn) => group.forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
  const outcome = (cap, text) => `<div class="outcome" tabindex="-1"><span class="cap">${cap}</span>${text}</div>`;
  const notice = (el, msg) => { el.innerHTML = `<p class="notice" tabindex="-1">${msg}</p>`; el.firstChild.focus(); };
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];

  /* ---------- course model ---------- */
  const PARTS = window.LAI_PARTS; // name, short (dial label), line
  const partLessons = i => C.filter(l => l.arc === PARTS[i].name);
  const partOf = l => PARTS.findIndex(p => p.name === l.arc);
  const totalMin = C.reduce((s, l) => s + l.min, 0);
  const STATUS = { done: 'Complete', now: 'In progress', locked: 'Locked' };
  const cardName = l => l.steps[l.steps.length - 1].fields.length > 1 ? 'Project' : 'Your answer';

  /* Accounts. In this prototype, sign-in checks the fake test accounts in demo-accounts.js; INTEGRATION.md
     describes swapping signIn/signOut/join for the real API. Progress lives in memory for the session. */
  const DEMO = window.LAI_DEMO || { accounts: [] };
  const SESSION_KEY = 'learningai-demo-session';
  const PREFS = { text: 'std', motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full' };
  try { Object.assign(PREFS, JSON.parse(localStorage.getItem('learningai-prefs')) || {}); } catch (e) {} // text size and Calm, remembered in this browser
  let ME = null;
  const LS = {}; // lesson answers in memory, for whoever is signed in now
  const STATE_KEY = id => `learningai-demo-state:${id}`;
  /* Saving is browser-only in this prototype (localStorage). saveOk records whether the last write worked,
     so screens can say "Saved in this browser" truthfully, or warn when the browser refuses storage. */
  let saveOk = true, savedAt = null;
  const noteSave = ok => { saveOk = ok; if (ok) savedAt = new Date(); const el = document.getElementById('save-state');
    if (el) { el.textContent = ok ? `Saved in this browser · ${String(savedAt.getHours()).padStart(2, '0')}:${String(savedAt.getMinutes()).padStart(2, '0')}` : 'Not saved · this browser is blocking storage'; el.classList.toggle('bad', !ok); }
    const w = document.getElementById('save-warn'); if (w) w.hidden = ok; return ok; };
  const saveMe = () => { if (!ME || !DEMO.accounts.some(a => a.id === ME.id)) return true; try { const { done, current, step, cards, dates, tricky, name, updates } = ME; localStorage.setItem(STATE_KEY(ME.id), JSON.stringify({ done, current, step, cards, dates, tricky, name, updates })); return noteSave(true); } catch (e) { return noteSave(false); } };
  const forgetLessons = () => Object.keys(LS).forEach(k => delete LS[k]);
  const signIn = acct => { forgetLessons(); ME = JSON.parse(JSON.stringify(acct)); try { Object.assign(ME, JSON.parse(localStorage.getItem(STATE_KEY(acct.id))) || {}); localStorage.setItem(SESSION_KEY, acct.id); } catch (e) {} };
  const signOut = () => { forgetLessons(); ME = null; try { localStorage.removeItem(SESSION_KEY); } catch (e) {} };
  try { const saved = DEMO.accounts.find(a => a.id === localStorage.getItem(SESSION_KEY)); if (saved) signIn(saved); } catch (e) {}
  const cards = () => ME?.cards || {};
  const status = l => !ME ? (l.num === 1 ? 'now' : 'locked') : ME.done.includes(l.id) ? 'done' : l.id === ME.current ? 'now' : 'locked';
  const cur = () => (ME && C.find(l => l.id === ME.current)) || C[0];
  const step = () => ME?.step || 0;
  const minsLeft = () => { const l = cur(); return Math.max(2, Math.round(l.min * (1 - step() / l.steps.length))); };
  const isNew = () => !ME || (!ME.done.length && !ME.step);
  const finished = () => !!ME && ME.done.length === C.length;
  const applyPrefs = () => { document.documentElement.classList.toggle('text-lg', PREFS.text === 'lg'); document.documentElement.classList.toggle('calm', PREFS.motion === 'calm'); };
  applyPrefs();

  /* ---------- chrome: header built once, content swapped per route ---------- */
  const TABS = [['course', 'Course'], ['projects', 'Projects'], ['about', 'About']]; // Toolkit (your written work) is reached from Course and the finished-lesson page
  const TITLES = { course: 'Course', toolkit: 'Toolkit', projects: 'Projects', about: 'About', parents: 'About', teachers: 'About', faq: 'About', account: 'Settings', signin: 'Sign in', join: 'Join', forgot: 'Reset password', verify: 'Check your email', privacy: 'Privacy' };
  const subtabs = (items, current, label) => `<nav class="subtabs" aria-label="${label}">${items.map(([k, t]) => `<a href="#${k}" ${current === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
  let activeTab = '';
  function chrome() {
    if (!document.getElementById('nav')) {
      root.innerHTML = `<header class="nav" id="nav"><div class="wrap nav-in">
          <button class="menu-trigger" id="menu" aria-label="Menu" aria-expanded="false" aria-haspopup="dialog"><i aria-hidden="true"></i><span aria-hidden="true">Menu</span></button>
          <a class="mark" href="#home" aria-label="LearningAI home">LearningAI</a>
          <a class="nav-ctx" id="ctx" href="#signin"></a>
        </div></header><div id="view"></div>`;
      document.getElementById('menu').addEventListener('click', openMenu);
      window.onscroll = () => document.getElementById('nav').classList.toggle('solid', scrollY > 40 || activeTab !== 'home');
    }
    return document.getElementById('view');
  }
  /* The header's Resume is the one shortcut back into the lesson; it hides wherever the page already offers Resume. */
  /* Header, right: a circle with your initials that opens Settings; Sign in when signed out. */
  const initials = n => { const w = String(n || '').trim().split(/\s+/).filter(Boolean), first = x => [...[...x][0].toUpperCase()][0]; return w.length ? first(w[0]) + (w.length > 1 ? first(w[w.length - 1]) : '') : '·'; };
  function syncAccount() {
    const a = document.getElementById('ctx');
    if (ME) { a.href = '#account'; a.className = 'nav-ctx avatar'; a.textContent = initials(ME.name); a.setAttribute('aria-label', `${initials(ME.name)}, settings for ${ME.name}`); }
    else { a.href = '#signin'; a.className = 'nav-ctx'; a.textContent = 'Sign in'; a.removeAttribute('aria-label'); }
  }
  function page(active, body, opts = {}) {
    const view = chrome(), n = document.getElementById('nav');
    activeTab = active; n.hidden = !!opts.bare;
    n.classList.toggle('no-menu', !ME); // the marketing side has no menu: logo and Sign in only
    n.classList.toggle('solid', scrollY > 40 || active !== 'home');
    syncAccount();
    view.innerHTML = `<main id="main" tabindex="-1">${/<h1[\s>]/.test(body) ? '' : `<h1 class="vh">${TITLES[active] || 'LearningAI'}</h1>`}${body}</main>${opts.bare || opts.foot === false ? '' : footHtml()}`;
    animateIn(document.getElementById('main'));
  }

  /* ---------- menu: the page dims; each word comes out from the left on its own and travels right into place.
     Closing sends each word on to the right, last word first, then the page comes back. ---------- */
  let menuTimer;
  function openMenu() {
    const btn = document.getElementById('menu');
    clearTimeout(menuTimer); document.querySelectorAll('.mx').forEach(x => x.remove());
    const words = [['home', 'Home'], ...TABS];
    const w = document.createElement('div'); w.className = 'mx'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Menu');
    w.innerHTML = `<div class="mx-curtain"></div><div class="mx-in wrap">
      <div class="mx-top"><button class="mx-close" id="close" aria-label="Close menu"><i aria-hidden="true"></i><span aria-hidden="true">Close</span></button><span class="mark">LearningAI</span><span></span></div>
      <div class="mx-grid">
        <nav class="mx-words" aria-label="Menu">${words.map(([k, t], i) => `<a href="#${k}" style="--d:${140 + i * 95}ms" ${k === activeTab ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
      </div>
      <div class="mx-foot"><a class="cap" href="#${ME ? 'account' : 'signin'}">${ME ? `Settings · ${esc(ME.name)}` : 'Sign in'}</a><span class="cap dim">Free · Ages 13–18</span></div>
    </div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden'; root.inert = true; btn.setAttribute('aria-expanded', 'true');
    [...w.querySelectorAll('.mx-words a')].reverse().forEach((el, i) => el.style.setProperty('--dc', `${i * 28}ms`));
    const show = () => w.classList.add('open'); requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80);
    const close = (e) => { if (w.classList.contains('closing')) return; const byKey = e?.type === 'keydown' || (e?.detail === 0); w.classList.add('closing'); root.inert = false; btn.setAttribute('aria-expanded', 'false'); menuTimer = setTimeout(() => { w.remove(); document.body.style.overflow = ''; }, still() ? 0 : 820); btn.focus({ focusVisible: byKey }); };
    w.querySelector('#close').addEventListener('click', close);
    addEventListener('hashchange', () => w.isConnected && close(), { once: true });
    w.querySelectorAll('a').forEach(x => x.addEventListener('click', close));
    w.addEventListener('keydown', e => { if (e.key === 'Escape') close(e); if (e.key === 'Tab') { const f = [...w.querySelectorAll('button, a')].filter(x => x.offsetParent); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
    w.querySelector('#close').focus();
  }

  /* ---------- motion: staged reveal after every render ---------- */
  const REVEAL = '.hi-when, .hi-quote, .lead-line, .ihead .kick, .ihead p, .prog, .fin > :not(h1), .cpart, .lc-num, .lc-body > :not(h1), .lstep, .auth-l > *, .form > *, .set-row, .subtabs, .prow, .lrow, .footnote, .slots, .slot-detail, .about-sec, .lesson > :not(h1):not(.lstep)';
  function animateIn(scope, dir) {
    if (!scope) return;
    scope.querySelectorAll('h1').forEach((h, n) => { h.setAttribute('tabindex', '-1'); if (h.classList.contains('vh')) return; h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map((x, i) => `<span class="mask"><span style="transition-delay:${40 + (n + i) * 90}ms">${x}</span></span>`).join(''); });
    let i = 0; scope.querySelectorAll(REVEAL).forEach(e => { e.classList.add('rv'); e.style.setProperty('--d', `${200 + Math.min(i++, 7) * 45}ms`); });
    if (dir) scope.dataset.dir = dir;
    const show = () => scope.classList.add('in');
    if (reduced) return show();
    requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80); // timer fallback if frames are paused
  }

  /* ---------- Inner-page headers ---------- */
  /* Inner-page header: label, title, line, and a row of readouts */
  const ihead = (kick, h1, p) => `<header class="ihead"><div><span class="cap kick">${kick}</span><h1>${h1}</h1>${p ? `<p>${p}</p>` : ''}</div></header>`;
  const nDone = () => ME ? ME.done.length : 0;

  /* ---------- Home, one screen. Signed in: the time, a greeting that follows it, your course progress (the main thing),
     one button and a new line of encouragement. Signed out: why we do this, then sign in. ---------- */
  const QUOTES = ['Small steps, taken often, turn into judgment.', 'Your first answer is a draft. So is the AI’s.', 'You don’t have to know everything. You have to know what to check.',
    'A good question is half the work.', 'Curiosity first. Confidence follows.', 'Ten focused minutes beat an hour of scrolling.', 'The best tool is the one you can explain.',
    'Being unsure out loud is how experts start.', 'You decide what counts as finished.', 'Check the part that matters, then move on.'];
  const nextQuote = () => { let i = Math.floor(Math.random() * QUOTES.length); try { const k = 'learningai-quote'; i = ((+localStorage.getItem(k) || 0) + 1) % QUOTES.length; localStorage.setItem(k, i); } catch (e) {} return QUOTES[i]; };
  const WHY = 'AI answers in seconds. Deciding how to work with it still takes a person. LearningAI teaches that person to be you.';
  /* time of day from the device clock; Home checks it every second, so the time and greeting stay current */
  const daypart = d => { const h = d.getHours(); return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : 'evening'; }; // 5–12, 12–17, then evening through the night
  const GREET = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' };
  const clockText = d => `${d.toLocaleDateString('en', { weekday: 'long' })} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  /* a part's progress, counting steps inside the lesson you're on */
  const lessonFrac = l => { const s = status(l); return s === 'done' ? 1 : s === 'now' && ME ? step() / l.steps.length : 0; };
  const segs = ls => `<div class="segs" aria-hidden="true">${ls.map(l => `<i><b style="width:${lessonFrac(l) * 100}%"></b></i>`).join('')}</div>`;
  /* Course progress: 15 segments in three groups. Three states:
     zero     — no number; outlined segments and a "start here" marker on lesson 01;
     partial  — the number, finished lessons filled, the current lesson filled by the step you've reached;
     complete — 100% and one slow sweep of light.
     Motion only celebrates change: the page remembers what you last saw (per account, in this browser) and
     animates just the difference. Nothing new = nothing moves. Calm and reduced motion show the result at once. */
  const SEEN_KEY = () => `learningai-demo-seen:${ME?.id || 'anon'}`;
  const readSeen = () => { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY())); return Array.isArray(v?.fr) && v.fr.length === C.length ? v.fr : null; } catch (e) { return null; } };
  const writeSeen = fr => { try { localStorage.setItem(SEEN_KEY(), JSON.stringify({ fr })); } catch (e) {} };
  const progressModel = () => {
    const fr = C.map(lessonFrac), f = fr.reduce((a, b) => a + b, 0) / C.length, prev = readSeen() || fr;
    const state = finished() ? 'complete' : f === 0 ? 'zero' : 'partial', changed = fr.some((x, i) => x > prev[i] + 1e-6);
    return { fr, prev, state, changed, pct: Math.round(f * 100), prevPct: Math.round(prev.reduce((a, b) => a + b, 0) / C.length * 100) };
  };
  const progressHtml = m => { const l = cur(), nd = nDone(), k = step(), here = m.state === 'complete' ? -1 : C.indexOf(l), anim = m.changed && !still();
    const top = m.state === 'zero' ? `<span class="cap prog-start">Start here · lesson 01 · about ${C[0].min} min</span>`
      : `<span class="prog-pct num"><span id="pct">${anim ? m.prevPct : m.pct}</span><small>%</small></span><span class="cap">${m.state === 'complete' ? 'All fifteen lessons complete' : k ? `${nd} of ${C.length} lessons · lesson ${pad(l.num)}, step ${k + 1} of ${l.steps.length}` : `${nd} of ${C.length} lessons · lesson ${pad(l.num)} is next`}</span>`;
    const label = m.state === 'zero' ? `Not started. ${C.length} lessons ahead, starting with lesson 01.` : m.state === 'complete' ? 'Course complete: all 15 lessons.' : `${m.pct} percent: ${nd} of ${C.length} lessons done, now on lesson ${l.num}.`;
    return `<section class="prog state-${m.state}" aria-label="Your progress">
      <div class="prog-top">${top}</div>
      <div class="prog-bar" role="img" aria-label="${label}">${PARTS.map((p, i) => `<div class="prog-part"><div class="prog-segs">${partLessons(i).map(x => { const j = x.num - 1;
        return `<i class="${m.fr[j] >= 1 ? 'full' : ''}"><b style="width:${(anim ? m.prev[j] : m.fr[j]) * 100}%" data-to="${m.fr[j]}"></b>${j === here ? `<span class="here" style="left:${m.fr[j] * 100}%"></span>` : ''}</i>`; }).join('')}</div><span class="cap" aria-hidden="true">${pad(i + 1)} · ${p.short}</span></div>`).join('')}</div>
    </section>`; };
  /* after the page is drawn: grow only what changed, count the number up, sweep once on completion */
  const runProgress = m => {
    if (!$('.prog')) return;
    if (!m.changed || still()) { writeSeen(m.fr); return; }
    setTimeout(() => {
      $$('.prog-segs b').forEach(b => { b.style.width = `${+b.dataset.to * 100}%`; });
      const el = $('#pct'); if (el) { let v = m.prevPct; const steps = 24, inc = (m.pct - m.prevPct) / steps; let n = 0;
        const t = setInterval(() => { n++; el.textContent = n >= steps ? m.pct : Math.round(v + inc * n); if (n >= steps) clearInterval(t); }, 900 / steps); }
      if (m.state === 'complete') $('.prog').classList.add('sweep');
      writeSeen(m.fr);
    }, 600);
  };
  const footHtml = () => `<footer class="foot"><p class="cap">${C.length} lessons · Free · Ages 13–18</p><nav aria-label="More">${ME ? '<a href="#course">The course</a>' : ''}<a href="#about">About</a><a href="#parents">Parents</a><a href="#teachers">Teachers</a><a href="#privacy">Privacy</a></nav></footer>`;

  /* ---------- Marketing (signed out): what the course is, before anyone signs in ---------- */
  const marketingHtml = () => { const l1 = C[0], s1 = l1.steps[0];
    return `<section class="mk" aria-labelledby="mk-learn">
        <p class="cap">What you’ll learn</p>
        <h2 id="mk-learn">Three parts. Five short lessons each.</h2>
        <ol class="mk-parts">${PARTS.map((p, i) => `<li><span class="no num silver" aria-hidden="true">${pad(i + 1)}</span><div><h3>${p.name}</h3><p>${p.line}</p></div><span class="cap">${partLessons(i).length} lessons</span></li>`).join('')}</ol>
      </section>
      <section class="mk" aria-labelledby="mk-how">
        <p class="cap">How a lesson works</p>
        <h2 id="mk-how">About eight minutes. Nothing is graded.</h2>
        <ol class="mk-steps">
          <li><span class="cap">01</span><h3>Read a short situation</h3><p>A made-up but real-feeling problem, in a few sentences.</p></li>
          <li><span class="cap">02</span><h3>Decide, and see why</h3><p>Pick an answer. Every option explains itself, and you can change your mind.</p></li>
          <li><span class="cap">03</span><h3>Write your own plan</h3><p>A few sentences in your words. It’s kept, signed and dated, as your own guide to using AI.</p></li>
        </ol>
      </section>
      <section class="mk" aria-labelledby="mk-peek">
        <p class="cap">A look at lesson 01</p>
        <h2 id="mk-peek">${esc(l1.title)}</h2>
        <div class="mk-peek">
          <div class="case"><span class="cap">The situation</span><p>${esc(s1.scenario)}</p></div>
          <p class="ask">${esc(s1.prompt)}</p>
          <ul class="mk-answers" aria-label="Answers in lesson 01">${s1.choices.map((c, j) => `<li><a href="#lesson-1"><span class="k">${String.fromCharCode(65 + j)}</span><span>${esc(c.text)}</span></a></li>`).join('')}</ul>
          <p class="why-try">Pick one to start lesson 01. It needs no account.</p>
        </div>
      </section>
      <section class="mk" aria-labelledby="mk-adults">
        <p class="cap">For parents and teachers</p>
        <h2 id="mk-adults">Safe to start, easy to explain.</h2>
        <ul class="short">
          <li><span class="cap">01</span><span>Every example is made up. Students are told never to type real names, addresses or passwords.</span></li>
          <li><span class="cap">02</span><span>No outside AI account or subscription is needed. It runs in any browser.</span></li>
          <li><span class="cap">03</span><span>Nothing a student writes is public. <a class="ulink inline" href="#privacy">What we keep, and why</a>.</span></li>
        </ul>
        <p class="mk-links"><a class="ulink" href="#parents">For parents</a><a class="ulink" href="#teachers">For teachers</a></p>
      </section>
      <section class="mk mk-end" aria-labelledby="mk-end">
        <h2 id="mk-end">Ready when you are.</h2>
        <div class="hi-go"><a class="btn white" href="#signin">Sign in ${CHEV}</a><a class="ulink" href="#join">Create an account</a></div>
      </section>`; };

  let homeTick;
  function home() {
    const now = new Date(), l = cur(), done = finished(), k = step();
    if (!ME) {
      /* Before you sign in: why we do this (each word lights in turn as the page opens), then sign in */
      page('home', `<section class="hs" aria-label="Why we do this"><p class="hs-t">${WHY.split(' ').map((w, i) => `<span style="--i:${i}">${w} </span>`).join('')}</p></section>
        <section class="hin" aria-labelledby="hin-h">
          <h2 id="hin-h">Fifteen short lessons, for ages 13 to 18.</h2>
          <p class="why-p">What AI is really doing, when to check it, and how to stay the one who decides.</p>
          <div class="hi-go"><a class="btn white" id="ck-go" href="#signin">Sign in ${CHEV}</a><a class="ulink" href="#join">Create an account</a></div>
          ${(r => r?.completed ? `<p class="why-try">You finished lesson 01 in this browser. <a class="ulink inline" href="#done-1">See what you wrote</a>, or create an account to keep going.</p>`
            : r ? `<p class="why-try"><a class="ulink inline" href="#lesson-1">Continue lesson 01 · step ${anonStep(C[0], r) + 1} of ${C[0].steps.length}</a>. Saved in this browser.</p>`
            : `<p class="why-try"><a class="ulink inline" href="#intro-1">Or try lesson 01 first</a>. It needs no account.</p>`)(loadRec(C[0], null))}
        </section>
        ${marketingHtml()}`);
      return;
    }
    const pm = progressModel();
    const go = done ? ['#toolkit', 'See everything you made'] : [`#lesson-${l.num}`, k ? `Continue lesson ${pad(l.num)} · step ${k + 1} of ${l.steps.length}` : `Start lesson ${pad(l.num)} · ${l.min} min`];
    page('home', `<div class="hy">
        <p class="cap hi-when" id="hi-clock">${clockText(now)}</p>
        <h1 id="hi-h"><span id="hi-greet">${GREET[daypart(now)]}</span>,<br>${esc(ME.name)}.</h1>
        ${progressHtml(pm)}
        <div class="hi-go"><a class="btn white" id="ck-go" href="${go[0]}">${go[1]} ${CHEV}</a></div>
        <p class="hi-quote">“${nextQuote()}”</p>
      </div>`);
    runProgress(pm);
    /* keep the time and greeting current while Home is open */
    clearInterval(homeTick); homeTick = setInterval(() => { const c = document.getElementById('hi-clock'); if (!c) return clearInterval(homeTick); const d = new Date(); c.textContent = clockText(d); const g = document.getElementById('hi-greet'); if (g.textContent !== GREET[daypart(d)]) g.textContent = GREET[daypart(d)]; }, 1000);
  }


  /* ---------- Course: the map ---------- */
  const COURSE_TABS = [['course', 'Overview'], ['part-1', 'Part 01'], ['part-2', 'Part 02'], ['part-3', 'Part 03']];
  const rowState = (l, s) => s === 'done' ? 'Done' : s === 'now' ? (ME && step() ? 'In progress' : 'Next') : '<span class="vh">Locked</span>';
  const lessonRows = ls => `<ol class="crows">${ls.map(l => { const s = status(l), inner = `<span class="no num">${pad(l.num)}</span><span class="lt">${esc(l.title)}</span><span class="cap">${l.min} min</span><span class="state cap ${s}">${rowState(l, s)}</span>`;
    return `<li>${s === 'locked' ? `<span class="crow">${inner}</span>` : `<a class="crow" href="#intro-${l.num}">${inner}</a>`}</li>`; }).join('')}</ol>`;
  function course() {
    const nd = nDone(), pm = ME ? progressModel() : null;
    page('course', `<div class="wrap page">${subtabs(COURSE_TABS, 'course', 'Course sections')}
      ${ihead(`${C.length} lessons · ${PARTS.length} parts`, 'Course', 'Three parts of five lessons. Start with lesson 01; each one unlocks the next.')}
      ${ME ? progressHtml(pm) : ''}
      ${PARTS.map((p, i) => { const ls = partLessons(i), d = ls.filter(l => status(l) === 'done').length;
        return `<section class="cpart" aria-labelledby="cp-${i}"><a class="prow" href="#part-${i + 1}"><span class="no num silver">${pad(i + 1)}</span><div><h2 id="cp-${i}">${p.name}</h2><p>${p.line}</p>${segs(ls)}</div><span class="cap">${d} of ${ls.length}</span>${AR}</a>${lessonRows(ls)}</section>`; }).join('')}
      <p class="cwork"><a class="ulink" href="#toolkit">Everything you’ve written</a></p>
    </div>`);
    if (pm) runProgress(pm);
  }
  function part(i) {
    const p = PARTS[i], ls = partLessons(i), d = ls.filter(l => status(l) === 'done').length;
    page('course', `<div class="wrap page">${subtabs(COURSE_TABS, `part-${i + 1}`, 'Course sections')}
      ${ihead(`Part ${pad(i + 1)}`, p.name, p.line)}
      <div class="rows">${ls.map(l => { const s = status(l), inner = `<span class="no num">${pad(l.num)}</span><span class="lt">${esc(l.title)}</span><span class="cap">${l.min} min</span><span class="state cap ${s}">${STATUS[s]}</span>`; return s === 'locked' ? `<div class="lrow">${inner}</div>` : `<a class="lrow" href="#intro-${l.num}">${inner}</a>`; }).join('')}</div>
    </div>`);
  }

  /* ---------- Lesson cover ---------- */
  function intro(num) {
    const l = C[num - 1]; if (!l) return course();
    const anon = !ME && l.num === 1 ? loadRec(l, null) : null;
    const s = anon?.completed ? 'done' : status(l), pi = partOf(l), k = s === 'now' ? (ME ? step() : anon ? anonStep(l, anon) : 0) : 0;
    const stepState = j => s === 'done' || (s === 'now' && j < k) ? 'done' : s === 'now' && j === k ? 'now' : '';
    const go = s === 'locked' ? `<p class="cap">Opens after lesson ${pad(l.num - 1)}</p>`
      : `<a class="btn white" id="ck-go" href="#lesson-${l.num}">${s === 'now' && k ? `Resume step ${pad(k + 1)}` : s === 'done' ? 'Review' : 'Begin'} ${CHEV}</a>`;
    page('course', `<div class="wrap lc">
        <div class="lc-num num silver" aria-hidden="true">${pad(l.num)}</div>
        <div class="lc-body">
          <a class="cap" href="#part-${pi + 1}">Part ${pad(pi + 1)} · ${PARTS[pi].name}</a>
          <h1>${esc(l.title)}</h1>
          <p class="lead-line">${esc(l.q)}</p>
          <ol class="lc-steps">${l.steps.map((x, j) => `<li class="${stepState(j)}"><span class="no num">${pad(j + 1)}</span><span>${esc(x.title)}</span><span class="cap">${stepState(j) === 'done' ? 'Done' : stepState(j) === 'now' ? 'You are here' : ''}</span></li>`).join('')}</ol>
          <p class="cap lc-meta">About ${l.min} min · ${l.steps.length} steps</p>
          <div class="lc-go">${go}</div>
        </div>
      </div>`);
  }

  /* ---------- Toolkit: your cards ---------- */
  let openSlot = 1;
  const cardFields = n => C[n - 1].steps[C[n - 1].steps.length - 1].fields.map((f, i) => [f.label, cards()[n]?.[i] || '']);
  const slotDetail = () => openSlot && cards()[openSlot] ? `<span class="cap">Lesson ${pad(openSlot)} · ${esc(cardName(C[openSlot - 1]))}</span><h2>${esc(C[openSlot - 1].title)}</h2><dl>${cardFields(openSlot).map(([k, v]) => `<div><dt class="cap">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${ME?.dates?.[openSlot] ? `<p class="sheet-sig"><span>${esc(ME.name)}</span><span>${longDate(new Date(ME.dates[openSlot]))}</span></p>` : ''}` : '';
  function toolkit() {
    const got = n => !!cards()[n]; if (!got(openSlot)) openSlot = +Object.keys(cards())[0] || 0;
    page('toolkit', `<div class="wrap page">
      ${ihead('Toolkit', 'Your toolkit', 'One thing you write at the end of each lesson, kept here with your name and the date. By lesson 15 it’s your own guide to using AI, in your words.')}
      ${Object.keys(cards()).length ? '' : `<p class="empty">${ME ? 'Nothing here yet. Finish lesson 01 and your first piece appears here.' : 'Sign in to keep what you write. Lesson 01 works without an account.'}</p>`}
      <div class="slots" role="group" aria-label="Toolkit cards, one per lesson">${C.map(l => `<button class="slot ${got(l.num) ? 'got' : ''}" data-n="${l.num}" ${got(l.num) ? `aria-pressed="${openSlot === l.num}"` : 'disabled'} aria-label="Lesson ${pad(l.num)}, ${esc(cardName(l))}${got(l.num) ? '' : ', not earned yet'}">${pad(l.num)}<small>${esc(l.title)}</small></button>`).join('')}</div>
      <section class="slot-detail" id="slot-detail" aria-live="polite">${slotDetail()}</section>
    </div>`);
    const slots = $$('.slot.got');
    slots.forEach(b => b.addEventListener('click', () => { openSlot = openSlot === +b.dataset.n ? 0 : +b.dataset.n; slots.forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === openSlot))); const d = $('#slot-detail'); d.innerHTML = slotDetail(); d.animate?.([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: still() ? 0 : 600, easing: 'cubic-bezier(.16,1,.3,1)' }); }));
  }

  /* ---------- Projects ---------- */
  const PROJECTS = [
    ['A one-page study guide', 'Built from material your teacher gives you, for someone revising the same topic.'],
    ['An accessible club notice', 'For a book swap: Tuesday, library, 15:30–16:00, free entry, bring one book. Clear for everyone, and no promises the facts don’t support.'],
    ['A checklist for checking a viral claim', 'A short list anyone could follow before sharing something that might not be true.']];
  function projects() {
    page('projects', `<div class="wrap page">
      ${ihead('Projects', 'Make something useful', 'Pick one small project. You make it in lesson 14 and test and improve it in lesson 15. You can use AI, or not: what counts is that you can explain your choices.')}
      <ol class="projs">${PROJECTS.map(([t, d], i) => `<li><span class="no num silver">${pad(i + 1)}</span><div><h2>${t}</h2><p>${d}</p></div></li>`).join('')}</ol>
      <p class="footnote">${status(C[13]) === 'locked' ? `Projects open at lesson 14, after the first thirteen lessons.` : `<a class="btn white" href="#intro-14">Go to lesson 14 ${CHEV}</a>`}</p>
    </div>`);
  }

  /* ---------- About: one page, four sections ---------- */
  function about(anchor) {
    page('about', `<div class="wrap page">
      ${ihead('About', 'AI answers in seconds.', 'Deciding how to work with it still takes a person. LearningAI teaches that.')}
      <section class="about-sec" id="parents" aria-labelledby="h-parents"><h2 id="h-parents">For parents</h2><ul class="short">
        <li><span class="cap">01</span><span>Lessons use invented examples. Students are told never to type real names, addresses or passwords.</span></li>
        <li><span class="cap">02</span><span>Progress belongs to the student. Nothing they write is public.</span></li>
        <li><span class="cap">03</span><span><a class="ulink inline" href="#privacy">Exactly what we store, and who sees it</a></span></li></ul></section>
      <section class="about-sec" id="teachers" aria-labelledby="h-teachers"><h2 id="h-teachers">For teachers</h2><ul class="short">
        <li><span class="cap">01</span><span>Each lesson fits the start of a class period.</span></li>
        <li><span class="cap">02</span><span>Runs in any browser, with no outside AI accounts or subscriptions.</span></li>
        <li><span class="cap">03</span><span>No streaks, timers or leaderboards.</span></li></ul></section>
      <section class="about-sec" id="faq" aria-labelledby="h-faq"><h2 id="h-faq">Questions</h2><div class="faq">
        <details><summary>How is progress saved?</summary><p>Lesson 01 works without an account and stays on your device. A free account saves the rest.</p></details>
        <details><summary>Is this about using AI for homework?</summary><p>It is about using AI well: when it helps, when to check it, and what to keep private.</p></details>
        <details><summary>Who is it for?</summary><p>Built for ages 13 to 18. Anyone is welcome.</p></details>
      </div></section>
    </div>`);
    if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth' }), 120);
  }

  /* ---------- Lesson player: one step on screen at a time ----------
     Steps: learn → two choices (feedback on every option, answers can change) → optional detour
     (shown only when the trigger answer calls for it) → make it yours (written work with minimum lengths).
     Answers persist on this device per lesson version; progress events follow PROGRESS-CONTRACT.md
     and never include written text. */
  const KIND = { understand: 'Understand', choice: 'Decide', detour: 'Closer look', transfer: 'Make it yours' };
  const META = window.LAI_COURSE_META || {};
  const uuid = () => crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const recKey = (l, who = ME?.id) => `learningai:progress:v1:${l.id}:${l.version}${who ? `:${who}` : ''}`;
  const loadRec = (l, who) => { try { const r = JSON.parse(localStorage.getItem(recKey(l, who))); return r && r.lessonVersion === l.version ? r : null; } catch (e) { return null; } };
  const saveRec = (l, st) => { try { localStorage.setItem(recKey(l), JSON.stringify({ lessonVersion: l.version, attemptId: st.attempt, answers: st.ans, page: st.i, completed: st.done, events: st.ev.slice(-100) })); return noteSave(true); } catch (e) { return noteSave(false); } };
  const emit = (l, st, type, activityId = null, payload = {}) => {
    const ev = { schemaVersion: 1, eventId: uuid(), lessonId: l.id, lessonVersion: l.version, activityId, attemptId: st.attempt, type, timestamp: new Date().toISOString(), payload };
    st.ev.push(ev); if (st.ev.length > 100) st.ev.shift();
    window.dispatchEvent(new CustomEvent('learningai:progress', { detail: ev }));
  };
  /* the steps on this learner's path: the detour joins before the last step when its trigger answer isn't the expected one */
  const path = (l, ans) => { const d = l.detour, on = d && ans[d.when.id] != null && ans[d.when.id] !== d.when.notEqual; return on ? [...l.steps.slice(0, -1), d, l.steps[l.steps.length - 1]] : l.steps; };
  const coreIndex = (l, s) => s.kind === 'detour' ? l.steps.length - 2 : l.steps.indexOf(s);
  /* a signed-out learner's place, counted in the lesson's own steps (the optional detour counts with the step before it) */
  const anonStep = (l, r) => { const P = path(l, r.answers || {}); return Math.max(0, coreIndex(l, P[Math.min(r.page || 0, P.length - 1)])); };
  const fieldOk = (f, v) => { const t = String(v || '').trim(); return t.length >= f.min && t.length <= f.max; };
  const stepDone = (s, ans) => (s.kind === 'transfer' ? s.fields.every(f => fieldOk(f, ans[f.id])) : ans[s.id] != null);

  function lesson(num, dir) {
    const l = C[num - 1]; if (!l || status(l) === 'locked') { location.replace(l ? `#intro-${l.num}` : '#course'); return; }
    let st = LS[l.id];
    if (!st) {
      const r = loadRec(l);
      st = LS[l.id] = r ? { attempt: r.attemptId, ans: r.answers || {}, i: r.page || 0, done: !!r.completed, ev: r.events || [] } : { attempt: uuid(), ans: {}, i: ME && l.id === ME.current ? ME.step : 0, done: false, ev: [] };
      if (!r && status(l) === 'done') { const tf = l.steps[l.steps.length - 1].fields; tf.forEach((f, j) => { if (cards()[l.num]?.[j]) st.ans[f.id] = cards()[l.num][j]; }); }
      if (status(l) === 'done') st.i = 0;
      const gap0 = path(l, st.ans).findIndex(x => !stepDone(x, st.ans)); if (gap0 >= 0) st.i = Math.min(st.i, gap0);
      emit(l, st, r ? 'resumed' : 'started'); saveRec(l, st);
    }
    const P = path(l, st.ans); st.i = Math.min(st.i, P.length - 1);
    const n = P.length, s = P[st.i], last = st.i === n - 1;
    if (ME && l.id === ME.current) { ME.step = Math.max(ME.step || 0, coreIndex(l, s)); saveMe(); }
    const opts = () => s.choices.map((c, j) => `<button class="answer" data-v="${esc(c.value)}" aria-pressed="${st.ans[s.id] === c.value}"><span class="k">${String.fromCharCode(65 + j)}</span><span>${esc(c.text)}</span></button>`).join('');
    const verdict = () => { const v = st.ans[s.id]; if (v == null) return ''; const c = s.choices.find(x => x.value === v), ok = v === s.correct;
      return outcome(ok ? 'Good choice' : 'Not quite', `${esc(c.feedback)}${ok ? '' : '<span class="why">You can change your answer, or continue.</span>'}`); };
    const count = f => { const t = String(st.ans[f.id] || '').trim().length; return !t ? '' : t < f.min ? 'Keep going' : 'Good'; };
    const body = {
      understand: () => `<div class="case"><span class="cap">The situation</span><p>${esc(s.scenario)}</p></div><details class="more idea"><summary>The idea behind this</summary><p>${esc(s.body)}</p></details><p class="ask" id="ask">${esc(s.prompt)}</p><div class="answers" id="box" role="group" aria-labelledby="ask">${opts()}</div><div id="o" aria-live="polite">${verdict()}</div>`,
      choice: () => `<p class="ask">${esc(s.prompt)}</p><div class="answers" id="box" role="group" aria-label="Answers">${opts()}</div><div id="o" aria-live="polite">${verdict()}</div>`,
      detour: () => `<div class="body"><p>${esc(s.prompt)}</p></div><div class="answers" id="box" role="group" aria-label="Answers">${opts()}</div><div id="o" aria-live="polite">${verdict()}</div>`,
      transfer: () => `${s.fields.map((f, j) => `<label class="field-lbl" for="tf-${j}">${esc(f.label)}</label><textarea id="tf-${j}" data-f="${esc(f.id)}" maxlength="${f.max}" aria-describedby="tc-${j}" placeholder="Your words. Only you see this.">${esc(st.ans[f.id] || '')}</textarea><span class="count cap" id="tc-${j}">${count(f)}</span>`).join('')}
        <div class="rubric"><span class="cap">Before you finish</span><ul>${s.rubric.map(r => `<li>${esc(r)}</li>`).join('')}</ul>${s.note ? `<p>${esc(s.note)}</p>` : ''}</div>`
    }[s.kind];

    const view = chrome(); document.getElementById('nav').hidden = true; activeTab = 'lesson';
    view.innerHTML = `
      <header class="lbar"><div class="wrap lbar-in"><a class="ulink plain rev" href="#intro-${l.num}">${AR}<span>Exit</span></a><span class="cap t">${pad(l.num)} · ${esc(l.title)}</span><span class="r cap${saveOk ? '' : ' bad'}" id="save-state" role="status">${saveOk ? 'Saved in this browser' : 'Not saved · this browser is blocking storage'}</span></div>
        <div class="lstrip wrap" role="img" aria-label="Step ${st.i + 1} of ${n}">${P.map((_, j) => `<i class="${j < st.i ? 'on' : j === st.i ? 'now' : ''}"></i>`).join('')}</div></header>
      <main id="main" class="lesson">
        <div class="lstep"><span class="v num">${pad(st.i + 1)}<small>/${pad(n)}</small></span><span class="cap">${KIND[s.kind]}</span></div>
        <h1 id="step-h" tabindex="-1">${esc(s.title)}</h1>
        ${body()}
        <div class="lfoot"><button class="ulink plain rev" id="prev" ${st.i === 0 ? 'disabled' : ''}>${AR}<span>Back</span></button><button class="btn white" id="next">${last ? 'Finish' : 'Continue'} ${CHEV}</button></div>
        <p class="cap need" id="need" aria-live="polite"></p>
        <div class="save-warn" id="save-warn" ${saveOk ? 'hidden' : ''}><p><b>Your answers aren’t being saved.</b> This browser is blocking storage (often private browsing or blocked site data). You can keep going: finish in this tab, and copy your writing somewhere safe before you close it.</p></div>
      </main>`;
    animateIn($('#main'), dir);
    const next = $('#next'), need = $('#need');
    const gate = () => { const ok = stepDone(s, st.ans); next.setAttribute('aria-disabled', String(!ok)); need.textContent = ok ? '' : s.kind === 'transfer' ? 'Write a little more to finish.' : 'Pick an answer to continue.'; };
    gate();
    const go = d => { st.i = Math.min(n - 1, Math.max(0, st.i + d)); saveRec(l, st); emit(l, st, 'page_changed', null, { page: path(l, st.ans)[st.i].id }); lesson(num, d > 0 ? 'next' : 'back'); scrollTo(0, 0); document.getElementById('step-h').focus(); };
    $('#prev').addEventListener('click', () => go(-1));
    next.addEventListener('click', () => {
      if (!stepDone(s, st.ans)) { gate(); (s.kind === 'transfer' ? $$('[data-f]').find(t => !fieldOk(s.fields.find(f => f.id === t.dataset.f), t.value)) : $('.answer'))?.focus(); return; }
      if (!last) return go(1);
      /* completion: every required item on this path is answered; wrong answers still count (formative) */
      const gap = P.findIndex(x => !stepDone(x, st.ans));
      if (gap >= 0) { st.i = gap; saveRec(l, st); lesson(num, 'back'); $('#need').textContent = 'One step still needs an answer before you can finish.'; document.getElementById('step-h').focus(); return; }
      const core = l.steps.filter(x => x.kind === 'understand' || x.kind === 'choice');
      if (!st.done) { st.done = true; emit(l, st, 'completed', null, { score: core.filter(x => st.ans[x.id] === x.correct).length, maxScore: core.length, reflectionSubmitted: true }); }
      lastSave = { num: l.num, ok: saveRec(l, st) };
      if (!ME) { location.hash = `#done-${l.num}`; return; }
      ME.cards = ME.cards || {}; ME.cards[l.num] = s.fields.map(f => st.ans[f.id].trim());
      ME.dates = ME.dates || {}; ME.dates[l.num] = ME.dates[l.num] || new Date().toISOString();
      if (l.detour && st.ans[l.detour.id] != null) ME.tricky = l.num; else if (ME.tricky === l.num) ME.tricky = null;
      if (!ME.done.includes(l.id)) ME.done.push(l.id);
      const nx = C[num]; if (l.id === ME.current && nx) { ME.current = nx.id; ME.step = 0; }
      lastSave = { num: l.num, ok: saveMe() && lastSave.ok };
      location.hash = `#done-${l.num}`;
    });
    $$('#box .answer').forEach(b => b.addEventListener('click', () => {
      st.ans[s.id] = b.dataset.v; saveRec(l, st);
      emit(l, st, 'answered', s.id, { answered: true, correct: b.dataset.v === s.correct });
      /* changing the trigger answer can add or remove the detour; drop answers on a removed detour */
      if (l.detour && s.id === l.detour.when.id && !path(l, st.ans).includes(l.detour)) delete st.ans[l.detour.id];
      $$('#box .answer').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('#o').innerHTML = verdict(); gate();
      const strip = document.querySelector('.lstrip'), P2 = path(l, st.ans); strip.innerHTML = P2.map((_, j) => `<i class="${j < st.i ? 'on' : j === st.i ? 'now' : ''}"></i>`).join(''); strip.setAttribute('aria-label', `Step ${st.i + 1} of ${P2.length}`);
      document.querySelector('.lstep .v small').textContent = `/${pad(path(l, st.ans).length)}`;
    }));
    const typing = [];
    $$('[data-f]').forEach((t, j) => t.addEventListener('input', () => {
      const f = s.fields[j]; st.ans[f.id] = t.value; $(`#tc-${j}`).textContent = count(f); gate();
      clearTimeout(typing[j]); typing[j] = setTimeout(() => { saveRec(l, st); emit(l, st, 'answered', f.id, { answered: fieldOk(f, t.value) }); }, 600);
    }));
  }

  /* ---------- Finished: what you wrote, signed with your name and the date ---------- */
  const longDate = d => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let lastSave = null;
  function finishedPage(num) {
    const l = C[num - 1], fields = l?.steps[l.steps.length - 1].fields;
    if (!l) return home();
    const anon = !ME && (LS[l.id] || (r => r && { ans: r.answers || {}, done: r.completed })(loadRec(l)));
    if (!ME && !anon?.done) { location.replace(`#intro-${num}`); return; }
    const vals = ME ? (cards()[num] || []) : fields.map(f => String(anon.ans[f.id] || '').trim());
    if (!vals.some(Boolean)) { location.replace(`#intro-${num}`); return; }
    const nx = C[num], date = longDate(ME?.dates?.[num] ? new Date(ME.dates[num]) : new Date());
    const ok = lastSave?.num === num ? lastSave.ok : true;
    const go = !ME ? `<a class="btn white" id="ck-go" href="#join">Join to unlock lesson ${pad(num + 1)} ${CHEV}</a><a class="ulink" href="#signin">Sign in</a>`
      : `<a class="btn white" id="ck-go" href="${nx ? `#intro-${nx.num}` : '#toolkit'}">${nx ? `Start lesson ${pad(nx.num)}` : 'See everything you made'} ${CHEV}</a><a class="ulink" href="#toolkit">All your work</a>`;
    const saved = ok
      ? `<p class="save-line">Saved in this browser only. It isn’t synced anywhere, so clearing this browser’s data removes it.${ME ? '' : ' Joining keeps it with your account in this prototype, which is also stored in this browser.'}</p>`
      : `<div class="save-warn"><p><b>This couldn’t be saved.</b> The browser is blocking storage, so your writing will be gone when you close this tab. Copy it now.</p><button class="btn sm" id="copy-work">Copy what I wrote</button><span class="cap" id="copy-s" role="status"></span></div>`;
    page('course', `<div class="wrap fin">
        <p class="cap">Lesson ${pad(num)} · Complete</p>
        <h1>${ME ? `Nicely done,<br>${esc(ME.name)}.` : 'Nicely done.'}</h1>
        <article class="sheet" aria-label="What you wrote">
          <p class="cap">${esc(l.title)}</p>
          ${fields.map((f, i) => vals[i] ? `<p class="sheet-q">${esc(f.label)}</p><p class="sheet-a">${esc(vals[i])}</p>` : '').join('')}
          <footer class="sheet-sig"><span>${ME ? esc(ME.name) : 'You'}</span><span>${date}</span></footer>
        </article>
        ${saved}
        <div class="fin-go">${go}</div>
      </div>`, { foot: false });
    $('#copy-work')?.addEventListener('click', async () => { const text = `${l.title}\n\n${vals.filter(Boolean).join('\n\n')}`;
      try { await navigator.clipboard.writeText(text); $('#copy-s').textContent = 'Copied'; } catch (e) { const a = document.querySelector('.sheet'); getSelection().selectAllChildren(a); $('#copy-s').textContent = 'Selected. Press Ctrl+C or ⌘C to copy'; } });
  }

  /* ---------- Sign in, join, reset: separate full pages without the site header ---------- */
  function authShell(title, line, form, note = '') {
    page('', `<div class="auth-top wrap"><a class="mark" href="#home" aria-label="LearningAI home">LearningAI</a><a class="ulink plain rev" href="#home">${AR}<span>Back</span></a></div>
      <section class="auth">
      <div class="auth-l"><div><h1>${title}</h1><p>${line}</p></div>${note ? `<span class="cap dim">${note}</span>` : '<span></span>'}</div>
      <div class="auth-r">${form}</div></section>`, { bare: true });
  }
  const pwField = (id, auto, extra = '') => `<div class="fld"><label for="${id}">Password</label><div class="row"><input class="input" type="password" id="${id}" autocomplete="${auto}" required ${extra}><button type="button" class="ulink plain reveal-pw" data-for="${id}" aria-pressed="false">Show</button></div>`;
  const wirePw = () => $$('.reveal-pw').forEach(b => b.addEventListener('click', () => { const i = $('#' + b.dataset.for), show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', String(show)); }));
  /* Google sign-in needs the server (see INTEGRATION.md); the prototype says so instead of pretending */
  const googleBtn = `<div class="sso"><button type="button" class="btn sso-g" id="google">Continue with Google</button><span class="or cap">or with email</span></div>`;
  const wireGoogle = () => $('#google').addEventListener('click', () => notice($('#out'), 'Prototype: Google sign-in is switched on when the server is connected. Use email for now.'));
  function signin() {
    authShell('Sign in', ME ? `You’re signed in as ${esc(ME.name)}. Sign in below to switch accounts.` : 'Pick up exactly where you stopped.', `${googleBtn}<form class="form" id="f" novalidate>
      <div class="fld"><label for="em">Email</label><input class="input" type="email" id="em" autocomplete="email" required><span class="err" id="em-e" hidden></span></div>
      ${pwField('pw', 'current-password')}<span class="err" id="pw-e" hidden></span></div>
      <div class="form-foot"><button class="btn white" type="submit">Sign in ${CHEV}</button><a class="ulink" href="#forgot">Forgot password?</a></div>
      <a class="ulink" href="#join">New here? Create an account</a>
      <div id="out"></div></form>
      ${DEMO.accounts.length ? `<details class="demo"><summary class="cap">Test accounts</summary><ul>${DEMO.accounts.map(a => `<li><span><b>${esc(a.label)}</b><span class="hint">${esc(a.name)} · ${esc(a.email)}</span></span><button type="button" class="opt" data-demo="${a.id}">Use</button></li>`).join('')}</ul><p class="hint">Prototype only. These fake accounts live in demo-accounts.js and never reach the live site.</p></details>` : ''}`);
    wirePw(); wireGoogle();
    $$('[data-demo]').forEach(b => b.addEventListener('click', () => { const a = DEMO.accounts.find(x => x.id === b.dataset.demo); $('#em').value = a.email; $('#pw').value = DEMO.DEMO_PASSWORD; $('#f button[type=submit]').focus(); }));
    $('#f').addEventListener('submit', e => {
      e.preventDefault(); const em = $('#em'), pw = $('#pw'); let first = null;
      const check = (input, errId, bad, msg) => { const x = $('#' + errId); bad ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid'); x.hidden = !bad; x.textContent = bad ? msg : ''; bad ? input.setAttribute('aria-describedby', errId) : input.removeAttribute('aria-describedby'); if (bad && !first) first = input; };
      check(em, 'em-e', !isEmail(em.value), 'Enter the email you signed up with.');
      check(pw, 'pw-e', !pw.value, 'Enter your password.');
      if (first) return first.focus();
      const acct = DEMO.accounts.find(a => a.email.toLowerCase() === em.value.trim().toLowerCase());
      if (!acct || pw.value !== DEMO.DEMO_PASSWORD) { pw.value = ''; return notice($('#out'), 'That email and password don’t match an account. In this prototype, use one of the test accounts below.'); }
      pw.value = ''; signIn(acct); location.hash = '#home';
    });
  }
  function forgot() {
    authShell('Reset password', 'We’ll email you a link to choose a new one.', `<form class="form" id="f" novalidate>
      <div class="fld"><label for="em">Email</label><input class="input" type="email" id="em" autocomplete="email" required></div>
      <div class="form-foot"><button class="btn white" type="submit">Send link ${CHEV}</button><a class="ulink" href="#signin">Back to sign in</a></div><div id="out"></div></form>`);
    $('#f').addEventListener('submit', e => { e.preventDefault(); notice($('#out'), 'Prototype: no email is sent. In the live site, a reset link arrives if the address has an account.'); });
  }
  /* ---------- Verify: a six-digit code sent to the new account's email ---------- */
  let PENDING = null;
  function verify() {
    if (!PENDING) { location.replace('#join'); return; }
    authShell('Check your email', `We sent a six-digit code to <b>${esc(PENDING.email)}</b>. Enter it to finish creating your account.`, `<form class="form" id="f" novalidate>
      <div class="fld"><label for="code">Verification code</label><input class="input code" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required aria-describedby="code-h"><span class="err" id="code-e" hidden>Enter the six digits from the email.</span><span class="hint" id="code-h">The code expires after 10 minutes. Prototype: no email is sent. Enter any six digits.</span></div>
      <div class="form-foot"><button class="btn white" type="submit">Verify ${CHEV}</button><button type="button" class="ulink plain" id="resend">Send a new code</button></div>
      <div id="out"></div></form>`);
    $('#resend').addEventListener('click', () => notice($('#out'), 'Prototype: a new code would be sent now. The live site limits how often you can ask.'));
    $('#f').addEventListener('submit', e => {
      e.preventDefault(); const v = $('#code').value.trim();
      const code = $('#code'), bad = !/^\d{6}$/.test(v);
      bad ? (code.setAttribute('aria-invalid', 'true'), code.setAttribute('aria-describedby', 'code-h code-e')) : code.removeAttribute('aria-invalid');
      $('#code-e').hidden = !bad;
      if (bad) return code.focus();
      const r1 = loadRec(C[0], null), tf = C[0].steps[C[0].steps.length - 1].fields;
      if (r1?.completed) Object.assign(PENDING, { done: [C[0].id], current: C[1].id, step: 0, cards: { 1: tf.map(f => String(r1.answers?.[f.id] || '').trim()) }, dates: { 1: new Date().toISOString() } });
      const joined = PENDING; signOut(); ME = joined; PENDING = null; location.hash = '#home';
    });
  }
  function join() {
    if (ME) { location.replace('#account'); return; }
    authShell('Join', 'Save your progress and continue on any device.', `${googleBtn}<form class="form" id="f" novalidate>
      <div class="fld"><label for="nm">First name or nickname</label><input class="input" type="text" id="nm" autocomplete="given-name" maxlength="30" required aria-describedby="nm-h"><span class="hint" id="nm-h">Only used to say hello.</span></div>
      <div class="fld"><label for="em">Email</label><input class="input" type="email" id="em" autocomplete="email" required></div>
      ${pwField('pw', 'new-password', 'aria-describedby="pw-h"')}<div class="pwmeter" aria-hidden="true"><i></i><i></i><i></i></div><span class="hint" id="pw-h">At least 10 characters.</span></div>
      <label class="chk"><input type="checkbox" id="ok13" required> I’m 13 or older, and I agree to the <a class="ulink inline" href="#privacy">privacy notice</a>.</label>
      <label class="chk"><input type="checkbox" id="news"> Send me the odd course update. Optional, and you can stop any time.</label>
      <div class="form-foot"><button class="btn white" type="submit">Create account ${CHEV}</button><a class="ulink" href="#signin">I have an account</a></div>
      <div id="out"></div></form>`, 'Lesson 01 works without an account.');
    wirePw(); wireGoogle();
    const pw = $('#pw'), bars = $$('.pwmeter i');
    pw.addEventListener('input', () => { const v = pw.value, sc = v.length >= 10 ? 1 + (/[A-Z]/.test(v) && /[a-z]/.test(v)) + /[\d\W]/.test(v) : 0; bars.forEach((b, i) => b.classList.toggle('on', i < sc)); });
    $('#f').addEventListener('submit', e => {
      e.preventDefault(); const need = []; let first = null;
      const mark = (el, bad, what) => { bad ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'); if (bad) { need.push(what); first = first || el; } };
      mark($('#nm'), !$('#nm').value.trim(), 'a name'); mark($('#em'), !isEmail($('#em').value), 'a valid email');
      mark(pw, pw.value.length < 10, 'a password of 10+ characters'); mark($('#ok13'), !$('#ok13').checked, 'the age confirmation');
      if (need.length) { $('#out').innerHTML = `<p class="notice">Still needed: ${need.join(', ')}.</p>`; return first.focus(); }
      pw.value = ''; bars.forEach(b => b.classList.remove('on'));
      /* Prototype: a temporary account for this session only; the password is never stored. Next: verify the email. */
      PENDING = { id: 'joined', name: $('#nm').value.trim(), email: $('#em').value.trim(), updates: $('#news').checked, done: [], current: C[0].id, step: 0, cards: {} };
      location.hash = '#verify';
    });
  }

  /* ---------- Privacy: what we keep, in plain words ---------- */
  function privacy() {
    page('about', `<div class="wrap page">
      ${ihead('Privacy', 'What we keep, and why', 'The short version.')}
      <ul class="short">
        <li><span class="cap">01</span><span>We keep your first name, your email, which lessons you finished and what you wrote at the end of each lesson. That’s it.</span></li>
        <li><span class="cap">02</span><span>Only you can see what you write. Nothing is public.</span></li>
        <li><span class="cap">03</span><span>We email you to verify your account and to reset your password. Course updates only if you said yes, and you can stop them any time in Settings.</span></li>
        <li><span class="cap">04</span><span>Lessons use made-up examples. Never type real names, addresses or passwords into them.</span></li>
        <li><span class="cap">05</span><span>You can ask for a copy of everything, or delete your account, in Settings.</span></li>
      </ul>
    </div>`);
  }

  /* ---------- Settings ---------- */
  const SET_TABS = [['account', 'Profile'], ['account-prefs', 'Preferences'], ['account-privacy', 'Privacy']];
  const row = (k, v, action = '<span></span>', vid = '', kid = '') => `<div class="set-row"><span class="k"${kid ? ` id="${kid}"` : ''}>${k}</span><span class="v"${vid ? ` id="${vid}" aria-live="polite"` : ''}>${v}</span>${action}</div>`;
  const choice = (pref, opts) => `<span class="opts" role="group" aria-labelledby="k-${pref}">${opts.map(([k, t]) => `<button class="opt" data-pref="${pref}" data-v="${k}" aria-pressed="${PREFS[pref] === k}">${t}</button>`).join('')}</span>`;
  let nameTimer;
  function account(tab = 'account') {
    if (!ME) { location.replace('#signin'); return; }
    const rows = {
      account: row('Name', `<label class="vh" for="nm">Name</label><input class="input" id="nm" type="text" value="${esc(ME.name)}" maxlength="30">`, '<span class="cap" id="nm-s" aria-live="polite"></span>')
        + row('Email', `<b>${esc(ME.email)}</b>`) + row('Password', 'Last changed: never', '<a class="btn sm" href="#forgot">Change</a>') + row('Session', `Signed in as ${esc(ME.name)} on this device`, '<button class="btn sm" id="so">Sign out</button>')
        + row('Progress', 'Clear your lessons and answers on this device and begin again at lesson 01.', '<button class="btn sm" id="reset" aria-describedby="reset-v">Start over</button>', 'reset-v'),
      'account-prefs': row('Text size', 'Larger text across every page.', choice('text', [['std', 'Standard'], ['lg', 'Large']]), '', 'k-text') + row('Animations', 'Calm stops things sliding and fading in. Everything still works the same.', choice('motion', [['full', 'On'], ['calm', 'Calm']]), '', 'k-motion'),
      'account-privacy': row('What we store', 'Your name, email, lessons finished, and the cards you write. <b>Never</b> your chats with outside AI tools.')
        + row('Who sees it', 'Only you. Nothing you write is public.')
        + row('Course updates', ME.updates ? 'You get occasional emails about the course.' : 'You don’t get course update emails.', `<button class="btn sm" id="upd">${ME.updates ? 'Stop them' : 'Turn on'}</button>`) + row('Your data', 'A copy of everything we store about you.', '<button class="btn sm" id="dl">Request copy</button>')
        + row('Delete account', 'Removes your progress and cards permanently.', '<button class="btn sm danger" id="del" aria-describedby="del-v">Delete</button>', 'del-v')
    }[tab];
    page('account', `<div class="wrap page">${subtabs(SET_TABS, tab, 'Settings sections')}
      ${ihead('Settings', esc(ME.name), esc(ME.email))}<div>${rows}</div><div id="out"></div></div>`);
    const out = $('#out');
    $('#nm')?.addEventListener('input', e => { const v = e.target.value.trim(); if (!v) { $('#nm-s').textContent = 'Name can’t be empty'; return; } ME.name = v; saveMe(); syncAccount(); $('#nm-s').textContent = 'Saved'; clearTimeout(nameTimer); nameTimer = setTimeout(() => { const x = $('#nm-s'); if (x) x.textContent = ''; }, 1400); });
    $('#so')?.addEventListener('click', () => { signOut(); location.hash = '#home'; });
    $$('[data-pref]').forEach(b => b.addEventListener('click', () => { PREFS[b.dataset.pref] = b.dataset.v; applyPrefs(); try { localStorage.setItem('learningai-prefs', JSON.stringify(PREFS)); } catch (e) {} pressOne($$(`[data-pref="${b.dataset.pref}"]`), b); }));
    $('#reset')?.addEventListener('click', e => {
      const b = e.currentTarget, v = $('#reset-v');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirm'; v.innerHTML = '<b>Start over?</b> Your finished lessons and written answers on this device will be cleared.'; return b.focus(); }
      Object.assign(ME, { done: [], current: C[0].id, step: 0, cards: {}, dates: {}, tricky: null }); saveMe();
      forgetLessons();
      try { Object.keys(localStorage).filter(k => k.startsWith('learningai:progress:') && k.endsWith(`:${ME.id}`)).forEach(k => localStorage.removeItem(k)); } catch (err) {}
      location.hash = '#home';
    });
    $('#upd')?.addEventListener('click', () => { ME.updates = !ME.updates; saveMe(); account('account-privacy'); });
    $('#dl')?.addEventListener('click', () => notice(out, 'Prototype: in the live site we email a copy of your data to your account address within a day.'));
    $('#del')?.addEventListener('click', e => {
      const b = e.currentTarget, v = $('#del-v');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirm delete'; v.innerHTML = '<b>Are you sure?</b> This can’t be undone. Press again to confirm.'; return b.focus(); }
      delete b.dataset.armed; b.textContent = 'Delete'; v.textContent = 'Removes your progress and cards permanently.';
      notice(out, 'Prototype: nothing was deleted. In the live site your account and progress would now be removed.');
    });
  }

  /* ---------- router ---------- */
  const ROUTES = { home, course, toolkit, projects, about, signin, join, forgot, verify, privacy,
    parents: () => about('parents'), teachers: () => about('teachers'), faq: () => about('faq'),
    gallery: () => location.replace('#projects'), progress: () => location.replace('#home') };
  let first = true, pending;
  function route() {
    clearTimeout(pending);
    const m0 = document.getElementById('main'), wasFirst = first; first = false;
    const go = () => { render(); if (!wasFirst) (document.querySelector('main h1') || document.getElementById('main'))?.focus({ preventScroll: true }); };
    if (!wasFirst && m0 && !still()) { m0.classList.add('out'); pending = setTimeout(go, 180); } else go();
  }
  function render() {
    const h = location.hash.slice(1) || 'home'; let m;
    scrollTo(0, 0);
    if ((m = h.match(/^lesson-(\d+)$/))) lesson(+m[1]);
    else if ((m = h.match(/^intro-(\d+)$/))) intro(+m[1]);
    else if ((m = h.match(/^done-(\d+)$/))) finishedPage(+m[1]);
    else if ((m = h.match(/^part-([123])$/))) part(+m[1] - 1);
    else if (h.startsWith('account')) account(SET_TABS.some(([k]) => k === h) ? h : 'account');
    else (Object.hasOwn(ROUTES, h) ? ROUTES[h] : home)();
    const lessonNo = h.match(/^(lesson|intro|done)-(\d+)$/)?.[2], partNo = h.match(/^part-([123])$/)?.[1];
    const name = lessonNo ? C[lessonNo - 1]?.title : partNo ? PARTS[partNo - 1].name : (Object.hasOwn(TITLES, h.replace(/-.*/, '')) ? TITLES[h.replace(/-.*/, '')] : '');
    document.title = name ? `${h.startsWith('done-') ? `Lesson ${pad(lessonNo)} complete` : h.startsWith('intro-') ? `Lesson ${pad(lessonNo)}: ${name}` : name} · LearningAI` : 'LearningAI';
  }
  document.documentElement.lang = 'en';
  document.querySelector('.skip')?.addEventListener('click', e => { e.preventDefault(); const m = document.getElementById('main'); (m?.querySelector('h1') || m)?.focus(); });
  addEventListener('hashchange', route);
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 700))]).then(() => { try { route(); } finally { root.style.opacity = 1; } });
})();
