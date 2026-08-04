import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Layanan inferensi jalan terpisah (butuh GPU & model residen). Diproksi, bukan dipanggil
    // lintas-origin, supaya kode klien memakai path relatif `/api/...` yang sama persis di dev
    // maupun saat build produksi disajikan langsung oleh FastAPI (`api/app.py` me-mount web/dist).
    proxy: {
      '/api': {
        target: process.env.XPANDTB_API ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
