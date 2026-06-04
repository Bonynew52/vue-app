import fs from 'node:fs/promises'
import path from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const ROOT = process.cwd()
const CATALOG_PATH = path.join(ROOT, 'convex', 'seed', 'menuCatalog.generated.json')

async function loadLocalEnv() {
  try {
    const text = await fs.readFile(path.join(ROOT, '.env.local'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue
      }
      const [key, ...parts] = trimmed.split('=')
      if (!process.env[key]) {
        process.env[key] = parts.join('=').replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // .env.local is optional; CI and Vercel can provide real env vars.
  }
}

await loadLocalEnv()

const convexUrl = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL
const importToken = process.env.MENU_IMPORT_TOKEN

if (!convexUrl) {
  console.error('Missing VITE_CONVEX_URL or CONVEX_URL.')
  process.exit(1)
}

if (!importToken) {
  console.error('Missing MENU_IMPORT_TOKEN. Set the same value in Convex env and your shell.')
  process.exit(1)
}

const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'))
const client = new ConvexHttpClient(convexUrl)
const result = await client.mutation(api.menuCatalog.replaceActive, {
  importToken,
  catalog,
})

console.log(JSON.stringify(result, null, 2))
