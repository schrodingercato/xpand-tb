/** Landing Page — Gambar 3.1 proposal. */
import { Link } from 'react-router-dom'
import { BarisInstitusi, LogoITS, LogoXpandTB } from '../components/Brand'
import {
  IcArrow,
  IcCube,
  IcDoc,
  IcLayers,
  IcPulse,
  IcShield,
  IcUpload,
  IcWarn,
} from '../components/Icons'

const ALUR = [
  {
    Ikon: IcUpload,
    judul: 'Unggah satu citra PA',
    teks: 'Cukup satu foto rontgen dada posteroanterior. Tanpa foto lateral tambahan, tanpa paparan radiasi ekstra.',
  },
  {
    Ikon: IcLayers,
    judul: 'Adaptasi domain',
    teks: 'Normalisasi intensitas, CLAHE, dan histogram matching menjembatani beda distribusi citra lapangan dengan data latih.',
  },
  {
    Ikon: IcCube,
    judul: 'Rekonstruksi pseudo-CT',
    teks: 'Model difusi terpandu dua-tampilan (DVG-Diffusion) menyusun konteks tiga dimensi dari proyeksi tunggal.',
  },
  {
    Ikon: IcPulse,
    judul: 'Lokalisasi kavitas & lateral sintetis',
    teks: '3D nnU-Net menandai kavitas per lobus, lalu proyeksi lateral 90° disandingkan dengan PA asli untuk ditinjau klinisi.',
  },
]

