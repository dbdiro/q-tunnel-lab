/* Q-Tunnel Lab — antarmuka & visualisasi */
(() => {
  const P = Physics;
  const $ = (id) => document.getElementById(id);
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API = window.QTL_API ?? (isLocal && location.port !== '5000' ? 'http://localhost:5000' : '');

  const state = { E: 3, V0: 5, a: 0.4, m: 1, t: 0 };
  const COL = {};
  const CVMAP = { q: '--q', q2: '--q2', c: '--c', r: '--r', ok: '--ok', grid: '--cv-grid', axis: '--cv-axis', text: '--muted', barrier: '--barrier', barrierLine: '--q2', energy: '--c', vlabel: '--cv-vlabel', legend: '--text2', pointRing: '--cv-ring', bfill1: '--cv-bfill1', bfill2: '--cv-bfill2' };
  function loadColors() { const cs = getComputedStyle(document.documentElement); for (const k in CVMAP) COL[k] = cs.getPropertyValue(CVMAP[k]).trim(); }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    document.querySelectorAll('#themeSwitch button').forEach((b) => b.classList.toggle('on', b.dataset.theme === t));
    try { localStorage.setItem('qtl-theme', t); } catch (e) {}
    loadColors(); drawAll(); if (document.querySelector('#page-analysis.active')) drawAnalysis();
  }
  document.querySelectorAll('#themeSwitch button').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)));

  // ================= util =================
  const fmtPct = (v) => {
    const p = v * 100;
    if (p === 0) return '0 %';
    if (p < 0.01) return p.toExponential(2) + ' %';
    return p.toFixed(p < 10 ? 3 : 2) + ' %';
  };
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUP[c] ?? c).join('');
  /** T dalam persen; bila T terlalu kecil untuk angka biasa, tampilkan sebagai pangkat sepuluh dari log10 T. */
  function fmtT(T, lg) {
    if (T > 1e-300 || !isFinite(lg)) return fmtPct(T);
    const e = lg + 2; // persen
    const ex = Math.floor(e), mant = Math.pow(10, e - ex);
    return '≈ ' + mant.toFixed(2) + '×10' + sup(ex) + ' %';
  }

  function setupCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // ================= navigasi =================
  function go(tab) {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === 'page-' + tab));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.classList.remove('menu-open'); $('menuBtn').setAttribute('aria-expanded', 'false');
    if (tab === 'verify' && !verifiedOnce) { verifiedOnce = true; setTimeout(verifyJS, 30); }
    requestAnimationFrame(() => { drawAll(); if (tab === 'analysis') drawAnalysis(); });
    try { localStorage.setItem('qtl-tab', tab); } catch (e) {}
  }
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => go(b.dataset.goto)));
  let verifiedOnce = false;
  $('menuBtn').addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    $('menuBtn').setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    setParams(JSON.parse(b.dataset.preset)); clearScenario();
    $('scenarioNote').innerHTML = 'Parameter diatur dari contoh penerapan: <b>' + b.closest('.app').querySelector('h4').textContent + '</b>. Amati nilai T dan κa, lalu ubah lebar a sedikit.';
    resetStream(); go('sim');
  }));

  // ================= kontrol =================
  const sE = $('sE'), sV = $('sV'), sA = $('sA'), sM = $('sM'), selM = $('selM');
  function readControls() {
    state.E = +sE.value; state.V0 = +sV.value; state.a = +sA.value;
    state.m = selM.value === 'custom' ? Math.pow(10, +sM.value) : +selM.value;
    update();
  }
  [sE, sV, sA, sM].forEach((s) => s.addEventListener('input', () => { clearScenario(); readControls(); }));
  selM.addEventListener('change', () => { sM.classList.toggle('hidden', selM.value !== 'custom'); clearScenario(); readControls(); });

  function setParams(p) {
    if (p.E != null) sE.value = p.E;
    if (p.V0 != null) sV.value = p.V0;
    if (p.a != null) sA.value = p.a;
    if (p.m != null) {
      const opt = [...selM.options].find((o) => +o.value === p.m);
      if (opt) { selM.value = opt.value; sM.classList.add('hidden'); }
      else { selM.value = 'custom'; sM.value = Math.log10(p.m); sM.classList.remove('hidden'); }
    }
    readControls();
  }

  // ================= skenario =================
  const resonanceE = (V0, a, m, n = 1) => V0 + H2Mn(n, a) / m;
  function H2Mn(n, a) { return P.H2M * Math.pow(n * Math.PI / a, 2); }
  const SCEN = [
    { id: 'tun', name: 'E < V₀ · Penerowongan', p: { E: 3, V0: 5, a: 0.4, m: 1 }, note: 'Kasus acuan. Klasik: partikel <b>selalu memantul</b> (T = 0). Kuantum: fungsi gelombang meluruh eksponensial di dalam penghalang namun tidak nol, sehingga <b>T ≈ 1,16 %</b>. Perhatikan aliran partikel di bawah.' },
    { id: 'eq', name: 'E = V₀ · Batas', p: { E: 5, V0: 5, a: 0.4, m: 1 }, note: 'Kasus batas: di dalam penghalang ψ berubah linier. T mengikuti pers. (4) dan bersambung mulus dengan pers. (2) dan (3).' },
    { id: 'above', name: 'E > V₀ · Refleksi', p: { E: 7, V0: 5, a: 0.4, m: 1 }, note: 'Klasik memprediksi <b>transmisi penuh</b> (T = 1). Kuantum: sebagian gelombang <b>tetap terpantul</b> karena perubahan bilangan gelombang di tepi penghalang.' },
    { id: 'res', name: 'Resonansi T = 1', p: null, note: 'Energi dipilih sehingga <b>k′a = π</b>. Gelombang di dalam penghalang membentuk gelombang berdiri, interferensi pantulan saling meniadakan → <b>T = 1</b> secara kuantum.' },
    { id: 'thin', name: 'Penghalang tipis', p: { E: 3, V0: 5, a: 0.05, m: 1 }, note: 'Untuk a → 0, penghalang hampir tak terasa dan <b>T → 1</b>. Coba geser lebar a perlahan dan lihat T turun.' },
    { id: 'thick', name: 'Penghalang tebal', p: { E: 3, V0: 5, a: 1.2, m: 1 }, note: 'κa ≫ 1: T meluruh eksponensial, mengikuti pendekatan pers. (5) <b>T ≈ 16(E/V₀)(1−E/V₀)e^(−2κa)</b>. Hasil mendekati klasik (T → 0).' },
    { id: 'proton', name: 'Proton (limit klasik)', p: { E: 3, V0: 5, a: 0.4, m: 1836.15 }, note: 'Massa besar → κ besar → T praktis nol. Inilah mengapa benda makroskopis tidak teramati menembus dinding: <b>limit klasik</b>.' },
    { id: 'muon', name: 'Muon', p: { E: 3, V0: 5, a: 0.4, m: 206.77 }, note: 'Muon ~207 kali massa elektron. Bandingkan T-nya dengan elektron pada penghalang yang sama.' },
  ];
  const scWrap = $('scenarios');
  SCEN.forEach((s) => {
    const b = document.createElement('button');
    b.textContent = s.name; b.dataset.id = s.id;
    b.addEventListener('click', () => {
      let p = s.p;
      if (s.id === 'res') p = { E: +(resonanceE(5, 0.4, 1)).toFixed(2), V0: 5, a: 0.4, m: 1 };
      setParams(p);
      scWrap.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      $('scenarioNote').innerHTML = s.note;
      resetStream();
    });
    scWrap.appendChild(b);
  });
  function clearScenario() { scWrap.querySelectorAll('button').forEach((x) => x.classList.remove('on')); }

  // ================= update readouts =================
  let cache = {};
  function update() {
    const { E, V0, a, m } = state;
    const T = P.transmission(E, V0, a, m), Tc = P.classicalT(E, V0);
    const lgT = P.log10T(E, V0, a, m);
    cache = { T, Tc, lgT, psi: P.psiFactory(E, V0, a, m), amp: P.amplitudes(E, V0, a, m) };
    const tn = $('tinyNote');
    if (T < 1e-12 && isFinite(lgT)) {
      tn.hidden = false;
      tn.innerHTML = `T sangat kecil tetapi <b>bukan nol</b>: T ≈ 10<sup>${lgT.toFixed(1)}</sup>. ` +
        (T <= 1e-300 ? 'Nilai ini di bawah batas angka komputer (~10⁻³⁰⁸), sehingga dihitung dalam bentuk logaritma dengan pendekatan pers. (5), yang sangat teliti untuk κa besar. Pada skala ini, prediksi kuantum praktis sama dengan klasik.' : 'Pada skala ini, prediksi kuantum praktis sama dengan klasik (limit klasik).');
    } else tn.hidden = true;
    $('oE').textContent = E.toFixed(2) + ' eV';
    $('oV').textContent = V0.toFixed(2) + ' eV';
    $('oA').textContent = a.toFixed(3) + ' nm';
    $('oM').textContent = m.toFixed(m < 10 ? 2 : 0) + ' mₑ';
    $('rRegime').textContent = P.regime(E, V0);
    $('rTq').textContent = fmtT(T, lgT); $('rTq').classList.toggle('long', $('rTq').textContent.length > 11);
    $('rRq').textContent = fmtPct(1 - T);
    $('rTc').textContent = Tc === 0.5 ? 'ambang' : fmtPct(Tc);
    const dT = T - (Tc === 0.5 ? T : Tc);
    $('rDT').textContent = (dT >= 0 ? '+' : '') + (dT * 100).toFixed(3) + ' %';
    if (E < V0) { $('rKlabel').textContent = 'κa'; $('rKa').textContent = (Math.sqrt(m * (V0 - E) / P.H2M) * a).toFixed(3); }
    else { $('rKlabel').textContent = "k′a / π"; $('rKa').textContent = (Math.sqrt(m * Math.max(E - V0, 0) / P.H2M) * a / Math.PI).toFixed(3); }
    $('clsText').textContent = E < V0 ? 'E < V₀ → partikel terpantul seluruhnya' : E > V0 ? 'E > V₀ → partikel lolos seluruhnya' : 'E = V₀ → tepat di ambang';
    $('bTv').textContent = T < 1e-4 ? '≈ 0 %' : fmtPct(T); $('bT').style.width = (T * 100) + '%';
    $('paramChip').textContent = `E=${E.toFixed(2)} eV · V₀=${V0.toFixed(2)} eV · a=${a.toFixed(3)} nm · m=${m.toFixed(m < 10 ? 2 : 0)} mₑ`;
    if (document.querySelector('#page-analysis.active')) drawAnalysis();
    if (!state.playing) drawAll();
  }

  // ================= gambar: potensial + gelombang =================
  function domain() { const L = Math.max(0.8, 1.6 * state.a, 6 / Math.max(P.wavenumber(state.E, state.m), 1e-3)); return [-Math.min(L, 2.5), state.a + Math.min(L, 2.5)]; }

  function drawPotential(ctx, w, h, X, Y, Vmax) {
    const { V0, a, E } = state;
    // grid
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const y = (h * i) / 6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // barrier
    const x0 = X(0), x1 = X(a), yb = Y(V0), yg = Y(0);
    const grd = ctx.createLinearGradient(0, yb, 0, yg);
    grd.addColorStop(0, COL.bfill1); grd.addColorStop(1, COL.bfill2);
    ctx.fillStyle = grd; ctx.fillRect(x0, yb, x1 - x0, yg - yb);
    ctx.strokeStyle = COL.barrierLine; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, yg); ctx.lineTo(x0, yg); ctx.lineTo(x0, yb); ctx.lineTo(x1, yb); ctx.lineTo(x1, yg); ctx.lineTo(w, yg); ctx.stroke();
    // energy line
    ctx.setLineDash([6, 5]); ctx.strokeStyle = COL.energy; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, Y(E)); ctx.lineTo(w, Y(E)); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 11px Inter'; ctx.fillStyle = COL.energy; ctx.fillText('E = ' + E.toFixed(2) + ' eV', 8, Y(E) - 6);
    ctx.fillStyle = COL.vlabel; ctx.fillText('V₀ = ' + V0.toFixed(2) + ' eV', Math.min(x1 + 6, w - 90), yb - 6);
    ctx.fillStyle = COL.text; ctx.font = '11px JetBrains Mono';
    ctx.fillText('x = 0', x0 - 16, yg + 14); ctx.fillText('a', x1 - 3, yg + 14);
  }

  function drawQuantum(cv, opts = {}) {
    const { ctx, w, h } = setupCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const [xa, xb] = domain();
    const Vmax = Math.max(state.V0, state.E) * 1.35;
    const padB = 22;
    const X = (x) => ((x - xa) / (xb - xa)) * w;
    const Y = (v) => h - padB - (v / Vmax) * (h - padB - 10);
    drawPotential(ctx, w, h, X, Y, Vmax);
    const psi = cache.psi, base = Y(state.E);
    // auto-scale amplitude
    const N = Math.max(300, Math.floor(w));
    let maxA = 0; const pts = [];
    for (let i = 0; i <= N; i++) { const x = xa + ((xb - xa) * i) / N; const z = psi(x); pts.push([x, z]); maxA = Math.max(maxA, P.abs2(z)); }
    const amp = Math.min(base - 14, (h - padB) * 0.38) / Math.max(Math.sqrt(maxA), 1e-9);
    const ph = state.t;
    const cr = Math.cos(ph), ci = -Math.sin(ph); // e^{-iωt}
    const showProb = opts.prob ?? $('tProb').checked, showRe = opts.re ?? $('tRe').checked;
    if (showProb) {
      const sc = amp / Math.max(Math.sqrt(maxA), 1e-9);
      ctx.beginPath(); ctx.moveTo(X(xa), base);
      pts.forEach(([x, z]) => ctx.lineTo(X(x), base - P.abs2(z) * sc * 0.9));
      ctx.lineTo(X(xb), base); ctx.closePath();
      const g = ctx.createLinearGradient(0, base - amp, 0, base);
      g.addColorStop(0, 'rgba(124,92,255,.55)'); g.addColorStop(1, 'rgba(124,92,255,.05)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(180,160,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (showRe) {
      ctx.beginPath();
      pts.forEach(([x, z], i) => { const re = z.re * cr - z.im * ci; const y = base - re * amp; i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); });
      ctx.strokeStyle = COL.q; ctx.lineWidth = 2.2; ctx.shadowColor = COL.q; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
    }
    // legend
    ctx.font = '11px Inter';
    let lx = w - 150; const ly = 16;
    if (showRe) { ctx.fillStyle = COL.q; ctx.fillRect(lx, ly - 7, 14, 3); ctx.fillStyle = COL.text; ctx.fillText('Re ψ(x,t)', lx + 20, ly - 2); }
    if (showProb) { ctx.fillStyle = COL.vlabel; ctx.fillRect(lx, ly + 8, 14, 3); ctx.fillStyle = COL.text; ctx.fillText('|ψ(x)|²', lx + 20, ly + 13); }
    if (!opts.hero) {
      ctx.font = '600 12px JetBrains Mono'; ctx.fillStyle = COL.q;
      ctx.fillText('T = ' + fmtT(cache.T, cache.lgT),Math.min(X(state.a) + 10, w - 120), h - padB - 30);
      ctx.fillStyle = COL.r; ctx.fillText('R = ' + fmtPct(1 - cache.T), 10, h - padB - 30);
    }
  }

  // klasik: bola menggelinding
  const balls = [];
  function drawClassical(cv) {
    const { ctx, w, h } = setupCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const [xa, xb] = domain();
    const Vmax = Math.max(state.V0, state.E) * 1.35;
    const padB = 22;
    const X = (x) => ((x - xa) / (xb - xa)) * w;
    const Y = (v) => h - padB - (v / Vmax) * (h - padB - 10);
    drawPotential(ctx, w, h, X, Y, Vmax);
    // trajectory hint
    const yE = Y(state.E);
    const pass = state.E > state.V0;
    ctx.strokeStyle = 'rgba(255,181,71,.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (pass) { ctx.moveTo(10, yE + 22); ctx.lineTo(w - 20, yE + 22); }
    else { ctx.moveTo(10, yE + 22); ctx.lineTo(X(0) - 12, yE + 22); }
    ctx.stroke();
    // arrow
    ctx.fillStyle = 'rgba(255,181,71,.6)';
    const ax = pass ? w - 20 : X(0) - 12;
    ctx.beginPath(); ctx.moveTo(ax, yE + 22); ctx.lineTo(ax - 8, yE + 17); ctx.lineTo(ax - 8, yE + 27); ctx.fill();
    // moving ball (one), position by time
    const span = X(0) - 20;
    const period = 4;
    const ph = (state.t / (2 * Math.PI) / period) % 1;
    let bx;
    if (pass) {
      bx = 10 + ph * (w - 30);
    } else {
      bx = ph < 0.5 ? 10 + (ph / 0.5) * span : 10 + ((1 - ph) / 0.5) * span;
    }
    // inside barrier E>V0: slower (KE smaller) — visual hint only
    const g = ctx.createRadialGradient(bx - 3, yE - 3, 1, bx, yE, 10);
    g.addColorStop(0, '#fff3d6'); g.addColorStop(1, COL.c);
    ctx.fillStyle = g; ctx.shadowColor = COL.c; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(bx, yE, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = '600 12px JetBrains Mono'; ctx.fillStyle = COL.c;
    const Tc = P.classicalT(state.E, state.V0);
    ctx.fillText('T = ' + (Tc === 0.5 ? 'ambang' : Tc * 100 + ' %'), Math.min(X(state.a) + 10, w - 120), h - padB - 30);
  }

  // ================= aliran partikel (Monte Carlo) =================
  let parts = [];
  const counts = { cT: 0, cN: 0, qT: 0, qN: 0 };
  function fire(n) {
    for (let i = 0; i < n; i++) {
      const delay = Math.random() * 3;
      const T = cache.T, Tc = P.classicalT(state.E, state.V0);
      parts.push({ lane: 0, x: -delay, y: Math.random(), pass: Math.random() < (Tc === 0.5 ? 0.5 : Tc), done: false });
      parts.push({ lane: 1, x: -delay, y: Math.random(), pass: Math.random() < T, done: false });
    }
  }
  function resetStream() { parts = []; Object.keys(counts).forEach((k) => (counts[k] = 0)); updateBars(); }
  function updateBars() {
    const c = counts.cN ? counts.cT / counts.cN : 0, q = counts.qN ? counts.qT / counts.qN : 0;
    $('bC').style.width = c * 100 + '%'; $('bCv').textContent = (c * 100).toFixed(1) + ' %'; $('cntC').textContent = counts.cT + ' / ' + counts.cN;
    $('bQ').style.width = q * 100 + '%'; $('bQv').textContent = (q * 100).toFixed(1) + ' %'; $('cntQ').textContent = counts.qT + ' / ' + counts.qN;
  }
  $('btnFire').addEventListener('click', () => fire(200));
  $('btnReset').addEventListener('click', resetStream);

  function drawStream(cv, dt) {
    const { ctx, w, h } = setupCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const bx0 = w * 0.48, bx1 = w * 0.52;
    const laneH = h / 2;
    ['Klasik', 'Kuantum'].forEach((name, l) => {
      const y0 = l * laneH;
      ctx.fillStyle = l ? 'rgba(56,214,255,.04)' : 'rgba(255,181,71,.04)';
      ctx.fillRect(0, y0 + 4, w, laneH - 8);
      ctx.fillStyle = COL.barrier; ctx.fillRect(bx0, y0 + 4, bx1 - bx0, laneH - 8);
      ctx.strokeStyle = COL.barrierLine; ctx.strokeRect(bx0, y0 + 4, bx1 - bx0, laneH - 8);
      ctx.fillStyle = l ? COL.q : COL.c; ctx.font = '600 11px Inter'; ctx.fillText(name, 8, y0 + 18);
    });
    const speed = 0.35; // fraksi lebar per detik
    parts.forEach((p) => {
      if (p.done) return;
      p.x += speed * dt * (p.dir || 1);
      if (!p.hit && p.x >= 0.48) {
        p.hit = true;
        if (!p.pass) { p.dir = -1; p.x = 0.48; }
        else p.dir = 1;
      }
      if (p.x > 1.02 || (p.dir === -1 && p.x < -0.02)) {
        p.done = true;
        if (p.lane === 0) { counts.cN++; if (p.pass) counts.cT++; } else { counts.qN++; if (p.pass) counts.qT++; }
      }
      if (p.x < 0) return;
      const y = p.lane * laneH + 10 + p.y * (laneH - 20);
      const col = p.lane ? (p.hit ? (p.pass ? COL.q : COL.r) : COL.q) : (p.hit ? (p.pass ? COL.c : COL.r) : COL.c);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x * w, y, 2.6, 0, Math.PI * 2); ctx.fill();
    });
    if (parts.length && parts.every((p) => p.done)) parts = [];
    updateBars();
  }

  // ================= loop animasi =================
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    state.playing = $('tPlay').checked;
    if (state.playing) state.t += dt * 3;
    drawAll(dt);
    requestAnimationFrame(loop);
  }
  function drawAll(dt = 0) {
    if (document.querySelector('#page-sim.active')) {
      drawQuantum($('cvQuantum')); drawClassical($('cvClassical')); drawStream($('cvStream'), dt);
    }
    if (document.querySelector('#page-home.active')) drawHero();
  }
  const heroCache = { psi: P.psiFactory(3, 5, 0.4, 1) };
  function drawHero() {
    const save = { ...state }, sc = cache;
    Object.assign(state, { E: 3, V0: 5, a: 0.4, m: 1 });
    cache = { ...sc, psi: heroCache.psi, T: P.transmission(3, 5, 0.4, 1) };
    drawQuantum($('heroCanvas'), { prob: true, re: true, hero: true });
    Object.assign(state, save, { t: state.t }); cache = sc;
  }

  // ================= grafik analisis =================
  function lineChart(cv, cfg) {
    const { ctx, w, h } = setupCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const m = { l: 56, r: 16, t: 14, b: 40 };
    const pw = w - m.l - m.r, ph = h - m.t - m.b;
    const [x0, x1] = cfg.x, [y0, y1] = cfg.y;
    const tx = cfg.logx ? (v) => Math.log10(v) : (v) => v;
    const ty = cfg.logy ? (v) => Math.log10(Math.max(v, 1e-300)) : (v) => v;
    const X = (v) => m.l + ((tx(v) - tx(x0)) / (tx(x1) - tx(x0))) * pw;
    const Y = (v) => m.t + ph - ((Math.max(ty(v), ty(y0)) - ty(y0)) / (ty(y1) - ty(y0))) * ph;
    ctx.font = '11px JetBrains Mono'; ctx.fillStyle = COL.text; ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
    // ticks y
    const yt = cfg.logy ? range(Math.ceil(ty(y0)), Math.floor(ty(y1)), cfg.ystep || 2).map((e) => Math.pow(10, e)) : ticks(y0, y1, 5);
    yt.forEach((v) => { const y = Y(v); ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(m.l + pw, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(cfg.logy ? '1e' + Math.round(Math.log10(v)) : +v.toFixed(2), m.l - 6, y + 4); });
    const xt = cfg.logx ? range(Math.ceil(tx(x0)), Math.floor(tx(x1)), 1).map((e) => Math.pow(10, e)) : ticks(x0, x1, 6);
    xt.forEach((v) => { const x = X(v); ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, m.t + ph); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(cfg.logx ? '10^' + Math.round(Math.log10(v)) : +v.toFixed(2), x, m.t + ph + 16); });
    ctx.strokeStyle = COL.axis; ctx.strokeRect(m.l, m.t, pw, ph);
    ctx.textAlign = 'center'; ctx.fillStyle = COL.text; ctx.font = '12px Inter';
    ctx.fillText(cfg.xlabel, m.l + pw / 2, h - 6);
    ctx.save(); ctx.translate(14, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(cfg.ylabel, 0, 0); ctx.restore();
    // vertical markers
    (cfg.vlines || []).forEach((vl) => {
      if (vl.x < x0 || vl.x > x1) return;
      ctx.setLineDash([3, 4]); ctx.strokeStyle = vl.color; ctx.beginPath(); ctx.moveTo(X(vl.x), m.t); ctx.lineTo(X(vl.x), m.t + ph); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = vl.color; ctx.font = '600 11px Inter'; ctx.textAlign = 'left'; ctx.fillText(vl.label, X(vl.x) + 4, m.t + 12);
    });
    ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, pw, ph); ctx.clip();
    cfg.series.forEach((s) => {
      ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
      s.data.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.stroke(); ctx.setLineDash([]);
    });
    (cfg.points || []).forEach((p) => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 5, 0, 7); ctx.fill(); ctx.strokeStyle = COL.pointRing; ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.restore();
    // legend
    let lx = m.l + 10; ctx.font = '11px Inter'; ctx.textAlign = 'left';
    cfg.series.filter((s) => s.label).forEach((s) => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.setLineDash(s.dash || []); ctx.beginPath(); ctx.moveTo(lx, m.t + ph - 12); ctx.lineTo(lx + 18, m.t + ph - 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.legend; ctx.fillText(s.label, lx + 22, m.t + ph - 8); lx += ctx.measureText(s.label).width + 40;
    });
  }
  function ticks(a, b, n) { const step = nice((b - a) / n); const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10)); return out; }
  function nice(x) { const e = Math.pow(10, Math.floor(Math.log10(x))); const f = x / e; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e; }
  function range(a, b, s) { const o = []; for (let i = a; i <= b; i += s) o.push(i); return o; }

  function seriesTE() {
    const { V0, a, m } = state; const Emax = Math.max(3 * V0, state.E * 1.2); const out = [];
    for (let i = 1; i <= 600; i++) { const E = (Emax * i) / 600; out.push([E, P.transmission(E, V0, a, m)]); }
    return { Emax, out };
  }
  function drawAnalysis() {
    const { E, V0, a, m } = state; const T = cache.T;
    const { Emax, out } = seriesTE();
    lineChart($('cvTE'), {
      x: [0, Emax], y: [0, 1.05], xlabel: 'Energi E (eV)', ylabel: 'Koefisien',
      series: [
        { data: out, color: COL.q, label: 'T kuantum' },
        { data: out.map(([x, y]) => [x, 1 - y]), color: COL.r, label: 'R kuantum', width: 1.5 },
        { data: [[0, 0], [V0, 0], [V0, 1], [Emax, 1]], color: COL.c, dash: [6, 5], label: 'T klasik' },
      ],
      vlines: [{ x: V0, color: COL.vlabel, label: 'V₀' }, ...[1, 2, 3].map((n) => ({ x: V0 + H2Mn(n, a) / m, color: 'rgba(62,224,160,.7)', label: 'n=' + n }))],
      points: [{ x: E, y: T, color: COL.q }],
    });
    // T(a)
    const amax = Math.max(2, a * 1.5); const ta = []; let minT = 1;
    for (let i = 1; i <= 400; i++) { const aa = (amax * i) / 400; const t = P.transmission(E, V0, aa, m); ta.push([aa, t]); if (t > 0) minT = Math.min(minT, t); }
    const ylo = Math.pow(10, Math.max(-30, Math.floor(Math.log10(Math.max(minT, 1e-30)))));
    lineChart($('cvTA'), {
      x: [0, amax], y: [ylo, 2], logy: true, ystep: Math.max(1, Math.round(-Math.log10(ylo) / 6)), xlabel: 'Lebar penghalang a (nm)', ylabel: 'T (log)',
      series: [
        { data: ta, color: COL.q, label: 'T kuantum (eksak)' },
        ...(E < V0 ? [{ data: ta.map(([aa]) => { const k = Math.sqrt(m * (V0 - E) / P.H2M); return [aa, 16 * (E / V0) * (1 - E / V0) * Math.exp(-2 * k * aa)]; }), color: COL.ok, dash: [4, 4], label: 'Aproksimasi pers. (5)', width: 1.5 }] : []),
      ],
      points: [{ x: a, y: Math.max(T, ylo), color: COL.q }],
    });
    // T(m)
    const tm = [], tmMin = [];
    let lo = 1;
    for (let i = 0; i <= 400; i++) { const mm = Math.pow(10, -1 + (5 * i) / 400); const t = P.transmission(E, V0, a, mm); tm.push([mm, t]); if (t > 0) lo = Math.min(lo, t); }
    const ylo2 = Math.pow(10, Math.max(-40, Math.floor(Math.log10(Math.max(lo, 1e-40)))));
    lineChart($('cvTM'), {
      x: [0.1, 1e4], y: [ylo2, 2], logx: true, logy: true, ystep: Math.max(1, Math.round(-Math.log10(ylo2) / 6)), xlabel: 'Massa partikel m / mₑ', ylabel: 'T (log)',
      series: [{ data: tm, color: COL.q, label: 'T kuantum' }, { data: [[0.1, Math.max(P.classicalT(E, V0), ylo2)], [1e4, Math.max(P.classicalT(E, V0), ylo2)]], color: COL.c, dash: [6, 5], label: 'T klasik' }],
      vlines: [{ x: 1, color: 'rgba(56,214,255,.6)', label: 'e⁻' }, { x: 206.77, color: 'rgba(56,214,255,.6)', label: 'μ' }, { x: 1836.15, color: 'rgba(56,214,255,.6)', label: 'p' }],
      points: [{ x: m, y: Math.max(T, ylo2), color: COL.q }],
    });
    lineChart($('cvDiff'), {
      x: [0, Emax], y: [0, 1.05], xlabel: 'Energi E (eV)', ylabel: '|ΔT|',
      series: [{ data: out.map(([x, y]) => [x, Math.abs(y - P.classicalT(x, V0))]), color: COL.q2, label: '|T_kuantum − T_klasik|' }],
      vlines: [{ x: V0, color: COL.vlabel, label: 'V₀' }],
    });
    // insight
    const kpa = Math.sqrt(m * Math.max(E - V0, 0) / P.H2M) * a;
    let txt;
    if (E < V0) {
      const ka = Math.sqrt(m * (V0 - E) / P.H2M) * a;
      const approx = 16 * (E / V0) * (1 - E / V0) * Math.exp(-2 * ka);
      txt = `Rezim <b>penerowongan</b>: κa = ${ka.toFixed(3)}. Teori kuantum memberi T = <b>${fmtT(T, cache.lgT)}</b>, sedangkan klasik T = 0. ` +
        (T <= 1e-300 ? 'T berada di bawah batas angka komputer; nilainya dihitung dengan pendekatan pers. (5) dalam bentuk logaritma.'
          : ka > 1 ? `Karena κa &gt; 1, pendekatan pers. (5) memberi ${fmtPct(approx)} (galat ${(Math.abs(approx - T) / T * 100).toFixed(2)} %).` : 'κa &lt; 1 sehingga pendekatan penghalang tebal belum berlaku.');
    } else {
      txt = `Rezim <b>di atas penghalang</b>: k′a/π = ${(kpa / Math.PI).toFixed(3)}. Klasik memprediksi T = 100 %, kuantum memberi T = <b>${fmtPct(T)}</b> — refleksi ${fmtPct(1 - T)} murni efek gelombang. ` +
        `Resonansi T = 1 terdekat ada pada E = ${(V0 + H2Mn(Math.max(1, Math.round(kpa / Math.PI)), a) / m).toFixed(3)} eV.`;
    }
    $('insight').innerHTML = '<h3>Interpretasi Otomatis</h3><p>' + txt + '</p><p class="note">Limit klasik tidak tercapai secara monoton: untuk E &gt; V₀ kurva T(E) dan T(m) berosilasi akibat resonansi, sehingga perbedaan klasik–kuantum mengecil hanya secara rata-rata.</p>';
  }

  $('btnCSV').addEventListener('click', () => {
    const { V0, a, m } = state; const { out } = seriesTE();
    const rows = ['E_eV,T_kuantum,R_kuantum,T_klasik'].concat(out.map(([E, T]) => [E.toFixed(5), T.toExponential(8), (1 - T).toExponential(8), P.classicalT(E, V0)].join(',')));
    const blob = new Blob([`# V0=${V0} eV, a=${a} nm, m=${m} m_e\n` + rows.join('\n')], { type: 'text/csv' });
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'qtunnel_TE.csv'; l.click();
  });

  // ================= verifikasi =================
  function renderVerify(res, src) {
    const list = $('verifyList'); list.innerHTML = '';
    res.checks.forEach((c) => {
      const d = document.createElement('div'); d.className = 'vitem ' + (c.pass ? 'pass' : 'fail');
      d.innerHTML = `<span class="ic">${c.pass ? '✓' : '✗'}</span><div><b>${c.name}</b><small>${c.detail}</small></div>`;
      list.appendChild(d);
    });
    const tb = $('verifyTable').querySelector('tbody'); tb.innerHTML = '';
    res.table.forEach((r) => {
      tb.insertAdjacentHTML('beforeend', `<tr><td>${(+r.E).toFixed(3)}</td><td>${(+r.Ta).toExponential(6)}</td><td>${(+r.Tn).toExponential(6)}</td><td>${(+r.err).toExponential(2)}</td><td>${(+r.sum).toFixed(9)}</td></tr>`);
    });
    $('verifySrc').textContent = src;
  }
  function verifyJS() {
    const { V0, a, m } = state;
    const Es = [0.5, 1, 2, 3, 4, 4.9, V0, 5.1, 6, 7, 8, 10].map((e) => (e === V0 ? V0 : e * V0 / 5));
    const table = Es.map((E) => { const Ta = P.transmission(E, V0, a, m); const n = P.numericalT(E === V0 ? V0 * (1 + 1e-9) : E, V0, a, m); return { E, Ta, Tn: n.T, err: Math.abs(n.T - Ta) / Math.max(Ta, 1e-300), sum: n.T + n.R }; });
    const maxErr = Math.max(...table.map((r) => r.err));
    const maxCons = Math.max(...table.map((r) => Math.abs(r.sum - 1)));
    const Tlo = P.transmission(V0 * (1 - 1e-6), V0, a, m), Thi = P.transmission(V0 * (1 + 1e-6), V0, a, m), Teq = P.transmission(V0, V0, a, m);
    const Tthin = P.transmission(0.6 * V0, V0, 1e-5, m);
    const Eth = 0.6 * V0, kth = Math.sqrt(m * (V0 - Eth) / P.H2M), ath = 8 / kth;
    const Tex = P.transmission(Eth, V0, ath, m), Tap = 16 * 0.6 * 0.4 * Math.exp(-2 * kth * ath);
    const Eres = V0 + H2Mn(1, a) / m, Tres = P.transmission(Eres, V0, a, m);
    const Tp = P.transmission(0.6 * V0, V0, a, 1836.15), Te = P.transmission(0.6 * V0, V0, a, 1);
    const ref = P.transmission(3, 5, 0.4, 1);
    const lgx = P.log10T(0.05, 12, 2, 3162);
    const checks = [
      { name: 'Kekekalan probabilitas T + R = 1', pass: maxCons < 1e-6, detail: 'max |T+R−1| = ' + maxCons.toExponential(2) },
      { name: 'Kesesuaian analitik–numerik (< 10⁻⁶)', pass: maxErr < 1e-6, detail: 'galat relatif maks = ' + maxErr.toExponential(2) },
      { name: 'Kontinuitas di E = V₀', pass: Math.abs(Tlo - Teq) / Teq < 1e-4 && Math.abs(Thi - Teq) / Teq < 1e-4, detail: `T(V₀⁻)=${Tlo.toFixed(8)} · T(V₀)=${Teq.toFixed(8)} · T(V₀⁺)=${Thi.toFixed(8)}` },
      { name: 'Penghalang sangat tipis: a → 0 ⇒ T → 1', pass: Tthin > 0.999, detail: 'a = 10⁻⁵ nm → T = ' + Tthin.toFixed(8) },
      { name: 'Penghalang tebal sesuai pers. (5)', pass: Math.abs(Tap - Tex) / Tex < 1e-3, detail: `κa = 8 → eksak ${Tex.toExponential(4)} · aproks ${Tap.toExponential(4)}` },
      { name: 'Resonansi T = 1 pada k′a = π', pass: Math.abs(Tres - 1) < 1e-9, detail: `E = ${Eres.toFixed(4)} eV → T = ${Tres.toFixed(12)}` },
      { name: 'Massa besar → mendekati klasik', pass: Tp < Te && Tp < 1e-10, detail: `elektron T=${Te.toExponential(2)} · proton T=${Tp.toExponential(2)}` },
      { name: 'Contoh acuan (e⁻, V₀=5, a=0,4, E=3) ≈ 1,16 %', pass: Math.abs(ref * 100 - 1.16) < 0.01, detail: 'T = ' + (ref * 100).toFixed(4) + ' %' },
      { name: 'T sangat kecil tidak dibulatkan ke nol', pass: isFinite(lgx) && lgx < -300, detail: `m=3162 mₑ, V₀=12 eV, a=2 nm, E=0,05 eV → T ≈ 10^${lgx.toFixed(1)} (bukan 0)` },
    ];
    renderVerify({ checks, table }, `Sumber: mesin JavaScript (RK4, N = 4000 langkah) · V₀=${V0} eV, a=${a} nm, m=${m.toFixed(2)} mₑ`);
  }
  $('btnVerifyJS').addEventListener('click', verifyJS);

  // ================= mesin Python =================
  // 1) server Flask lokal (bila dijalankan),  2) Pyodide: Python + NumPy + Matplotlib langsung di browser.
  const badge = (cls, txt) => { const el = $('engineBadge'); el.className = 'engine ' + cls; el.querySelector('.txt').textContent = txt; };
  let flaskOK = false, pyodide = null, pyLoading = null;
  async function pingFlask() {
    if (!isLocal) return;
    try {
      const r = await fetch(API + '/api/health', { cache: 'no-store' });
      const j = await r.json(); flaskOK = true; badge('on', 'Python · server lokal');
    } catch (e) { flaskOK = false; if (!pyodide) badge('idle', 'Python · siap dimuat'); }
  }
  async function pySource() {
    const tag = $('pySrc');
    if (tag.textContent.trim()) return tag.textContent;
    const r = await fetch(tag.dataset.src); if (!r.ok) throw new Error('physics.py tidak ditemukan'); return r.text();
  }
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.appendChild(s); });
  }
  async function getPyodide() {
    if (pyodide) return pyodide;
    if (!pyLoading) pyLoading = (async () => {
      badge('busy', 'Python · memuat…');
      await loadScript('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
      const py = await loadPyodide();
      badge('busy', 'Python · memuat NumPy…');
      await py.loadPackage(['numpy', 'matplotlib']);
      const src = await pySource();
      py.FS.writeFile('/home/pyodide/physics.py', src);
      await py.runPythonAsync('import sys, json; sys.path.insert(0, "/home/pyodide"); import numpy as np, physics as ph');
      pyodide = py;
      badge('on', 'Python · aktif (NumPy ' + py.runPython('np.__version__') + ')');
      return py;
    })().catch((e) => { pyLoading = null; badge('off', 'Python · gagal dimuat'); throw e; });
    return pyLoading;
  }
  async function verifyPython(V0, a, m) {
    if (flaskOK) {
      const r = await fetch(`${API}/api/verify?V0=${V0}&a=${a}&m=${m}`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return { ...j, src: `Sumber: Python di server lokal (NumPy ${j.numpy}, ${j.method})` };
    }
    const py = await getPyodide();
    py.globals.set('V0_', V0); py.globals.set('a_', a); py.globals.set('m_', m);
    const out = await py.runPythonAsync(`
res = ph.verify(V0_, a_, m_)
for c in res["checks"]:
    c["pass"] = c.pop("pass_")
try:
    res["plot"] = ph.verification_plot(V0_, a_, m_)
except Exception as e:
    res["plot_error"] = str(e)
json.dumps(res, default=float)`);
    const j = JSON.parse(out);
    return { ...j, src: `Sumber: Python di browser (Pyodide, NumPy ${py.runPython('np.__version__')}, RK4 N=4000 + matriks transfer)` };
  }
  $('btnVerifyPy').addEventListener('click', async () => {
    const b = $('btnVerifyPy'); b.disabled = true; b.textContent = 'Menyiapkan Python…';
    const { V0, a, m } = state;
    try {
      const t0 = performance.now();
      const j = await verifyPython(V0, a, m);
      renderVerify(j, `${j.src} · V₀=${V0} eV, a=${a} nm, m=${m.toFixed(2)} mₑ · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
      if (j.plot) { $('pyPlot').src = 'data:image/png;base64,' + j.plot; $('pyPlotCard').hidden = false; }
    } catch (e) {
      $('verifySrc').textContent = 'Python belum dapat dijalankan (periksa koneksi internet untuk memuat Pyodide). Hasil di atas berasal dari mesin JavaScript.';
      console.error(e);
    }
    b.disabled = false; b.textContent = 'Jalankan (Python)';
  });

  // ================= init =================
  window.addEventListener('resize', () => { drawAll(); if (document.querySelector('#page-analysis.active')) drawAnalysis(); });
  window.addEventListener('DOMContentLoaded', () => {
    if (window.renderMathInElement) renderMathInElement(document.body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }] });
  });
  let th = 'dark'; try { th = localStorage.getItem('qtl-theme') || 'dark'; } catch (e) {}
  document.documentElement.dataset.theme = th; loadColors();
  document.querySelectorAll('#themeSwitch button').forEach((b) => b.classList.toggle('on', b.dataset.theme === th));
  readControls();
  // Muat Python otomatis di latar belakang (kecuali mode hemat data); badge juga bisa diklik.
  $('engineBadge').setAttribute('role', 'button'); $('engineBadge').tabIndex = 0;
  const startPy = () => { if (!flaskOK && !pyodide) getPyodide().catch((e) => console.error(e)); };
  $('engineBadge').addEventListener('click', startPy);
  $('engineBadge').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startPy(); } });
  pingFlask().then(() => {
    const save = navigator.connection && navigator.connection.saveData;
    if (!save) setTimeout(startPy, 2500);
    else badge('idle', 'Python · klik untuk memuat');
  });
  let startTab = 'home'; try { startTab = localStorage.getItem('qtl-tab') || 'home'; } catch (e) {}
  go(startTab);
  requestAnimationFrame(loop);
  window.QTL = { state, setParams, go, fmtT, update: () => update() };
})();
