/* LearningAI: Home, Course (+ parts), lesson cover and player, Toolkit, Projects, About, account pages.
   Course content comes from course.js (the real 15-lesson catalogue). Each fact has one home:
   where you are → Home; the map → Course; your cards → Toolkit; what we store → Privacy settings. */
(function () {
  const C = window.LAI_COURSE;
  const root = document.getElementById('root');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const fmtDur = m => `${Math.floor(m / 60)} h ${pad(m % 60)}`;
  const AR = '<span class="ar" aria-hidden="true"></span>';
  const CHEV = '<span class="chev" aria-hidden="true">›</span>';
  const isEmail = v => /^\S+@\S+\.\S+$/.test(v);
  const pressOne = (group, btn) => group.forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
  const outcome = (cap, text) => `<div class="outcome" tabindex="-1"><span class="cap">${cap}</span>${text}</div>`;
  const notice = (el, msg) => { el.innerHTML = `<p class="notice" tabindex="-1">${msg}</p>`; el.firstChild.focus(); };
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];

  /* ---------- course model ---------- */
  const PARTS = [
    { name: 'First Contact', line: 'What AI is actually doing when it answers you.' },
    { name: 'How It Works', line: 'Why it can sound certain and still be wrong.' },
    { name: 'Talking to AI', line: 'Using it on one small, real task from your week.' }
  ];
  const partLessons = i => C.filter(l => l.arc === PARTS[i].name);
  const partOf = l => PARTS.findIndex(p => p.name === l.arc);
  const totalMin = C.reduce((s, l) => s + l.min, 0);
  const STATUS = { done: 'Complete', now: 'In progress', locked: 'Locked' };
  const cardName = l => l.steps.find(x => x.kind === 'toolkitSave')?.cardType || 'Card';

  /* Accounts. In this prototype, sign-in checks the fake test accounts in demo-accounts.js; INTEGRATION.md
     describes swapping signIn/signOut/join for the real API. Progress lives in memory for the session. */
  const DEMO = window.LAI_DEMO || { accounts: [] };
  const SESSION_KEY = 'learningai-demo-session';
  const PREFS = { text: 'std', motion: 'full' };
  let ME = null;
  const signIn = acct => { ME = JSON.parse(JSON.stringify(acct)); try { localStorage.setItem(SESSION_KEY, acct.id); } catch (e) {} };
  const signOut = () => { ME = null; try { localStorage.removeItem(SESSION_KEY); } catch (e) {} };
  try { const saved = DEMO.accounts.find(a => a.id === localStorage.getItem(SESSION_KEY)); if (saved) signIn(saved); } catch (e) {}
  const cards = () => ME?.cards || {};
  const status = l => !ME ? (l.num === 1 ? 'now' : 'locked') : ME.done.includes(l.id) ? 'done' : l.id === ME.current ? 'now' : 'locked';
  const cur = () => (ME && C.find(l => l.id === ME.current)) || C[0];
  const step = () => ME?.step || 0;
  const minsLeft = () => { const l = cur(); return Math.max(2, Math.round(l.min * (1 - step() / l.steps.length))); };
  const isNew = () => !ME || (!ME.done.length && !ME.step);
  const finished = () => !!ME && ME.done.length === C.length;
  const applyPrefs = () => { document.documentElement.classList.toggle('text-lg', PREFS.text === 'lg'); document.documentElement.classList.toggle('calm', PREFS.motion === 'calm'); };

  /* ---------- chrome: header built once, content swapped per route ---------- */
  const TABS = [['course', 'Course'], ['toolkit', 'Toolkit'], ['projects', 'Projects'], ['about', 'About']];
  const TITLES = { course: 'Course', toolkit: 'Toolkit', projects: 'Projects', about: 'About', parents: 'About', teachers: 'About', faq: 'About', account: 'Settings', signin: 'Sign in', join: 'Join', forgot: 'Reset password' };
  const subtabs = (items, current, label) => `<nav class="subtabs" aria-label="${label}">${items.map(([k, t]) => `<a href="#${k}" ${current === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
  let activeTab = '';
  function chrome() {
    if (!document.getElementById('nav')) {
      root.innerHTML = `<header class="nav" id="nav"><div class="wrap nav-in">
          <button class="menu-trigger" id="menu" aria-expanded="false" aria-haspopup="dialog"><i aria-hidden="true"></i><span>Menu</span><span class="vh">Open menu</span></button>
          <a class="mark" href="#home" aria-label="LearningAI home">LearningAI</a>
          <a class="nav-ctx" id="ctx" href="#"><span class="t"></span>${AR}</a>
        </div></header><div id="view"></div>`;
      document.getElementById('menu').addEventListener('click', openMenu);
      window.onscroll = () => document.getElementById('nav').classList.toggle('solid', scrollY > 40 || activeTab !== 'home');
    }
    return document.getElementById('view');
  }
  /* The header's Resume is the one shortcut back into the lesson; it hides wherever the page already offers Resume. */
  function syncResume(hide) {
    const a = document.getElementById('ctx'), l = cur();
    if (!ME) { a.href = '#signin'; a.querySelector('.t').textContent = 'Sign in'; a.setAttribute('aria-label', 'Sign in'); }
    else { a.href = `#lesson-${l.num}`; a.querySelector('.t').textContent = `Resume ${pad(l.num)}`; a.setAttribute('aria-label', `Resume lesson ${pad(l.num)}`); }
    const off = hide || (ME && (isNew() || finished())); a.classList.toggle('off', !!off); off ? (a.setAttribute('tabindex', '-1'), a.setAttribute('aria-hidden', 'true')) : (a.removeAttribute('tabindex'), a.removeAttribute('aria-hidden'));
  }
  function page(active, body, opts = {}) {
    const view = chrome(), n = document.getElementById('nav');
    activeTab = active; n.hidden = !!opts.bare;
    n.classList.toggle('solid', scrollY > 40 || active !== 'home');
    syncResume(opts.hideResume);
    view.innerHTML = `<main id="main" tabindex="-1">${/<h1[\s>]/.test(body) ? '' : `<h1 class="vh">${TITLES[active] || 'LearningAI'}</h1>`}${body}</main>`;
    animateIn(document.getElementById('main'));
  }

  /* ---------- menu: curtain, then words and part cards travel rightward into place ---------- */
  let menuTimer;
  function openMenu() {
    const btn = document.getElementById('menu');
    clearTimeout(menuTimer); document.querySelectorAll('.mx').forEach(x => x.remove());
    const words = [['home', 'Home'], ...TABS];
    const w = document.createElement('div'); w.className = 'mx'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Menu');
    w.innerHTML = `<div class="mx-curtain"></div><div class="mx-in wrap">
      <div class="mx-top"><button class="mx-close" id="close"><i aria-hidden="true"></i><span>Close</span></button><span class="mark">LearningAI</span><span></span></div>
      <div class="mx-grid">
        <nav class="mx-words" aria-label="Menu">${words.map(([k, t], i) => `<a href="#${k}" style="--d:${200 + i * 70}ms" ${k === activeTab ? 'aria-current="page"' : ''}>${t}<small aria-hidden="true">${pad(i + 1)}</small></a>`).join('')}</nav>
        <div class="mx-box" aria-label="Course parts">${PARTS.map((p, i) => `<a class="mx-card" href="#part-${i + 1}" style="--d:${420 + i * 80}ms"><span class="art"><canvas data-shape="${['rings', 'torus', 'helix'][i]}" aria-hidden="true"></canvas></span><span><span class="cap">Part ${pad(i + 1)}</span><b>${p.name}</b></span>${AR}</a>`).join('')}</div>
      </div>
      <div class="mx-foot"><a class="cap" href="#${ME ? 'account' : 'signin'}">${ME ? `Settings · ${esc(ME.name)}` : 'Sign in'}</a><span class="cap dim">Free · Ages 13–18</span></div>
    </div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden'; root.inert = true; btn.setAttribute('aria-expanded', 'true');
    w.querySelectorAll('canvas[data-shape]').forEach(c => turntable(c, c.dataset.shape));
    [...w.querySelectorAll('.mx-words a, .mx-card')].reverse().forEach((el, i) => el.style.setProperty('--dc', `${i * 28}ms`));
    const show = () => w.classList.add('open'); requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80);
    const close = (e) => { if (w.classList.contains('closing')) return; const byKey = e?.type === 'keydown' || (e?.detail === 0); w.classList.add('closing'); root.inert = false; btn.setAttribute('aria-expanded', 'false'); menuTimer = setTimeout(() => { w.remove(); document.body.style.overflow = ''; }, reduced ? 0 : 820); btn.focus({ focusVisible: byKey }); };
    w.querySelector('#close').addEventListener('click', close);
    w.querySelectorAll('a').forEach(x => x.addEventListener('click', close));
    w.addEventListener('keydown', e => { if (e.key === 'Escape') close(e); if (e.key === 'Tab') { const f = [...w.querySelectorAll('button, a')].filter(x => x.offsetParent); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
    w.querySelector('#close').focus();
  }

  /* ---------- motion: staged reveal after every render ---------- */
  const REVEAL = '.when, .lead-line, .one-l .ctas, .memory, .bignum, .track .cap, .auth-l > *, .form > *, .set-row, .page-h > :not(h1), .subtabs, .summary, .prow, .lrow, .stages > div, .footnote, .slots, .slot-detail, .lede, .about-sec, .intro > :not(h1), .lesson > :not(h1)';
  function animateIn(scope, dir) {
    if (!scope) return;
    scope.querySelectorAll('h1').forEach((h, n) => { h.setAttribute('tabindex', '-1'); if (h.classList.contains('vh')) return; h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map((x, i) => `<span class="mask"><span style="transition-delay:${40 + (n + i) * 90}ms">${x}</span></span>`).join(''); });
    let i = 0; scope.querySelectorAll(REVEAL).forEach(e => { e.classList.add('rv'); e.style.setProperty('--d', `${200 + Math.min(i++, 7) * 45}ms`); });
    if (dir) scope.dataset.dir = dir;
    const show = () => scope.classList.add('in');
    if (reduced) return show();
    requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80); // timer fallback if frames are paused
  }

  /* ---------- small rotating objects on the menu's part cards ---------- */
  function shapePoints(kind) {
    const P = [];
    if (kind === 'rings') for (const [ox, rot] of [[-.42, 0], [.42, 1]]) for (let i = 0; i < 420; i++) { const a = i / 420 * Math.PI * 2, j = (i % 7) / 7 * .06, x = Math.cos(a) * (.78 + j), y = Math.sin(a) * (.78 + j); P.push(rot ? [x + ox, 0, y] : [x + ox, y, 0]); }
    if (kind === 'torus') for (let i = 0; i < 48; i++) for (let k = 0; k < 22; k++) { const u = i / 48 * Math.PI * 2, v = k / 22 * Math.PI * 2; P.push([(1 + .38 * Math.cos(v)) * Math.cos(u) * .82, .38 * Math.sin(v) * .82, (1 + .38 * Math.cos(v)) * Math.sin(u) * .82]); }
    if (kind === 'helix') for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < 520; i++) { const t = i / 520, a = t * Math.PI * 6 + s2 * Math.PI; P.push([Math.cos(a) * .45, (t - .5) * 2.1, Math.sin(a) * .45]); if (i % 26 === 0 && s2 === 0) for (let k = 1; k < 10; k++) { const f = k / 10; P.push([Math.cos(a) * .45 * (1 - 2 * f), (t - .5) * 2.1, Math.sin(a) * .45 * (1 - 2 * f)]); } }
    return P;
  }
  function turntable(canvas, kind) {
    const g = canvas.getContext('2d'), pts = shapePoints(kind); let W, H, t = Math.random() * 6, last = 0;
    const size = () => { const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); draw(); };
    function draw() {
      if (!W) return; g.clearRect(0, 0, W, H);
      const S = Math.min(W, H) * .3, cx = W / 2, cy = H / 2, ry = t * .16, rx = .38 + Math.sin(t * .1) * .05, c1 = Math.cos(ry), s1 = Math.sin(ry), c2 = Math.cos(rx), s2 = Math.sin(rx);
      for (const [x0, y0, z0] of pts) {
        const x1 = x0 * c1 + z0 * s1, z1 = -x0 * s1 + z0 * c1, y2 = y0 * c2 - z1 * s2, z2 = y0 * s2 + z1 * c2, p = 3.2 / (3.2 + z2), depth = (1 - z2) / 2;
        g.fillStyle = `rgba(244,244,242,${.12 + .7 * depth})`; g.beginPath(); g.arc(cx + x1 * S * p, cy + y2 * S * p, Math.max(.4, (.5 + 1.1 * depth) * (S / 260)), 0, 6.283); g.fill();
      }
    }
    const loop = ts => { if (!canvas.isConnected) return; t += Math.min(.05, (ts - last) / 1000 || 0); last = ts; draw(); requestAnimationFrame(loop); };
    new ResizeObserver(size).observe(canvas); size();
    if (!reduced) requestAnimationFrame(ts => { last = ts; loop(ts); });
  }

  /* ---------- Home: a greeting that knows the time, where you are, and what you did last ---------- */
  function home() {
    const now = new Date(), hr = now.getHours();
    const tod = hr < 5 ? 'late' : hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : hr < 22 ? 'evening' : 'late';
    const greet = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', late: 'Up late' }[tod];
    const nudge = { morning: 'A short lesson before the day gets going?', afternoon: 'Ready for the next one?', evening: 'One lesson before the day ends?', late: 'Up late? This one is short.' }[tod];
    const day = `${now.toLocaleDateString('en', { weekday: 'long' })} ${tod === 'late' ? 'night' : tod}`;
    const l = cur(), pi = partOf(l), done = finished();
    const last = ME?.done.length ? C.find(x => x.id === ME.done[ME.done.length - 1]) : null;
    const rule = cards()[1]?.[3];
    let h1, line, ctas, memory = '';
    if (!ME) {
      h1 = `${greet}.`;
      line = 'LearningAI is fifteen short lessons on using AI without handing over your judgment. Lesson 01 takes about 15 minutes and needs no account.';
      ctas = `<a class="btn white" href="#intro-1">Begin lesson 01 ${CHEV}</a><a class="ulink" href="#signin">Sign in</a>`;
    } else if (done) {
      h1 = `${greet},<br>${esc(ME.name)}.`;
      line = 'You finished all fifteen lessons. Your final project is next: one real task, from goal to finished result.';
      ctas = `<a class="btn white" href="#projects">Start your project ${CHEV}</a><a class="ulink" href="#course">Review lessons</a>`;
    } else {
      h1 = `${greet},<br>${esc(ME.name)}.`;
      line = step() ? `Ready to continue? You’re on step ${step() + 1} of ${l.steps.length} of <em>${esc(l.title)}</em>. About ${minsLeft()} minutes left.`
        : isNew() ? `Your first lesson, <em>${esc(l.title)}</em>, takes about ${l.min} minutes. Nothing is graded.`
        : `${nudge} <em>${esc(l.title)}</em> is next, about ${l.min} minutes.`;
      ctas = `<a class="btn white" href="#lesson-${l.num}">${step() ? 'Resume' : 'Start'} ${CHEV}</a><a class="ulink" href="#intro-${l.num}">About this lesson</a>`;
    }
    if (last) memory = `<a class="memory" href="#toolkit">Last time you finished <em>${esc(last.title)}</em>.${rule ? ` Your rule: <em>“The final decision belongs to ${rule.replace(/\.$/, '').toLowerCase() === 'me' ? 'me' : esc(rule)}.”</em>` : ''}</a>`;
    const track = PARTS.map((p, i) => { const ls = partLessons(i), d = ls.filter(x => status(x) === 'done').length;
      return `<div class="grp"><span class="cap">${pad(i + 1)} · ${p.name}</span><div class="stops" style="--p:${Math.min(1, d / (ls.length - 1))}">${ls.map(x => {
        const st = status(x), attrs = `class="stop ${st}" data-t="${esc(x.title)}" style="--d:${350 + (x.num - 1) * 40}ms" aria-label="${esc(`Lesson ${pad(x.num)}: ${x.title}, ${STATUS[st].toLowerCase()}`)}"`;
        return st === 'locked' ? `<span ${attrs}><i></i>${pad(x.num)}</span>` : `<a href="#intro-${x.num}" ${attrs}><i></i>${pad(x.num)}</a>`; }).join('')}</div></div>`; }).join('');
    page('home', `<section class="one" aria-labelledby="one-h">
        <div class="one-l">
          <span class="cap when">${day}${ME && !done ? ` · Part ${pad(pi + 1)} · ${PARTS[pi].name}` : ''}</span>
          <h1 id="one-h">${h1}</h1>
          <p class="lead-line">${line}</p>
          <div class="ctas">${ctas}</div>
          ${memory}
        </div>
        <div class="stage-num" aria-hidden="true"><div class="bignum num">${pad(done ? 15 : l.num)}</div></div>
        <nav class="track" aria-label="Your course: ${ME ? ME.done.length : 0} of 15 lessons complete">${track}</nav>
      </section>`, { hideResume: true });
  }

  /* ---------- Course: the map ---------- */
  const COURSE_TABS = [['course', 'Overview'], ['part-1', 'Part 01'], ['part-2', 'Part 02'], ['part-3', 'Part 03']];
  function course() {
    page('course', `<div class="wrap page">${subtabs(COURSE_TABS, 'course', 'Course sections')}
      <p class="cap summary">15 lessons · ${fmtDur(totalMin)} · Free</p>
      <div class="rows">${PARTS.map((p, i) => { const ls = partLessons(i); return `<a class="prow" href="#part-${i + 1}"><span class="no num">${pad(i + 1)}</span><div><h2>${p.name}</h2><p>${p.line}</p></div><span class="cap">${ls.filter(l => status(l) === 'done').length} of ${ls.length}</span>${AR}</a>`; }).join('')}</div>
    </div>`);
  }
  function part(i) {
    const p = PARTS[i];
    page('course', `<div class="wrap page">${subtabs(COURSE_TABS, `part-${i + 1}`, 'Course sections')}
      <div class="page-h"><h1>${p.name}</h1><p>${p.line}</p></div>
      <div class="rows">${partLessons(i).map(l => { const s = status(l), inner = `<span class="no num">${pad(l.num)}</span><span class="lt">${esc(l.title)}</span><span class="cap">${l.min} min</span><span class="state cap ${s}"><i aria-hidden="true"></i>${STATUS[s]}</span>`; return s === 'locked' ? `<div class="lrow">${inner}</div>` : `<a class="lrow" href="#intro-${l.num}">${inner}</a>`; }).join('')}</div>
    </div>`);
  }

  /* ---------- Lesson cover ---------- */
  function intro(num) {
    const l = C[num - 1]; if (!l) return course();
    const s = status(l), pi = partOf(l);
    page('course', `<div class="wrap intro">
      <span class="big num" aria-hidden="true">${pad(l.num)}</span>
      <h1>${esc(l.title)}</h1>
      <p class="q">${esc(l.q)}</p>
      <div class="meta cap"><a href="#part-${pi + 1}">Part ${pad(pi + 1)} · ${PARTS[pi].name}</a><span>${l.min} min</span><span>${l.steps.length} steps</span>${s === 'done' ? '<span class="on">Complete</span>' : ''}</div>
      <div class="acts">${s === 'locked' ? `<span class="btn" aria-disabled="true">Unlocks after lesson ${pad(l.num - 1)}</span>` : `<a class="btn white" href="#lesson-${l.num}">${s === 'now' && step() ? `Resume step ${step() + 1}` : s === 'now' ? 'Begin' : s === 'done' ? 'Review' : 'Begin'} ${CHEV}</a>`}</div>
    </div>`, { hideResume: s === 'now' });
  }

  /* ---------- Toolkit: your cards ---------- */
  let openSlot = 1;
  const cardFields = n => (C[n - 1].steps.find(x => x.kind === 'toolkitSave')?.fields || []).map((f, i) => [f.label, cards()[n]?.[i] || '']);
  const slotDetail = () => openSlot && cards()[openSlot] ? `<span class="cap">Lesson ${pad(openSlot)} · ${esc(cardName(C[openSlot - 1]))}</span><h2>${esc(C[openSlot - 1].title)}</h2><dl>${cardFields(openSlot).map(([k, v]) => `<div><dt class="cap">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
  function toolkit() {
    const got = n => !!cards()[n]; if (!got(openSlot)) openSlot = +Object.keys(cards())[0] || 0;
    page('toolkit', `<div class="wrap page">
      <div class="page-h"><h1>Toolkit</h1><p>${ME ? 'One card from each lesson, written by you: your own playbook for using AI.' : 'Every lesson ends with a card you write. Sign in to keep yours.'}</p></div>
      <div class="slots" role="group" aria-label="Toolkit cards, one per lesson">${C.map(l => `<button class="slot ${got(l.num) ? 'got' : ''}" data-n="${l.num}" ${got(l.num) ? `aria-pressed="${openSlot === l.num}"` : 'disabled'} aria-label="Lesson ${pad(l.num)}, ${esc(cardName(l))}${got(l.num) ? '' : ', not earned yet'}">${pad(l.num)}<small>${esc(cardName(l))}</small></button>`).join('')}</div>
      <section class="slot-detail" id="slot-detail" aria-live="polite">${slotDetail()}</section>
    </div>`);
    const slots = $$('.slot.got');
    slots.forEach(b => b.addEventListener('click', () => { openSlot = openSlot === +b.dataset.n ? 0 : +b.dataset.n; slots.forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === openSlot))); const d = $('#slot-detail'); d.innerHTML = slotDetail(); d.animate?.([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: reduced ? 0 : 600, easing: 'cubic-bezier(.16,1,.3,1)' }); }));
  }

  /* ---------- Projects ---------- */
  function projects() {
    page('projects', `<div class="wrap page">
      <div class="page-h"><h1>One real task.</h1><p>Your final project, after lesson 15: take one task from goal to finished result, with AI as a tool.</p></div>
      <div class="stages"><div class="on"><b>Draft</b><p>Only you.</p></div><div><b>Submitted</b><p>Private review.</p></div><div><b>Reviewed</b><p>Feedback to you.</p></div><div><b>Published</b><p>Your choice. Reversible.</p></div></div>
      <p class="footnote">Published projects will appear in a gallery here.</p>
    </div>`);
  }

  /* ---------- About: one page, four sections ---------- */
  function about(anchor) {
    page('about', `<div class="wrap page">
      <p class="lede">AI answers in seconds. <span>Deciding how to work with it still takes a person. LearningAI teaches that.</span></p>
      <section class="about-sec" id="parents" aria-labelledby="h-parents"><h2 id="h-parents">For parents</h2><ul class="short">
        <li><span class="cap">01</span><span>Lessons use invented examples. Students are told never to type real names, addresses or passwords.</span></li>
        <li><span class="cap">02</span><span>Progress belongs to the student. Nothing is public unless they publish a project.</span></li>
        <li><span class="cap">03</span><span><a class="ulink inline" href="#account-privacy">Exactly what we store, and who sees it</a></span></li></ul></section>
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
    if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 120);
  }

  /* ---------- Lesson player: one step on screen at a time ---------- */
  const KIND = { coldOpen: 'Scenario', classify: 'Sort', reveal: 'Explanation', compare: 'Compare', workflowChain: 'Sequence', toolkitSave: 'Keep', exitCheck: 'Final check', verify: 'Verify', promptRepair: 'Rewrite', tryLive: 'Try it' };
  const LS = {};
  const paras = t => String(t || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('');
  function lesson(num, dir) {
    const l = C[num - 1]; if (!l || status(l) === 'locked') { location.replace(l ? `#intro-${l.num}` : '#course'); return; }
    const st = LS[l.id] || (LS[l.id] = { i: ME && l.id === ME.current ? ME.step : 0, a: {} });
    const n = l.steps.length, s = l.steps[st.i], a = st.a[st.i] || (st.a[st.i] = {});
    const field = (id, label, value, attrs = '') => `<label class="cap field-lbl" for="${id}">${esc(label)}</label><textarea id="${id}" ${attrs}>${esc(value || '')}</textarea>`;
    const body = {
      coldOpen: () => `<div class="body">${paras(s.scenario)}</div><p class="prompt">${esc(s.prompt)}</p><label class="vh" for="first">Your first thought</label><textarea id="first" data-text placeholder="Your first thought. Only you see this.">${esc(a.text || '')}</textarea>`,
      reveal: () => `<div class="body">${paras(s.body)}</div>${s.mistake || s.good ? `<div class="pairs">${s.mistake ? `<div><span class="cap">Common mistake</span><p>${esc(s.mistake)}</p></div>` : ''}${s.good ? `<div><span class="cap good">Better move</span><p>${esc(s.good)}</p></div>` : ''}</div>` : ''}`,
      classify: () => `<div class="body"><p>${esc(s.prompt)}</p></div><div class="convo" aria-label="Example"><div><span class="cap">You</span><p>When does the last bus home leave tonight?</p></div><div><span class="cap">Assistant</span><p>The last bus leaves at 10:40 pm.</p></div></div><ul class="jobs" id="jobs"></ul><div id="o"></div>`,
      exitCheck: () => `<div class="body"><p>${esc(s.question)}</p></div><div class="answers" id="box"></div><div id="o"></div>`,
      toolkitSave: () => `<div class="body"><p>Short answers are fine.</p></div>${(s.fields || []).map(f => field(`f-${f.key}`, f.label, (a.v || {})[f.key], `data-k="${esc(f.key)}" placeholder="${esc(f.placeholder || '')}"`)).join('')}`,
      workflowChain: () => `<div class="body"><p>${esc(s.goal)}</p><p class="muted">Select the steps in the safest order.</p></div><div class="answers" id="box"></div><div id="o"></div>`,
      compare: () => `<div class="body"><p>Two ways to ask. Which gives the better answer?</p></div><div class="answers" id="box"></div><div id="o"></div>`,
      verify: () => `<div class="convo"><div><span class="cap">Claim</span><p>${esc(s.claim)}</p></div></div><ol class="short mt">${(s.steps || []).map((x, i) => `<li><span class="cap">${pad(i + 1)}</span><span>${esc(typeof x === 'string' ? x : x.text || '')}</span></li>`).join('')}</ol>${s.note ? `<div class="body"><p class="muted">${esc(s.note)}</p></div>` : ''}`,
      promptRepair: () => `<div class="convo"><div><span class="cap">Original</span><p>${esc(s.weak)}</p></div></div><div class="body"><p>Rewrite it without the private details. Fill in the blanks:</p></div>${(s.fields || []).map((f, i) => field(`pr-${i}`, f, (a.pr || {})[i], `data-pr="${i}"`)).join('')}<div class="mt"><button class="btn" id="pr-show" aria-expanded="${!!a.shown}">Show a safer version</button></div><div id="o">${a.shown ? outcome('Safer version', esc(s.strong)) : ''}</div>`,
      tryLive: () => `<div class="body"><p>${esc(s.prompt)}</p></div><label class="vh" for="try">Your plan</label><textarea id="try" data-text placeholder="Your plan. Only you see this.">${esc(a.text || '')}</textarea>${s.note ? `<div class="body"><p class="muted">${esc(s.note)}</p></div>` : ''}`
    }[s.kind] || (() => `<div class="body">${paras([s.body, s.prompt, s.scenario, s.note].filter(Boolean).join('\n\n'))}</div>`);

    const view = chrome(); document.getElementById('nav').hidden = true; activeTab = 'lesson';
    view.innerHTML = `
      <header class="lbar"><div class="wrap lbar-in"><a class="ulink plain rev" href="#intro-${l.num}">${AR}<span>Exit</span></a><span class="cap t">${pad(l.num)} · ${esc(l.title)}</span><span class="r cap"><i aria-hidden="true"></i>Saved</span></div>
        <div class="rule" role="img" aria-label="Step ${st.i + 1} of ${n}"><i style="width:${(st.i + 1) / n * 100}%"></i></div></header>
      <main id="main" class="lesson">
        <span class="cap">Step ${pad(st.i + 1)} / ${pad(n)} · ${KIND[s.kind] || 'Step'}</span>
        <h1 id="step-h" tabindex="-1">${esc(s.title)}</h1>
        ${body()}
        <div class="lfoot"><button class="ulink plain rev" id="prev" ${st.i === 0 ? 'disabled' : ''}>${AR}<span>Back</span></button><button class="btn white" id="next">${st.i === n - 1 ? 'Finish' : 'Continue'} ${CHEV}</button></div>
      </main>`;
    animateIn($('#main'), dir);
    const go = d => { st.i = Math.min(n - 1, Math.max(0, st.i + d)); lesson(num, d > 0 ? 'next' : 'back'); scrollTo(0, 0); document.getElementById('step-h').focus(); };
    $('#prev').addEventListener('click', () => go(-1));
    $('#next').addEventListener('click', () => {
      if (st.i < n - 1) return go(1);
      st.i = 0;
      if (!ME) { location.hash = '#join'; return; }
      if (!ME.done.includes(l.id)) ME.done.push(l.id);
      const next = C[num]; if (l.id === ME.current && next) { ME.current = next.id; ME.step = 0; }
      location.hash = next ? `#intro-${next.num}` : '#home';
    });
    $$('[data-text]').forEach(t => t.addEventListener('input', () => a.text = t.value));
    $$('[data-k]').forEach(t => t.addEventListener('input', () => { (a.v || (a.v = {}))[t.dataset.k] = t.value; }));
    $$('[data-pr]').forEach(t => t.addEventListener('input', () => { (a.pr || (a.pr = {}))[t.dataset.pr] = t.value; }));
    $('#pr-show')?.addEventListener('click', e => { a.shown = true; e.currentTarget.setAttribute('aria-expanded', 'true'); $('#o').innerHTML = outcome('Safer version', esc(s.strong)); $('#o').firstChild.focus(); });

    /* answer lists share one pattern: render, pick, redraw, move focus to the result */
    const answers = (items, onPick, result, keepFocus) => {
      const box = $('#box'), out = $('#o');
      const draw = focusSel => {
        box.innerHTML = items().map(([k, text, attrs]) => `<button class="answer" ${attrs}><span class="k">${k}</span><span>${esc(text)}</span></button>`).join('');
        out.innerHTML = result() || '';
        box.querySelectorAll('.answer').forEach(b => b.addEventListener('click', () => { const sel = onPick(b); draw(sel); }));
        if (focusSel) (keepFocus ? box.querySelector(focusSel) : out.firstChild)?.focus();
      };
      draw();
    };
    if (s.kind === 'compare') answers(() => [['A', s.weak, `data-j="0" aria-pressed="${a.pick === 0}" ${a.pick != null ? 'disabled' : ''}`], ['B', s.strong, `data-j="1" aria-pressed="${a.pick === 1}" ${a.pick != null ? 'disabled' : ''}`]],
      b => { a.pick = +b.dataset.j; return 'x'; }, () => a.pick != null && outcome(a.pick === 1 ? 'Correct' : 'Answer: B', esc(s.why)));
    if (s.kind === 'exitCheck') answers(() => s.options.map((o, j) => [String.fromCharCode(65 + j), o.text, `data-j="${j}" aria-pressed="${a.pick === j}" ${a.pick != null ? 'disabled' : ''}`]),
      b => { a.pick = +b.dataset.j; return 'x'; }, () => a.pick != null && outcome(s.options[a.pick].ok ? 'Correct' : 'Not quite', esc(s.options[a.pick].feedback || '')));
    if (s.kind === 'workflowChain') {
      a.seq = a.seq || []; a.order = a.order || (s.choices || [...s.correct].sort(() => Math.random() - .5));
      answers(() => a.order.map(c => { const k = a.seq.indexOf(c); return [k >= 0 ? pad(k + 1) : '—', c, `data-c="${esc(c)}" aria-pressed="${k >= 0}"`]; }),
        b => { const c = b.dataset.c, k = a.seq.indexOf(c); k >= 0 ? a.seq.splice(k, 1) : a.seq.push(c); return `[data-c="${CSS.escape(c)}"]`; },
        () => { if (a.seq.length !== s.correct.length) return ''; const ok = a.seq.every((c, i) => c === s.correct[i]); return outcome(ok ? 'Correct order' : 'Not quite', ok ? esc(s.note || '') : 'Tap a step to remove it and try again.'); }, true);
    }
    if (s.kind === 'classify') {
      a.p = a.p || {};
      const jobs = $('#jobs'), out = $('#o');
      const draw = focus => {
        jobs.innerHTML = s.items.map((it, i) => `<li class="job"><p>${esc(it.text)}</p><div class="opts" role="group" aria-label="Which part does this?">${s.buckets.map((b, k) => `<button class="opt" data-i="${i}" data-k="${k}" aria-pressed="${a.p[i] === k}">${esc(b)}</button>`).join('')}</div>${a.checked ? `<span class="verdict ${a.p[i] === it.answer ? '' : 'no'}">${a.p[i] === it.answer ? 'Correct' : `Answer: ${esc(s.buckets[it.answer])}`}</span>` : ''}</li>`).join('');
        const all = s.items.every((_, i) => a.p[i] != null), right = s.items.filter((it, i) => a.p[i] === it.answer).length;
        out.innerHTML = a.checked ? outcome(`${right} of ${s.items.length}`, esc(s.reveal)) : `<div class="mt"><button class="btn" id="chk" ${all ? '' : 'disabled'}>Check</button></div>`;
        jobs.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { a.p[b.dataset.i] = +b.dataset.k; a.checked = false; draw(`[data-i="${b.dataset.i}"][data-k="${b.dataset.k}"]`); }));
        out.querySelector('#chk')?.addEventListener('click', () => { a.checked = true; draw(); out.firstChild.focus(); });
        if (focus) jobs.querySelector(focus)?.focus();
      };
      draw();
    }
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
  function signin() {
    authShell('Sign in', ME ? `You’re signed in as ${esc(ME.name)}. Sign in below to switch accounts.` : 'Pick up exactly where you stopped.', `<form class="form" id="f" novalidate>
      <div class="fld"><label for="em">Email</label><input class="input" type="email" id="em" autocomplete="email" required><span class="err" id="em-e" hidden></span></div>
      ${pwField('pw', 'current-password')}<span class="err" id="pw-e" hidden></span></div>
      <div class="form-foot"><button class="btn white" type="submit">Sign in ${CHEV}</button><a class="ulink" href="#forgot">Forgot password?</a></div>
      <a class="ulink" href="#join">New here? Create an account</a>
      <div id="out" aria-live="polite"></div></form>
      ${DEMO.accounts.length ? `<details class="demo"><summary class="cap">Test accounts</summary><ul>${DEMO.accounts.map(a => `<li><span><b>${esc(a.label)}</b><span class="hint">${esc(a.name)} · ${esc(a.email)}</span></span><button type="button" class="opt" data-demo="${a.id}">Use</button></li>`).join('')}</ul><p class="hint">Prototype only. These fake accounts live in demo-accounts.js and never reach the live site.</p></details>` : ''}`);
    wirePw();
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
      <div class="form-foot"><button class="btn white" type="submit">Send link ${CHEV}</button><a class="ulink" href="#signin">Back to sign in</a></div><div id="out" aria-live="polite"></div></form>`);
    $('#f').addEventListener('submit', e => { e.preventDefault(); notice($('#out'), 'Prototype: no email is sent. In the live site, a reset link arrives if the address has an account.'); });
  }
  function join() {
    authShell('Join', 'Save your progress and continue on any device.', `<form class="form" id="f" novalidate>
      <div class="fld"><label for="nm">First name or nickname</label><input class="input" type="text" id="nm" autocomplete="given-name" maxlength="30" required><span class="hint">Only used to say hello.</span></div>
      <div class="fld"><label for="em">Email</label><input class="input" type="email" id="em" autocomplete="email" required></div>
      ${pwField('pw', 'new-password', 'aria-describedby="pw-h"')}<div class="pwmeter" aria-hidden="true"><i></i><i></i><i></i></div><span class="hint" id="pw-h">At least 10 characters.</span></div>
      <div class="fld"><span class="lbl" id="age-l">Age</span><div class="opts" role="group" aria-labelledby="age-l">${['13–15', '16–18', 'Adult'].map(x => `<button type="button" class="opt" aria-pressed="false">${x}</button>`).join('')}</div></div>
      <label class="chk"><input type="checkbox" id="ok13" required> I’m 13 or older, and I’ve read <a class="ulink inline" href="#account-privacy">what we store</a>.</label>
      <div class="form-foot"><button class="btn white" type="submit">Create account ${CHEV}</button><a class="ulink" href="#signin">I have an account</a></div>
      <div id="out" aria-live="polite"></div></form>`, 'Lesson 01 works without an account.');
    wirePw();
    const pw = $('#pw'), bars = $$('.pwmeter i'), ages = $$('.opt');
    pw.addEventListener('input', () => { const v = pw.value, sc = v.length >= 10 ? 1 + (/[A-Z]/.test(v) && /[a-z]/.test(v)) + /[\d\W]/.test(v) : 0; bars.forEach((b, i) => b.classList.toggle('on', i < sc)); });
    ages.forEach(b => b.addEventListener('click', () => pressOne(ages, b)));
    $('#f').addEventListener('submit', e => {
      e.preventDefault(); const need = [];
      if (!$('#nm').value.trim()) need.push('a name'); if (!isEmail($('#em').value)) need.push('a valid email');
      if (pw.value.length < 10) need.push('a password of 10+ characters'); if (!$('.opt[aria-pressed="true"]')) need.push('your age group'); if (!$('#ok13').checked) need.push('the age confirmation');
      pw.value = ''; bars.forEach(b => b.classList.remove('on'));
      if (need.length) return notice($('#out'), `Still needed: ${need.join(', ')}.`);
      /* Prototype: a temporary account for this session only; the password is never stored. */
      ME = { id: 'joined', name: $('#nm').value.trim(), email: $('#em').value.trim(), done: [], current: 'chapter-1', step: 0, cards: {} };
      location.hash = '#home';
    });
  }

  /* ---------- Settings ---------- */
  const SET_TABS = [['account', 'Profile'], ['account-prefs', 'Preferences'], ['account-privacy', 'Privacy']];
  const row = (k, v, action = '<span></span>', vid = '') => `<div class="set-row"><span class="k">${k}</span><span class="v"${vid ? ` id="${vid}"` : ''}>${v}</span>${action}</div>`;
  const choice = (pref, opts) => `<span class="opts">${opts.map(([k, t]) => `<button class="opt" data-pref="${pref}" data-v="${k}" aria-pressed="${PREFS[pref] === k}">${t}</button>`).join('')}</span>`;
  let nameTimer;
  function account(tab = 'account') {
    if (!ME) { location.replace('#signin'); return; }
    const rows = {
      account: row('Name', `<label class="vh" for="nm">Name</label><input class="input" id="nm" type="text" value="${esc(ME.name)}" maxlength="30">`, '<span class="cap" id="nm-s" aria-live="polite"></span>')
        + row('Email', `<b>${esc(ME.email)}</b>`) + row('Password', 'Last changed: never', '<a class="btn sm" href="#forgot">Change</a>') + row('Session', `Signed in as ${esc(ME.name)} on this device`, '<button class="btn sm" id="so">Sign out</button>'),
      'account-prefs': row('Text size', 'Larger text across every page.', choice('text', [['std', 'Standard'], ['lg', 'Large']])) + row('Motion', 'Reduced turns off page and menu animations.', choice('motion', [['full', 'Full'], ['calm', 'Reduced']])),
      'account-privacy': row('What we store', 'Your name, email, lessons finished, and the cards you write. <b>Never</b> your chats with outside AI tools.')
        + row('Who sees it', 'Only you. Projects stay private unless you publish them.') + row('Your data', 'A copy of everything we store about you.', '<button class="btn sm" id="dl">Request copy</button>')
        + row('Delete account', 'Removes your progress and cards permanently.', '<button class="btn sm danger" id="del">Delete</button>', 'del-v')
    }[tab];
    page('account', `<div class="wrap page">${subtabs(SET_TABS, tab, 'Settings sections')}<div>${rows}</div><div id="out" aria-live="polite"></div></div>`);
    const out = $('#out');
    $('#nm')?.addEventListener('input', e => { ME.name = e.target.value.trim() || 'there'; $('#nm-s').textContent = 'Saved'; clearTimeout(nameTimer); nameTimer = setTimeout(() => { const x = $('#nm-s'); if (x) x.textContent = ''; }, 1400); });
    $('#so')?.addEventListener('click', () => { signOut(); location.hash = '#home'; });
    $$('[data-pref]').forEach(b => b.addEventListener('click', () => { PREFS[b.dataset.pref] = b.dataset.v; applyPrefs(); pressOne($$(`[data-pref="${b.dataset.pref}"]`), b); }));
    $('#dl')?.addEventListener('click', () => notice(out, 'Prototype: in the live site we email a copy of your data to your account address within a day.'));
    $('#del')?.addEventListener('click', e => {
      const b = e.currentTarget, v = $('#del-v');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirm delete'; v.innerHTML = '<b>Are you sure?</b> This can’t be undone. Press again to confirm.'; return b.focus(); }
      delete b.dataset.armed; b.textContent = 'Delete'; v.textContent = 'Removes your progress and cards permanently.';
      notice(out, 'Prototype: nothing was deleted. In the live site your account and progress would now be removed.');
    });
  }

  /* ---------- router ---------- */
  const ROUTES = { home, course, toolkit, projects, about, signin, join, forgot,
    parents: () => about('parents'), teachers: () => about('teachers'), faq: () => about('faq'),
    gallery: () => location.replace('#projects'), progress: () => location.replace('#home') };
  let first = true, pending;
  function route() {
    clearTimeout(pending);
    const m0 = document.getElementById('main'), wasFirst = first; first = false;
    const go = () => { render(); if (!wasFirst) (document.querySelector('main h1') || document.getElementById('main'))?.focus({ preventScroll: true }); };
    if (!wasFirst && m0 && !reduced) { m0.classList.add('out'); pending = setTimeout(go, 180); } else go();
  }
  function render() {
    const h = location.hash.slice(1) || 'home'; let m;
    scrollTo(0, 0);
    if ((m = h.match(/^lesson-(\d+)$/))) lesson(+m[1]);
    else if ((m = h.match(/^intro-(\d+)$/))) intro(+m[1]);
    else if ((m = h.match(/^part-([123])$/))) part(+m[1] - 1);
    else if (h.startsWith('account')) account(SET_TABS.some(([k]) => k === h) ? h : 'account');
    else (ROUTES[h] || home)();
    const lessonNo = h.match(/^(lesson|intro)-(\d+)$/)?.[2], partNo = h.match(/^part-([123])$/)?.[1];
    const name = lessonNo ? C[lessonNo - 1]?.title : partNo ? PARTS[partNo - 1].name : TITLES[h.replace(/-.*/, '')];
    document.title = name ? `${name} · LearningAI` : 'LearningAI';
  }
  document.documentElement.lang = 'en';
  document.querySelector('.skip')?.addEventListener('click', e => { e.preventDefault(); const m = document.getElementById('main'); (m?.querySelector('h1') || m)?.focus(); });
  addEventListener('hashchange', route);
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 700))]).then(() => { route(); root.style.opacity = 1; });
})();
