/**
 * Workbench Klinisi — Gambar 3.5 proposal.
 *
 * Menyatukan seluruh keluaran AI dalam satu antarmuka peninjauan (UC-8/9/10/12):
 * peraga 3D, irisan ortogonal, proyeksi lateral sintetis berdampingan dengan PA
 * masukan, panel validasi silang 2D, dan gerbang peninjauan.
 *
 * Dua aturan tata letak yang sengaja dipegang di sini:
 *
 *  - **Tidak ada peta paru kartun.** Ilustrasi SVG dua-dimensi menempatkan titik pada gambar
 *    yang bukan anatomi pasien — persis kesan "lokasi sudah diketahui" yang tidak dimiliki
 *    sistem ini (kesepakatan kavitas terhadap CT asli Dice 0,000). Lokalisasi ditunjukkan di
 *    peraga volume, bukan di kartun; panel kanan cuma memberi angka keyakinan.
 *  - **Teks caveat ditahan seringkas mungkin.** Yang panjang pindah ke <Catatan>, tertutup
 *    secara bawaan; yang tersisa di layar cuma satu baris per panel.
 */
import { Suspense, lazy, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BatasGalat from '../components/BatasGalat'
import ClinicianLayout from '../components/layout/ClinicianLayout'
import {
  Badge,
  Card,
  CardTitle,
  Catatan,
  Kosong,
  Meter,
  PeringatanKlinis,
  cetakHalaman,
  labelStatus,
} from '../components/ui'
import { IcCheck, IcClock, IcClose, IcCube, IcDoc, IcLayers, IcRefresh, IcShield, IcWarn } from '../components/Icons'
import { JEJAK_AUDIT, cariKasus } from '../data/mock'
import type { StatusPeninjauan, TemuanLobus } from '../data/types'

/** Three.js hanya dimuat saat workbench dibuka — halaman lain tak perlu menanggung bundelnya. */
const LesionViewer3D = lazy(() => import('../components/viewer/LesionViewer3D'))
/** Peraga irisan ortogonal atas volume nyata; dipisah karena membaca sprite-sheet 128³. */
const VolumeSlicer = lazy(() => import('../components/viewer/VolumeSlicer'))

const KEDALAMAN: Record<TemuanLobus['kedalaman'], string> = {
  anterior: 'Anterior (depan)',
  tengah: 'Tengah',
  posterior: 'Posterior (belakang)',
}
const ZONA: Record<TemuanLobus['zona'], string> = {
  apeks: 'Zona apeks',
  tengah: 'Zona tengah',
  basal: 'Zona basal',
}

function CitraBerlabel({
  src,
  judul,
  keterangan,
  marker,
  badge,
}: {
  src: string
  judul: string
  keterangan: string
  marker?: { x: number; y: number; w: number; h: number }[]
  badge?: string
}) {
  return (
    <figure>
      <figcaption className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold tracking-[0.1em] text-teal-500 uppercase">{judul}</span>
        {badge && <Badge nada="abu">{badge}</Badge>}
      </figcaption>
      <div className="relative overflow-hidden rounded-xl bg-scan-900 ring-1 ring-teal-900/10">
        <img src={src} alt={`${judul} — ${keterangan}`} className="aspect-square w-full object-cover" />
        {marker?.map((m, i) => (
          <span
            key={i}
            className="pointer-events-none absolute rounded-sm border-2 border-rose-500"
            style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-teal-500">{keterangan}</p>
    </figure>
  )
}

export default function Workbench() {
  const { id } = useParams()
  const kasus = cariKasus(id)
  const [status, setStatus] = useState<StatusPeninjauan>(kasus?.statusPeninjauan ?? 'menunggu')
  const [catatan, setCatatan] = useState(kasus?.catatanKlinis ?? '')
  const [lobusTerpilih, setLobusTerpilih] = useState<string | null>(null)

  if (!kasus) {
    return (
      <ClinicianLayout judul="Workbench Klinisi">
        <Kosong
          judul="Kasus tidak ditemukan"
          pesan="ID kasus yang diminta tidak ada pada worklist fasilitas Anda."
          aksi={
            <Link
              to="/klinisi/kasus"
              className="rounded-lg bg-teal-500 px-4 py-2 text-[12.5px] font-bold text-white"
            >
              Kembali ke Daftar Kasus
            </Link>
          }
        />
      </ClinicianLayout>
    )
  }

  if (kasus.statusTugas === 'gagal_kualitas') {
    return (
      <ClinicianLayout judul="Workbench Klinisi">
        <Card className="border-rose-200 bg-rose-50/40">
          <CardTitle icon={<IcWarn className="h-4.5 w-4.5" />}>
            Citra tidak memenuhi syarat pemrosesan
          </CardTitle>
          <p className="text-[13px] leading-relaxed text-rose-800">{kasus.alasanGagal}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/klinisi/unggah"
              className="rounded-lg bg-teal-500 px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-teal-600"
            >
              Unggah Ulang Citra
            </Link>
            <Link
              to="/klinisi/kasus"
              className="rounded-lg border border-teal-200 px-4 py-2.5 text-[12.5px] font-bold text-teal-700"
            >
              Kembali ke Worklist
            </Link>
          </div>
        </Card>
      </ClinicianLayout>
    )
  }

  // Pipeline masih berjalan: hasilnya belum ada, jadi panel analisis tidak boleh
  // dirender. Tanpa penjagaan ini, `temuan: []` akan terbaca sebagai "0/5 lobus"
  // dan "tidak ada kavitas terdeteksi" — kesimpulan yang belum pernah dihitung.
  if (kasus.statusTugas !== 'menunggu_peninjauan') {
    const tahap = labelStatus(kasus.statusTugas, kasus.statusPeninjauan)
    return (
      <ClinicianLayout judul="Workbench Klinisi">
        <Card className="mx-auto max-w-2xl text-center" padding="p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky-50 text-sky-500">
            <IcClock className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-[20px] font-extrabold tracking-tight text-teal-900">
            Analisis masih berjalan
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-teal-600">
            Kasus <strong className="font-bold text-teal-800">{kasus.idKasus}</strong> atas nama{' '}
            {kasus.namaPasien} belum selesai diproses. Hasil peninjauan baru dapat dibuka setelah
            seluruh tahap pipeline selesai.
          </p>

          <div className="mt-7 rounded-xl bg-teal-50/70 px-5 py-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <Badge nada={tahap.nada}>{tahap.teks}</Badge>
              <span className="text-[12px] font-bold text-teal-700">{kasus.progres}%</span>
            </div>
            <div className="mt-3">
              <Meter nilai={kasus.progres / 100} />
            </div>
            <p className="mt-3 text-[11.5px] text-teal-500">
              Estimasi selesai ±{Math.max(1, Math.round((100 - kasus.progres) / 6))} menit. Anda akan
              menerima pemberitahuan ketika status berubah menjadi <em>menunggu peninjauan</em>.
            </p>
          </div>

          <div className="mt-7">
            <Link
              to="/klinisi/kasus"
              className="inline-flex rounded-xl bg-teal-500 px-5 py-3 text-[13px] font-bold text-white transition hover:bg-teal-600"
            >
              Kembali ke Daftar Kasus
            </Link>
          </div>
        </Card>
      </ClinicianLayout>
    )
  }

  const st = labelStatus(kasus.statusTugas, status)
  const terdeteksi = kasus.temuan.filter((t) => t.terdeteksi)

  return (
    <ClinicianLayout
      judul="Workbench Klinisi"
      aksi={
        <button
          onClick={cetakHalaman}
          className="hidden items-center gap-2 rounded-lg border border-teal-200 px-3.5 py-2 text-[12px] font-bold text-teal-700 transition hover:border-teal-400 sm:inline-flex"
        >
          <IcDoc className="h-4 w-4" /> Ekspor Laporan (PDF)
        </button>
      }
    >
      {/* Kop kasus */}
      <Card className="print-block" padding="p-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-teal-400 uppercase">ID Kasus</p>
            <p className="mt-1 text-[17px] font-extrabold text-teal-900">{kasus.idKasus}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-teal-400 uppercase">Pasien</p>
            <p className="mt-1 text-[17px] font-extrabold text-teal-500">
              {kasus.namaPasien}{' '}
              <span className="text-[12px] font-semibold text-teal-400">{kasus.nikTersamar}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-teal-400 uppercase">Titik Waktu</p>
            <p className="mt-1 text-[13px] font-semibold text-teal-700">{kasus.timepoint}</p>
            <p className="text-[11px] text-teal-400">{kasus.tanggal}</p>
          </div>
          <div className="ml-auto">
            <Badge nada={st.nada} className="px-3 py-1.5 text-[11px]">
              {status === 'disetujui' && <IcCheck className="h-3.5 w-3.5" />}
              {status === 'disetujui' ? 'Telah Disetujui (Approved)' : st.teks}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        <PeringatanKlinis />
      </div>

      {/*
        KNF-02 menyebut "contoh terpra-komputasi untuk demonstrasi", dan `mock.ts` sudah jujur
        soal itu — tapi di komentar kode, yang tidak dibaca siapa pun yang menonton peragaan.
        Angka keyakinan per lobus di halaman ini tidak dihasilkan model mana pun, jadi
        penandanya harus terlihat di layar. Sebaris; rinciannya di dalam lipatan.
      */}
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5">
        <p className="flex items-center gap-2 text-[11.5px] text-amber-800">
          <IcWarn className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong className="font-bold">Kasus contoh</strong> — identitas &amp; angka keyakinan
            adalah data peragaan; panel citra dan volume di kolom kiri sungguhan.
          </span>
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* Kolom kiri — peraga */}
        <div className="space-y-4">
          {/*
            Peraga 3D atas permukaan mask SUNGGUHAN pasien ini (marching cubes atas keluaran
            volutb.segmentation.heuristic), bukan lagi proksi geometris dari angka contoh.
            Karena itu ia sekarang bertanda "volume nyata" seperti dua panel di bawahnya.
            Kalau aset meshnya belum diekspor untuk pasien ini, panelnya sengaja TIDAK muncul —
            mengembalikan bentuk karangan hanya supaya ada yang tampil justru merusak seluruh
            gunanya panel ini.
          */}
          {kasus.meshMeta && (
          <Card className="print-block">
            <CardTitle icon={<IcCube className="h-4.5 w-4.5" />}>Visualisasi Volume 3D Lesi</CardTitle>
            {/*
              Jaring pengaman: ketiadaan WebGL sudah ditangani di dalam
              LesionViewer3D, batas ini menahan kegagalan render lain (mis. aset
              mesh cacat) agar panel peninjauan lain tetap bisa dipakai.
            */}
            <BatasGalat
              cadangan={(pesan) => (
                <div className="scan-canvas grid aspect-[16/11] w-full place-items-center rounded-xl px-8 text-center">
                  <div>
                    <IcWarn className="mx-auto h-6 w-6 text-amber-300" />
                    <p className="mt-3 text-[13px] font-bold text-white/85">
                      Peraga 3D gagal dimuat
                    </p>
                    <p className="mt-2 font-mono text-[10px] break-all text-white/35">{pesan}</p>
                  </div>
                </div>
              )}
            >
              <Suspense
                fallback={
                  <div className="scan-canvas grid aspect-[16/11] w-full place-items-center rounded-xl text-[12.5px] text-white/60">
                    Memuat peraga volumetrik…
                  </div>
                }
              >
                <LesionViewer3D metaUrl={kasus.meshMeta} />
              </Suspense>
            </BatasGalat>
          </Card>
          )}

          {/*
            Satu-satunya panel di halaman ini yang isinya BUKAN dummy: montase ini keluaran
            langsung checkpoint rekonstruksi, disalin apa adanya dari outputs/. Karena itu ia
            diberi nada berbeda dari panel lain dan keterangannya menyebut angka yang benar-benar
            terukur — kalau ditanya juri, ini bagian yang bisa dipertanggungjawabkan.
          */}
          {kasus.citraRekonstruksi && (
            <Card className="print-block">
              <CardTitle icon={<IcCube className="h-4.5 w-4.5" />}>
                Rekonstruksi Volumetrik dari CXR Tunggal
              </CardTitle>
              <figure>
                <div className="overflow-x-auto rounded-xl bg-scan-900 ring-1 ring-teal-900/10">
                  <img
                    src={kasus.citraRekonstruksi}
                    alt="Baris atas CT asli, baris tengah pseudo-CT hasil rekonstruksi, baris bawah peta selisih absolut, pada beberapa irisan aksial dan satu potongan koronal."
                    className="min-w-[640px] w-full"
                  />
                </div>
                <figcaption className="mt-2 text-[11px] text-teal-500">
                  Atas: CT asli · tengah: pseudo-CT · bawah: selisih absolut (<em>lung window</em>).
                </figcaption>
              </figure>
            </Card>
          )}

          {/*
            Peraga irisan ortogonal atas volume NYATA — irisan dari mask yang sama dengan panel
            permukaan 3D di atas, dan dari berkas pseudo-CT yang sama persis (`outputs/pseudo_ct/`),
            supaya jumlah kavitas kedua panel tidak pernah berbeda. Dua seri dikirim: pseudo-CT
            hasil rekonstruksi dan CT asli sebagai rujukan. Kavitas di seri pseudo-CT diberi
            peringatan di layar — §15 STATUS_BERJALAN.md mengukur kesepakatannya terhadap CT asli
            Dice 0,000 di 26/26 pasien. Penonton bisa berpindah sendiri; tidak ada penanda yang
            dikarang, dan tidak ada yang disembunyikan.
          */}
          {kasus.volumeMeta && (
            <Card className="print-block">
              <CardTitle icon={<IcLayers className="h-4.5 w-4.5" />}>
                Peraga Irisan Ortogonal &amp; Lokalisasi
              </CardTitle>
              <BatasGalat
                cadangan={(pesan) => (
                  <div className="grid place-items-center rounded-xl bg-teal-50/70 px-6 py-10 text-center">
                    <IcWarn className="h-6 w-6 text-amber-400" />
                    <p className="mt-3 text-[13px] font-bold text-teal-800">
                      Peraga irisan gagal dimuat
                    </p>
                    <p className="mt-2 font-mono text-[10px] break-all text-teal-400">{pesan}</p>
                  </div>
                )}
              >
                <Suspense
                  fallback={
                    <div className="grid h-48 place-items-center text-[12.5px] text-teal-500">
                      Memuat peraga irisan…
                    </div>
                  }
                >
                  <VolumeSlicer metaUrl={kasus.volumeMeta} />
                </Suspense>
              </BatasGalat>
            </Card>
          )}

          {/*
            KF-09: lateral sintetis berdampingan dengan PA masukan.

            Keduanya berkas sungguhan pasien ini: PA-nya citra yang persis dilihat model (cache
            aligned), lateralnya DRR 90° atas pseudo-CT yang sama dengan peraga 3D & irisan di
            atas. Sebelumnya slot lateral diisi `lateral-0*.png` — placeholder bertuliskan
            "PLACEHOLDER" yang bahkan bukan proyeksi lateral. Berkasnya sudah dihapus supaya tidak
            bisa kembali dipakai; pembuatannya di `scripts/export_lateral_drr.py`.
          */}
          <Card className="print-block">
            <CardTitle icon={<IcLayers className="h-4.5 w-4.5" />}>
              Panel Proyeksi Lateral Sintetis
            </CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <CitraBerlabel
                src={kasus.citraPA}
                judul="PA — masukan model"
                keterangan="Citra setelah pra-proses & penyelarasan framing."
              />
              {kasus.citraLateral ? (
                <CitraBerlabel
                  src={kasus.citraLateral}
                  judul="Lateral sintetis (90°)"
                  keterangan="Proyeksi DRR dari pseudo-CT — bukan foto lateral."
                />
              ) : (
                <div className="grid place-items-center rounded-xl border border-dashed border-teal-200 p-6 text-center text-[12px] text-teal-500">
                  Proyeksi lateral belum tersedia untuk kasus ini.
                </div>
              )}
            </div>
          </Card>

          {/* Subbab 2.2.4 — jalur pembanding independen */}
          {kasus.validasi2D && (
            <Card className="print-block">
              <CardTitle
                icon={<IcShield className="h-4.5 w-4.5" />}
                aksi={
                  <Badge nada={kasus.validasi2D.konsisten ? 'hijau' : 'kuning'}>
                    {kasus.validasi2D.konsisten ? 'Posisi konsisten' : 'Perlu ditinjau'}
                  </Badge>
                }
              >
                Panel Validasi Dua Dimensi
              </CardTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <CitraBerlabel
                  src={kasus.citraPA}
                  judul="Citra Asli (CXR)"
                  keterangan="Tanpa lapisan penanda."
                />
                <CitraBerlabel
                  src={kasus.citraPA}
                  judul="Deteksi Marker AI"
                  keterangan="Segmentasi 2D langsung pada CXR — jalur independen."
                  marker={kasus.validasi2D.marker}
                />
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {kasus.validasi2D.temuan2D.map((t) => (
                  <li key={t}>
                    <Badge nada="abu">{t}</Badge>
                  </li>
                ))}
              </ul>
              <Catatan judul="Uji kewajaran posisi 2D ↔ 3D">
                <p>{kasus.validasi2D.catatan}</p>
              </Catatan>
            </Card>
          )}
        </div>

        {/* Kolom kanan — analisis & keputusan */}
        <div className="space-y-4">
          {/*
            Kartu ini dulu "Peta Lokasi Kavitas" dan isinya peta paru SVG dengan titik per zona.
            Dihapus atas permintaan tim, dan alasannya sejalan dengan yang sudah terukur: peta itu
            menempatkan penanda pada gambar yang bukan anatomi pasien mana pun, sehingga membacanya
            seperti "sistem tahu lokasinya" — padahal kesepakatan letak kavitas terhadap CT asli
            Dice 0,000. Angka keyakinan tetap; lokalisasi ditunjukkan di peraga volume, di sana
            penandanya menempel pada voxel sungguhan.
          */}
          <Card className="print-block">
            <CardTitle
              icon={<IcLayers className="h-4.5 w-4.5" />}
              aksi={<Badge nada="abu">{terdeteksi.length}/5 lobus</Badge>}
            >
              Tingkat Keyakinan per Lobus
            </CardTitle>

            <ul className="divide-y divide-teal-50">
              {kasus.temuan.map((t) => {
                const aktif = lobusTerpilih === t.lobus
                return (
                  <li key={t.lobus}>
                    <button
                      disabled={!t.terdeteksi}
                      onClick={() => setLobusTerpilih((v) => (v === t.lobus ? null : t.lobus))}
                      className={[
                        'w-full rounded-lg px-2 py-2.5 text-left transition',
                        t.terdeteksi ? 'hover:bg-teal-50' : 'cursor-default',
                        aktif ? 'bg-teal-50' : '',
                      ].join(' ')}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-[12.5px] font-semibold text-teal-800">{t.nama}</span>
                        {t.terdeteksi ? (
                          <Badge nada={t.keyakinan >= 0.75 ? 'merah' : 'kuning'}>
                            {Math.round(t.keyakinan * 100)}%
                          </Badge>
                        ) : (
                          <span className="text-[11.5px] font-semibold text-teal-300">
                            Tidak terdeteksi
                          </span>
                        )}
                      </span>
                      {t.terdeteksi && (
                        <span className="mt-1.5 block text-[11px] text-teal-500">
                          {ZONA[t.zona]} · {KEDALAMAN[t.kedalaman]} · {t.jumlahFokus} fokus
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-4 rounded-xl bg-teal-50/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11.5px] font-semibold text-teal-700">Tingkat Keyakinan AI</span>
                <Badge nada={kasus.keyakinanKeseluruhan >= 0.75 ? 'hijau' : 'kuning'}>
                  {kasus.keyakinanKeseluruhan >= 0.75 ? 'Tinggi' : 'Sedang'} (
                  {Math.round(kasus.keyakinanKeseluruhan * 100)}%)
                </Badge>
              </div>
              <div className="mt-2.5">
                <Meter
                  nilai={kasus.keyakinanKeseluruhan}
                  nada={kasus.keyakinanKeseluruhan >= 0.75 ? 'hijau' : 'kuning'}
                />
              </div>
            </div>
          </Card>

          {/* Gerbang peninjauan — Subbab 2.2.5 / KF-08 */}
          <Card className="print-block">
            <CardTitle icon={<IcShield className="h-4.5 w-4.5" />}>Gerbang Peninjauan Klinisi</CardTitle>

            <label
              htmlFor="catatan"
              className="block text-[10.5px] font-bold tracking-[0.1em] text-teal-500 uppercase"
            >
              Catatan Klinis (Opsional)
            </label>
            <textarea
              id="catatan"
              rows={4}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis. kavitas mengecil dibanding bulan ke-0. Lanjutkan pengobatan sesuai standar."
              className="mt-2 w-full resize-none rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3 text-[12.5px] leading-relaxed text-teal-900 outline-none transition placeholder:text-teal-400/80 focus:border-teal-400 focus:bg-white"
            />

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                onClick={() => setStatus('disetujui')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[12.5px] font-bold transition',
                  status === 'disetujui'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                ].join(' ')}
              >
                <IcCheck className="h-4 w-4" /> Setujui
              </button>
              <button
                onClick={() => setStatus('revisi')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[12.5px] font-bold transition',
                  status === 'revisi'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                ].join(' ')}
              >
                <IcRefresh className="h-4 w-4" /> Revisi
              </button>
              <button
                onClick={() => setStatus('ditolak')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[12.5px] font-bold transition',
                  status === 'ditolak' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                ].join(' ')}
              >
                <IcClose className="h-4 w-4" /> Tolak
              </button>
            </div>

            <p className="mt-3 text-[11px] text-teal-500">
              Hanya hasil <strong className="font-semibold">disetujui</strong> yang terbit ke
              tampilan pasien.
            </p>

            <button
              onClick={cetakHalaman}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 py-3 text-[12.5px] font-bold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
            >
              <IcDoc className="h-4 w-4" /> Ekspor Laporan Analisis (PDF)
            </button>
          </Card>

          <Card className="print-block">
            <CardTitle icon={<IcShield className="h-4.5 w-4.5" />}>Jejak Audit</CardTitle>
            <ol className="space-y-3.5">
              {(JEJAK_AUDIT[kasus.idKasus] ?? []).map((j, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-300" />
                  <span>
                    <span className="block text-[12px] leading-snug font-semibold text-teal-800">
                      {j.aksi}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] text-teal-400">
                      {j.waktu} · {j.pengguna}
                    </span>
                  </span>
                </li>
              ))}
              {!JEJAK_AUDIT[kasus.idKasus] && (
                <li className="text-[12px] text-teal-500">Belum ada aktivitas tercatat.</li>
              )}
            </ol>
          </Card>
        </div>
      </div>
    </ClinicianLayout>
  )
}
