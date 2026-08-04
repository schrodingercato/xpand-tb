/**
 * Hasil pipeline untuk CXR yang **benar-benar diunggah** — bukan kasus contoh.
 *
 * Halaman ini sengaja terpisah dari `Workbench.tsx`. Workbench dibangun di atas `mock.ts` dan
 * memuat panel yang datanya tidak dihasilkan model mana pun (keyakinan per lobus, validasi
 * silang 2D, jejak audit). Menyalurkan kasus nyata ke sana berarti kasus nyata tampil
 * berdampingan dengan angka karangan di satu halaman, dan tidak ada penonton yang bisa
 * memisahkan mana yang mana. Jadi di sini **hanya yang benar-benar dihitung** yang tampil:
 *
 *   CXR asli → pra-proses → masukan model → pseudo-CT → segmentasi → peraga 3D, irisan, lateral
 *
 * Yang belum ada (riwayat antar-waktu, validasi 2D) disebut sebagai belum ada, bukan diisi
 * contoh.
 *
 * Angka & batasannya tidak dikurangi, tapi uraiannya ditahan di dalam <Catatan> yang tertutup:
 * versi sebelumnya menaruh lima paragraf peringatan terbuka sekaligus, dan hasil yang mau
 * ditinjau justru tenggelam di antaranya.
 */
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BatasGalat from '../components/BatasGalat'
import ClinicianLayout from '../components/layout/ClinicianLayout'
import { Badge, Card, CardTitle, Catatan, PeringatanKlinis } from '../components/ui'
import { IcCheck, IcClose, IcCube, IcDoc, IcLayers, IcPulse, IcRefresh, IcSearch, IcShield, IcWarn } from '../components/Icons'
import {
  ambilKasusNyata,
  tinjauKasus,
  type KasusNyata,
  type StatusPeninjauanNyata,
} from '../data/api'

const LesionViewer3D = lazy(() => import('../components/viewer/LesionViewer3D'))
const VolumeSlicer = lazy(() => import('../components/viewer/VolumeSlicer'))

/** Ambang lantai resolusi terukur (§13): di bawah ini rongga kavitas runtuh di grid 128³. */
const LANTAI_MM = 14

function Citra({ src, judul, catatan }: { src: string; judul: string; catatan: string }) {
  return (
    <figure>
      <figcaption className="mb-2 text-[10.5px] font-bold tracking-[0.12em] text-teal-500 uppercase">
        {judul}
      </figcaption>
      <img
        src={src}
        alt={judul}
        className="w-full rounded-xl bg-scan-900 ring-1 ring-teal-900/10"
        style={{ imageRendering: 'pixelated' }}
      />
      <p className="mt-1.5 text-[11px] leading-relaxed text-teal-500">{catatan}</p>
    </figure>
  )
}

function Angka({ label, nilai, satuan }: { label: string; nilai: string | number; satuan?: string }) {
  return (
    <div className="rounded-xl bg-teal-50/70 px-4 py-3">
      <p className="text-[10.5px] font-bold tracking-wide text-teal-500 uppercase">{label}</p>
      <p className="mt-1 text-[15px] font-extrabold text-teal-900">
        {nilai}
        {satuan ? <span className="ml-1 text-[11px] font-bold text-teal-500">{satuan}</span> : null}
      </p>
    </div>
  )
}

