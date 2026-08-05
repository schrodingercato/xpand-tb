/**
 * Klien layanan Xpand-TB (`api/app.py`) — satu-satunya tempat web menyentuh peladen.
 *
 * Kasus di sini **berbeda jenis** dari `mock.ts`: yang ini hasil pipeline sungguhan atas CXR
 * yang benar-benar diunggah (pseudo-CT + segmentasi + aset peraga), sementara `mock.ts` adalah
 * data peragaan antarmuka. Keduanya sengaja tidak digabung jadi satu tipe: begitu digabung,
 * satu-satunya penanda "ini nyata atau contoh" tinggal konvensi penamaan, dan itu persis
 * kekeliruan yang paling mahal di proyek ini.
 *
 * Sesi dibawa **cookie HttpOnly** yang dipasang peladen (`api/auth.py`), bukan token di
 * `localStorage`. Karena itu tidak ada header Authorization di berkas ini dan tidak boleh ada:
 * cookie ikut terkirim sendiri pada `fetch` same-origin **dan** pada `<img src>` — dan aset
 * peraga (sprite-sheet, mesh) memang dimuat lewat `<img>`, yang tidak bisa membawa header.
 */

export type StatusKasus = 'antre' | 'proses' | 'selesai' | 'gagal'

/**
 * Lokalisasi dari model CXR 2D (TorchXRayVision), dipetakan ke ruang volume lewat kalibrasi
 * terukur (`outputs/kalibrasi_frontal.json`, residu 0,33 px).
 *
 * Dua hal yang WAJIB dihormati komponen yang menampilkannya:
 *
 *  1. `namaTemuan` adalah nama kelas model **apa adanya**. Modelnya tidak punya kelas kavitas —
 *     yang keluar `Lung Opacity`, `Mass`, `Consolidation`, dst. Menuliskannya sebagai "kavitas"
 *     berarti mengklaim sesuatu yang modelnya tidak pernah dilatih untuk itu.
 *  2. `kedalamanDiketahui` selalu `false`. Satu proyeksi PA menentukan sisi & ketinggian, bukan
 *     kedalaman — karena itu penandanya rentang `yDari..ySampai`, bukan titik. Jangan dirender
 *     sebagai bola di satu kedalaman.
 */
export interface Lokalisasi2D {
  namaTemuan: string
  skor: number
  sisi: string
  zona: string
  z: number
  x: number
  yDari: number
  ySampai: number
  kedalamanDiketahui: false
  sumber: string
  catatan: string
  saliensiUrl: string
  model: string
  semuaSkor: Record<string, number>
}

export interface KavitasNyata {
  sisi: string
  zona: string
  diameterMm: number
  diAtasLantaiResolusi: boolean
  /** Lobus anatomis (lungmask LTRCLobes). `null` = model lobus tidak jalan → pakai zona. */
  lobus?: string | null
  kodeLobus?: string | null
  diLuarLobus?: boolean | null
}

export interface HasilKasusNyata {
  cxrAsliUrl: string
  cxrPraprosesUrl: string
  cxrMasukanUrl: string
  volumeMetaUrl: string
  meshMetaUrl: string
  /** DRR 90° dari pseudo-CT kasus ini. `null` kalau render-nya gagal — sebabnya di `lateralGalat`. */
  lateralUrl: string | null
  lateralGalat?: string | null
  /** Lokalisasi lewat model CXR 2D (jalur yang tidak melewati VQGAN). `null` kalau tidak jalan. */
  lokalisasi2D: Lokalisasi2D | null
  lokalisasi2DGalat?: string | null
  nKavitas: number
  nKavitasMesh: number
  kavitas: KavitasNyata[]
  parenkimHu: number
  ambangUdaraHu: number
  /** Fraksi lapangan paru yang duduk persis di lantai klip −1000 HU (§15: CT asli ~0,03%). */
  saturasiUdara: number
  alignment: { skala: number; skor: number; skorIdentitas: number }
  checkpoint: string
  seed: number
  /** Apakah label lobus datang dari model rujukan; kalau false, yang tampil zona geometrik. */
  lobusTersedia?: boolean
  lobusPeringatan?: string | null
}

export type StatusPeninjauanNyata = 'menunggu' | 'disetujui' | 'revisi' | 'ditolak'

