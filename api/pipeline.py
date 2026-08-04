"""Pekerja latar: satu CXR yang diunggah → pseudo-CT → segmentasi → aset peraga.

Tahapannya **persis** jalur yang dipakai saat checkpoint ini dilatih & dievaluasi
(`scripts/finetune_dvg_diffusion.load_cxr` dengan `reference=` dan `align=True`):

    baca berkas → mask blok/teks terbakar → crop siluet → normalisasi
    → histogram matching ke bank referensi DRR → resize 128²
    → penyelarasan framing ke template DRR → rekonstruksi → segmentasi → aset

Kalau salah satu tahap ini dilewati, masukannya keluar dari distribusi latih dan hasilnya buruk
dengan cara yang tidak kentara — tidak error, cuma jelek. Karena itu urutannya dikunci di sini,
bukan diserahkan ke pemanggil.

## Kenapa satu pekerja, dan modelnya menetap

Mesin ini 2x8 GB dan seluruh proyek disetel agar muat di situ. Dua rekonstruksi bersamaan =
OOM. Jadi antreannya satu pekerja, dan modelnya (fine_model + fit_model + VQGAN, ~5.4 GB di GPU0
dan ~4.4 GB di GPU1) dimuat sekali lalu menetap — memuat ulang per kasus jauh lebih mahal
daripada sampling-nya sendiri.

⚠️ Model yang menetap berarti VRAM tertahan selama layanan hidup. Itu bentrok dengan training,
yang di proyek ini jalan berjam-jam. Karena itu ada **pelepasan otomatis saat menganggur**
(`VOLUTB_API_IDLE_S`, default 900 detik): kalau tidak ada kasus baru, modelnya dilepas dan VRAM
dikembalikan. Kasus berikutnya membayar ulang waktu muatnya (~10 detik), dan itu harga yang
pantas dibanding menahan 10 GB VRAM sepanjang malam.
"""
import json
import os
import queue
import sys
import threading
import time
import traceback
from pathlib import Path
from typing import Optional

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from api import store  # noqa: E402

FOV = os.environ.get("VOLUTB_API_FOV", "resize")
CHECKPOINT = os.environ.get(
    "VOLUTB_API_CHECKPOINT",
    "weights/dvg_diffusion/DVG_Diffusion_tbportals_long_1view_real_cxr_resize_aligned.best.pt",
)
IDLE_UNLOAD_S = float(os.environ.get("VOLUTB_API_IDLE_S", "900"))
SEED = int(os.environ.get("VOLUTB_API_SEED", "0"))
# Lobus sungguhan (lungmask LTRCLobes + pengisi R231) menggantikan zona geometrik pada label
# temuan. Bisa dimatikan: modelnya menambah beberapa detik & ~0.5 GB VRAM, dan kalau `lungmask`
# tidak terpasang pipeline harus tetap jalan — labelnya sekadar turun ke zona geometrik.
PAKAI_LOBUS = os.environ.get("VOLUTB_API_LOBUS", "1") not in ("0", "false", "False")

# Ekstensi yang diperlakukan sebagai citra siap-tampil (bukan DICOM). Jalur ini juga menyalakan
# pembersih overlay teks: ekspor PACS ke JPEG hampir selalu membawa teks anotasi terbakar
# (jalur RSUD Dungus), sementara DICOM TB Portals membawa blok anonimisasi, bukan teks.
EKSTENSI_CITRA = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


