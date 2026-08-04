/**
 * Model data antarmuka — mengikuti Tabel 3.2 proposal (Pengguna, Pasien,
 * Pemeriksaan, Hasil Analisis, Jejak Audit).
 *
 * Catatan lingkup (Subbab 1.6 butir 3 & Subbab 3.5.3): sistem TIDAK menghitung
 * volume kavitas dalam cm³. Keluaran dipertahankan sebagai *peta lokasi* per
 * lobus/sisi paru beserta sebaran spasialnya.
 */

export type Peran = 'klinisi' | 'pasien'

/** Status pipeline asinkron (Subbab 3.4.3). */
export type StatusTugas =
  | 'antre'
  | 'praproses'
  | 'rekonstruksi'
  | 'deteksi'
  | 'validasi2d'
  | 'menunggu_peninjauan'
  | 'gagal_kualitas'

/** Gerbang peninjauan klinisi (Subbab 2.2.5). */
export type StatusPeninjauan = 'menunggu' | 'disetujui' | 'revisi' | 'ditolak'

export type KodeLobus = 'RUL' | 'RML' | 'RLL' | 'LUL' | 'LLL'

export type Zona = 'apeks' | 'tengah' | 'basal'
export type Kedalaman = 'anterior' | 'tengah' | 'posterior'

export interface TemuanLobus {
  lobus: KodeLobus
  nama: string
  /** Ada/tidaknya kavitas pada lobus ini — bukan besaran volume. */
  terdeteksi: boolean
  /** Keyakinan model 0–1. */
  keyakinan: number
  zona: Zona
  /** Posisi pada sumbu anteroposterior — hanya tersedia berkat rekonstruksi 3D. */
  kedalaman: Kedalaman
  jumlahFokus: number
  /** Posisi ternormalisasi untuk peraga 3D & overlay 2D (−1..1, y: atas ke bawah). */
  posisi: [number, number, number]
  /** Radius relatif penanda pada peraga (bukan ukuran anatomis sebenarnya). */
  radius: number
}

export interface ValidasiSilang2D {
  /** Sisi & zona hasil segmentasi U-Net 2D langsung pada CXR asli (Subbab 2.2.4). */
  temuan2D: string[]
  /** Uji kewajaran posisi antara jalur 2D dan 3D — bukan kesetaraan piksel. */
  konsisten: boolean
  catatan: string
  /** Kotak penanda pada citra PA, dalam persen terhadap lebar/tinggi citra. */
  marker: { x: number; y: number; w: number; h: number }[]
}

export interface Kasus {
  idKasus: string
  namaPasien: string
  nikTersamar: string
  /** Penanda titik waktu pemeriksaan (KF-03). */
  timepoint: string
  waktu: string
  tanggal: string
  statusTugas: StatusTugas
  statusPeninjauan: StatusPeninjauan
  /** Progres pipeline 0–100 untuk kasus yang masih diproses. */
  progres: number
  citraPA: string
  citraLateral: string | null
  /**
   * Montase rekonstruksi (CT asli / pseudo-CT / |selisih|) — **keluaran model sungguhan**,
   * bukan dummy seperti field lain di `mock.ts`. Berkasnya disalin apa adanya dari
   * `outputs/reconstruction_inspect/<pid>_real_cxr_1view_long.png`, checkpoint
   * `DVG_Diffusion_tbportals_long_1view_real_cxr_resize.best.pt`. Jangan diganti gambar
   * hasil olahan tangan — seluruh nilai panel ini justru karena ia tidak dikarang.
   */
  citraRekonstruksi: string | null
  /**
   * Metadata volume untuk peraga irisan ortogonal (`VolumeSlicer.tsx`). Menunjuk ke keluaran
   * `scripts/export_volume_for_web.py`: pseudo-CT + CT asli, masing-masing dengan mask
   * segmentasinya. Sama seperti `citraRekonstruksi`, isinya data nyata — bukan dummy.
   */
  volumeMeta: string | null
  /**
   * Metadata permukaan 3D untuk `LesionViewer3D.tsx` — keluaran `scripts/export_lung_mesh.py`:
   * mesh lapangan paru + satu mesh per kavitas, untuk seri pseudo-CT dan CT asli. Data nyata,
   * sama seperti `volumeMeta`; bila `null`, panel 3D tidak ditampilkan (jangan diganti proksi
   * geometris — panel kosong lebih jujur daripada bentuk yang dikarang).
   */
  meshMeta: string | null
  temuan: TemuanLobus[]
  keyakinanKeseluruhan: number
  validasi2D: ValidasiSilang2D | null
  catatanKlinis: string
  ditinjauOleh: string | null
  waktuPeninjauan: string | null
  /** Alasan bila citra ditolak sistem karena kualitas tidak memadai (KF-17). */
  alasanGagal?: string
}

export interface JejakAudit {
  waktu: string
  pengguna: string
  aksi: string
}

/** Ringkasan bahasa awam untuk pasien (KF-14) — tanpa angka & jargon. */
export interface RingkasanPasien {
  idKasus: string
  tanggal: string
  timepoint: string
  indikator: 'membaik' | 'stabil' | 'perlu_perhatian'
  judul: string
  pesan: string
  areaPantau: { sisi: 'kiri' | 'kanan'; zona: Zona }[]
  anjuran: { judul: string; detail: string; ikon: 'obat' | 'jadwal' | 'gaya-hidup' }[]
}
