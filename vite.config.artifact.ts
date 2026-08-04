/**
 * Build khusus PRATINJAU berkas-tunggal (Artifact / kirim lewat chat).
 *
 * Bukan pengganti `npm run build` — `dist/` tetap build produksi yang normal. Config ini cuma
 * menyiapkan keluaran yang bisa dijahit jadi satu `.html` oleh `scripts/bundle_web_single_file.py`:
 *
 *   - `inlineDynamicImports` — chunk `LesionViewer3D` yang di-lazy-load tidak boleh jadi berkas
 *     terpisah; di berkas tunggal tidak ada yang melayani permintaannya.
 *   - `cssCodeSplit: false` — satu CSS supaya bisa ditempel dalam satu <style>.
 *   - `VITE_HASH_ROUTER` — rute pindah ke `#/...`, lihat `src/main.tsx`.
 *
 * Aset di `public/` TIDAK ikut ter-inline oleh Vite (dia menyalinnya apa adanya); skrip penjahit
 * yang menggantikan rujukan `/demo/...` jadi data URI.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  define: { 'import.meta.env.VITE_HASH_ROUTER': 'true' },
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
