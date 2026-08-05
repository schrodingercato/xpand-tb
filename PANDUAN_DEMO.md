*Panduan Demo Xpand-TB (Arsitektur Hybrid)* 🚀

*Kenapa harus hybrid?*
Backend AI Xpand-TB (buatan Ilena) itu _berat banget_ buat proses 3D pake PyTorch. Kalo di-deploy ke cloud gratisan pasti langsung crash/OOM dan kalo sewa server GPU harganya mahal.
Solusinya:
• Frontend tetep di Vercel (https://xpand-tb.vercel.app)
• Backend jalan di laptop kita sendiri yg speknya kuat
• Keduanya disambungin pake Ngrok

A. *Buat Admin (Yang pegang server)*

*Langkah 1: Download Code (Clone Repo)*
1. Buka Terminal atau Command Prompt di laptop Anda.
2. Download sistem milik Ilena dengan mengetik perintah ini lalu Enter:
```git clone https://github.com/ilena031/Gemastik2026.git```
3. Buka aplikasi *File Explorer* (Windows) atau Finder (Mac).
4. Cari dan buka folder `Gemastik2026` yang baru saja di-download tadi.
5. Klik pada *Address Bar* (kolom alamat folder di bagian atas), ketik ```cmd``` lalu tekan Enter. Layar hitam Terminal akan otomatis terbuka di dalam folder tersebut.

*Langkah 2: Menyalakan Server Lokal*
1. Nyalakan virtual environment dengan mengetik ini di terminal tadi:
• Windows: ```.venv\Scripts\activate```
• Mac/Linux: ```source .venv/bin/activate```
2. Nyalakan server lokalnya dengan mengetik:
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
