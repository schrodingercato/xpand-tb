# api/ — layanan inferensi VoluTB

Menerima **satu CXR PA sungguhan** (DICOM/JPEG/PNG), menjalankannya lewat pipeline yang sama
dengan jalur riset, dan mengembalikan pseudo-CT + segmentasi + aset peraga 3D yang langsung
dibaca `web/`.

```bash
uv pip install --python .venv/bin/python "fastapi==0.115.6" "uvicorn[standard]==0.33.0" "python-multipart==0.0.20"
.venv/bin/python -m uvicorn api.app:app --port 8000
```

Web dev-nya memproksi `/api` ke port 8000 (`web/vite.config.ts`), jadi cukup jalankan
`npm run dev` di `web/` seperti biasa. Kalau `web/dist` sudah ada, layanan ini **juga** menyajikan
web-nya di `/`, sehingga satu proses cukup untuk demo.

## Endpoint

**Semua rute kasus & aset butuh sesi.** Klinisi melihat kasusnya sendiri, pasien melihat hasilnya
sendiri yang sudah **disetujui**.

| | |
|---|---|
| `POST /api/auth/daftar` | registrasi klinisi (NIP, nama, sandi) → sesi |
| `POST /api/auth/masuk` | masuk; sesi dibawa cookie HttpOnly `volutb_sesi` |
| `POST /api/auth/keluar` · `GET /api/auth/saya` | akhiri / periksa sesi |
| `POST /api/auth/aktivasi` | pasien menukar kode + NIK dengan kata sandinya |
| `GET /api/pasien` · `POST /api/pasien` | daftar & pendaftaran pasien oleh klinisi (klinisi) |
| `POST /api/kasus` | multipart `berkas` (+ `namaPasien`, `catatan`, `pasienId`) → antre (202) |
| `GET /api/kasus` | kasus yang boleh dilihat pemegang sesi, terbaru dulu |
| `GET /api/kasus/{id}` | satu kasus + kepemilikan, status peninjauan, jejak audit |
| `POST /api/kasus/{id}/peninjauan` | gerbang peninjauan: `disetujui`/`revisi`/`ditolak` (klinisi) |
| `DELETE /api/kasus/{id}` | hapus kasus + seluruh asetnya (pemilik) |
| `GET /api/kasus/{id}/berkas` | CXR asli apa adanya (audit) |
| `GET /api/saya/hasil` | hasil disetujui milik pasien, tanpa angka teknis (pasien) |
| `GET /api/status` | model dimuat?, panjang antrean, GPU |
| `GET /api/aset/{id}/{nama}` | aset kasus (PNG, sprite-sheet, mesh `.bin`, meta JSON) |

Aset **tidak lagi** disajikan `StaticFiles` terbuka: tiap berkas lewat pemeriksaan akses yang sama
dengan kasusnya, karena id kasus muncul di URL halaman dan bukan rahasia.

## Tahapan pipeline (`api/pipeline.py`)

    baca berkas → mask blok/teks terbakar → crop siluet → normalisasi
    → histogram matching ke bank referensi DRR → resize 128²
    → penyelarasan framing ke template DRR → rekonstruksi (DVG-Diffusion, 1 view)
    → segmentasi heuristik 3 kelas → sprite-sheet + mesh + lateral sintetis (DRR 90°)

Urutan itu **persis** jalur yang dipakai saat checkpoint dilatih & dievaluasi
(`scripts/finetune_dvg_diffusion.load_cxr(..., reference=..., align=True)`). Melewati satu tahap
tidak menghasilkan galat — cuma hasil yang buruk secara diam-diam.

Terukur di mesin ini (2×RTX 2080 SUPER), model sudah panas: **~16 detik/kasus** (pra-proses 3.7 s,
rekonstruksi 10 s, segmentasi 1.7 s, aset 0.5 s). Kasus pertama menambah ~15 detik untuk memuat
model.

## Keputusan yang perlu diketahui sebelum mengubah

- **Satu pekerja, model menetap.** Mesin ini 2×8 GB; dua rekonstruksi bersamaan = OOM. Model
  dilepas otomatis setelah menganggur `VOLUTB_API_IDLE_S` detik (default 900) supaya training
  bisa memakai VRAM-nya, dan dimuat lagi saat ada kasus baru.
- **Hasil di berkas, relasi di basis data.** Satu direktori per kasus di `outputs/api/<id>/`,
  `kasus.json` di dalamnya, ditulis atomik (pekerja menulis sementara peramban mem-polling).
  Akun, sesi, kepemilikan kasus, dan jejak audit ada di SQLite `outputs/volutb.db` (`api/db.py`),
  yang berdiri **di atas** berkas-berkas itu, bukan menggantikannya.
