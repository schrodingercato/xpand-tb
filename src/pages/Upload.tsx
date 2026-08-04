/**
 * Unggah Citra Diagnostik — Gambar 3.6 proposal.
 *
 * Menggabungkan registrasi pasien via NIK (KF-02 / UC-2), unggah satu citra CXR
 * PA beserta penanda titik waktu (KF-03 / UC-3), dan pencatatan informed consent
 * (KF-16) sebelum tugas dimasukkan ke antrean inferensi (Subbab 3.4.3).
 */
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ClinicianLayout from '../components/layout/ClinicianLayout'
import { Badge, Card, CardTitle } from '../components/ui'
import { IcCheck, IcClose, IcDoc, IcPulse, IcShield, IcUpload, IcWarn } from '../components/Icons'
import {
  ambilKasusNyata,
  daftarPasien,
  unggahKasus,
  type KasusNyata,
  type PasienTerdaftar,
} from '../data/api'

const TIMEPOINT = [
  'Bulan ke-0 (Baseline)',
  'Bulan ke-2 (Fase Intensif)',
  'Bulan ke-4 (Fase Lanjutan)',
  'Bulan ke-6 (Akhir Pengobatan)',
  'Kunjungan tidak terjadwal',
]

const FORMAT = ['.dcm', '.dicom', '.png', '.jpg', '.jpeg', '.tif', '.tiff']
const MAKS_MB = 200

