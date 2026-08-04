/**
 * Skrip bantu pengembangan: tangkap tangkapan layar tiap halaman lewat CDP.
 * Jalankan Chrome lebih dulu:
 *   google-chrome-stable --headless --no-sandbox --remote-debugging-port=9222 \
 *     --enable-unsafe-swiftshader --user-data-dir=/tmp/cprof about:blank
 * lalu: npm run preview & node shot.mjs
 */
import CDP from 'chrome-remote-interface'
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = process.env.SHOT_OUT ?? './shots'
const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173'
const W = 1440
mkdirSync(OUT, { recursive: true })

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms))
const galat = []

const { webSocketDebuggerUrl } = await CDP.Version({ host: '127.0.0.1', port: 9222 })
const target = await CDP.New({ host: '127.0.0.1', port: 9222, url: 'about:blank' })
const c = await CDP({ target })
const { Page, Runtime, Emulation, Network, Log } = c

await Promise.all([Page.enable(), Runtime.enable(), Network.enable(), Log.enable()])
Log.entryAdded(({ entry }) => entry.level === 'error' && galat.push(entry.text))
Runtime.exceptionThrown(({ exceptionDetails }) =>
  galat.push('EXCEPTION: ' + (exceptionDetails.exception?.description ?? exceptionDetails.text)),
)

async function buka(path, tungguMs = 900) {
  await Emulation.setDeviceMetricsOverride({ width: W, height: 950, deviceScaleFactor: 1, mobile: false })
  await Page.navigate({ url: BASE + path })
  await Page.loadEventFired()
  await tunggu(tungguMs)
}

async function sesi(peran) {
  const nilai =
    peran === 'klinisi'
      ? { peran: 'klinisi', nama: 'Dr. Aisyah R. Nadjib', pengenal: '12345', subjudul: 'Pulmonologi', inisial: 'AN' }
      : { peran: 'pasien', nama: 'Budi Santoso', pengenal: '3201••••••••5678', subjudul: 'Pasien Terdaftar', inisial: 'BS' }
  await Runtime.evaluate({
    expression: `sessionStorage.setItem('volutb.sesi', ${JSON.stringify(JSON.stringify(nilai))})`,
  })
}

async function jepret(nama, penuh = true) {
  if (penuh) {
    const { result } = await Runtime.evaluate({
      expression: 'Math.min(document.documentElement.scrollHeight, 6000)',
    })
    await Emulation.setDeviceMetricsOverride({
      width: W,
      height: result.value,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await tunggu(500)
  }
  const { data } = await Page.captureScreenshot({ format: 'png' })
  writeFileSync(`${OUT}/${nama}.png`, Buffer.from(data, 'base64'))
  console.log('✓', nama)
}

console.log('terhubung ke', webSocketDebuggerUrl.slice(0, 40) + '…')

await buka('/')
await jepret('01-landing')

await buka('/login')
await jepret('02-login', false)

await buka('/aktivasi')
await jepret('03-aktivasi', false)

await buka('/')
await sesi('klinisi')
await buka('/klinisi/kasus')
await jepret('04-worklist')

await buka('/klinisi/kasus/CS-2024-089', 3500)
await jepret('05-workbench')

await buka('/klinisi/unggah')
await jepret('06-unggah')

await buka('/')
await sesi('pasien')
await buka('/pasien')
await jepret('07-pasien')

console.log(galat.length ? 'GALAT KONSOL:\n' + galat.join('\n') : 'tidak ada galat konsol')
await c.close()
await CDP.Close({ host: '127.0.0.1', port: 9222, id: target.id })
