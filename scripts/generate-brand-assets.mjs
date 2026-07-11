import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')
const brandDir = path.join(root, 'brand')

const faviconSvg = await readFile(path.join(publicDir, 'favicon.svg'))
const ogSvg = await readFile(path.join(brandDir, 'og-image.svg'))

async function writePng(name, width, height, svg, options = {}) {
  const output = path.join(publicDir, name)
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(width, height, {
      fit: options.fit ?? 'contain',
      background: options.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(output)
}

await mkdir(publicDir, { recursive: true })

await writePng('favicon-16x16.png', 16, 16, faviconSvg)
await writePng('favicon-32x32.png', 32, 32, faviconSvg)
await writePng('apple-touch-icon.png', 180, 180, faviconSvg)
await writePng('android-chrome-192x192.png', 192, 192, faviconSvg)
await writePng('android-chrome-512x512.png', 512, 512, faviconSvg)
await writePng('mstile-150x150.png', 150, 150, faviconSvg)

await writePng('android-chrome-maskable-512x512.png', 512, 512, faviconSvg, {
  fit: 'contain',
  background: { r: 10, g: 10, b: 10, alpha: 1 },
})

await sharp(Buffer.from(ogSvg), { density: 144 })
  .resize(1200, 630, { fit: 'cover' })
  .png()
  .toFile(path.join(publicDir, 'og-image.png'))

const icon16 = await sharp(path.join(publicDir, 'favicon-16x16.png')).png().toBuffer()
const icon32 = await sharp(path.join(publicDir, 'favicon-32x32.png')).png().toBuffer()
const icon48 = await sharp(Buffer.from(faviconSvg), { density: 300 }).resize(48, 48).png().toBuffer()
const ico = await toIco([icon16, icon32, icon48])
await writeFile(path.join(publicDir, 'favicon.ico'), ico)

console.log('Generated favicon and Open Graph assets in public/')
