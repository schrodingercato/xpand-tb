/**
 * Data contoh pra-komputasi untuk peragaan antarmuka (KNF-02: "tersedia contoh
 * terpra-komputasi untuk demonstrasi"). Semua nilai di sini adalah dummy dan
 * akan digantikan respons API (`api/`) saat backend tersedia.
 */
import type { Kasus, JejakAudit, KodeLobus, RingkasanPasien, TemuanLobus } from './types'

export const NAMA_LOBUS: Record<KodeLobus, string> = {
  RUL: 'Kanan Atas (RUL)',
  RML: 'Kanan Tengah (RML)',
  RLL: 'Kanan Bawah (RLL)',
  LUL: 'Kiri Atas (LUL)',
  LLL: 'Kiri Bawah (LLL)',
}

/** Titik jangkar tiap lobus pada ruang peraga 3D (x: kiri−/kanan+, y: atas+, z: anterior+). */
const JANGKAR: Record<KodeLobus, [number, number, number]> = {
  RUL: [-0.62, 0.62, 0.1],
  RML: [-0.6, -0.02, 0.34],
  RLL: [-0.56, -0.6, -0.16],
  LUL: [0.62, 0.62, 0.1],
  LLL: [0.58, -0.6, -0.16],
}

function lobus(
  kode: KodeLobus,
  opts: Partial<TemuanLobus> & Pick<TemuanLobus, 'terdeteksi'>,
): TemuanLobus {
  return {
    lobus: kode,
    nama: NAMA_LOBUS[kode],
    keyakinan: 0,
    zona: kode.includes('U') ? 'apeks' : kode.includes('M') ? 'tengah' : 'basal',
    kedalaman: 'tengah',
    jumlahFokus: 0,
    posisi: JANGKAR[kode],
    radius: 0.17,
    ...opts,
  }
}

