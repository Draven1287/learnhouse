/* LearningAI: Home, Course (+ parts), lesson cover and player, Toolkit, Projects, About, account pages.
   Every page shares one instrument language: dials, step tick strips and readouts.
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
        <nav class="mx-words" aria-label="Menu">${words.map(([k, t], i) => `<a href="#${k}" style="--d:${140 + i * 95}ms" ${k === activeTab ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
        <div class="mx-box" aria-label="Course parts">${PARTS.map((p, i) => `<a class="mx-card" href="#part-${i + 1}" style="--d:${560 + i * 95}ms"><span class="art">${miniDial(partLessons(i), pad(i + 1))}</span><span><span class="cap">Part ${pad(i + 1)}</span><b>${p.name}</b></span>${AR}</a>`).join('')}</div>
      </div>
      <div class="mx-foot"><a class="cap" href="#${ME ? 'account' : 'signin'}">${ME ? `Settings · ${esc(ME.name)}` : 'Sign in'}</a><span class="cap dim">Free · Ages 13–18</span></div>
    </div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden'; root.inert = true; btn.setAttribute('aria-expanded', 'true');
    [...w.querySelectorAll('.mx-words a, .mx-card')].reverse().forEach((el, i) => el.style.setProperty('--dc', `${i * 28}ms`));
    const show = () => w.classList.add('open'); requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80);
    const close = (e) => { if (w.classList.contains('closing')) return; const byKey = e?.type === 'keydown' || (e?.detail === 0); w.classList.add('closing'); root.inert = false; btn.setAttribute('aria-expanded', 'false'); menuTimer = setTimeout(() => { w.remove(); document.body.style.overflow = ''; }, reduced ? 0 : 820); btn.focus({ focusVisible: byKey }); };
    w.querySelector('#close').addEventListener('click', close);
    addEventListener('hashchange', () => w.isConnected && close(), { once: true });
    w.querySelectorAll('a').forEach(x => x.addEventListener('click', close));
    w.addEventListener('keydown', e => { if (e.key === 'Escape') close(e); if (e.key === 'Tab') { const f = [...w.querySelectorAll('button, a')].filter(x => x.offsetParent); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
    w.querySelector('#close').focus();
  }

  /* ---------- motion: staged reveal after every render ---------- */
  const REVEAL = '.ck-clock, .lead-line, .memory, .ck .ulink, .ck-gauge, .ck-core > *, .ck-ign, .ro li, .ihead .kick, .ihead p, .auth-dial, .lstep, .auth-l > *, .form > *, .set-row, .subtabs, .prow, .lrow, .stages > div, .footnote, .slots, .slot-detail, .about-sec, .lesson > :not(h1):not(.lstep)';
  function animateIn(scope, dir) {
    if (!scope) return;
    scope.querySelectorAll('h1').forEach((h, n) => { h.setAttribute('tabindex', '-1'); if (h.classList.contains('vh')) return; h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map((x, i) => `<span class="mask"><span style="transition-delay:${40 + (n + i) * 90}ms">${x}</span></span>`).join(''); });
    let i = 0; scope.querySelectorAll(REVEAL).forEach(e => { e.classList.add('rv'); e.style.setProperty('--d', `${200 + Math.min(i++, 7) * 45}ms`); });
    if (dir) scope.dataset.dir = dir;
    const show = () => scope.classList.add('in');
    if (reduced) return show();
    requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80); // timer fallback if frames are paused
  }

  /* ---------- Instruments: dials, tick strips and readouts used on the inner pages ---------- */
  const G_START = -120, G_END = 120, R = { t0: 238, t1: 254, num: 282, trk: 226 };
  const gpt = (a, r) => { const t = (a - 90) * Math.PI / 180; return [(r * Math.cos(t)).toFixed(2), (r * Math.sin(t)).toFixed(2)]; };
  const garc = (a0, a1, r) => { const [x0, y0] = gpt(a0, r), [x1, y1] = gpt(a1, r); return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
  const ro = (label, v, unit, sub) => `<li><span class="cap">${label}</span><div class="v">${v}${unit ? `<small>${unit}</small>` : ''}</div>${sub ? `<p class="s">${sub}</p>` : ''}</li>`;

  /* steps lit for a lesson: all when done, up to your step when current */
  const litOf = l => { const s = status(l); return s === 'done' ? l.steps.length : s === 'now' && ME ? step() : 0; };
  const isNowStep = (l, k) => !!ME && status(l) === 'now' && k === step();
  /* A dial: arc segments (lessons, or a lesson's steps), fine ticks inside each, labels outside, one needle. */
  function dialSvg(segs, labels, outer, aria) {
    const ticks = segs.map(g => Array.from({ length: g.n }, (_, k) => { const [x0, y0] = gpt(g.tick(k), R.t0), [x1, y1] = gpt(g.tick(k), R.t1); return `<line class="tk" data-a="${g.tick(k).toFixed(3)}" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>`; }).join('')).join('');
    return `<svg viewBox="-320 -320 640 640" role="group" aria-label="${esc(aria)}">
      <circle class="inner" r="196" aria-hidden="true"/><g aria-hidden="true">${segs.map(g => `<path class="trk" d="${garc(g.a0, g.a1, R.trk)}"/>`).join('')}</g>
      <path class="prog" id="ck-prog" d="" aria-hidden="true"/><g aria-hidden="true">${ticks}</g><g>${labels}</g><g aria-hidden="true">${outer}</g>
      <g class="ndl" id="ck-ndl" aria-hidden="true"><line class="hz" x1="0" y1="-200" x2="0" y2="-222"/><line x1="0" y1="-226" x2="0" y2="-268"/></g></svg>`;
  }
  const dialLabel = (a, cls, text, href, label) => { const [x, y] = gpt(a, R.num), t = `<text class="lnum ${cls}" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${text}</text>`; return href ? `<a href="${href}" aria-label="${esc(label)}">${t}</a>` : t; };
  /* one lesson's dial: a segment per step, seven ticks in each */
  const lessonGeo = l => { const n = l.steps.length, gap = 4, w = (G_END - G_START - gap * (n - 1)) / n;
    return l.steps.map((_, k) => { const a0 = G_START + k * (w + gap), a1 = a0 + w; return { a0, a1, mid: (a0 + a1) / 2, n: 7, tick: j => a0 + (j + .5) / 7 * (a1 - a0) }; }); };
  /* The needle travels from the start stop to your step. */
  function needle(to, segs) {
    const ndl = document.getElementById('ck-ndl'), prog = document.getElementById('ck-prog'), tks = $$('.ck-gauge .tk');
    const draw = (a, settled) => {
      ndl.setAttribute('transform', `rotate(${a.toFixed(3)})`);
      prog.setAttribute('d', segs.filter(g => g.a0 < a).map(g => garc(g.a0, Math.min(g.a1, a - .01), R.trk)).join(''));
      for (const t of tks) { const ta = +t.dataset.a; t.classList.toggle('on', ta < a - .05); t.classList.toggle('now', settled && to > G_START && to < G_END && Math.abs(ta - a) < .05); }
    };
    if (reduced || document.documentElement.classList.contains('calm')) return draw(to, true);
    const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const keys = [{ from: G_START, to, ms: 1200, fn: easeIO }];
    draw(G_START, false);
    let seg = 0, t0 = 0, fin = false;
    const end = () => { if (!fin && ndl.isConnected) { fin = true; draw(to, true); } };
    const tick = now => { if (fin || !ndl.isConnected) return; const k = keys[seg], p = Math.min(1, (now - t0) / k.ms); draw(k.from + (k.to - k.from) * k.fn(p), false);
      if (p < 1) return requestAnimationFrame(tick); if (++seg < keys.length) { t0 = now; return requestAnimationFrame(tick); } end(); };
    setTimeout(() => requestAnimationFrame(now => { t0 = now; tick(now); }), 350);
    setTimeout(end, 350 + keys.reduce((s, k) => s + k.ms, 0) + 600); // lands even if frames are paused
  }
  /* A small static dial (menu cards, course parts, sign-in): one tick per step, needle at your progress. */
  function miniDial(ls, label) {
    const st = ls.flatMap(l => l.steps.map((_, k) => ({ on: k < litOf(l), now: isNowStep(l, k) }))), N = st.length, a = i => G_START + (i + .5) / N * (G_END - G_START);
    const ticks = st.map((x, i) => { const [x0, y0] = gpt(a(i), 44), [x1, y1] = gpt(a(i), 53); return `<line class="tk${x.on ? ' on' : ''}${x.now ? ' now' : ''}" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>`; }).join('');
    const na = G_START + st.filter(x => x.on).length / N * (G_END - G_START);
    return `<svg class="mini" viewBox="-60 -60 120 120" aria-hidden="true"><path class="trk" d="${garc(G_START, G_END, 39)}"/>${ticks}<g class="ndl" transform="rotate(${na.toFixed(2)})"><line x1="0" y1="-31" x2="0" y2="-56"/></g><text class="mini-n" y="4" text-anchor="middle" dominant-baseline="central">${label}</text></svg>`;
  }
  /* A lesson's steps as a row of ticks */
  const strip = l => `<span class="strip" aria-hidden="true">${l.steps.map((_, k) => `<i class="${k < litOf(l) ? 'on' : ''}${isNowStep(l, k) ? ' now' : ''}"></i>`).join('')}</span>`;
  /* Inner-page header: label, title, line, and a row of readouts */
  const ihead = (kick, h1, p, ros) => `<header class="ihead"><div><span class="cap kick">${kick}</span><h1>${h1}</h1>${p ? `<p>${p}</p>` : ''}</div><ul class="ro ro-row">${ros}</ul></header>`;
  const nDone = () => ME ? ME.done.length : 0;

  /* ---------- Home: a personal briefing. No AI: the page reads your progress and what you wrote,
     then speaks a few lines one after another and asks what you'd like to do. ---------- */
  let briefed = false; // the first Home of a visit is spoken at full pace; later ones arrive quickly
  const quote = t => esc(t.length > 120 ? t.slice(0, 118).replace(/\s+\S*$/, '').replace(/[\s.,;:]+$/, '') + '…' : t); // cut at a word
  const STEP_NAME = ['the explanation', 'the first question', 'the second question', 'the part where you write it in your own words'];
  function home() {
    const now = new Date(), hr = now.getHours();
    const tod = hr < 5 ? 'late' : hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : hr < 22 ? 'evening' : 'late';
    const greet = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', late: 'Up late' }[tod];
    const when = `${now.toLocaleDateString('en', { weekday: 'long' })} ${tod === 'late' ? 'night' : tod} · ${pad(hr)}:${pad(now.getMinutes())}`;
    const l = cur(), done = finished(), k = step(), nd = nDone();
    const last = nd ? C.find(x => x.id === ME.done[nd - 1]) : null, wrote = last && cards()[last.num]?.slice(-1)[0];
    const minsIn = ME ? C.filter(x => ME.done.includes(x.id)).reduce((s, x) => s + x.min, 0) : 0;
    const T = x => `<em>${esc(x.title)}</em>`;
    const said = wrote ? `You wrote: <em>“${quote(wrote)}”</em>` : '';
    const rail = `<span class="hi-rail" aria-hidden="true">${C.map(x => `<i class="${status(x) === 'done' ? 'on' : status(x) === 'now' && ME && !done ? 'now' : ''}"></i>`).join('')}</span>`;
    const summary = `So far: ${nd} of ${C.length} lessons${minsIn ? `, about ${minsIn < 60 ? `${minsIn} minutes` : fmtDur(minsIn)} in` : ''}.${rail}`;
    let lines, ask, go, href, more;
    if (!ME) {
      lines = [`I’ll guide you through fifteen short lessons on using AI with your own judgment.`,
        `The first one, ${T(l)}, takes about ${l.min} minutes. You don’t need an account.`];
      ask = 'Would you like to start?'; go = `Start lesson ${pad(l.num)}`; href = `#intro-${l.num}`;
      more = [['#course', 'Look at the whole course first'], ['#signin', 'Sign in to keep your place']];
    } else if (done) {
      lines = ['You’ve finished all fifteen lessons.', said, summary];
      ask = 'Would you like to start your final project?'; go = 'Start your project'; href = '#projects';
      more = [['#course', 'Look back through the lessons'], ['#toolkit', 'Read everything you wrote']];
    } else if (k) {
      lines = [`You’re partway through lesson ${pad(l.num)}, ${T(l)}${stop(l.title)}`,
        `You stopped at step ${k + 1} of ${l.steps.length}, ${STEP_NAME[k] || 'the next step'}. About ${minsLeft()} minutes to finish.`,
        last ? `Before that, you finished ${T(last)}${stop(last.title)} ${said}` : '', summary];
      ask = 'Would you like to pick up where you left off?'; go = `Continue lesson ${pad(l.num)}`; href = `#lesson-${l.num}`;
    } else if (!nd) {
      lines = [`Welcome. Everything starts with lesson ${pad(l.num)}, ${T(l)}${stop(l.title)}`,
        `It’s about this: ${esc(l.q)}`, `About ${l.min} minutes. Nothing is graded.`];
      ask = 'Ready to begin?'; go = `Begin lesson ${pad(l.num)}`; href = `#lesson-${l.num}`;
    } else {
      lines = [`Last time you finished ${T(last)}${stop(last.title)} ${said}`,
        `Next is lesson ${pad(l.num)}, ${T(l)}${stop(l.title)} It’s about this: ${esc(l.q)}`, summary];
      ask = { morning: 'Would you like to do it before the day gets going?', afternoon: 'Shall we start it?', evening: 'One lesson before the day ends?', late: 'It’s late, but this one is short. Start it?' }[tod];
      go = `Start lesson ${pad(l.num)}`; href = `#lesson-${l.num}`;
    }
    if (ME && !more) more = [...(last ? [[`#intro-${last.num}`, `Review lesson ${pad(last.num)}`]] : []), ['#course', 'See the whole course'], ['#toolkit', 'Read what you’ve written']];
    const gap = reduced || briefed ? 110 : 520, base = briefed ? 250 : 700; briefed = true;
    const say = (h, i, cls = '') => `<p class="say ${cls}" style="--d:${base + i * gap}ms">${h}</p>`;
    const shown = lines.filter(Boolean), tAsk = base + shown.length * gap;
    page('home', `<div class="hi">
        <section class="hi-main" aria-labelledby="hi-h">
          <p class="cap hi-when">${when}</p>
          <h1 id="hi-h">${greet}${ME ? `,<br>${esc(ME.name)}.` : '.'}</h1>
          <div class="hi-say">${shown.map((h, i) => say(h, i)).join('')}</div>
          <div class="hi-ask">
            ${say(ask, shown.length, 'q')}
            <div class="hi-go" style="--d:${tAsk + gap}ms"><a class="btn white" id="ck-go" href="${href}">${go} ${CHEV}</a><button class="ulink plain" id="hi-more" aria-expanded="false" aria-controls="hi-list">Something else</button></div>
            <ul class="hi-list" id="hi-list" hidden>${more.map(([h, t]) => `<li><a href="${h}">${t}${AR}</a></li>`).join('')}</ul>
          </div>
        </section>
        <div class="hi-num num" aria-hidden="true">${pad(done ? C.length : l.num)}</div>
      </div>`, { hideResume: true });
    $('#hi-more').addEventListener('click', e => { const list = $('#hi-list'), open = list.hidden; list.hidden = !open; e.currentTarget.setAttribute('aria-expanded', String(open)); if (open) list.querySelector('a').focus(); });
  }
  /* Enter starts the main action (Home, lesson cover) when nothing else has focus. */
  document.addEventListener('keydown', e => {
    const go = document.getElementById('ck-go'), a = document.activeElement;
    if (e.key !== 'Enter' || !go || e.altKey || e.metaKey || e.ctrlKey || document.querySelector('.mx')) return;
    if (a && a !== document.body && a.id !== 'main' && a.tagName !== 'H1') return;
    e.preventDefault(); go.click();
  });

  /* ---------- Course: the map ---------- */
  const COURSE_TABS = [['course', 'Overview'], ['part-1', 'Part 01'], ['part-2', 'Part 02'], ['part-3', 'Part 03']];
  function course() {
    const nd = nDone();
    page('course', `<div class="wrap page">${subtabs(COURSE_TABS, 'course', 'Course sections')}
      ${ihead(`${C.length} lessons · ${PARTS.length} parts`, 'Course', 'Three parts, a few short lessons each. Every tick on a dial is one step.', ro('Lessons', pad(C.length), '') + ro('Time', fmtDur(totalMin), '') + ro('Done', pad(nd), `/${pad(C.length)}`))}
      <div class="rows">${PARTS.map((p, i) => { const ls = partLessons(i); return `<a class="prow" href="#part-${i + 1}">${miniDial(ls, pad(i + 1))}<div><h2>${p.name}</h2><p>${p.line}</p></div><span class="cap">${ls.filter(l => status(l) === 'done').length} of ${ls.length}</span>${AR}</a>`; }).join('')}</div>
    </div>`);
  }
  function part(i) {
    const p = PARTS[i], ls = partLessons(i), d = ls.filter(l => status(l) === 'done').length;
    page('course', `<div class="wrap page">${subtabs(COURSE_TABS, `part-${i + 1}`, 'Course sections')}
      ${ihead(`Part ${pad(i + 1)}`, p.name, p.line, ro('Lessons', pad(ls.length), '') + ro('Time', ls.reduce((s, l) => s + l.min, 0), 'min') + ro('Done', pad(d), `/${pad(ls.length)}`))}
      <div class="rows">${ls.map(l => { const s = status(l), inner = `<span class="no num">${pad(l.num)}</span><span class="lt">${esc(l.title)}</span>${strip(l)}<span class="cap">${l.min} min</span><span class="state cap ${s}">${STATUS[s]}</span>`; return s === 'locked' ? `<div class="lrow">${inner}</div>` : `<a class="lrow" href="#intro-${l.num}">${inner}</a>`; }).join('')}</div>
    </div>`);
  }

  /* ---------- Lesson cover ---------- */
  function intro(num) {
    const l = C[num - 1]; if (!l) return course();
    const s = status(l), pi = partOf(l), n = l.steps.length, k = s === 'now' ? step() : 0, lg = lessonGeo(l);
    const to = s === 'done' ? G_END : s === 'now' && ME ? lg[k].tick(3) : G_START;
    const labels = lg.map((g, j) => dialLabel(g.mid, j < litOf(l) ? 'done' : isNowStep(l, j) ? 'now' : '', pad(j + 1))).join('');
    const kinds = [...new Set(l.steps.map(x => KIND[x.kind] || 'Step'))].join(', ');
    const go = s === 'locked' ? `<span class="btn" aria-disabled="true">Unlocks after lesson ${pad(l.num - 1)}</span>`
      : `<a class="btn white" id="ck-go" href="#lesson-${l.num}">${s === 'now' && k ? `Resume step ${pad(k + 1)}` : s === 'done' ? 'Review' : 'Begin'} ${CHEV}</a><span class="cap kbd" aria-hidden="true"><b>↵</b> Enter</span>`;
    const third = s === 'locked' ? ro('Unlocks after', pad(l.num - 1), '', `${esc(C[l.num - 2].title)}${stop(C[l.num - 2].title)}`)
      : s === 'done' ? ro('Complete', pad(n), `/${pad(n)}`, 'Every step done.')
      : ro('Step', pad(k + 1), `/${pad(n)}`, `${esc(l.steps[k].title)}${stop(l.steps[k].title)}`);
    page('course', `<div class="ck">
        <section class="ck-side ck-left" aria-labelledby="ck-h">
          <div class="ck-clock"><a class="cap" href="#part-${pi + 1}">Part ${pad(pi + 1)} · ${PARTS[pi].name}</a></div>
          <h1 id="ck-h">${esc(l.title)}</h1>
          <p class="lead-line">${esc(l.q)}</p>
        </section>
        <section class="ck-gauge" aria-label="Lesson steps">
          ${dialSvg(lg, labels, '', `${n} steps. ${s === 'done' ? 'All complete.' : s === 'now' ? `On step ${k + 1}.` : STATUS[s] + '.'}`)}
          <div class="ck-core"><span class="cap">Lesson</span><span class="gear" aria-hidden="true">${pad(l.num)}</span><p class="ttl">${STATUS[s]}</p></div>
          <div class="ck-ign">${go}</div>
        </section>
        <section class="ck-side ck-right" aria-label="Readouts"><ul class="ro">${ro('Time', pad(l.min), 'min', 'Roughly. Go at your own pace.') + ro('Steps', pad(n), '', `${kinds}.`) + third}</ul></section>
      </div>`, { hideResume: s === 'now' });
    needle(to, lg);
  }

  /* ---------- Toolkit: your cards ---------- */
  let openSlot = 1;
  const cardFields = n => C[n - 1].steps[C[n - 1].steps.length - 1].fields.map((f, i) => [f.label, cards()[n]?.[i] || '']);
  const slotDetail = () => openSlot && cards()[openSlot] ? `<span class="cap">Lesson ${pad(openSlot)} · ${esc(cardName(C[openSlot - 1]))}</span><h2>${esc(C[openSlot - 1].title)}</h2><dl>${cardFields(openSlot).map(([k, v]) => `<div><dt class="cap">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
  function toolkit() {
    const got = n => !!cards()[n]; if (!got(openSlot)) openSlot = +Object.keys(cards())[0] || 0;
    const keys = Object.keys(cards()).map(Number), nc = keys.length, latest = nc ? Math.max(...keys) : 0;
    page('toolkit', `<div class="wrap page">
      ${ihead('Your playbook', 'Toolkit', ME ? 'One card from each lesson, written by you: your own playbook for using AI.' : 'Every lesson ends with a card you write. Sign in to keep yours.', ro('Cards', pad(nc), `/${pad(C.length)}`) + ro('Latest', latest ? pad(latest) : '—', '') + ro('Next', finished() ? '—' : pad(cur().num), ''))}
      <div class="slots" role="group" aria-label="Toolkit cards, one per lesson">${C.map(l => `<button class="slot ${got(l.num) ? 'got' : ''}" data-n="${l.num}" ${got(l.num) ? `aria-pressed="${openSlot === l.num}"` : 'disabled'} aria-label="Lesson ${pad(l.num)}, ${esc(cardName(l))}${got(l.num) ? '' : ', not earned yet'}">${pad(l.num)}<small>${esc(cardName(l))}</small></button>`).join('')}</div>
      <section class="slot-detail" id="slot-detail" aria-live="polite">${slotDetail()}</section>
    </div>`);
    const slots = $$('.slot.got');
    slots.forEach(b => b.addEventListener('click', () => { openSlot = openSlot === +b.dataset.n ? 0 : +b.dataset.n; slots.forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === openSlot))); const d = $('#slot-detail'); d.innerHTML = slotDetail(); d.animate?.([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: reduced ? 0 : 600, easing: 'cubic-bezier(.16,1,.3,1)' }); }));
  }

  /* ---------- Projects ---------- */
  function projects() {
    page('projects', `<div class="wrap page">
      ${ihead('Final project', 'One real task.', 'After lesson 15: take one task from goal to finished result, with AI as a tool.', ro('Stage', '01', '/04') + ro('Unlocks', pad(C.length), '', '') + ro('Lessons left', pad(C.length - nDone()), ''))}
      <div class="stages"><div class="on"><b>Draft</b><p>Only you.</p></div><div><b>Submitted</b><p>Private review.</p></div><div><b>Reviewed</b><p>Feedback to you.</p></div><div><b>Published</b><p>Your choice. Reversible.</p></div></div>
      <p class="footnote">Published projects will appear in a gallery here.</p>
    </div>`);
  }

  /* ---------- About: one page, four sections ---------- */
  function about(anchor) {
    page('about', `<div class="wrap page">
      ${ihead('About', 'AI answers in seconds.', 'Deciding how to work with it still takes a person. LearningAI teaches that.', ro('Lessons', pad(C.length), '') + ro('Time', fmtDur(totalMin), '') + ro('Ages', '13–18', ''))}
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

  /* ---------- Lesson player: one step on screen at a time ----------
     Steps: learn → two choices (feedback on every option, answers can change) → optional detour
     (shown only when the trigger answer calls for it) → make it yours (written work with minimum lengths).
     Answers persist on this device per lesson version; progress events follow PROGRESS-CONTRACT.md
     and never include written text. */
  const KIND = { learn: 'Learn', choice: 'Decide', detour: 'Closer look', transfer: 'Make it yours' };
  const LS = {};
  const META = window.LAI_COURSE_META || {};
  const uuid = () => crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const recKey = l => `learningai:progress:v1:${l.id}:${l.version}`;
  const loadRec = l => { try { const r = JSON.parse(localStorage.getItem(recKey(l))); return r && r.lessonVersion === l.version ? r : null; } catch (e) { return null; } };
  const saveRec = (l, st) => { try { localStorage.setItem(recKey(l), JSON.stringify({ lessonVersion: l.version, attemptId: st.attempt, answers: st.ans, page: st.i, completed: st.done, events: st.ev.slice(-100) })); } catch (e) {} };
  const emit = (l, st, type, activityId = null, payload = {}) => {
    const ev = { schemaVersion: 1, eventId: uuid(), lessonId: l.id, lessonVersion: l.version, activityId, attemptId: st.attempt, type, timestamp: new Date().toISOString(), payload };
    st.ev.push(ev); if (st.ev.length > 100) st.ev.shift();
    window.dispatchEvent(new CustomEvent('learningai:progress', { detail: ev }));
  };
  /* the steps on this learner's path: the detour joins before the last step when its trigger answer isn't the expected one */
  const path = (l, ans) => { const d = l.detour, on = d && ans[d.when.id] != null && ans[d.when.id] !== d.when.notEqual; return on ? [...l.steps.slice(0, -1), d, l.steps[l.steps.length - 1]] : l.steps; };
  const coreIndex = (l, s) => s.kind === 'detour' ? l.steps.length - 2 : l.steps.indexOf(s);
  const fieldOk = (f, v) => { const t = String(v || '').trim(); return t.length >= f.min && t.length <= f.max; };
  const stepDone = (s, ans) => s.kind === 'learn' || (s.kind === 'transfer' ? s.fields.every(f => fieldOk(f, ans[f.id])) : ans[s.id] != null);

  function lesson(num, dir) {
    const l = C[num - 1]; if (!l || status(l) === 'locked') { location.replace(l ? `#intro-${l.num}` : '#course'); return; }
    let st = LS[l.id];
    if (!st) {
      const r = loadRec(l);
      st = LS[l.id] = r ? { attempt: r.attemptId, ans: r.answers || {}, i: r.page || 0, done: !!r.completed, ev: r.events || [] } : { attempt: uuid(), ans: {}, i: ME && l.id === ME.current ? ME.step : 0, done: false, ev: [] };
      emit(l, st, r ? 'resumed' : 'started'); saveRec(l, st);
    }
    const P = path(l, st.ans); st.i = Math.min(st.i, P.length - 1);
    const n = P.length, s = P[st.i], last = st.i === n - 1;
    if (ME && l.id === ME.current) ME.step = coreIndex(l, s);
    const opts = () => s.choices.map((c, j) => `<button class="answer" data-v="${esc(c.value)}" aria-pressed="${st.ans[s.id] === c.value}"><span class="k">${String.fromCharCode(65 + j)}</span><span>${esc(c.text)}</span></button>`).join('');
    const verdict = () => { const v = st.ans[s.id]; if (v == null) return ''; const c = s.choices.find(x => x.value === v), ok = v === s.correct;
      return outcome(ok ? 'Correct' : 'Not quite', `${esc(c.feedback)}${s.rationale ? `<span class="why">${esc(s.rationale)}</span>` : ''}${ok ? '' : '<span class="why">You can change your answer, or continue.</span>'}`); };
    const count = f => { const t = String(st.ans[f.id] || '').trim().length; return t < f.min ? `${t} / ${f.min} characters minimum` : `${t} characters`; };
    const body = {
      learn: () => `<p class="obj">${esc(s.objective)}</p><div class="body"><p>${esc(s.body)}</p></div><div class="case"><span class="cap">The situation</span><p>${esc(s.scenario)}</p></div>`,
      choice: () => `<div class="case"><span class="cap">The situation</span><p>${esc(l.blurb)}</p></div><div class="answers" id="box" role="group" aria-label="Answers">${opts()}</div><div id="o" aria-live="polite">${verdict()}</div>`,
      detour: () => `<div class="body"><p>${esc(s.prompt)}</p></div><div class="answers" id="box" role="group" aria-label="Answers">${opts()}</div><div id="o" aria-live="polite">${verdict()}</div>`,
      transfer: () => `${s.fields.map((f, j) => `<label class="cap field-lbl" for="tf-${j}">${esc(f.label)}</label><textarea id="tf-${j}" data-f="${esc(f.id)}" maxlength="${f.max}" aria-describedby="tc-${j}" placeholder="Your words. Only you see this.">${esc(st.ans[f.id] || '')}</textarea><span class="count cap" id="tc-${j}">${count(f)}</span>`).join('')}
        <div class="rubric"><span class="cap">Self-check</span><ul>${s.rubric.map(r => `<li>${esc(r)}</li>`).join('')}</ul>${s.note ? `<p>${esc(s.note)}</p>` : ''}</div>`
    }[s.kind];

    const view = chrome(); document.getElementById('nav').hidden = true; activeTab = 'lesson';
    view.innerHTML = `
      <header class="lbar"><div class="wrap lbar-in"><a class="ulink plain rev" href="#intro-${l.num}">${AR}<span>Exit</span></a><span class="cap t">${pad(l.num)} · ${esc(l.title)}</span><span class="r cap"><i aria-hidden="true"></i>Saved on this device</span></div>
        <div class="lstrip wrap" role="img" aria-label="Step ${st.i + 1} of ${n}">${P.map((_, j) => `<i class="${j < st.i ? 'on' : j === st.i ? 'now' : ''}"></i>`).join('')}</div></header>
      <main id="main" class="lesson">
        <div class="lstep"><span class="v num">${pad(st.i + 1)}<small>/${pad(n)}</small></span><span class="cap">${KIND[s.kind]}</span></div>
        <h1 id="step-h" tabindex="-1">${esc(s.title)}</h1>
        ${body()}
        <div class="lfoot"><button class="ulink plain rev" id="prev" ${st.i === 0 ? 'disabled' : ''}>${AR}<span>Back</span></button><button class="btn white" id="next">${last ? 'Finish' : 'Continue'} ${CHEV}</button></div>
        <p class="cap need" id="need" aria-live="polite"></p>
      </main>`;
    animateIn($('#main'), dir);
    const next = $('#next'), need = $('#need');
    const gate = () => { const ok = stepDone(s, st.ans); next.setAttribute('aria-disabled', String(!ok)); need.textContent = ok ? '' : s.kind === 'transfer' ? 'Reach the minimum length in each box to finish.' : 'Pick an answer to continue.'; };
    gate();
    const go = d => { st.i = Math.min(n - 1, Math.max(0, st.i + d)); saveRec(l, st); emit(l, st, 'page_changed', null, { page: path(l, st.ans)[st.i].id }); lesson(num, d > 0 ? 'next' : 'back'); scrollTo(0, 0); document.getElementById('step-h').focus(); };
    $('#prev').addEventListener('click', () => go(-1));
    next.addEventListener('click', () => {
      if (!stepDone(s, st.ans)) { gate(); (s.kind === 'transfer' ? $$('[data-f]').find(t => !fieldOk(s.fields.find(f => f.id === t.dataset.f), t.value)) : $('.answer'))?.focus(); return; }
      if (!last) return go(1);
      /* completion: every required item on this path is answered; wrong answers still count (formative) */
      const gap = P.findIndex(x => !stepDone(x, st.ans));
      if (gap >= 0) { st.i = gap; saveRec(l, st); lesson(num, 'back'); $('#need').textContent = 'One step still needs an answer before you can finish.'; document.getElementById('step-h').focus(); return; }
      const core = l.steps.filter(x => x.kind === 'choice');
      if (!st.done) { st.done = true; emit(l, st, 'completed', null, { score: core.filter(x => st.ans[x.id] === x.correct).length, maxScore: core.length, reflectionSubmitted: true }); }
      saveRec(l, st);
      if (!ME) { location.hash = '#join'; return; }
      ME.cards = ME.cards || {}; ME.cards[l.num] = s.fields.map(f => st.ans[f.id].trim());
      if (!ME.done.includes(l.id)) ME.done.push(l.id);
      const nx = C[num]; if (l.id === ME.current && nx) { ME.current = nx.id; ME.step = 0; }
      location.hash = nx ? `#intro-${nx.num}` : '#home';
    });
    $$('#box .answer').forEach(b => b.addEventListener('click', () => {
      st.ans[s.id] = b.dataset.v; saveRec(l, st);
      emit(l, st, 'answered', s.id, { answered: true, correct: b.dataset.v === s.correct });
      /* changing the trigger answer can add or remove the detour; drop answers on a removed detour */
      if (l.detour && s.id === l.detour.when.id && !path(l, st.ans).includes(l.detour)) delete st.ans[l.detour.id];
      $$('#box .answer').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('#o').innerHTML = verdict(); $('#o').firstChild?.focus(); gate();
      $('#main .lstrip, .lstrip') && (document.querySelector('.lstrip').innerHTML = path(l, st.ans).map((_, j) => `<i class="${j < st.i ? 'on' : j === st.i ? 'now' : ''}"></i>`).join(''));
      document.querySelector('.lstep .v small').textContent = `/${pad(path(l, st.ans).length)}`;
    }));
    let typing;
    $$('[data-f]').forEach((t, j) => t.addEventListener('input', () => {
      const f = s.fields[j]; st.ans[f.id] = t.value; $(`#tc-${j}`).textContent = count(f); gate();
      clearTimeout(typing); typing = setTimeout(() => { saveRec(l, st); emit(l, st, 'answered', f.id, { answered: fieldOk(f, t.value) }); }, 600);
    }));
  }

  /* ---------- Sign in, join, reset: separate full pages without the site header ---------- */
  function authShell(title, line, form, note = '') {
    page('', `<div class="auth-top wrap"><a class="mark" href="#home" aria-label="LearningAI home">LearningAI</a><a class="ulink plain rev" href="#home">${AR}<span>Back</span></a></div>
      <section class="auth">
      <div class="auth-l"><div><h1>${title}</h1><p>${line}</p><div class="auth-dial">${miniDial(C, pad(cur().num))}</div></div>${note ? `<span class="cap dim">${note}</span>` : '<span></span>'}</div>
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
      ME = { id: 'joined', name: $('#nm').value.trim(), email: $('#em').value.trim(), done: [], current: C[0].id, step: 0, cards: {} };
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
        + row('Email', `<b>${esc(ME.email)}</b>`) + row('Password', 'Last changed: never', '<a class="btn sm" href="#forgot">Change</a>') + row('Session', `Signed in as ${esc(ME.name)} on this device`, '<button class="btn sm" id="so">Sign out</button>')
        + row('Progress', 'Clear your lessons and answers on this device and begin again at lesson 01.', '<button class="btn sm" id="reset">Start over</button>', 'reset-v'),
      'account-prefs': row('Text size', 'Larger text across every page.', choice('text', [['std', 'Standard'], ['lg', 'Large']])) + row('Motion', 'Reduced turns off page and menu animations.', choice('motion', [['full', 'Full'], ['calm', 'Reduced']])),
      'account-privacy': row('What we store', 'Your name, email, lessons finished, and the cards you write. <b>Never</b> your chats with outside AI tools.')
        + row('Who sees it', 'Only you. Projects stay private unless you publish them.') + row('Your data', 'A copy of everything we store about you.', '<button class="btn sm" id="dl">Request copy</button>')
        + row('Delete account', 'Removes your progress and cards permanently.', '<button class="btn sm danger" id="del">Delete</button>', 'del-v')
    }[tab];
    const nc = Object.keys(cards()).length, mins = C.filter(l => ME.done.includes(l.id)).reduce((s, l) => s + l.min, 0);
    page('account', `<div class="wrap page">${subtabs(SET_TABS, tab, 'Settings sections')}
      ${ihead('Settings', esc(ME.name), esc(ME.email), ro('Lessons', pad(nDone()), `/${pad(C.length)}`) + ro('Cards', pad(nc), '') + ro('Time in', pad(mins), 'min'))}<div>${rows}</div><div id="out" aria-live="polite"></div></div>`);
    const out = $('#out');
    $('#nm')?.addEventListener('input', e => { ME.name = e.target.value.trim() || 'there'; $('#nm-s').textContent = 'Saved'; clearTimeout(nameTimer); nameTimer = setTimeout(() => { const x = $('#nm-s'); if (x) x.textContent = ''; }, 1400); });
    $('#so')?.addEventListener('click', () => { signOut(); location.hash = '#home'; });
    $$('[data-pref]').forEach(b => b.addEventListener('click', () => { PREFS[b.dataset.pref] = b.dataset.v; applyPrefs(); pressOne($$(`[data-pref="${b.dataset.pref}"]`), b); }));
    $('#reset')?.addEventListener('click', e => {
      const b = e.currentTarget, v = $('#reset-v');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirm'; v.innerHTML = '<b>Start over?</b> Your finished lessons and written answers on this device will be cleared.'; return b.focus(); }
      Object.assign(ME, { done: [], current: C[0].id, step: 0, cards: {} });
      Object.keys(LS).forEach(k => delete LS[k]);
      try { Object.keys(localStorage).filter(k => k.startsWith('learningai:progress:')).forEach(k => localStorage.removeItem(k)); } catch (err) {}
      location.hash = '#home';
    });
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
