/** Ikon garis (stroke) seragam 24×24 — dipakai lintas antarmuka klinisi & pasien. */
type P = { className?: string }

const base = 'h-5 w-5'
const S = ({ className = base, children }: P & { children: React.ReactNode }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const IcPulse = (p: P) => (
  <S {...p}>
    <path d="M3 12h3l2.5-7 4 14 2.5-7H21" />
  </S>
)
export const IcHome = (p: P) => (
  <S {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />
  </S>
)
export const IcList = (p: P) => (
  <S {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </S>
)
export const IcUpload = (p: P) => (
  <S {...p}>
    <path d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
  </S>
)
export const IcLogout = (p: P) => (
  <S {...p}>
    <path d="M15 17l5-5-5-5M20 12H9M12 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7" />
  </S>
)
export const IcCheck = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
  </S>
)
export const IcClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </S>
)
export const IcInfo = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </S>
)
export const IcWarn = (p: P) => (
  <S {...p}>
    <path d="M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 10v4M12 17.5h.01" />
  </S>
)
export const IcSearch = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </S>
)
export const IcCube = (p: P) => (
  <S {...p}>
    <path d="M12 3.2 20 7.5v9L12 20.8 4 16.5v-9z" />
    <path d="m4 7.5 8 4.3 8-4.3M12 11.8v9" />
  </S>
)
export const IcLayers = (p: P) => (
  <S {...p}>
    <path d="m12 3 8.5 4.5L12 12 3.5 7.5z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
  </S>
)
export const IcDoc = (p: P) => (
  <S {...p}>
    <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
    <path d="M14 3v4h4M9 13h6M9 17h4" />
  </S>
)
export const IcPill = (p: P) => (
  <S {...p}>
    <rect x="2.8" y="8.6" width="18.4" height="6.8" rx="3.4" transform="rotate(-45 12 12)" />
    <path d="m9.2 9.2 5.6 5.6" />
  </S>
)
export const IcCalendar = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </S>
)
export const IcLeaf = (p: P) => (
  <S {...p}>
    <path d="M20 4c0 8-4.5 13-12 13H5c0-8 5-13 12-13z" />
    <path d="M5 20c2.5-4.5 5.5-7 9.5-9" />
  </S>
)
export const IcLock = (p: P) => (
  <S {...p}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </S>
)
export const IcEye = (p: P) => (
  <S {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </S>
)
export const IcEyeOff = (p: P) => (
  <S {...p}>
    <path d="M4 4l16 16M9.5 9.6A2.8 2.8 0 0 0 12 14.8c.7 0 1.4-.3 1.9-.7" />
    <path d="M6.4 6.7C4 8.3 2.5 12 2.5 12S6 18.2 12 18.2c1.6 0 3-.4 4.2-1M9.8 6.1c.7-.2 1.4-.3 2.2-.3 6 0 9.5 6.2 9.5 6.2s-.8 1.4-2.2 2.9" />
  </S>
)
export const IcArrow = (p: P) => (
  <S {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </S>
)
export const IcRefresh = (p: P) => (
  <S {...p}>
    <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5M4 12.5a8 8 0 0 0 13.7 5.2L20 15.5" />
    <path d="M4 4.5v4h4M20 19.5v-4h-4" />
  </S>
)
export const IcClose = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
)
export const IcShield = (p: P) => (
  <S {...p}>
    <path d="M12 3.2 5 6v5.6c0 4.3 2.9 7.6 7 9.2 4.1-1.6 7-4.9 7-9.2V6z" />
    <path d="m9 12 2.2 2.2L15.4 10" />
  </S>
)