export const KASUS: Kasus[] = [
  {
    idKasus: 'CS-2024-089',
    namaPasien: 'Budi Santoso',
    nikTersamar: '3201••••••••5678',
    timepoint: 'Bulan ke-2 (Fase Intensif)',
    waktu: '09:30',
    tanggal: '12 Okt 2024',
    statusTugas: 'menunggu_peninjauan',
    statusPeninjauan: 'disetujui',
    progres: 100,
    // PA = citra yang benar-benar masuk ke model (cache aligned pasien 5e947dc3); lateral =
    // DRR 90° dari pseudo-CT pasien yang sama, berkas `.npy` yang juga mengisi peraga irisan &
    // mesh di halaman ini. Keduanya sepasang dan keduanya sungguhan — sebelumnya lateral-nya
    // berkas placeholder. Dibuat ulang lewat `scripts/export_lateral_drr.py`.
    citraPA: '/demo/cxr-pa-5e947dc3.png',
    citraLateral: '/demo/lateral-5e947dc3-pseudo.png',
    citraRekonstruksi: '/demo/rekonstruksi-01.png',
    volumeMeta: '/demo/volume-5e947dc3.json',
    meshMeta: '/demo/mesh-5e947dc3.json',
    keyakinanKeseluruhan: 0.82,
    temuan: [
      lobus('RUL', {
        terdeteksi: true,
        keyakinan: 0.88,
        kedalaman: 'posterior',
        jumlahFokus: 2,
        radius: 0.22,
        posisi: [-0.6, 0.6, -0.2],
      }),
      lobus('RML', { terdeteksi: false }),
      lobus('RLL', { terdeteksi: true, keyakinan: 0.61, kedalaman: 'anterior', jumlahFokus: 1, radius: 0.13 }),
      lobus('LUL', { terdeteksi: true, keyakinan: 0.74, kedalaman: 'tengah', jumlahFokus: 1, radius: 0.16 }),
      lobus('LLL', { terdeteksi: false }),
    ],
    validasi2D: {
      temuan2D: ['Paru kanan — zona atas', 'Paru kiri — zona atas'],
      konsisten: true,
      catatan:
        'Jalur 2D menandai zona atas kedua paru; jalur 3D menandai RUL dan LUL. Posisi sisi & zona konsisten. Temuan RLL tidak terkonfirmasi jalur 2D — kemungkinan tertutup bayangan diafragma pada proyeksi PA.',
      marker: [
        { x: 22, y: 20, w: 20, h: 20 },
        { x: 60, y: 22, w: 15, h: 16 },
      ],
    },
    catatanKlinis:
      'Kavitas mengecil dibanding bulan ke-0. Lanjutkan pengobatan sesuai standar.',
    ditinjauOleh: 'Dr. Aisyah R. Nadjib',
    waktuPeninjauan: '12 Okt 2024, 10:05',
  },
  {
    idKasus: 'CS-2024-090',
    namaPasien: 'Siti Aminah',
    nikTersamar: '3578••••••••1122',
    timepoint: 'Bulan ke-0 (Baseline)',
    waktu: '10:15',
    tanggal: '12 Okt 2024',
    statusTugas: 'rekonstruksi',
    statusPeninjauan: 'menunggu',
    progres: 46,
    citraPA: '/demo/cxr-pa-02.png',
    citraLateral: null,
    citraRekonstruksi: null,
    volumeMeta: null,
    meshMeta: null,
    keyakinanKeseluruhan: 0,
    temuan: [],
    validasi2D: null,
    catatanKlinis: '',
    ditinjauOleh: null,
    waktuPeninjauan: null,
  },
  {
    idKasus: 'CS-2024-091',
    namaPasien: 'Agus Pratama',
    nikTersamar: '3509••••••••3344',
    timepoint: 'Bulan ke-6 (Akhir Pengobatan)',
    waktu: '11:00',
    tanggal: '12 Okt 2024',
    statusTugas: 'menunggu_peninjauan',
    statusPeninjauan: 'menunggu',
    progres: 100,
    citraPA: '/demo/cxr-pa-2a3764c0.png',
    citraLateral: '/demo/lateral-2a3764c0-pseudo.png',
    citraRekonstruksi: '/demo/rekonstruksi-03.png',
    volumeMeta: '/demo/volume-2a3764c0.json',
    meshMeta: '/demo/mesh-2a3764c0.json',
    keyakinanKeseluruhan: 0.57,
    temuan: [
      lobus('RUL', { terdeteksi: false }),
      lobus('RML', { terdeteksi: false }),
      lobus('RLL', { terdeteksi: false }),
      lobus('LUL', {
        terdeteksi: true,
        keyakinan: 0.57,
        kedalaman: 'anterior',
        jumlahFokus: 1,
        radius: 0.14,
        posisi: [0.66, 0.55, 0.3],
      }),
      lobus('LLL', { terdeteksi: false }),
    ],
    validasi2D: {
      temuan2D: ['Paru kiri — zona atas (keyakinan rendah)'],
      konsisten: true,
      catatan:
        'Kedua jalur menandai zona atas paru kiri, namun keyakinan model rendah (57%). Disarankan peninjauan manual lebih teliti sebelum keputusan diterbitkan.',
      marker: [{ x: 58, y: 24, w: 14, h: 15 }],
    },
    catatanKlinis: '',
    ditinjauOleh: null,
    waktuPeninjauan: null,
  },
  {
    idKasus: 'CS-2024-092',
    namaPasien: 'Rina Wulandari',
    nikTersamar: '3512••••••••7788',
    timepoint: 'Bulan ke-0 (Baseline)',
    waktu: '11:40',
    tanggal: '12 Okt 2024',
    statusTugas: 'gagal_kualitas',
    statusPeninjauan: 'menunggu',
    progres: 12,
    citraPA: '/demo/cxr-pa-02.png',
    citraLateral: null,
    citraRekonstruksi: null,
    volumeMeta: null,
    meshMeta: null,
    keyakinanKeseluruhan: 0,
    temuan: [],
    validasi2D: null,
    catatanKlinis: '',
    ditinjauOleh: null,
    waktuPeninjauan: null,
    alasanGagal:
      'Resolusi citra di bawah ambang minimum (terbaca 480×512 px) dan lapang paru terpotong pada sisi kiri. Mohon unggah ulang citra CXR PA dengan lapang paru utuh.',
  },
]