- **NIK & NIP disimpan sebagai sidik bergaram**, plus bentuk tersamar untuk ditampilkan. Garamnya
  `VOLUTB_SECRET`, atau `outputs/.secret` yang dibuat sekali. **Ganti garam = seluruh akun tidak
  bisa dicari lagi** — jangan hapus berkas itu.
- **Lateral sintetis dirender dari pseudo-CT kasus itu** (DRR pose 0, deterministik). Gagal
  merendernya tidak menjatuhkan kasus: sebabnya masuk ke `hasil.lateralGalat` dan tampil di layar.
- **Seed sampling dipatok** (`VOLUTB_API_SEED`, default 0). Terverifikasi: dua unggahan berkas
  yang sama → MAE 4e-8 antar volume. Tanpa seed, dua unggahan berkas yang sama memberi volume
  berbeda (terukur MAE ~0,06) dan jumlah kavitasnya ikut berbeda.
- **Label lobus dari model rujukan** (`lungmask` LTRCLobes + pengisi R231, `VOLUTB_API_LOBUS=1`).
  Kalau modelnya tidak tersedia, pipeline tetap jalan dan temuan dilabeli **zona geometrik** —
  antarmuka menyebutkan bedanya, karena zona geometrik bukan lobus dan tidak boleh diberi nama
  lobus.

Konfigurasi lewat env: `VOLUTB_API_CHECKPOINT`, `VOLUTB_API_FOV`, `VOLUTB_API_SEED`,
`VOLUTB_API_IDLE_S`, `VOLUTB_API_MAX_BYTES`, `VOLUTB_API_LOBUS`, `VOLUTB_DB`, `VOLUTB_SECRET`,
`VOLUTB_SESI_JAM`, `VOLUTB_COOKIE_SECURE`.

## ⚠️ Yang BELUM ada — jangan dianggap ada

- **Verifikasi NIP.** Registrasi klinisi tidak dicek ke pangkalan data kepegawaian mana pun: siapa
  pun yang bisa menjangkau layanan ini bisa membuat akun klinisi. **Jangan diikat ke `0.0.0.0` di
  jaringan bersama.** Default `--host 127.0.0.1` bukan kebetulan.
- **Enkripsi NIK yang sebenarnya** (Tabel 3.1). Yang ada sidik bergaram — cukup untuk menutup
  "berkas basis data terbawa", bukan untuk melawan pencarian paksa kalau garamnya ikut bocor.
- **Token anti-CSRF penuh.** Yang menjaga baru `SameSite=Lax`.
- **Kasus warisan.** Kasus yang dibuat sebelum lapisan akun ada tidak punya pemilik dan terlihat
  oleh **semua** klinisi; daftar kasus menandainya "tanpa pemilik".
- **Validasi silang 2D.**
- **Antrean lintas-proses (Celery/RQ).** Antreannya di dalam proses; kalau layanan mati, kasus
  yang masih antre hilang (berkasnya tetap ada di `outputs/api/`, tinggal diunggah ulang).

Status `selesai` berarti pipeline selesai — **bukan** persetujuan klinis. Yang dibaca tampilan
pasien adalah `statusPeninjauan == "disetujui"`, dan itu keputusan manusia lewat
`POST /api/kasus/{id}/peninjauan`.

## Uji

```bash
.venv/bin/python -m pytest tests/test_api_auth.py tests/test_pipeline_lateral.py -q
```

`test_api_auth.py` menjaga aturan aksesnya (siapa melihat kasus siapa, kapan pasien mulai bisa
melihat hasilnya, aset ikut terjaga, NIK mentah tidak tersimpan) — kekeliruan di situ tidak
membuat apa pun error, ia cuma diam-diam menunjukkan data pasien orang lain.

## Batasan hasil yang wajib ikut dilaporkan

Segmenter kavitasnya **belum tervalidasi terhadap anotasi ahli**, dan pada 26 pasien berpasangan
kesepakatan kavitas pseudo-CT terhadap CT asli terukur **Dice 0,000** (§15 `STATUS_BERJALAN.md`)
— bentuk lapangan paru selamat melewati rekonstruksi (Dice 0,74–0,77), letak kavitasnya tidak.
Antarmuka sudah menyatakan ini di layar; jangan hapus peringatannya tanpa mengganti angkanya.
