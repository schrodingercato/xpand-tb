/**
 * Dashboard Pasien — Gambar 3.3 proposal.
 *
 * Read-only atas hasil MILIK SENDIRI yang telah disetujui klinisi (KF-14/15,
 * UC-14/15). Bahasa awam, tanpa angka teknis, tanpa jargon; pasien tidak dapat
 * mengunggah citra maupun memicu analisis.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BarisInstitusi, LogoVoluTB } from '../components/Brand'
import { Card, CardTitle } from '../components/ui'
import {
  IcCalendar,
  IcCheck,
  IcDoc,
  IcLeaf,
  IcLogout,
  IcPill,
  IcPulse,
  IcShield,
} from '../components/Icons'
import { hasilSaya, type HasilPasien } from '../data/api'
import { RIWAYAT_PASIEN } from '../data/mock'
import type { RingkasanPasien } from '../data/types'

const IKON = { obat: IcPill, jadwal: IcCalendar, 'gaya-hidup': IcLeaf } as const

/** Nama zona dalam bahasa awam — pasien tidak perlu istilah apeks/basal. */
const ZONA_AWAM = { apeks: 'atas', tengah: 'tengah', basal: 'bawah' } as const

const INDIKATOR: Record<
  RingkasanPasien['indikator'],
  { latar: string; label: string; titik: string }
> = {
  membaik: {
    latar: 'from-mint-400 to-mint-600',
    label: 'Kondisi membaik',
    titik: 'bg-mint-500',
  },
  stabil: { latar: 'from-sky-400 to-sky-600', label: 'Kondisi stabil', titik: 'bg-sky-500' },
  perlu_perhatian: {
    latar: 'from-amber-400 to-amber-600',
    label: 'Perlu perhatian',
    titik: 'bg-amber-500',
  },
}

/**
 * Hasil sungguhan milik pasien ini — hanya yang sudah disetujui klinisi.
 *
 * Tampilan ini sengaja lebih sedikit dari panel contoh di bawahnya: "Tampak Membaik!" dan daftar
 * anjuran medis di `mock.ts` adalah kalimat yang tidak dihasilkan sistem mana pun. Yang benar-benar
 * ada untuk kasus sungguhan cuma tanggal, area yang ditandai segmentasi, dan catatan yang
 * ditulis dokternya sendiri — jadi itu yang ditampilkan, tidak lebih.
 */
