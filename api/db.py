"""Basis data akun, sesi, kepemilikan kasus, dan jejak audit — SQLite di `outputs/volutb.db`.

## Kenapa sekarang ada basis data, padahal `store.py` bilang tidak perlu

`store.py` benar untuk apa yang disimpannya: berkas besar per kasus (CXR asli, pseudo-CT `.npy`,
sprite-sheet, mesh) memang tinggal di direktori, dan basis data tidak akan memperbaiki itu.
Yang tidak bisa ditaruh di direktori adalah **relasi**: siapa pemilik kasus, pasien mana yang
tertaut, kode aktivasi mana yang sudah terpakai, siapa menyetujui apa dan kapan. Itu butuh
keunikan yang ditegakkan (satu NIK = satu akun) dan pembacaan silang — dua hal yang lewat
direktori cuma bisa ditiru dengan memindai seluruh isinya dan berharap tidak ada balapan.

Jadi lapisan ini **berdiri di atas** `store.py`, persis seperti yang diantisipasi docstring-nya,
bukan menggantikannya. `kasus.json` tetap kebenaran soal hasil pipeline; tabel `kasus` di sini
cuma memegang kepemilikan & status peninjauannya.

## Yang TIDAK disimpan: NIK dan NIP mentah

Kolom pengenal berisi **sha256(pengenal + garam aplikasi)**, plus bentuk tersamar untuk
ditampilkan (`3201••••••••5678`). Peladen karena itu bisa mencari akun dari NIK yang dikirim saat
masuk, tapi isi basis datanya sendiri tidak membawa daftar NIK yang bisa dibaca kalau berkasnya
bocor. Garamnya dari `VOLUTB_SECRET`; **kalau garamnya berganti, seluruh akun jadi tidak bisa
dicari** — karena itu ia dibuat sekali lalu disimpan di `outputs/.secret` bila env-nya kosong.

Ini bukan enkripsi NIK sebagaimana dituntut Tabel 3.1 proposal (tidak ada kunci yang bisa
dirotasi, tidak ada HSM), dan bukan pula perlindungan terhadap pencarian paksa: ruang NIK cukup
kecil untuk dipindai kalau garamnya ikut bocor. Ia menutup kasus "berkas basis data terbawa",
bukan lebih dari itu — jangan diklaim lebih.

## Kata sandi

`hashlib.scrypt` dari pustaka standar (n=2^14, r=8, p=1) dengan garam per-akun. Tidak ada
dependensi baru: menambah `passlib`/`argon2` ke lingkungan yang dikunci di Python 3.8 + torch
2.0.1 bukan pertukaran yang sepadan untuk layanan yang jalan di localhost.
"""
import hashlib
import hmac
import os
import secrets
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("VOLUTB_DB", PROJECT_ROOT / "outputs" / "volutb.db"))
SESI_JAM = float(os.environ.get("VOLUTB_SESI_JAM", "12"))

_LOCAL = threading.local()
_INIT = threading.Lock()
_SIAP = False