class Model:
    """Pemegang model yang memuat saat dibutuhkan dan melepas saat menganggur."""

    def __init__(self):
        self._lock = threading.Lock()
        self._rec = None
        self._reference = None
        self._template = None
        self._lobus = None
        self.lobus_galat: Optional[str] = None
        self._lok2d = None
        self.lok2d_galat: Optional[str] = None
        self.terakhir_dipakai = 0.0
        self.checkpoint = CHECKPOINT

    def lokalisator_2d(self):
        """Model lokalisasi CXR 2D, dimuat saat pertama dipakai. `None` kalau tidak tersedia.

        Sengaja di **CPU**: bobotnya ~30 MB dan inferensinya sepersekian detik, sementara GPU
        sudah dipegang penuh oleh rekonstruksi (~10 GB dari 2x8 GB). Menaruhnya di GPU cuma
        menambah risiko OOM tanpa manfaat kecepatan yang berarti.

        Kegagalan memuatnya TIDAK boleh menjatuhkan kasus — sama seperti model lobus, ini
        peningkatan dan bukan syarat.
        """
        with self._lock:
            if self._lok2d is None and self.lok2d_galat is None:
                try:
                    from volutb.localization.cxr_2d import Lokalisator2D

                    self._lok2d = Lokalisator2D(device="cpu")
                except Exception as e:  # noqa: BLE001
                    self.lok2d_galat = f"{type(e).__name__}: {e}"
            return self._lok2d

    def inferer_lobus(self):
        """Model lobus, dimuat saat pertama dipakai. `None` kalau tidak tersedia/dimatikan.

        Kegagalan memuatnya (lungmask belum terpasang, bobot gagal diunduh) TIDAK boleh
        menjatuhkan kasus: label lobus itu peningkatan, bukan syarat. Sebabnya dicatat di
        `lobus_galat` supaya `/api/status` bisa menjelaskan kenapa labelnya tidak muncul.
        """
        if not PAKAI_LOBUS:
            return None
        with self._lock:
            if self._lobus is None and self.lobus_galat is None:
                try:
                    from volutb.segmentation import lobes

                    self._lobus = lobes.buat_inferer()
                except Exception as e:  # noqa: BLE001
                    self.lobus_galat = f"{type(e).__name__}: {e}"
            return self._lobus

    @property
    def dimuat(self) -> bool:
        return self._rec is not None

    def dapatkan(self):
        with self._lock:
            if self._rec is None:
                import torch

                from build_drr_reference import load_reference
                from volutb.preprocessing.cxr_align import load_template
                from volutb.reconstruction.dvg_diffusion import (
                    DvgDiffusionConfig,
                    DvgDiffusionReconstructor,
                )

                vqgan_device = "cuda:1" if torch.cuda.device_count() > 1 else None
                config = DvgDiffusionConfig.from_weights_dir(vqgan_device=vqgan_device, num_views=1)
                config.load_milestone = self.checkpoint
                self._rec = DvgDiffusionReconstructor(config)
                self._reference = load_reference(FOV, pose_index=0)
                self._template = load_template(FOV)
            self.terakhir_dipakai = time.time()
            return self._rec, self._reference, self._template

    def lepas(self) -> bool:
        with self._lock:
            if self._rec is None:
                return False
            self._rec = None
            self._reference = None
            self._template = None
            self._lobus = None
            try:
                import gc

                import torch

                gc.collect()
                torch.cuda.empty_cache()
            except Exception:
                pass
            return True


MODEL = Model()
ANTREAN: "queue.Queue[str]" = queue.Queue()


def _tulis_png(path: Path, array: np.ndarray) -> None:
    """Simpan array float apa pun sebagai PNG 8-bit, dinormalkan per citra."""
    from PIL import Image

    a = np.asarray(array, dtype=np.float32)
    lo, hi = float(a.min()), float(a.max())
    skala = (a - lo) / (hi - lo) if hi > lo else np.zeros_like(a)
    Image.fromarray((skala * 255).round().astype(np.uint8), mode="L").save(path)


def _tahap(kasus_id: str, tahap: str, progres: int) -> None:
    store.perbarui(kasus_id, tahap=tahap, progres=progres)


