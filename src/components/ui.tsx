import type { ReactNode } from 'react'
import type { StatusPeninjauan, StatusTugas } from '../data/types'
import { IcWarn } from './Icons'

export function Card({
  children,
  className = '',
  padding = 'p-5',
}: {
  children: ReactNode
  className?: string
  padding?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-teal-100/80 bg-white shadow-[0_1px_2px_rgba(16,40,50,0.04),0_8px_24px_-16px_rgba(16,40,50,0.25)] ${padding} ${className}`}
    >
      {children}
    </section>
  )
}

export function CardTitle({ icon, children, aksi }: { icon?: ReactNode; children: ReactNode; aksi?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-teal-800">
        {icon && <span className="text-teal-500">{icon}</span>}
        {children}
      </h2>
      {aksi}
    </header>
  )
}

type Nada = 'hijau' | 'kuning' | 'biru' | 'merah' | 'abu' | 'teal'

const NADA: Record<Nada, string> = {
  hijau: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  kuning: 'bg-amber-50 text-amber-700 ring-amber-200',
  biru: 'bg-sky-50 text-sky-700 ring-sky-200',
  merah: 'bg-rose-50 text-rose-700 ring-rose-200',
  abu: 'bg-slate-100 text-slate-600 ring-slate-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
}

export function Badge({
  nada = 'abu',
  children,
  className = '',
}: {
  nada?: Nada
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide uppercase ring-1 ring-inset ${NADA[nada]} ${className}`}
    >
      {children}
    </span>
  )
}

/** Label + warna status pipeline (Subbab 3.4.3) dan gerbang peninjauan (2.2.5). */
export function labelStatus(
  tugas: StatusTugas,
  peninjauan: StatusPeninjauan,
): { teks: string; nada: Nada } {
  if (tugas === 'gagal_kualitas') return { teks: 'Kualitas Citra Kurang', nada: 'merah' }
  if (tugas !== 'menunggu_peninjauan') {
    const map: Record<string, string> = {
      antre: 'Dalam Antrean',
      praproses: 'Pra-pemrosesan',
      rekonstruksi: 'Rekonstruksi (Difusi)',
      deteksi: 'Deteksi Kavitas',
      validasi2d: 'Validasi Silang 2D',
    }
    return { teks: map[tugas] ?? tugas, nada: 'biru' }
  }
  const map: Record<StatusPeninjauan, { teks: string; nada: Nada }> = {
    menunggu: { teks: 'Menunggu Peninjauan', nada: 'kuning' },
    disetujui: { teks: 'Disetujui', nada: 'hijau' },
    revisi: { teks: 'Perlu Revisi', nada: 'kuning' },
    ditolak: { teks: 'Ditolak', nada: 'merah' },
  }
  return map[peninjauan]
}

/**
 * KNF-01 — disclaimer non-diagnostik wajib tampil pada setiap hasil.
 */
export function PeringatanKlinis({ ringkas = false }: { ringkas?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-[12.5px] leading-relaxed text-amber-900">
      <IcWarn className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p>
        <strong className="font-bold">Peringatan Klinis:</strong>{' '}
        {ringkas ? (
          <>
            Hasil ini adalah alat bantu keputusan, <em>bukan diagnosis</em>. Keputusan klinis akhir
            berada di tangan dokter penanggung jawab.
          </>
        ) : (
          <>
            Hasil analisis ini disediakan oleh sistem berbantuan komputer (VoluTB) dan{' '}
            <em className="italic">bukan pengganti diagnosis profesional</em>. Rekonstruksi pseudo-CT
            bersifat generatif — estimasi yang koheren dengan proyeksi masukan, bukan pengukuran
            anatomi langsung. Keputusan klinis akhir tetap berada di tangan dokter penanggung jawab.
          </>
        )}
      </p>
    </div>
  )
}

/**
 * Caveat panjang yang tertutup secara bawaan.
 *
 * Batasan-batasan terukur proyek ini (Dice 0,000, skala fisik ditebak, saturasi lantai udara)
 * tidak boleh hilang dari antarmuka — tapi ditulis sebagai paragraf terbuka, semuanya sekaligus,
 * yang terjadi justru tidak ada yang membacanya dan panel hasilnya tenggelam. Jadi: satu baris
 * ringkas terlihat, uraiannya sejauh satu klik.
 *
 * Laporan yang dicetak tetap harus membawa batasannya, dan isi `<details>` yang tertutup tidak
 * ikut ter-render di kertas — karena itu ekspor PDF lewat `cetakHalaman()`, bukan `window.print()`
 * langsung.
 */
export function Catatan({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <details className="group mt-3 rounded-lg bg-teal-50/60 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold text-teal-600 marker:hidden hover:text-teal-800">
        <span className="transition-transform group-open:rotate-90">›</span>
        {judul}
      </summary>
      <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-teal-600">{children}</div>
    </details>
  )
}

export function Meter({ nilai, nada = 'teal' }: { nilai: number; nada?: 'teal' | 'kuning' | 'hijau' }) {
  const warna = { teal: 'bg-teal-500', kuning: 'bg-amber-500', hijau: 'bg-emerald-500' }[nada]
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-teal-100/70">
      <div className={`h-full rounded-full ${warna}`} style={{ width: `${Math.round(nilai * 100)}%` }} />
    </div>
  )
}

/** Cetak halaman dengan seluruh <Catatan> dibuka lebih dulu — lihat alasannya di `Catatan`. */
export function cetakHalaman() {
  const tertutup = Array.from(document.querySelectorAll<HTMLDetailsElement>('details:not([open])'))
  tertutup.forEach((d) => (d.open = true))
  window.print()
  tertutup.forEach((d) => (d.open = false))
}

export function Kosong({ judul, pesan, aksi }: { judul: string; pesan: string; aksi?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 px-6 py-14 text-center">
      <p className="text-[15px] font-bold text-teal-800">{judul}</p>
      <p className="mt-1.5 max-w-md text-[13px] text-teal-600">{pesan}</p>
      {aksi && <div className="mt-4">{aksi}</div>}
    </div>
  )
}
