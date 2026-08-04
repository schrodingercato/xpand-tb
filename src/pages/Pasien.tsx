/**
 * Pendaftaran & daftar akun pasien milik klinisi yang sedang masuk (KF-02 / KF-13).
 *
 * Kode aktivasi ditampilkan **sekali** di sini selama belum dipakai, lalu hilang dari daftar
 * begitu pasiennya menukarnya di `/aktivasi` — bukan disimpan sebagai rahasia yang bisa diambil
 * kapan saja. Kalau hilang sebelum terpakai, pasien tidak punya jalan masuk lain, dan itu
 * memang bagaimana kode sekali pakai bekerja.
 */
import { useEffect, useState, type FormEvent } from 'react'
import ClinicianLayout from '../components/layout/ClinicianLayout'
import { Badge, Card, CardTitle, Kosong } from '../components/ui'
import { IcCheck, IcDoc, IcShield } from '../components/Icons'
import { buatPasien, daftarPasien, type PasienTerdaftar } from '../data/api'

export default function Pasien() {
  const [daftar, setDaftar] = useState<PasienTerdaftar[] | null>(null)
  const [nik, setNik] = useState('')
  const [nama, setNama] = useState('')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [baru, setBaru] = useState<PasienTerdaftar | null>(null)

  const muat = () =>
    daftarPasien()
      .then(setDaftar)
      .catch((e) => setGalat(String(e.message ?? e)))

  useEffect(() => {
    void muat()
  }, [])

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (nik.replace(/\D/g, '').length !== 16) return setGalat('NIK harus tepat 16 digit.')
    if (nama.trim().length < 2) return setGalat('Nama pasien wajib diisi.')
    setGalat('')
    setMengirim(true)
    try {
      const p = await buatPasien(nik.replace(/\D/g, ''), nama.trim())
      setBaru(p)
      setNik('')
      setNama('')
      await muat()
    } catch (e) {
      setGalat(String((e as Error).message ?? e))
    } finally {
      setMengirim(false)
    }
  }

  const input =
    'mt-2 w-full rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3 text-[13px] text-teal-900 outline-none transition placeholder:text-teal-400/80 focus:border-teal-400 focus:bg-white'
  const label = 'block text-[10.5px] font-bold tracking-[0.12em] text-teal-600 uppercase'

  return (
    <ClinicianLayout judul="Akun Pasien">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardTitle icon={<IcDoc className="h-4.5 w-4.5" />}>Daftarkan Pasien</CardTitle>
          <form onSubmit={kirim} className="space-y-4" noValidate>
            <div>
              <label htmlFor="nik" className={label}>
                NIK (16 digit)
              </label>
              <input
                id="nik"
                inputMode="numeric"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                placeholder="16 digit"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="nama" className={label}>
                Nama pasien
              </label>
              <input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama sesuai identitas"
                className={input}
              />
            </div>
            {galat && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-600">
                {galat}
              </p>
            )}
            <button
              type="submit"
              disabled={mengirim}
              className="w-full rounded-xl bg-teal-500 py-3 text-[13px] font-bold text-white transition hover:bg-teal-600 disabled:opacity-60"
            >
              {mengirim ? 'Mendaftarkan…' : 'Daftarkan & Buat Kode'}
            </button>
          </form>

          {baru && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wide text-emerald-700 uppercase">
                <IcCheck className="h-3.5 w-3.5" /> Kode aktivasi {baru.nama}
              </p>
              <p className="mt-2 font-mono text-[26px] font-extrabold tracking-[0.3em] text-teal-900">
                {baru.kodeAktivasi}
              </p>
              <p className="mt-2 text-[11.5px] text-emerald-800">
                Serahkan ke pasien beserta NIK-nya. Sekali pakai.
              </p>
            </div>
          )}

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-teal-500">
            <IcShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
            Peladen menyimpan sidik NIK, bukan NIK-nya. Yang tampil di daftar adalah bentuk
            tersamar.
          </p>
        </Card>

        <Card padding="p-0">
          <div className="border-b border-teal-100 px-5 py-4">
            <h2 className="text-[14px] font-extrabold tracking-tight text-teal-900">
              Pasien Terdaftar pada Anda
            </h2>
          </div>
          {!daftar ? (
            <p className="px-5 py-6 text-[12.5px] text-teal-500">Memuat…</p>
          ) : daftar.length === 0 ? (
            <div className="p-5">
              <Kosong
                judul="Belum ada pasien"
                pesan="Daftarkan pasien di panel kiri untuk menerbitkan kode aktivasinya."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-teal-100 bg-teal-50/50 text-[10.5px] font-bold tracking-[0.1em] text-teal-500 uppercase">
                    <th className="px-5 py-3.5">Nama</th>
                    <th className="px-3 py-3.5">NIK</th>
                    <th className="px-3 py-3.5">Status akun</th>
                    <th className="px-5 py-3.5 text-right">Kasus</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((p) => (
                    <tr key={p.id} className="border-b border-teal-50 text-[12.5px] last:border-0">
                      <td className="px-5 py-4 font-semibold text-teal-800">{p.nama}</td>
                      <td className="px-3 py-4 font-mono text-[11.5px] text-teal-500">{p.pengenal}</td>
                      <td className="px-3 py-4">
                        {p.aktif ? (
                          <Badge nada="hijau">Aktif</Badge>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Badge nada="kuning">Belum aktivasi</Badge>
                            {p.kodeAktivasi && (
                              <span className="font-mono text-[12px] font-bold tracking-[0.2em] text-teal-700">
                                {p.kodeAktivasi}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-teal-600">{p.nKasus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </ClinicianLayout>
  )
}
