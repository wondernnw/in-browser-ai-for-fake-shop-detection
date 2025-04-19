import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'path'
import { updateLine } from './utils.js'

const dir = join(process.cwd(), '..', 'data')
mkdirSync(dir, { recursive: true })

async function crawl() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()

  const watchlistUrl = new URL(
    'https://www.watchlist-internet.at/liste-betruegerischer-shops/?tx_solr[page]=1'
  )

  /** @type {Array<string>} */
  const fakeShopURLs = []

  try {
    const page = await context.newPage()
    await page.goto(watchlistUrl.href, { waitUntil: 'domcontentloaded' })

    const totalPages = Math.ceil(
      parseInt(
        await (
          await page.locator('#news-section-pagination .badge.rounded-pill').elementHandle()
        ).innerText()
      ) / (await page.locator('.site-item__link').elementHandles()).length
    )

    for (let i = 1; i <= totalPages; i++) {
      watchlistUrl.searchParams.set('tx_solr[page]', String(i))
      await page.goto(watchlistUrl.href, { waitUntil: 'domcontentloaded' })

      updateLine(`Progress: ${(((i - 1) / totalPages) * 100).toFixed(2)} %`)

      const urlsOnPage = await page.$$eval('.site-item__link', (links) =>
        links.map((/** @type {HTMLAnchorElement} */ link) => link.innerText)
      )

      fakeShopURLs.push(...urlsOnPage)
    }
  } finally {
    await browser.close()

    updateLine('Writing file...')

    await writeFile(join(dir, 'fake_shop_urls.json'), JSON.stringify(fakeShopURLs, null, 2), 'utf8')
  }
}

crawl().then(() => {
  updateLine('Done.')
  process.stdout.write('\u0007')
})