function HasilNyata({ hasil }: { hasil: HasilPasien[] }) {
  const [dipilih, setDipilih] = useState(0)
  const h = hasil[dipilih]
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 p-7 text-white">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-[10.5px] font-bold tracking-wide uppercase">
          <IcPulse className="h-3.5 w-3.5" /> Hasil Pemeriksaan Anda
        </span>
        <h1 className="mt-4 text-[26px] leading-tight font-extrabold tracking-tight">
          Sudah ditinjau dokter
        </h1>
        <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-white/90">
          {h.catatanKlinis || 'Dokter belum menuliskan catatan untuk pemeriksaan ini.'}
        </p>
        <p className="mt-4 text-[11.5px] text-white/80">
          {new Date(h.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })}
          {h.ditinjauOleh ? ` · ditinjau ${h.ditinjauOleh}` : ''}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardTitle>Area Pemantauan</CardTitle>
          {h.areaPantau.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-teal-500">
              Tidak ada area yang ditandai pada pemeriksaan ini.
            </p>
          ) : (
            <ul className="space-y-2">
              {h.areaPantau.map((a) => (
                <li
                  key={`${a.sisi}-${a.zona}`}
                  className="flex items-center gap-3 rounded-xl border border-teal-50 bg-teal-50/40 px-4 py-3 text-[13px] font-semibold text-teal-800"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                  Paru {a.sisi} — bagian {ZONA_AWAM[a.zona as keyof typeof ZONA_AWAM] ?? a.zona}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon={<IcCalendar className="h-4.5 w-4.5" />}>Riwayat Pemeriksaan</CardTitle>
          <ol className="space-y-2">
            {hasil.map((r, i) => (
              <li key={r.idKasus}>
                <button
                  onClick={() => setDipilih(i)}
                  className={[
                    'flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition',
                    i === dipilih
                      ? 'border-teal-200 bg-teal-50/60'
                      : 'border-teal-50 hover:border-teal-200 hover:bg-teal-50/40',
                  ].join(' ')}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                  <span className="min-w-0 flex-1 text-[13px] font-bold text-teal-800">
                    {new Date(r.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                  {i === dipilih && (
                    <span className="shrink-0 text-[11px] font-bold text-teal-500">Sedang dilihat</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  )
}

/**
 * Peragaan tampilan untuk akun yang belum punya hasil disetujui.
 *
 * Isinya `mock.ts` — judul optimistis, anjuran medis, indikator "membaik" — yang tidak satu pun
 * dihasilkan sistem. Ia tetap ada karena tampilan kosong tidak menjelaskan apa yang nanti muncul,
 * tapi ia diberi bingkai contoh dan tidak pernah tampil berdampingan dengan hasil sungguhan:
 * begitu ada satu hasil disetujui, panel ini hilang sama sekali.
 */
function HasilContoh() {
  const [dipilih, setDipilih] = useState(0)
  const hasil = RIWAYAT_PASIEN[dipilih]
  const gaya = INDIKATOR[hasil.indikator]
  return (
    <>
      <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 px-5 py-4">
        <p className="text-[13px] font-bold text-teal-800">Belum ada hasil untuk Anda</p>
        <p className="mt-1 text-[12px] leading-relaxed text-teal-600">
          Hasil baru muncul setelah dokter meninjau dan menyetujuinya. Di bawah ini{' '}
          <strong className="font-bold">contoh tampilan</strong> — bukan data Anda.
        </p>
      </div>

      <div className="space-y-4 opacity-75">
        <section
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gaya.latar} p-7 text-white`}
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-lg">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-[10.5px] font-bold tracking-wide uppercase">
                <IcPulse className="h-3.5 w-3.5" /> Contoh ringkasan
              </span>
              <h2 className="mt-4 text-[28px] leading-tight font-extrabold tracking-tight">
                {hasil.judul}
              </h2>
              <p className="mt-2.5 text-[13px] leading-relaxed text-white/90">{hasil.pesan}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-5 py-4 text-center ring-1 ring-white/25">
              <p className="text-[9.5px] font-bold tracking-[0.14em] text-white/80 uppercase">
                Evaluasi Terakhir
              </p>
              <p className="mt-1.5 text-[19px] font-extrabold">{hasil.tanggal}</p>
              <p className="mt-0.5 text-[11px] text-white/80">{hasil.timepoint}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          {/*
            Dulu di sini ada peta paru SVG dengan titik oranye per zona. Dihapus: gambarnya bukan
            paru pasien mana pun, dan menaruh titik "area yang dipantau" di atasnya membuat pasien
            membaca posisi yang tidak pernah dihitung untuk dirinya. Yang tersisa adalah daftar
            area dalam kata-kata — sama informatifnya, tanpa memberi kesan peta.
          */}
          <Card>
            <CardTitle>Area Pemantauan</CardTitle>
            <ul className="space-y-2">
              {hasil.areaPantau.map((a) => (
                <li
                  key={`${a.sisi}-${a.zona}`}
                  className="flex items-center gap-3 rounded-xl border border-teal-50 bg-teal-50/40 px-4 py-3 text-[13px] font-semibold text-teal-800"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                  Paru {a.sisi} — bagian {ZONA_AWAM[a.zona]}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle>Anjuran Medis</CardTitle>
            <ul className="space-y-3">
              {hasil.anjuran.map((a) => {
                const Ikon = IKON[a.ikon]
                return (
                  <li
                    key={a.judul}
                    className="flex gap-3.5 rounded-xl border border-teal-50 bg-teal-50/40 px-4 py-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-teal-500 ring-1 ring-teal-100">
                      <Ikon className="h-[18px] w-[18px]" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-bold text-teal-800">{a.judul}</span>
                      <span className="mt-1 block text-[11.5px] leading-relaxed text-teal-600">
                        {a.detail}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <Card>
          <CardTitle icon={<IcCalendar className="h-4.5 w-4.5" />}>Riwayat Pemeriksaan</CardTitle>
          <ol className="space-y-2">
            {RIWAYAT_PASIEN.map((r, i) => {
              const g = INDIKATOR[r.indikator]
              return (
                <li key={r.idKasus}>
                  <button
                    onClick={() => setDipilih(i)}
                    className={[
                      'flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition',
                      i === dipilih
                        ? 'border-teal-200 bg-teal-50/60'
                        : 'border-teal-50 hover:border-teal-200 hover:bg-teal-50/40',
                    ].join(' ')}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${g.titik}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-teal-800">{r.timepoint}</span>
                      <span className="mt-0.5 block text-[11.5px] text-teal-500">
                        {r.tanggal} · {g.label}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>
    </>
  )
}

export default function PatientDashboard() {
  const { sesi, keluar } = useAuth()
  const navigate = useNavigate()
  const [nyata, setNyata] = useState<HasilPasien[] | null>(null)

  useEffect(() => {
    hasilSaya()
      .then(setNyata)
      .catch(() => setNyata([]))
  }, [])

  async function logout() {
    await keluar()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar terang — kebutuhan pasien jauh lebih sederhana daripada klinisi */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-teal-100 bg-white px-4 py-6 lg:flex">
        <div className="px-2">
          <LogoVoluTB />
        </div>
        <p className="mt-8 px-2 text-[9.5px] font-bold tracking-[0.16em] text-teal-400 uppercase">
          Rekam Medis
        </p>
        <nav className="mt-2 flex-1">
          <span className="flex items-center gap-2.5 rounded-lg border-l-[3px] border-mint-500 bg-mint-500/10 px-3 py-2.5 text-[13px] font-bold text-teal-800">
            <IcDoc className="h-[18px] w-[18px] text-mint-600" />
            Hasil Evaluasi
          </span>
        </nav>
        <BarisInstitusi arah="tumpuk" className="mb-4 px-2" />
        <button
          onClick={logout}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-teal-500 transition hover:bg-teal-50 hover:text-teal-700"
        >
          <IcLogout className="h-[18px] w-[18px]" /> Keluar
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[#f8f9fb]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-teal-100 bg-[#f8f9fb]/90 px-5 py-4 backdrop-blur lg:px-8">
          <span className="text-[12px] font-semibold text-teal-500">Status Akun:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-500/10 px-2.5 py-1 text-[11px] font-bold text-mint-600">
            <IcCheck className="h-3.5 w-3.5" /> Terverifikasi
          </span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[12.5px] leading-tight font-bold text-teal-800">{sesi?.nama}</p>
              <p className="text-[10.5px] leading-tight text-teal-400">{sesi?.subjudul}</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-[12px] font-bold text-teal-600">
              {sesi?.inisial}
            </span>
          </div>
        </header>

        <main className="flex-1 space-y-4 px-5 py-6 lg:px-8">
          <Card padding="p-4" className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-[13px] font-bold text-teal-800">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-500 text-[12px] font-extrabold text-white">
                V
              </span>
              VoluTB Portal
            </span>
            <span className="ml-auto text-[12.5px] text-teal-600">
              Halo, <strong className="font-bold text-teal-800">{sesi?.nama}</strong>
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-teal-500 hover:text-teal-700"
            >
              <IcLogout className="h-4 w-4" /> Keluar
            </button>
          </Card>

          {nyata === null ? (
            <p className="px-1 py-6 text-[12.5px] text-teal-500">Memuat hasil Anda…</p>
          ) : nyata.length > 0 ? (
            <HasilNyata hasil={nyata} />
          ) : (
            <HasilContoh />
          )}

          <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-teal-500">
            <IcShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
            Anda hanya melihat hasil pemeriksaan milik Anda sendiri yang sudah ditinjau dan
            disetujui oleh dokter. Hasil yang belum ditinjau tidak ditampilkan.
          </p>

          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 px-5 py-4 text-[12px] leading-relaxed text-amber-900">
            <strong className="font-bold">Catatan penting:</strong> ringkasan ini adalah alat bantu
            pemantauan, bukan diagnosis. Untuk penjelasan lengkap mengenai kondisi Anda, silakan
            berkonsultasi langsung dengan dokter yang menangani.
          </div>
        </main>

        <footer className="border-t border-teal-100 px-5 py-4 text-[11px] text-teal-400 lg:px-8">
          Copyright 2026 Tim Deenpeleb — Institut Teknologi Sepuluh Nopember.
        </footer>
      </div>
    </div>
  )
}
