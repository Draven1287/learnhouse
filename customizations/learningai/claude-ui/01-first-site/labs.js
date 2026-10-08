/* Interactive labs. Each lab is mount(el, ctx); ctx = { done(), data (persisted object), save(), announce(msg) }. */
(function () {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const rgba = (hex, a) => { const m = hex.replace('#', ''); const n = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function gauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const clamp = v => Math.max(0.03, Math.min(0.97, v));

  /* ---------- 1. Spam classifier (logistic regression on two features) ---------- */
  function classifier(el, ctx) {
    const d = ctx.data; d.tests = d.tests || 0; d.mislabels = d.mislabels || 0;
    const sample = (r, c) => { const m = c ? [0.68, 0.64] : [0.3, 0.33]; return { x: clamp(m[0] + gauss(r) * 0.14), y: clamp(m[1] + gauss(r) * 0.14), c }; };
    let train, test, model, tested, r2;
    function reset() {
      const r = rng(7); train = []; for (let i = 0; i < 12; i++) { train.push(sample(r, 1)); train.push(sample(r, 0)); }
      const rt = rng(99); test = []; for (let i = 0; i < 10; i++) { test.push(sample(rt, 1)); test.push(sample(rt, 0)); }
      r2 = rng(31); model = null; tested = false;
    }
    reset();
    el.innerHTML = `
      <div class="clf">
        <div class="clf-canvas"><canvas role="img" aria-label="Scatter chart of example emails"></canvas>
          <div class="axis-y" aria-hidden="true">↑ More words in ALL CAPS</div><div class="axis-x" aria-hidden="true">More links in the email →</div></div>
        <div class="clf-side">
          <div class="legend"><span><i class="lgd sq"></i>Spam</span><span><i class="lgd ci"></i>Not spam</span><span><i class="lgd ring"></i>New test email</span></div>
          <fieldset class="seg"><legend>Click the chart to add</legend>
            <label><input type="radio" name="clf-add" value="1" checked> Spam</label>
            <label><input type="radio" name="clf-add" value="0"> Not spam</label></fieldset>
          <div class="btn-col">
            <button class="btn primary" data-a="train">Train</button>
            <button class="btn" data-a="test">Test on 20 new emails</button>
            <button class="btn" data-a="bad">Add 4 mislabelled examples</button>
            <button class="btn ghost" data-a="reset">Reset lab</button>
          </div>
          <dl class="stats" aria-live="polite"></dl>
        </div>
      </div>`;
    const cv = el.querySelector('canvas'), g = cv.getContext('2d'), stats = el.querySelector('.stats');
    let W = 0, H = 0;
    function size() { const w = cv.parentElement.clientWidth; W = w; H = Math.round(Math.min(380, Math.max(240, w * 0.72))); const dpr = window.devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px'; g.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
    const prob = (m, p) => 1 / (1 + Math.exp(-(m.w1 * (p.x - 0.5) + m.w2 * (p.y - 0.5) + m.b)));
    function acc(set) { if (!model) return null; let ok = 0; set.forEach(p => { if ((prob(model, p) >= 0.5 ? 1 : 0) === p.c) ok++; }); return ok; }
    function draw() {
      const spam = css('--bad'), ham = css('--accent'), ink = css('--ink'), line = css('--line');
      g.clearRect(0, 0, W, H);
      if (model) { const s = 10; for (let x = 0; x < W; x += s) for (let y = 0; y < H; y += s) { const p = prob(model, { x: (x + s / 2) / W, y: 1 - (y + s / 2) / H }); g.fillStyle = p >= 0.5 ? rgba(spam, Math.min(0.28, (p - 0.5) * 0.6)) : rgba(ham, Math.min(0.28, (0.5 - p) * 0.6)); g.fillRect(x, y, s, s); } }
      g.strokeStyle = line; g.lineWidth = 1; for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * W / 10, 0); g.lineTo(i * W / 10, H); g.moveTo(0, i * H / 10); g.lineTo(W, i * H / 10); g.stroke(); }
      if (model) { g.strokeStyle = ink; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); let first = true; for (let x = 0; x <= W; x += 4) { const px = x / W - 0.5; if (Math.abs(model.w2) < 1e-6) break; const py = -(model.w1 * px + model.b) / model.w2 + 0.5; const y = (1 - py) * H; if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); } g.stroke(); g.setLineDash([]); }
      train.forEach(p => { const x = p.x * W, y = (1 - p.y) * H; g.fillStyle = p.c ? spam : ham; g.strokeStyle = css('--surface'); g.lineWidth = 1.5; if (p.c) { g.fillRect(x - 6, y - 6, 12, 12); g.strokeRect(x - 6, y - 6, 12, 12); } else { g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.fill(); g.stroke(); } });
      if (tested) test.forEach(p => { const x = p.x * W, y = (1 - p.y) * H; const right = (prob(model, p) >= 0.5 ? 1 : 0) === p.c; g.strokeStyle = right ? ink : spam; g.lineWidth = right ? 1.5 : 2.5; g.beginPath(); g.arc(x, y, right ? 7 : 9, 0, 7); g.stroke(); if (!right) { g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke(); } });
      const ta = acc(train), te = tested ? acc(test) : null;
      stats.innerHTML = `<div><dt>Training examples</dt><dd>${train.length}${d.mislabels ? ` <small>(${d.mislabels} mislabelled)</small>` : ''}</dd></div>
        <div><dt>Right on training</dt><dd>${ta == null ? '—' : `${ta} of ${train.length}`}</dd></div>
        <div><dt>Right on new emails</dt><dd>${te == null ? '—' : `<b>${te} of 20</b>`}</dd></div>`;
      cv.setAttribute('aria-label', `Chart of ${train.length} training emails.${model ? ' A dashed boundary splits spam from not spam.' : ' Not trained yet.'}${tested ? ` On 20 new emails the filter got ${te} right.` : ''}`);
    }
    function trainIt() {
      model = { w1: 0, w2: 0, b: 0 }; tested = false; let it = 0; const total = 900, per = reduced() ? total : 15;
      const stepFn = () => { for (let k = 0; k < per && it < total; k++, it++) { let a = 0, b = 0, c = 0; train.forEach(p => { const e = prob(model, p) - p.c; a += e * (p.x - 0.5); b += e * (p.y - 0.5); c += e; }); const n = train.length; model.w1 -= 4 * a / n; model.w2 -= 4 * b / n; model.b -= 4 * c / n; } draw(); if (it < total) requestAnimationFrame(stepFn); else ctx.announce(`Trained. ${acc(train)} of ${train.length} training emails sorted correctly.`); };
      stepFn();
    }
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'train') trainIt();
      if (a === 'test') { if (!model) { ctx.announce('Train the filter first.'); stats.insertAdjacentHTML('beforeend', '<p class="warn-line">Train the filter first.</p>'); return; } tested = true; d.tests++; draw(); ctx.announce(`Tested on 20 new emails: ${acc(test)} right.`); }
      if (a === 'bad') { for (let i = 0; i < 4; i++) { const p = sample(r2, 1); p.c = 0; train.push(p); } d.mislabels += 4; model = null; tested = false; draw(); ctx.announce('Added 4 spam-looking emails labelled “not spam”. Train again.'); }
      if (a === 'reset') { reset(); d.mislabels = 0; draw(); }
      ctx.save();
      if (d.tests >= 2 && d.mislabels > 0) ctx.done();
    });
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); const c = +el.querySelector('input[name="clf-add"]:checked').value; train.push({ x: clamp((e.clientX - r.left) / r.width), y: clamp(1 - (e.clientY - r.top) / r.height), c }); model = null; tested = false; draw(); });
    new ResizeObserver(size).observe(cv.parentElement); size();
    if (d.tests >= 2 && d.mislabels > 0) ctx.done();
  }

  /* ---------- 2. Tiny n-gram language model ---------- */
  const CORPUS = `the biggest city in australia is sydney.
a famous city in australia is sydney.
the best known harbour in australia is sydney.
the capital of australia is canberra.
the capital of france is paris.
the capital of japan is tokyo.
the biggest city in japan is tokyo.
my homework is due on friday.
my homework is on the kitchen table.
the test is on friday.
the test is harder than the homework.
i think the test is on monday.
we have practice after school on monday.
after school we go to the library.
the library is open until five.
my friend is good at math.
my friend is in the band.
the band plays on friday night.
the cafeteria serves pizza on friday.
the cafeteria is loud at lunch.
i forgot my phone at home.
i forgot my homework at home.
the bus is late again.
the bus comes at seven.
our teacher says the essay is due on friday.
our teacher is fair but strict.
the model learns patterns from examples.
the model predicts the next word.
a model can sound sure and still be wrong.
check the source before you share it.`;
  const tokenize = t => t.toLowerCase().replace(/[^a-z0-9'.\s]/g, ' ').replace(/\./g, ' . ').split(/\s+/).filter(Boolean);
  function buildModel(text) {
    const m = { uni: {}, bi: {}, tri: {} }; const add = (t, k, w) => { const o = t[k] || (t[k] = {}); o[w] = (o[w] || 0) + 1; };
    let p2 = '<s>', p1 = '<s>';
    tokenize(text).forEach(w => { add(m.uni, '', w); add(m.bi, p1, w); add(m.tri, p2 + ' ' + p1, w); if (w === '.') { p2 = p1 = '<s>'; } else { p2 = p1; p1 = w; } });
    return m;
  }
  function nextDist(m, text, temp = 1) {
    const toks = tokenize(text); let p2 = '<s>', p1 = '<s>';
    toks.forEach(w => { if (w === '.') { p2 = p1 = '<s>'; } else { p2 = p1; p1 = w; } });
    let table = m.tri[p2 + ' ' + p1], source = p2 === '<s>' ? (p1 === '<s>' ? 'the start of a sentence' : `“${p1}”`) : `“${p2} ${p1}”`;
    if (!table) { table = m.bi[p1]; source = p1 === '<s>' ? 'the start of a sentence' : `“${p1}” only (no match for the last two words)`; }
    if (!table) { table = m.uni['']; source = 'overall word counts (never saw these words)'; }
    const items = Object.entries(table).map(([w, c]) => ({ w, c, wt: Math.pow(c, 1 / temp) }));
    const tot = items.reduce((s, i) => s + i.wt, 0), seen = items.reduce((s, i) => s + i.c, 0);
    items.forEach(i => i.p = i.wt / tot); items.sort((a, b) => b.p - a.p);
    return { items, source, seen };
  }
  const join = (text, w) => w === '.' ? text.replace(/\s+$/, '') + '.' : (text.trim() ? text.replace(/\s+$/, '') + ' ' : '') + w;
  function sampleFrom(items) { let r = Math.random(), acc = 0; for (const i of items) { acc += i.p; if (r <= acc) return i.w; } return items[items.length - 1].w; }

  function nextword(el, ctx) {
    const d = ctx.data; d.clicks = d.clicks || 0; d.gens = d.gens || 0;
    let corpus = d.corpus || CORPUS, model = buildModel(corpus);
    el.innerHTML = `
      <div class="nw">
        <label class="fld-label" for="nw-input">Start of a sentence</label>
        <div class="nw-row"><input id="nw-input" class="input mono" value="${esc(d.text || 'the capital of australia is')}" autocomplete="off" spellcheck="false"><button class="btn ghost" data-a="clear">Clear</button></div>
        <p class="nw-src meta"></p>
        <div class="chips" role="group" aria-label="Most likely next words. Choose one to add it."></div>
        <div class="nw-gen">
          <label class="fld-label" for="nw-temp">Randomness <output id="nw-temp-out">1.0</output></label>
          <input id="nw-temp" type="range" min="0.2" max="2" step="0.1" value="1">
          <div class="range-ends meta"><span>Always the top word</span><span>Wilder picks</span></div>
          <button class="btn primary" data-a="gen">Write the rest</button>
        </div>
        <details class="nw-train"><summary>Training text (${corpus.split('\n').length} sentences): edit it and retrain</summary>
          <label class="fld-label" for="nw-corpus">Every sentence the model has ever seen</label>
          <textarea id="nw-corpus" class="input mono" rows="8" spellcheck="false">${esc(corpus)}</textarea>
          <div class="btn-row"><button class="btn" data-a="retrain">Retrain</button><button class="btn ghost" data-a="restore">Restore original</button></div>
        </details>
        <p class="meta" aria-live="polite" id="nw-status"></p>
      </div>`;
    const input = el.querySelector('#nw-input'), chips = el.querySelector('.chips'), src = el.querySelector('.nw-src'), temp = el.querySelector('#nw-temp'), out = el.querySelector('#nw-temp-out'), status = el.querySelector('#nw-status');
    function check() { if (d.clicks >= 2 && d.gens >= 1) ctx.done(); }
    function render() {
      const dist = nextDist(model, input.value, 1);
      src.innerHTML = `Looking at ${esc(dist.source)}. Seen ${dist.seen} time${dist.seen === 1 ? '' : 's'} in training.`;
      chips.innerHTML = dist.items.slice(0, 6).map(i => `<button class="chip" data-w="${esc(i.w)}"><span class="chip-w mono">${i.w === '.' ? '. (end)' : esc(i.w)}</span><span class="chip-bar"><i style="width:${Math.max(3, i.p * 100)}%"></i></span><span class="chip-p mono">${Math.round(i.p * 100)}%</span></button>`).join('');
      d.text = input.value;
    }
    input.addEventListener('input', () => { render(); ctx.save(); });
    temp.addEventListener('input', () => out.textContent = (+temp.value).toFixed(1));
    el.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (chip) { input.value = join(input.value, chip.dataset.w); d.clicks++; render(); ctx.save(); check(); return; }
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'clear') { input.value = ''; render(); input.focus(); }
      if (a === 'gen') { let t = input.value; for (let k = 0; k < 12; k++) { const w = sampleFrom(nextDist(model, t, +temp.value).items); t = join(t, w); if (w === '.') break; } input.value = t; d.gens++; render(); status.textContent = `Wrote: “${t}” (randomness ${(+temp.value).toFixed(1)})`; check(); }
      if (a === 'retrain') { corpus = el.querySelector('#nw-corpus').value; d.corpus = corpus; model = buildModel(corpus); render(); status.textContent = 'Retrained on your edited text. Predictions now follow your sentences.'; d.retrained = true; }
      if (a === 'restore') { corpus = CORPUS; delete d.corpus; el.querySelector('#nw-corpus').value = CORPUS; model = buildModel(corpus); render(); status.textContent = 'Back to the original training text.'; }
      ctx.save();
    });
    render(); check();
  }

  /* Hero version: compact, no persistence */
  function nextwordMini(el) {
    const model = buildModel(CORPUS);
    el.innerHTML = `<label class="fld-label" for="mini-input">Type the start of a sentence</label>
      <input id="mini-input" class="input mono" value="the capital of australia is" autocomplete="off" spellcheck="false">
      <div class="chips mini" role="group" aria-label="Most likely next words"></div>
      <p class="mini-note"></p>`;
    const input = el.querySelector('input'), chips = el.querySelector('.chips'), note = el.querySelector('.mini-note');
    function render() {
      const dist = nextDist(model, input.value, 1);
      chips.innerHTML = dist.items.slice(0, 4).map(i => `<button class="chip" data-w="${esc(i.w)}"><span class="chip-w mono">${i.w === '.' ? '. (end)' : esc(i.w)}</span><span class="chip-bar"><i style="width:${Math.max(3, i.p * 100)}%"></i></span><span class="chip-p mono">${Math.round(i.p * 100)}%</span></button>`).join('');
      const top = dist.items[0];
      note.innerHTML = /australia is\s*$/i.test(input.value) ? `It picks <b>sydney</b> because that pattern is more common in its training text. The capital is Canberra. <b>Likely isn’t the same as true.</b>` : `Picked from patterns in ~30 training sentences. Top guess: <b class="mono">${esc(top.w)}</b>. Choose a word to add it.`;
    }
    input.addEventListener('input', render);
    chips.addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; input.value = join(input.value, c.dataset.w); render(); });
    render();
  }

  /* ---------- 3. Calibration game ---------- */
  const STATEMENTS = [
    { s: 'Sealed honey can stay edible for decades or longer.', a: true },
    { s: 'The Great Wall of China is visible to the naked eye from the Moon.', a: false },
    { s: 'An octopus has three hearts.', a: true },
    { s: 'Lightning never strikes the same place twice.', a: false },
    { s: 'Botanically, a banana is a berry.', a: true },
    { s: 'Humans use only 10% of their brains.', a: false },
    { s: 'A group of crows can be called a “murder”.', a: true },
    { s: 'Goldfish can only remember things for about three seconds.', a: false }
  ];
  const CONF = [55, 70, 85, 99];
  function calibration(el, ctx) {
    const d = ctx.data; d.ans = d.ans || {};
    function render() {
      const all = STATEMENTS.every((_, i) => d.ans[i] && d.ans[i].v != null && d.ans[i].c);
      el.innerHTML = `<ol class="cal-list">${STATEMENTS.map((st, i) => { const a = d.ans[i] || {}; return `<li class="cal-item">
        <p class="cal-s">${esc(st.s)}</p>
        <div class="cal-ctrl"><div class="seg-btns" role="group" aria-label="True or false for statement ${i + 1}">
          <button class="sb" aria-pressed="${a.v === true}" data-i="${i}" data-v="1" ${d.submitted ? 'disabled' : ''}>True</button><button class="sb" aria-pressed="${a.v === false}" data-i="${i}" data-v="0" ${d.submitted ? 'disabled' : ''}>False</button></div>
        <div class="seg-btns" role="group" aria-label="How sure are you about statement ${i + 1}">${CONF.map(c => `<button class="sb" aria-pressed="${a.c === c}" data-i="${i}" data-c="${c}" ${d.submitted ? 'disabled' : ''}>${c}%</button>`).join('')}</div></div>
        ${d.submitted ? `<p class="cal-res ${a.v === st.a ? 'ok' : 'no'}">${a.v === st.a ? '✓ Right' : '✗ Wrong'}: it’s ${st.a ? 'true' : 'false'}.</p>` : ''}</li>`; }).join('')}</ol>
        ${d.submitted ? results() : `<div class="btn-row"><button class="btn primary" data-a="submit" ${all ? '' : 'disabled'}>See my results</button><span class="meta">${Object.values(d.ans).filter(a => a.v != null && a.c).length} of 8 answered</span></div>`}`;
    }
    function results() {
      const rows = CONF.map(c => { const items = STATEMENTS.map((st, i) => ({ ok: d.ans[i].v === st.a, c: d.ans[i].c })).filter(x => x.c === c); return { c, n: items.length, ok: items.filter(x => x.ok).length }; }).filter(r => r.n);
      const right = STATEMENTS.filter((st, i) => d.ans[i].v === st.a).length;
      const avgConf = Math.round(STATEMENTS.reduce((s, _, i) => s + d.ans[i].c, 0) / 8);
      const gap = avgConf - Math.round(right / 8 * 100);
      const verdict = gap > 12 ? 'You were <b>overconfident</b>: more sure than your results justify.' : gap < -12 ? 'You were <b>underconfident</b>: you knew more than you thought.' : 'You were <b>well calibrated</b>: your confidence matched your results.';
      return `<div class="cal-results" tabindex="-1">
        <h4>Your results</h4>
        <p>You got <b>${right} of 8</b> right with an average confidence of <b>${avgConf}%</b>. ${verdict}</p>
        <div class="cal-chart" role="table" aria-label="Confidence compared with how often you were right">
          <div role="row" class="cal-row head"><span role="columnheader">When you said</span><span role="columnheader">You were right</span><span role="columnheader" class="vh">Bar</span></div>
          ${rows.map(r => `<div role="row" class="cal-row"><span role="cell" class="mono">${r.c}%</span><span role="cell" class="mono">${r.ok} of ${r.n} (${Math.round(r.ok / r.n * 100)}%)</span><span role="cell" class="cal-bars" aria-hidden="true"><i class="said" style="width:${r.c}%"></i><i class="was" style="width:${Math.max(2, r.ok / r.n * 100)}%"></i></span></div>`).join('')}
        </div>
        <p class="meta cal-key"><i class="said"></i> how sure you said you were · <i class="was"></i> how often you were right</p>
        <div class="surebot"><h4>Meet SureBot</h4><p>SureBot answered the same 8 statements. It said <b>“95% confident”</b> every time and got <b>5 of 8</b> right (63%). Its number sounds precise, but it doesn’t match how often it’s right, so the number tells you nothing useful.</p></div>
        <button class="btn ghost" data-a="again">Play again</button></div>`;
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.i != null) { const i = b.dataset.i; const a = d.ans[i] || (d.ans[i] = {}); if (b.dataset.v != null) a.v = b.dataset.v === '1'; if (b.dataset.c) a.c = +b.dataset.c; render(); ctx.save(); el.querySelector(`[data-i="${i}"]${b.dataset.v != null ? `[data-v="${b.dataset.v}"]` : `[data-c="${b.dataset.c}"]`}`)?.focus(); }
      if (b.dataset.a === 'submit') { d.submitted = true; render(); ctx.save(); ctx.done(); el.querySelector('.cal-results')?.focus(); ctx.announce('Results ready.'); }
      if (b.dataset.a === 'again') { d.ans = {}; d.submitted = false; render(); ctx.save(); }
    });
    render(); if (d.submitted) ctx.done();
  }

  /* ---------- 4. Claim checker ---------- */
  const VERDICTS = ['Supported', 'Contradicted', 'Not enough evidence'];
  const CLAIMS = [
    { t: 'The start time moved from 7:35 to 8:20.', a: 0, hints: ['Look for the source card about the schedule.', 'Card S1 gives both times. Do they match?'], why: 'S1 gives exactly those times.' },
    { t: 'Late arrivals fell by 40%.', a: 1, hints: ['Find the before and after numbers.', 'From 250 to 175 is a drop of 75. What fraction of 250 is 75?'], why: '250 → 175 is a drop of 75, which is 30% of 250, not 40%.' },
    { t: 'Most students supported the later start.', a: 2, hints: ['Who actually answered the survey?', '168 people said yes, out of how many students in the whole school?'], why: '168 of 240 respondents (70%) said yes, but only 240 of 1,200 students answered. We don’t know what the other 960 think.' },
    { t: 'A state report proves later starts raise grades.', a: 2, hints: ['Can you find the report?', 'Grades moved from 78.2 to 79.0 with no comparison group. Is that proof?'], why: 'The report can’t be found, and a 0.8-point change with no comparison group can’t prove cause.' }
  ];
  function claims(el, ctx) {
    const d = ctx.data; d.c = d.c || CLAIMS.map(() => ({ first: null, pick: null, hints: 0, checked: false, ok: false, tries: 0 }));
    el.innerHTML = `
      <div class="claims">
        <figure class="ai-answer"><figcaption><span class="tag">AI summary</span> Riverview High (fictional)</figcaption>
          <blockquote>Riverview High moved its start time from 7:35 to 8:20. Late arrivals fell by 40%, most students supported the change, and a state report proves later starts raise grades.</blockquote></figure>
        <section class="sources" aria-labelledby="src-h"><h4 id="src-h">Source cards</h4>
          <div class="src-grid">
            <div class="src"><b class="mono">S1 · Bell schedule</b>Old start 7:35. New start 8:20.</div>
            <div class="src"><b class="mono">S2 · Attendance office</b>Late arrivals per term: 250 before, 175 after.</div>
            <div class="src"><b class="mono">S3 · Student survey</b>Voluntary. 240 of 1,200 students replied. 168 of the 240 supported the change.</div>
            <div class="src"><b class="mono">S4 · Records search</b>No state report matching the citation could be found. Average math grade: 78.2 → 79.0. No comparison school.</div>
          </div></section>
        <ol class="claim-list"></ol>
        <p class="claim-sum" aria-live="polite"></p>
      </div>`;
    const list = el.querySelector('.claim-list'), sum = el.querySelector('.claim-sum');
    function render() {
      list.innerHTML = CLAIMS.map((c, i) => { const s = d.c[i]; return `<li class="claim ${s.ok ? 'is-ok' : ''}">
        <p class="claim-t"><span class="mono claim-n">Claim ${i + 1}</span> “${esc(c.t)}”</p>
        <div class="seg-btns" role="group" aria-label="Verdict for claim ${i + 1}">${VERDICTS.map((v, k) => `<button class="sb" data-i="${i}" data-k="${k}" aria-pressed="${s.pick === k}" ${s.ok ? 'disabled' : ''}>${v}</button>`).join('')}</div>
        ${s.hints ? `<ol class="hint-list">${c.hints.slice(0, s.hints).map((h, k) => `<li><b>Hint ${k + 1}.</b> ${esc(h)}</li>`).join('')}</ol>` : ''}
        <div class="btn-row">${s.ok ? '' : `<button class="btn" data-check="${i}" ${s.pick == null ? 'disabled' : ''}>Check</button>${s.hints < 2 ? `<button class="btn ghost" data-hint="${i}">Show a hint (${s.hints + 1} of 2)</button>` : ''}`}</div>
        ${s.checked ? `<p class="fb ${s.ok ? 'ok' : 'no'}">${s.ok ? `✓ ${VERDICTS[c.a]}. ${esc(c.why)}` : s.tries >= 2 ? `✗ Not yet. The answer is <b>${VERDICTS[c.a]}</b>: ${esc(c.why)}` : '✗ Not quite. Look at the sources again, or open a hint.'}</p>` : ''}
        ${s.first != null ? `<p class="meta first-call">Your first call: ${VERDICTS[s.first]}${s.hints ? ` · hints used: ${s.hints}` : ''}</p>` : ''}
      </li>`; }).join('');
      const done = d.c.filter(s => s.ok || s.tries >= 2).length, solo = d.c.filter((s, i) => s.first === CLAIMS[i].a && s.hints === 0).length;
      sum.innerHTML = done === 4 ? `<b>All four claims checked.</b> Right on your first call with no hints: <b>${solo} of 4</b>.` : `${done} of 4 claims checked.`;
      if (done === 4) ctx.done();
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.k != null) { const s = d.c[b.dataset.i]; s.pick = +b.dataset.k; s.checked = false; render(); el.querySelector(`[data-i="${b.dataset.i}"][data-k="${b.dataset.k}"]`).focus(); }
      if (b.dataset.check != null) { const i = +b.dataset.check, s = d.c[i]; if (s.first == null) s.first = s.pick; s.tries++; s.checked = true; s.ok = s.pick === CLAIMS[i].a; if (!s.ok && s.tries >= 2) s.ok = false; render(); ctx.announce(s.ok ? 'Correct.' : 'Not quite.'); }
      if (b.dataset.hint != null) { const s = d.c[b.dataset.hint]; s.hints = Math.min(2, s.hints + 1); render(); }
      ctx.save();
    });
    render();
  }

  /* ---------- 5. Bias simulator ---------- */
  function bias(el, ctx) {
    const d = ctx.data; d.skew = d.skew ?? 70; d.hide = !!d.hide; d.fair = !!d.fair; d.tried = d.tried || {};
    const SKILLS = [94, 88, 83, 79, 74, 70, 65, 61, 56, 50];
    const names = { N: ['Ava', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jade'], S: ['Kai', 'Lena', 'Milo', 'Nia', 'Omar', 'Pia', 'Quinn', 'Rae', 'Sami', 'Tess'] };
    el.innerHTML = `
      <div class="bias">
        <div class="bias-ctrl">
          <label class="fld-label" for="bias-skew">How skewed was the club’s history? <output id="bias-out"></output></label>
          <input id="bias-skew" type="range" min="0" max="100" step="5" value="${d.skew}">
          <div class="range-ends meta"><span>Fair history</span><span>Mostly North students accepted</span></div>
          <label class="check"><input type="checkbox" id="bias-hide" ${d.hide ? 'checked' : ''}> Hide the “school” column from the model</label>
          <label class="check"><input type="checkbox" id="bias-fair" ${d.fair ? 'checked' : ''}> Retrain on fair historical data</label>
        </div>
        <div class="bias-out" aria-live="polite"></div>
        <div class="bias-grid"></div>
        <p class="meta">20 applicants, 8 places. Both schools have exactly the same skill scores. The model’s score is skill minus whatever it learned to hold against South.</p>
      </div>`;
    const out = el.querySelector('.bias-out'), grid = el.querySelector('.bias-grid');
    function render() {
      el.querySelector('#bias-out').textContent = d.skew + '%';
      let pen = d.skew * 0.32; if (d.hide) pen *= 0.5; if (d.fair) pen = 0;
      const apps = []; ['N', 'S'].forEach(sc => SKILLS.forEach((sk, i) => apps.push({ sc, name: names[sc][i], sk, score: sk - (sc === 'S' ? pen : 0) + (sc === 'N' ? 0.01 : 0) })));
      const picked = new Set([...apps].sort((a, b) => b.score - a.score).slice(0, 8));
      const nN = apps.filter(a => a.sc === 'N' && picked.has(a)).length, nS = 8 - nN;
      const note = d.fair ? 'Retrained on fair history: the penalty is gone.' : d.hide ? 'School is hidden, but bus route and postcode still give it away, so about half the penalty remains.' : pen > 0 ? `The model learned to subtract about ${Math.round(pen)} points from South applicants.` : 'With a fair history, the model holds nothing against either school.';
      out.innerHTML = `<div class="rate"><span class="mono">North</span><span class="rate-bar"><i style="width:${nN * 10}%"></i></span><b class="mono">${nN} of 10</b></div>
        <div class="rate"><span class="mono">South</span><span class="rate-bar s"><i style="width:${nS * 10}%"></i></span><b class="mono">${nS} of 10</b></div><p>${note}</p>`;
      grid.innerHTML = ['N', 'S'].map(sc => `<div class="bias-col"><h5>${sc === 'N' ? 'North High' : 'South High'}</h5><ul>${apps.filter(a => a.sc === sc).map(a => `<li class="${picked.has(a) ? 'in' : ''}"><span>${picked.has(a) ? '✓' : '·'}</span>${a.name}<span class="mono">${a.sk}</span></li>`).join('')}</ul></div>`).join('');
    }
    el.addEventListener('input', e => {
      if (e.target.id === 'bias-skew') d.skew = +e.target.value;
      if (e.target.id === 'bias-hide') { d.hide = e.target.checked; d.tried.hide = true; }
      if (e.target.id === 'bias-fair') { d.fair = e.target.checked; d.tried.fair = true; }
      render(); ctx.save(); if (d.tried.hide && d.tried.fair) ctx.done();
    });
    render(); if (d.tried.hide && d.tried.fair) ctx.done();
  }

  /* ---------- 6. Prompt lab (authored outputs) ---------- */
  const ING = [
    { k: 'who', label: 'Who it’s for', text: 'I’m in 10th grade and cell division confuses me.' },
    { k: 'time', label: 'Time limits', text: 'I have 30 minutes a night, Monday to Thursday. The test is Friday.' },
    { k: 'fmt', label: 'Format', text: 'Put it in a table: day, topic, activity.' },
    { k: 'lim', label: 'Constraint', text: 'No videos. I study on the bus without data.' },
    { k: 'flag', label: 'Checkability', text: 'Mark anything you’re unsure about so I can check it in my textbook.' }
  ];
  function prompt(el, ctx) {
    const d = ctx.data; d.on = d.on || {}; d.runs = d.runs || 0;
    el.innerHTML = `
      <div class="pl">
        <div class="pl-left">
          <fieldset class="ing"><legend>Ingredients</legend>${ING.map(i => `<label class="check"><input type="checkbox" data-k="${i.k}" ${d.on[i.k] ? 'checked' : ''}><span><b>${i.label}</b><br><small>${esc(i.text)}</small></span></label>`).join('')}</fieldset>
        </div>
        <div class="pl-right">
          <p class="fld-label">Your prompt</p><div class="pl-prompt mono"></div>
          <button class="btn primary" data-a="run">Run prompt</button>
          <div class="pl-out" aria-live="polite"></div>
        </div>
      </div>`;
    const pr = el.querySelector('.pl-prompt'), out = el.querySelector('.pl-out');
    const showPrompt = () => pr.textContent = ['Make me a study plan for my biology test.', ...ING.filter(i => d.on[i.k]).map(i => i.text)].join(' ');
    function run() {
      const o = d.on; const days = o.time ? ['Mon', 'Tue', 'Wed', 'Thu'] : ['Week 1', 'Week 1', 'Week 2', 'Week 2'];
      const topics = o.who ? ['What a cell cycle is', 'Mitosis: the 4 stages', 'Mitosis vs. meiosis', 'Practice questions'] : ['Review chapter 1–3', 'Review chapter 4–6', 'Review chapter 7–9', 'Full practice exam'];
      const acts = o.lim ? ['Make 10 flashcards', 'Sketch and label each stage', 'Fill a two-column comparison', 'Quiz yourself from your cards'] : ['Watch a 20-min video lesson', 'Watch an animation of mitosis', 'Watch a comparison video', 'Take an online quiz'];
      const time = o.time ? '30 minutes each night.' : 'Study 1–2 hours a day.';
      const body = o.fmt ? `<table class="pl-table"><thead><tr><th>Day</th><th>Topic</th><th>Activity</th></tr></thead><tbody>${days.map((dy, i) => `<tr><td>${dy}</td><td>${topics[i]}</td><td>${acts[i]}</td></tr>`).join('')}</tbody></table>` : `<p>${days.map((dy, i) => `${dy}: ${topics[i].toLowerCase()} (${acts[i].toLowerCase()})`).join('. ')}.</p>`;
      const flag = o.flag ? '<p class="pl-flag">⚑ I’m assuming your test covers mitosis and meiosis. Check your syllabus. ⚑ Stage names vary between textbooks; use your textbook’s.</p>' : '';
      const crit = [['Fits your situation', o.who && o.time], ['Respects your limits', o.lim && o.time], ['Easy to follow', o.fmt], ['Tells you what to check', o.flag]];
      const score = crit.filter(c => c[1]).length;
      out.innerHTML = `<div class="pl-result"><p class="tag">Sample output</p><p><b>Study plan.</b> ${time}</p>${body}${flag}</div>
        <div class="score"><p class="fld-label">Scorecard: ${score} of 4</p><ul>${crit.map(c => `<li class="${c[1] ? 'ok' : 'no'}">${c[1] ? '✓' : '✗'} ${c[0]}</li>`).join('')}</ul></div>`;
      d.runs++; d.best = Math.max(d.best || 0, score); ctx.save(); if (d.best >= 3) ctx.done();
    }
    el.addEventListener('change', e => { const k = e.target.dataset.k; if (k) { d.on[k] = e.target.checked; showPrompt(); ctx.save(); } });
    el.addEventListener('click', e => { if (e.target.closest('[data-a="run"]')) run(); });
    showPrompt(); if (d.runs) run();
  }

  /* ---------- 7. Rule builder ---------- */
  const RULES = [
    { L: 'C', name: 'Check', opts: ['I check each class’s AI policy before I start.', 'If the rules aren’t clear, I ask my teacher first.'] },
    { L: 'L', name: 'Leave out', opts: ['I never paste my name, address, passwords, or friends’ details.', 'I use made-up examples instead of real people.'] },
    { L: 'E', name: 'Evaluate', opts: ['I check any fact I’d repeat against a second source.', 'I double-check numbers and quotes before using them.'] },
    { L: 'A', name: 'Acknowledge', opts: ['I say when AI helped and how.', 'I keep a note of what I asked and what I changed.'] },
    { L: 'R', name: 'Remain responsible', opts: ['If it’s wrong, it’s my mistake to fix.', 'I only hand in what I can explain myself.'] }
  ];
  function rules(el, ctx) {
    const d = ctx.data; d.r = d.r || {};
    el.innerHTML = `<div class="rb"><div class="rb-form">${RULES.map((r, i) => `<fieldset class="rb-f"><legend><span class="rb-l">${r.L}</span> ${r.name}</legend>
        ${r.opts.map((o, k) => `<label class="radio"><input type="radio" name="rb-${i}" value="${k}" ${d.r[i]?.k === k ? 'checked' : ''}> ${esc(o)}</label>`).join('')}
        <label class="radio"><input type="radio" name="rb-${i}" value="own" ${d.r[i]?.k === 'own' ? 'checked' : ''}> In my own words:</label>
        <input class="input" id="rb-own-${i}" aria-label="${r.name} rule in your own words" value="${esc(d.r[i]?.own || '')}" placeholder="Write your rule"></fieldset>`).join('')}</div>
      <div class="rb-card-wrap"><div class="rb-card" id="rb-card"></div><div class="btn-row"><button class="btn primary" data-a="copy">Copy my rules</button><span class="meta" aria-live="polite" id="rb-st"></span></div></div></div>`;
    const card = el.querySelector('#rb-card');
    const text = i => { const v = d.r[i]; if (!v) return ''; return v.k === 'own' ? (v.own || '').trim() : RULES[i].opts[v.k]; };
    function render() {
      card.innerHTML = `<p class="rb-title">My AI rules</p><ol>${RULES.map((r, i) => `<li><span class="rb-l">${r.L}</span><span>${text(i) ? esc(text(i)) : '<em class="meta">Not chosen yet</em>'}</span></li>`).join('')}</ol>`;
      if (RULES.every((_, i) => text(i))) ctx.done();
    }
    el.addEventListener('change', e => { const m = e.target.name?.match(/^rb-(\d)$/); if (m) { const i = +m[1]; d.r[i] = { ...(d.r[i] || {}), k: e.target.value === 'own' ? 'own' : +e.target.value }; render(); ctx.save(); } });
    el.addEventListener('input', e => { const m = e.target.id?.match(/^rb-own-(\d)$/); if (m) { const i = +m[1]; d.r[i] = { ...(d.r[i] || {}), own: e.target.value, k: 'own' }; el.querySelector(`input[name="rb-${i}"][value="own"]`).checked = true; render(); ctx.save(); } });
    el.addEventListener('click', e => { if (!e.target.closest('[data-a="copy"]')) return; const t = 'My AI rules\n' + RULES.map((r, i) => `${r.L} (${r.name}): ${text(i) || '—'}`).join('\n'); const st = el.querySelector('#rb-st'); navigator.clipboard?.writeText(t).then(() => st.textContent = 'Copied.', () => { st.textContent = 'Couldn’t copy automatically. Select the card text instead.'; }); });
    render();
  }

  window.LAI_LABS = { classifier, nextword, nextwordMini, calibration, claims, bias, prompt, rules };
})();