SKEMA = """
CREATE TABLE IF NOT EXISTS pengguna (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    peran         TEXT NOT NULL CHECK (peran IN ('klinisi', 'pasien')),
    pengenal_hash TEXT NOT NULL UNIQUE,
    pengenal_samar TEXT NOT NULL,
    nama          TEXT NOT NULL,
    subjudul      TEXT NOT NULL DEFAULT '',
    sandi_hash    TEXT,
    aktif         INTEGER NOT NULL DEFAULT 1,
    dibuat        TEXT NOT NULL,
    dibuat_oleh   INTEGER REFERENCES pengguna(id)
);

CREATE TABLE IF NOT EXISTS kode_aktivasi (
    kode      TEXT PRIMARY KEY,
    pasien_id INTEGER NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
    dibuat    TEXT NOT NULL,
    dipakai   TEXT
);

CREATE TABLE IF NOT EXISTS sesi (
    token_hash  TEXT PRIMARY KEY,
    pengguna_id INTEGER NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
    dibuat      TEXT NOT NULL,
    kedaluwarsa TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kasus (
    id                TEXT PRIMARY KEY,
    pemilik_id        INTEGER REFERENCES pengguna(id),
    pasien_id         INTEGER REFERENCES pengguna(id),
    status_peninjauan TEXT NOT NULL DEFAULT 'menunggu',
    catatan_klinis    TEXT NOT NULL DEFAULT '',
    ditinjau_oleh     INTEGER REFERENCES pengguna(id),
    waktu_peninjauan  TEXT,
    dibuat            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kasus_id    TEXT,
    pengguna_id INTEGER REFERENCES pengguna(id),
    waktu       TEXT NOT NULL,
    aksi        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kasus_pemilik ON kasus(pemilik_id);
CREATE INDEX IF NOT EXISTS idx_kasus_pasien ON kasus(pasien_id);
CREATE INDEX IF NOT EXISTS idx_audit_kasus ON audit(kasus_id);
"""


# ---------------------------------------------------------------------------
# Koneksi
# ---------------------------------------------------------------------------


def _garam() -> bytes:
    """Garam aplikasi untuk hash pengenal. Dibuat sekali, lalu menetap di `outputs/.secret`."""
    dari_env = os.environ.get("VOLUTB_SECRET")
    if dari_env:
        return dari_env.encode("utf-8")
    path = DB_PATH.parent / ".secret"
    if not path.is_file():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(secrets.token_hex(32), encoding="utf-8")
        path.chmod(0o600)
    return path.read_text(encoding="utf-8").strip().encode("utf-8")


def koneksi() -> sqlite3.Connection:
    """Satu koneksi per thread. FastAPI menjalankan endpoint sinkron di threadpool, dan objek
    koneksi SQLite tidak boleh berpindah thread."""
    conn = getattr(_LOCAL, "conn", None)
    if conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        # WAL: pekerja latar menulis status kasus sementara peramban mem-polling tiap detik.
        # Tanpa ini pembaca dan penulis saling mengunci dan polling-nya sesekali kena "database
        # is locked".
        conn.execute("PRAGMA journal_mode = WAL")
        _LOCAL.conn = conn
    return conn


def siapkan() -> None:
    global _SIAP
    with _INIT:
        if _SIAP:
            return
        koneksi().executescript(SKEMA)
        koneksi().commit()
        
        # --- SEED DUMMY ACCOUNT ---
        # Render.com (Free Tier) menghapus file database tiap restart. 
        # Kita buat akun otomatis agar presentasi selalu lancar.
        if not cari_pengguna("197001011990031001"):
            buat_pengguna("klinisi", "197001011990031001", "Dr. Demo Xpand-TB", "demo1234", "Klinik Utama")
            
        _SIAP = True


def sekarang() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Pengenal & kata sandi
# ---------------------------------------------------------------------------


def normal_pengenal(pengenal: str) -> str:
    """NIP/NIK dibandingkan sebagai digit saja — spasi & tanda hubung tidak boleh membuat akun
    kedua untuk orang yang sama."""
    digit = "".join(c for c in pengenal if c.isdigit())
    return digit or pengenal.strip().lower()


def hash_pengenal(pengenal: str) -> str:
    return hashlib.sha256(_garam() + normal_pengenal(pengenal).encode("utf-8")).hexdigest()


def samarkan(pengenal: str) -> str:
    """`3201••••••••5678` — cukup untuk dikenali pemiliknya, tidak cukup untuk dipakai orang lain."""
    d = normal_pengenal(pengenal)
    if len(d) <= 8:
        return d[:2] + "•" * max(len(d) - 4, 0) + d[-2:] if len(d) > 4 else d
    return f"{d[:4]}{'•' * (len(d) - 8)}{d[-4:]}"


