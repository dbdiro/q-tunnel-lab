# Q-Tunnel Lab — Quantum Tunneling Interactive Lab

**Pengembangan Quantum Tunneling Interactive Lab Berbasis Web untuk Visualisasi Transmisi Partikel**

Proyek Fisika Kuantum · Kelompok 7 · Jalur J1 (Simulasi & Media)

| Anggota | Peran |
|---|---|
| Ernauli Br. Haloho | Koordinator & penulis korespondensi |
| Heny Asvarinda | Penulis / editor utama |
| Dila Badiro | Analis-programmer |

🌐 Demo online: http://labvirtual.sriwijayadev.com/

---

## Tentang
Laboratorium virtual berbasis web yang menyajikan prediksi **mekanika klasik** dan **mekanika kuantum** secara tersinkronisasi untuk penghalang potensial persegi satu dimensi. Perhitungannya diverifikasi dengan Python (NumPy).

### Fitur
- **Interactive Parameter Control**: energi E, tinggi V₀, lebar a, dan massa partikel
- **Dual Physics Visualization**: panel klasik dan kuantum (Re ψ, |ψ|²) berdampingan
- **Transmission Comparison**: T klasik, T kuantum, ΔT, dan simulasi aliran partikel Monte Carlo
- **Classical Limit Explorer**: T terhadap massa dan lebar penghalang, termasuk osilasi resonansi
- **Learning Scenarios**: 8 skenario terpandu
- **Verifikasi fisika**: analitik vs numerik (RK4 dan matriks transfer), di JavaScript maupun Python
- Kuis, ekspor CSV, dan 4 mode tampilan (terang, gelap, biru, klasik)

## Landasan Fisika
Untuk 0 < E < V₀:  T = [1 + V₀² sinh²(κa) / (4E(V₀−E))]⁻¹, dengan κ = √(2m(V₀−E))/ħ
Untuk E > V₀:  T = [1 + V₀² sin²(k′a) / (4E(E−V₀))]⁻¹, dengan k′ = √(2m(E−V₀))/ħ
Untuk E = V₀:  T = [1 + mV₀a²/(2ħ²)]⁻¹, dan R = 1 − T

Contoh acuan: elektron, V₀ = 5 eV, a = 0,4 nm, E = 3 eV menghasilkan κa ≈ 2,90 dan **T ≈ 1,16 %**.

## Struktur Repository
```
index.html              Halaman utama (Beranda, Teori, Simulasi, Analisis, Verifikasi, Kuis, Tim)
assets/
  style.css             Tampilan & 4 tema
  physics.js            Mesin fisika JavaScript (analitik, ψ kompleks, RK4)
  app.js                Visualisasi canvas, skenario, grafik, kuis
  team/                 Foto anggota
server/
  physics.py            Mesin fisika Python (acuan kebenaran)
  app.py                API Flask (/api/health, /api/transmission, /api/verify)
notebook/
  Verifikasi_QTunnel_Pekan12.ipynb   Notebook verifikasi (luaran Pekan 12)
  grafik/               Grafik PNG & tabel CSV hasil notebook
dist/index.html         Versi satu file, siap upload ke hosting
JALANKAN_PYTHON.bat     Menyalakan server Python di Windows
```

## Cara Menjalankan
**Web saja:** buka `index.html` lewat server lokal (misalnya XAMPP: `http://localhost/labvirtual/`).

**Dengan Python:**
```bash
pip install -r requirements.txt
python server/app.py
```
Lalu buka http://localhost:5000/. Di Windows, cukup dobel-klik `JALANKAN_PYTHON.bat`.

**Verifikasi dari terminal:** `python server/physics.py`

**Notebook:** buka `notebook/Verifikasi_QTunnel_Pekan12.ipynb` di Jupyter, VS Code, atau Google Colab.

## Hasil Verifikasi
| Kriteria | Hasil |
|---|---|
| Kekekalan probabilitas T + R = 1 | ✓ |
| Analitik vs numerik (galat < 10⁻⁶) | ✓ (≈ 10⁻⁹) |
| Analitik vs matriks transfer | ✓ |
| Kontinuitas di E = V₀ | ✓ |
| Penghalang tipis a → 0 ⇒ T → 1 | ✓ |
| Penghalang tebal sesuai pendekatan e^(−2κa) | ✓ |
| Resonansi T = 1 saat k′a = nπ | ✓ |
| Massa besar → mendekati klasik | ✓ |
| Contoh proposal T ≈ 1,16 % | ✓ |

## Lisensi
Kode dirilis di bawah [Lisensi MIT](LICENSE). Foto anggota tim tidak termasuk dalam lisensi ini.