/** Gerbang peninjauan klinis (KF-08) — keputusannya disimpan di peladen, bukan di state halaman. */
function GerbangPeninjauan({ kasus, sesudah }: { kasus: KasusNyata; sesudah: () => void }) {
  const [catatan, setCatatan] = useState(kasus.catatanKlinis ?? '')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState<StatusPeninjauanNyata | null>(null)

  async function putuskan(status: StatusPeninjauanNyata) {
    setGalat('')
    setMengirim(status)
    try {
      await tinjauKasus(kasus.id, status, catatan)
      sesudah()
    } catch (e) {
      setGalat(String((e as Error).message ?? e))
    } finally {
      setMengirim(null)
    }
  }

  const tombol: { status: StatusPeninjauanNyata; teks: string; Ikon: typeof IcCheck; gaya: string }[] = [
    { status: 'disetujui', teks: 'Setujui', Ikon: IcCheck, gaya: 'bg-emerald-500 text-white' },
    { status: 'revisi', teks: 'Revisi', Ikon: IcRefresh, gaya: 'bg-amber-500 text-white' },
    { status: 'ditolak', teks: 'Tolak', Ikon: IcClose, gaya: 'bg-rose-500 text-white' },
  ]
  const pasif = {
    disetujui: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    revisi: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    ditolak: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    menunggu: '',
  }

  return (
    <Card className="print-block">
      <CardTitle
        icon={<IcShield className="h-4.5 w-4.5" />}
        aksi={
          <Badge
            nada={
              kasus.statusPeninjauan === 'disetujui'
                ? 'hijau'
                : kasus.statusPeninjauan === 'ditolak'
                  ? 'merah'
                  : 'kuning'
            }
          >
            {kasus.statusPeninjauan}
          </Badge>
        }
      >
        Gerbang Peninjauan
      </CardTitle>
      <textarea
        rows={3}
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        placeholder="Catatan klinis (akan terbaca pasien bila disetujui)"
        className="w-full resize-none rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3 text-[12.5px] leading-relaxed text-teal-900 outline-none transition placeholder:text-teal-400/80 focus:border-teal-400 focus:bg-white"
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {tombol.map(({ status, teks, Ikon, gaya }) => (
          <button
            key={status}
            onClick={() => putuskan(status)}
            disabled={mengirim !== null}
            className={[
              'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[12.5px] font-bold transition disabled:opacity-60',
              kasus.statusPeninjauan === status ? gaya : pasif[status],
            ].join(' ')}
          >
            <Ikon className="h-4 w-4" /> {mengirim === status ? '…' : teks}
          </button>
        ))}
      </div>
      {galat && <p className="mt-2 text-[11.5px] font-medium text-rose-600">{galat}</p>}
      <p className="mt-3 text-[11px] text-teal-500">
        {kasus.pasienId
          ? 'Hasil terbit ke portal pasien hanya bila disetujui.'
          : 'Kasus ini belum ditautkan ke akun pasien mana pun.'}
      </p>
    </Card>
  )
}

