# Catatan Rilis

## v1.1.0 — Revisi Masukan Dosen Pengampu (27 November 2026)

Revisi situs berdasarkan *Lembar Masukan Dosen Pengampu, Luaran Proyek J1* (Dr. Rida SN Mahmudah, M.Si.), temuan T1–T10.

### Baru
- **Python aktif di situs publik (T1).** Verifikasi Python berjalan langsung di browser memakai Pyodide (NumPy + Matplotlib) dengan kode `server/physics.py` yang sama; tidak perlu server. Server Flask lokal tetap dipakai bila tersedia. Pesan perintah untuk pengembang tidak lagi tampil.
- **Tujuan pembelajaran (T4):** CPMK, enam indikator ketercapaian, prasyarat, dan perkiraan waktu belajar di halaman Teori.
- **Rujukan (T4):** tujuh sumber (Griffiths & Schroeter 2018; Serway dkk. 2005; Krane 2012; Binnig dkk. 1982; Gamow 1928; Esaki 1958; McKagan dkk. 2008).
- **Penerapan nyata dijelaskan (T3):** STM, peluruhan alfa, memori flash/dioda terowongan, dan fusi di Matahari, masing-masing dengan kaitan ke κ dan lebar penghalang serta tombol “Coba di simulasi”.
- **Kuis baru (T2):** 12 soal (tambahan soal E > V₀, massa, energi partikel setelah menembus, tinggi penghalang, |ψ|² setelah penghalang), pengecoh dari miskonsepsi umum, urutan soal dan opsi diacak, mode Latihan/Pretes/Postes, skor tersimpan per kode responden dan dapat diunduh (CSV).
- **Menu Tugas (T10):** tiga tugas terstruktur (menentukan T, energi resonansi pertama, elektron vs proton) yang mencatat jawaban, ketepatan, waktu, jumlah percobaan, perangkat, dan peramban; dapat diunduh (CSV).
- **Tooltip** pada setiap kontrol simulasi (lembar ahli media butir 19).
- **Catatan pembaruan** di footer (versi dan “Apa yang baru?”).

### Perbaikan
- **T sangat kecil (T5):** tidak lagi dibulatkan menjadi “0 %”; dihitung sebagai log₁₀ T dan ditampilkan dalam pangkat sepuluh (contoh: m = 3162 mₑ, V₀ = 12 eV, a = 2 nm, E = 0,05 eV → T ≈ 5,49×10⁻¹⁷³⁰ %), disertai catatan. Animasi ψ tidak lagi galat pada κa ekstrem. Kriteria verifikasi ke-9 ditambahkan.
- **Verifikasi (T6):** uji JavaScript berjalan otomatis saat halaman dibuka; daftar kriteria dicantumkan di halaman.
- **Teori (T7):** solusi untuk E < V₀ (k′ = iκ) dan batas keberlakuan kuantitatif pers. (5).
- **Bahasa (T9):** nama fitur dalam bahasa Indonesia; jumlah fitur di beranda menjadi 6; rujukan “Lampiran proposal” diganti daftar kriteria.
- **Ponsel (T8):** tombol Menu menampilkan semua menu tanpa geser; target sentuh minimal 44 piksel.
- **Aksesibilitas:** kontras teks tema terang ≥ 4,5 : 1, fokus papan ketik terlihat, tautan “Lewati ke konten”, label pada kanvas.
- Mesin Python: integrasi RK4 tervektorisasi (verifikasi ±0,35 s), fungsi `log10_transmission`.
- `tools/build_dist.py` untuk membuat `dist/index.html` satu file secara otomatis.

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
