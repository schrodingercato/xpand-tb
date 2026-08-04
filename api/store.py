"""Penyimpanan kasus: satu direktori per kasus di `outputs/api/<id>/`, satu `kasus.json` di dalamnya.

Sengaja berkas, bukan basis data. Yang disimpan kasus ini memang berkas besar (CXR asli,
pseudo-CT `.npy` 8 MB, sprite-sheet, mesh), jadi basis data cuma akan jadi indeks di atas
direktori yang tetap harus ada — sementara direktori saja sudah bisa dibaca, di-`rsync`, dan
dibuang per kasus. Kalau nanti butuh RBAC & jejak audit persisten (Tabel 3.1 proposal), lapisan
itu berdiri di atas ini, bukan menggantikannya.

`kasus.json` ditulis atomik (tmp + `os.replace`): pekerja latar memperbaruinya tiap ganti tahap
sementara peramban mem-polling-nya tiap detik, dan pembaca tidak boleh pernah melihat JSON yang
tertulis separuh.
"""
import json
import os
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
KASUS_DIR = PROJECT_ROOT / "outputs" / "api"

# Satu kunci untuk seluruh proses: jumlah kasus di sini ratusan, bukan jutaan, dan tulisannya
# jarang (beberapa kali per kasus). Kunci per-kasus cuma menambah cara untuk salah.
_LOCK = threading.RLock()


def sekarang() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def id_baru() -> str:
    """`K-<tanggal>-<6 heks>`: terurut secara leksikografis per hari, tetap unik dalam satu hari."""
    return f"K-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}"


def dir_kasus(kasus_id: str) -> Path:
    return KASUS_DIR / kasus_id


def path_kasus(kasus_id: str) -> Path:
    return dir_kasus(kasus_id) / "kasus.json"


def valid_id(kasus_id: str) -> bool:
    """Pertahanan path traversal: id kasus dipakai langsung sebagai nama direktori."""
    return bool(kasus_id) and all(c.isalnum() or c == "-" for c in kasus_id) and ".." not in kasus_id


def tulis(kasus: Dict) -> Dict:
    with _LOCK:
        d = dir_kasus(kasus["id"])
        d.mkdir(parents=True, exist_ok=True)
        tmp = d / f"kasus.tmp{os.getpid()}.json"
        tmp.write_text(json.dumps(kasus, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, path_kasus(kasus["id"]))
        return kasus


def baca(kasus_id: str) -> Optional[Dict]:
    if not valid_id(kasus_id):
        return None
    path = path_kasus(kasus_id)
    if not path.is_file():
        return None
    with _LOCK:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None


def perbarui(kasus_id: str, **bidang) -> Optional[Dict]:
    with _LOCK:
        kasus = baca(kasus_id)
        if kasus is None:
            return None
        kasus.update(bidang)
        kasus["diperbarui"] = sekarang()
        return tulis(kasus)


def daftar() -> List[Dict]:
    """Seluruh kasus, terbaru dulu. Ringkas — tanpa daftar kavitas & metadata mesh."""
    if not KASUS_DIR.is_dir():
        return []
    kasus = [baca(p.parent.name) for p in KASUS_DIR.glob("*/kasus.json")]
    kasus = [k for k in kasus if k]
    kasus.sort(key=lambda k: k.get("dibuat", ""), reverse=True)
    return [ringkas(k) for k in kasus]


def ringkas(kasus: Dict) -> Dict:
    hasil = kasus.get("hasil") or {}
    return {
        "id": kasus["id"],
        "namaPasien": kasus.get("namaPasien") or "(tanpa nama)",
        "berkasAsli": kasus.get("berkasAsli"),
        "status": kasus.get("status"),
        "tahap": kasus.get("tahap"),
        "progres": kasus.get("progres", 0),
        "dibuat": kasus.get("dibuat"),
        "galat": kasus.get("galat"),
        "nKavitas": hasil.get("nKavitas"),
        "cxrUrl": hasil.get("cxrUrl"),
    }


def hapus(kasus_id: str) -> bool:
    if not valid_id(kasus_id):
        return False
    d = dir_kasus(kasus_id)
    if not d.is_dir():
        return False
    with _LOCK:
        for p in sorted(d.rglob("*"), reverse=True):
            p.unlink() if p.is_file() else p.rmdir()
        d.rmdir()
    return True