/** Kepemilikan & keputusan klinis sebuah kasus — dari tabel `kasus`, bukan dari pipeline. */
export interface MetaKasus {
  /** Kasus tanpa pemilik: dibuat sebelum ada lapisan akun, terlihat oleh semua klinisi. */
  warisan?: boolean
  pemilikId?: number | null
  pasienId?: number | null
  namaPasienTerdaftar?: string | null
  statusPeninjauan: StatusPeninjauanNyata
  catatanKlinis: string
  ditinjauOleh?: string | null
  waktuPeninjauan?: string | null
}

export interface JejakAuditNyata {
  waktu: string
  aksi: string
  pengguna: string
}

export interface KasusNyata extends MetaKasus {
  id: string
  namaPasien: string
  jejakAudit?: JejakAuditNyata[]
  catatan?: string
  berkasAsli: string
  namaUnggahan?: string
  ukuranByte?: number
  status: StatusKasus
  tahap: string
  progres: number
  galat: string | null
  jejak?: string
  hasil: HasilKasusNyata | null
  dibuat: string
  diperbarui?: string
  selesai?: string
  durasiDetik?: Record<string, number>
}

export interface RingkasKasus extends Partial<MetaKasus> {
  id: string
  namaPasien: string
  berkasAsli: string
  status: StatusKasus
  tahap: string
  progres: number
  dibuat: string
  galat: string | null
  nKavitas: number | null
  cxrUrl: string | null
  posisiAntrean?: number
}

export interface StatusLayanan {
  modelDimuat: boolean
  checkpoint: string
  antre: number
  fov: string
  idleUnloadDetik: number
  cuda: boolean
  gpu?: string[]
}

/** Kesalahan yang membawa pesan dari peladen apa adanya — pesannya memang untuk dibaca klinisi. */
export class GalatApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'GalatApi'
  }
}

async function minta<T>(url: string, init?: RequestInit): Promise<T> {
  // --- MOCK INTERCEPTOR ---
  if (url === '/api/status') {
    return { modelDimuat: false, checkpoint: 'Vercel Demo Mode', antre: 0, fov: 'resize', idleUnloadDetik: 900, cuda: false } as unknown as T
  }
  if (url === '/api/kasus' && init?.method !== 'POST') {
    return [] as unknown as T // Daftar kasus kosong
  }
  if (url === '/api/kasus' && init?.method === 'POST') {
    throw new GalatApi('Fitur unggah dinonaktifkan pada versi Demo (tanpa backend).', 403)
  }
  
  let r: Response
  try {
    r = await fetch(url, init)
  } catch (e) {
    // Layanan mati adalah kondisi normal di sini (dinyalakan manual, dan model dilepas saat
    // menganggur), jadi ia harus jadi pesan yang bisa ditindaklanjuti — bukan "Failed to fetch".
    throw new GalatApi(
      'Layanan Xpand-TB tidak dapat dihubungi. Jalankan: .venv/bin/python -m uvicorn api.app:app --port 8000',
      0,
    )
  }
  if (!r.ok) {
    let pesan = `${r.status} ${r.statusText}`
    try {
      const badan = await r.json()
      if (badan?.detail) pesan = String(badan.detail)
    } catch {
      /* badan bukan JSON — pakai status apa adanya */
    }
    throw new GalatApi(pesan, r.status)
  }
  return (await r.json()) as T
}

export const statusLayanan = () => minta<StatusLayanan>('/api/status')
export const daftarKasusNyata = () => minta<RingkasKasus[]>('/api/kasus')
export const ambilKasusNyata = (id: string) => minta<KasusNyata>(`/api/kasus/${id}`)
export const hapusKasusNyata = (id: string) =>
  minta<{ dihapus: string }>(`/api/kasus/${id}`, { method: 'DELETE' })

export function unggahKasus(
  berkas: File,
  namaPasien: string,
  catatan: string,
  pasienId?: number | null,
) {
  const form = new FormData()
  form.append('berkas', berkas)
  form.append('namaPasien', namaPasien)
  form.append('catatan', catatan)
  if (pasienId) form.append('pasienId', String(pasienId))
  return minta<RingkasKasus>('/api/kasus', { method: 'POST', body: form })
}

