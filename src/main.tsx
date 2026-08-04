import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

/**
 * Build normal memakai `BrowserRouter` — URL-nya bersih dan peladen bisa menulis ulang rute.
 * Build berkas-tunggal untuk pratinjau (`vite.config.artifact.ts`) menyalakan
 * `VITE_HASH_ROUTER`: di sana tidak ada peladen yang bisa menulis ulang apa pun, jadi rute
 * harus hidup di fragmen `#/...` atau semua halaman selain root akan 404.
 */
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
