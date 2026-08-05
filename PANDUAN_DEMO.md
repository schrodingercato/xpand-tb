# Panduan Demo Xpand-TB (Arsitektur Hybrid) 🚀

## Kenapa harus hybrid?
Backend AI Xpand-TB (buatan Ilena) itu **berat banget** buat memproses citra 3D Rontgen pakai pustaka AI bernama *PyTorch*. 
- Kalau di-deploy ke cloud gratisan (seperti Render/Heroku), servernya pasti langsung *crash* atau *Out Of Memory* (OOM).
- Kalau sewa server cloud yang punya GPU sungguhan, harganya sangat mahal (ratusan ribu hingga jutaan per bulan).

**Solusi Cerdas:**
- **Frontend (Tampilan Web):** Tetap di-deploy di Vercel secara gratis (`https://xpand-tb.vercel.app`).
- **Backend (Otak AI):** Dijalankan secara tersembunyi di **laptop kita sendiri** yang spesifikasinya kuat.
- Keduanya akan disambungkan secara gaib menggunakan jembatan internet bernama **Ngrok**.

---

## 👩‍💻 A. Buat Admin (Yang Pegang Server ML)
*Bagian ini HANYA dilakukan oleh orang yang memegang laptop berisi kode AI Ilena.*

### Langkah 1: Membuka Folder Repositori
1. Buka aplikasi **File Explorer** (Windows) atau Finder (Mac).
2. Cari dan buka folder repositori `Gemastik2026` milik Ilena.
3. Klik pada **Address Bar** (bilah alamat folder di bagian atas), lalu ketik `cmd` dan tekan **Enter**.
4. Layar hitam Terminal (Command Prompt) akan terbuka persis di dalam folder tersebut.

### Langkah 2: Menyalakan Server Lokal
1. Di Terminal yang baru terbuka, kita harus menyalakan "lingkungan buatan" (Virtual Environment) Python terlebih dahulu. Ketik perintah ini dan tekan Enter:
   - Jika pakai Windows: `.venv\Scripts\activate`
   - Jika pakai Mac/Linux: `source .venv/bin/activate`
2. Setelah aktif (biasanya ada tulisan `(.venv)` di pinggir terminal), nyalakan server dengan mengetik:
   ```bash
   python -m uvicorn api.app:app --port 8000
   ```
3. Tunggu sampai muncul tulisan `Application startup complete`. Jangan tutup layar hitam ini! Server AI Anda sekarang sudah menyala secara lokal.

### Langkah 3: Menyalakan Jembatan Ngrok
Server Anda sudah menyala, tapi juri di internet belum bisa mengaksesnya. Kita harus membuatkan jembatannya.
1. Pastikan Anda sudah mengunduh file aplikasi **Ngrok** dari situs web resminya (`ngrok.com`) dan sudah pernah mendaftar akun gratis di sana (untuk mendapatkan kode *Auth Token* jika diminta).
2. Buka Terminal/CMD **BARU** (biarkan terminal pertama tetap jalan).
3. Ketikkan perintah ini dan tekan Enter:
   ```bash
   ngrok http 8000
   ```
4. Ngrok akan memunculkan layar hitam baru dengan beberapa baris teks. Cari tulisan yang berbunyi **Forwarding**.
5. Di sebelah kanan tulisan Forwarding, Anda akan melihat tautan unik (contoh: `https://abcd-123.ngrok.app`). 
6. **Blok (Copy) tautan Ngrok yang berawalan HTTPS tersebut**, lalu berikan/kirimkan ke Juri (Tester) melalui WhatsApp atau Zoom Chat.

---

## 🧑‍⚕️ B. Buat Juri / Tester (Pengguna)
*Bagian ini dilakukan oleh juri atau siapa pun yang ingin mencoba aplikasi.*

1. Buka web resmi Xpand-TB dari browser (Chrome/Edge): **`https://xpand-tb.vercel.app`**
2. Di halaman **Login**, coba perhatikan pojok kanan bawah layar. Anda akan melihat ikon **gerigi rahasia (⚙️)**. 
3. Klik ikon gerigi ⚙️ tersebut.
4. Sebuah kotak akan muncul. **Paste (Tempelkan) tautan Ngrok** yang Anda dapatkan dari Admin tadi (contoh: `https://abcd-123.ngrok.app`), lalu klik **OK**.
5. Halaman web akan memuat ulang (refresh) secara otomatis.
6. Sekarang, silakan login memakai akun dokter:
   - **NIP:** `197001011990031001`
   - **Sandi:** `demo1234`
7. Selesai! Anda sudah bisa langsung mencoba fitur **Upload Foto Rontgen (CXR)**.

> ⚠️ **Catatan Penting (Mode Mock):** 
> Kalau ikon gerigi (⚙️) tadi dikosongkan (tanpa diisi link Ngrok), web Vercel ini akan otomatis masuk ke **Mode Mock**. Mode Mock ini HANYA bisa digunakan untuk melihat-lihat desain UI dan fitur Dasbor saja. Namun, jika Anda mencoba memencet tombol Upload Rontgen, proses AInya tidak akan berfungsi karena tidak tersambung ke server milik Admin.
