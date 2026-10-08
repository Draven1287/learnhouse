/* LearningAI: Home, Lessons, Progress, Projects, About, and a focused lesson view.
   Course content comes from course.js (the real 15-lesson catalogue). */
(function () {
  const C = window.LAI_COURSE;
  const root = document.getElementById('root'), live = document.getElementById('live');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const hm = m => `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
  const say = m => { live.textContent = ''; setTimeout(() => live.textContent = m, 30); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AR = '<span class="ar" aria-hidden="true"></span>';

  const PARTS = [
    { name: 'First Contact', line: 'What AI is actually doing when it answers you.' },
    { name: 'How It Works', line: 'Why it can sound certain and still be wrong.' },
    { name: 'Talking to AI', line: 'Use it on one real task, and keep the final call.' }
  ];
  const partLessons = i => C.filter(l => l.arc === PARTS[i].name);
  const totalMin = C.reduce((s, l) => s + l.min, 0);

  /* Sample learner for signed-in views: lesson 1 finished, lesson 2 stopped at step 3. */
  const ME = { name: 'Sam', email: 'sam@example.com', done: ['chapter-1'], current: 'chapter-2', step: 2, signedIn: true };
  const PREFS = { text: 'std', motion: 'full' };
  const applyPrefs = () => { document.documentElement.classList.toggle('text-lg', PREFS.text === 'lg'); document.documentElement.classList.toggle('calm', PREFS.motion === 'calm'); };
  const status = l => ME.done.includes(l.id) ? 'done' : l.id === ME.current ? 'now' : 'locked';
  const curL = C.find(l => l.id === ME.current);
  const minsLeft = Math.max(2, Math.round(curL.min * (1 - ME.step / curL.steps.length)));

  /* ---------- chrome ---------- */
  const TABS = [['course', 'Course'], ['progress', 'Progress'], ['toolkit', 'Toolkit'], ['projects', 'Projects'], ['about', 'About']];
  const CHEV = '<span class="chev" aria-hidden="true">›</span>';
  const nav = () => `<header class="nav" id="nav"><div class="wrap nav-in">
      <button class="menu-trigger" id="menu" aria-expanded="false" aria-haspopup="dialog"><i aria-hidden="true"></i><span>Menu</span><span class="vh">Open menu</span></button>
      <a class="mark" href="#home" aria-label="LearningAI home">LearningAI</a>
      <a class="nav-ctx" href="#intro-${curL.num}" aria-label="Resume lesson ${pad(curL.num)}"><span class="t">Resume ${pad(curL.num)}</span><span class="ar" aria-hidden="true"></span></a>
      <nav class="links" aria-hidden="true"></nav>
    </div></header>`;
  const foot = () => `<footer><div class="wrap foot"><span class="mark" style="font-size:11px">LearningAI</span><span class="cap dim">Free · Ages 13–18</span></div></footer>`;
  const subtabs = (items, cur, label) => `<nav class="subtabs" aria-label="${label}">${items.map(([k, t]) => `<a href="#${k}" ${cur === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
  let activeTab = '';
  function chrome() {
    if (!document.getElementById('nav')) {
      root.innerHTML = `${nav()}<div id="view"></div>`;
      document.getElementById('menu').addEventListener('click', openMenu);
      window.onscroll = () => { document.getElementById('nav').classList.toggle('solid', scrollY > 40 || activeTab !== 'home'); window.__scrollFx?.(); };
    }
    return document.getElementById('view');
  }
  function page(active, body, opts = {}) {
    const view = chrome(), n = document.getElementById('nav');
    activeTab = active; n.hidden = false;
    const ctx = n.querySelector('.nav-ctx'); if (ctx) { const hide = active === 'home'; ctx.style.visibility = hide ? 'hidden' : ''; hide ? ctx.setAttribute('tabindex', '-1') : ctx.removeAttribute('tabindex'); }
    n.querySelectorAll('[data-tab]').forEach(a => a.dataset.tab === active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    n.classList.toggle('solid', scrollY > 40 || active !== 'home');
    const label = { course: 'Course', progress: 'Progress', toolkit: 'Toolkit', projects: 'Projects', about: 'About' }[active] || 'LearningAI';
    view.innerHTML = `<main id="main" tabindex="-1">${/<h1[\s>]/.test(body) ? '' : `<h1 class="vh">${label}</h1>`}${body}</main>${opts.noFoot ? '' : foot()}`;
    animateIn(document.getElementById('main'));
  }
  function openMenu() {
    const btn = document.getElementById('menu');
    clearTimeout(window.__mxT); document.querySelectorAll('.mx').forEach(x => x.remove());
    const items = [['home', 'Home'], ...TABS];
    const cards = [
      { href: `#intro-${curL.num}`, shape: 'sphere', cap: `Continue · step ${ME.step + 1} of ${curL.steps.length}`, t: `${pad(curL.num)} ${curL.title}`, lead: true },
      ...PARTS.map((p, i) => ({ href: `#part-${i + 1}`, shape: ['rings', 'torus', 'helix'][i], cap: `Part ${pad(i + 1)} · ${partLessons(i).length} lessons`, t: p.name }))
    ];
    const w = document.createElement('div'); w.className = 'mx'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Menu');
    w.innerHTML = `<div class="mx-curtain"></div><div class="mx-in wrap">
      <div class="mx-top"><button class="mx-close" id="close"><i aria-hidden="true"></i><span>Close</span></button><span class="mark">LearningAI</span><span></span></div>
      <div class="mx-grid">
        <nav class="mx-words" aria-label="Menu">${items.map(([k, t], i) => `<a href="#${k}" style="--d:${200 + i * 70}ms" ${k === activeTab ? 'aria-current="page"' : ''}>${t}<small aria-hidden="true">${pad(i + 1)}</small></a>`).join('')}</nav>
        <div class="mx-box" aria-label="Shortcuts">${cards.map((c, i) => `<a class="mx-card ${c.lead ? 'lead' : ''}" href="${c.href}" style="--d:${420 + i * 80}ms"><span class="art"><canvas data-shape="${c.shape}" aria-hidden="true"></canvas></span><span><span class="cap">${esc(c.cap)}</span><b>${esc(c.t)}</b></span><span class="ar" aria-hidden="true" style="display:inline-block;width:18px;height:1px;background:currentColor"></span></a>`).join('')}</div>
      </div>
      <div class="mx-foot"><nav aria-label="More">${[ME.signedIn ? ['account', 'Settings'] : ['signin', 'Sign in'], ['parents', 'Parents'], ['teachers', 'Teachers'], ['faq', 'FAQ']].map(([k, t]) => `<a class="cap" href="#${k}">${t}</a>`).join('')}</nav><span class="cap dim">Free · Ages 13–18</span></div>
    </div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden'; root.inert = true; btn?.setAttribute('aria-expanded', 'true');
    w.querySelectorAll('canvas[data-shape]').forEach(c => turntable(c, c.dataset.shape));
    const show = () => w.classList.add('open'); requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80);
    const close = () => { if (w.classList.contains('closing')) return; w.classList.add('closing'); root.inert = false; btn?.setAttribute('aria-expanded', 'false'); window.__mxT = setTimeout(() => { w.remove(); document.body.style.overflow = ''; }, reduced ? 0 : 600); btn?.focus(); };
    w.querySelector('#close').addEventListener('click', close);
    w.querySelectorAll('a').forEach(x => x.addEventListener('click', close));
    w.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const f = [...w.querySelectorAll('button, a')].filter(x => x.offsetParent); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
    w.querySelector('#close').focus();
  }

  /* ---------- motion: staged reveal after every render ---------- */
  const REVEAL = '.one-l .lead-line, .one-l .ctas, .bignum, .stage-num .cap, .readouts3 a, .auth-l > *, .form > *, .set-row, .panel .cap, .panel .sub, .panel .ctas, .panel .resume, .panel .minispecs, .page-h > :not(h1), .subtabs, .specs > div, .prow, .lrow, .stages > div, .gauge, .readouts > div, .acts-row, .slots, .slot-detail, .lede, .short li, .faq details, .empty, .intro > :not(h1), .lesson > :not(h1)';
  function animateIn(scope, dir) {
    if (!scope) return;
    scope.querySelectorAll('h1').forEach(h => h.setAttribute('tabindex', '-1'));
    scope.querySelectorAll('h1, .panel h2').forEach((h, n) => { h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map((x, i) => `<span class="mask"><span style="transition-delay:${40 + (n + i) * 90}ms">${x}</span></span>`).join(''); });
    let i = 0; scope.querySelectorAll(REVEAL).forEach(e => { if (e.classList.contains('horizon')) { e.classList.add('draw'); return; } e.classList.add('rv'); e.style.setProperty('--d', `${200 + Math.min(i++, 7) * 45}ms`); });
    scope.querySelectorAll('.tk').forEach((t, k) => t.style.setProperty('--d', `${400 + k * 70}ms`));
    if (dir) scope.dataset.dir = dir;
    if (scope.querySelector('.panel')) return; // panels reveal themselves as they scroll into view
    if (reduced) { scope.classList.add('in'); return; }
    const show = () => scope.classList.add('in');
    requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 80); // timer fallback if frames are paused
  }

  /* ---------- Home: one screen ---------- */
  /* ---------- turntable: a slowly rotating object made of points, one per panel ---------- */
  function shapePoints(kind) {
    const P = [];
    if (kind === 'sphere') { const N = 1100; for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), t = i * 2.39996; P.push([Math.cos(t) * r, y, Math.sin(t) * r]); } }
    if (kind === 'rings') { for (const [ox, rot] of [[-.42, 0], [.42, 1]]) for (let i = 0; i < 420; i++) { const a = i / 420 * Math.PI * 2, j = (i % 7) / 7 * .06; const x = Math.cos(a) * (.78 + j), y = Math.sin(a) * (.78 + j); P.push(rot ? [x + ox, 0, y] : [x + ox, y, 0]); } }
    if (kind === 'torus') { for (let i = 0; i < 48; i++) for (let k = 0; k < 22; k++) { const u = i / 48 * Math.PI * 2, v = k / 22 * Math.PI * 2; P.push([(1 + .38 * Math.cos(v)) * Math.cos(u) * .82, .38 * Math.sin(v) * .82, (1 + .38 * Math.cos(v)) * Math.sin(u) * .82]); } }
    if (kind === 'helix') { for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < 520; i++) { const t = i / 520, a = t * Math.PI * 6 + s2 * Math.PI; P.push([Math.cos(a) * .45, (t - .5) * 2.1, Math.sin(a) * .45]); if (i % 26 === 0 && s2 === 0) for (let k = 1; k < 10; k++) { const f = k / 10; P.push([Math.cos(a) * .45 * (1 - 2 * f), (t - .5) * 2.1, Math.sin(a) * .45 * (1 - 2 * f)]); } } }
    return P;
  }
  function turntable(canvas, kind, cxf = .5) {
    const g = canvas.getContext('2d'), pts = shapePoints(kind); let W, H, t = Math.random() * 6, last = 0, visible = true;
    const size = () => { const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); draw(); };
    function draw() {
      if (!W) return; g.clearRect(0, 0, W, H);
      const S = Math.min(W, H) * (W < 640 ? .3 : cxf !== .5 ? .32 : .22), cx = W * (W < 760 ? .5 : cxf), cy = H * (cxf !== .5 ? (W < 760 ? .36 : .5) : .6), ry = t * .16, rx = .38 + Math.sin(t * .1) * .05;
      const cy1 = Math.cos(ry), sy1 = Math.sin(ry), cx1 = Math.cos(rx), sx1 = Math.sin(rx);
      for (const [x0, y0, z0] of pts) {
        const x1 = x0 * cy1 + z0 * sy1, z1 = -x0 * sy1 + z0 * cy1;
        const y2 = y0 * cx1 - z1 * sx1, z2 = y0 * sx1 + z1 * cx1;
        const p = 3.2 / (3.2 + z2), depth = (1 - z2) / 2;
        g.fillStyle = `rgba(244,244,242,${.12 + .7 * depth})`;
        const r = (.5 + 1.1 * depth) * (S / 260);
        g.beginPath(); g.arc(cx + x1 * S * p, cy + y2 * S * p, Math.max(.4, r), 0, 6.283); g.fill();
      }
    }
    function loop(ts) { if (!canvas.isConnected) return; if (visible) { t += Math.min(.05, (ts - last) / 1000 || 0); draw(); } last = ts; requestAnimationFrame(loop); }
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(e => visible = e[0].isIntersecting).observe(canvas);
    size(); if (!reduced) requestAnimationFrame(ts => { last = ts; loop(ts); });
  }

  /* ---------- Home: personal when you're returning, a calm introduction when you're new ---------- */
  function home() {
    const isNew = !ME.done.length && !ME.step;
    const h = new Date().getHours(), part = PARTS.findIndex(p => p.name === curL.arc), pls = partLessons(part);
    const left = C.filter(l => status(l) !== 'done').reduce((s, l) => s + l.min, 0) - (curL.min - minsLeft);
    const rule = CARDS[1]?.[3]?.[1];
    const greet = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const readouts = isNew
      ? [['#course', 'Lessons', '15'], ['#course', 'In total', `${Math.floor(totalMin / 60)} h ${pad(totalMin % 60)}`], ['#about', 'Cost', 'Free']]
      : [['#toolkit', 'Your rule', rule ? `The final decision belongs to ${rule.replace(/\.$/, '').toLowerCase() === 'me' ? 'me' : rule}.` : 'Your first card'],
         [`#part-${part + 1}`, `Part ${pad(part + 1)} · ${PARTS[part].name}`, `${pls.filter(l => status(l) === 'done').length} of ${pls.length}`],
         ['#progress', 'Time left', `${Math.floor(left / 60)} h ${pad(left % 60)}`]];
    page('home', `<section class="one me" aria-labelledby="one-h">
        <div class="one-l">
          ${isNew ? `<h1 id="one-h">Use AI.<br>Stay in control.</h1><p class="lead-line">Fifteen short lessons on keeping your own judgment. Free, for ages 13 to 18.</p>
            <div class="ctas"><a class="btn white" href="#intro-1">Begin ${CHEV}</a><a class="ulink" href="#course">The course</a></div>`
          : `<h1 id="one-h">${greet},<br>${esc(ME.name)}.</h1><p class="lead-line"><span class="vh">Lesson ${pad(curL.num)} of 15, ${ME.done.length} complete. </span>You stopped at step ${ME.step + 1} of <em>${esc(curL.title)}</em>. About ${minsLeft} minutes to finish.</p>
            <div class="ctas"><a class="btn white" href="#lesson-${curL.num}">Resume ${CHEV}</a><a class="ulink" href="#course">All lessons</a></div>`}
        </div>
        <div class="one-r stage-num" aria-hidden="true">
          <div class="bignum num">${pad(isNew ? 1 : curL.num)}</div>
          <div class="ticks">${PARTS.map((_, pi) => `<span class="grp">${partLessons(pi).map(l => { const st = status(l); return `<i class="${st === 'done' ? 'd' : st === 'now' && !isNew ? 'n' : ''}" style="--d:${300 + (l.num - 1) * 45}ms"></i>`; }).join('')}</span>`).join('')}</div>
          <span class="cap">Lesson ${pad(isNew ? 1 : curL.num)} of 15 · ${(isNew ? PARTS[0] : PARTS[part]).name}</span>
        </div>
        <nav class="one-b readouts3" aria-label="${isNew ? 'Course at a glance' : 'Your progress'}">
          ${readouts.map(([href, k, v]) => `<a href="${href}"><span class="cap">${esc(k)}</span><b>${esc(v)}</b><span class="ar" aria-hidden="true"></span></a>`).join('')}
        </nav>
      </section>`, { noFoot: true });
  }

  /* ---------- Course: overview + one sub-tab per part ---------- */
  const COURSE_TABS = [['course', 'Overview'], ['part-1', 'Part 01'], ['part-2', 'Part 02'], ['part-3', 'Part 03']];
  function course() {
    page('course', `<div class="wrap page tight">
      ${subtabs(COURSE_TABS, 'course', 'Course sections')}
      <div class="specs" role="list" aria-label="Course specifications" style="border-top:0">
        <div role="listitem"><b class="num">15</b><span class="cap">Lessons</span></div>
        <div role="listitem"><b class="num">${Math.floor(totalMin / 60)}<small>H</small> ${pad(totalMin % 60)}<small>M</small></b><span class="cap">Total</span></div>
        <div role="listitem"><b class="num">03</b><span class="cap">Parts</span></div>
        <div role="listitem"><b class="num">Free</b><span class="cap">Cost</span></div>
      </div>
      <div class="parts" style="margin-top:96px">${PARTS.map((p, i) => `<a class="prow" href="#part-${i + 1}"><span class="no num">${pad(i + 1)}</span><div><h2 style="font-size:clamp(22px,2.6vw,34px)">${p.name}</h2></div><span class="meta cap">${partLessons(i).length} lessons</span><span class="go link" aria-hidden="true">${AR}</span></a>`).join('')}</div>
    </div>`);
  }
  function part(i) {
    const p = PARTS[i], ls = partLessons(i);
    page('course', `<div class="wrap page tight">
      ${subtabs(COURSE_TABS, `part-${i + 1}`, 'Course sections')}
      <div class="page-h min"><span class="cap">Part ${pad(i + 1)}</span><h1>${p.name}</h1><p>${p.line}</p></div>
      <div style="border-top:1px solid var(--line)">${ls.map(l => { const s = status(l); const inner = `<span class="no num">${pad(l.num)}</span><span class="lt">${esc(l.title)}</span><span class="min cap">${l.min} min</span><span class="state cap ${s}"><i aria-hidden="true"></i>${s === 'done' ? 'Complete' : s === 'now' ? 'In progress' : 'Locked'}</span>`; return s === 'locked' ? `<div class="lrow">${inner}</div>` : `<a class="lrow" href="#intro-${l.num}">${inner}</a>`; }).join('')}</div>
      ${i < 2 ? `<div class="acts-row"><a class="link" href="#part-${i + 2}">Part ${pad(i + 2)} · ${PARTS[i + 1].name} ${AR}</a></div>` : ''}
    </div>`);
  }

  /* ---------- Lesson intro: one cover page per lesson ---------- */
  function intro(num) {
    const l = C[num - 1]; if (!l) return course();
    const s = status(l), pi = PARTS.findIndex(p => p.name === l.arc);
    page('course', `<div class="wrap intro">
      <span class="big num" aria-hidden="true">${pad(l.num)}</span>
      <h1>${esc(l.title)}</h1>
      <p class="q">${esc(l.q)}</p>
      <div class="meta cap"><span>Part ${pad(pi + 1)}</span><span>${l.min} min</span><span>${l.steps.length} steps</span>${s === 'done' ? '<span style="color:var(--text)">Complete</span>' : ''}</div>
      <div class="acts">${s === 'locked' ? `<span class="btn" aria-disabled="true">Unlocks after lesson ${pad(l.num - 1)}</span>` : `<a class="btn white" href="#lesson-${l.num}">${s === 'now' ? `Resume step ${ME.step + 1}` : s === 'done' ? 'Review' : 'Begin'}</a>`}<a class="btn" href="#part-${pi + 1}">Part ${pad(pi + 1)}</a></div>
    </div>`, { noFoot: true });
  }

  /* ---------- Progress ---------- */
  function progress() {
    const done = ME.done.length, R = 160, cx = 190, cy = 190, a0 = 135, sweep = 270;
    const pt = (deg, r) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
    const ticks = C.map((l, i) => { const deg = a0 + sweep * i / 14, [x1, y1] = pt(deg, R - 18), [x2, y2] = pt(deg, R); const s = status(l); return `<line class="tk" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s === 'locked' ? '#666' : '#F4F4F2'}" stroke-width="${s === 'locked' ? 1.5 : 2.5}" ${s === 'now' ? 'stroke-dasharray="3 3"' : ''}/>`; }).join('');
    const arc = (from, to, r) => { const [x1, y1] = pt(from, r), [x2, y2] = pt(to, r); return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
    const left = C.filter(l => status(l) !== 'done').reduce((s, l) => s + l.min, 0) - (curL.min - minsLeft);
    page('progress', `<div class="wrap page tight">
      <div class="gauge-row">
        <div class="gauge"><svg viewBox="0 0 380 380" role="img" aria-label="${done} of 15 lessons complete"><path d="${arc(a0, a0 + sweep, R + 12)}" fill="none" stroke="#222" stroke-width="1"/><path d="${arc(a0, a0 + sweep * done / 15, R + 12)}" fill="none" stroke="#F4F4F2" stroke-width="1"/>${ticks}</svg>
          <div class="read"><b class="num">${pad(done)}</b><span class="cap" style="margin-top:12px">of 15</span></div></div>
        <div>
          <div class="readouts">
            <div><span class="cap">Current</span><b>${pad(curL.num)}.${ME.step + 1}</b></div>
            <div><span class="cap">Remaining</span><b class="num">${hm(left)}</b></div>
          </div>
          <div class="acts-row"><a class="btn white" href="#lesson-${curL.num}">Resume</a></div>
        </div>
      </div>
    </div>`);
  }

  /* ---------- Toolkit: fifteen slots ---------- */
  let openSlot = 1;
  const l1 = C[0].steps.find(s => s.kind === 'toolkitSave');
  const CARDS = { 1: (l1?.fields || []).map((f, i) => [f.label, ['Comparing options and checking my own writing', 'Names, addresses, and anything about my friends', 'Any fact I would repeat to someone else', 'Me.'][i] || '']) };
  const detail = () => openSlot && CARDS[openSlot] ? `<span class="cap">Lesson ${pad(openSlot)} · ${esc(cardName(C[openSlot - 1]))}</span><h2>${esc(C[openSlot - 1].title)}</h2><dl>${CARDS[openSlot].map(([k, v]) => `<div><dt class="cap">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
  const cardName = l => l.steps.find(x => x.kind === 'toolkitSave')?.cardType || 'Card';
  function toolkit() {
    const got = n => !!CARDS[n];
    page('toolkit', `<div class="wrap page tight">
      <div class="page-h min"><span class="cap">${Object.keys(CARDS).length} of 15 kept</span><h1>Toolkit</h1><p>Every lesson ends with one card you fill in yourself: a rule, a check, a prompt frame. Fifteen cards become your own playbook for using AI in real life.</p></div>
      <div class="slots" role="group" aria-label="Toolkit cards, one per lesson">${C.map(l => `<button class="slot ${got(l.num) ? 'got' : ''}" data-n="${l.num}" ${got(l.num) ? `aria-pressed="${openSlot === l.num}"` : 'disabled'} aria-label="Lesson ${pad(l.num)}, ${esc(cardName(l))}${got(l.num) ? '' : ', not earned yet'}">${pad(l.num)}<small>${esc(cardName(l))}</small></button>`).join('')}</div>
      <section class="slot-detail" id="slot-detail" aria-live="polite">${detail()}</section>
    </div>`);
    root.querySelectorAll('.slot.got').forEach(b => b.addEventListener('click', () => { openSlot = openSlot === +b.dataset.n ? 0 : +b.dataset.n; root.querySelectorAll('.slot.got').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === openSlot))); const d = root.querySelector('#slot-detail'); d.innerHTML = detail(); d.animate?.([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: reduced ? 0 : 600, easing: 'cubic-bezier(.16,1,.3,1)' }); }));
  }

  /* ---------- Projects ---------- */
  const PROJ_TABS = [['projects', 'Your project'], ['gallery', 'Gallery']];
  function projects() {
    page('projects', `<div class="wrap page tight">
      ${subtabs(PROJ_TABS, 'projects', 'Projects sections')}
      <div class="page-h min"><span class="cap">Unlocks after lesson 15</span><h1>One real task.</h1><p>Use AI on something that matters, and keep the decision yours.</p></div>
      <div class="stages"><div class="on"><b>Draft</b><p>Only you.</p></div><div><b>Submitted</b><p>Private review.</p></div><div><b>Reviewed</b><p>Feedback to you.</p></div><div><b>Published</b><p>Your choice. Reversible.</p></div></div>
    </div>`);
  }
  function gallery() {
    page('projects', `<div class="wrap page tight">
      ${subtabs(PROJ_TABS, 'gallery', 'Projects sections')}
      <div class="empty">Shared projects appear here when their authors choose to publish.</div>
    </div>`);
  }

  /* ---------- About ---------- */
  const ABOUT_TABS = [['about', 'Mission'], ['parents', 'Parents'], ['teachers', 'Teachers'], ['faq', 'FAQ']];
  function about() {
    page('about', `<div class="wrap page tight">${subtabs(ABOUT_TABS, 'about', 'About sections')}
      <p class="lede">AI answers in seconds. <span>Deciding how to work with it still takes a person. LearningAI teaches that, in fifteen short lessons.</span></p></div>`);
  }
  const list = (cur, items) => page('about', `<div class="wrap page tight">${subtabs(ABOUT_TABS, cur, 'About sections')}<ul class="short">${items.map((t, i) => `<li><span class="cap">${pad(i + 1)}</span><span>${t}</span></li>`).join('')}</ul></div>`);
  const parents = () => list('parents', ['Lesson 01 needs no account.', 'Students use invented examples, never real names, addresses or passwords.', 'No outside AI accounts or subscriptions.']);
  const teachers = () => list('teachers', ['Fifteen lessons of about fifteen minutes.', 'Each opens with a decision and ends with a card students keep.', 'No streaks, timers or leaderboards.']);
  function faq() {
    page('about', `<div class="wrap page tight">${subtabs(ABOUT_TABS, 'faq', 'About sections')}<div class="faq">
      <details><summary>Do students need an AI account?</summary><p>No. Every lesson works inside the site.</p></details>
      <details><summary>How is progress saved?</summary><p>Lesson 01 stays on your device. A free account saves the rest.</p></details>
      <details><summary>Is this about AI for homework?</summary><p>It is about keeping your judgment when you use AI.</p></details>
      <details><summary>Who is it for?</summary><p>Ages 13 to 18, and anyone who wants a clear start.</p></details>
    </div></div>`);
  }

  /* ---------- Lesson view: one thing on screen at a time ---------- */
  const LS = {}; // per-lesson step state
  function lesson(num, dir) {
    const l = C[num - 1]; if (!l || status(l) === 'locked') { location.replace(l ? `#intro-${l.num}` : '#course'); return; }
    const st = LS[l.id] || (LS[l.id] = { i: l.id === ME.current ? ME.step : 0, a: {} });
    const n = l.steps.length, s = l.steps[st.i], a = st.a[st.i] || (st.a[st.i] = {});
    const kind = { coldOpen: 'Scenario', classify: 'Sort', reveal: 'Explanation', compare: 'Compare', workflowChain: 'Sequence', toolkitSave: 'Keep', exitCheck: 'Final check' }[s.kind] || 'Step';
    const paras = t => String(t || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('');
    let body = '';
    if (s.kind === 'coldOpen') body = `<div class="body">${paras(s.scenario)}</div><p class="prompt">${esc(s.prompt)}</p><label class="vh" for="first">Your first thought</label><textarea id="first" placeholder="Your first thought. Only you see this.">${esc(a.text || '')}</textarea>`;
    else if (s.kind === 'reveal') body = `<div class="body">${paras(s.body)}</div>${s.mistake || s.good ? `<div class="pairs">${s.mistake ? `<div><span class="cap">Common mistake</span><p>${esc(s.mistake)}</p></div>` : ''}${s.good ? `<div><span class="cap" style="color:var(--text)">Better move</span><p>${esc(s.good)}</p></div>` : ''}</div>` : ''}`;
    else if (s.kind === 'classify') body = `<div class="body"><p>${esc(s.prompt)}</p></div><div class="convo" aria-label="Example"><div><span class="cap">You</span><p>When does the last bus home leave tonight?</p></div><div><span class="cap">Assistant</span><p>The last bus leaves at 10:40 pm.</p></div></div><ul class="jobs" id="jobs"></ul><div id="cls-out"></div>`;
    else if (s.kind === 'exitCheck') body = `<div class="body"><p>${esc(s.question)}</p></div><div class="answers" id="answers"></div><div id="ex-out"></div>`;
    else if (s.kind === 'toolkitSave') body = `<div class="body"><p>This card is saved to your toolkit. Short answers are fine.</p></div>${(s.fields || []).map(f => `<label class="cap" for="f-${esc(f.key)}" style="display:block;margin-top:36px">${esc(f.label)}</label><textarea id="f-${esc(f.key)}" data-k="${esc(f.key)}" style="min-height:60px;margin-top:4px" placeholder="${esc(f.placeholder || '')}">${esc((a.v || {})[f.key] || '')}</textarea>`).join('')}`;
    else if (s.kind === 'workflowChain') body = `<div class="body"><p>${esc(s.goal)}</p><p class="muted">Select the steps in the safest order.</p></div><div class="answers" id="chain"></div><div id="ch-out"></div>`;
    else if (s.kind === 'compare') body = `<div class="body"><p>Two ways to ask. Which gives the better answer?</p></div><div class="answers" id="cmp"></div><div id="cmp-out"></div>`;
    else if (s.kind === 'verify') body = `<div class="convo"><div><span class="cap">Claim</span><p>${esc(s.claim)}</p></div></div><ol class="short" style="margin-top:40px">${(s.steps || []).map((x, i) => `<li><span class="cap">${pad(i + 1)}</span><span>${esc(typeof x === 'string' ? x : x.text || '')}</span></li>`).join('')}</ol>${s.note ? `<div class="body"><p class="muted">${esc(s.note)}</p></div>` : ''}`;
    else if (s.kind === 'promptRepair') body = `<div class="convo"><div><span class="cap">Original</span><p>${esc(s.weak)}</p></div></div><div class="body"><p>Rewrite it without the private details. Fill in the blanks:</p></div>${(s.fields || []).map((f, i) => `<label class="cap" for="pr-${i}" style="display:block;margin-top:32px">${esc(f)}</label><textarea id="pr-${i}" data-pr="${i}" style="min-height:56px;margin-top:4px">${esc((a.pr || {})[i] || '')}</textarea>`).join('')}<div style="margin-top:32px"><button class="btn" id="pr-show" aria-expanded="${!!a.shown}">Show a safer version</button></div><div id="pr-out">${a.shown ? `<div class="outcome" tabindex="-1"><span class="cap">Safer version</span>${esc(s.strong)}</div>` : ''}</div>`;
    else if (s.kind === 'tryLive') body = `<div class="body"><p>${esc(s.prompt)}</p></div><label class="vh" for="try">Your plan</label><textarea id="try" placeholder="Your plan. Only you see this.">${esc(a.text || '')}</textarea>${s.note ? `<div class="body"><p class="muted">${esc(s.note)}</p></div>` : ''}`;
    else body = `<div class="body">${paras([s.body, s.prompt, s.scenario, s.note].filter(Boolean).join('\n\n'))}</div>`;

    const view = chrome(); document.getElementById('nav').hidden = true; activeTab = 'lesson';
    view.innerHTML = `
      <header class="lbar"><div class="wrap lbar-in"><a class="link rev" href="#intro-${l.num}" style="color:var(--muted)">${AR}<span>Exit</span></a><span class="cap t" style="color:var(--text)">${pad(l.num)} · ${esc(l.title)}</span><span class="r cap"><i aria-hidden="true"></i>Saved</span></div>
        <div class="rule" role="img" aria-label="Step ${st.i + 1} of ${n}"><i style="width:${(st.i + 1) / n * 100}%"></i></div></header>
      <main id="main" class="lesson">
        <span class="cap">Step ${pad(st.i + 1)} / ${pad(n)} · ${kind}</span>
        <h1 id="step-h" tabindex="-1">${esc(s.title)}</h1>
        ${body}
        <div class="lfoot"><button class="link rev" id="prev" ${st.i === 0 ? 'disabled' : ''}>${AR}<span>Back</span></button><button class="btn white" id="next">${st.i === n - 1 ? 'Finish' : 'Continue'}</button></div>
      </main>`;
    const go = d => { st.i = Math.min(n - 1, Math.max(0, st.i + d)); lesson(num, d > 0 ? 'next' : 'back'); scrollTo(0, 0); document.getElementById('step-h').focus(); };
    animateIn(root.querySelector('#main'), dir);
    root.querySelector('#prev').addEventListener('click', () => go(-1));
    root.querySelector('#next').addEventListener('click', () => { if (st.i === n - 1) { if (!ME.done.includes(l.id)) ME.done.push(l.id); st.i = 0; location.hash = '#progress'; } else go(1); });
    root.querySelector('#first')?.addEventListener('input', e => a.text = e.target.value);
    root.querySelector('#try')?.addEventListener('input', e => a.text = e.target.value);
    root.querySelectorAll('[data-pr]').forEach(t => t.addEventListener('input', () => { (a.pr || (a.pr = {}))[t.dataset.pr] = t.value; }));
    root.querySelector('#pr-show')?.addEventListener('click', () => { a.shown = true; const o = root.querySelector('#pr-out'); o.innerHTML = `<div class="outcome" tabindex="-1"><span class="cap">Safer version</span>${esc(s.strong)}</div>`; root.querySelector('#pr-show').setAttribute('aria-expanded', 'true'); o.firstChild.focus(); });
    if (s.kind === 'compare') {
      const box = root.querySelector('#cmp'), out = root.querySelector('#cmp-out');
      const draw = () => {
        box.innerHTML = [['A', s.weak], ['B', s.strong]].map(([k, t], j) => `<button class="answer" data-j="${j}" aria-pressed="${a.pick === j}" ${a.pick != null ? 'disabled' : ''}><span class="k">${k}</span><span>${esc(t)}</span></button>`).join('');
        out.innerHTML = a.pick != null ? `<div class="outcome" tabindex="-1"><span class="cap">${a.pick === 1 ? 'Correct' : 'Answer: B'}</span>${esc(s.why)}</div>` : '';
        box.querySelectorAll('.answer').forEach(b => b.addEventListener('click', () => { a.pick = +b.dataset.j; draw(); out.firstChild?.focus(); }));
      };
      draw();
    }
    root.querySelectorAll('[data-k]').forEach(t => t.addEventListener('input', () => { (a.v || (a.v = {}))[t.dataset.k] = t.value; }));

    if (s.kind === 'classify') {
      a.p = a.p || {};
      const jobs = root.querySelector('#jobs'), out = root.querySelector('#cls-out');
      const draw = () => {
        jobs.innerHTML = s.items.map((it, i) => `<li class="job"><p>${esc(it.text)}</p><div class="choices" role="group" aria-label="Which part does this?">${s.buckets.map((b, k) => `<button class="choice" data-i="${i}" data-k="${k}" aria-pressed="${a.p[i] === k}">${esc(b)}</button>`).join('')}</div>${a.checked ? `<span class="verdict ${a.p[i] === it.answer ? '' : 'no'}">${a.p[i] === it.answer ? 'Correct' : `Answer: ${esc(s.buckets[it.answer])}`}</span>` : ''}</li>`).join('');
        const all = s.items.every((_, i) => a.p[i] != null), right = s.items.filter((it, i) => a.p[i] === it.answer).length;
        out.innerHTML = a.checked ? `<div class="outcome" tabindex="-1"><span class="cap">${right} of ${s.items.length}</span>${esc(s.reveal)}</div>` : `<div style="margin-top:28px"><button class="btn" id="chk" ${all ? '' : 'disabled'}>Check</button></div>`;
        jobs.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => { a.p[b.dataset.i] = +b.dataset.k; a.checked = false; draw(); jobs.querySelector(`[data-i="${b.dataset.i}"][data-k="${b.dataset.k}"]`).focus(); }));
        out.querySelector('#chk')?.addEventListener('click', () => { a.checked = true; draw(); out.firstChild?.focus(); });
      };
      draw();
    }
    if (s.kind === 'exitCheck') {
      const box = root.querySelector('#answers'), out = root.querySelector('#ex-out');
      const draw = () => {
        box.innerHTML = s.options.map((o, j) => `<button class="answer" data-j="${j}" aria-pressed="${a.pick === j}" ${a.pick != null ? 'disabled' : ''}><span class="k">${String.fromCharCode(65 + j)}</span><span>${esc(o.text)}</span></button>`).join('');
        out.innerHTML = a.pick != null ? `<div class="outcome" tabindex="-1"><span class="cap">${s.options[a.pick].ok ? 'Correct' : 'Not quite'}</span>${esc(s.options[a.pick].feedback || '')}</div>` : '';
        box.querySelectorAll('.answer').forEach(b => b.addEventListener('click', () => { a.pick = +b.dataset.j; draw(); out.firstChild?.focus(); }));
      };
      draw();
    }
    if (s.kind === 'workflowChain') {
      a.seq = a.seq || []; a.order = a.order || (s.choices || [...s.correct].sort(() => Math.random() - .5));
      const box = root.querySelector('#chain'), out = root.querySelector('#ch-out');
      const draw = () => {
        box.innerHTML = a.order.map(c => { const k = a.seq.indexOf(c); return `<button class="answer" data-c="${esc(c)}" aria-pressed="${k >= 0}"><span class="k">${k >= 0 ? pad(k + 1) : '—'}</span><span>${esc(c)}</span></button>`; }).join('');
        const full = a.seq.length === s.correct.length, ok = full && a.seq.every((c, i) => c === s.correct[i]);
        out.innerHTML = full ? `<div class="outcome"><span class="cap">${ok ? 'Correct order' : 'Not quite'}</span>${ok ? esc(s.note || '') : 'Tap a step to remove it and try again.'}</div>` : '';
        box.querySelectorAll('.answer').forEach(b => b.addEventListener('click', () => { const c = b.dataset.c, k = a.seq.indexOf(c); k >= 0 ? a.seq.splice(k, 1) : a.seq.push(c); draw(); box.querySelector(`[data-c="${CSS.escape(c)}"]`)?.focus(); }));
      };
      draw();
    }
  }

  /* ---------- Sign in / Create account ---------- */
  const AUTH_TABS = [['signin', 'Sign in'], ['join', 'Create account']];
  const PROTO = 'This is a design prototype, so nothing was sent and no account was created. In the live site this is where you would be signed in.';
  function authShell(cur, title, line, form) {
    page('', `<section class="auth">
      <div class="auth-l"><div><h1>${title}</h1><p>${line}</p></div><span class="cap dim">Lesson 01 needs no account.</span></div>
      <div class="auth-r">${subtabs(AUTH_TABS, cur, 'Account')}${form}</div></section>`, { noFoot: true });
  }
  function pwToggle(scope) { scope.querySelectorAll('.reveal-pw').forEach(b => b.addEventListener('click', () => { const i = scope.querySelector('#' + b.dataset.for); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', String(show)); })); }
  function signin() {
    authShell('signin', 'Sign in', 'Pick up exactly where you stopped.', `<form class="form" id="f" novalidate>
      <div class="fld"><label for="em">Email</label><input type="email" id="em" autocomplete="email" required><span class="err" id="em-e" hidden></span></div>
      <div class="fld"><label for="pw">Password</label><div class="row"><input type="password" id="pw" autocomplete="current-password" required><button type="button" class="reveal-pw" data-for="pw" aria-pressed="false">Show</button></div><span class="err" id="pw-e" hidden></span></div>
      <div class="form-foot"><button class="btn white" type="submit">Sign in ${CHEV}</button><a class="ulink" href="#forgot">Forgot password?</a></div>
      <div id="out" aria-live="polite"></div></form>`);
    pwToggle(root);
    root.querySelector('#f').addEventListener('submit', e => { e.preventDefault(); const em = root.querySelector('#em'), pw = root.querySelector('#pw'); let ok = true;
      const bad = (i, id, msg) => { i.setAttribute('aria-invalid', 'true'); const x = root.querySelector('#' + id); x.textContent = msg; x.hidden = false; i.setAttribute('aria-describedby', id); ok = false; };
      [em, pw].forEach(i => { i.removeAttribute('aria-invalid'); }); root.querySelectorAll('.err').forEach(x => x.hidden = true);
      if (!/^\S+@\S+\.\S+$/.test(em.value)) bad(em, 'em-e', 'Enter the email you signed up with.');
      if (!pw.value) bad(pw, 'pw-e', 'Enter your password.');
      if (!ok) { root.querySelector('[aria-invalid="true"]').focus(); return; }
      pw.value = ''; root.querySelector('#out').innerHTML = `<p class="notice">${PROTO}</p><a class="ulink" href="#home" style="display:inline-block;margin-top:18px">Continue to my course</a>`; });
  }
  function forgot() {
    authShell('signin', 'Reset', 'We’ll email you a link to choose a new password.', `<form class="form" id="f" novalidate>
      <div class="fld"><label for="em">Email</label><input type="email" id="em" autocomplete="email" required></div>
      <div class="form-foot"><button class="btn white" type="submit">Send link ${CHEV}</button><a class="ulink" href="#signin">Back to sign in</a></div><div id="out" aria-live="polite"></div></form>`);
    root.querySelector('#f').addEventListener('submit', e => { e.preventDefault(); root.querySelector('#out').innerHTML = `<p class="notice">Prototype: no email is sent. In the live site, a reset link would arrive if the address has an account.</p>`; });
  }
  function join() {
    authShell('join', 'Join', 'Create a free account to save your progress and continue on any device.', `<form class="form" id="f" novalidate>
      <div class="fld"><label for="nm">First name or nickname</label><input type="text" id="nm" autocomplete="given-name" maxlength="30" required><span class="hint">Only used to say hello.</span></div>
      <div class="fld"><label for="em">Email</label><input type="email" id="em" autocomplete="email" required></div>
      <div class="fld"><label for="pw">Password</label><div class="row"><input type="password" id="pw" autocomplete="new-password" required aria-describedby="pw-h"><button type="button" class="reveal-pw" data-for="pw" aria-pressed="false">Show</button></div>
        <div class="pwmeter" aria-hidden="true"><i></i><i></i><i></i></div><span class="hint" id="pw-h">At least 10 characters.</span></div>
      <div class="fld"><span class="lbl" id="age-l">Age</span><div class="opts" role="group" aria-labelledby="age-l">${['13–15', '16–18', 'Adult'].map(a => `<button type="button" class="opt" aria-pressed="false">${a}</button>`).join('')}</div></div>
      <label class="chk"><input type="checkbox" id="ok13" required> I’m 13 or older, and I’ve read <a class="ulink" href="#parents" style="font-size:inherit;letter-spacing:0;text-transform:none;font-stretch:100%">what we store</a>.</label>
      <div class="form-foot"><button class="btn white" type="submit">Create account ${CHEV}</button><a class="ulink" href="#signin">I have an account</a></div>
      <div id="out" aria-live="polite"></div></form>`);
    pwToggle(root);
    const pw = root.querySelector('#pw'), bars = root.querySelectorAll('.pwmeter i');
    pw.addEventListener('input', () => { const v = pw.value, sc = (v.length >= 10) + (/[A-Z]/.test(v) && /[a-z]/.test(v)) + (/[\d\W]/.test(v)); bars.forEach((b, i) => b.classList.toggle('on', i < (v.length >= 10 ? sc : 0))); });
    root.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => root.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', String(x === b)))));
    root.querySelector('#f').addEventListener('submit', e => { e.preventDefault(); const out = root.querySelector('#out'), probs = [];
      if (!root.querySelector('#nm').value.trim()) probs.push('a name'); if (!/^\S+@\S+\.\S+$/.test(root.querySelector('#em').value)) probs.push('a valid email');
      if (pw.value.length < 10) probs.push('a password of 10+ characters'); if (!root.querySelector('.opt[aria-pressed="true"]')) probs.push('your age group'); if (!root.querySelector('#ok13').checked) probs.push('the age confirmation');
      pw.value = ''; bars.forEach(b => b.classList.remove('on'));
      out.innerHTML = probs.length ? `<p class="notice">Still needed: ${probs.join(', ')}.</p>` : `<p class="notice">${PROTO}</p>`; out.querySelector('.notice').setAttribute('tabindex', '-1'); out.querySelector('.notice').focus(); });
  }

  /* ---------- Settings ---------- */
  const SET_TABS = [['account', 'Profile'], ['account-prefs', 'Preferences'], ['account-privacy', 'Privacy']];
  function account(tab = 'account') {
    let rows = '';
    if (tab === 'account') rows = `
      <div class="set-row"><span class="k">Name</span><span class="v"><label class="vh" for="nm">Name</label><input id="nm" type="text" value="${esc(ME.name)}" maxlength="30" style="background:transparent;border:0;border-bottom:1px solid var(--line-2);color:var(--text);font:400 19px var(--font);padding:6px 0;width:min(320px,100%)"></span><span class="cap" id="nm-s" aria-live="polite"></span></div>
      <div class="set-row"><span class="k">Email</span><span class="v"><b>${esc(ME.email)}</b></span><span></span></div>
      <div class="set-row"><span class="k">Password</span><span class="v">Last changed: never</span><a class="btn sm" href="#forgot">Change</a></div>
      <div class="set-row"><span class="k">Session</span><span class="v">Signed in on this device</span><button class="btn sm" id="so">Sign out</button></div>`;
    if (tab === 'account-prefs') rows = `
      <div class="set-row"><span class="k">Text size</span><span class="v">Larger text across every page.</span><span class="opts">${[['std', 'Standard'], ['lg', 'Large']].map(([k, t]) => `<button class="opt" data-pref="text" data-v="${k}" aria-pressed="${PREFS.text === k}">${t}</button>`).join('')}</span></div>
      <div class="set-row"><span class="k">Motion</span><span class="v">Reduced turns off page and menu animations.</span><span class="opts">${[['full', 'Full'], ['calm', 'Reduced']].map(([k, t]) => `<button class="opt" data-pref="motion" data-v="${k}" aria-pressed="${PREFS.motion === k}">${t}</button>`).join('')}</span></div>`;
    if (tab === 'account-privacy') rows = `
      <div class="set-row"><span class="k">What we store</span><span class="v">Your name, email, lessons finished, and the cards you write. <b>Never</b> your chats with outside AI tools.</span><span></span></div>
      <div class="set-row"><span class="k">Who sees it</span><span class="v">Only you. Projects are private unless you choose to publish.</span><span></span></div>
      <div class="set-row"><span class="k">Your data</span><span class="v">A copy of everything we store about you.</span><button class="btn sm" id="dl">Request copy</button></div>
      <div class="set-row"><span class="k">Delete account</span><span class="v" id="del-v">Removes your progress and cards permanently.</span><button class="btn sm danger" id="del">Delete</button></div>`;
    page('account', `<div class="wrap page tight">${subtabs(SET_TABS, tab, 'Settings sections')}<div class="page-h min"><span class="cap">Settings</span><h1>${{ account: 'Profile', 'account-prefs': 'Preferences', 'account-privacy': 'Privacy' }[tab]}</h1></div><div>${rows}</div><div id="out" aria-live="polite" style="margin-top:28px"></div></div>`);
    const out = root.querySelector('#out');
    root.querySelector('#nm')?.addEventListener('input', e => { ME.name = e.target.value.trim() || 'there'; root.querySelector('#nm-s').textContent = 'Saved'; clearTimeout(window.__nmT); window.__nmT = setTimeout(() => { const x = root.querySelector('#nm-s'); if (x) x.textContent = ''; }, 1400); });
    root.querySelector('#so')?.addEventListener('click', () => { out.innerHTML = `<p class="notice">Prototype: you stay signed in so the demo keeps working. In the live site this signs you out on this device.</p>`; });
    root.querySelectorAll('[data-pref]').forEach(b => b.addEventListener('click', () => { PREFS[b.dataset.pref] = b.dataset.v; applyPrefs(); root.querySelectorAll(`[data-pref="${b.dataset.pref}"]`).forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
    root.querySelector('#dl')?.addEventListener('click', () => { out.innerHTML = `<p class="notice">Prototype: in the live site we email a copy of your data to your account address within a day.</p>`; });
    root.querySelector('#del')?.addEventListener('click', e => { const b = e.currentTarget; if (b.dataset.armed) { out.innerHTML = `<p class="notice">Prototype: nothing was deleted. In the live site your account and progress would now be removed.</p>`; b.textContent = 'Delete'; delete b.dataset.armed; root.querySelector('#del-v').textContent = 'Removes your progress and cards permanently.'; return; } b.dataset.armed = '1'; b.textContent = 'Confirm delete'; root.querySelector('#del-v').innerHTML = '<b>Are you sure?</b> This can’t be undone. Press again to confirm.'; b.focus(); });
  }

  /* ---------- router ---------- */
  let first = true, pending;
  function route() {
    clearTimeout(pending);
    const m0 = document.getElementById('main'), wasFirst = first; first = false;
    const go = () => { render(); if (!wasFirst) { (document.querySelector('main h1') || document.getElementById('main'))?.focus({ preventScroll: true }); } };
    if (!wasFirst && m0 && !reduced) { m0.classList.add('out'); pending = setTimeout(go, 180); } else go();
  }
  function render() {
    const h = location.hash.slice(1) || 'home';
    document.documentElement.classList.remove('snap'); window.__scrollFx = null;
    let m;
    if ((m = h.match(/^lesson-(\d+)$/))) lesson(+m[1]);
    else if ((m = h.match(/^intro-(\d+)$/))) intro(+m[1]);
    else if ((m = h.match(/^part-([123])$/))) part(+m[1] - 1);
    else if (h === 'main') { document.getElementById('main')?.focus(); return; }
    else if (h.startsWith('account')) account(['account', 'account-prefs', 'account-privacy'].includes(h) ? h : 'account');
    else ({ course, progress, toolkit, projects, gallery, about, parents, teachers, faq, signin, join, forgot }[h] || home)();
    const names = { signin: 'Sign in', join: 'Create account', forgot: 'Reset password', account: 'Settings', 'account-prefs': 'Preferences', 'account-privacy': 'Privacy', course: 'Course', progress: 'Progress', toolkit: 'Toolkit', projects: 'Projects', gallery: 'Gallery', about: 'About', parents: 'Parents', teachers: 'Teachers', faq: 'FAQ' };
    document.title = /^(lesson|intro)-/.test(h) ? `${C[+h.split('-')[1] - 1]?.title || 'Lesson'} · LearningAI` : /^part-/.test(h) ? `${PARTS[+h.slice(5) - 1]?.name ?? 'Course'} · LearningAI` : names[h] ? `${names[h]} · LearningAI` : 'LearningAI';
    scrollTo(0, 0);
  }
  document.documentElement.lang = 'en';
  document.querySelector('.skip')?.addEventListener('click', e => { e.preventDefault(); const m = document.getElementById('main'); (m?.querySelector('h1') || m)?.focus(); });
  addEventListener('hashchange', route);
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 700))]).then(() => { route(); root.style.opacity = 1; });
})();
