#!/usr/bin/env node
// Branded table QR generator for Belly Monster Bites.
//
// Produces print-ready, scan-tested QR cards for table-side ("QR ordering")
// service. Each card encodes /ordenar?mesa=N in the QR data, carries the
// mascot in the center (error-correction H absorbs the overlay), and prints a
// large human-readable "MESA N" badge plus a Spanish call to action.
//
// Usage:
//   node scripts/generate-table-qr.mjs --mesa 3
//   node scripts/generate-table-qr.mjs --range 1-12
//   node scripts/generate-table-qr.mjs --range 1-12 --base https://bellymonsterbites.com/ordenar
//   node scripts/generate-table-qr.mjs --mesa 3 --no-png   (SVG only, no preview)
//
// Output: dist/qr/mesa-<n>.svg (vector master for print) and mesa-<n>.png (preview).

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// --- Brand tokens (from src/assets/styles/tokens.css + the mascot artwork) ---
const BRAND = {
  name: 'Belly Monster Bites',
  cardBg: '#FBF7F1', // warm cream, light enough for reliable scanning
  mint: '#C6DAD6', // --color-first
  mauve: '#AA7E85', // --color-third / primary
  espresso: '#43292A', // dark brown for QR modules — high contrast
  orange: '#D36C00', // mascot accent
  ink: '#5B3A38', // text
}

function parseArgs(argv) {
  const args = { base: 'https://bellymonsterbites.com/ordenar', png: true, tables: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--mesa') args.tables.push(Number(argv[++i]))
    else if (a === '--range') {
      const [from, to] = argv[++i].split('-').map(Number)
      for (let n = from; n <= to; n++) args.tables.push(n)
    } else if (a === '--base') args.base = argv[++i]
    else if (a === '--no-png') args.png = false
  }
  if (args.tables.length === 0) args.tables = [1] // sensible default
  return args
}

// Escape XML text content.
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

// Build the QR module grid as a single SVG <path> (one draw call, crisp at any size).
function qrPath(matrix, cell, offset) {
  const size = matrix.size
  let d = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix.get(c, r)) {
        const x = offset + c * cell
        const y = offset + r * cell
        d += `M${x} ${y}h${cell}v${cell}h${-cell}z`
      }
    }
  }
  return d
}

async function buildCard(table, base, mascotInner) {
  const url = `${base}?mesa=${table}`

  // Error-correction H so the centered mascot overlay never breaks the scan.
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const modules = qr.modules

  // Layout (px). Card is 600 wide; QR panel is a white square inside the cream card.
  const W = 600
  const PAD = 48
  const headerH = 132
  const qrPanel = W - PAD * 2 // 504
  const quiet = 24 // quiet zone inside the white panel
  const qrArea = qrPanel - quiet * 2
  const cell = qrArea / modules.size
  const qrTop = PAD + headerH
  const ctaH = 56
  const badgeH = 104
  const H = qrTop + qrPanel + ctaH + badgeH + PAD

  const qrOffsetX = PAD + quiet
  const qrOffsetY = qrTop + quiet
  const path = qrPath(modules, cell, 0)

  // Center logo plate: ~22% of the QR area, with a white backing so it reads clean.
  const logoSize = qrArea * 0.22
  const logoX = qrOffsetX + (qrArea - logoSize) / 2
  const logoY = qrOffsetY + (qrArea - logoSize) / 2
  const plate = logoSize * 1.28
  const plateX = qrOffsetX + (qrArea - plate) / 2
  const plateY = qrOffsetY + (qrArea - plate) / 2

  // Inline the mascot, scaled into the center plate (viewBox 0 0 350 583).
  const mascotScale = logoSize / 583
  const mascotW = 350 * mascotScale
  const mascotTx = logoX + (logoSize - mascotW) / 2

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Trebuchet MS', 'Segoe UI', system-ui, sans-serif">
  <rect width="${W}" height="${H}" rx="40" fill="${BRAND.cardBg}"/>
  <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="34" fill="none" stroke="${BRAND.mint}" stroke-width="6"/>

  <!-- header: mascot + wordmark -->
  <g transform="translate(${PAD},${PAD - 6}) scale(${110 / 583})">
    ${mascotInner}
  </g>
  <text x="${PAD + 84}" y="${PAD + 52}" font-size="40" font-weight="700" fill="${BRAND.mauve}">Belly Monster</text>
  <text x="${PAD + 84}" y="${PAD + 92}" font-size="36" font-weight="700" fill="${BRAND.orange}">Bites</text>

  <!-- QR panel -->
  <rect x="${PAD}" y="${qrTop}" width="${qrPanel}" height="${qrPanel}" rx="28" fill="#FFFFFF"/>
  <g transform="translate(${qrOffsetX},${qrOffsetY})">
    <path d="${path}" fill="${BRAND.espresso}"/>
  </g>

  <!-- center mascot plate -->
  <rect x="${plateX}" y="${plateY}" width="${plate}" height="${plate}" rx="${plate * 0.22}" fill="#FFFFFF"/>
  <g transform="translate(${mascotTx},${logoY}) scale(${mascotScale})">
    ${mascotInner}
  </g>

  <!-- call to action -->
  <text x="${W / 2}" y="${qrTop + qrPanel + 40}" text-anchor="middle" font-size="30" font-weight="700" fill="${BRAND.ink}">Escanéame para ordenar</text>

  <!-- table badge -->
  <rect x="${PAD}" y="${qrTop + qrPanel + ctaH}" width="${qrPanel}" height="${badgeH - 16}" rx="24" fill="${BRAND.mauve}"/>
  <text x="${W / 2}" y="${qrTop + qrPanel + ctaH + (badgeH - 16) / 2 + 18}" text-anchor="middle" font-size="54" font-weight="800" letter-spacing="3" fill="#FBF7F1">MESA ${esc(table)}</text>
</svg>`

  return { svg, url }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const outDir = resolve(ROOT, 'dist/qr')
  await mkdir(outDir, { recursive: true })

  // Pull the mascot's inner <g> so we can inline it without nested <svg> roots.
  const mascotRaw = await readFile(resolve(ROOT, 'src/assets/brand/mascot.svg'), 'utf8')
  const mascotInner = mascotRaw.match(/<g[\s\S]*<\/g>/)[0]

  for (const table of args.tables) {
    const { svg, url } = await buildCard(table, args.base, mascotInner)
    const svgPath = resolve(outDir, `mesa-${table}.svg`)
    await writeFile(svgPath, svg, 'utf8')

    let pngNote = ''
    if (args.png) {
      const pngPath = resolve(outDir, `mesa-${table}.png`)
      await sharp(Buffer.from(svg), { density: 300 }).png().toFile(pngPath)
      pngNote = ` + mesa-${table}.png`
    }
    console.log(`mesa ${table}: ${url}\n  -> dist/qr/mesa-${table}.svg${pngNote}`)
  }
  console.log(`\nDone. ${args.tables.length} card(s) in dist/qr/. Print the SVG (vector); scan-test before mass printing.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
