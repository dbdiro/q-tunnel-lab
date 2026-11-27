"""Q-Tunnel Lab — mesin fisika Python (acuan kebenaran).

Satuan: energi eV, panjang nm, massa kelipatan massa elektron.
hbar^2 / (2 m_e) = 0.0380998 eV nm^2
"""
import numpy as np

H2M = 0.0380998  # eV nm^2


def transmission(E, V0, a, m=1.0):
    """Koefisien transmisi analitik, pers. (2), (3), (4)."""
    E = float(E)
    if E <= 0:
        return 0.0
    if abs(E - V0) / V0 < 1e-9:
        return 1.0 / (1.0 + m * V0 * a**2 / (4 * H2M))
    if E < V0:
        ka = np.sqrt(m * (V0 - E) / H2M) * a
        if ka > 350:
            return 0.0
        return 1.0 / (1.0 + V0**2 * np.sinh(ka) ** 2 / (4 * E * (V0 - E)))
    kpa = np.sqrt(m * (E - V0) / H2M) * a
    return 1.0 / (1.0 + V0**2 * np.sin(kpa) ** 2 / (4 * E * (E - V0)))


def classical_T(E, V0):
    return 1.0 if E > V0 else (0.0 if E < V0 else 0.5)


def log10_transmission(E, V0, a, m=1.0):
    """log10 T, tetap akurat walau T di bawah batas float (~1e-308)."""
    if E <= 0:
        return -np.inf
    if E < V0 and abs(E - V0) / V0 >= 1e-9:
        ka = np.sqrt(m * (V0 - E) / H2M) * a
        if ka > 20:  # T ≈ 16E(V0-E)/V0² e^(-2κa), galat relatif ~e^(-2κa)
            return np.log10(16 * E * (V0 - E) / V0**2) - 2 * ka / np.log(10)
    return np.log10(transmission(E, V0, a, m))


def numerical_T(E, V0, a, m=1.0, N=4000):
    """Integrasi numerik RK4 pers. (1), mundur dari x=a ke x=0.

    Kondisi awal: gelombang keluar psi = exp(ikx) di x=a.
    Di x=0, psi = A e^{ikx} + B e^{-ikx}  =>  T = 1/|A|^2, R = |B|^2/|A|^2.
    E boleh berupa skalar atau array (semua energi diintegrasikan serentak).
    """
    scalar = np.ndim(E) == 0
    E = np.atleast_1d(np.asarray(E, dtype=float))
    k = np.sqrt(m * E / H2M)
    f = m * (V0 - E) / H2M
    p = np.exp(1j * k * a)
    dp = 1j * k * p
    h = -a / N
    for _ in range(N):  # ψ'' = f ψ  (f konstan di dalam penghalang)
        k1p, k1d = dp, f * p
        k2p, k2d = dp + h / 2 * k1d, f * (p + h / 2 * k1p)
        k3p, k3d = dp + h / 2 * k2d, f * (p + h / 2 * k2p)
        k4p, k4d = dp + h * k3d, f * (p + h * k3p)
        p = p + h / 6 * (k1p + 2 * k2p + 2 * k3p + k4p)
        dp = dp + h / 6 * (k1d + 2 * k2d + 2 * k3d + k4d)
    A = 0.5 * (p + dp / (1j * k))
    B = 0.5 * (p - dp / (1j * k))
    T, R = 1 / np.abs(A) ** 2, np.abs(B) ** 2 / np.abs(A) ** 2
    return (float(T[0]), float(R[0])) if scalar else (T, R)


def transfer_matrix_T(E, V0, a, m=1.0):
    """Metode matriks transfer (pembanding kedua)."""
    k = np.sqrt(m * E / H2M + 0j)
    q = np.sqrt(m * (E - V0) / H2M + 0j)
    if abs(q) < 1e-12:
        q = 1e-9 + 0j

    def M(kk, x):
        return np.array([[np.exp(1j * kk * x), np.exp(-1j * kk * x)],
                         [1j * kk * np.exp(1j * kk * x), -1j * kk * np.exp(-1j * kk * x)]])

    Mt = np.linalg.solve(M(k, 0), M(q, 0)) @ np.linalg.solve(M(q, a), M(k, a))
    return float(abs(1 / Mt[0, 0]) ** 2)


