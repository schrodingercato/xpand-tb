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
```ssh -p 443 -R0:localhost:8000 a.pinggy.io```
*(Jika muncul pertanyaan "Are you sure you want to continue connecting?", ketik `yes` lalu Enter).*
3. Di layar terminal akan muncul sebuah kotak teks besar. Cari dan salin *(copy)* link URL-nya (biasanya berawalan `https://....a.pinggy.link`).
4. Link ini akan otomatis mati jika terminal Anda ditutup, jadi biarkan terminal ini tetap terbuka.

---

B. *Buat Juri/Tester*

1. Buka web https://xpand-tb.vercel.app
2. Scroll ke paling bawah halaman utama (atau di halaman Login), cari dan klik **ikon gerigi ⚙️** di pojok kanan bawah.
3. Paste link Pinggy/Ngrok secara utuh (wajib ada `https://` di depannya) lalu klik OK.
4. Jika URL berhasil tersimpan, ikon gerigi ⚙️ akan berubah menjadi **menyala terang**.
5. Login pake akun dokter:
• NIP: ```197001011990031001```
• Sandi: ```demo1234```
6. Udah bisa langsung coba upload foto rontgen (CXR) 🎉

_Note: Kalo ikon geriginya dikosongin webnya bakal otomatis masuk ke Mode Mock. Cuma bisa liat-liat UI aja tapi fitur upload AI ga bisa dipake karena ga nyambung ke server._
