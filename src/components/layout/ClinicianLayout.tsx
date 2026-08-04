/** Kerangka antarmuka klinisi — sidebar teal + kop + footer (Gambar 3.4–3.6). */
import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { BarisInstitusi, LogoXpandTB } from '../Brand'
import { IcHome, IcList, IcLogout, IcShield, IcUpload } from '../Icons'

const MENU = [
  { grup: 'Dashboard', item: [{ ke: '/klinisi', teks: 'Workbench', Ikon: IcHome, tepat: true }] },
  {
    grup: 'Manajemen Kasus',
    item: [
      { ke: '/klinisi/kasus', teks: 'Daftar Kasus', Ikon: IcList, tepat: false },
      { ke: '/klinisi/unggah', teks: 'Unggah Citra', Ikon: IcUpload, tepat: false },
      { ke: '/klinisi/pasien', teks: 'Akun Pasien', Ikon: IcShield, tepat: false },
    ],
  },
]

export default function ClinicianLayout({
  judul,
  children,
  aksi,
}: {
  judul: string
  children: ReactNode
  aksi?: ReactNode
}) {
  const { sesi, keluar } = useAuth()
  const navigate = useNavigate()
  const [bukaMenu, setBukaMenu] = useState(false)

  async function logout() {
    await keluar()
    navigate('/')
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-teal-500 text-white">
      <div className="flex items-center justify-between px-5 pt-6 pb-7">
        <LogoXpandTB varian="gelap" />
        <IcShield className="h-4 w-4 text-white/50" />
      </div>

      <nav className="flex-1 space-y-6 px-3">
        {MENU.map((grup) => (
          <div key={grup.grup}>
            <p className="px-2 pb-2 text-[9.5px] font-bold tracking-[0.16em] text-white/50 uppercase">
              {grup.grup}
            </p>
            <ul className="space-y-1">
              {grup.item.map(({ ke, teks, Ikon, tepat }) => (
                <li key={ke}>
                  <NavLink
                    to={ke}
                    end={tepat}
                    onClick={() => setBukaMenu(false)}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition',
                        isActive
                          ? 'bg-white text-teal-700 shadow-sm'
                          : 'text-white/85 hover:bg-white/10 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Ikon className="h-[18px] w-[18px]" />
                    {teks}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-4 px-3 pb-5">
        <BarisInstitusi varian="gelap" arah="tumpuk" className="px-2" />
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <IcLogout className="h-[18px] w-[18px]" />
          Log Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 lg:block">{sidebar}</aside>

      {bukaMenu && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Tutup menu"
            className="absolute inset-0 bg-teal-900/50"
            onClick={() => setBukaMenu(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-teal-100 bg-[#f8f9fb]/90 px-5 py-4 backdrop-blur lg:px-8">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-teal-200 text-teal-600 lg:hidden"
            onClick={() => setBukaMenu(true)}
            aria-label="Buka menu"
          >
            <IcList className="h-5 w-5" />
          </button>
          <h1 className="truncate text-[15px] font-bold text-teal-800">{judul}</h1>
          <div className="ml-auto flex items-center gap-3">
            {aksi}
            <div className="hidden text-right sm:block">
              <p className="text-[12.5px] leading-tight font-bold text-teal-800">{sesi?.nama}</p>
              <p className="text-[10.5px] leading-tight text-teal-400">{sesi?.subjudul}</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-[12px] font-bold text-teal-600">
              {sesi?.inisial}
            </span>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>

        <footer className="no-print flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-teal-100 px-5 py-4 text-[11px] text-teal-500 lg:px-8">
          <a href="#" className="hover:text-teal-700">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-teal-700">
            Terms of Use
          </a>
          <span className="ml-auto">
            Copyright 2026 <strong className="font-bold text-teal-700">Tim Deenpeleb</strong> — All
            Rights Reserved.
          </span>
        </footer>
      </div>
    </div>
  )
}
