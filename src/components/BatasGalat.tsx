/**
 * Batas galat (error boundary) — menahan kegagalan render satu komponen agar
 * tidak menjatuhkan seluruh halaman.
 *
 * Dipakai terutama di sekitar peraga 3D: `<Canvas>` melempar bila konteks WebGL
 * tidak bisa dibuat (mesin virtual, sesi remote desktop, driver GPU bermasalah).
 * `<Suspense>` tidak menangkap galat — hanya penundaan — jadi tanpa batas ini
 * React akan meng-unmount seluruh pohon dan menyisakan halaman kosong.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Tampilan pengganti; menerima pesan galat agar bisa ditampilkan bila perlu. */
  cadangan: (pesan: string) => ReactNode
}

interface State {
  pesan: string | null
}

export default class BatasGalat extends Component<Props, State> {
  state: State = { pesan: null }

  static getDerivedStateFromError(galat: unknown): State {
    return { pesan: galat instanceof Error ? galat.message : String(galat) }
  }

  componentDidCatch(galat: Error, info: ErrorInfo) {
    console.error('[Xpand-TB] komponen gagal dirender:', galat, info.componentStack)
  }

  render() {
    if (this.state.pesan !== null) return this.props.cadangan(this.state.pesan)
    return this.props.children
  }
}
