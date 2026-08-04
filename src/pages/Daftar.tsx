/**
 * Registrasi akun klinisi (KF-01).
 *
 * Pasien tidak punya halaman seperti ini dan itu disengaja: akun pasien menempel pada rekam
 * pemeriksaan seseorang, jadi ia dibuat petugas lewat `/klinisi/pasien` dan diaktivasi pemiliknya
 * di `/aktivasi` dengan kode dari loket.
 *
 * Yang perlu jujur di layar: NIP yang diketik di sini **tidak diverifikasi ke mana pun**.
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BarisInstitusi, LogoVoluTB } from '../components/Brand'
import { IcShield } from '../components/Icons'

export default function Daftar() {
  const { daftar } = useAuth()
  const navigate = useNavigate()
  const [nip, setNip] = useState('')
  const [nama, setNama] = useState('')
  const [subjudul, setSubjudul] = useState('')
  const [sandi, setSandi] = useState('')
  const [ulang, setUlang] = useState('')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (nip.replace(/\D/g, '').length < 5) return setGalat('NIP minimal 5 digit.')
    if (nama.trim().length < 2) return setGalat('Nama wajib diisi.')
    if (sandi.length < 8) return setGalat('Kata sandi minimal 8 karakter.')
    if (sandi !== ulang) return setGalat('Konfirmasi kata sandi belum sama.')
    setGalat('')
    setMengirim(true)
    try {
      await daftar(nip.replace(/\D/g, ''), nama.trim(), sandi, subjudul.trim() || 'Klinisi')
      navigate('/klinisi', { replace: true })
    } catch (e) {
      setGalat(String((e as Error).message ?? e))
    } finally {
      setMengirim(false)
    }
  }

  const input =
    'mt-2 w-full rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3 text-[13.5px] text-teal-900 outline-none transition placeholder:text-teal-400/70 focus:border-teal-400 focus:bg-white'
  const label = 'block text-[10.5px] font-bold tracking-[0.12em] text-teal-600 uppercase'

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f5f6]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/">
          <LogoVoluTB />
        </Link>
        <BarisInstitusi />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-6">
        <div className="w-full max-w-lg rounded-3xl border border-teal-100 bg-white p-8 shadow-[0_30px_70px_-40px_rgba(16,60,72,0.5)] sm:p-10">
          <h1 className="text-[24px] font-extrabold tracking-tight text-teal-900">Daftar Akun Klinisi</h1>
          <p className="mt-1.5 text-[12.5px] text-teal-500">
            Akun ini yang akan memiliki kasus yang Anda unggah dan menandatangani peninjauannya.
          </p>

          <form onSubmit={kirim} className="mt-7 space-y-4" noValidate>
            <div>
              <label htmlFor="nip" className={label}>
                NIP
              </label>
              <input
                id="nip"
                inputMode="numeric"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Minimal 5 digit"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="nama" className={label}>
                Nama lengkap
              </label>
              <input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="mis. dr. Aisyah R. Nadjib"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="subjudul" className={label}>
                Unit / spesialisasi (opsional)
              </label>
              <input
                id="subjudul"
                value={subjudul}
                onChange={(e) => setSubjudul(e.target.value)}
                placeholder="mis. Pulmonologi"
                className={input}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sandi" className={label}>
                  Kata sandi
                </label>
                <input
                  id="sandi"
                  type="password"
                  value={sandi}
                  onChange={(e) => setSandi(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className={input}
                />
              </div>
              <div>
                <label htmlFor="ulang" className={label}>
                  Ulangi sandi
                </label>
                <input
                  id="ulang"
                  type="password"
                  value={ulang}
                  onChange={(e) => setUlang(e.target.value)}
                  className={input}
                />
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
              className="w-full rounded-xl bg-teal-800 py-3.5 text-[13.5px] font-bold text-white transition hover:bg-teal-900 disabled:opacity-60"
            >
              {mengirim ? 'Mendaftarkan…' : 'Daftar & Masuk'}
            </button>
          </form>

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-amber-800">
            <IcShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            NIP tidak diverifikasi ke pangkalan data kepegawaian mana pun pada versi ini. Jalankan
            layanan hanya di jaringan tepercaya.
          </p>

          <Link
            to="/login"
            className="mt-4 block text-center text-[12px] font-semibold text-teal-500 hover:text-teal-700"
          >
            Sudah punya akun? Masuk di sini
          </Link>
        </div>
      </main>
    </div>
  )
}