def hash_sandi(sandi: str) -> str:
    garam = secrets.token_bytes(16)
    turunan = hashlib.scrypt(sandi.encode("utf-8"), salt=garam, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt$16384$8$1${garam.hex()}${turunan.hex()}"


def cek_sandi(sandi: str, tersimpan: Optional[str]) -> bool:
    if not tersimpan:
        return False
    try:
        algo, n, r, p, garam_hex, hash_hex = tersimpan.split("$")
        if algo != "scrypt":
            return False
        turunan = hashlib.scrypt(
            sandi.encode("utf-8"),
            salt=bytes.fromhex(garam_hex),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(hash_hex) // 2,
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(turunan.hex(), hash_hex)


# ---------------------------------------------------------------------------
# Pengguna
# ---------------------------------------------------------------------------


def inisial(nama: str) -> str:
    bagian = [b for b in nama.replace(".", " ").split() if b and b.lower() not in {"dr", "drg"}]
    return ("".join(b[0] for b in bagian[:2]) or nama[:2]).upper()


def bentuk_pengguna(baris: sqlite3.Row) -> Dict:
    return {
        "id": baris["id"],
        "peran": baris["peran"],
        "nama": baris["nama"],
        "pengenal": baris["pengenal_samar"],
        "subjudul": baris["subjudul"],
        "inisial": inisial(baris["nama"]),
        "aktif": bool(baris["aktif"]),
    }


def buat_pengguna(
    peran: str,
    pengenal: str,
    nama: str,
    sandi: Optional[str],
    subjudul: str = "",
    dibuat_oleh: Optional[int] = None,
) -> Dict:
    conn = koneksi()
    cur = conn.execute(
        "INSERT INTO pengguna (peran, pengenal_hash, pengenal_samar, nama, subjudul, sandi_hash,"
        " aktif, dibuat, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            peran,
            hash_pengenal(pengenal),
            samarkan(pengenal),
            nama.strip(),
            subjudul.strip(),
            hash_sandi(sandi) if sandi else None,
            1 if sandi else 0,  # pasien belum aktivasi = belum aktif
            sekarang(),
            dibuat_oleh,
        ),
    )
    conn.commit()
    return ambil_pengguna(int(cur.lastrowid))  # type: ignore[arg-type]


def ambil_pengguna(pengguna_id: int) -> Dict:
    baris = koneksi().execute("SELECT * FROM pengguna WHERE id = ?", (pengguna_id,)).fetchone()
    return bentuk_pengguna(baris) if baris else {}


def cari_pengguna(pengenal: str) -> Optional[sqlite3.Row]:
    return koneksi().execute(
        "SELECT * FROM pengguna WHERE pengenal_hash = ?", (hash_pengenal(pengenal),)
    ).fetchone()


def set_sandi(pengguna_id: int, sandi: str) -> None:
    conn = koneksi()
    conn.execute(
        "UPDATE pengguna SET sandi_hash = ?, aktif = 1 WHERE id = ?", (hash_sandi(sandi), pengguna_id)
    )
    conn.commit()


def daftar_pasien(klinisi_id: int) -> List[Dict]:
    """Pasien yang didaftarkan klinisi ini, lengkap dengan kode aktivasi yang belum terpakai."""
    baris = koneksi().execute(
        "SELECT p.*, k.kode AS kode_aktivasi, k.dipakai AS kode_dipakai,"
        " (SELECT COUNT(*) FROM kasus WHERE pasien_id = p.id) AS n_kasus"
        " FROM pengguna p LEFT JOIN kode_aktivasi k ON k.pasien_id = p.id"
        " WHERE p.peran = 'pasien' AND p.dibuat_oleh = ?"
        " ORDER BY p.dibuat DESC",
        (klinisi_id,),
    ).fetchall()
    keluar = []
    for b in baris:
        p = bentuk_pengguna(b)
        p["nKasus"] = b["n_kasus"]
        # Kode hanya berguna sebelum dipakai; sesudahnya jangan ditampilkan lagi.
        p["kodeAktivasi"] = b["kode_aktivasi"] if b["kode_aktivasi"] and not b["kode_dipakai"] else None
        keluar.append(p)
    return keluar


# ---------------------------------------------------------------------------
# Kode aktivasi
# ---------------------------------------------------------------------------

# Tanpa I, O, 0, 1: kodenya dibacakan petugas ke pasien di loket, dan pasangan itu yang paling
# sering salah dengar/salah ketik.
ALFABET_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def buat_kode(pasien_id: int) -> str:
    conn = koneksi()
    for _ in range(20):
        kode = "".join(secrets.choice(ALFABET_KODE) for _ in range(6))
        try:
            conn.execute(
                "INSERT INTO kode_aktivasi (kode, pasien_id, dibuat) VALUES (?, ?, ?)",
                (kode, pasien_id, sekarang()),
            )
            conn.commit()
            return kode
        except sqlite3.IntegrityError:
            continue
    raise RuntimeError("gagal membuat kode aktivasi yang unik")


def pakai_kode(kode: str, pengenal: str) -> Optional[sqlite3.Row]:
    """Tukar kode + NIK dengan akun pasiennya. `None` kalau kodenya salah, sudah dipakai, atau
    NIK-nya bukan milik akun yang ditunjuk kode itu.

    Dua-duanya diperiksa dengan sengaja: kode saja terlalu pendek untuk berdiri sendiri, dan NIK
    saja bukan rahasia. Yang menjaga adalah keharusan memegang keduanya.
    """
    conn = koneksi()
    baris = conn.execute(
        "SELECT * FROM kode_aktivasi WHERE kode = ? AND dipakai IS NULL", (kode.strip().upper(),)
    ).fetchone()
    if baris is None:
        return None
    pengguna = conn.execute(
        "SELECT * FROM pengguna WHERE id = ? AND pengenal_hash = ?",
        (baris["pasien_id"], hash_pengenal(pengenal)),
    ).fetchone()
    if pengguna is None:
        return None
    conn.execute("UPDATE kode_aktivasi SET dipakai = ? WHERE kode = ?", (sekarang(), baris["kode"]))
    conn.commit()
    return pengguna


# ---------------------------------------------------------------------------
# Sesi
# ---------------------------------------------------------------------------


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def buat_sesi(pengguna_id: int) -> str:
    """Token acak untuk cookie; yang disimpan hash-nya, bukan tokennya."""
    token = secrets.token_urlsafe(32)
    conn = koneksi()
    conn.execute("DELETE FROM sesi WHERE kedaluwarsa < ?", (sekarang(),))
    conn.execute(
        "INSERT INTO sesi (token_hash, pengguna_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)",
        (
            _hash_token(token),
            pengguna_id,
            sekarang(),
            (datetime.now().astimezone() + timedelta(hours=SESI_JAM)).isoformat(timespec="seconds"),
        ),
    )
    conn.commit()
    return token


def pengguna_dari_token(token: Optional[str]) -> Optional[sqlite3.Row]:
    if not token:
        return None
    return koneksi().execute(
        "SELECT p.* FROM sesi s JOIN pengguna p ON p.id = s.pengguna_id"
        " WHERE s.token_hash = ? AND s.kedaluwarsa > ? AND p.aktif = 1",
        (_hash_token(token), sekarang()),
    ).fetchone()


def hapus_sesi(token: Optional[str]) -> None:
    if not token:
        return
    conn = koneksi()
    conn.execute("DELETE FROM sesi WHERE token_hash = ?", (_hash_token(token),))
    conn.commit()


# ---------------------------------------------------------------------------
# Kasus & audit
# ---------------------------------------------------------------------------


def daftar_kasus_pemilik(kasus_id: str, pemilik_id: int, pasien_id: Optional[int]) -> None:
    conn = koneksi()
    conn.execute(
        "INSERT OR REPLACE INTO kasus (id, pemilik_id, pasien_id, status_peninjauan, dibuat)"
        " VALUES (?, ?, ?, COALESCE((SELECT status_peninjauan FROM kasus WHERE id = ?), 'menunggu'), ?)",
        (kasus_id, pemilik_id, pasien_id, kasus_id, sekarang()),
    )
    conn.commit()


def baris_kasus(kasus_id: str) -> Optional[sqlite3.Row]:
    return koneksi().execute("SELECT * FROM kasus WHERE id = ?", (kasus_id,)).fetchone()


def meta_kasus(kasus_id: str) -> Dict:
    """Kepemilikan + status peninjauan sebuah kasus, dalam bentuk yang dikirim ke web.

    Kasus yang belum ada barisnya di sini adalah kasus **warisan**: dibuat sebelum lapisan akun
    ada, jadi tidak punya pemilik. Ia tidak disembunyikan (datanya nyata), tapi ditandai supaya
    jelas kenapa ia terlihat oleh semua klinisi.
    """
    b = baris_kasus(kasus_id)
    if b is None:
        return {"warisan": True, "statusPeninjauan": "menunggu", "catatanKlinis": ""}
    peninjau = ambil_pengguna(b["ditinjau_oleh"]) if b["ditinjau_oleh"] else {}
    pasien = ambil_pengguna(b["pasien_id"]) if b["pasien_id"] else {}
    return {
        "warisan": b["pemilik_id"] is None,
        "pemilikId": b["pemilik_id"],
        "pasienId": b["pasien_id"],
        "namaPasienTerdaftar": pasien.get("nama"),
        "statusPeninjauan": b["status_peninjauan"],
        "catatanKlinis": b["catatan_klinis"],
        "ditinjauOleh": peninjau.get("nama"),
        "waktuPeninjauan": b["waktu_peninjauan"],
    }


def set_peninjauan(kasus_id: str, status: str, catatan: str, klinisi_id: int) -> None:
    conn = koneksi()
    conn.execute(
        "UPDATE kasus SET status_peninjauan = ?, catatan_klinis = ?, ditinjau_oleh = ?,"
        " waktu_peninjauan = ? WHERE id = ?",
        (status, catatan, klinisi_id, sekarang(), kasus_id),
    )
    conn.commit()


def id_kasus_pemilik(pemilik_id: int) -> List[str]:
    return [
        b["id"] for b in koneksi().execute("SELECT id FROM kasus WHERE pemilik_id = ?", (pemilik_id,))
    ]


def id_kasus_pasien(pasien_id: int, hanya_disetujui: bool = True) -> List[str]:
    sql = "SELECT id FROM kasus WHERE pasien_id = ?"
    if hanya_disetujui:
        sql += " AND status_peninjauan = 'disetujui'"
    return [b["id"] for b in koneksi().execute(sql, (pasien_id,))]


def hapus_kasus(kasus_id: str) -> None:
    conn = koneksi()
    conn.execute("DELETE FROM kasus WHERE id = ?", (kasus_id,))
    conn.commit()


def catat(kasus_id: Optional[str], pengguna_id: Optional[int], aksi: str) -> None:
    conn = koneksi()
    conn.execute(
        "INSERT INTO audit (kasus_id, pengguna_id, waktu, aksi) VALUES (?, ?, ?, ?)",
        (kasus_id, pengguna_id, sekarang(), aksi),
    )
    conn.commit()


def jejak_audit(kasus_id: str) -> List[Dict]:
    baris = koneksi().execute(
        "SELECT a.waktu, a.aksi, p.nama FROM audit a LEFT JOIN pengguna p ON p.id = a.pengguna_id"
        " WHERE a.kasus_id = ? ORDER BY a.id",
        (kasus_id,),
    ).fetchall()
    return [{"waktu": b["waktu"], "aksi": b["aksi"], "pengguna": b["nama"] or "Sistem"} for b in baris]