export default function Upload() {
  const [pasien, setPasien] = useState<PasienTerdaftar[]>([])
  const [pasienId, setPasienId] = useState('')
  const [nama, setNama] = useState('')
  const [timepoint, setTimepoint] = useState(TIMEPOINT[0])
  const [berkas, setBerkas] = useState<File | null>(null)
  const [seret, setSeret] = useState(false)
  const [setuju, setSetuju] = useState(false)
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [kasus, setKasus] = useState<KasusNyata | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Daftar pasien milik klinisi ini — kasus yang ditautkan ke salah satunya akan muncul di
  // portal pasien tersebut begitu hasilnya disetujui.
  useEffect(() => {
    daftarPasien()
      .then(setPasien)
      .catch(() => setPasien([]))
  }, [])

  // Polling, bukan websocket: pipeline-nya puluhan detik dan statusnya berubah 6-7 kali, jadi
  // satu permintaan per detik sudah lebih dari cukup dan tidak butuh koneksi persisten.
  useEffect(() => {
    if (!kasus || kasus.status === 'selesai' || kasus.status === 'gagal') return
    const t = setInterval(() => {
      ambilKasusNyata(kasus.id)
        .then(setKasus)
        .catch((e) => setGalat(String(e.message ?? e)))
    }, 1000)
    return () => clearInterval(t)
  }, [kasus])

  function pilihBerkas(f: File | undefined) {
    if (!f) return
    const ext = `.${f.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!FORMAT.includes(ext))
      return setGalat(`Format ${ext} tidak didukung. Gunakan DICOM, PNG, atau JPEG.`)
    if (f.size > MAKS_MB * 1024 * 1024) return setGalat(`Ukuran berkas melebihi ${MAKS_MB} MB.`)
    setGalat('')
    setBerkas(f)
  }

  function jatuh(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setSeret(false)
    pilihBerkas(e.dataTransfer.files[0])
  }

  async function kirim() {
    if (!nama.trim()) return setGalat('Nama pasien wajib diisi.')
    if (!berkas) return setGalat('Lampirkan satu citra CXR PA terlebih dahulu.')
    if (!setuju) return setGalat('Konfirmasi informed consent wajib dicentang sebelum pemrosesan.')
    setGalat('')
    setMengirim(true)
    try {
      // Yang dikirim sebagai penaut pasien adalah id akunnya, bukan NIK: NIK-nya sendiri sudah
      // ada di peladen dalam bentuk sidik saat pasien didaftarkan, dan tidak ada gunanya
      // mengirim ulang bentuk penuhnya lewat jalur unggah.
      const ringkas = await unggahKasus(
        berkas,
        nama.trim(),
        timepoint,
        pasienId ? Number(pasienId) : null,
      )
      setKasus(await ambilKasusNyata(ringkas.id))
    } catch (e) {
      setGalat(String((e as Error).message ?? e))
    } finally {
      setMengirim(false)
    }
  }

  if (kasus) {
    const gagal = kasus.status === 'gagal'
    const selesai = kasus.status === 'selesai'
    return (
      <ClinicianLayout judul="Unggah Citra Diagnostik">
        <Card className="mx-auto max-w-2xl" padding="p-10">
          <div className="text-center">
            <span
              className={[
                'mx-auto grid h-14 w-14 place-items-center rounded-full',
                gagal ? 'bg-rose-50 text-rose-500' : selesai ? 'bg-emerald-50 text-emerald-500' : 'bg-teal-50 text-teal-500',
              ].join(' ')}
            >
              {gagal ? <IcWarn className="h-7 w-7" /> : selesai ? <IcCheck className="h-7 w-7" /> : <IcPulse className="h-7 w-7 animate-pulse" />}
            </span>
            <h2 className="mt-5 text-[20px] font-extrabold tracking-tight text-teal-900">
              {gagal ? 'Pemrosesan gagal' : selesai ? 'Rekonstruksi selesai' : 'Sedang diproses di peladen ber-GPU'}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-teal-600">
              Kasus <strong className="font-bold text-teal-800">{kasus.id}</strong>
              {kasus.namaPasien ? <> atas nama {kasus.namaPasien}</> : null} · berkas{' '}
              {kasus.namaUnggahan ?? kasus.berkasAsli}
            </p>
          </div>

          {/* Tahapnya ditampilkan apa adanya dari peladen, bukan animasi hiasan: kalau sebuah
              kasus tersangkut, penonton harus bisa melihat tersangkutnya di tahap mana. */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-[11.5px] font-bold text-teal-600">
              <span>{kasus.tahap}</span>
              <span>{kasus.progres}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-100">
              <div
                className={['h-full rounded-full transition-all duration-500', gagal ? 'bg-rose-400' : 'bg-teal-500'].join(' ')}
                style={{ width: `${Math.max(kasus.progres, 4)}%` }}
              />
            </div>
          </div>

          {gagal && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] leading-relaxed text-rose-700">
              {kasus.galat}
            </p>
          )}

          {selesai && kasus.hasil && (
            <dl className="mt-6 grid grid-cols-2 gap-3 text-[12px]">
              {[
                ['Kavitas lolos filter', `${kasus.hasil.nKavitas}`],
                ['Skala penyelarasan', `${kasus.hasil.alignment.skala}×`],
                ['Waktu total', `${kasus.durasiDetik?.total ?? '—'} detik`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-teal-50/70 px-4 py-3">
                  <dt className="text-[10.5px] font-bold tracking-wide text-teal-500 uppercase">{k}</dt>
                  <dd className="mt-1 text-[15px] font-extrabold text-teal-900">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {selesai && (
              <button
                onClick={() => navigate(`/klinisi/nyata/${kasus.id}`)}
                className="rounded-xl bg-teal-500 px-5 py-3 text-[13px] font-bold text-white transition hover:bg-teal-600"
              >
                Buka Hasil Rekonstruksi
              </button>
            )}
            <Link
              to="/klinisi/kasus"
              className="rounded-xl border border-teal-200 px-5 py-3 text-[13px] font-bold text-teal-700"
            >
              Daftar Kasus
            </Link>
            <button
              onClick={() => {
                setKasus(null)
                setBerkas(null)
                setPasienId('')
                setNama('')
                setSetuju(false)
              }}
              className="rounded-xl border border-teal-200 px-5 py-3 text-[13px] font-bold text-teal-700"
            >
              Unggah Kasus Lain
            </button>
          </div>
        </Card>
      </ClinicianLayout>
    )
  }

  const input =
    'mt-2 w-full rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3 text-[13px] text-teal-900 outline-none transition placeholder:text-teal-400/80 focus:border-teal-400 focus:bg-white'
  const label = 'block text-[10.5px] font-bold tracking-[0.12em] text-teal-600 uppercase'

  return (
    <ClinicianLayout judul="Unggah Citra Diagnostik">
      <Card className="bg-gradient-to-r from-teal-50 to-white" padding="p-6">
        <h2 className="text-[18px] font-extrabold tracking-tight text-teal-900">
          Unggah Citra Diagnostik Baru
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-teal-600">
          Unggah format DICOM/CXR 2D standar untuk direkonstruksi menjadi model pseudo-CT 3D. Sistem
          menerima <strong className="font-semibold">satu citra proyeksi posteroanterior (PA)</strong>{' '}
          per pemeriksaan.
        </p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardTitle icon={<IcDoc className="h-4.5 w-4.5" />}>Metadata Pasien</CardTitle>

          <div className="space-y-4">
            <div>
              <label htmlFor="pasien" className={label}>
                Tautkan ke akun pasien
              </label>
              <select
                id="pasien"
                value={pasienId}
                onChange={(e) => {
                  const p = pasien.find((x) => String(x.id) === e.target.value)
                  setPasienId(e.target.value)
                  if (p) setNama(p.nama)
                }}
                className={input}
              >
                <option value="">Tidak ditautkan</option>
                {pasien.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} · {p.pengenal}
                    {p.aktif ? '' : ' (belum aktivasi)'}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] leading-relaxed text-teal-500">
                Kasus yang ditautkan akan muncul di portal pasien tersebut{' '}
                <strong className="font-semibold">setelah Anda menyetujuinya</strong>. Belum ada
                akunnya?{' '}
                <Link to="/klinisi/pasien" className="font-bold underline underline-offset-2">
                  Daftarkan pasien
                </Link>
                .
              </p>
            </div>

            <div>
              <label htmlFor="nama" className={label}>
                Nama Pasien
              </label>
              <input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama sesuai identitas"
                className={input}
              />
            </div>

            <div>
              <label htmlFor="timepoint" className={label}>
                Titik Waktu (Timepoint)
              </label>
              <select
                id="timepoint"
                value={timepoint}
                onChange={(e) => setTimepoint(e.target.value)}
                className={input}
              >
                {TIMEPOINT.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-teal-50/70 px-4 py-3 text-[11.5px] leading-relaxed text-teal-700">
              <IcShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
              Kasus ini akan tercatat sebagai milik akun Anda; klinisi lain tidak melihatnya.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle icon={<IcUpload className="h-4.5 w-4.5" />}>Berkas Citra CXR PA</CardTitle>

            {berkas ? (
              <div className="grid place-items-center rounded-2xl border border-emerald-200 bg-emerald-50/40 px-6 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-500 ring-1 ring-emerald-200">
                  <IcCheck className="h-6 w-6" />
                </span>
                <p className="mt-4 text-[14px] font-bold text-teal-900">File Berhasil Dilampirkan</p>
                <p className="mt-1 text-[12.5px] text-teal-600">{berkas.name}</p>
                <p className="text-[11px] text-teal-400">
                  {(berkas.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={() => {
                    setBerkas(null)
                    inputRef.current?.click()
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-500 hover:text-rose-600"
                >
                  <IcClose className="h-3.5 w-3.5" /> Ganti File
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setSeret(true)
                }}
                onDragLeave={() => setSeret(false)}
                onDrop={jatuh}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                className={[
                  'grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
                  seret ? 'border-teal-400 bg-teal-50' : 'border-teal-200 hover:border-teal-300 hover:bg-teal-50/40',
                ].join(' ')}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-teal-500">
                  <IcUpload className="h-6 w-6" />
                </span>
                <p className="mt-4 text-[13.5px] font-bold text-teal-800">
                  Seret berkas ke sini, atau klik untuk memilih
                </p>
                <p className="mt-1.5 text-[11.5px] text-teal-500">
                  DICOM (.dcm), PNG, atau JPEG · maksimal {MAKS_MB} MB
                </p>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept={FORMAT.join(',')}
              className="hidden"
              onChange={(e) => pilihBerkas(e.target.files?.[0])}
            />

            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50/70 px-4 py-3 text-[11.5px] leading-relaxed text-amber-900">
              <IcWarn className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p>
                Pastikan lapang paru utuh dan tidak terpotong. Citra dengan resolusi di bawah ambang
                minimum akan ditandai sistem sebagai <em>kualitas tidak memadai</em> dan tidak
                diproses.
              </p>
            </div>
          </Card>

          <Card>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={setuju}
                onChange={(e) => setSetuju(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-teal-500"
              />
              <span className="text-[11.5px] leading-relaxed text-teal-700">
                Saya menyatakan bahwa pengumpulan data ini telah melalui proses{' '}
                <em className="italic">informed consent</em> dan disetujui untuk analisis klinis.
              </span>
            </label>

            {galat && (
              <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-600">
                {galat}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Badge nada="teal">Diproses asinkron pada peladen ber-GPU</Badge>
              <button
                onClick={kirim}
                disabled={mengirim}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-[13px] font-bold text-white transition hover:bg-teal-900 disabled:opacity-60"
              >
                {mengirim ? 'Mengunggah…' : 'Mulai Proses Difusi'} <IcPulse className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </ClinicianLayout>
  )
}