/** Gerbang peninjauan klinis (KF-08): keputusan manusia, disimpan di peladen. */
export const tinjauKasus = (id: string, status: StatusPeninjauanNyata, catatan: string) =>
  kirimJson<MetaKasus>(`/api/kasus/${id}/peninjauan`, { status, catatan })

// --- akun & sesi ---------------------------------------------------------------------------

export type Peran = 'klinisi' | 'pasien'

export interface Pengguna {
  id: number
  peran: Peran
  nama: string
  /** NIP/NIK tersamar (`3201••••••••5678`) — peladen tidak pernah mengirim bentuk penuhnya. */
  pengenal: string
  subjudul: string
  inisial: string
  aktif: boolean
}

export interface PasienTerdaftar extends Pengguna {
  nKasus: number
  /** Hanya terisi selama kodenya belum dipakai. */
  kodeAktivasi: string | null
}

export interface HasilPasien {
  idKasus: string
  tanggal: string
  catatanKlinis: string
  ditinjauOleh: string | null
  waktuPeninjauan: string | null
  areaPantau: { sisi: string; zona: string }[]
}

const kirimJson = <T,>(url: string, badan: unknown) =>
  minta<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(badan),
  })

export const daftarKlinisi = async (pengenal: string, nama: string, sandi: string, subjudul: string): Promise<Pengguna> => {
  // --- MOCK DAFTAR ---
  const inisial = nama.substring(0, 2).toUpperCase()
  const baru: Pengguna = {
    id: Math.floor(Math.random() * 1000), peran: 'klinisi', nama,
    pengenal: pengenal.substring(0, 6) + '••••••••' + pengenal.slice(-4), subjudul, inisial, aktif: true,
  }
  localStorage.setItem('xpandtb_mock_session', JSON.stringify(baru))
  return baru
}

const KUNCI_MOCK = 'xpandtb_mock_session'

export const masukAkun = async (pengenal: string, sandi: string): Promise<Pengguna> => {
  // --- MOCK LOGIN ---
  if (pengenal === '197001011990031001' && sandi === 'demo1234') {
    const sesiKlinisi: Pengguna = {
      id: 1, peran: 'klinisi', nama: 'Dr. Demo Xpand-TB',
      pengenal: '197001••••••••1001', subjudul: 'Klinik Utama', inisial: 'DD', aktif: true,
    }
    localStorage.setItem(KUNCI_MOCK, JSON.stringify(sesiKlinisi))
    return sesiKlinisi
  }
  if (pengenal === '3519012345670001' && sandi === 'demo1234') {
    const sesiPasien: Pengguna = {
      id: 2, peran: 'pasien', nama: 'Bapak Pasien Demo',
      pengenal: '351901••••••0001', subjudul: 'Pasien Xpand-TB', inisial: 'BP', aktif: true,
    }
    localStorage.setItem(KUNCI_MOCK, JSON.stringify(sesiPasien))
    return sesiPasien
  }
  throw new GalatApi('NIP/NIK atau sandi salah. Gunakan NIP: 197001011990031001 atau NIK: 3519012345670001 dengan sandi demo1234', 401)
}

export const keluarAkun = async () => {
  localStorage.removeItem(KUNCI_MOCK)
  return { keluar: true }
}

export const sesiSekarang = async (): Promise<Pengguna | null> => {
  const tersimpan = localStorage.getItem(KUNCI_MOCK)
  if (tersimpan) return JSON.parse(tersimpan)
  return null
}

export const aktivasiPasien = (kode: string, nik: string, sandi: string, setuju: boolean) =>
  kirimJson<Pengguna>('/api/auth/aktivasi', { kode, nik, sandi, setuju })

export const daftarPasien = () => minta<PasienTerdaftar[]>('/api/pasien')

export const buatPasien = (nik: string, nama: string) =>
  kirimJson<PasienTerdaftar>('/api/pasien', { nik, nama })

export const hasilSaya = () => minta<HasilPasien[]>('/api/saya/hasil')

/** Apakah id ini kasus nyata (dari peladen) atau kasus contoh dari `mock.ts`? */
export const idKasusNyata = (id: string) => /^K-\d{8}-[0-9a-f]{6}$/.test(id)
