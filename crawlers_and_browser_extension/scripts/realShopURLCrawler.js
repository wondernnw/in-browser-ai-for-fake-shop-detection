import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'path'
import { updateLine } from './utils.js'

const dir = join(process.cwd(), '..', 'data')
mkdirSync(dir, { recursive: true })

const totalPagesToCrawlPerCategory = 200
const startFromPage = 0

async function crawl() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()

  const categoriesToCrawl = [
    'animals_pets',
    'beauty_wellbeing',
    'construction_manufactoring',
    'health_medical',
    'hobbies_crafts',
    'shopping_fashion',
    'sports',
    'vehicles_transportation',
  ]

  /** @type {Array<string>} */
  const realShopURLs = []

  try {
    const page = await context.newPage()

    for (let i = 0; i < categoriesToCrawl.length; i++) {
      const currentCategory = categoriesToCrawl[i]
      const categoryUrl = new URL(`https://www.trustpilot.com/categories/${currentCategory}`)

      let j = 0
      while (j++ < totalPagesToCrawlPerCategory) {
        categoryUrl.searchParams.set('page', String(j + startFromPage))
        await page.goto(categoryUrl.href, { waitUntil: 'domcontentloaded' })

        updateLine(
          `Progress: ${(
            ((j - 1 + i * totalPagesToCrawlPerCategory) /
              (categoriesToCrawl.length * totalPagesToCrawlPerCategory)) *
            100
          ).toFixed(2)} %`
        )

        const urlsOnPage = await page.$$eval(
          '[class*="styles_websiteUrlDisplayed"]',
          (paragraphs) => paragraphs.map((/** @type {HTMLParagraphElement} */ p) => p.innerText)
        )

        if (!urlsOnPage.length) {
          i++
          break
        }

        realShopURLs.push(...urlsOnPage)
      }
    }
  } finally {
    await browser.close()

    updateLine('Writing file...')

    const file = join(dir, 'real_shop_urls.json')

    try {
      const fileContent = await readFile(file, 'utf8')
      await writeFile(
        file,
        JSON.stringify(JSON.parse(fileContent).concat(realShopURLs), null, 2),
        'utf8'
      )
    } catch (_err) {
      await writeFile(file, JSON.stringify(realShopURLs, null, 2), 'utf8')
    }
  }
}

crawl().then(() => {
  updateLine('Done.')
  process.stdout.write('\u0007')
})
