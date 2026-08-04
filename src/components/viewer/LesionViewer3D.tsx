/**
 * Peraga volumetrik interaktif (KF-09 / UC-9): permukaan paru + kavitas pasien itu sendiri.
 *
 * Versi sebelumnya merender **proksi geometris** — dua bentuk lathe sebagai "paru" dan satu bola
 * per lobus, ukurannya diturunkan dari angka keyakinan contoh di `mock.ts`. Yang dirender di sini
 * adalah permukaan dari **mask segmentasi volume sungguhan** pasien itu (`marching cubes` atas
 * keluaran `Xpand-TB.segmentation.heuristic`), diekspor oleh `scripts/export_lung_mesh.py`:
 * paru transparan sebagai konteks, tiap kavitas sebagai gumpalan padat di posisi anatomisnya.
 *
 * ## Dua seri, dan kenapa keduanya dikirim
 *
 * - `pseudo` — keluaran pipeline sungguhan (satu CXR PA → pseudo-CT). Ini yang dihasilkan sistem.
 * - `ct`     — CT asli pasien yang sama, rujukan.
 *
 * §15 `STATUS_BERJALAN.md` mengukur **Dice kavitas 0.000 di 26/26 pasien**: kavitas yang muncul
 * di pseudo-CT tidak berimpit dengan kavitas mana pun di CT asli pasien yang sama. Karena itu
 * penanda pada seri `pseudo` diberi label **belum tervalidasi** di layar, bukan disebut deteksi —
 * dan penonton bisa berpindah seri sendiri untuk melihat bedanya. Permukaan **parunya** lain
 * cerita: Dice paru CT↔pseudo 0.74–0.77, jadi bentuk paru itulah bagian yang memang selamat
 * melewati rekonstruksi.
 *
 * ## Orientasi
 *
 * Volume tersimpan (Z, Y, X) dengan z=0 = superior dan konvensi LPS (X menaik = kiri pasien).
 * Pemetaan ke sumbu three.js: `x_gl = X`, `y_gl = -Z` (superior ke atas), `z_gl = -Y` (anterior
 * menghadap kamera). Hasilnya tampak depan dengan **kiri pasien di kanan layar** — konvensi
 * radiologis, sama dengan panel irisan ortogonal.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { IcWarn } from '../Icons'

export type Sumbu = 'aksial' | 'koronal' | 'sagital'

const NORMAL: Record<Sumbu, THREE.Vector3> = {
  aksial: new THREE.Vector3(0, -1, 0),
  koronal: new THREE.Vector3(0, 0, -1),
  sagital: new THREE.Vector3(-1, 0, 0),
}

/**
 * Ambang warna kavitas = **lantai resolusi terukur**, bukan tingkat keyakinan.
 *
 * `scripts/test_detail_ceiling.py` mengukur lubang kavitas runtuh di ≤14 mm pada grid 128³
 * (voxel ~2.7 mm): di bawah itu ia keluar sebagai nodul padat, bukan rongga. Jadi pembagian
 * warna di sini menyatakan sesuatu yang benar-benar diukur — bukan "keyakinan" yang tidak
 * dihasilkan model mana pun.
 */
const LANTAI_RESOLUSI_MM = 14

interface MeshEntry {
  peran: 'paru' | 'kavitas'
  posOffset: number
  nVerts: number
  idxOffset: number
  nIndices: number
  idxBytes: 2 | 4
  diameterMm?: number
  volumeMm3?: number
  sisi?: string
  zona?: string
  centroidZyx?: [number, number, number]
  /** Lobus anatomis dari model rujukan (lungmask LTRCLobes). Absen = hanya zona geometrik. */
  lobus?: string | null
  kodeLobus?: string | null
  diLuarLobus?: boolean
}

interface Seri {
  kind: string
  nama: string
  binUrl: string
  nKavitas: number
  nDiterima: number
  meshes: MeshEntry[]
}

