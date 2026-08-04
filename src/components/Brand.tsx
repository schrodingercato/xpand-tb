/**
 * Elemen identitas: lambang Xpand-TB dan logo institusi ITS.
 *
 * Logo ITS diambil dari aset resmi (Panduan Identitas Visual ITS,
 * https://www.its.ac.id/tentang/panduan-identitas-visual/):
 *   - `public/its-logo.png`        → logo penuh warna, tidak boleh diubah warnanya
 *   - `public/its-logo-white.svg`  → versi satu warna (putih) untuk latar gelap
 * Sesuai panduan: proporsi tidak diregangkan dan disediakan ruang bebas
 * (clear space) di sekeliling logo lewat padding pembungkusnya.
 */

export function LogoXpandTB({
  className = 'h-10'
}: {
  varian?: 'terang' | 'gelap'
  ringkas?: boolean
  className?: string
}) {
  return (
    <img
      src="/logo.png"
      alt="Logo Xpand-TB"
      className={`${className} w-auto object-contain drop-shadow-sm`}
    />
  )
}

/** Logo ITS penuh warna — dipakai pada latar terang. */
export function LogoITS({ className = 'h-10' }: { className?: string }) {
  return (
    <img
      src="/its-logo.png"
      alt="Logo Institut Teknologi Sepuluh Nopember"
      className={`${className} w-auto object-contain`}
    />
  )
}

/**
 * Baris co-branding institusi — dipakai di navbar, login, sidebar, dan kop
 * laporan. Logo dipakai utuh (tidak dipotong / diregangkan) dengan tinggi
 * minimal yang masih membuat teks lambang terbaca, sesuai panduan identitas.
 */
export function BarisInstitusi({
  varian = 'terang',
  arah = 'baris',
  className = '',
}: {
  varian?: 'terang' | 'gelap'
  arah?: 'baris' | 'tumpuk'
  className?: string
}) {
  const gelap = varian === 'gelap'
  const tumpuk = arah === 'tumpuk'

  const label = (
    <span
      className={[
        'text-[9px] leading-tight font-semibold tracking-[0.14em] uppercase',
        gelap ? 'text-white/55' : 'text-teal-600/70',
      ].join(' ')}
    >
      Dikembangkan di
    </span>
  )

  const logo = gelap ? (
    <img
      src="/its-logo-white.svg"
      alt="Logo Institut Teknologi Sepuluh Nopember"
      className={`${tumpuk ? 'h-14' : 'h-12'} w-auto`}
    />
  ) : (
    <LogoITS className={tumpuk ? 'h-14' : 'h-12'} />
  )

  if (tumpuk) {
    return (
      <div className={`flex flex-col items-start gap-2 ${className}`}>
        {label}
        {logo}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label}
      <span className={['h-9 w-px', gelap ? 'bg-white/20' : 'bg-teal-200'].join(' ')} aria-hidden="true" />
      {logo}
    </div>
  )
}