export const JEJAK_AUDIT: Record<string, JejakAudit[]> = {
  'CS-2024-089': [
    { waktu: '12 Okt 2024, 09:30', pengguna: 'Dr. Aisyah R. Nadjib', aksi: 'Mengunggah citra CXR PA + informed consent tercatat' },
    { waktu: '12 Okt 2024, 09:31', pengguna: 'Sistem', aksi: 'Pra-pemrosesan & adaptasi domain (CLAHE, histogram matching)' },
    { waktu: '12 Okt 2024, 09:52', pengguna: 'Sistem', aksi: 'Rekonstruksi pseudo-CT (DVG-Diffusion) selesai' },
    { waktu: '12 Okt 2024, 09:58', pengguna: 'Sistem', aksi: 'Deteksi kavitas (3D nnU-Net) & sintesis proyeksi lateral selesai' },
    { waktu: '12 Okt 2024, 10:00', pengguna: 'Sistem', aksi: 'Validasi silang 2D (U-Net) selesai — status: menunggu peninjauan' },
    { waktu: '12 Okt 2024, 10:05', pengguna: 'Dr. Aisyah R. Nadjib', aksi: 'Menyetujui hasil — diterbitkan ke riwayat pasien' },
  ],
}

export const RIWAYAT_PASIEN: RingkasanPasien[] = [
  {
    idKasus: 'CS-2024-089',
    tanggal: '12 Okt 2024',
    timepoint: 'Pemeriksaan bulan ke-2',
    indikator: 'membaik',
    judul: 'Tampak Membaik!',
    pesan:
      'Kondisi paru-paru Anda menunjukkan perkembangan yang positif. Tetap jalankan pola hidup sehat dan rutin minum obat sesuai anjuran medis.',
    areaPantau: [
      { sisi: 'kanan', zona: 'apeks' },
      { sisi: 'kiri', zona: 'apeks' },
    ],
    anjuran: [
      {
        judul: 'Rutin Minum Obat (OAT)',
        detail: 'Sangat penting untuk tidak melewatkan jadwal minum obat agar bakteri tidak menjadi kebal.',
        ikon: 'obat',
      },
      {
        judul: 'Jadwal Kontrol Poli Paru',
        detail: 'Senin, 12 Desember 2024 (Bulan ke-4).',
        ikon: 'jadwal',
      },
      {
        judul: 'Jaga Sirkulasi Udara & Gizi',
        detail: 'Buka jendela di siang hari dan penuhi asupan protein untuk membantu pemulihan.',
        ikon: 'gaya-hidup',
      },
    ],
  },
  {
    idKasus: 'CS-2024-061',
    tanggal: '10 Agu 2024',
    timepoint: 'Pemeriksaan bulan ke-0',
    indikator: 'perlu_perhatian',
    judul: 'Perlu Perhatian',
    pesan:
      'Pemeriksaan awal menemukan area yang perlu dipantau pada paru-paru Anda. Dokter telah menyusun rencana pengobatan untuk Anda.',
    areaPantau: [
      { sisi: 'kanan', zona: 'apeks' },
      { sisi: 'kiri', zona: 'apeks' },
      { sisi: 'kanan', zona: 'basal' },
    ],
    anjuran: [
      {
        judul: 'Mulai Pengobatan (Fase Intensif)',
        detail: 'Minum obat setiap hari selama 2 bulan pertama sesuai resep dokter.',
        ikon: 'obat',
      },
      {
        judul: 'Kontrol Ulang',
        detail: 'Sabtu, 12 Oktober 2024 (Bulan ke-2).',
        ikon: 'jadwal',
      },
    ],
  },
]

export function cariKasus(id: string | undefined): Kasus | undefined {
  return KASUS.find((k) => k.idKasus === id)
}
