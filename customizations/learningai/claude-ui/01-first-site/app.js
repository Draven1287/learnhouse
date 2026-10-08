/* App shell: routing, progress (this device only), lesson player, course map, notebook. */
(function () {
  const LESSONS = window.LAI_LESSONS, LABS = window.LAI_LABS;
  const KEY = 'learning-ai-progress-v1';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app'), live = $('#live'), chip = $('#save-chip');

  /* ---------- state ---------- */
  let state = { lessons: {}, savedAt: null }, storage = 'ok';
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.lessons) state = s; } catch (e) { storage = 'blocked'; }
  function save() {
    try { state.savedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify(state)); storage = 'ok'; } catch (e) { storage = 'blocked'; }
    paintChip();
  }
  function paintChip() {
    if (storage === 'blocked') { chip.className = 'save-chip bad'; chip.innerHTML = '<span aria-hidden="true">!</span> Not saving: this browser blocks storage'; return; }
    if (!state.savedAt) { chip.className = 'save-chip'; chip.innerHTML = '<span aria-hidden="true">▢</span> Progress saves on this device'; return; }
    const t = new Date(state.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    chip.className = 'save-chip ok'; chip.innerHTML = `<span aria-hidden="true">✓</span> Saved on this device · ${t}`;
  }
  const lp = id => state.lessons[id] || (state.lessons[id] = { step: 0, done: false, steps: {} });
  const sp = (id, i) => { const l = lp(id); return l.steps[i] || (l.steps[i] = {}); };
  const announce = m => { live.textContent = ''; setTimeout(() => live.textContent = m, 30); };
  function status(l) { const p = state.lessons[l.id]; if (!p || (!p.done && p.step === 0 && !Object.keys(p.steps).length)) return { k: 'new', t: 'Not started' }; if (p.done) return { k: 'done', t: 'Done' }; return { k: 'prog', t: `In progress · step ${Math.min(p.step + 1, l.steps.length)} of ${l.steps.length}` }; }
  const doneCount = () => LESSONS.filter(l => state.lessons[l.id]?.done).length;
  const nextLesson = () => LESSONS.find(l => status(l).k === 'prog') || LESSONS.find(l => status(l).k === 'new') || null;

  /* ---------- router ---------- */
  function route() {
    const h = location.hash.slice(1);
    document.querySelectorAll('.nav a').forEach(a => a.removeAttribute('aria-current'));
    if (h === 'course') { home(false); course(); mark('course'); }
    else if (h === 'notebook') { notebook(); mark('notebook'); }
    else if (h.startsWith('l-')) { const l = LESSONS.find(x => x.id === h.slice(2)); l ? lesson(l) : course(); }
    else { home(true); }
    window.scrollTo(0, 0);
  }
  const mark = k => $(`.nav a[href="#${k}"]`)?.setAttribute('aria-current', 'page');
  window.addEventListener('hashchange', route);

  /* ---------- home ---------- */
  function home(full) {
    if (!full) return;
    const nx = nextLesson(), started = doneCount() > 0 || LESSONS.some(l => status(l).k === 'prog');
    app.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <p class="eyebrow">A hands-on course for high schoolers</p>
          <h1>Use AI.<br><span class="hl">Keep your own mind.</span></h1>
          <p class="hero-sub">Eight short lessons where you train a model, catch a confident mistake, and set your own rules. You test the AI; it doesn’t test you.</p>
          <div class="hero-cta">
            <a class="btn primary lg" href="#l-${nx ? nx.id : LESSONS[0].id}">${started && nx ? `Continue: ${esc(nx.title)}` : 'Start lesson 1'}</a>
            <a class="btn lg" href="#course">See all 8 lessons</a>
          </div>
          <p class="meta">About 10–15 minutes per lesson · No account · No AI subscription needed</p>
        </div>
        <div class="hero-demo lab-surface">
          <p class="demo-label"><span class="dot" aria-hidden="true"></span> Live demo · a tiny language model</p>
          <div id="mini"></div>
        </div>
      </section>

      <section class="loop" aria-labelledby="loop-h">
        <h2 id="loop-h">Every lesson runs the same loop</h2>
        <ol class="loop-steps">
          <li><b>Predict</b><span>Commit to a guess before you see the answer.</span></li>
          <li><b>Try</b><span>Run a real lab: train, prompt, sort, simulate.</span></li>
          <li><b>Check</b><span>Test what the AI did against evidence.</span></li>
          <li><b>Decide</b><span>Write what you’d do and why. It goes in your notebook.</span></li>
        </ol>
      </section>

      <section aria-labelledby="map-h">
        <div class="sec-head"><h2 id="map-h">The course</h2><a href="#course">Your progress →</a></div>
        <ol class="lesson-grid">${LESSONS.map(l => { const s = status(l); return `<li><a class="lcard" href="#l-${l.id}">
          <span class="lcard-top"><span class="lnum mono">L${l.n}</span><span class="pill ${s.k}">${s.k === 'done' ? '✓ Done' : s.k === 'prog' ? '◐ In progress' : `${l.mins} min`}</span></span>
          <span class="lcard-t">${esc(l.title)}</span><span class="lcard-s">${esc(l.summary)}</span><span class="skill mono">${esc(l.skill)}</span></a></li>`; }).join('')}</ol>
      </section>

      <section class="teachers" aria-labelledby="t-h">
        <h2 id="t-h">Built for classrooms</h2>
        <div class="t-grid">
          <div><b>No accounts, no AI subscriptions</b><p>Every lab runs in the browser with prepared examples. Students never sign up for an outside tool.</p></div>
          <div><b>Nothing leaves the device</b><p>Progress and reflections are stored in this browser only. Nothing is sent anywhere.</p></div>
          <div><b>Judgment, not fear</b><p>Students learn what AI is good at, where it fails, and how to check it. No hype and no doom.</p></div>
        </div>
      </section>`;
    LABS.nextwordMini($('#mini'));
  }

  /* ---------- course map ---------- */
  function course() {
    const n = doneCount(), nx = nextLesson();
    app.innerHTML = `
      <section class="page-head"><p class="eyebrow">Course</p><h1>Your progress</h1>
        <div class="progress-line"><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="${n}" aria-label="${n} of 8 lessons done"><i style="width:${n / 8 * 100}%"></i></div><p><b>${n} of 8</b> lessons done</p></div>
      </section>
      ${nx ? `<a class="resume" href="#l-${nx.id}"><span class="eyebrow">${status(nx).k === 'prog' ? 'Pick up where you left off' : 'Up next'}</span><span class="resume-t">L${nx.n} · ${esc(nx.title)}</span><span class="meta">${esc(status(nx).t)} · about ${nx.mins} min</span><span class="btn primary">${status(nx).k === 'prog' ? 'Continue' : 'Start'}</span></a>` : `<div class="resume done"><span class="resume-t">You finished the course.</span><a class="btn" href="#notebook">Open your notebook</a></div>`}
      <ol class="course-list">${LESSONS.map(l => { const s = status(l); return `<li class="crow ${s.k}"><a href="#l-${l.id}">
        <span class="lnum mono">L${l.n}</span>
        <span class="crow-main"><span class="crow-t">${esc(l.title)}</span><span class="meta">${esc(l.summary)}</span></span>
        <span class="crow-meta"><span class="skill mono">${esc(l.skill)}</span><span class="meta">${l.mins} min</span><span class="pill ${s.k}">${s.k === 'done' ? '✓ ' : s.k === 'prog' ? '◐ ' : ''}${esc(s.t)}</span></span></a></li>`; }).join('')}</ol>`;
  }

  /* ---------- notebook ---------- */
  function notebook() {
    const entries = LESSONS.map(l => ({ l, notes: l.steps.map((s, i) => s.type === 'reflect' ? { q: s.prompt, a: state.lessons[l.id]?.steps?.[i]?.text } : null).filter(x => x && x.a && x.a.trim()) })).filter(e => e.notes.length);
    app.innerHTML = `
      <section class="page-head"><p class="eyebrow">Notebook</p><h1>Your thinking, in one place</h1>
        <p class="lede">Every reflection you write lands here. It stays in this browser. Copy it if you want to keep it somewhere else.</p></section>
      ${entries.length ? `<div class="btn-row"><button class="btn" id="nb-copy">Copy all</button><span class="meta" id="nb-st" aria-live="polite"></span></div>
        <div class="nb">${entries.map(e => `<article class="nb-entry"><p class="mono meta">L${e.l.n} · ${esc(e.l.title)}</p>${e.notes.map(n => `<h3>${esc(n.q)}</h3><p>${esc(n.a).replace(/\n/g, '<br>')}</p>`).join('')}</article>`).join('')}</div>`
        : `<div class="empty"><p>No entries yet. Each lesson ends with one short question. Your answer appears here.</p><a class="btn primary" href="#l-${(nextLesson() || LESSONS[0]).id}">Start a lesson</a></div>`}
      <div class="danger"><h2>Start over</h2><p class="meta">Removes all progress and notebook entries from this browser.</p>
        <button class="btn ghost" id="nb-clear">Clear everything</button>
        <div id="nb-confirm" hidden><p><b>This can’t be undone.</b> Clear all progress on this device?</p><div class="btn-row"><button class="btn danger-btn" id="nb-yes">Yes, clear it</button><button class="btn" id="nb-no">Keep everything</button></div></div></div>`;
    $('#nb-copy')?.addEventListener('click', () => { const t = entries.map(e => `L${e.l.n} ${e.l.title}\n` + e.notes.map(n => `Q: ${n.q}\nA: ${n.a}`).join('\n')).join('\n\n'); navigator.clipboard?.writeText(t).then(() => $('#nb-st').textContent = 'Copied.', () => $('#nb-st').textContent = 'Couldn’t copy automatically. Select the text instead.'); });
    $('#nb-clear').addEventListener('click', () => { $('#nb-confirm').hidden = false; $('#nb-yes').focus(); });
    $('#nb-no').addEventListener('click', () => { $('#nb-confirm').hidden = true; $('#nb-clear').focus(); });
    $('#nb-yes').addEventListener('click', () => { state = { lessons: {}, savedAt: null }; try { localStorage.removeItem(KEY); } catch (e) { } paintChip(); announce('Progress cleared.'); notebook(); });
  }

  /* ---------- lesson player ---------- */
  function lesson(l) {
    const p = lp(l.id); const total = l.steps.length;
    if (p.step > total) p.step = total;
    const i = p.step, step = l.steps[i];
    const free = s => ['intro', 'takeaway'].includes(s.type);
    app.innerHTML = `
      <div class="lesson">
        <div class="lesson-bar">
          <a class="back" href="#course">← All lessons</a>
          <p class="mono meta">L${l.n} · ${esc(l.title)}</p>
        </div>
        <ol class="steps-track" aria-label="Lesson steps">${l.steps.map((s, k) => `<li class="${k < i || p.done ? 'is-done' : ''} ${k === i ? 'is-current' : ''}"><button class="track-btn" data-go="${k}" ${k > i && !p.done && !sp(l.id, k).done && !(k <= maxReached(l)) ? 'disabled' : ''} aria-label="Step ${k + 1}: ${label(s)}${k === i ? ' (current)' : ''}${sp(l.id, k).done || p.done ? ', done' : ''}"><i></i></button></li>`).join('')}</ol>
        <div class="stage" id="stage"></div>
        <div class="lesson-nav" ${i >= total ? 'hidden' : ''}>
          <button class="btn" id="prev" ${i === 0 ? 'disabled' : ''}>Back</button>
          <p class="meta mono">Step ${Math.min(i + 1, total)} of ${total}</p>
          <button class="btn primary" id="next">${i === total - 1 ? 'Finish lesson' : 'Next'}</button>
        </div>
        <p class="meta next-why" id="next-why" hidden></p>
      </div>`;
    const stage = $('#stage');
    if (i >= total) { finish(l, stage); return; }
    const st = sp(l.id, i);
    const nextBtn = $('#next'), why = $('#next-why');
    function gate() { const ok = free(step) || st.done; nextBtn.disabled = !ok; why.hidden = ok; why.textContent = ok ? '' : gateText(step); }
    const ctx = { data: st.data || (st.data = {}), save, announce, done() { if (!st.done) { st.done = true; save(); gate(); announce('Done. You can go to the next step.'); } } };
    renderStep(l, i, step, st, stage, ctx, gate);
    if (free(step)) st.done = true;
    gate();
    $('#prev').addEventListener('click', () => { p.step = i - 1; save(); lesson(l); focusStage(); });
    nextBtn.addEventListener('click', () => { p.step = i + 1; p.max = Math.max(p.max || 0, p.step); if (p.step >= total) { p.done = true; p.doneAt = Date.now(); } save(); lesson(l); focusStage(); });
    app.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { p.step = +b.dataset.go; save(); lesson(l); focusStage(); }));
    save();
  }
  const maxReached = l => state.lessons[l.id]?.max || 0;
  const label = s => ({ intro: 'Read', predict: 'Predict', sort: 'Sort', lab: 'Lab', quiz: 'Check', reflect: 'Reflect', takeaway: 'Takeaways' }[s.type]);
  const gateText = s => ({ predict: 'Make a prediction to continue.', sort: 'Sort every card and check your answers to continue.', lab: 'Finish the lab task to continue.', quiz: 'Answer the question to continue.', reflect: 'Write at least a few words to continue.' }[s.type] || '');
  function focusStage() { const h = $('#stage h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }

  function renderStep(l, i, s, st, el, ctx, gate) {
    const kicker = `<p class="eyebrow">${label(s)}</p>`;
    if (s.type === 'intro') {
      el.innerHTML = `<article class="card prose">${kicker}<h2>${esc(s.title)}</h2>${s.body}${s.points ? `<ul class="points">${s.points.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}</article>`;
    }
    if (s.type === 'predict' || s.type === 'quiz') {
      const isQ = s.type === 'quiz';
      const draw = () => {
        const picked = st.choice;
        el.innerHTML = `<article class="card">${kicker}<h2>${esc(s.q)}</h2>
          <div class="opts" role="group" aria-label="Answer options">${s.options.map((o, k) => { const cls = picked == null ? '' : k === s.correct ? 'right' : k === picked ? 'wrong' : 'dim'; return `<button class="opt ${cls}" data-k="${k}" aria-pressed="${picked === k}" ${picked != null ? 'disabled' : ''}><span class="opt-mark" aria-hidden="true">${picked == null ? String.fromCharCode(65 + k) : k === s.correct ? '✓' : k === picked ? '✗' : String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></button>`; }).join('')}</div>
          ${picked != null ? `<div class="reveal ${picked === s.correct ? 'ok' : 'no'}" tabindex="-1"><p class="reveal-h">${picked === s.correct ? (isQ ? '✓ Right on your first try.' : '✓ Your prediction held up.') : (isQ ? '✗ Not this time. The answer is marked ✓.' : '✗ Not quite, and that’s what predictions are for.')}</p><p>${isQ ? s.explain : s.reveal}</p>${isQ ? '' : '<p class="meta">Predictions are locked once you choose, so you can see how your thinking changes.</p>'}</div>` : `<p class="meta">${isQ ? 'You get one try. The explanation shows after you answer.' : 'Pick what you really think. Nothing is graded.'}</p>`}
        </article>`;
        el.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { st.choice = +b.dataset.k; ctx.done(); draw(); el.querySelector('.reveal')?.focus(); }));
      };
      draw();
    }
    if (s.type === 'sort') {
      st.data = st.data || {}; const d = st.data; d.place = d.place || {};
      const draw = () => {
        const all = s.cards.every((_, k) => d.place[k] != null);
        el.innerHTML = `<article class="card">${kicker}<h2>${esc(s.prompt)}</h2>
          <ul class="sort">${s.cards.map((c, k) => { const pl = d.place[k], right = d.checked && pl === c.bin; return `<li class="sort-row ${d.checked ? (right ? 'ok' : 'no') : ''}">
            <span class="sort-t">${esc(c.t)}</span>
            <span class="seg-btns" role="group" aria-label="Where does ${esc(c.t)} go?">${s.bins.map((b, j) => `<button class="sb" data-k="${k}" data-j="${j}" aria-pressed="${pl === j}">${esc(b)}</button>`).join('')}</span>
            ${d.checked ? `<span class="sort-why">${right ? '✓' : `✗ Best fit: <b>${esc(s.bins[c.bin])}</b>.`} ${esc(c.why)}</span>` : ''}</li>`; }).join('')}</ul>
          <div class="btn-row"><button class="btn primary" id="sort-check" ${all ? '' : 'disabled'}>${d.checked ? 'Check again' : 'Check my sort'}</button><span class="meta">${d.checked ? `${s.cards.filter((c, k) => d.place[k] === c.bin).length} of ${s.cards.length} match` : `${Object.keys(d.place).length} of ${s.cards.length} sorted`}</span></div></article>`;
        el.querySelectorAll('.sb').forEach(b => b.addEventListener('click', () => { d.place[b.dataset.k] = +b.dataset.j; save(); const k = b.dataset.k, j = b.dataset.j; draw(); el.querySelector(`.sb[data-k="${k}"][data-j="${j}"]`).focus(); }));
        el.querySelector('#sort-check').addEventListener('click', () => { d.checked = true; ctx.done(); draw(); announce(`${s.cards.filter((c, k) => d.place[k] === c.bin).length} of ${s.cards.length} match.`); });
      };
      draw();
    }
    if (s.type === 'lab') {
      el.innerHTML = `<article class="card lab">${kicker}<h2>${esc(s.title)}</h2><div class="task"><span class="task-tag mono">Your task</span><p>${s.task}</p></div><div class="lab-body lab-surface"></div></article>`;
      LABS[s.lab](el.querySelector('.lab-body'), ctx);
    }
    if (s.type === 'reflect') {
      el.innerHTML = `<article class="card">${kicker}<h2>Your turn to decide</h2>
        <label class="fld-label" for="reflect">${esc(s.prompt)}</label>
        <textarea id="reflect" class="input" rows="5" placeholder="${esc(s.placeholder || '')}">${esc(st.text || '')}</textarea>
        <p class="meta">Saved to your notebook on this device as you type. No one else sees it.</p></article>`;
      const ta = el.querySelector('#reflect');
      const chk = () => { const words = ta.value.trim().split(/\s+/).filter(Boolean).length; st.done = words >= 3; gate(); };
      ta.addEventListener('input', () => { st.text = ta.value; chk(); save(); });
      chk();
    }
  }

  function finish(l, el) {
    const idx = LESSONS.indexOf(l), nx = LESSONS[idx + 1];
    const solo = l.steps.map((s, i) => ({ s, st: state.lessons[l.id].steps[i] || {} }));
    const q = solo.filter(x => x.s.type === 'quiz'), qRight = q.filter(x => x.st.choice === x.s.correct).length;
    const pr = solo.filter(x => x.s.type === 'predict'), pRight = pr.filter(x => x.st.choice === x.s.correct).length;
    el.innerHTML = `<article class="card finish">
      <p class="eyebrow">Lesson ${l.n} complete</p><h2>${esc(l.title)}: done.</h2>
      <ul class="finish-list">
        ${pr.length ? `<li><b>Predictions:</b> ${pRight} of ${pr.length} held up. Wrong predictions are how the lesson works.</li>` : ''}
        <li><b>Lab:</b> finished${l.steps.some(s => s.type === 'lab') ? '' : ' (no lab)'}.</li>
        ${q.length ? `<li><b>Check question:</b> ${qRight ? 'right on your first try' : 'missed on the first try (the explanation is in the lesson)'}.</li>` : ''}
        <li><b>Notebook:</b> your reflection is saved on this device.</li>
      </ul>
      <div class="btn-row">${nx ? `<a class="btn primary lg" href="#l-${nx.id}">Next: ${esc(nx.title)}</a>` : `<a class="btn primary lg" href="#notebook">Open your notebook</a>`}<a class="btn" href="#course">All lessons</a><button class="btn ghost" id="redo">Review this lesson</button></div></article>`;
    $('#redo').addEventListener('click', () => { state.lessons[l.id].step = 0; save(); lesson(l); focusStage(); });
    announce(`Lesson ${l.n} complete.`);
  }

  paintChip(); route();
})();
