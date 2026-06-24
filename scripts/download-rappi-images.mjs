import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'menuCatalog.generated.json')
const RAPPI_SEED_PATH = path.join(ROOT, 'src', 'data', 'menuSeed.rappi.json')
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', 'rappi')
const CONCURRENCY = 8

function sourceImageUrl(image) {
  if (image.startsWith('http')) {
    const url = new URL(image)
    url.search = ''
    return url.toString()
  }

  return `https://images.rappi.com.mx/products/${image}`
}

async function worker(queue, results) {
  while (queue.length) {
    const image = queue.shift()
    const outputPath = path.join(OUTPUT_DIR, image.fileName)

    try {
      await fs.access(outputPath)
      results.skipped += 1
      continue
    } catch {
      // The image is not cached locally yet.
    }

    const legacyPath = path.join(OUTPUT_DIR, image.legacyFileName)
    try {
      await fs.rename(legacyPath, outputPath)
      results.renamed += 1
      continue
    } catch {
      // The legacy filename is absent, so download a fresh copy.
    }

    try {
      const response = await fetch(image.sourceUrl)
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }

      await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()))
      results.downloaded += 1
    } catch (error) {
      results.failed.push({ imageUrl: image.sourceUrl, error: error.message })
    }
  }
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'))
  const rappiSeed = JSON.parse(await fs.readFile(RAPPI_SEED_PATH, 'utf8'))
  const sourceImageByProductId = new Map(
    rappiSeed.categories
      .flatMap((category) => category.items || [])
      .filter((item) => item.id && item.image)
      .map((item) => [String(item.id), item.image]),
  )
  const images = [
    ...new Map(
      catalog.categories
        .flatMap((category) => category.items || [])
        .filter((item) => item.image?.startsWith('/images/rappi/') && item.imageMatch?.rappiProductId)
        .flatMap((item) => {
          const sourceImage = sourceImageByProductId.get(String(item.imageMatch.rappiProductId))
          if (!sourceImage) {
            return []
          }

          const fileName = path.posix.basename(item.image)
          const legacyFileName = path.posix.basename(sourceImage)
          return [[fileName, { fileName, legacyFileName, sourceUrl: sourceImageUrl(sourceImage) }]]
        }),
    ).values(),
  ]

  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const queue = [...images]
  const results = { downloaded: 0, renamed: 0, skipped: 0, failed: [] }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue, results)))

  console.log(
    JSON.stringify(
      {
        requested: images.length,
        downloaded: results.downloaded,
        renamed: results.renamed,
        skipped: results.skipped,
        failed: results.failed,
      },
      null,
      2,
    ),
  )

  if (results.failed.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
