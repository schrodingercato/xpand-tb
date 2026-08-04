/**
 * Sesi & kontrol akses berbasis peran (KF-01 / KNF-05).
 *
 * Berbeda dari versi sebelumnya: sesi **tidak lagi ditebak di peramban**. Dulu berkas ini
 * menerka peran dari panjang digit yang diketik (16 digit = pasien) dan menyimpan objek sesi
 * karangan di `sessionStorage` — artinya siapa pun bisa menjadi klinisi dengan mengetik lima
 * angka, dan nama "Dr. Aisyah R. Nadjib" muncul untuk siapa saja.
 *
 * Sekarang sesi datang dari peladen (`/api/auth/*`) dan dibawa cookie HttpOnly yang tidak bisa
 * dibaca JavaScript. Yang ada di sini cuma salinan tampilan (nama, inisial) untuk kop halaman.
 *
 * Penjaga rute di bawah tetap **hanya untuk kenyamanan antarmuka**: yang benar-benar menahan
 * data adalah pemeriksaan di setiap endpoint (`api/app.py`), yang menyaring per pemilik sesi.
 * Kalau penjaga ini dilewati, yang terjadi cuma halaman kosong dengan galat 401 — bukan
 * kebocoran.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  aktivasiPasien,
  daftarKlinisi,
  keluarAkun,
  masukAkun,
  sesiSekarang,
  type Peran,
  type Pengguna,
} from '../data/api'

export type Sesi = Pengguna

interface AuthCtx {
  sesi: Sesi | null
  /** Sesi awal masih diambil dari peladen — penjaga rute harus menunggu, bukan menendang keluar. */
  memuat: boolean
  masuk: (pengenal: string, sandi: string) => Promise<Sesi>
  daftar: (pengenal: string, nama: string, sandi: string, subjudul: string) => Promise<Sesi>
  aktivasi: (kode: string, nik: string, sandi: string, setuju: boolean) => Promise<Sesi>
  keluar: () => Promise<void>
  perbarui: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesi, setSesi] = useState<Sesi | null>(null)
  const [memuat, setMemuat] = useState(true)

  const perbarui = useCallback(async () => {
    try {
      setSesi(await sesiSekarang())
    } catch {
      // Layanan mati = tidak ada sesi. Halaman publik (beranda, login) harus tetap tampil.
      setSesi(null)
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    void perbarui()
  }, [perbarui])

  const nilai = useMemo<AuthCtx>(
    () => ({
      sesi,
      memuat,
      masuk: async (pengenal, sandi) => {
        const baru = await masukAkun(pengenal, sandi)
        setSesi(baru)
        return baru
      },
      daftar: async (pengenal, nama, sandi, subjudul) => {
        const baru = await daftarKlinisi(pengenal, nama, sandi, subjudul)
        setSesi(baru)
        return baru
      },
      aktivasi: async (kode, nik, sandi, setuju) => {
        const baru = await aktivasiPasien(kode, nik, sandi, setuju)
        setSesi(baru)
        return baru
      },
      keluar: async () => {
        await keluarAkun().catch(() => undefined)
        setSesi(null)
      },
      perbarui,
    }),
    [sesi, memuat, perbarui],
  )

  return <Ctx.Provider value={nilai}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}

/** Penjaga rute: mengarahkan ke login bila peran sesi tidak sesuai. */
export function ButuhPeran({ peran, children }: { peran: Peran; children: ReactNode }) {
  const { sesi, memuat } = useAuth()
  const lokasi = useLocation()
  if (memuat) {
    return <div className="grid min-h-screen place-items-center text-[13px] text-teal-500">Memeriksa sesi…</div>
  }
  if (!sesi) return <Navigate to="/login" state={{ dari: lokasi.pathname }} replace />
  if (sesi.peran !== peran) return <Navigate to={sesi.peran === 'klinisi' ? '/klinisi' : '/pasien'} replace />
  return <>{children}</>
}
