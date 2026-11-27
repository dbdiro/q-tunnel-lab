/* Q-Tunnel Lab — kuis (latihan/pretes/postes), tugas terstruktur, dan catatan pembaruan */
(() => {
  const $ = (id) => document.getElementById(id);
  const VERSION = '1.1.0';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const nowStr = () => new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  function download(name, rows) {
    const csv = rows.map((r) => r.map((c) => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = name; l.click();
  }
  function deviceInfo() {
    const ua = navigator.userAgent;
    const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Lainnya';
    const touch = matchMedia('(pointer: coarse)').matches;
    const dev = /iPad|Tablet/i.test(ua) || (touch && Math.min(screen.width, screen.height) >= 600) ? 'Tablet' : touch ? 'Ponsel' : 'Komputer';
    return { dev, br, w: innerWidth };
  }
  const DEV = deviceInfo();

  // ---------- kode responden (dipakai bersama oleh Kuis dan Tugas) ----------
  const getCode = () => (store.get('qtl-resp', '') || '').trim();
  const setCode = (v) => store.set('qtl-resp', v.trim());

  // ================= KUIS =================
  // Opsi pertama selalu kunci; urutan opsi dan soal diacak saat ditampilkan.
  const QUIZ = [
    { q: 'Menurut mekanika klasik, apa yang terjadi pada partikel dengan E < V₀ yang menumbuk penghalang?', o: ['Selalu terpantul (T = 0)', 'Sebagian kecil dapat menembus bila penghalangnya tipis', 'Menembus dengan energi yang berkurang', 'Berhenti di dalam penghalang'], e: 'Secara klasik energi kinetik di dalam penghalang akan negatif, jadi partikel pasti terpantul: T = 0, berapa pun lebarnya.' },
    { q: 'Untuk E < V₀, bagaimana bentuk fungsi gelombang di dalam penghalang?', o: ['Kombinasi e^(κx) dan e^(−κx): meluruh, tetapi tidak nol', 'Berosilasi dengan panjang gelombang lebih panjang', 'Nol, karena partikel tidak boleh berada di sana', 'Berosilasi dengan amplitudo lebih kecil karena partikel kehilangan energi'], e: 'k′ menjadi imajiner (k′ = iκ), sehingga ψ = Ce^(κx) + De^(−κx). Amplitudonya meluruh tetapi tidak nol.' },
    { q: 'Sebuah elektron berenergi 3 eV berhasil menembus penghalang 5 eV. Berapa energinya setelah keluar dari penghalang?', o: ['Tetap 3 eV', 'Kurang dari 3 eV karena sebagian energi terpakai di penghalang', '5 eV, sama dengan tinggi penghalang', 'Nol, karena hanya peluangnya yang menembus'], e: 'Penghalang statis tidak menyerap energi; yang berkurang adalah amplitudo (peluang), bukan energi. Panjang gelombang di kiri dan kanan penghalang sama.' },
    { q: 'Untuk penghalang tebal (κa ≫ 1), jika lebar a dijadikan dua kali semula, T akan…', o: ['Turun sangat drastis, kira-kira sebanding e^(−2κa)', 'Menjadi setengahnya', 'Tidak berubah karena energi partikel tetap', 'Naik karena partikel punya waktu lebih lama untuk menembus'], e: 'Pendekatan penghalang tebal: T ≈ 16(E/V₀)(1−E/V₀)e^(−2κa). Menggandakan a mengkuadratkan faktor eksponensialnya.' },
    { q: 'Untuk E > V₀, apa prediksi mekanika kuantum?', o: ['Umumnya ada pantulan (T < 1); T = 1 hanya pada energi resonansi', 'Seluruh partikel lolos, sama seperti klasik', 'Seluruh partikel terpantul', 'T selalu 50 % karena dua sisi penghalang'], e: 'Perubahan bilangan gelombang di tepi penghalang menimbulkan pantulan. T = 1 hanya saat k′a = nπ.' },
    { q: 'Pada E < V₀ dan penghalang yang sama, apa pengaruh massa partikel yang lebih besar terhadap T?', o: ['T berkurang karena κ ∝ √m', 'T bertambah karena momentum lebih besar menembus lebih kuat', 'T tidak bergantung pada massa', 'T berosilasi naik-turun tanpa pola'], e: 'κ = √(2m(V₀−E))/ħ bertambah dengan massa, sehingga e^(−2κa) mengecil. Inilah mengapa benda makroskopis berperilaku klasik.' },
    { q: 'Syarat apa yang dipakai untuk menyambungkan solusi pada tiga daerah?', o: ['ψ dan dψ/dx kontinu di x = 0 dan x = a', 'ψ = 0 di kedua tepi penghalang', 'Energi kinetik sama di ketiga daerah', 'Hanya ψ yang kontinu; turunannya boleh melompat'], e: 'Karena potensial berhingga, ψ dan turunannya harus kontinu. Keempat syarat ini menentukan r, C, D, dan t.' },
    { q: 'Hubungan apa yang selalu berlaku antara koefisien transmisi T dan refleksi R?', o: ['T + R = 1', 'T = R', 'T × R = 1', 'T + R < 1 karena sebagian partikel tertahan di dalam penghalang'], e: 'Kekekalan peluang (arus): setiap partikel datang pasti diteruskan atau dipantulkan; tidak ada yang tertahan secara permanen.' },
    { q: 'Elektron dengan E = 3 eV menumbuk penghalang V₀ = 5 eV selebar 0,4 nm. Nilai T paling dekat dengan…', o: ['1,2 %', '0 %', '60 %', '100 %'], e: 'κ = √((V₀−E)/0,0381) ≈ 7,25 nm⁻¹, jadi κa ≈ 2,90 dan T ≈ 1,16 %. Periksa di halaman Simulasi.' },
    { q: 'Kapan T = 1 (resonansi) terjadi pada penghalang persegi?', o: ['Saat E > V₀ dan k′a = nπ (n = 1, 2, 3, …)', 'Saat E = V₀', 'Saat E < V₀ dan κa = nπ', 'Hanya bila lebar penghalang nol'], e: 'Bila k′a = nπ, sin(k′a) = 0 sehingga pers. (3) memberi T = 1: pantulan dari kedua tepi saling meniadakan.' },
    { q: 'Pada E < V₀ dan lebar tetap, apa yang terjadi pada T jika V₀ dinaikkan?', o: ['T berkurang karena κ bertambah', 'T bertambah karena penghalang lebih kuat memantulkan gelombang balik', 'T tidak berubah karena hanya lebar yang berpengaruh', 'T menjadi nol tepat saat V₀ = 2E'], e: 'κ ∝ √(V₀−E): menaikkan V₀ memperbesar κ dan mengecilkan T secara eksponensial.' },
    { q: 'Untuk E < V₀, seperti apa |ψ|² di sebelah kanan penghalang (x > a)?', o: ['Konstan dan sebanding dengan T', 'Terus meluruh eksponensial', 'Nol', 'Berosilasi lebih besar daripada gelombang datang'], e: 'Di x > a hanya ada gelombang yang diteruskan, t·e^(ikx), sehingga |ψ|² = |t|² = T, konstan.' },
  ];
  let quiz = null;
  function renderQuizStart() {
    $('quizBar').style.width = '0%';
    $('quizProg').textContent = QUIZ.length + ' soal';
    $('quizBody').innerHTML = `
      <p class="muted">Pilih mode. <b>Latihan</b> menampilkan pembahasan setiap soal. <b>Pretes</b> dan <b>Postes</b> tidak menampilkan pembahasan sampai selesai dan skornya disimpan bersama kode responden.</p>
      <div class="resp-row"><label for="quizCode">Kode responden</label><input id="quizCode" class="inp" placeholder="contoh: R07" maxlength="20" autocomplete="off" value="${esc(getCode())}"></div>
      <div class="mode-row">
        <button class="btn" data-mode="Latihan">Latihan</button>
        <button class="btn primary" data-mode="Pretes">Mulai Pretes</button>
        <button class="btn primary" data-mode="Postes">Mulai Postes</button>
      </div>
      <p class="muted small" id="quizWarn" aria-live="polite"></p>`;
    $('quizBody').querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      const code = $('quizCode').value.trim(); setCode(code); syncCode();
      if (b.dataset.mode !== 'Latihan' && !code) { $('quizWarn').textContent = 'Isi kode responden terlebih dahulu untuk pretes atau postes.'; $('quizCode').focus(); return; }
      startQuiz(b.dataset.mode, code);
    }));
  }
  function startQuiz(mode, code) {
    quiz = {
      mode, code, i: 0, score: 0, t0: Date.now(), answers: [],
      items: shuffle(QUIZ.map((q, idx) => ({ ...q, id: idx + 1, opts: shuffle(q.o.map((t, k) => ({ t, ok: k === 0 }))) }))),
    };
    renderQ();
  }
  function renderQ() {
    const Z = quiz, N = Z.items.length, body = $('quizBody');
    $('quizBar').style.width = (Z.i / N) * 100 + '%';
    if (Z.i >= N) return finishQuiz();
    const Q = Z.items[Z.i]; let done = false;
    $('quizProg').textContent = `${Z.mode} · Soal ${Z.i + 1} / ${N}` + (Z.mode === 'Latihan' ? ` · Skor ${Z.score}` : '');
    body.innerHTML = `<div class="qtext">${esc(Q.q)}</div><div class="opts" role="group">${Q.opts.map((o, k) => `<button class="opt" data-k="${k}">${'ABCD'[k]}. ${esc(o.t)}</button>`).join('')}</div><div id="qExp" aria-live="polite"></div><div class="quiz-nav"><button class="btn primary hidden" id="qNext">${Z.i + 1 < N ? 'Lanjut →' : 'Selesai'}</button></div>`;
    body.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      if (done) return; done = true;
      const k = +b.dataset.k, ok = Q.opts[k].ok;
      if (ok) Z.score++;
      Z.answers.push({ id: Q.id, pick: Q.opts[k].t, ok });
      body.querySelectorAll('.opt').forEach((x) => { x.disabled = true; });
      if (Z.mode === 'Latihan') {
        body.querySelectorAll('.opt').forEach((x) => { if (Q.opts[+x.dataset.k].ok) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('qExp').innerHTML = `<div class="explain"><b>${ok ? 'Benar.' : 'Kurang tepat.'}</b> ${esc(Q.e)}</div>`;
      } else b.classList.add('picked');
      $('qNext').classList.remove('hidden'); $('qNext').focus();
      $('qNext').onclick = () => { Z.i++; renderQ(); };
    }));
  }
  function finishQuiz() {
    const Z = quiz, N = Z.items.length, pct = Math.round((Z.score / N) * 100), dur = Math.round((Date.now() - Z.t0) / 1000);
    $('quizBar').style.width = '100%'; $('quizProg').textContent = Z.mode + ' · selesai';
    if (Z.mode !== 'Latihan') {
      const hist = store.get('qtl-quiz', []);
      hist.push({ time: new Date().toISOString(), code: Z.code, mode: Z.mode, score: Z.score, total: N, dur, device: DEV.dev, browser: DEV.br, answers: Z.answers.map((a) => `S${a.id}:${a.ok ? 1 : 0}`).join(' ') });
      store.set('qtl-quiz', hist); renderHist();
    }
    const review = Z.items.map((Q, n) => {
      const a = Z.answers[n];
      return `<li class="${a.ok ? 'ok' : 'no'}"><b>${a.ok ? '✓' : '✗'} ${esc(Q.q)}</b><br><span class="muted small">Kunci: ${esc(Q.o[0])}</span><br><span class="small">${esc(Q.e)}</span></li>`;
    }).join('');
    $('quizBody').innerHTML = `<div class="score"><div class="big">${pct}</div><p>Benar ${Z.score} dari ${N} soal · ${Math.floor(dur / 60)} menit ${dur % 60} detik.${Z.mode !== 'Latihan' ? ' Skor tersimpan untuk kode <b>' + esc(Z.code) + '</b>.' : ''}</p><button class="btn primary" id="qRestart">Kembali ke pilihan mode</button></div><details class="review"><summary>Lihat pembahasan semua soal</summary><ol>${review}</ol></details>`;
    $('qRestart').onclick = renderQuizStart;
  }
  function renderHist() {
    const tb = $('quizHist').querySelector('tbody'), hist = store.get('qtl-quiz', []);
    tb.innerHTML = hist.length ? hist.slice().reverse().map((h) => `<tr><td>${new Date(h.time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${esc(h.code)}</td><td>${h.mode}</td><td>${h.score}/${h.total}</td><td>${Math.round(h.dur / 60)} mnt</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Belum ada pretes atau postes yang tersimpan.</td></tr>';
  }
  $('btnQuizCSV').addEventListener('click', () => {
    const hist = store.get('qtl-quiz', []);
    download('qtunnel_kuis.csv', [['waktu', 'kode_responden', 'mode', 'skor', 'jumlah_soal', 'persen', 'durasi_detik', 'perangkat', 'peramban', 'jawaban_per_soal(1=benar)']]
      .concat(hist.map((h) => [h.time, h.code, h.mode, h.score, h.total, Math.round(h.score / h.total * 100), h.dur, h.device, h.browser, h.answers])));
  });

  // ================= TUGAS TERSTRUKTUR =================
  const TASKS = [
    { id: 'TG1', title: 'Menentukan koefisien transmisi', prompt: 'Atur elektron dengan E = 3 eV, V₀ = 5 eV, dan a = 0,4 nm di halaman Simulasi. Berapa nilai T kuantum (dalam persen)?', type: 'num', unit: '%', check: (v) => Math.abs(v - 1.16) <= 0.05, key: '≈ 1,16 %' },
    { id: 'TG2', title: 'Menemukan energi resonansi pertama', prompt: 'Untuk elektron dengan V₀ = 5 eV dan a = 0,4 nm, tentukan energi E > V₀ terkecil yang memberi T = 100 %. Gunakan grafik T(E) di halaman Analisis atau slider energi.', type: 'num', unit: 'eV', check: (v) => Math.abs(v - 7.35) <= 0.1, key: '≈ 7,35 eV (k′a = π)' },
    { id: 'TG3', title: 'Membandingkan elektron dan proton', prompt: 'Dengan E = 3 eV, V₀ = 5 eV, dan a = 0,4 nm, bandingkan T untuk elektron dan proton. Pernyataan mana yang benar?', type: 'choice',
      opts: ['T elektron jauh lebih besar daripada T proton', 'T proton lebih besar karena momentumnya lebih besar', 'Keduanya sama karena energinya sama', 'Keduanya tepat nol, sama seperti prediksi klasik'], key: 'T elektron ≈ 1,2 %, T proton ≈ 5×10⁻¹⁰⁶ %' },
  ];
  const taskState = {}; // id -> {t0, tries}
  function syncCode() { const c = getCode(); if ($('respCode') && $('respCode').value !== c) $('respCode').value = c; const qc = $('quizCode'); if (qc && qc.value !== c) qc.value = c; }
  function renderTasks() {
    const res = store.get('qtl-task', []), code = getCode();
    const doneIds = new Set(res.filter((r) => r.code === code).map((r) => r.task));
    $('taskProg').textContent = `${[...doneIds].length} / ${TASKS.length} selesai`;
    $('taskList').innerHTML = TASKS.map((t, n) => {
      const mine = res.filter((r) => r.code === code && r.task === t.id).pop();
      const opts = t.type === 'choice' ? shuffle(t.opts.map((o, k) => ({ o, k }))) : null;
      return `<div class="task ${mine ? 'done' : ''}" data-id="${t.id}">
        <div class="task-head"><span class="tnum">${n + 1}</span><h4>${t.title}</h4>${mine ? `<span class="chip">${mine.correct ? '✓ benar' : '✗ belum tepat'} · ${mine.seconds} detik</span>` : ''}</div>
        <p>${t.prompt}</p>
        <div class="task-body" ${taskState[t.id] ? '' : 'hidden'}>
          ${t.type === 'num' ? `<div class="resp-row"><input class="inp" inputmode="decimal" placeholder="jawaban" aria-label="Jawaban ${t.title}"> <span>${t.unit}</span></div>`
            : `<div class="opts">${opts.map((x) => `<label class="opt-radio"><input type="radio" name="r${t.id}" value="${x.k}"> ${esc(x.o)}</label>`).join('')}</div>`}
          <button class="btn primary sm send">Kirim jawaban</button>
          <span class="tfeed small" aria-live="polite"></span>
        </div>
        <button class="btn sm start" ${taskState[t.id] ? 'hidden' : ''}>${mine ? 'Kerjakan ulang' : 'Mulai'}</button>
      </div>`;
    }).join('');
    $('taskList').querySelectorAll('.task').forEach((el) => {
      const t = TASKS.find((x) => x.id === el.dataset.id);
      el.querySelector('.start').addEventListener('click', () => {
        if (!getCode()) { alert('Isi kode responden terlebih dahulu.'); $('respCode').focus(); return; }
        taskState[t.id] = { t0: Date.now(), tries: 0 }; renderTasks();
        const inp = $('taskList').querySelector(`[data-id="${t.id}"] .inp, [data-id="${t.id}"] input[type=radio]`); if (inp) inp.focus();
      });
      const send = el.querySelector('.send');
      if (send) send.addEventListener('click', () => {
        const st = taskState[t.id]; st.tries++;
        let ans, ok;
        if (t.type === 'num') {
          const raw = el.querySelector('.inp').value.replace(',', '.').replace(/[^\d.\-eE]/g, '');
          const v = parseFloat(raw);
          if (!isFinite(v)) { el.querySelector('.tfeed').textContent = 'Masukkan angka.'; return; }
          ans = v; ok = t.check(v);
        } else {
          const r = el.querySelector('input[type=radio]:checked');
          if (!r) { el.querySelector('.tfeed').textContent = 'Pilih salah satu jawaban.'; return; }
          ans = t.opts[+r.value]; ok = +r.value === 0;
        }
        const seconds = Math.round((Date.now() - st.t0) / 1000);
        const res = store.get('qtl-task', []);
        res.push({ time: new Date().toISOString(), code: getCode(), task: t.id, answer: ans, correct: ok, seconds, tries: st.tries, device: DEV.dev, browser: DEV.br, width: DEV.w });
        store.set('qtl-task', res);
        delete taskState[t.id];
        renderTasks();
        const fb = $('taskList').querySelector(`[data-id="${t.id}"]`);
        fb.insertAdjacentHTML('beforeend', `<div class="explain">${ok ? '<b>Tepat.</b>' : '<b>Belum tepat.</b>'} Jawaban acuan: ${t.key}.</div>`);
      });
    });
  }
  $('respCode').addEventListener('input', (e) => { setCode(e.target.value); renderTasks(); });
  $('deviceInfo').textContent = `Perangkat: ${DEV.dev} · ${DEV.br} · lebar layar ${DEV.w} px`;
  $('btnTaskCSV').addEventListener('click', () => {
    const res = store.get('qtl-task', []);
    download('qtunnel_tugas.csv', [['waktu', 'kode_responden', 'tugas', 'jawaban', 'benar(1/0)', 'waktu_detik', 'jumlah_kirim', 'perangkat', 'peramban', 'lebar_layar_px']]
      .concat(res.map((r) => [r.time, r.code, r.task, r.answer, r.correct ? 1 : 0, r.seconds, r.tries, r.device, r.browser, r.width])));
  });
  $('btnTaskClear').addEventListener('click', () => {
    if (!confirm('Hapus semua hasil tugas dan kuis yang tersimpan di peramban ini? Unduh CSV terlebih dahulu bila diperlukan.')) return;
    store.set('qtl-task', []); store.set('qtl-quiz', []); renderTasks(); renderHist();
  });

  // ================= CATATAN PEMBARUAN =================
  const dlg = $('changelog');
  const openCL = () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); store.set('qtl-seen-ver', VERSION); $('toast').hidden = true; };
  $('verBtn').addEventListener('click', openCL);
  $('toastOpen').addEventListener('click', openCL);
  $('clClose').addEventListener('click', () => dlg.close ? dlg.close() : dlg.removeAttribute('open'));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('toastClose').addEventListener('click', () => { $('toast').hidden = true; store.set('qtl-seen-ver', VERSION); });
  if (store.get('qtl-seen-ver', '') !== VERSION) setTimeout(() => { $('toast').hidden = false; }, 1200);

  // init
  syncCode(); renderQuizStart(); renderHist(); renderTasks();
})();