interface MetaMesh {
  patientId: string
  dims: { z: number; y: number; x: number }
  spacingMm: number
  spacingAssumed: boolean
  series: Seri[]
}

/**
 * Apakah peramban bisa membuat konteks WebGL?
 *
 * Harus diperiksa SEBELUM `<Canvas>` dipasang. Bila konteks gagal dibuat, three.js melempar dari
 * jalur konfigurasi asinkron react-three-fiber — di luar fase render React — sehingga tidak
 * tertangkap batas galat mana pun. Yang tersisa hanyalah kanvas hitam tanpa keterangan. Kasus
 * nyata: mesin virtual, sesi remote desktop (xrdp/VNC), peramban dengan akselerasi dimatikan.
 */
function webglDidukung(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const kanvas = document.createElement('canvas')
    return !!(kanvas.getContext('webgl2') ?? kanvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Satu blok biner → `BufferGeometry`.
 *
 * Posisi disimpan uint16 pada kisi volume (lihat `export_lung_mesh.py`), jadi ia harus
 * dinormalkan ke kubus [-1, 1] sambil menukar sumbu ke konvensi three.js. Normal sengaja tidak
 * ikut dikirim — menghitungnya di sini lebih murah daripada menggandakan ukuran berkas.
 */
function bacaGeometri(buf: ArrayBuffer, m: MeshEntry): THREE.BufferGeometry {
  const q = new Uint16Array(buf, m.posOffset, m.nVerts * 3)
  const pos = new Float32Array(m.nVerts * 3)
  for (let i = 0; i < m.nVerts; i++) {
    const z = q[i * 3] / 65535
    const y = q[i * 3 + 1] / 65535
    const x = q[i * 3 + 2] / 65535
    pos[i * 3] = (x - 0.5) * 2
    pos[i * 3 + 1] = -(z - 0.5) * 2
    pos[i * 3 + 2] = -(y - 0.5) * 2
  }
  const idx =
    m.idxBytes === 2
      ? new Uint16Array(buf, m.idxOffset, m.nIndices)
      : new Uint32Array(buf, m.idxOffset, m.nIndices)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  // `slice()` menyalin keluar dari ArrayBuffer bersama: buffer-nya dipakai ulang untuk seluruh
  // mesh di seri ini, dan `BufferAttribute` menahan referensi ke view-nya.
  g.setIndex(new THREE.BufferAttribute(idx.slice(), 1))
  g.computeVertexNormals()
  return g
}

function warnaKavitas(diameterMm: number) {
  return diameterMm >= LANTAI_RESOLUSI_MM ? '#ef4444' : '#f5b544'
}

function Paru({ geometri, bidang }: { geometri: THREE.BufferGeometry; bidang: THREE.Plane[] }) {
  const bahan = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2f7f8c',
        transparent: true,
        opacity: 0.22,
        roughness: 0.6,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  )
  bahan.clippingPlanes = bidang
  useEffect(() => () => bahan.dispose(), [bahan])
  return <mesh geometry={geometri} material={bahan} />
}

function Kavitas({
  geometri,
  entry,
  aktif,
  bidang,
  onPilih,
}: {
  geometri: THREE.BufferGeometry
  entry: MeshEntry
  aktif: boolean
  bidang: THREE.Plane[]
  onPilih: () => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const warna = warnaKavitas(entry.diameterMm ?? 0)

  // Denyut halus hanya pada yang terpilih. Skalanya di sekitar pusat massa mesh, bukan titik asal
  // dunia, supaya kavitas tidak melayang keluar dari parunya saat berdenyut.
  const pusat = useMemo(() => {
    geometri.computeBoundingSphere()
    return geometri.boundingSphere?.center.clone() ?? new THREE.Vector3()
  }, [geometri])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const denyut = aktif ? 1 + Math.sin(clock.elapsedTime * 2.6) * 0.08 : 1
    ref.current.scale.setScalar(denyut)
    ref.current.position.copy(pusat).multiplyScalar(1 - denyut)
  })

  return (
    <mesh
      ref={ref}
      geometry={geometri}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onPilih()
      }}
    >
      <meshStandardMaterial
        color={warna}
        emissive={warna}
        emissiveIntensity={aktif || hover ? 0.6 : 0.2}
        roughness={0.35}
        side={THREE.DoubleSide}
        clippingPlanes={bidang}
      />
    </mesh>
  )
}

