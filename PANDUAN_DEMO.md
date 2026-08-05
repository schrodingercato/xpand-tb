# Panduan Arsitektur Hybrid (Demo Xpand-TB)

Panduan ini ditujukan bagi anggota tim yang ingin mendemonstrasikan fitur **Artificial Intelligence (AI) / Machine Learning** dari Xpand-TB secara nyata (memproses foto rontgen menjadi 3D) dengan tetap menggunakan web Vercel publik (`https://xpand-tb.vercel.app`).

## ❓ Mengapa Arsitektur Ini Diperlukan?
Mungkin Anda bertanya-tanya: *"Kenapa backend-nya tidak di-deploy sekalian ke Vercel atau Render?"*

Jawabannya adalah karena **Backend AI Xpand-TB (buatan Ilena) sangatlah berat**. Proses segmentasi dan rekonstruksi 3D menggunakan pustaka **PyTorch** membutuhkan **Kartu Grafis (GPU)** dan RAM yang sangat besar. Layanan cloud gratis di internet tidak mampu menjalankannya (akan langsung *crash* / *Out of Memory*). Untuk menyewa cloud dengan GPU, biayanya bisa mencapai ratusan ribu hingga jutaan rupiah per bulan.

**Solusi Arsitektur Hybrid:**
Kita memisahkan beban kerjanya! 
1. **Frontend (Antarmuka Web)** dititipkan di Vercel secara gratis.
2. **Backend (Otak AI)** dijalankan di **laptop Anda sendiri** yang memiliki spesifikasi tinggi.
3. Web Vercel akan dihubungkan secara gaib ke laptop Anda menggunakan teknologi yang disebut **Ngrok**.

---

## 👩‍💻 A. Panduan Untuk Admin (Orang yang Menyalakan Server AI)
*Orang ini harus memiliki laptop berspesifikasi mumpuni (memiliki GPU/CUDA jika memungkinkan) dan bertugas "menghidupkan" otak AI.*

### Langkah 1: Jalankan Backend Ilena
1. Buka folder repositori **Gemastik2026** (milik Ilena) di terminal Anda.
2. Aktifkan *virtual environment* Python Anda.
3. Jalankan perintah ini untuk menyalakan server lokal:
   ```bash
   python -m uvicorn api.app:app --port 8000
   ```
   *Biarkan terminal ini terbuka dan menyala.*

### Langkah 2: Hubungkan Laptop ke Internet Publik (Ngrok)
Karena web Vercel berada di internet publik (HTTPS), web tersebut tidak bisa asal masuk ke laptop Anda. Kita butuh jembatan.
1. Download dan instal **Ngrok** dari [ngrok.com](https://ngrok.com).
2. Buka terminal *baru*, lalu ketikkan perintah:
   ```bash
   ngrok http 8000
   ```
3. Ngrok akan memunculkan layar hitam berisi tautan **Forwarding**. Salin tautan yang berawalan `https://` (contoh: `https://abcd-123.ngrok.app`).
4. **Kirim tautan Ngrok tersebut kepada teman/juri yang akan mencoba Vercel.**

---

## 🧑‍⚕️ B. Panduan Untuk Pengguna (Juri / Penguji Demo)
*Ini adalah langkah yang dilakukan oleh orang yang membuka web Vercel Anda dari komputer mereka.*

1. Buka situs web resmi Xpand-TB: **https://xpand-tb.vercel.app**
2. Di halaman **Login**, perhatikan bagian paling bawah (di sudut kanan bawah layar). Anda akan melihat **ikon gerigi (⚙️)** kecil. Klik ikon tersebut.
3. Akan muncul kotak dialog. **Paste / Tempelkan tautan Ngrok** yang diberikan oleh Admin tadi (contoh: `https://abcd-123.ngrok.app`).
4. Klik **OK**. Halaman akan dimuat ulang.
5. Silakan masuk menggunakan akun Dokter:
   - **NIP:** `197001011990031001`
   - **Sandi:** `demo1234`
6. Cobalah mengunggah foto Rontgen (CXR).
   
**Apa yang terjadi?**
Foto rontgen yang Anda unggah dari peramban (browser) Anda akan dikirim melesat melalui internet menuju **laptop Admin (di rumahnya)**. Laptop Admin akan memproses foto tersebut menjadi 3D, lalu mengirimkan hasilnya kembali ke peramban Anda! Semua terlihat sangat ajaib dan profesional.

> **Catatan Mode Demo (Tanpa Admin):**
> Jika Anda tidak mengisi tautan Ngrok di tombol (⚙️) tadi (membiarkannya kosong), web Vercel akan otomatis berjalan dalam **Mode Mock**. Mode Mock memungkinkan Anda masuk ke Dasbor untuk sekadar melihat-lihat desain UI, namun fitur unggah AI tidak akan berfungsi karena tidak ada server yang menyala.
