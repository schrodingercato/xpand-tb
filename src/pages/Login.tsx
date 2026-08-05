/** Login Page — Gambar 3.2 proposal. Satu pintu masuk untuk dua peran (KF-01). */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BarisInstitusi, LogoXpandTB } from '../components/Brand'
import { IcEye, IcEyeOff, IcLock, IcShield } from '../components/Icons'

const SLIDE = [
  {
    judul: 'Kelola kasus klinis Anda',
    teks: 'Sistem rekam medis terpadu untuk pelacakan spasial longitudinal kavitas tuberkulosis.',
  },
  {
    judul: 'Konteks 3D dari satu proyeksi',
    teks: 'Rekonstruksi pseudo-CT dan proyeksi lateral sintetis tanpa paparan radiasi tambahan.',
  },
  {
    judul: 'Keputusan tetap di tangan Anda',
    teks: 'Setiap hasil melewati gerbang peninjauan klinisi sebelum diterbitkan ke pasien.',
  },
]

export default function Login() {
  const { masuk } = useAuth()
  const navigate = useNavigate()
  const [pengenal, setPengenal] = useState('')
  const [sandi, setSandi] = useState('')
  const [lihat, setLihat] = useState(false)
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [slide, setSlide] = useState(0)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    const digit = pengenal.replace(/\D/g, '')
    if (!digit) return setGalat('Masukkan NIP (klinisi) atau NIK 16 digit (pasien).')
    if (!sandi) return setGalat('Masukkan kata sandi Anda.')
    setGalat('')
    setMengirim(true)
    try {
      // Peran datang dari akun di peladen, bukan ditebak dari panjang digit yang diketik —
      // versi lama menyimpulkan "16 digit = pasien" di sini, dan itu artinya siapa pun bisa
      // masuk sebagai klinisi.
      const sesi = await masuk(digit, sandi)
      navigate(sesi.peran === 'klinisi' ? '/klinisi' : '/pasien', { replace: true })
    } catch (e) {
      setGalat(String((e as Error).message ?? e))
    } finally {
      setMengirim(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f5f6]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/">
          <LogoXpandTB />
        </Link>
        <BarisInstitusi />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-6">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-[0_30px_70px_-40px_rgba(16,60,72,0.5)] md:grid-cols-2">
          {/* Panel ilustrasi */}
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-mint-400 to-mint-600 p-8 text-white md:flex">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-[10.5px] font-bold tracking-wide uppercase">
              <IcShield className="h-3.5 w-3.5" /> Akses terkontrol (RBAC)
            </span>
            {/* Dulu peta paru SVG bertitik. Diganti pasangan citra sungguhan pasien 5e947dc3:
                PA masukan → lateral sintetis dari pseudo-CT-nya. */}
            <div className="grid place-items-center py-6">
              <div className="grid w-60 grid-cols-2 gap-2 rounded-2xl bg-white/15 p-3 ring-1 ring-white/25">
                {[
                  ['/demo/cxr-pa-5e947dc3.png', 'PA masuk'],
                  ['/demo/lateral-5e947dc3-pseudo.png', 'Lateral sintetis'],
                ].map(([src, teks]) => (
                  <figure key={src}>
                    <img src={src} alt={teks} className="aspect-square w-full rounded-lg object-cover" />
                    <figcaption className="mt-1.5 text-center text-[9.5px] font-bold tracking-wide text-white/80 uppercase">
                      {teks}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-[20px] leading-tight font-extrabold tracking-tight">
                {SLIDE[slide].judul}
              </h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/85">{SLIDE[slide].teks}</p>
              <div className="mt-5 flex gap-2">
                {SLIDE.map((s, i) => (
                  <button
                    key={s.judul}
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={[
                      'h-2 rounded-full transition-all',
                      i === slide ? 'w-6 bg-white' : 'w-2 bg-white/45 hover:bg-white/70',
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Formulir */}
          <div className="p-8 sm:p-10">
            <h1 className="text-[24px] font-extrabold tracking-tight text-teal-900">Masuk</h1>
            <p className="mt-1.5 text-[12.5px] text-teal-500">
              Gunakan NIP (klinisi) atau NIK (pasien) beserta kata sandi Anda.
            </p>

            <form onSubmit={kirim} className="mt-7 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="pengenal"
                  className="block text-[10.5px] font-bold tracking-[0.12em] text-teal-600 uppercase"
                >
                  NIP (Klinisi) / NIK (Pasien)
                </label>
                <input
                  id="pengenal"
                  inputMode="numeric"
                  autoComplete="username"
                  value={pengenal}
                  onChange={(e) => {
                    setPengenal(e.target.value)
                    setGalat('')
                  }}
                  placeholder="mis. 12345 (klinisi) / 16 digit (pasien)"
                  className="mt-2 w-full rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3 text-[13.5px] text-teal-900 outline-none transition placeholder:text-teal-400/70 focus:border-teal-400 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label
                    htmlFor="sandi"
                    className="block text-[10.5px] font-bold tracking-[0.12em] text-teal-600 uppercase"
                  >
                    Kata Sandi
                  </label>
                  <a href="#" className="text-[11px] font-semibold text-teal-400 hover:text-teal-600">
                    Lupa kata sandi?
                  </a>
                </div>
                <div className="relative mt-2">
                  <input
                    id="sandi"
                    type={lihat ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={sandi}
                    onChange={(e) => {
                      setSandi(e.target.value)
                      setGalat('')
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3 pr-11 text-[13.5px] text-teal-900 outline-none transition placeholder:text-teal-400/70 focus:border-teal-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setLihat((v) => !v)}
                    aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute inset-y-0 right-3 grid place-items-center text-teal-400 hover:text-teal-600"
                  >
                    {lihat ? <IcEyeOff className="h-4.5 w-4.5" /> : <IcEye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {galat && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-600">
                  {galat}
                </p>
              )}

              <button
                type="submit"
                disabled={mengirim}
                className="w-full rounded-xl bg-teal-800 py-3.5 text-[13.5px] font-bold text-white shadow-sm transition hover:bg-teal-900 disabled:opacity-60"
              >
                {mengirim ? 'Memeriksa…' : 'Masuk'}
              </button>
            </form>

            <div className="mt-5 flex items-start gap-2 rounded-lg bg-teal-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-teal-600">
              <IcLock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
              <p>
                Pasien baru perlu{' '}
                <Link to="/aktivasi" className="font-bold underline underline-offset-2">
                  mengaktivasi akun
                </Link>{' '}
                dengan kode dari klinik. Klinisi bisa{' '}
                <Link to="/daftar" className="font-bold underline underline-offset-2">
                  membuat akun sendiri
                </Link>
                .
              </p>
            </div>

            <Link
              to="/"
              className="mt-5 block text-center text-[12px] font-semibold text-teal-500 hover:text-teal-700"
            >
              Kembali ke Beranda Utama
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative px-5 py-6 text-center text-[11px] text-teal-400">
        Copyright 2026 Tim Deenpeleb — Institut Teknologi Sepuluh Nopember.
        <button
          title="Pengaturan Mode Hybrid (Server ML Sungguhan)"
          onClick={() => {
            const saatIni = localStorage.getItem('XPANDTB_HYBRID_API') || ''
            const input = prompt(
              'Masukkan URL Backend ML Sungguhan (contoh: http://127.0.0.1:8000 atau Ngrok).\\n\\nKosongkan kotak ini untuk kembali ke mode Demo (Mock) tanpa server.',
              saatIni
            )
            if (input !== null) {
              if (input.trim()) {
                localStorage.setItem('XPANDTB_HYBRID_API', input.trim())
              } else {
                localStorage.removeItem('XPANDTB_HYBRID_API')
              }
              window.location.reload()
            }
          }}
          className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-base hover:text-teal-600 transition grayscale hover:grayscale-0 opacity-40 hover:opacity-100"
        >
          ⚙️
        </button>
      </footer>
    </div>
  )
}
