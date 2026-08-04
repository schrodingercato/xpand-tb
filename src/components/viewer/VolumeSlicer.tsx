/**
 * Peraga irisan ortogonal (aksial / koronal / sagital) di atas volume NYATA.
 *
 * Komponen ini membaca volume 128³ sungguhan: pseudo-CT hasil rekonstruksi maupun CT asli sebagai
 * rujukan, lengkap dengan mask segmentasi dari `Xpand-TB.segmentation.heuristic`. Asetnya dihasilkan
 * `scripts/export_volume_for_web.py`. Pasangannya `LesionViewer3D.tsx` merender permukaan 3D dari
 * mask yang sama (`scripts/export_lung_mesh.py`) — irisan di sini, permukaan di sana.
 *
 * ## Kenapa satu sprite-sheet, bukan 128 berkas
 *
 * Potongan koronal & sagital mustahil dibentuk dari irisan aksial yang dimuat satu per satu —
 * seluruh volume harus ada di memori sekaligus. Satu PNG dibaca sekali ke `Uint8Array(128³)`,
 * lalu bidang mana pun bisa dipotong tanpa permintaan jaringan lagi.
 *
 * ## Orientasi
 *
 * Volume disimpan dengan indeks z=0 = superior (kepala), hasil `orient_head_first` di pipeline.
 * Karena itu baris paling atas pada tampilan koronal & sagital memang apeks — jangan dibalik.
 *
 * ## Batasan yang melekat pada data ini
 *
 * Penanda kavitas berasal dari segmenter heuristik yang **belum tervalidasi** (§14
 * STATUS_BERJALAN.md). Pada pseudo-CT jumlahnya nol untuk kedua pasien contoh — tapi hati-hati
 * membacanya: §15 menemukan nol itu sebagian artefak ambang (persentil mendarat di lantai klip),
 * dan aset di sini dibuat SEBELUM perbaikan itu. Setelah diperbaiki pseudo-CT memang memberi
 * kavitas, hanya saja **tidak berimpit sama sekali** dengan kavitas CT asli (Dice 0,000 di 26/26
 * pasien). Panel permukaan 3D (`LesionViewer3D.tsx`) memakai aset pasca-perbaikan, jadi kalau
 * jumlahnya berbeda dengan panel ini, itu sebabnya — bukan bug salah satunya.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

type Bidang = 'aksial' | 'koronal' | 'sagital'

interface Kavitas {
  sisi: string
  zona: string
  diameterMm: number
  z: number
  y: number
  x: number
}

interface Seri {
  kind: string
  nama: string
  volumeUrl: string
  maskUrl: string
  cavities: Kavitas[]
}

interface MetaVolume {
  patientId: string
  dims: { z: number; y: number; x: number }
  tileCols: number
  spacingMm: number[]
  windowHu: number[]
  labels: { lung: number; clcw: number; cavity: number }
  series: Seri[]
}

const BIDANG: Bidang[] = ['aksial', 'koronal', 'sagital']
const JUDUL: Record<Bidang, string> = {
  aksial: 'Aksial (X–Y)',
  koronal: 'Koronal (X–Z)',
  sagital: 'Sagital (Y–Z)',
}

/** Warna overlay RGBA. Kavitas paling menonjol, paru paling redup — urutan bacanya disengaja. */
const WARNA: Record<number, [number, number, number, number]> = {
  1: [45, 212, 191, 46], // paru
  2: [251, 191, 36, 70], // konsolidasi + dinding kavitas
  3: [244, 63, 94, 150], // kavitas
}

/** Baca sprite-sheet PNG jadi Uint8Array(z*y*x), mengambil kanal merah tiap piksel. */
async function muatLembar(
  url: string,
  dims: MetaVolume['dims'],
  tileCols: number,
): Promise<Uint8Array> {
  const img = new Image()
  img.src = url
  await img.decode()
  const kanvas = document.createElement('canvas')
  kanvas.width = img.width
  kanvas.height = img.height
  const ctx = kanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D tidak tersedia di peramban ini.')
  ctx.drawImage(img, 0, 0)
  const piksel = ctx.getImageData(0, 0, img.width, img.height).data
  const keluar = new Uint8Array(dims.z * dims.y * dims.x)
  for (let z = 0; z < dims.z; z++) {
    const ox = (z % tileCols) * dims.x
    const oy = Math.floor(z / tileCols) * dims.y
    for (let y = 0; y < dims.y; y++) {
      const awalBaris = ((oy + y) * img.width + ox) * 4
      const awalKeluar = (z * dims.y + y) * dims.x
      for (let x = 0; x < dims.x; x++) keluar[awalKeluar + x] = piksel[awalBaris + x * 4]
    }
  }
  return keluar
}