export default function WorkbenchNyata() {
  const { id = '' } = useParams()
  const [kasus, setKasus] = useState<KasusNyata | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(
    () =>
      ambilKasusNyata(id)
        .then(setKasus)
        .catch((e) => setGalat(String(e.message ?? e))),
    [id],
  )

  useEffect(() => {
    let batal = false
    const muat = () =>
      ambilKasusNyata(id)
        .then((k) => !batal && setKasus(k))
        .catch((e) => !batal && setGalat(String(e.message ?? e)))
    muat()
    // Halaman ini bisa dibuka sebelum pipeline-nya selesai (mis. dari daftar kasus), jadi ia
    // ikut mem-polling sampai statusnya final.
    const t = setInterval(() => {
      setKasus((k) => {
        if (k && (k.status === 'selesai' || k.status === 'gagal')) return k
        muat()
        return k
      })
    }, 1500)
    return () => {
      batal = true
      clearInterval(t)
    }
  }, [id])

  if (galat) {
    return (
      <ClinicianLayout judul="Hasil Rekonstruksi">
        <Card padding="p-10" className="text-center">
          <IcWarn className="mx-auto h-7 w-7 text-amber-500" />
          <p className="mt-4 text-[14px] font-bold text-teal-900">Kasus tidak dapat dimuat</p>
          <p className="mt-2 text-[12.5px] text-teal-600">{galat}</p>
          <Link to="/klinisi/kasus" className="mt-6 inline-block text-[12.5px] font-bold text-teal-600 underline">
            Kembali ke daftar kasus
          </Link>
        </Card>
      </ClinicianLayout>
    )
  }

  if (!kasus) {
    return (
      <ClinicianLayout judul="Hasil Rekonstruksi">
        <div className="grid h-64 place-items-center text-[13px] text-teal-500">Memuat kasus…</div>
      </ClinicianLayout>
    )
  }

  const hasil = kasus.hasil
  const belumSelesai = kasus.status !== 'selesai'

  return (
    <ClinicianLayout judul="Hasil Rekonstruksi (kasus nyata)">
      <Card padding="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-bold tracking-[0.12em] text-teal-500 uppercase">ID Kasus</p>
            <p className="text-[17px] font-extrabold tracking-tight text-teal-900">{kasus.id}</p>
            <p className="mt-1 text-[12.5px] text-teal-600">
              {kasus.namaPasien || '(tanpa nama)'} · {kasus.namaUnggahan ?? kasus.berkasAsli}
              {kasus.catatan ? ` · ${kasus.catatan}` : ''}
            </p>
          </div>
          <Badge nada={kasus.status === 'selesai' ? 'hijau' : kasus.status === 'gagal' ? 'merah' : 'teal'}>
            {kasus.status === 'selesai'
              ? 'Pipeline selesai'
              : kasus.status === 'gagal'
                ? 'Gagal'
                : `${kasus.tahap} · ${kasus.progres}%`}
          </Badge>
        </div>
      </Card>

      <div className="mt-3">
        <PeringatanKlinis />
      </div>

      {kasus.status === 'gagal' && (
        <Card className="mt-4">
          <CardTitle icon={<IcWarn className="h-4.5 w-4.5" />}>Pipeline gagal</CardTitle>
          <p className="text-[12.5px] text-rose-700">{kasus.galat}</p>
          {kasus.jejak && (
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-teal-50/70 p-3 font-mono text-[10px] leading-relaxed text-teal-700">
              {kasus.jejak}
            </pre>
          )}
        </Card>
      )}

      {belumSelesai && kasus.status !== 'gagal' && (
        <Card className="mt-4" padding="p-8">
          <div className="flex items-center gap-3">
            <IcPulse className="h-5 w-5 animate-pulse text-teal-500" />
            <p className="text-[13px] font-bold text-teal-800">{kasus.tahap}…</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-teal-100">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.max(kasus.progres, 4)}%` }} />
          </div>
        </Card>
      )}

      {hasil && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-4">
            <Card className="print-block">
              <CardTitle icon={<IcCube className="h-4.5 w-4.5" />}>Visualisasi Volume 3D</CardTitle>
              <BatasGalat
                cadangan={(pesan) => (
                  <p className="rounded-xl bg-teal-50/70 px-4 py-6 text-center text-[12px] text-teal-600">
                    Peraga 3D gagal dimuat: {pesan}
                  </p>
                )}
              >
                <Suspense
                  fallback={
                    <div className="scan-canvas grid aspect-[16/11] w-full place-items-center rounded-xl text-[12.5px] text-white/60">
                      Memuat peraga volumetrik…
                    </div>
                  }
                >
                  <LesionViewer3D metaUrl={hasil.meshMetaUrl} />
                </Suspense>
              </BatasGalat>
            </Card>

            <Card className="print-block">
              <CardTitle icon={<IcDoc className="h-4.5 w-4.5" />}>Jalur Citra Masuk</CardTitle>
              <div className="grid gap-4 sm:grid-cols-3">
                <Citra src={hasil.cxrAsliUrl} judul="1 · CXR asli" catatan="Berkas yang Anda unggah." />
                <Citra
                  src={hasil.cxrPraprosesUrl}
                  judul="2 · Pra-proses"
                  catatan="Teks terbakar dinetralkan, siluet di-crop, histogram dicocokkan."
                />
                <Citra
                  src={hasil.cxrMasukanUrl}
                  judul="3 · Masukan model"
                  catatan={`Framing diselaraskan — skala ${hasil.alignment.skala}×.`}
                />
              </div>
            </Card>

            {/*
              Lateral sintetis: DRR 90° atas pseudo-CT kasus ini, dirender di pipeline
              (`api/pipeline.py` → `webassets.proyeksi_lateral`). Proyeksinya deterministik dan
              volumenya sama persis dengan peraga di atas, jadi panel ini tidak bisa menyimpang
              dari mereka. Kalau render-nya gagal (mis. ekstensi CUDA proyektor tidak jalan di
              mesin itu), sebabnya disebut apa adanya — bukan diisi gambar contoh, seperti yang
              dulu terjadi di halaman kasus contoh.
            */}
            {(hasil.lateralUrl || hasil.lateralGalat) && (
              <Card className="print-block">
                <CardTitle icon={<IcLayers className="h-4.5 w-4.5" />}>
                  Proyeksi Lateral Sintetis
                </CardTitle>
                {hasil.lateralUrl ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Citra
                      src={hasil.cxrMasukanUrl}
                      judul="PA — masukan model"
                      catatan="Citra yang benar-benar masuk ke model."
                    />
                    <Citra
                      src={hasil.lateralUrl}
                      judul="Lateral sintetis (90°)"
                      catatan="Proyeksi DRR dari pseudo-CT kasus ini — bukan foto lateral."
                    />
                  </div>
                ) : (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-[11.5px] text-amber-800">
                    Render lateral gagal: {hasil.lateralGalat}
                  </p>
                )}
              </Card>
            )}

            {/* Lokalisasi 2D: jalur yang tidak melewati VQGAN, jadi tidak terkena batas
                representasi yang mematikan penempatan lesi di jalur 3D. Panel ini sengaja
                menyebut nama kelas model apa adanya dan menyatakan kedalamannya tidak
                ditentukan — dua hal yang kalau dihilangkan membuat panel ini mengklaim lebih
                dari yang diukur. */}
            {(hasil.lokalisasi2D || hasil.lokalisasi2DGalat) && (
              <Card className="print-block">
                <CardTitle icon={<IcSearch className="h-4.5 w-4.5" />}>
                  Lokalisasi pada CXR (model 2D)
                </CardTitle>
                {hasil.lokalisasi2D ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Citra
                        src={hasil.lokalisasi2D.saliensiUrl}
                        judul={`${hasil.lokalisasi2D.namaTemuan} · skor ${hasil.lokalisasi2D.skor.toFixed(2)}`}
                        catatan="Silang menandai puncaknya. Luas bercak bukan ukuran lesi."
                      />
                      <div className="space-y-2 text-[12px] text-teal-700">
                        <p>
                          Paru <strong className="font-bold">{hasil.lokalisasi2D.sisi}</strong>,
                          zona <strong className="font-bold">{hasil.lokalisasi2D.zona}</strong>.
                        </p>
                        <p className="text-[11.5px] text-teal-600">
                          Di volume 3D, penanda ini adalah{' '}
                          <strong className="font-bold">kolom</strong> pada kedalaman{' '}
                          {Math.round(hasil.lokalisasi2D.yDari)}–
                          {Math.round(hasil.lokalisasi2D.ySampai)}, bukan satu titik: proyeksi PA
                          tunggal menentukan sisi dan ketinggian, tidak menentukan kedalaman.
                        </p>
                        <p className="text-[11px] text-amber-700">
                          Model ini tidak punya kelas kavitas — label di atas adalah nama kelas
                          modelnya apa adanya.
                        </p>
                      </div>
                    </div>
                    <Catatan judul="Model apa yang dipakai">
                      <p>
                        {hasil.lokalisasi2D.model} (TorchXRayVision), 18 patologi umum toraks,
                        dijalankan langsung pada CXR masukan — tidak melewati rekonstruksi 3D.
                        Petanya saliensi gradien: piksel yang paling menggerakkan skor, bukan
                        batas lesi tersegmentasi. Belum ada anotasi kavitas di kohort ini, jadi
                        belum ada angka sensitivitas maupun Dice untuk jalur ini.
                      </p>
                    </Catatan>
                  </>
                ) : (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-[11.5px] text-amber-800">
                    Lokalisasi 2D tidak berjalan: {hasil.lokalisasi2DGalat}
                  </p>
                )}
              </Card>
            )}

            <Card className="print-block">
              <CardTitle icon={<IcLayers className="h-4.5 w-4.5" />}>
                Peraga Irisan Ortogonal &amp; Lokalisasi
              </CardTitle>
              <BatasGalat
                cadangan={(pesan) => (
                  <p className="rounded-xl bg-teal-50/70 px-4 py-6 text-center text-[12px] text-teal-600">
                    Peraga irisan gagal dimuat: {pesan}
                  </p>
                )}
              >
                <Suspense
                  fallback={<div className="grid h-48 place-items-center text-[12.5px] text-teal-500">Memuat irisan…</div>}
                >
                  <VolumeSlicer metaUrl={hasil.volumeMetaUrl} />
                </Suspense>
              </BatasGalat>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardTitle icon={<IcLayers className="h-4.5 w-4.5" />}>Ringkasan Segmentasi</CardTitle>
              {/* Tidak ada angka cm³ di sini, dan itu disengaja: proposal §1.6 menaruh pengukuran
                  volume absolut DI LUAR cakupan, karena rekonstruksi dari satu proyeksi bersifat
                  generatif dan tidak menjamin akurasi metrik volume. Keluaran dipertahankan
                  sebagai peta lokasi. Jangan ditambahkan kembali "sekadar sebagai info". */}
              <div className="grid grid-cols-2 gap-3">
                <Angka label="Kavitas lolos filter" nilai={hasil.nKavitas} />
                <Angka
                  label="≥ 14 mm"
                  nilai={hasil.kavitas.filter((k) => k.diAtasLantaiResolusi).length}
                />
              </div>

              {hasil.kavitas.length > 0 ? (
                <ul className="mt-4 divide-y divide-teal-100">
                  {hasil.kavitas.map((k, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-[12px]">
                      <span className="text-teal-700">
                        {k.lobus ? (
                          <>
                            <strong className="font-bold">{k.lobus}</strong>
                            {k.diLuarLobus && <span className="text-amber-600"> · di luar lobus</span>}
                          </>
                        ) : (
                          <>
                            Paru <strong className="font-bold">{k.sisi}</strong> · zona {k.zona}
                          </>
                        )}
                      </span>
                      <span
                        className={[
                          'font-bold',
                          k.diAtasLantaiResolusi ? 'text-rose-500' : 'text-amber-500',
                        ].join(' ')}
                      >
                        Ø {k.diameterMm} mm
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg bg-teal-50/70 px-3 py-2 text-[11.5px] text-teal-600">
                  Tidak ada kandidat yang lolos filter — bukan berarti pasien tidak punya kavitas.
                </p>
              )}

              {hasil.lobusTersedia === false && (
                <p className="mt-1 text-[11px] text-amber-700">
                  Label temuan = <strong className="font-semibold">zona geometrik</strong>, bukan
                  lobus anatomis.
                </p>
              )}
              <Catatan judul="Batasan angka di kartu ini">
                <p>
                  Kartu ini tidak melaporkan volume dalam cm³. Rekonstruksi dari satu proyeksi
                  bersifat generatif dan tidak menjamin akurasi metrik volume, jadi keluarannya
                  dipertahankan sebagai peta lokasi — bukan volumetri.
                </p>
                <p>
                  Kavitas &lt; {LANTAI_MM} mm ada di bawah lantai resolusi grid 128³: rongganya
                  runtuh jadi nodul padat, jadi ukuran di bawah ambang itu tidak bisa dipercaya.
                  Ambang 25 mm (kelas DeepPulmoTB) belum pernah tercapai di kohort kami.
                </p>
                {hasil.lobusTersedia === false && (
                  <p>
                    Model lobus tidak tersedia di peladen ini
                    {hasil.lobusPeringatan ? `: ${hasil.lobusPeringatan}` : ''}. Label yang tampil
                    adalah sepertiga tinggi paru (zona), bukan lobus anatomis.
                  </p>
                )}
              </Catatan>
            </Card>

            <Card>
              <CardTitle icon={<IcDoc className="h-4.5 w-4.5" />}>Rekam Jejak Pemrosesan</CardTitle>
              <dl className="space-y-2 text-[11.5px]">
                {[
                  ['Checkpoint', hasil.checkpoint.split('/').pop() ?? hasil.checkpoint],
                  ['Seed sampling', String(hasil.seed)],
                  ['Skala penyelarasan', `${hasil.alignment.skala}×`],
                  ['Median parenkim', `${hasil.parenkimHu} HU`],
                  ['Ambang udara adaptif', `${hasil.ambangUdaraHu} HU`],
                  ['Saturasi lantai udara', `${(hasil.saturasiUdara * 100).toFixed(1)} %`],
                  ...Object.entries(kasus.durasiDetik ?? {}).map(([k, v]) => [`Waktu ${k}`, `${v} s`]),
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-teal-500">{k}</dt>
                    <dd className="text-right font-semibold break-all text-teal-800">{v}</dd>
                  </div>
                ))}
              </dl>
              {/* Efek penyelarasan framing terukur TIDAK seragam (§11): pasien yang butuh
                  pembesaran ≥1,9x membaik di semua metrik, yang framing-nya sudah dekat template
                  (≤1,3x) justru memburuk. Kasus dengan skala kecil karena itu diberi tanda —
                  angkanya sudah ada di berkas, tinggal dibacakan. */}
              {hasil.alignment.skala <= 1.3 && (
                <p className="mt-3 text-[11px] text-amber-700">
                  <strong className="font-bold">Skala {hasil.alignment.skala}× tergolong kecil</strong>{' '}
                  — kasus seperti ini kemungkinan lebih baik tanpa penyelarasan.
                </p>
              )}
              <Catatan judul="Cara membaca dua angka ini">
                <p>
                  <strong className="font-semibold">Saturasi lantai udara</strong> = fraksi lapangan
                  paru yang keluar persis di −1000 HU. Di CT asli ~0,03%, di pseudo-CT terukur
                  7–23%; makin tinggi, makin banyak parenkim yang keluar sebagai gumpalan hitam
                  seragam.
                </p>
                <p>
                  <strong className="font-semibold">Skala penyelarasan</strong>: pada kohort
                  berpasangan, penyelarasan framing memperbaiki pasien yang butuh pembesaran ≥1,9×
                  tapi memperburuk yang framing-nya sudah dekat template (≤1,3×). Penyelarasan
                  bersyarat belum diimplementasikan.
                </p>
              </Catatan>
            </Card>

            <GerbangPeninjauan kasus={kasus} sesudah={() => void muat()} />

            {kasus.jejakAudit && kasus.jejakAudit.length > 0 && (
              <Card className="print-block">
                <CardTitle icon={<IcShield className="h-4.5 w-4.5" />}>Jejak Audit</CardTitle>
                <ol className="space-y-3">
                  {kasus.jejakAudit.map((j, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-300" />
                      <span>
                        <span className="block text-[12px] leading-snug font-semibold text-teal-800">
                          {j.aksi}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] text-teal-400">
                          {new Date(j.waktu).toLocaleString('id-ID')} · {j.pengguna}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            <Card>
              <CardTitle icon={<IcWarn className="h-4.5 w-4.5" />}>Belum Tersedia</CardTitle>
              <ul className="space-y-1.5 text-[11.5px] text-teal-600">
                <li>• Validasi silang 2D</li>
                <li>• Riwayat antar-waktu</li>
                <li>• CT rujukan (hanya ada untuk kohort berpasangan)</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </ClinicianLayout>
  )
}
