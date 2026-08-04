/**
 * Daftar Kasus / Worklist — Gambar 3.4 proposal (KF-11 / UC-11).
 *
 * Satu tabel: kasus sungguhan milik klinisi yang sedang masuk, dibaca dari `api/`. Tabel "kasus
 * contoh" (`mock.ts`) yang dulu ada di bawahnya sudah dihapus atas permintaan tim — halaman ini
 * sekarang tidak memuat satu angka karangan pun, jadi tidak ada lagi yang perlu dipisahkan.
 *
 * Konsekuensi yang perlu diingat: statistik, pencarian, dan filter di halaman ini dulu semuanya
 * menghitung `mock.ts`, bukan kasus sungguhan. Semuanya sekarang membaca daftar dari peladen —
 * kalau tidak, angka "Total Kasus" akan tetap 4 selamanya berapa pun yang benar-benar diunggah.
 *
 * Halaman kasus contoh sendiri (`/klinisi/kasus/:id`, `Workbench.tsx`) masih ada dan masih bisa
 * dibuka lewat URL untuk peragaan alur peninjauan; ia cuma tidak lagi ditawarkan dari sini.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ClinicianLayout from '../components/layout/ClinicianLayout'
import { Badge, Card, Kosong } from '../components/ui'
import { IcCheck, IcClock, IcPulse, IcSearch, IcUpload, IcWarn } from '../components/Icons'
import { daftarKasusNyata, hapusKasusNyata, type RingkasKasus } from '../data/api'

type Filter = 'semua' | 'diproses' | 'menunggu' | 'disetujui' | 'perhatian'

const FILTER: { kode: Filter; teks: string }[] = [
  { kode: 'semua', teks: 'Semua' },
  { kode: 'diproses', teks: 'Sedang diproses' },
  { kode: 'menunggu', teks: 'Menunggu peninjauan' },
  { kode: 'disetujui', teks: 'Disetujui' },
  { kode: 'perhatian', teks: 'Perlu perhatian' },
]

function cocok(k: RingkasKasus, f: Filter) {
  if (f === 'semua') return true
  if (f === 'perhatian') return k.status === 'gagal'
  if (f === 'diproses') return k.status === 'antre' || k.status === 'proses'
  // "Menunggu peninjauan" hanya berlaku untuk kasus yang pipeline-nya sudah selesai: kasus yang
  // masih berjalan belum punya apa pun untuk ditinjau.
  if (f === 'menunggu') return k.status === 'selesai' && (k.statusPeninjauan ?? 'menunggu') === 'menunggu'
  return k.statusPeninjauan === 'disetujui'
}

function Statistik({
  Ikon,
  nilai,
  teks,
  nada,
}: {
  Ikon: typeof IcPulse
  nilai: number
  teks: string
  nada: 'teal' | 'hijau' | 'kuning' | 'merah'
}) {
  const warna = {
    teal: 'bg-teal-50 text-teal-600',
    hijau: 'bg-emerald-50 text-emerald-600',
    kuning: 'bg-amber-50 text-amber-600',
    merah: 'bg-rose-50 text-rose-600',
  }[nada]
  return (
    <Card padding="p-4" className="flex items-center gap-3.5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${warna}`}>
        <Ikon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[22px] leading-none font-extrabold text-teal-900">{nilai}</span>
        <span className="mt-1 block text-[11.5px] text-teal-500">{teks}</span>
      </span>
    </Card>
  )
}

export default function Worklist() {
  const [kasus, setKasus] = useState<RingkasKasus[] | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [cari, setCari] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')

  useEffect(() => {
    let batal = false
    const muat = () =>
      daftarKasusNyata()
        .then((d) => {
          if (batal) return
          setKasus(d)
          setGalat(null)
        })
        .catch((e) => !batal && setGalat(String(e.message ?? e)))
    muat()
    // Polling terus, bukan cuma saat ada yang berjalan: kasus bisa diunggah dari tab lain.
    const t = setInterval(muat, 3000)
    return () => {
      batal = true
      clearInterval(t)
    }
  }, [])

  async function hapus(id: string) {
    await hapusKasusNyata(id).catch((e) => setGalat(String(e.message ?? e)))
    setKasus((d) => (d ?? []).filter((k) => k.id !== id))
  }

  const semua = kasus ?? []
  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return semua
      .filter((k) => cocok(k, filter))
      .filter(
        (k) =>
          !q ||
          k.id.toLowerCase().includes(q) ||
          k.namaPasien.toLowerCase().includes(q) ||
          (k.berkasAsli ?? '').toLowerCase().includes(q),
      )
  }, [semua, cari, filter])

  const disetujui = semua.filter((k) => k.statusPeninjauan === 'disetujui').length
  const menunggu = semua.filter((k) => cocok(k, 'menunggu')).length
  const perhatian = semua.filter((k) => k.status === 'gagal').length

  return (
    <ClinicianLayout
      judul="Daftar Kasus Aktif (Worklist)"
      aksi={
        <Link
          to="/klinisi/unggah"
          className="hidden items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-teal-600 sm:inline-flex"
        >
          <IcUpload className="h-4 w-4" /> Unggah Citra
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Statistik Ikon={IcPulse} nilai={semua.length} teks="Total Kasus" nada="teal" />
        <Statistik Ikon={IcCheck} nilai={disetujui} teks="Disetujui" nada="hijau" />
        <Statistik Ikon={IcClock} nilai={menunggu} teks="Menunggu Peninjauan" nada="kuning" />
        <Statistik Ikon={IcWarn} nilai={perhatian} teks="Perlu Perhatian" nada="merah" />
      </div>

      <Card className="mt-4" padding="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <IcSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-teal-400" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari berdasarkan ID Kasus, Nama Pasien, atau berkas…"
              aria-label="Cari kasus"
              className="w-full rounded-xl border border-teal-200 bg-teal-50/40 py-2.5 pr-4 pl-10 text-[13px] text-teal-900 outline-none transition placeholder:text-teal-400/80 focus:border-teal-400 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER.map((f) => (
              <button
                key={f.kode}
                onClick={() => setFilter(f.kode)}
                className={[
                  'rounded-lg px-3 py-2 text-[11.5px] font-bold transition',
                  filter === f.kode
                    ? 'bg-teal-500 text-white'
                    : 'bg-teal-50 text-teal-600 hover:bg-teal-100',
                ].join(' ')}
              >
                {f.teks}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-4" padding="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 px-5 py-4">
          <h2 className="text-[14px] font-extrabold tracking-tight text-teal-900">Daftar Kasus</h2>
          <Link
            to="/klinisi/unggah"
            className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-1.5 text-[11.5px] font-bold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
          >
            <IcUpload className="h-3.5 w-3.5" /> Unggah CXR
          </Link>
        </div>

        {galat ? (
          // Layanan mati itu kondisi normal (dinyalakan manual), jadi bentuknya petunjuk, bukan alarm.
          <div className="px-5 py-6 text-[12px] leading-relaxed text-teal-600">
            <p className="font-semibold text-teal-800">Daftar kasus tidak dapat dimuat.</p>
            <p className="mt-1">{galat}</p>
            <code className="mt-2 block rounded-lg bg-teal-50 px-3 py-2 font-mono text-[11px] text-teal-700">
              .venv/bin/python -m uvicorn api.app:app --port 8000
            </code>
          </div>
        ) : !kasus ? (
          <p className="px-5 py-6 text-[12.5px] text-teal-500">Memuat kasus…</p>
        ) : semua.length === 0 ? (
          <div className="px-5 py-6">
            <Kosong
              judul="Belum ada kasus"
              pesan="Unggah satu citra CXR PA (DICOM/JPEG/PNG) untuk menjalankan pipeline: pra-proses → pseudo-CT → segmentasi → peraga 3D."
              aksi={
                <Link
                  to="/klinisi/unggah"
                  className="rounded-lg bg-teal-500 px-4 py-2 text-[12.5px] font-bold text-white"
                >
                  Unggah Citra
                </Link>
              }
            />
          </div>
        ) : daftar.length === 0 ? (
          <div className="p-5">
            <Kosong
              judul="Tidak ada kasus yang cocok"
              pesan="Ubah kata kunci pencarian atau pilih filter lain untuk melihat kasus lainnya."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-teal-100 bg-teal-50/50 text-[10.5px] font-bold tracking-[0.1em] text-teal-500 uppercase">
                  <th className="px-5 py-3.5">Waktu</th>
                  <th className="px-3 py-3.5">ID Kasus</th>
                  <th className="px-3 py-3.5">Pasien / berkas</th>
                  <th className="px-3 py-3.5">Status pipeline</th>
                  <th className="px-3 py-3.5">Peninjauan</th>
                  <th className="px-3 py-3.5">Hasil</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((k) => (
                  <tr
                    key={k.id}
                    className="border-b border-teal-50 text-[12.5px] transition last:border-0 hover:bg-teal-50/40"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-teal-600">
                      {new Date(k.dibuat).toLocaleString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-3 py-4 font-bold whitespace-nowrap text-teal-800">{k.id}</td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-teal-800">{k.namaPasien}</p>
                      <p className="text-[11px] text-teal-400">{k.berkasAsli}</p>
                    </td>
                    <td className="px-3 py-4">
                      <Badge
                        nada={k.status === 'selesai' ? 'hijau' : k.status === 'gagal' ? 'merah' : 'kuning'}
                      >
                        {k.status}
                      </Badge>
                      {k.status !== 'selesai' && (
                        <span className="mt-1.5 block text-[10.5px] text-teal-400">
                          {k.galat ?? `${k.tahap} · ${k.progres}%`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <Badge
                        nada={
                          k.statusPeninjauan === 'disetujui'
                            ? 'hijau'
                            : k.statusPeninjauan === 'ditolak'
                              ? 'merah'
                              : 'kuning'
                        }
                      >
                        {k.statusPeninjauan ?? 'menunggu'}
                      </Badge>
                      {/* Kasus tanpa pemilik dibuat sebelum ada lapisan akun; ia terlihat oleh
                          semua klinisi, dan itu harus terbaca di tabel, bukan cuma diketahui. */}
                      {k.warisan && (
                        <span className="mt-1.5 block text-[10.5px] text-teal-400">tanpa pemilik</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-teal-600">
                      {k.status === 'selesai' ? (
                        <>{k.nKavitas} kavitas lolos filter</>
                      ) : (
                        <span className="text-teal-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link
                        to={`/klinisi/nyata/${k.id}`}
                        className="inline-flex rounded-lg border border-teal-200 px-3 py-1.5 text-[11.5px] font-bold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
                      >
                        Buka Hasil
                      </Link>
                      <button
                        onClick={() => hapus(k.id)}
                        className="ml-2 rounded-lg px-2 py-1.5 text-[11.5px] font-bold text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus kasus & seluruh asetnya"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </ClinicianLayout>
  )
}
