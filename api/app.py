"""Layanan HTTP VoluTB: unggah CXR sungguhan → pseudo-CT + segmentasi + aset peraga 3D.

    .venv/bin/python -m uvicorn api.app:app --host 127.0.0.1 --port 8000

Endpoint:

    POST   /api/kasus            multipart `berkas` (+ `namaPasien`, `catatan`) → kasus antre
    GET    /api/kasus            daftar kasus, terbaru dulu
    GET    /api/kasus/{id}       satu kasus lengkap (status, tahap, hasil)
    DELETE /api/kasus/{id}       hapus kasus + seluruh asetnya
    GET    /api/status           kesehatan layanan: model dimuat?, panjang antrean, GPU
    GET    /api/aset/{id}/...    aset statis kasus (PNG, sprite-sheet, mesh .bin, meta JSON)

Rute akun & kepemilikan ada di `api/auth.py` + `api/db.py`:

    POST   /api/auth/daftar      registrasi klinisi
    POST   /api/auth/masuk       masuk (cookie sesi HttpOnly)
    POST   /api/auth/aktivasi    pasien menukar kode aktivasi dengan kata sandinya
    GET/POST /api/pasien         daftar & pendaftaran pasien oleh klinisi
    POST   /api/kasus/{id}/peninjauan   gerbang peninjauan klinis (KF-08)

**Seluruh rute kasus & aset butuh sesi.** Klinisi hanya melihat kasus miliknya sendiri, pasien
hanya melihat hasil miliknya yang sudah **disetujui** klinisi. Aset peraga tidak lagi disajikan
lewat `StaticFiles` terbuka — lihat `aset()` di bawah untuk alasannya.

## Yang masih belum ada

- **Verifikasi NIP.** Registrasi klinisi tidak dicek ke pangkalan data kepegawaian mana pun;
  siapa pun yang bisa menjangkau layanan ini bisa membuat akun klinisi.
- **Enkripsi NIK yang sebenarnya.** Yang ada hash bergaram (lihat `api/db.py`), bukan kunci yang
  bisa dirotasi.
- **Token anti-CSRF penuh.** Yang menjaga baru `SameSite=Lax`.

Karena itu, tetap: **jangan diikat ke 0.0.0.0 di jaringan bersama, dan jangan diberi data pasien
sungguhan.** Default `--host 127.0.0.1` bukan kebetulan. Status `selesai` = pipeline selesai;
persetujuan klinis adalah `statusPeninjauan == 'disetujui'`, dan itu keputusan manusia.
"""
import os
import sqlite3
import sys
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from api import auth, db, pipeline, store  # noqa: E402
from api.auth import butuh_klinisi, butuh_pengguna  # noqa: E402