def verify(V0=5.0, a=0.4, m=1.0):
    """Semua kriteria kebenaran fisika pada Lampiran proposal."""
    Es = [V0 * f for f in (0.1, 0.2, 0.4, 0.6, 0.8, 0.98)] + [V0] + [V0 * f for f in (1.02, 1.2, 1.4, 1.6, 2.0)]
    Tn_all, Rn_all = numerical_T([E if E != V0 else V0 * (1 + 1e-9) for E in Es], V0, a, m)
    table = []
    for E, Tn, Rn in zip(Es, Tn_all, Rn_all):
        Ta = transmission(E, V0, a, m)
        Tn, Rn = float(Tn), float(Rn)
        table.append(dict(E=E, Ta=Ta, Tn=Tn, err=abs(Tn - Ta) / max(Ta, 1e-300), sum=Tn + Rn))
    max_err = max(r["err"] for r in table)
    max_cons = max(abs(r["sum"] - 1) for r in table)

    Tlo, Teq, Thi = (transmission(V0 * s, V0, a, m) for s in (1 - 1e-6, 1, 1 + 1e-6))
    Tthin = transmission(0.6 * V0, V0, 1e-5, m)
    kth = np.sqrt(m * 0.4 * V0 / H2M)
    ath = 8 / kth
    Tex = transmission(0.6 * V0, V0, ath, m)
    Tap = 16 * 0.6 * 0.4 * np.exp(-2 * kth * ath)
    Eres = V0 + H2M * (np.pi / a) ** 2 / m
    Tres = transmission(Eres, V0, a, m)
    Te, Tp = transmission(0.6 * V0, V0, a, 1), transmission(0.6 * V0, V0, a, 1836.15)
    ref = transmission(3, 5, 0.4, 1)
    Ttm = transfer_matrix_T(0.6 * V0, V0, a, m)
    Tan = transmission(0.6 * V0, V0, a, m)
    lgx = log10_transmission(0.05, 12, 2, 3162)

    checks = [
        ("Kekekalan probabilitas T + R = 1", max_cons < 1e-6, f"max |T+R-1| = {max_cons:.2e}"),
        ("Kesesuaian analitik–numerik RK4 (< 10⁻⁶)", max_err < 1e-6, f"galat relatif maks = {max_err:.2e}"),
        ("Kesesuaian dengan matriks transfer", abs(Ttm - Tan) / Tan < 1e-8, f"analitik {Tan:.10e} · TMM {Ttm:.10e}"),
        ("Kontinuitas di E = V₀", abs(Tlo - Teq) / Teq < 1e-4 and abs(Thi - Teq) / Teq < 1e-4,
         f"T(V₀⁻)={Tlo:.8f} · T(V₀)={Teq:.8f} · T(V₀⁺)={Thi:.8f}"),
        ("Penghalang sangat tipis: a → 0 ⇒ T → 1", Tthin > 0.999, f"a = 1e-5 nm → T = {Tthin:.8f}"),
        ("Penghalang tebal sesuai pers. (5)", abs(Tap - Tex) / Tex < 1e-3, f"κa = 8 → eksak {Tex:.4e} · aproks {Tap:.4e}"),
        ("Resonansi T = 1 pada k′a = π", abs(Tres - 1) < 1e-9, f"E = {Eres:.4f} eV → T = {Tres:.12f}"),
        ("Massa besar → mendekati klasik", Tp < Te and Tp < 1e-10, f"elektron T={Te:.2e} · proton T={Tp:.2e}"),
        ("Contoh acuan (e⁻, V₀=5, a=0,4, E=3) ≈ 1,16 %", abs(ref * 100 - 1.16) < 0.01, f"T = {ref*100:.4f} %"),
        ("T sangat kecil tidak dibulatkan ke nol", np.isfinite(lgx) and lgx < -300,
         f"m=3162 mₑ, V₀=12 eV, a=2 nm, E=0,05 eV → T ≈ 10^{lgx:.1f} (bukan 0)"),
    ]
    return dict(checks=[dict(name=n, pass_=bool(p), detail=d) for n, p, d in checks], table=table)


def verification_plot(V0=5.0, a=0.4, m=1.0):
    """Grafik verifikasi Matplotlib -> PNG base64."""
    import base64
    import io
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    Es = np.linspace(0.01, 3 * V0, 800)
    T = np.array([transmission(E, V0, a, m) for E in Es])
    En = np.linspace(0.05 * V0, 3 * V0, 25)
    Tn = numerical_T(np.where(np.abs(En - V0) > 1e-9, En, V0 * (1 + 1e-9)), V0, a, m, N=1500)[0]
    aa = np.linspace(0.01, 2, 400)
    Ta = [transmission(0.6 * V0, V0, x, m) for x in aa]

    fig, ax = plt.subplots(1, 2, figsize=(11, 4), dpi=110)
    ax[0].plot(Es, T, label="T analitik", color="#0aa5d6")
    ax[0].plot(Es, 1 - T, label="R = 1 − T", color="#e0466a", lw=1)
    ax[0].plot(En, Tn, "o", ms=4, label="T numerik (RK4)", color="#5b3fd6")
    ax[0].step([0, V0, 3 * V0], [0, 1, 1], where="post", ls="--", color="#e08a00", label="T klasik")
    ax[0].axvline(V0, color="gray", ls=":")
    ax[0].set(xlabel="E (eV)", ylabel="Koefisien", title=f"T(E): V₀={V0} eV, a={a} nm, m={m:g} mₑ")
    ax[0].legend(fontsize=8)
    ax[1].semilogy(aa, Ta, color="#0aa5d6", label="T eksak (E = 0,6 V₀)")
    k = np.sqrt(m * 0.4 * V0 / H2M)
    ax[1].semilogy(aa, 16 * 0.6 * 0.4 * np.exp(-2 * k * aa), "--", color="#13a873", label="Aproksimasi pers. (5)")
    ax[1].set(xlabel="a (nm)", ylabel="T", title="T terhadap lebar penghalang")
    ax[1].legend(fontsize=8)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


if __name__ == "__main__":
    res = verify()
    for c in res["checks"]:
        print(("✓" if c["pass_"] else "✗"), c["name"], "—", c["detail"])