const PERSONA = [
  {
    tag: 'Pengguna A',
    judul: 'Tenaga Klinis di Faskes Primer',
    teks: 'Produsen sekaligus validator hasil. Mendapat worklist triase, peraga 3D beserta overlay lokasi kavitas, panel proyeksi lateral, gerbang peninjauan, dan laporan yang dapat diekspor.',
    poin: ['Daftar kasus & status pemrosesan', 'Viewer 3D + validasi silang 2D', 'Setujui / revisi / tolak hasil'],
  },
  {
    tag: 'Pengguna B',
    judul: 'Pasien / Masyarakat Umum',
    teks: 'Konsumen read-only atas hasil miliknya sendiri yang sudah disetujui klinisi. Bahasa awam, indikator warna sederhana, dan pemantauan kondisi antar waktu.',
    poin: ['Hanya hasil yang telah disetujui', 'Tanpa jargon & angka teknis', 'Akses terbatas pada data sendiri'],
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f1f5f6]">
      <header className="sticky top-0 z-30 border-b border-teal-100/70 bg-[#f1f5f6]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <LogoXpandTB />
          <div className="ml-auto flex items-center gap-5">
            <a
              href="#alur"
              className="hidden text-[13px] font-semibold text-teal-600 hover:text-teal-800 sm:block"
            >
              Cara Kerja
            </a>
            <a
              href="#pengguna"
              className="hidden text-[13px] font-semibold text-teal-600 hover:text-teal-800 sm:block"
            >
              Pengguna
            </a>
            <Link
              to="/login"
              className="rounded-lg bg-teal-500 px-4 py-2 text-[12.5px] font-bold text-white shadow-sm transition hover:bg-teal-600"
            >
              Login Sistem
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-teal-700 uppercase">
              <IcShield className="h-3.5 w-3.5" /> Alat bantu keputusan non-diagnostik
            </span>
            <h1 className="mt-5 text-[40px] leading-[1.05] font-extrabold tracking-tight text-teal-900 sm:text-[52px]">
              Sistem
              <br />
              <span className="text-teal-500">Rekonstruksi 3D</span>
              <br />
              Tuberkulosis.
            </h1>
            <p className="mt-6 max-w-lg text-[14.5px] leading-relaxed text-teal-600">
              Sistem AI presisi yang memproses satu citra rontgen dada (CXR 2D) menjadi rekonstruksi
              volume paru 3D. Membantu tenaga medis melokalisasi kavitas tuberkulosis beserta
              posisinya pada sumbu depan–belakang — informasi yang hilang pada satu proyeksi PA.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-[13.5px] font-bold text-white shadow-sm transition hover:bg-teal-600"
              >
                Masuk ke Sistem <IcArrow className="h-4 w-4" />
              </Link>
              <a
                href="#alur"
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-5 py-3 text-[13.5px] font-bold text-teal-700 transition hover:border-teal-300"
              >
                <IcDoc className="h-4 w-4" /> Pelajari alurnya
              </a>
            </div>
            <BarisInstitusi className="mt-10" />
          </div>

          {/* Mockup jendela hasil */}
          <div className="rounded-2xl border border-teal-100 bg-white p-3 shadow-[0_24px_60px_-30px_rgba(16,60,72,0.45)]">
            <div className="flex items-center gap-1.5 px-2 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-3 text-[10px] font-bold tracking-[0.14em] text-teal-400 uppercase">
                Rontgen → 3D
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Pasangan masukan→keluaran yang sungguhan, dari pasien yang sama (5e947dc3):
                  kiri citra yang masuk ke model, kanan DRR 90° atas pseudo-CT hasilnya. Slot
                  kanan dulu diisi ilustrasi paru SVG bertitik — gambar yang tidak berasal dari
                  perhitungan apa pun, di halaman yang justru menjanjikan hasil. */}
              <figure className="rounded-xl bg-[#f6f9fa] p-3">
                <img
                  src="/demo/cxr-pa-5e947dc3.png"
                  alt="Citra rontgen dada proyeksi posteroanterior yang menjadi masukan model"
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <figcaption className="pt-3 text-center">
                  <p className="text-[12.5px] font-bold text-teal-800">Data Awal</p>
                  <p className="text-[10.5px] text-teal-500">1 foto rontgen PA</p>
                </figcaption>
              </figure>
              <figure className="rounded-xl bg-[#f0f8f6] p-3">
                <img
                  src="/demo/lateral-5e947dc3-pseudo.png"
                  alt="Proyeksi lateral sintetis hasil rekonstruksi pseudo-CT dari citra PA di sebelahnya"
                  className="aspect-square w-full rounded-lg bg-scan-900 object-cover"
                />
                <figcaption className="pt-3 text-center">
                  <p className="text-[12.5px] font-bold text-teal-800">Hasil Rekonstruksi</p>
                  <p className="text-[10.5px] text-teal-500">Lateral sintetis dari pseudo-CT</p>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Alur */}
        <section id="alur" className="border-y border-teal-100 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-[11px] font-bold tracking-[0.16em] text-teal-400 uppercase">
              Pipeline Xpand-TB
            </p>
            <h2 className="mt-2 max-w-2xl text-[28px] leading-tight font-extrabold tracking-tight text-teal-900">
              Dari satu proyeksi 2D menjadi konteks spasial yang bisa ditinjau.
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ALUR.map(({ Ikon, judul, teks }, i) => (
                <article
                  key={judul}
                  className="rounded-2xl border border-teal-100 bg-[#fbfdfd] p-5 transition hover:border-teal-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 text-teal-600">
                      <Ikon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-bold text-teal-200">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-[14px] font-bold text-teal-800">{judul}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-teal-600">{teks}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex items-start gap-3 rounded-xl bg-teal-50 px-5 py-4 text-[12.5px] leading-relaxed text-teal-700">
              <IcShield className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
              <p>
                Setiap keluaran melewati <strong className="font-bold">gerbang peninjauan klinisi</strong>{' '}
                (human-in-the-loop). Hasil mentah AI tidak pernah langsung terlihat oleh pasien — hanya
                hasil yang telah disetujui yang diterbitkan.
              </p>
            </div>
          </div>
        </section>

        {/* Persona */}
        <section id="pengguna" className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-[11px] font-bold tracking-[0.16em] text-teal-400 uppercase">
            Dua alur dalam satu sistem
          </p>
          <h2 className="mt-2 text-[28px] leading-tight font-extrabold tracking-tight text-teal-900">
            Dirancang berbeda untuk kebutuhan yang berbeda.
          </h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {PERSONA.map((p) => (
              <article key={p.tag} className="rounded-2xl border border-teal-100 bg-white p-7">
                <span className="text-[10.5px] font-bold tracking-[0.14em] text-teal-400 uppercase">
                  {p.tag}
                </span>
                <h3 className="mt-2 text-[19px] font-extrabold tracking-tight text-teal-900">
                  {p.judul}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-teal-600">{p.teks}</p>
                <ul className="mt-5 space-y-2">
                  {p.poin.map((poin) => (
                    <li key={poin} className="flex items-center gap-2.5 text-[12.5px] text-teal-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                      {poin}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Batasan */}
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-7">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-amber-900">
              <IcWarn className="h-5 w-5 text-amber-500" /> Batasan yang perlu diketahui
            </h2>
            <ul className="mt-4 grid gap-3 text-[12.5px] leading-relaxed text-amber-900/90 sm:grid-cols-2">
              <li>
                Xpand-TB <strong>bukan</strong> pengganti CT scan, radiolog, maupun perangkat CAD
                skrining, dan tidak menghasilkan diagnosis definitif.
              </li>
              <li>
                Masukan terbatas pada <strong>satu citra CXR PA</strong> per pemeriksaan; modalitas
                lain di luar cakupan.
              </li>
              <li>
                Keluaran berupa <strong>lokasi</strong> kavitas per lobus/sisi paru — sistem tidak
                mengukur volume kavitas dalam cm³.
              </li>
              <li>
                Dirancang untuk skenario <strong>faskes primer skala terbatas</strong>, bukan beban
                trafik program nasional.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-teal-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <LogoXpandTB />
            <p className="mt-4 max-w-sm text-[12.5px] leading-relaxed text-teal-600">
              Rekonstruksi pseudo-CT dari citra radiografi toraks tunggal berbasis model difusi untuk
              pendeteksian lokasi kavitas 3D dan sintesis proyeksi lateral.
            </p>
            <p className="mt-4 text-[11.5px] text-teal-500">
              Tim Deenpeleb — GEMASTIK XIX 2026, Divisi Pengembangan Perangkat Lunak.
            </p>
          </div>
          <div className="sm:text-right">
            <LogoITS className="h-14 sm:ml-auto" />
            <p className="mt-3 text-[11.5px] leading-relaxed text-teal-500">
              Institut Teknologi Sepuluh Nopember
              <br />
              Surabaya, Indonesia
            </p>
          </div>
        </div>
        <div className="relative mx-auto flex max-w-6xl items-center justify-between border-t border-teal-100 px-5 py-4">
          <p className="text-[11px] text-teal-400">
            Copyright 2026 Tim Deenpeleb — All Rights Reserved.
          </p>
          <button
            title="Pengaturan Mode Hybrid (Server ML Sungguhan)"
            onClick={() => {
              const saatIni = localStorage.getItem('XPANDTB_HYBRID_API') || ''
              const input = prompt(
                'Masukkan URL Backend ML Sungguhan (contoh: http://127.0.0.1:8000 atau Ngrok).\n\nKosongkan kotak ini untuk kembali ke mode Demo (Mock) tanpa server.',
                saatIni
              )
              if (input !== null) {
                let finalUrl = input.trim()
                if (finalUrl) {
                  if (finalUrl.endsWith('/')) finalUrl = finalUrl.slice(0, -1)
                  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                    finalUrl = 'https://' + finalUrl
                  }
                  localStorage.setItem('XPANDTB_HYBRID_API', finalUrl)
                } else {
                  localStorage.removeItem('XPANDTB_HYBRID_API')
                }
                window.location.reload()
              }
            }}
            className={`p-2 text-base transition ${
              localStorage.getItem('XPANDTB_HYBRID_API')
                ? 'opacity-100 grayscale-0 scale-110 drop-shadow-md'
                : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
            }`}
          >
            ⚙️
          </button>
        </div>
      </footer>
    </div>
  )
}