# 200 MB: CXR DICOM full-resolution jarang lewat 40 MB, tapi ekspor PACS 16-bit bisa besar.
# Batasnya ada supaya satu unggahan salah tidak mengisi disk, bukan sebagai kebijakan klinis.
MAX_BYTES = int(os.environ.get("VOLUTB_API_MAX_BYTES", 200 * 1024 * 1024))
EKSTENSI_DIIZINKAN = {".dcm", ".dicom", ".ima", ".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ""}

app = FastAPI(title="VoluTB API", version="0.2.0")
app.include_router(auth.router)
app.include_router(auth.pasien_router)

# Dev: Vite jalan di :5173 dan boleh memanggil langsung. Di produksi web-nya disajikan dari
# origin yang sama, jadi daftar ini tidak dipakai.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _mulai() -> None:
    store.KASUS_DIR.mkdir(parents=True, exist_ok=True)
    db.siapkan()
    pipeline.mulai_pekerja()


# ---------------------------------------------------------------------------
# Kendali akses kasus
# ---------------------------------------------------------------------------


def _boleh_lihat(kasus_id: str, pengguna: sqlite3.Row) -> bool:
    """Klinisi: kasusnya sendiri (dan kasus warisan tanpa pemilik). Pasien: kasusnya sendiri yang
    sudah disetujui — status `selesai` dari pipeline tidak cukup, karena itu bukan persetujuan."""
    meta = db.meta_kasus(kasus_id)
    if pengguna["peran"] == "klinisi":
        return meta.get("warisan", False) or meta.get("pemilikId") == pengguna["id"]
    return meta.get("pasienId") == pengguna["id"] and meta.get("statusPeninjauan") == "disetujui"


def _pastikan_boleh(kasus_id: str, pengguna: sqlite3.Row) -> dict:
    kasus = store.baca(kasus_id)
    # 404, bukan 403, untuk kasus milik orang lain: membedakan keduanya memberi tahu penanya
    # bahwa kasus dengan id itu ada di fasilitas ini.
    if kasus is None or not _boleh_lihat(kasus_id, pengguna):
        raise HTTPException(status_code=404, detail="Kasus tidak ditemukan.")
    return kasus


def _pastikan_pemilik(kasus_id: str, klinisi: sqlite3.Row) -> dict:
    kasus = _pastikan_boleh(kasus_id, klinisi)
    meta = db.meta_kasus(kasus_id)
    if not meta.get("warisan") and meta.get("pemilikId") != klinisi["id"]:
        raise HTTPException(status_code=403, detail="Kasus ini milik klinisi lain.")
    return kasus


# Aset peraga (sprite-sheet, mesh, PNG jalur citra) dulu disajikan `StaticFiles` tanpa penjagaan.
# Itu berarti seluruh isi medis kasus bisa diambil siapa pun yang tahu id-nya — id-nya sendiri
# tidak rahasia, ia muncul di URL halaman. Sekarang tiap berkas lewat pemeriksaan akses yang
# sama dengan kasusnya.
@app.get("/api/aset/{kasus_id}/{nama}")
def aset(kasus_id: str, nama: str, pengguna: sqlite3.Row = Depends(butuh_pengguna)):
    _pastikan_boleh(kasus_id, pengguna)
    # `nama` masuk ke path: tolak apa pun yang bisa keluar dari direktori kasus.
    if "/" in nama or "\\" in nama or ".." in nama:
        raise HTTPException(status_code=400, detail="Nama berkas tidak valid.")
    path = store.dir_kasus(kasus_id) / nama
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Aset tidak ada.")
    return FileResponse(path)


@app.get("/api/status")
def status():
    info = {
        "modelDimuat": pipeline.MODEL.dimuat,
        "checkpoint": pipeline.MODEL.checkpoint,
        "antre": pipeline.ANTREAN.qsize(),
        "fov": pipeline.FOV,
        "idleUnloadDetik": pipeline.IDLE_UNLOAD_S,
    }
    try:
        import torch
        info["cuda"] = torch.cuda.is_available()
        info["gpu"] = [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]
    except ImportError:
        info["cuda"] = False
        info["galatTorch"] = "Modul AI (PyTorch) dinonaktifkan di versi Demo Cloud."
    except Exception as e:  # noqa: BLE001
        info["cuda"] = False
        info["galatTorch"] = str(e)
    return info


@app.get("/api/kasus")
def daftar_kasus(pengguna: sqlite3.Row = Depends(butuh_pengguna)):
    """Kasus yang boleh dilihat pemegang sesi ini, terbaru dulu.

    Penyaringannya di sini, bukan di web: daftar yang dikirim ke peramban sudah tidak memuat
    kasus orang lain sama sekali, jadi "tersembunyi di antarmuka" tidak pernah jadi satu-satunya
    yang menjaga.
    """
    return [
        {**k, **db.meta_kasus(k["id"])}
        for k in store.daftar()
        if _boleh_lihat(k["id"], pengguna)
    ]


@app.post("/api/kasus", status_code=202)
async def buat_kasus(
    berkas: UploadFile = File(...),
    namaPasien: str = Form(""),
    catatan: str = Form(""),
    pasienId: str = Form(""),
    klinisi: sqlite3.Row = Depends(butuh_klinisi),
):
    suffix = Path(berkas.filename or "cxr").suffix.lower()
    if suffix not in EKSTENSI_DIIZINKAN:
        raise HTTPException(
            status_code=415,
            detail=f"Ekstensi '{suffix}' tidak didukung. Pakai DICOM (.dcm) atau citra "
            "(.jpg/.png/.tif). Berkas tanpa ekstensi diperlakukan sebagai DICOM.",
        )

    kasus_id = store.id_baru()
    d = store.dir_kasus(kasus_id)
    d.mkdir(parents=True, exist_ok=True)
    nama_simpan = f"cxr{suffix or '.dcm'}"
    tujuan = d / nama_simpan

    # Disalin streaming: berkas DICOM bisa puluhan MB dan tidak ada gunanya menahan semuanya di
    # memori proses yang juga memegang model.
    ukuran = 0
    with tujuan.open("wb") as keluar:
        while True:
            potongan = await berkas.read(1024 * 1024)
            if not potongan:
                break
            ukuran += len(potongan)
            if ukuran > MAX_BYTES:
                keluar.close()
                store.hapus(kasus_id)
                raise HTTPException(status_code=413, detail=f"Berkas melebihi {MAX_BYTES/1e6:.0f} MB.")
            keluar.write(potongan)
    if ukuran == 0:
        store.hapus(kasus_id)
        raise HTTPException(status_code=400, detail="Berkas kosong.")

    # Kasus boleh ditautkan ke akun pasien, boleh juga tidak (mis. citra yang diunggah sebelum
    # pasiennya sempat didaftarkan). Yang tidak boleh: menunjuk pasien milik klinisi lain.
    pasien_id: Optional[int] = None
    if pasienId.strip():
        try:
            pasien_id = int(pasienId)
        except ValueError:
            raise HTTPException(status_code=422, detail="pasienId tidak valid.")
        milik = {p["id"] for p in db.daftar_pasien(klinisi["id"])}
        if pasien_id not in milik:
            store.hapus(kasus_id)
            raise HTTPException(status_code=403, detail="Pasien tersebut tidak terdaftar pada Anda.")

    kasus = store.tulis(
        {
            "id": kasus_id,
            "namaPasien": namaPasien.strip(),
            "catatan": catatan.strip(),
            "berkasAsli": nama_simpan,
            "namaUnggahan": berkas.filename,
            "ukuranByte": ukuran,
            "status": "antre",
            "tahap": "antre",
            "progres": 0,
            "galat": None,
            "hasil": None,
            "dibuat": store.sekarang(),
            "diperbarui": store.sekarang(),
        }
    )
    db.daftar_kasus_pemilik(kasus_id, klinisi["id"], pasien_id)
    db.catat(kasus_id, klinisi["id"], f"Mengunggah citra {berkas.filename}")
    posisi = pipeline.antrekan(kasus_id)
    return JSONResponse({**store.ringkas(kasus), "posisiAntrean": posisi}, status_code=202)


@app.get("/api/kasus/{kasus_id}")
def ambil_kasus(kasus_id: str, pengguna: sqlite3.Row = Depends(butuh_pengguna)):
    kasus = _pastikan_boleh(kasus_id, pengguna)
    return {**kasus, **db.meta_kasus(kasus_id), "jejakAudit": db.jejak_audit(kasus_id)}


class Peninjauan(BaseModel):
    status: str
    catatan: str = ""


@app.post("/api/kasus/{kasus_id}/peninjauan")
def tinjau_kasus(
    kasus_id: str, badan: Peninjauan, klinisi: sqlite3.Row = Depends(butuh_klinisi)
):
    """Gerbang peninjauan klinis (KF-08) — keputusan manusia, disimpan dan dicatat.

    Ini yang membedakan `selesai` (pipeline berhenti) dari `disetujui` (klinisi bertanggung
    jawab): tampilan pasien membaca status ini, bukan status pipeline.
    """
    if badan.status not in {"menunggu", "disetujui", "revisi", "ditolak"}:
        raise HTTPException(status_code=422, detail="Status peninjauan tidak dikenal.")
    kasus = _pastikan_pemilik(kasus_id, klinisi)
    if kasus.get("status") != "selesai" and badan.status == "disetujui":
        raise HTTPException(
            status_code=409, detail="Kasus yang pipeline-nya belum selesai tidak bisa disetujui."
        )
    # Kasus warisan belum punya baris kepemilikan; menyetujuinya berarti klinisi ini
    # mengambilnya sebagai miliknya, dan itu tercatat.
    if db.baris_kasus(kasus_id) is None:
        db.daftar_kasus_pemilik(kasus_id, klinisi["id"], None)
    db.set_peninjauan(kasus_id, badan.status, badan.catatan.strip(), klinisi["id"])
    db.catat(kasus_id, klinisi["id"], f"Peninjauan: {badan.status}")
    return db.meta_kasus(kasus_id)


@app.delete("/api/kasus/{kasus_id}")
def hapus_kasus(kasus_id: str, klinisi: sqlite3.Row = Depends(butuh_klinisi)):
    _pastikan_pemilik(kasus_id, klinisi)
    if not store.hapus(kasus_id):
        raise HTTPException(status_code=404, detail="Kasus tidak ditemukan.")
    db.hapus_kasus(kasus_id)
    db.catat(None, klinisi["id"], f"Menghapus kasus {kasus_id}")
    return {"dihapus": kasus_id}


@app.get("/api/kasus/{kasus_id}/berkas")
def unduh_berkas_asli(kasus_id: str, pengguna: sqlite3.Row = Depends(butuh_pengguna)):
    """CXR asli yang diunggah, apa adanya — untuk audit 'apa yang sebenarnya masuk ke model'."""
    kasus = _pastikan_boleh(kasus_id, pengguna)
    path = store.dir_kasus(kasus_id) / kasus["berkasAsli"]
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Berkas asli tidak ada.")
    return FileResponse(path, filename=kasus.get("namaUnggahan") or path.name)


@app.get("/api/saya/hasil")
def hasil_pasien(pasien: sqlite3.Row = Depends(auth.butuh_pasien)):
    """Hasil milik pasien yang sedang masuk — hanya yang **disetujui** klinisi (KF-14/15).

    Yang dikirim sengaja bukan `hasil` mentah: dashboard pasien memakai bahasa awam dan tidak
    menampilkan angka teknis. Yang lewat cuma tanggal, catatan dokter, dan daftar area
    (sisi + zona) — tanpa cm³, tanpa HU, tanpa diameter. Menyaringnya di peladen, bukan di
    peramban, supaya angka itu memang tidak pernah sampai ke sana.
    """
    keluar = []
    for ringkas in store.daftar():
        meta = db.meta_kasus(ringkas["id"])
        if meta.get("pasienId") != pasien["id"] or meta.get("statusPeninjauan") != "disetujui":
            continue
        kasus = store.baca(ringkas["id"]) or {}
        hasil = kasus.get("hasil") or {}
        area, terlihat = [], set()
        for k in hasil.get("kavitas", []):
            kunci = (k.get("sisi"), k.get("zona"))
            if kunci not in terlihat:
                terlihat.add(kunci)
                area.append({"sisi": k.get("sisi"), "zona": k.get("zona")})
        keluar.append(
            {
                "idKasus": ringkas["id"],
                "tanggal": kasus.get("dibuat"),
                "catatanKlinis": meta.get("catatanKlinis") or "",
                "ditinjauOleh": meta.get("ditinjauOleh"),
                "waktuPeninjauan": meta.get("waktuPeninjauan"),
                "areaPantau": area,
            }
        )
    return keluar


# Build produksi web disajikan dari origin yang sama kalau ada — supaya satu proses cukup untuk
# demo lomba (tanpa Vite). Dipasang paling akhir supaya tidak menelan rute /api.
_DIST = PROJECT_ROOT / "web" / "dist"
if (_DIST / "index.html").is_file():
    app.mount("/", StaticFiles(directory=str(_DIST), html=True), name="web")


def main() -> int:
    import argparse

    import uvicorn

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()
    uvicorn.run("api.app:app", host=args.host, port=args.port, reload=args.reload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
