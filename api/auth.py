"""Akun, sesi, dan penjaga peran (KF-01/KF-13, Tabel 3.1 proposal).

Alur akun yang ditegakkan di sini:

    klinisi  : daftar sendiri (NIP + nama + kata sandi) → langsung aktif
    pasien   : didaftarkan klinisi (NIK + nama) → keluar kode aktivasi sekali pakai
               → pasien menukar kode + NIK dengan kata sandinya sendiri di /aktivasi

Pasien sengaja tidak bisa mendaftar sendiri: akun pasien menempel pada rekam pemeriksaan
seseorang, dan yang tahu bahwa orang itu benar-benar pasien di fasilitas ini adalah petugasnya,
bukan formulir. Kode aktivasi memindahkan verifikasi identitas ke loket, tempat verifikasi itu
memang terjadi.

## Sesi memakai cookie, bukan header Authorization

Aset peraga (PNG sprite-sheet, mesh `.bin`) dimuat sebagai `<img src>` dan `fetch` biasa dari
peramban, dan `<img>` tidak bisa membawa header. Kalau sesinya di header, satu-satunya cara
menyajikan aset adalah membiarkannya terbuka — padahal justru di situ isi medisnya. Jadi:
cookie `HttpOnly`, dan aset ikut dijaga.

Konsekuensinya CSRF. Yang dipasang: `SameSite=Lax` (peramban tidak mengirim cookie pada POST
lintas-situs) dan CORS tanpa `allow_credentials` untuk origin dev. Itu menutup bentuk CSRF yang
biasa, **bukan** pengganti token anti-CSRF penuh; layanan ini tetap untuk localhost.

`Secure` dinyalakan lewat `VOLUTB_COOKIE_SECURE=1` saat disajikan di HTTPS — tidak default,
karena di http://localhost cookie `Secure` tidak akan pernah terkirim dan login-nya diam-diam
gagal.
"""
import os
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from api import db

COOKIE = "volutb_sesi"
COOKIE_SECURE = os.environ.get("VOLUTB_COOKIE_SECURE", "0") not in ("0", "false", "False", "")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Penjaga
# ---------------------------------------------------------------------------


def sesi_opsional(request: Request) -> Optional[sqlite3.Row]:
    db.siapkan()
    return db.pengguna_dari_token(request.cookies.get(COOKIE))


def butuh_pengguna(request: Request) -> sqlite3.Row:
    pengguna = sesi_opsional(request)
    if pengguna is None:
        raise HTTPException(status_code=401, detail="Sesi tidak ada atau sudah kedaluwarsa. Silakan masuk kembali.")
    return pengguna


def butuh_klinisi(pengguna: sqlite3.Row = Depends(butuh_pengguna)) -> sqlite3.Row:
    if pengguna["peran"] != "klinisi":
        raise HTTPException(status_code=403, detail="Tindakan ini hanya untuk akun klinisi.")
    return pengguna


def butuh_pasien(pengguna: sqlite3.Row = Depends(butuh_pengguna)) -> sqlite3.Row:
    if pengguna["peran"] != "pasien":
        raise HTTPException(status_code=403, detail="Tindakan ini hanya untuk akun pasien.")
    return pengguna


def _pasang_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE,
        token,
        max_age=int(db.SESI_JAM * 3600),
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )


# ---------------------------------------------------------------------------
# Badan permintaan
# ---------------------------------------------------------------------------


class Pendaftaran(BaseModel):
    pengenal: str = Field(min_length=5, description="NIP klinisi")
    nama: str = Field(min_length=2)
    sandi: str = Field(min_length=8)
    subjudul: str = ""


class Masuk(BaseModel):
    pengenal: str
    sandi: str


class PasienBaru(BaseModel):
    nik: str
    nama: str = Field(min_length=2)


class Aktivasi(BaseModel):
    kode: str
    nik: str
    sandi: str = Field(min_length=8)
    setuju: bool


# ---------------------------------------------------------------------------
# Rute
# ---------------------------------------------------------------------------


