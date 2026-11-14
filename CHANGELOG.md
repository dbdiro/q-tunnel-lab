# Catatan Rilis

## v1.0.0 — Prototipe Q-Tunnel Lab (14 November 2026)

Rilis pertama **Quantum Tunneling Interactive Lab**, laboratorium virtual berbasis web untuk visualisasi transmisi partikel melalui penghalang potensial persegi satu dimensi. Rilis ini adalah luaran **Pekan 12–13**: notebook Python verifikasi dan prototipe aplikasi web.

**Kelompok 7 · Proyek Fisika Kuantum · Jalur J1 (Simulasi & Media)**
Ernauli Br. Haloho (koordinator) · Heny Asvarinda (penulis/editor) · Dila Badiro (analis-programmer)

### Fitur aplikasi web
- **Interactive Parameter Control**: energi partikel E, tinggi V₀, lebar a, dan massa (elektron, muon, proton, kustom)
- **Dual Physics Visualization**: panel mekanika klasik dan kuantum berdampingan (Re ψ beranimasi, |ψ|²)
- **Transmission Comparison**: T klasik, T kuantum, ΔT, dan simulasi aliran partikel Monte Carlo
- **Classical Limit Explorer**: grafik T(m) dan T(a), termasuk osilasi resonansi
- **Learning Scenarios**: 8 skenario terpandu (E < V₀, E = V₀, E > V₀, resonansi, penghalang tipis/tebal, muon, proton)
- Grafik analisis T(E), R(E), T(a), |ΔT|, dan ekspor CSV
- Halaman Teori (KaTeX), Verifikasi, Kuis 8 soal, dan profil Tim
- 4 mode tampilan: terang, gelap, biru, klasik

### Mesin perhitungan
- JavaScript: solusi analitik pers. (2)–(4), fungsi gelombang kompleks, integrasi RK4
- Python (NumPy + Flask): acuan kebenaran, API `/api/verify` dengan grafik Matplotlib
- Notebook `notebook/Verifikasi_QTunnel_Pekan12.ipynb` beserta grafik dan tabel CSV

### Hasil verifikasi fisika (9/9 lulus)
| Kriteria | Hasil |
|---|---|
| Kekekalan probabilitas T + R = 1 | ✓ galat ≈ 10⁻¹⁵ |
| Analitik vs numerik RK4 | ✓ galat relatif ≈ 10⁻⁹ (target < 10⁻⁶) |
| Analitik vs matriks transfer | ✓ |
| Kontinuitas di E = V₀ | ✓ |
| Penghalang tipis a → 0 ⇒ T → 1 | ✓ |
| Penghalang tebal sesuai pers. (5) | ✓ |
| Resonansi T = 1 saat k′a = nπ | ✓ |
| Massa besar → mendekati klasik | ✓ |
| Contoh proposal (e⁻, V₀ = 5 eV, a = 0,4 nm, E = 3 eV) | ✓ κa = 2,898, T = 1,1605 % |

### Berkas rilis
- `index.html` (dari folder `dist/`): versi satu file, siap diunggah ke hosting apa pun
- Kode sumber lengkap (ZIP / TAR.GZ) dibuat otomatis oleh GitHub

### Selanjutnya
- Pekan 14: validasi ahli materi dan media, revisi, uji coba terbatas pada mahasiswa
