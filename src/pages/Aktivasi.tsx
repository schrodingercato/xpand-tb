/**
 * Aktivasi akun pasien (KF-13 / UC-13) + pencatatan informed consent (KF-16 / UC-16).
 *
 * Menegakkan pemisahan identitas (NIK) dari kredensial (kata sandi) sesuai
 * Subbab 3.4.2: kode aktivasi sekali pakai diserahkan lewat klinik, pasien
 * memverifikasi NIK, lalu menetapkan kata sandinya sendiri.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BarisInstitusi, LogoXpandTB } from '../components/Brand'
import { IcCheck, IcShield } from '../components/Icons'

const LANGKAH = ['Kode aktivasi', 'Verifikasi NIK', 'Kata sandi & persetujuan'] as const

export default function Aktivasi() {
  const { aktivasi } = useAuth()
  const navigate = useNavigate()
  const [langkah, setLangkah] = useState(0)
  const [kode, setKode] = useState('')
  const [nik, setNik] = useState('')
  const [sandi, setSandi] = useState('')
  const [ulang, setUlang] = useState('')
  const [setuju, setSetuju] = useState(false)
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)

  async function lanjut() {
    setGalat('')
    if (langkah === 0) {
      if (kode.replace(/\s/g, '').length < 6)
        return setGalat('Kode aktivasi dari klinik terdiri dari 6 karakter.')
      return setLangkah(1)
    }
    if (langkah === 1) {
      if (nik.replace(/\D/g, '').length !== 16) return setGalat('NIK harus tepat 16 digit.')
      return setLangkah(2)
    }
    if (sandi.length < 8) return setGalat('Kata sandi minimal 8 karakter.')
    if (sandi !== ulang) return setGalat('Konfirmasi kata sandi belum sama.')
    if (!setuju) return setGalat('Persetujuan penggunaan data wajib dicentang sebelum lanjut.')

    // Kode & NIK baru diperiksa di sini, bukan per langkah: peladen sengaja menuntut keduanya
    // sekaligus, supaya kode yang salah tidak bisa dipakai untuk menebak NIK mana yang terdaftar
    // (dan sebaliknya).
    setMengirim(true)
    try {
      await aktivasi(kode.trim().toUpperCase(), nik.replace(/\D/g, ''), sandi, setuju)
      navigate('/pasien', { replace: true })
    } catch (e) {
      setGalat(String((e as Error).message ?? e))
      setLangkah(0)
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
          <LogoXpandTB />
        </Link>
        <BarisInstitusi />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-6">
        <div className="w-full max-w-lg rounded-3xl border border-teal-100 bg-white p-8 shadow-[0_30px_70px_-40px_rgba(16,60,72,0.5)] sm:p-10">
          <h1 className="text-[24px] font-extrabold tracking-tight text-teal-900">Aktivasi Akun Pasien</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-teal-500">
            Gunakan kode sekali pakai yang Anda terima dari klinik saat didaftarkan oleh petugas.
          </p>

          <ol className="mt-7 flex items-center gap-2">
            {LANGKAH.map((teks, i) => (
              <li key={teks} className="flex flex-1 items-center gap-2">
                <span
                  className={[
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                    i < langkah
                      ? 'bg-mint-500 text-white'
                      : i === langkah
                        ? 'bg-teal-500 text-white'
                        : 'bg-teal-100 text-teal-400',
                  ].join(' ')}
                >
                  {i < langkah ? <IcCheck className="h-4 w-4" /> : i + 1}
                </span>
                {i < LANGKAH.length - 1 && (
                  <span className={`h-0.5 flex-1 rounded ${i < langkah ? 'bg-mint-500' : 'bg-teal-100'}`} />
                )}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[12px] font-bold text-teal-700">{LANGKAH[langkah]}</p>

          <div className="mt-6 space-y-4">
            {langkah === 0 && (
              <div>
                <label htmlFor="kode" className={label}>
                  Kode aktivasi
                </label>
                <input
                  id="kode"
                  value={kode}
                  onChange={(e) => setKode(e.target.value.toUpperCase())}
                  placeholder="mis. 7KQ2XM"
                  maxLength={8}
                  className={`${input} tracking-[0.3em] uppercase`}
                />
                <p className="mt-2 text-[11.5px] text-teal-500">
                  Kode ini hanya dapat dipakai satu kali. Bila hilang, mintakan kode baru ke petugas
                  klinik.
                </p>
              </div>
            )}

            {langkah === 1 && (
              <div>
                <label htmlFor="nik" className={label}>
                  NIK (16 digit)
                </label>
                <input
                  id="nik"
                  inputMode="numeric"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="3201••••••••5678"
                  className={input}
                />
                <p className="mt-2 text-[11.5px] leading-relaxed text-teal-500">
                  Yang disimpan peladen adalah sidik (hash) NIK Anda, bukan NIK-nya sendiri, dan
                  hanya dipakai untuk menautkan riwayat pemeriksaan — bukan sebagai kata sandi.
                </p>
              </div>
            )}

            {langkah === 2 && (
              <>
                <div>
                  <label htmlFor="sandi" className={label}>
                    Kata sandi baru
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
                    Ulangi kata sandi
                  </label>
                  <input
                    id="ulang"
                    type="password"
                    value={ulang}
                    onChange={(e) => setUlang(e.target.value)}
                    className={input}
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-teal-50 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={setuju}
                    onChange={(e) => setSetuju(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-teal-500"
                  />
                  <span className="text-[11.5px] leading-relaxed text-teal-700">
                    Saya menyetujui penggunaan data pemeriksaan saya untuk keperluan pelayanan dan
                    pengembangan sistem Xpand-TB, sesuai ketentuan Undang-Undang Perlindungan Data
                    Pribadi. Persetujuan ini dicatat sebagai <em>informed consent</em>.
                  </span>
                </label>
              </>
            )}

            {galat && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-600">
                {galat}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              {langkah > 0 && (
                <button
                  onClick={() => {
                    setGalat('')
                    setLangkah((v) => v - 1)
                  }}
                  className="rounded-xl border border-teal-200 px-5 py-3 text-[13px] font-bold text-teal-700 transition hover:border-teal-300"
                >
                  Kembali
                </button>
              )}
              <button
                onClick={lanjut}
                disabled={mengirim}
                className="flex-1 rounded-xl bg-teal-800 py-3.5 text-[13.5px] font-bold text-white transition hover:bg-teal-900 disabled:opacity-60"
              >
                {mengirim ? 'Mengaktifkan…' : langkah === 2 ? 'Aktifkan Akun' : 'Lanjutkan'}
              </button>
            </div>
          </div>

          <p className="mt-6 flex items-start gap-2 text-[11.5px] leading-relaxed text-teal-500">
            <IcShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
            Anda hanya akan melihat hasil pemeriksaan milik sendiri yang telah disetujui klinisi.
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