/** Ukuran gambar tiap bidang: [lebar, tinggi] dalam voxel. */
function ukuran(bidang: Bidang, dims: MetaVolume['dims']): [number, number] {
  if (bidang === 'aksial') return [dims.x, dims.y]
  if (bidang === 'koronal') return [dims.x, dims.z]
  return [dims.y, dims.z]
}

/** Indeks voxel untuk piksel (u, v) pada bidang tertentu di irisan `n`. */
function indeks(bidang: Bidang, dims: MetaVolume['dims'], n: number, u: number, v: number): number {
  if (bidang === 'aksial') return (n * dims.y + v) * dims.x + u
  if (bidang === 'koronal') return (v * dims.y + n) * dims.x + u
  return (v * dims.y + u) * dims.x + n
}

function Panel({
  bidang,
  dims,
  volume,
  mask,
  overlay,
  kavitas,
  spacingMm,
}: {
  bidang: Bidang
  dims: MetaVolume['dims']
  volume: Uint8Array
  mask: Uint8Array
  overlay: boolean
  kavitas: Kavitas[]
  spacingMm: number[]
}) {
  const [lebar, tinggi] = ukuran(bidang, dims)
  const maksimum = bidang === 'aksial' ? dims.z : bidang === 'koronal' ? dims.y : dims.x
  const [irisan, setIrisan] = useState(Math.floor(maksimum / 2))
  const refKanvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const kanvas = refKanvas.current
    if (!kanvas) return
    const ctx = kanvas.getContext('2d')
    if (!ctx) return
    const gambar = ctx.createImageData(lebar, tinggi)
    for (let v = 0; v < tinggi; v++) {
      for (let u = 0; u < lebar; u++) {
        const i = indeks(bidang, dims, irisan, u, v)
        const abu = volume[i]
        const p = (v * lebar + u) * 4
        gambar.data[p] = abu
        gambar.data[p + 1] = abu
        gambar.data[p + 2] = abu
        gambar.data[p + 3] = 255
        if (overlay) {
          const warna = WARNA[mask[i]]
          if (warna) {
            const a = warna[3] / 255
            gambar.data[p] = Math.round(abu * (1 - a) + warna[0] * a)
            gambar.data[p + 1] = Math.round(abu * (1 - a) + warna[1] * a)
            gambar.data[p + 2] = Math.round(abu * (1 - a) + warna[2] * a)
          }
        }
      }
    }
    ctx.putImageData(gambar, 0, 0)
  }, [bidang, dims, irisan, lebar, tinggi, mask, overlay, volume])

  // Penanda digambar sebagai lingkaran HTML di atas kanvas, bukan ke dalam piksel: ukurannya
  // jadi tetap tajam saat kanvas 128px diregangkan, dan tidak ikut terbaca sebagai citra.
  const penanda = kavitas
    .map((k) => {
      const sumbu = bidang === 'aksial' ? k.z : bidang === 'koronal' ? k.y : k.x
      const jarak = Math.abs(sumbu - irisan)
      const jariJariVoxel = k.diameterMm / 2 / (spacingMm[0] || 2.7)
      if (jarak > jariJariVoxel) return null
      // Lingkaran mengecil menjauhi pusat lesi, seperti irisan bola.
      const r = Math.sqrt(Math.max(jariJariVoxel ** 2 - jarak ** 2, 0.5))
      const u = bidang === 'sagital' ? k.y : k.x
      const v = bidang === 'aksial' ? k.y : k.z
      return { kiri: (u / lebar) * 100, atas: (v / tinggi) * 100, r: (r / lebar) * 100, k }
    })
    .filter(Boolean) as { kiri: number; atas: number; r: number; k: Kavitas }[]

  return (
    <figure>
      <figcaption className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold tracking-[0.1em] text-teal-500 uppercase">
          {JUDUL[bidang]}
        </span>
        <span className="font-mono text-[10.5px] text-teal-400">
          {irisan + 1}/{maksimum}
        </span>
      </figcaption>
      <div className="relative overflow-hidden rounded-xl bg-scan-900 ring-1 ring-teal-900/10">
        <canvas
          ref={refKanvas}
          width={lebar}
          height={tinggi}
          className="block aspect-square w-full"
          style={{ imageRendering: 'auto' }}
        />
        {penanda.map((p, i) => (
          <span
            key={i}
            title={`Kavitas ${p.k.diameterMm} mm — ${p.k.sisi}, zona ${p.k.zona}`}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.55)]"
            style={{
              left: `${p.kiri}%`,
              top: `${p.atas}%`,
              width: `${Math.max(p.r * 2, 4)}%`,
              height: `${Math.max(p.r * 2, 4)}%`,
            }}
          />
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={maksimum - 1}
        value={irisan}
        onChange={(e) => setIrisan(Number(e.target.value))}
        aria-label={`Irisan ${JUDUL[bidang]}`}
        className="mt-2.5 w-full accent-teal-500"
      />
    </figure>
  )
}

