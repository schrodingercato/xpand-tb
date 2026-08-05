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

*Langkah 2: Menyiapkan Mesin AI (Otomatis dengan UV)*
Karena modul AI ini butuh Python versi spesifik (3.8) dan sering bentrok jika memakai Python bawaan Windows/MSYS2, kita akan menggunakan *package manager* AI bernama **UV** agar instalasinya 100% otomatis.
1. *Hanya untuk pertama kali:* Buka PowerShell (Terminal), lalu ketik perintah ini untuk menginstal UV:
```powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"```
2. **Tutup Terminal Anda**, lalu buka kembali Terminal yang baru di folder `Gemastik2026` agar UV bisa terbaca.
3. *Hanya untuk pertama kali:* Buat virtual environment (UV akan otomatis mendownload Python 3.8 yang paling cocok):
```uv venv --python 3.8```
4. Nyalakan virtual environment-nya:
• Windows: ```.\.venv\Scripts\activate```
• Mac/Linux: ```source .venv/bin/activate```
5. *Hanya untuk pertama kali:* Install semua library AI-nya (proses ini bebas dari error SSL):
```uv pip install -e ".[api]"```
*(Tunggu sampai proses download selesai, mungkin agak lama karena file PyTorch sangat besar).*
6. Jika sudah selesai, jalankan servernya:
```python -m uvicorn api.app:app --port 8000```
7. Biarkan terminal ini tetap terbuka dan menyala.

*Langkah 3: Menyambungkan dengan Internet (Tanpa Ngrok / Tanpa Install)*
Daripada repot menginstal aplikasi Ngrok, kita bisa menggunakan fitur bawaan Windows bernama SSH untuk membuat *bridge* secara instan.
1. Buka Terminal/PowerShell yang *BARU*.
2. Buat jembatan publik dengan mengetik perintah ini lalu Enter: 
```ssh -p 443 -R0:127.0.0.1:8000 a.pinggy.io```
*(Jika muncul pertanyaan "Are you sure you want to continue connecting?", ketik `yes` lalu Enter).*
3. Di layar terminal akan muncul sebuah kotak teks besar. Cari dan salin *(copy)* link URL-nya (biasanya berawalan `https://....a.pinggy.link`).
4. Link ini akan otomatis mati jika terminal Anda ditutup, jadi biarkan terminal ini tetap terbuka.

---

B. *Buat Juri/Tester*

Jika Admin sudah menyalakan mesin AI lokal, Juri bisa langsung menguji AI sungguhan dengan cara:

1. Buka link Pinggy/Ngrok yang diberikan Admin (misal: `https://oknwy...pinggy.link`).
   *(Jika ada halaman peringatan Pinggy "You are about to visit...", klik tombol "Visit Site").*
2. Anda akan melihat Web Xpand-TB terbuka! Scroll ke paling bawah, klik **ikon gerigi ⚙️**.
3. *Paste* kembali link Pinggy yang sama persis (wajib pakai `https://`) lalu klik OK.
4. Jika ikon gerigi menyala terang, Login pake akun dokter:
• NIP: ```197001011990031001```
• Sandi: ```demo1234```
5. Udah bisa langsung coba upload foto rontgen (CXR) dan melihat AI berproses secara *real-time*! 🎉

_Note: Jika ingin melihat-lihat tampilan UI secara cepat tanpa butuh server AI (Mode Mock), Anda bisa kapan saja mengunjungi **https://xpand-tb.vercel.app** dan mengosongkan ikon geriginya._