@router.post("/daftar", status_code=201)
def daftar(badan: Pendaftaran, response: Response):
    """Registrasi mandiri klinisi. Tidak ada verifikasi NIP ke pangkalan data kepegawaian —
    siapa pun yang bisa menjangkau layanan ini bisa membuat akun klinisi. Itu batasan yang
    diketahui, dan sebabnya layanan ini tidak boleh diikat ke jaringan bersama."""
    db.siapkan()
    if len(db.normal_pengenal(badan.pengenal)) < 5:
        raise HTTPException(status_code=422, detail="NIP minimal 5 digit.")
    if db.cari_pengguna(badan.pengenal) is not None:
        raise HTTPException(status_code=409, detail="NIP ini sudah terdaftar. Silakan masuk.")
    pengguna = db.buat_pengguna(
        "klinisi", badan.pengenal, badan.nama, badan.sandi, badan.subjudul or "Klinisi"
    )
    db.catat(None, pengguna["id"], "Akun klinisi dibuat")
    _pasang_cookie(response, db.buat_sesi(pengguna["id"]))
    return pengguna


@router.post("/masuk")
def masuk(badan: Masuk, response: Response):
    db.siapkan()
    baris = db.cari_pengguna(badan.pengenal)
    # Satu pesan untuk "tidak ada akun" dan "sandi salah": membedakannya memberi tahu penebak
    # bahwa NIK tertentu terdaftar di fasilitas ini, dan itu sendiri informasi medis.
    if baris is None or not db.cek_sandi(badan.sandi, baris["sandi_hash"]):
        raise HTTPException(status_code=401, detail="Pengenal atau kata sandi tidak cocok.")
    if not baris["aktif"]:
        raise HTTPException(
            status_code=403,
            detail="Akun ini belum diaktivasi. Gunakan kode aktivasi dari klinik terlebih dahulu.",
        )
    _pasang_cookie(response, db.buat_sesi(baris["id"]))
    return db.bentuk_pengguna(baris)


@router.post("/keluar")
def keluar(request: Request, response: Response):
    db.siapkan()
    db.hapus_sesi(request.cookies.get(COOKIE))
    response.delete_cookie(COOKIE, path="/")
    return {"keluar": True}


@router.get("/saya")
def saya(request: Request):
    """Sesi yang sedang berjalan. `null` (bukan 401) supaya halaman publik bisa memanggilnya
    tanpa memperlakukan "belum masuk" sebagai kesalahan."""
    pengguna = sesi_opsional(request)
    return db.bentuk_pengguna(pengguna) if pengguna is not None else None


@router.post("/aktivasi")
def aktivasi(badan: Aktivasi, response: Response):
    db.siapkan()
    if not badan.setuju:
        raise HTTPException(status_code=422, detail="Persetujuan penggunaan data wajib dicentang.")
    if len(db.normal_pengenal(badan.nik)) != 16:
        raise HTTPException(status_code=422, detail="NIK harus tepat 16 digit.")
    baris = db.pakai_kode(badan.kode, badan.nik)
    if baris is None:
        raise HTTPException(
            status_code=404,
            detail="Kode aktivasi tidak dikenal, sudah terpakai, atau tidak cocok dengan NIK yang dimasukkan.",
        )
    db.set_sandi(baris["id"], badan.sandi)
    db.catat(None, baris["id"], "Akun pasien diaktivasi + informed consent dicatat")
    _pasang_cookie(response, db.buat_sesi(baris["id"]))
    return db.ambil_pengguna(baris["id"])


# --- pasien yang dikelola klinisi ----------------------------------------------------------

pasien_router = APIRouter(prefix="/api/pasien", tags=["pasien"])


@pasien_router.get("")
def daftar_pasien(klinisi: sqlite3.Row = Depends(butuh_klinisi)):
    return db.daftar_pasien(klinisi["id"])


@pasien_router.post("", status_code=201)
def daftarkan_pasien(badan: PasienBaru, klinisi: sqlite3.Row = Depends(butuh_klinisi)):
    """Daftarkan pasien & keluarkan kode aktivasi sekali pakai.

    Kodenya dikembalikan **sekali saja di respons ini** dan hanya bisa dilihat lagi selama belum
    terpakai (lewat GET /api/pasien) — bukan disimpan sebagai rahasia yang bisa diambil kapan
    pun.
    """
    if len(db.normal_pengenal(badan.nik)) != 16:
        raise HTTPException(status_code=422, detail="NIK harus tepat 16 digit.")
    if db.cari_pengguna(badan.nik) is not None:
        raise HTTPException(status_code=409, detail="NIK ini sudah terdaftar.")
    pasien = db.buat_pengguna(
        "pasien", badan.nik, badan.nama, None, "Pasien Terdaftar", dibuat_oleh=klinisi["id"]
    )
    kode = db.buat_kode(pasien["id"])
    db.catat(None, klinisi["id"], f"Mendaftarkan pasien {pasien['nama']}")
    return {**pasien, "kodeAktivasi": kode}
