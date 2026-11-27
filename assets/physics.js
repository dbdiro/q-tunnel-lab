/* Q-Tunnel Lab — mesin fisika (JavaScript)
 * Satuan: energi eV, panjang nm, massa dalam kelipatan massa elektron.
 * hbar^2 / (2 m_e) = 0.0380998 eV nm^2
 */
const Physics = (() => {
  const H2M = 0.0380998; // eV nm^2

  // ---------- bilangan kompleks ----------
  const C = (re, im = 0) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const sub = (a, b) => C(a.re - b.re, a.im - b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const cexp = (z) => { const e = Math.exp(z.re); return C(e * Math.cos(z.im), e * Math.sin(z.im)); };
  const abs2 = (z) => z.re * z.re + z.im * z.im;
  const scale = (z, s) => C(z.re * s, z.im * s);

  const wavenumber = (E, m) => Math.sqrt(m * E / H2M);

  /** Koefisien transmisi analitik (pers. 2, 3, 4) */
  function transmission(E, V0, a, m = 1) {
    if (E <= 0) return 0;
    const rel = Math.abs(E - V0) / V0;
    if (rel < 1e-9) return 1 / (1 + m * V0 * a * a / (4 * H2M)); // pers. 4  (m V0 a^2 / 2hbar^2)
    if (E < V0) {
      const ka = Math.sqrt(m * (V0 - E) / H2M) * a;
      if (ka > 350) return 0;
      const s = Math.sinh(ka);
      return 1 / (1 + (V0 * V0 * s * s) / (4 * E * (V0 - E)));
    }
    const kpa = Math.sqrt(m * (E - V0) / H2M) * a;
    const s = Math.sin(kpa);
    return 1 / (1 + (V0 * V0 * s * s) / (4 * E * (E - V0)));
  }

  /** log10 T — tetap akurat walau T di bawah batas angka komputer (~1e-308).
   *  Untuk κa besar: T ≈ 16 E(V0−E)/V0² · e^(−2κa)  (galat relatif ~ e^(−2κa)). */
  function log10T(E, V0, a, m = 1) {
    if (E <= 0) return -Infinity;
    if (E < V0 && Math.abs(E - V0) / V0 >= 1e-9) {
      const ka = Math.sqrt(m * (V0 - E) / H2M) * a;
      if (ka > 20) return Math.log10(16 * E * (V0 - E) / (V0 * V0)) - 2 * ka / Math.LN10;
    }
    return Math.log10(transmission(E, V0, a, m));
  }

  const classicalT = (E, V0) => (E > V0 ? 1 : E < V0 ? 0 : 0.5);

  function regime(E, V0) {
    if (Math.abs(E - V0) / V0 < 0.004) return 'E = V₀';
    return E < V0 ? 'E < V₀' : 'E > V₀';
  }

  /** Amplitudo kompleks r, C, D, t dari syarat kontinuitas */
  function amplitudes(E, V0, a, m = 1) {
    if (Math.abs(E - V0) < 1e-7) E = V0 + 1e-7;
    const k = wavenumber(E, m);
    const q = E > V0 ? C(Math.sqrt(m * (E - V0) / H2M), 0) : C(0, Math.sqrt(m * (V0 - E) / H2M));
    const kk = C(k, 0), I = C(0, 1);
    const eika = cexp(C(0, k * a));
    const kOverQ = div(kk, q);
    const one = C(1);
    // C e^{iqa} = t e^{ika}(1+k/q)/2 ; D e^{-iqa} = t e^{ika}(1-k/q)/2  (t=1 sementara)
    const eiqa = cexp(mul(I, scale(q, a)));
    const emiqa = cexp(mul(I, scale(q, -a)));
    const C1 = mul(scale(mul(eika, add(one, kOverQ)), 0.5), emiqa);
    const D1 = mul(scale(mul(eika, sub(one, kOverQ)), 0.5), eiqa);
    const qOverK = div(q, kk);
    const lhs = add(mul(C1, add(one, qOverK)), mul(D1, sub(one, qOverK))); // = 2/t
    const t = div(C(2), lhs);
    const Cc = mul(C1, t), Dc = mul(D1, t);
    const r = sub(add(Cc, Dc), one);
    return { k, q, r, t, C: Cc, D: Dc };
  }

  /** Fungsi gelombang ψ(x) (kompleks) */
  function psiFactory(E, V0, a, m = 1) {
    const I = C(0, 1);
    if (E < V0 && Math.sqrt(m * (V0 - E) / H2M) * a > 200) {
      // κa sangat besar: e^{κa} meluap. Gunakan solusi tangga potensial tebal:
      // r = (k − iκ)/(k + iκ), di dalam ψ ≈ (1+r) e^{−κx}, di kanan ψ ≈ 0 (T < 10⁻¹⁷⁰).
      const k = wavenumber(E, m), kap = Math.sqrt(m * (V0 - E) / H2M);
      const r = div(C(k, -kap), C(k, kap)), onePr = add(C(1), r);
      return (x) => {
        if (x < 0) return add(cexp(C(0, k * x)), mul(r, cexp(C(0, -k * x))));
        if (x <= a) return scale(onePr, Math.exp(-kap * x));
        return C(0, 0);
      };
    }
    const A = amplitudes(E, V0, a, m);
    return (x) => {
      if (x < 0) return add(cexp(C(0, A.k * x)), mul(A.r, cexp(C(0, -A.k * x))));
      if (x <= a) return add(mul(A.C, cexp(mul(I, scale(A.q, x)))), mul(A.D, cexp(mul(I, scale(A.q, -x)))));
      return mul(A.t, cexp(C(0, A.k * x)));
    };
  }

  /** Integrasi numerik RK4 Persamaan Schrödinger (independen dari solusi analitik).
   *  Mulai dari x=a dengan ψ = e^{ikx} (gelombang keluar), integrasi mundur ke x=0,
   *  lalu uraikan ψ(0), ψ'(0) menjadi A e^{ikx} + B e^{-ikx}.  T = 1/|A|^2. */
  function numericalT(E, V0, a, m = 1, N = 4000) {
    const k = wavenumber(E, m);
    const f = m * (V0 - E) / H2M; // ψ'' = f ψ  di dalam penghalang
    let p = C(Math.cos(k * a), Math.sin(k * a));
    let dp = C(-k * Math.sin(k * a), k * Math.cos(k * a));
    const h = -a / N;
    for (let i = 0; i < N; i++) {
      // sistem: p' = dp, dp' = f p (f konstan)
      const k1p = dp, k1d = scale(p, f);
      const k2p = add(dp, scale(k1d, h / 2)), k2d = scale(add(p, scale(k1p, h / 2)), f);
      const k3p = add(dp, scale(k2d, h / 2)), k3d = scale(add(p, scale(k2p, h / 2)), f);
      const k4p = add(dp, scale(k3d, h)), k4d = scale(add(p, scale(k3p, h)), f);
      p = add(p, scale(add(add(k1p, scale(k2p, 2)), add(scale(k3p, 2), k4p)), h / 6));
      dp = add(dp, scale(add(add(k1d, scale(k2d, 2)), add(scale(k3d, 2), k4d)), h / 6));
    }
    // ψ(0) = A + B ; ψ'(0) = ik(A - B)  → A = (ψ + ψ'/(ik))/2
    const A = scale(add(p, div(dp, C(0, k))), 0.5);
    const B = scale(sub(p, div(dp, C(0, k))), 0.5);
    const T = 1 / abs2(A);
    const R = abs2(B) / abs2(A);
    return { T, R };
  }

  return { H2M, transmission, log10T, classicalT, regime, amplitudes, psiFactory, numericalT, wavenumber, abs2 };
})();