export default function VolumeSlicer({ metaUrl }: { metaUrl: string }) {
  const [meta, setMeta] = useState<MetaVolume | null>(null)
  const [seriTerpilih, setSeriTerpilih] = useState(0)
  const [overlay, setOverlay] = useState(true)
  const [data, setData] = useState<{ volume: Uint8Array; mask: Uint8Array } | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    let batal = false
    fetch(metaUrl)
      .then((r) => r.json())
      .then((m: MetaVolume) => !batal && setMeta(m))
      .catch((e) => !batal && setGalat(String(e)))
    return () => {
      batal = true
    }
  }, [metaUrl])

  const seri = meta?.series[seriTerpilih]

  useEffect(() => {
    if (!meta || !seri) return
    let batal = false
    setData(null)
    Promise.all([
      muatLembar(seri.volumeUrl, meta.dims, meta.tileCols),
      muatLembar(seri.maskUrl, meta.dims, meta.tileCols),
    ])
      .then(([volume, mask]) => !batal && setData({ volume, mask }))
      .catch((e) => !batal && setGalat(String(e)))
    return () => {
      batal = true
    }
  }, [meta, seri])

  const ringkas = useMemo(() => {
    if (!seri) return null
    const n = seri.cavities.length
    return n === 0
      ? 'Tidak ada kavitas terdeteksi pada volume ini.'
      : `${n} kavitas terdeteksi — terbesar ${Math.max(...seri.cavities.map((c) => c.diameterMm))} mm.`
  }, [seri])

  if (galat) {
    return (
      <p className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
        Volume gagal dimuat: {galat}
      </p>
    )
  }
  if (!meta || !seri) {
    return (
      <div className="grid h-48 place-items-center text-[12.5px] text-teal-500">Memuat volume…</div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-teal-50 p-1">
          {meta.series.map((s, i) => (
            <button
              key={s.kind}
              onClick={() => setSeriTerpilih(i)}
              className={`rounded-md px-3 py-1.5 text-[11.5px] font-bold transition ${
                i === seriTerpilih ? 'bg-white text-teal-800 shadow-sm' : 'text-teal-500'
              }`}
            >
              {s.nama}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOverlay((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-[11.5px] font-bold transition ${
            overlay ? 'border-teal-400 bg-teal-500 text-white' : 'border-teal-200 text-teal-600'
          }`}
        >
          {overlay ? 'Overlay aktif' : 'Overlay mati'}
        </button>
        <span className="ml-auto text-[11.5px] text-teal-500">{ringkas}</span>
      </div>

      {data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {BIDANG.map((b) => (
            <Panel
              key={b}
              bidang={b}
              dims={meta.dims}
              volume={data.volume}
              mask={data.mask}
              overlay={overlay}
              kavitas={seri.cavities}
              spacingMm={meta.spacingMm}
            />
          ))}
        </div>
      ) : (
        <div className="grid h-48 place-items-center text-[12.5px] text-teal-500">
          Membaca volume 128³…
        </div>
      )}

      {/*
        Peringatan ini muncul HANYA di seri pseudo-CT dan bukan basa-basi: §15 mengukur Dice
        kavitas 0,000 terhadap CT asli di 26/26 pasien. Jadi penanda merah di seri ini berada di
        tempat yang tidak dikonfirmasi CT mana pun — menampilkannya tanpa keterangan sama saja
        menyajikan artefak sebagai deteksi.
      */}
      {seri.kind === 'pseudo' && seri.cavities.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          <strong className="font-bold">Penanda pada seri pseudo-CT belum tervalidasi.</strong>{' '}
          Kesepakatan kavitas terhadap CT asli terukur <strong>Dice 0,000</strong> pada 26 pasien
          berpasangan — bentuk lapangan paru selamat melewati rekonstruksi, letak kavitasnya tidak.{' '}
          {meta.series.length > 1
            ? 'Pindah ke seri CT asli untuk membandingkan.'
            : 'Tidak ada CT rujukan untuk kasus ini, jadi tidak ada pembandingnya.'}
        </p>
      )}

      <ul className="mt-4 flex flex-wrap gap-4 text-[11px] text-teal-600">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal-400" /> Lapangan paru
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Konsolidasi &amp; dinding
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Kavitas
        </li>
      </ul>
    </div>
  )
}
