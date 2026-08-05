*Panduan Demo Xpand-TB (Arsitektur Hybrid)* 🚀

*Kenapa harus hybrid?*
Backend AI Xpand-TB (buatan Ilena) itu _berat banget_ buat proses 3D pake PyTorch. Kalo di-deploy ke cloud gratisan pasti langsung crash/OOM dan kalo sewa server GPU harganya mahal.
Solusinya:
• Frontend tetep di Vercel (https://xpand-tb.vercel.app)
• Backend jalan di laptop kita sendiri yg speknya kuat
• Keduanya disambungin pake Ngrok

A. *Buat Admin (Yang pegang server)*

*Langkah 1: Download & Update Code*
1. Buka aplikasi *File Explorer* (Windows) atau Finder (Mac).
2. *Jika Anda belum punya file-nya:* Buka Terminal, lalu ketik perintah ini buat men-download:
```git clone https://github.com/ilena031/Gemastik2026.git```
Lalu cari folder `Gemastik2026` yang baru terdownload tersebut.
3. *Jika foldernya sudah ada:* Langsung saja buka folder `Gemastik2026` tersebut di File Explorer.
4. Buka Terminal di folder tersebut. Cara paling gampang: *Klik kanan di area kosong* di dalam folder itu, lalu pilih *Open in Terminal*. (Atau buka aplikasi Terminal biasa, ketik ```cd``` spasi, lalu *paste* alamat foldernya dan Enter).
5. Ketik perintah ini lalu Enter untuk memastikan sistem ter-update:
```git pull origin main```

*Langkah 2: Menyiapkan dan Menyalakan Server Lokal*
1. *Hanya untuk pertama kali:* Buat virtual environment dengan mengetik:
```python -m venv .venv```
2. Nyalakan virtual environment tersebut dengan mengetik:
• Windows: ```.\.venv\Scripts\activate``` (Atau ```.\.venv\bin\activate``` jika folder Scripts tidak ditemukan).
• Mac/Linux: ```source .venv/bin/activate```
3. *Hanya untuk pertama kali:* Install semua mesin AI-nya dengan mengetik:
```pip install -e ".[api]"```
(Tunggu sampai proses download selesai, ini mungkin memakan waktu agak lama karena file AI sangat besar).
4. Setelah semuanya selesai, nyalakan server lokalnya dengan mengetik:
```python -m uvicorn api.app:app --port 8000```
3. Biarkan terminal ini tetap terbuka dan menyala.

*Langkah 3: Nge-bridge pake Ngrok*
1. Buka Terminal/CMD yang *BARU*.
2. Buat jembatan dengan mengetik: 
```ngrok http 8000```
3. Copy link Ngrok yang depannya https (misal: https://abcd.ngrok.app) dan kasih ke juri/tester lewat WA atau Zoom.

---

B. *Buat Juri/Tester*

1. Buka web https://xpand-tb.vercel.app
2. Di halaman Login cek pojok kanan bawah, klik ikon gerigi ⚙️
3. Paste link Ngrok dari admin tadi trus klik OK
4. Login pake akun dokter:
• NIP: ```197001011990031001```
• Sandi: ```demo1234```
5. Udah bisa langsung coba upload foto rontgen (CXR) 🎉

_Note: Kalo ikon geriginya dikosongin webnya bakal otomatis masuk ke Mode Mock. Cuma bisa liat-liat UI aja tapi fitur upload AI ga bisa dipake karena ga nyambung ke server._
