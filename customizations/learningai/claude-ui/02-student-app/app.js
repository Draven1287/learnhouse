/* LearningAI student app prototype. Screens: Today, Path, Lesson, Toolkit, Me.
   The lesson player here is a stand-in that renders the real step data; the production lesson engine plugs into the same frame. */
(function () {
  const C = window.LAI_COURSE;
  const KEY = 'learningai-teen-proto-v1';
  const PARTS = [
    { name: 'First Contact', cls: 'p1', can: 'Understand what AI is actually doing.' },
    { name: 'How It Works', cls: 'p2', can: 'See how prediction becomes text, images, and voice.' },
    { name: 'Talking to AI', cls: 'p3', can: 'Use AI for one small, real task from your life.' }
  ];
  const KIND = { coldOpen: 'Scenario', classify: 'Sort it', reveal: 'What’s going on', compare: 'Compare', workflowChain: 'Put in order', toolkitSave: 'Save to toolkit', exitCheck: 'Final check', tryLive: 'Try it', promptRepair: 'Fix the prompt', verify: 'Check it' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paras = s => String(s || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('');
  const txt = v => typeof v === 'string' ? v : (v && (v.text || v.prompt || v.answer || v.label)) || '';
  const $ = (s, r = document) => r.querySelector(s);
  const main = $('#main'), live = $('#live');
  const partOf = l => PARTS.findIndex(p => p.name === l.arc);
  const say = m => { live.textContent = ''; setTimeout(() => live.textContent = m, 40); };

  /* ---------- state ---------- */
  function sample() {
    const l1save = C[0].steps.find(s => s.kind === 'toolkitSave');
    const vals = ['A group chat says school is closed tomorrow', 'The school’s own website, before I forward anything', 'Nothing private: no names, no screenshots of people', 'Me. I decide whether it gets sent on.'];
    return {
      name: 'Sam', theme: 'system', text: 'm', motion: 'on', savedAt: Date.now() - 1000 * 60 * 8,
      lessons: { 'chapter-1': { done: true, step: C[0].steps.length, a: {} }, 'chapter-2': { step: 2, a: { 0: { text: 'Whether it checked today’s timetable or just guessed.' }, 1: { place: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 0 }, checked: true } } } },
      toolkit: l1save ? [{ lesson: 'chapter-1', type: l1save.cardType || 'Control card', title: l1save.title, fields: (l1save.fields || []).map((f, i) => ({ label: f.label, value: vals[i] || '' })) }] : [],
      quick: {}
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || !S.lessons) S = sample();
  let storageOk = true;
  function save() { S.savedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; } catch (e) { storageOk = false; } }
  function applyPrefs() { const r = document.documentElement; S.theme === 'system' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', S.theme); r.setAttribute('data-text', S.text); r.setAttribute('data-motion', S.motion); }
  const L = id => S.lessons[id] || (S.lessons[id] = { step: 0, a: {} });
  const isDone = l => !!S.lessons[l.id]?.done;
  const unlocked = l => l.num === 1 || isDone(C[l.num - 2]);
  const current = () => C.find(l => !isDone(l)) || null;
  const doneCount = () => C.filter(isDone).length;
  function chipHTML() {
    if (!storageOk) return `<span class="chip" role="status"><span aria-hidden="true">!</span> Not saving: storage is blocked</span>`;
    const mins = Math.round((Date.now() - S.savedAt) / 60000);
    const when = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : new Date(S.savedAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    return `<span class="chip" role="status"><span class="ok" aria-hidden="true">✓</span> Saved on this device · ${when}</span>`;
  }
  function segs(l, at, doneAll) { return `<div class="segs ${PARTS[partOf(l)].cls}" aria-hidden="true">${l.steps.map((_, i) => `<i class="${doneAll || i < at ? 'd' : i === at ? 'c' : ''}"></i>`).join('')}</div>`; }
  function strip() {
    return `<div class="strip" role="img" aria-label="${doneCount()} of 15 lessons done">${PARTS.map((p, pi) => `<div class="strip-part ${p.cls}">${C.filter(l => partOf(l) === pi).map(l => `<span class="sq ${isDone(l) ? 'd' : current() === l ? 'c' : ''}"></span>`).join('')}</div>`).join('')}</div>`;
  }

  /* ---------- router ---------- */
  function route() {
    const h = location.hash.slice(1) || 'today';
    document.body.classList.toggle('in-lesson', h.startsWith('lesson-'));
    document.querySelectorAll('.tab').forEach(t => t.toggleAttribute('aria-current', false));
    const tab = h.startsWith('lesson-') ? null : h.replace(/-\d$/, '');
    if (tab) $(`.tab[data-tab="${tab}"]`)?.setAttribute('aria-current', 'page');
    if (h === 'path' || /^path-\d$/.test(h)) path(); else if (h === 'toolkit') toolkit(); else if (h === 'me') me();
    else if (h.startsWith('lesson-')) { const l = C.find(x => x.id === h.slice(7)); l && unlocked(l) ? lesson(l) : (location.hash = '#path'); }
    else today();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- Today ---------- */
  function today() {
    const l = current(), last = S.toolkit[S.toolkit.length - 1];
    let resume = '';
    if (l) {
      const st = L(l.id), at = Math.min(st.step, l.steps.length - 1), started = st.step > 0;
      const left = Math.max(2, Math.round(l.min * (1 - at / l.steps.length)));
      const p = PARTS[partOf(l)];
      resume = `<article class="card resume" aria-labelledby="resume-t">
        <div class="next-step"><span class="part ${p.cls}"><i aria-hidden="true"></i>Part ${partOf(l) + 1} · ${p.name}</span><span class="muted mono small">Lesson ${l.num} of 15</span></div>
        <h2 id="resume-t">${esc(l.title)}</h2>
        <p class="q">${esc(l.q)}</p>
        ${segs(l, at)}
        <div class="next-step"><span><b>${started ? `Step ${at + 1} of ${l.steps.length}` : `${l.steps.length} steps`}:</b> ${esc(l.steps[at].title)}</span><span class="muted">about ${left} min ${started ? 'left' : ''}</span></div>
        <div class="resume-cta"><a class="btn primary big" href="#lesson-${l.id}">${started ? 'Continue' : 'Start lesson'}</a></div>
      </article>`;
    } else {
      resume = `<article class="card resume"><span class="status done">✓ Course complete</span><h2>You finished all 15 lessons.</h2><p class="q">Revisit any lesson from your path, or look back at what you saved.</p><div class="resume-cta"><a class="btn primary big" href="#toolkit">Open your toolkit</a><a class="btn big" href="#path">See your path</a></div></article>`;
    }
    const q = S.quick;
    const QOPTS = [['Send it on, so nobody misses it.', false, 'If it’s fake, you just helped it spread. A real closure will be on the school’s own channels.'], ['Check the school’s own site or app first.', true, 'Yes. Go to the source that would actually know, then decide.'], ['Ask a chatbot whether the picture is real.', false, 'A chatbot can’t see your school’s announcements. It might sound sure and still be guessing.']];
    main.innerHTML = `
      <div class="top"><h1 class="hello">Hey ${esc(S.name)}.</h1>${chipHTML()}</div>
      <div class="grid2">
        <div class="stack">
          ${resume}
          <section class="card quick" aria-labelledby="quick-h">
            <div class="next-step"><h2 id="quick-h" style="font-size:22px">Quick one</h2><span class="muted small">Optional · 1 min · doesn’t change your progress</span></div>
            <p class="msg" style="margin:12px 0"><b>Group chat · 9:41 pm</b>NO SCHOOL TOMORROW!! pipe burst, pass it on 🚨 (screenshot attached)</p>
            <p style="font-weight:700;margin-bottom:10px">What do you do first?</p>
            <div class="opts">${QOPTS.map((o, i) => { const pk = q.choice != null; const cls = pk ? (o[1] ? 'ok' : i === q.choice ? 'no' : '') : ''; return `<button class="opt ${cls}" data-q="${i}" ${pk ? 'disabled' : ''} aria-pressed="${q.choice === i}"><span class="k" aria-hidden="true">${pk ? (o[1] ? '✓' : i === q.choice ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}</span><span>${esc(o[0])}</span></button>`; }).join('')}</div>
            ${q.choice != null ? `<p class="fb ${QOPTS[q.choice][1] ? 'ok' : ''}" style="margin-top:10px">${esc(QOPTS[q.choice][2])}</p>` : ''}
          </section>
        </div>
        <div class="stack">
          ${last ? `<section aria-labelledby="last-h"><p class="label" id="last-h" style="margin-bottom:10px">Your last move</p>${tkCard(last)}<p style="margin-top:12px"><a href="#toolkit">Everything you’ve saved →</a></p></section>` : `<section class="empty">Cards you save in lessons will show up here.</section>`}
          <section class="card" aria-labelledby="course-h">
            <div class="next-step"><h2 id="course-h" style="font-size:20px">Your course</h2><span class="mono small"><b>${doneCount()}</b> of 15 done</span></div>
            <div style="margin-top:12px">${strip()}</div>
            <div class="parts-list">${PARTS.map((p, pi) => { const ls = C.filter(l => partOf(l) === pi), d = ls.filter(isDone).length; return `<a href="#path-${pi}"><span class="part ${p.cls}"><i aria-hidden="true"></i>${p.name}</span><span class="mono small muted">${d} of ${ls.length}</span><span class="muted small" style="grid-column:1/-1">${esc(p.can)}</span></a>`; }).join('')}</div>
          </section>
        </div>
      </div>`;
    main.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { S.quick.choice = +b.dataset.q; save(); today(); $('.quick .fb')?.focus?.(); say(QOPTS[S.quick.choice][1] ? 'Good call.' : 'Not quite. Read why.'); }));
  }
  function tkCard(c) {
    const l = C.find(x => x.id === c.lesson);
    return `<article class="tk"><div class="next-step"><span class="label">${esc(c.type)}</span><span class="mono small muted">From lesson ${l ? l.num : ''}</span></div><h3>${esc(l ? l.title : c.title)}</h3><dl>${c.fields.filter(f => f.value).map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl></article>`;
  }

  /* ---------- Path ---------- */
  function path() {
    const cur = current();
    main.innerHTML = `
      <div class="top"><div><h1 class="page-h">Your path</h1><p class="muted">15 lessons in 3 parts. Each one unlocks the next.</p></div>${chipHTML()}</div>
      <div class="card" style="display:grid;gap:10px">${strip()}<p><b>${doneCount()} of 15</b> lessons done${cur ? ` · up next: <a href="#lesson-${cur.id}">Lesson ${cur.num}</a>` : ''}</p></div>
      ${PARTS.map((p, pi) => { const ls = C.filter(l => partOf(l) === pi); return `<section class="path-part ${p.cls}" id="part-${pi}" aria-labelledby="ph-${pi}">
        <div class="path-head"><span class="part ${p.cls}"><i aria-hidden="true"></i>Part ${pi + 1}</span><h2 id="ph-${pi}">${p.name}</h2><p class="muted">You’ll be able to: ${esc(p.can)}</p></div>
        <ol class="path-list">${ls.map(l => { const d = isDone(l), now = cur === l, open = unlocked(l); const st = S.lessons[l.id]; const status = d ? '<span class="status done">✓ Done</span>' : now ? `<span class="status now">${st && st.step ? `◐ Step ${st.step + 1} of ${l.steps.length}` : '● Up next'}</span>` : `<span class="status lock">🔒 After lesson ${l.num - 1}</span>`;
          const inner = `<span class="node-top"><span class="node-t">${esc(l.title)}</span>${status}</span><span class="node-q">${esc(l.q)}</span><span class="mono small muted">${l.min} min · ${l.steps.length} steps</span>`;
          return `<li class="node ${d ? 'done' : now ? 'now' : 'lock'}"><span class="dot" aria-hidden="true">${d ? '✓' : l.num}</span>${open ? `<a class="node-card" href="#lesson-${l.id}" aria-label="Lesson ${l.num}: ${esc(l.title)}. ${d ? 'Done' : now ? 'Up next' : ''}">${inner}</a>` : `<div class="node-card" aria-label="Lesson ${l.num}: ${esc(l.title)}. Locked until lesson ${l.num - 1} is done.">${inner}</div>`}</li>`; }).join('')}</ol></section>`; }).join('')}`;
    const m = location.hash.match(/^#path-(\d)$/); if (m) $(`#part-${m[1]}`)?.scrollIntoView();
  }

  /* ---------- Lesson player ---------- */
  function lesson(l) {
    const st = L(l.id), n = l.steps.length;
    if (st.step > n) st.step = n;
    const i = st.step, p = PARTS[partOf(l)];
    main.innerHTML = `
      <header class="lbar"><div class="lbar-in">
        <div class="lbar-row"><a class="x" href="#today" aria-label="Save and leave the lesson"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a>
          <div class="ltitle"><b>${esc(l.title)}</b><span>Lesson ${l.num} · ${i < n ? `Step ${i + 1} of ${n}` : 'Done'}</span></div>${chipHTML()}</div>
        ${segs(l, i, i >= n)}
      </div></header>
      <div class="lbody" id="stage"></div>
      <footer class="lfoot" ${i >= n ? 'hidden' : ''}><div class="lfoot-in">
        <button class="btn" id="back" ${i === 0 ? 'disabled' : ''}>Back</button>
        <span class="why" id="why"></span>
        <button class="btn primary" id="next">${i === n - 1 ? 'Finish' : 'Continue'}</button>
      </div></footer>`;
    const stage = $('#stage');
    if (i >= n) return finish(l, stage);
    const step = l.steps[i], a = st.a[i] || (st.a[i] = {});
    const next = $('#next'), why = $('#why');
    const gate = ok => { next.disabled = !ok; why.textContent = ok ? '' : ({ classify: 'Sort them all and check', compare: 'Pick one first', workflowChain: 'Build the order and check it', toolkitSave: 'Fill in at least one line', exitCheck: 'Choose an answer' }[step.kind] || ''); };
    const done = () => { a.done = true; save(); gate(true); };
    renderStep(step, a, stage, done, gate);
    $('#back').addEventListener('click', () => { st.step = i - 1; save(); lesson(l); focusH(); });
    next.addEventListener('click', () => { st.step = i + 1; if (st.step >= n) st.done = true; save(); lesson(l); focusH(); });
  }
  const focusH = () => { const h = $('#stage h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };

  function renderStep(s, a, el, done, gate) {
    const head = `<p class="label">${KIND[s.kind] || 'Step'}</p><h2>${esc(s.title)}</h2>`;
    const k = s.kind;
    if (k === 'coldOpen') {
      el.innerHTML = `<section class="step">${head}<div class="scenario prose">${paras(s.scenario)}</div><p class="ask">${esc(s.prompt)}</p>
        <div class="field"><label for="first">Your first thought <span class="muted">(optional, just for you)</span></label><textarea id="first" rows="3" placeholder="Type a quick guess. There’s no wrong answer here.">${esc(a.text || '')}</textarea></div></section>`;
      $('#first').addEventListener('input', e => { a.text = e.target.value; save(); });
      gate(true); a.done = true;
    } else if (k === 'reveal') {
      el.innerHTML = `<section class="step">${head}<div class="prose">${paras(s.body)}</div>${s.mistake || s.good ? `<div class="two">${s.mistake ? `<div class="mini bad"><b>Common mistake</b>${esc(txt(s.mistake))}</div>` : ''}${s.good ? `<div class="mini good"><b>Better move</b>${esc(txt(s.good))}</div>` : ''}</div>` : ''}</section>`;
      gate(true); a.done = true;
    } else if (k === 'classify') {
      a.place = a.place || {};
      const draw = () => {
        const all = s.items.every((_, j) => a.place[j] != null);
        const right = s.items.filter((it, j) => a.place[j] === it.answer).length;
        el.innerHTML = `<section class="step">${head}<p class="muted" style="margin-bottom:14px">${esc(s.prompt)}</p>
          <ul class="sort">${s.items.map((it, j) => `<li class="${a.checked ? (a.place[j] === it.answer ? 'ok' : 'no') : ''}"><span class="sort-t">${esc(it.text)}</span>
            <span class="pills" role="group" aria-label="Who does this?">${s.buckets.map((b, bi) => `<button class="pill" data-j="${j}" data-b="${bi}" aria-pressed="${a.place[j] === bi}">${esc(b)}</button>`).join('')}</span>
            ${a.checked && a.place[j] !== it.answer ? `<span class="small">Better fit: <b>${esc(s.buckets[it.answer])}</b></span>` : ''}</li>`).join('')}</ul>
          <button class="btn primary" id="chk" ${all ? '' : 'disabled'}>${a.checked ? 'Check again' : 'Check'}</button>
          ${a.checked ? `<p class="fb ${right === s.items.length ? 'ok' : ''}" style="margin-top:12px"><b>${right} of ${s.items.length} match.</b> ${esc(s.reveal || '')}</p>` : ''}</section>`;
        el.querySelectorAll('.pill').forEach(b => b.addEventListener('click', () => { a.place[b.dataset.j] = +b.dataset.b; a.checked = false; save(); draw(); el.querySelector(`.pill[data-j="${b.dataset.j}"][data-b="${b.dataset.b}"]`).focus(); gate(!!a.done); }));
        $('#chk').addEventListener('click', () => { a.checked = true; done(); draw(); say(`${s.items.filter((it, j) => a.place[j] === it.answer).length} of ${s.items.length} match.`); });
      };
      draw(); gate(!!a.done);
    } else if (k === 'compare') {
      const draw = () => {
        el.innerHTML = `<section class="step">${head}<p class="muted" style="margin-bottom:12px">Which one would get you a more useful answer?</p>
          <div class="opts">${[['A', s.weak, false], ['B', s.strong, true]].map(([lt, v, good]) => { const pk = a.pick != null; return `<button class="opt ${pk ? (good ? 'ok' : a.pick === lt ? 'no' : '') : ''}" data-p="${lt}" ${pk ? 'disabled' : ''}><span class="k" aria-hidden="true">${lt}</span><span>${esc(txt(v))}</span></button>`; }).join('')}</div>
          ${a.pick ? `<p class="fb ok" style="margin-top:12px">${esc(txt(s.why))}</p>` : ''}</section>`;
        el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { a.pick = b.dataset.p; done(); draw(); }));
      };
      draw(); gate(!!a.done);
    } else if (k === 'workflowChain') {
      a.seq = a.seq || []; a.tries = a.tries || 0;
      const draw = () => {
        const pool = s.choices.filter(c => !a.seq.includes(c));
        const solved = a.checked && a.seq.every((c, j) => c === s.correct[j]);
        el.innerHTML = `<section class="step">${head}<div class="scenario"><b>Goal:</b> ${esc(s.goal)}</div>
          <p class="label" style="margin-bottom:8px">Your order (tap a step to remove it)</p>
          <ol class="chain ${a.checked ? 'checked' : ''}">${s.correct.map((_, j) => a.seq[j] ? `<li class="${a.checked ? (a.seq[j] === s.correct[j] ? 'ok' : 'no') : ''}"><button class="pill" style="border:0;background:none;padding:0;text-align:left;min-height:0" data-rm="${j}">${esc(a.seq[j])}</button></li>` : `<li class="empty">Step ${j + 1}</li>`).join('')}</ol>
          ${pool.length ? `<p class="label" style="margin-bottom:8px">Tap to add next</p><div class="pool">${pool.map(c => `<button class="opt" data-add="${esc(c)}"><span class="k" aria-hidden="true">+</span><span>${esc(c)}</span></button>`).join('')}</div>` : ''}
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="chk" ${a.seq.length === s.correct.length ? '' : 'disabled'}>Check order</button><button class="btn quiet" id="clr">Start over</button></div>
          ${a.checked ? `<p class="fb ${solved ? 'ok' : ''}" style="margin-top:12px">${solved ? `✓ That’s the safe order. ${esc(s.note || '')}` : a.tries >= 2 ? `Here’s the safe order: ${s.correct.map((c, j) => `${j + 1}. ${esc(c)}`).join(' ')}` : 'Some steps are out of place (marked). Tap them to move them.'}</p>` : ''}</section>`;
        el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { a.seq.push(b.dataset.add); a.checked = false; save(); draw(); }));
        el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { a.seq.splice(+b.dataset.rm, 1); a.checked = false; save(); draw(); }));
        $('#clr').addEventListener('click', () => { a.seq = []; a.checked = false; save(); draw(); });
        $('#chk').addEventListener('click', () => { a.checked = true; a.tries++; const ok = a.seq.every((c, j) => c === s.correct[j]); if (ok || a.tries >= 2) done(); save(); draw(); say(ok ? 'Correct order.' : 'Not quite.'); });
      };
      draw(); gate(!!a.done);
    } else if (k === 'toolkitSave') {
      a.v = a.v || {};
      el.innerHTML = `<section class="step">${head}<p class="muted" style="margin-bottom:14px">This card goes in your Toolkit, so you can use it outside the lesson. Short answers are fine.</p>
        ${(s.fields || []).map(f => `<div class="field"><label for="f-${esc(f.key)}">${esc(f.label)}</label><input type="text" id="f-${esc(f.key)}" data-k="${esc(f.key)}" value="${esc(a.v[f.key] || '')}" placeholder="${esc(f.placeholder || '')}"></div>`).join('')}
        <p class="small muted" id="tk-st" aria-live="polite">${a.done ? '✓ In your toolkit' : ''}</p></section>`;
      const lessonId = location.hash.slice(8);
      const sync = () => { const any = Object.values(a.v).some(v => v && v.trim()); if (any) { const card = { lesson: lessonId, type: s.cardType || 'Card', title: s.title, fields: s.fields.map(f => ({ label: f.label, value: a.v[f.key] || '' })) }; S.toolkit = S.toolkit.filter(c => c.lesson !== lessonId); S.toolkit.push(card); done(); $('#tk-st').textContent = '✓ Saved to your toolkit'; } else gate(false); };
      el.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', () => { a.v[inp.dataset.k] = inp.value; sync(); save(); }));
      gate(!!a.done);
    } else if (k === 'exitCheck') {
      const draw = () => {
        const pk = a.pick != null;
        el.innerHTML = `<section class="step">${head}<p class="ask">${esc(s.question)}</p>
          <div class="opts">${s.options.map((o, j) => `<button class="opt ${pk ? (o.ok ? 'ok' : j === a.pick ? 'no' : '') : ''}" data-o="${j}" ${pk ? 'disabled' : ''}><span class="k" aria-hidden="true">${pk ? (o.ok ? '✓' : j === a.pick ? '✗' : String.fromCharCode(65 + j)) : String.fromCharCode(65 + j)}</span><span>${esc(o.text)}</span></button>`).join('')}</div>
          ${pk ? `<p class="fb ${s.options[a.pick].ok ? 'ok' : ''}" style="margin-top:12px">${esc(s.options[a.pick].feedback || '')}</p>` : '<p class="muted small" style="margin-top:10px">One try. You’ll see why either way.</p>'}</section>`;
        el.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => { a.pick = +b.dataset.o; done(); draw(); }));
      };
      draw(); gate(!!a.done);
    } else {
      el.innerHTML = `<section class="step">${head}${s.prompt || s.body || s.scenario ? `<div class="prose">${paras(s.prompt || s.body || s.scenario)}</div>` : ''}<p class="engine-note">This step type (${esc(k)}) runs in the full lesson engine. The prototype frame shows where it sits.</p></section>`;
      gate(true); a.done = true;
    }
  }

  function finish(l, el) {
    const nx = C[l.num], card = S.toolkit.find(c => c.lesson === l.id);
    el.innerHTML = `<section class="done-hero"><div class="burst" aria-hidden="true">✓</div><p class="label">Lesson ${l.num} done</p><h2 tabindex="-1">${esc(l.title)}</h2>
      ${card ? `<p>You added this to your toolkit:</p>${tkCard(card)}` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">${nx ? `<a class="btn primary big" href="#lesson-${nx.id}">Next: ${esc(nx.title)}</a>` : `<a class="btn primary big" href="#toolkit">Open your toolkit</a>`}<a class="btn big" href="#today">Back to Today</a></div>
      ${nx ? `<p class="muted small">Lesson ${nx.num} is unlocked. About ${nx.min} min.</p>` : ''}</section>`;
    say(`Lesson ${l.num} done.`);
  }

  /* ---------- Toolkit ---------- */
  function toolkit() {
    const d = doneCount();
    const pins = [['1', 'First lesson', 'Finish lesson 1', isDone(C[0])], ['P1', 'First Contact', 'Finish part 1', C.slice(0, 5).every(isDone)], ['3', 'Kit builder', 'Save 3 toolkit cards', S.toolkit.length >= 3], ['8', 'Halfway', 'Finish 8 lessons', d >= 8], ['15', 'In control', 'Finish all 15', d >= 15]];
    main.innerHTML = `
      <div class="top"><div><h1 class="page-h">Your toolkit</h1><p class="muted">Cards you made in lessons. Use them whenever you’re about to use AI for real.</p></div>${chipHTML()}</div>
      ${S.toolkit.length ? `<div class="tk-grid">${S.toolkit.map(tkCard).join('')}</div>` : '<p class="empty">No cards yet. Every lesson ends with one you keep.</p>'}
      <section style="margin-top:36px" aria-labelledby="pins-h"><h2 id="pins-h" style="font-size:24px">Milestones</h2><p class="muted small">Earned by finishing work, not by time spent or streaks.</p>
        <div class="pins">${pins.map(p => `<div class="pin ${p[3] ? 'got' : ''}"><span class="medal" aria-hidden="true">${p[0]}</span><b>${p[1]}</b><span class="muted">${p[3] ? '✓ Earned' : p[2]}</span></div>`).join('')}</div></section>`;
  }

  /* ---------- Me ---------- */
  function me() {
    const seg = (key, opts) => `<span class="seg" role="group">${opts.map(([v, t]) => `<button class="pill" data-set="${key}" data-v="${v}" aria-pressed="${S[key] === v}">${t}</button>`).join('')}</span>`;
    main.innerHTML = `
      <div class="top"><h1 class="page-h">Me</h1>${chipHTML()}</div>
      <div class="card" style="max-width:640px">
        <div class="set" style="border-top:0;padding-top:0"><h3><label for="nm">Name</label></h3><input type="text" id="nm" value="${esc(S.name)}" maxlength="30"><p class="small muted">Just your first name or a nickname. It’s only used to say hi.</p></div>
        <div class="set"><h3>Theme</h3>${seg('theme', [['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']])}</div>
        <div class="set"><h3>Text size</h3>${seg('text', [['s', 'Smaller'], ['m', 'Default'], ['l', 'Larger']])}</div>
        <div class="set"><h3>Motion</h3>${seg('motion', [['on', 'Animations on'], ['off', 'Reduce motion']])}</div>
        <div class="set"><h3>What’s saved, and where</h3><p class="small">In this prototype, your progress, answers and toolkit stay in this browser only. In the real app they save to your account, and this screen shows exactly what’s stored and who can see it.</p></div>
        <div class="set"><h3>Start the demo over</h3><button class="btn" id="reset">Reset sample progress</button><div id="confirm" hidden><p style="margin:8px 0"><b>Reset everything in this demo?</b></p><div style="display:flex;gap:8px"><button class="btn primary" id="yes">Yes, reset</button><button class="btn" id="no">Cancel</button></div></div></div>
      </div>`;
    $('#nm').addEventListener('input', e => { S.name = e.target.value.trim() || 'there'; save(); });
    main.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => { S[b.dataset.set] = b.dataset.v; save(); applyPrefs(); me(); main.querySelector(`[data-set="${b.dataset.set}"][data-v="${b.dataset.v}"]`).focus(); }));
    $('#reset').addEventListener('click', () => { $('#confirm').hidden = false; $('#yes').focus(); });
    $('#no').addEventListener('click', () => { $('#confirm').hidden = true; });
    $('#yes').addEventListener('click', () => { S = sample(); save(); applyPrefs(); say('Demo reset.'); location.hash = '#today'; });
  }

  applyPrefs(); route();
})();