def jalankan(kasus_id: str) -> None:
    """Jalankan satu kasus sampai selesai. Galat ditulis ke kasusnya, bukan dilempar ke atas."""
    from volutb import webassets as W
    from volutb.preprocessing.cxr_align import align_to_template
    from volutb.preprocessing.cxr_prep import load_cxr_any, preprocess_cxr
    from volutb.segmentation import heuristic as H

    kasus = store.baca(kasus_id)
    if kasus is None:
        return
    d = store.dir_kasus(kasus_id)
    prefix = f"/api/aset/{kasus_id}"
    durasi = {}
    t_awal = time.time()

    try:
        store.perbarui(kasus_id, status="proses", tahap="memuat model", progres=3, mulai=store.sekarang())
        rec, reference, template = MODEL.dapatkan()
        durasi["muat_model"] = round(time.time() - t_awal, 1)

        # --- pra-proses -------------------------------------------------------------------
        t = time.time()
        _tahap(kasus_id, "pra-proses CXR", 12)
        berkas = d / kasus["berkasAsli"]
        mentah = load_cxr_any(berkas)
        _tulis_png(d / "cxr-asli.png", mentah)
        mask_text = Path(kasus["berkasAsli"]).suffix.lower() in EKSTENSI_CITRA
        cxr = preprocess_cxr(mentah, target_size=128, reference=reference, mask_text=mask_text)
        _tulis_png(d / "cxr-praproses.png", cxr)
        durasi["praproses"] = round(time.time() - t, 1)

        # --- penyelarasan framing ---------------------------------------------------------
        t = time.time()
        _tahap(kasus_id, "penyelarasan framing", 20)
        cxr_selaras, params = align_to_template(cxr, template)
        _tulis_png(d / "cxr-masukan.png", cxr_selaras)
        durasi["alignment"] = round(time.time() - t, 1)

        # --- rekonstruksi -----------------------------------------------------------------
        t = time.time()
        _tahap(kasus_id, "rekonstruksi pseudo-CT", 30)
        import torch

        torch.manual_seed(SEED)
        np.random.seed(SEED)
        pseudo = np.clip(rec.reconstruct(cxr_selaras).astype(np.float32), 0.0, 1.0)
        np.save(d / "pseudo_ct.npy", pseudo)
        durasi["rekonstruksi"] = round(time.time() - t, 1)

        # --- segmentasi -------------------------------------------------------------------
        t = time.time()
        _tahap(kasus_id, "segmentasi", 80)
        hasil_seg = H.segment(pseudo)
        zones = H.assign_zones(hasil_seg)

        # Lobus sungguhan kalau modelnya tersedia; kalau tidak, temuan tetap dilaporkan dengan
        # zona geometrik dan antarmuka menyebutnya zona, bukan lobus.
        lobus_kavitas = None
        peringatan_lobus = None
        inferer = MODEL.inferer_lobus()
        if inferer is not None:
            from volutb.segmentation import lobes as L

            peta_lobus = L.segment_lobus(pseudo, inferer)
            peringatan_lobus = L.periksa_konvensi(peta_lobus)
            lobus_kavitas = L.lobus_kavitas(hasil_seg, peta_lobus)
        durasi["segmentasi"] = round(time.time() - t, 1)

        # --- lokalisasi 2D ----------------------------------------------------------------
        # Jalur yang TIDAK lewat VQGAN, jadi tidak terkena batas representasi yang divonis §21
        # (sel laten 9,4 mm > kavitas median kohort 7,5 mm). Lihat volutb/localization/cxr_2d.py.
        t = time.time()
        _tahap(kasus_id, "lokalisasi 2D", 85)
        lokalisasi_2d = None
        galat_lok2d = None
        try:
            lok = MODEL.lokalisator_2d()
            if lok is None:
                galat_lok2d = MODEL.lok2d_galat
            else:
                from volutb.localization.tautan_3d import (
                    batasi_ke_paru,
                    dari_puncak_2d,
                    mask_paru_citra,
                )

                # Masker paru membatasi pencarian puncak: tanpa itu gradiennya bisa menang di
                # tepi diafragma/mediastinum. Dipetakan lewat kalibrasi yang SAMA dengan
                # penempatan penanda, jadi pembatas & penempatan tidak mungkin berselisih.
                mask2d = None
                if hasil_seg.lung.any():
                    m = mask_paru_citra(hasil_seg.lung, cxr_selaras.shape)
                    mask2d = m if m.any() else None

                h2d = lok.analisis(cxr_selaras, mask_paru=mask2d)
                kolom = dari_puncak_2d(h2d, bentuk_volume=pseudo.shape)
                if hasil_seg.lung.any():
                    kolom = batasi_ke_paru(kolom, hasil_seg.lung)

                W.peta_saliensi(cxr_selaras, h2d.saliensi,
                                (h2d.puncak_baris, h2d.puncak_kolom), kasus_id, d)
                lokalisasi_2d = {
                    **kolom.ke_dict(),
                    "saliensiUrl": f"{prefix}/saliensi-{kasus_id}.png",
                    "model": lok.bobot,
                    # Kelas model apa adanya + skor seluruh patologi, supaya panel tidak bisa
                    # diam-diam menampilkan "kavitas" untuk kelas yang bukan kavitas.
                    "semuaSkor": {k: round(v, 4) for k, v in h2d.semua_skor.items()},
                }
        except Exception as e:  # noqa: BLE001 - lokalisasi gagal tidak menjatuhkan kasus
            galat_lok2d = f"{type(e).__name__}: {e}"
        durasi["lokalisasi2d"] = round(time.time() - t, 1)

        # --- aset peraga ------------------------------------------------------------------
        t = time.time()
        _tahap(kasus_id, "membuat aset peraga", 90)
        slug = kasus_id
        seri_sprite = W.seri_sprite(pseudo, hasil_seg, "pseudo", slug, d, prefix)
        seri_mesh = W.seri_mesh(pseudo, hasil_seg, "pseudo", slug, d, prefix, lobus=lobus_kavitas)
        # Lateral sintetis dari volume yang SAMA dengan dua panel di atas. Proyeksinya
        # deterministik (integral garis, tanpa sampling), jadi kegagalannya cuma mungkin dari
        # sisi CUDA/ekstensi proyektor — dan itu tidak boleh menjatuhkan kasus yang sisanya
        # sudah jadi.
        try:
            lateral = W.proyeksi_lateral(pseudo, slug, d, prefix)
        except Exception as e:  # noqa: BLE001
            lateral = None
            galat_lateral = f"{type(e).__name__}: {e}"
        else:
            galat_lateral = None
        (d / f"volume-{slug}.json").write_text(
            json.dumps(W.meta_volume(slug, pseudo.shape, [seri_sprite]), indent=2)
        )
        (d / f"mesh-{slug}.json").write_text(
            json.dumps(W.meta_mesh(slug, pseudo.shape, [seri_mesh]), indent=2)
        )
        durasi["aset"] = round(time.time() - t, 1)

        # Volume cm³ sengaja TIDAK dihitung maupun disimpan: proposal §1.6 menaruh pengukuran
        # volume absolut di luar cakupan, karena rekonstruksi dari satu proyeksi bersifat
        # generatif dan tidak menjamin akurasi metrik volume. `hasil_seg.volumes_mm3()` tetap
        # ada di modul segmentasi untuk keperluan riset/evaluasi, tapi tidak masuk ke keluaran
        # layanan. Jangan disambungkan kembali tanpa mengubah batasan di proposal lebih dulu.
        store.perbarui(
            kasus_id,
            status="selesai",
            tahap="selesai",
            progres=100,
            selesai=store.sekarang(),
            galat=None,
            durasiDetik={**durasi, "total": round(time.time() - t_awal, 1)},
            hasil={
                "cxrAsliUrl": f"{prefix}/cxr-asli.png",
                "cxrPraprosesUrl": f"{prefix}/cxr-praproses.png",
                "cxrMasukanUrl": f"{prefix}/cxr-masukan.png",
                "volumeMetaUrl": f"{prefix}/volume-{slug}.json",
                "meshMetaUrl": f"{prefix}/mesh-{slug}.json",
                "lateralUrl": (lateral or {}).get("url"),
                "lateralGalat": galat_lateral,
                "lokalisasi2D": lokalisasi_2d,
                "lokalisasi2DGalat": galat_lok2d,
                "nKavitas": len(hasil_seg.accepted_candidates()),
                "nKavitasMesh": seri_mesh["nKavitas"],
                "kavitas": [
                    {
                        "sisi": z["sisi"],
                        "zona": z["zona"],
                        "diameterMm": round(z["diameter_mm"], 1),
                        "diAtasLantaiResolusi": bool(z["diameter_mm"] >= 14.0),
                        # Lobus dari model rujukan kalau ada; `None` berarti label yang tampil
                        # tetap zona geometrik, bukan lobus anatomis.
                        "lobus": (lobus_kavitas[i].get("lobus") if lobus_kavitas else None),
                        "kodeLobus": (lobus_kavitas[i].get("kode") if lobus_kavitas else None),
                        "diLuarLobus": (
                            bool(lobus_kavitas[i].get("di_luar_paru")) if lobus_kavitas else None
                        ),
                    }
                    for i, z in enumerate(zones)
                ],
                "lobusTersedia": lobus_kavitas is not None,
                "lobusPeringatan": peringatan_lobus or MODEL.lobus_galat,
                "parenkimHu": round(float(hasil_seg.parenchyma_hu), 0),
                "ambangUdaraHu": round(float(hasil_seg.air_threshold_hu), 0),
                # Fraksi lapangan paru yang duduk persis di lantai klip -1000 HU. Di CT asli
                # ~0.03%; di pseudo-CT terukur 7-23% (§15). Angka ini ikut dilaporkan supaya
                # kasus yang saturasinya ekstrem bisa dikenali, bukan diperlakukan sama saja.
                "saturasiUdara": round(
                    float((pseudo[hasil_seg.lung] <= 1e-6).mean()) if hasil_seg.lung.any() else 0.0,
                    4,
                ),
                "alignment": {
                    "skala": round(float(params.get("scale", float("nan"))), 2),
                    "skor": round(float(params.get("score", float("nan"))), 3),
                    "skorIdentitas": round(float(params.get("score_identity", float("nan"))), 3),
                },
                "checkpoint": MODEL.checkpoint,
                "seed": SEED,
            },
        )
    except Exception as e:  # noqa: BLE001 - kegagalan satu kasus tidak boleh menjatuhkan pekerja
        store.perbarui(
            kasus_id,
            status="gagal",
            tahap="gagal",
            galat=f"{type(e).__name__}: {e}",
            jejak=traceback.format_exc()[-4000:],
            selesai=store.sekarang(),
        )


def _pekerja() -> None:
    while True:
        try:
            kasus_id = ANTREAN.get(timeout=30.0)
        except queue.Empty:
            # Tidak ada kerja: lepas model kalau sudah cukup lama menganggur, supaya training
            # (atau proses lain di mesin ini) bisa memakai VRAM-nya.
            if (
                MODEL.dimuat
                and IDLE_UNLOAD_S > 0
                and time.time() - MODEL.terakhir_dipakai > IDLE_UNLOAD_S
            ):
                MODEL.lepas()
            continue
        try:
            jalankan(kasus_id)
        finally:
            ANTREAN.task_done()


_PEKERJA: Optional[threading.Thread] = None


def mulai_pekerja() -> None:
    global _PEKERJA
    if _PEKERJA is None or not _PEKERJA.is_alive():
        _PEKERJA = threading.Thread(target=_pekerja, name="volutb-pekerja", daemon=True)
        _PEKERJA.start()


def antrekan(kasus_id: str) -> int:
    ANTREAN.put(kasus_id)
    return ANTREAN.qsize()