function Panggung({
  paru,
  kavitas,
  isolasi,
  bidang,
  terpilih,
  onPilih,
}: {
  paru: THREE.BufferGeometry | null
  kavitas: { entry: MeshEntry; geometri: THREE.BufferGeometry }[]
  isolasi: boolean
  bidang: THREE.Plane[]
  terpilih: number | null
  onPilih: (i: number) => void
}) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 5]} intensity={1.15} />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#7fd4e8" />
      {paru && !isolasi && <Paru geometri={paru} bidang={bidang} />}
      {kavitas.map(({ entry, geometri }, i) => (
        <Kavitas
          key={`${entry.posOffset}`}
          geometri={geometri}
          entry={entry}
          aktif={terpilih === i}
          bidang={bidang}
          onPilih={() => onPilih(i)}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={6} dampingFactor={0.12} />
    </>
  )
}

export default function LesionViewer3D({ metaUrl }: { metaUrl: string }) {
  const [meta, setMeta] = useState<MetaMesh | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [iSeri, setISeri] = useState(0)
  const [isolasi, setIsolasi] = useState(false)
  const [sumbu, setSumbu] = useState<Sumbu>('koronal')
  const [potong, setPotong] = useState(1.6)
  const [terpilih, setTerpilih] = useState<number | null>(null)
  const [didukung] = useState(webglDidukung)
  const [geometri, setGeometri] = useState<{
    kind: string
    paru: THREE.BufferGeometry | null
    kavitas: { entry: MeshEntry; geometri: THREE.BufferGeometry }[]
  } | null>(null)

  useEffect(() => {
    let batal = false
    setMeta(null)
    setGalat(null)
    fetch(metaUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json() as Promise<MetaMesh>
      })
      .then((m) => !batal && setMeta(m))
      .catch((e) => !batal && setGalat(String(e)))
    return () => {
      batal = true
    }
  }, [metaUrl])

  const seri = meta?.series[iSeri] ?? null

  useEffect(() => {
    if (!seri || !didukung) return
    let batal = false
    setTerpilih(null)
    fetch(seri.binUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.arrayBuffer()
      })
      .then((buf) => {
        if (batal) return
        const paruEntry = seri.meshes.find((m) => m.peran === 'paru') ?? null
        setGeometri({
          kind: seri.kind,
          paru: paruEntry ? bacaGeometri(buf, paruEntry) : null,
          kavitas: seri.meshes
            .filter((m) => m.peran === 'kavitas')
            .map((entry) => ({ entry, geometri: bacaGeometri(buf, entry) })),
        })
      })
      .catch((e) => !batal && setGalat(String(e)))
    return () => {
      batal = true
    }
  }, [seri, didukung])

  // Geometri lama dilepas begitu diganti: tiap seri ~16 ribu verteks, dan berpindah seri
  // bolak-balik tanpa `dispose()` menahan buffer GPU-nya sampai tab ditutup.
  const sebelumnya = useRef(geometri)
  useEffect(() => {
    const lama = sebelumnya.current
    if (lama && lama !== geometri) {
      lama.paru?.dispose()
      lama.kavitas.forEach((k) => k.geometri.dispose())
    }
    sebelumnya.current = geometri
  }, [geometri])

  const bidang = useMemo(() => [new THREE.Plane(NORMAL[sumbu].clone(), potong)], [sumbu, potong])
  const memotong = potong < 1.6
  const pseudo = seri?.kind === 'pseudo'
  const detail = terpilih != null ? geometri?.kavitas[terpilih]?.entry : undefined

  if (!didukung) {
    return (
      <div className="overflow-hidden rounded-xl">
        <div className="scan-canvas grid aspect-[16/11] w-full place-items-center rounded-xl px-8 text-center ring-1 ring-teal-900/10">
          <div>
            <IcWarn className="mx-auto h-6 w-6 text-amber-300" />
            <p className="mt-3 text-[13px] font-bold text-white/85">
              Peraga 3D tidak dapat ditampilkan di perangkat ini
            </p>
            <p className="mx-auto mt-2 max-w-md text-[11.5px] leading-relaxed text-white/60">
              Akselerasi grafis (WebGL) tidak tersedia — umum terjadi pada mesin virtual, sesi remote
              desktop, atau peramban dengan akselerasi perangkat keras dimatikan. Peraga irisan
              ortogonal dan seluruh panel lain di halaman ini tetap dapat digunakan.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (galat) {
    return (
      <div className="grid place-items-center rounded-xl bg-teal-50/70 px-6 py-10 text-center">
        <IcWarn className="h-6 w-6 text-amber-400" />
        <p className="mt-3 text-[13px] font-bold text-teal-800">Aset 3D gagal dimuat</p>
        <p className="mt-3 font-mono text-[10px] break-all text-teal-400">{galat}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {meta?.series.map((s, i) => (
          <button
            key={s.kind}
            onClick={() => setISeri(i)}
            className={[
              'rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition',
              i === iSeri
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-teal-50 text-teal-600 hover:bg-teal-100',
            ].join(' ')}
          >
            {s.kind === 'pseudo' ? 'Pseudo-CT (hasil rekonstruksi)' : 'CT asli (rujukan)'}
          </button>
        ))}
        <button
          onClick={() => setIsolasi((v) => !v)}
          className={[
            'rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition',
            isolasi ? 'bg-teal-500 text-white shadow-sm' : 'bg-teal-50 text-teal-600 hover:bg-teal-100',
          ].join(' ')}
        >
          {isolasi ? 'Tampilkan paru' : 'Isolasi lesi'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-[10.5px] font-bold tracking-wide text-teal-500 uppercase" htmlFor="sumbu">
            Potongan
          </label>
          <select
            id="sumbu"
            value={sumbu}
            onChange={(e) => setSumbu(e.target.value as Sumbu)}
            className="rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-[11.5px] font-semibold text-teal-700"
          >
            <option value="koronal">Koronal (depan–belakang)</option>
            <option value="aksial">Aksial (atas–bawah)</option>
            <option value="sagital">Sagital (kiri–kanan)</option>
          </select>
          <input
            aria-label="Kedalaman potongan"
            type="range"
            min={0}
            max={1.6}
            step={0.02}
            value={potong}
            onChange={(e) => setPotong(Number(e.target.value))}
            className="w-28 accent-teal-500"
          />
          {memotong && (
            <button
              onClick={() => setPotong(1.6)}
              className="text-[11px] font-semibold text-teal-500 underline-offset-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="scan-canvas relative aspect-[16/11] w-full overflow-hidden rounded-xl ring-1 ring-teal-900/10">
        <p className="pointer-events-none absolute top-3 left-3 z-10 text-[10px] font-medium tracking-wide text-white/45">
          Scroll: Zoom &nbsp;|&nbsp; Drag: Rotate &nbsp;|&nbsp; Klik kavitas untuk detail
        </p>
        <p className="pointer-events-none absolute top-3 right-3 z-10 text-[10px] font-medium tracking-wide text-white/45">
          Tampak depan · kiri pasien di kanan layar
        </p>

        {geometri ? (
          <Canvas
            camera={{ position: [0, 0.15, 3.2], fov: 42 }}
            onCreated={({ gl }) => {
              gl.localClippingEnabled = true
            }}
          >
            <Suspense fallback={null}>
              <Panggung
                paru={geometri.paru}
                kavitas={geometri.kavitas}
                isolasi={isolasi}
                bidang={bidang}
                terpilih={terpilih}
                onPilih={(i) => setTerpilih((v) => (v === i ? null : i))}
              />
            </Suspense>
          </Canvas>
        ) : (
          <div className="grid h-full place-items-center text-[12.5px] text-white/60">
            Memuat permukaan volume…
          </div>
        )}

        {geometri && geometri.kavitas.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 px-8 text-center text-[12.5px] text-white/70">
            Tidak ada kavitas yang lolos filter pada volume ini — permukaan paru tetap ditampilkan.
          </p>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-4 text-[10.5px] text-white/75">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> ≥ {LANTAI_RESOLUSI_MM} mm
            (di atas lantai resolusi)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f5b544]" /> &lt; {LANTAI_RESOLUSI_MM} mm
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#2f7f8c]/60" /> Lapangan paru
          </span>
        </div>
      </div>

      {detail && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-teal-50/80 px-3 py-2 text-[11.5px] text-teal-700">
          <span className="font-bold">
            Kavitas {(terpilih ?? 0) + 1} dari {geometri?.kavitas.length}
          </span>
          <span>
            Ø ekuivalen <strong className="font-semibold">{detail.diameterMm} mm</strong>
          </span>
          {/* Nama lobus cuma ditampilkan kalau memang datang dari model lobus. Zona geometrik
              TIDAK boleh dilabeli nama lobus — pembagiannya penggaris, bukan fisura. */}
          {detail.lobus ? (
            <span>
              Lobus <strong className="font-semibold">{detail.lobus}</strong>
              {detail.diLuarLobus && (
                <span className="ml-1 text-amber-600">(sebagian besar di luar lobus mana pun)</span>
              )}
            </span>
          ) : (
            <span>
              Paru <strong className="font-semibold">{detail.sisi}</strong> · zona{' '}
              <strong className="font-semibold">{detail.zona}</strong>{' '}
              <span className="text-teal-400">(geometrik, bukan lobus)</span>
            </span>
          )}
          <span className="text-teal-500">
            voxel (z,y,x) {detail.centroidZyx?.map((v) => Math.round(v)).join(', ')}
          </span>
        </div>
      )}

      {seri && (
        <p className="mt-2 text-[11px] leading-relaxed text-teal-500">
          Permukaan dibentuk dari mask segmentasi volume {seri.kind === 'pseudo' ? 'pseudo-CT' : 'CT asli'}{' '}
          pasien ini — {seri.nKavitas} kavitas.{' '}
          {seri.nDiterima !== seri.nKavitas && (
            <>
              ({seri.nDiterima - seri.nKavitas} kavitas terlalu kecil untuk dibentuk permukaannya.){' '}
            </>
          )}
          {pseudo ? (
            <strong className="font-semibold text-amber-600">
              Penanda pada seri pseudo-CT belum tervalidasi: kesepakatan kavitas terhadap CT asli
              terukur Dice 0,000 pada 26 pasien berpasangan — bentuk parunya selamat, letak
              kavitasnya tidak.{' '}
              {/* Kalimat pembanding cuma sah kalau serinya memang ada. Untuk CXR yang diunggah
                  pengguna tidak ada CT rujukan sama sekali, dan menyuruh "pindah seri" ke seri
                  yang tidak ada adalah cara cepat membuat penonton mengira ada yang rusak. */}
              {(meta?.series.length ?? 0) > 1
                ? 'Bandingkan dengan seri CT asli.'
                : 'Tidak ada CT rujukan untuk kasus ini, jadi tidak ada pembandingnya.'}
            </strong>
          ) : (
            <>
              Segmenter heuristik tanpa anotasi; ambang ukuran &amp; dinding belum tervalidasi
              terhadap anotasi ahli, jadi angka di sini bukan klaim akurasi. Struktur memanjang di
              garis tengah adalah <strong className="font-semibold">sisa saluran napas</strong> yang
              lolos filter, bukan kavitas.
            </>
          )}
        </p>
      )}
    </div>
  )
}
