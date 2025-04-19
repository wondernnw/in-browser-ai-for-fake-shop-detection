import { chromium } from 'playwright'
import { searchPriceAndCode } from 'price-extractor'
import { mkdirSync, readFileSync, constants } from 'node:fs'
import { writeFile, access } from 'node:fs/promises'
import { join } from 'path'
import { updateLine, formatDuration } from './utils.js'

const startTime = performance.now()
const startFrom = 10000
const totalPagesToCrawl = 10000

/** @type {Array<string>} */
const fakeShopURLs = JSON.parse(
  readFileSync(join(process.cwd(), '../data/fake_shop_urls.json'), 'utf8')
).slice(startFrom, startFrom + Math.floor(totalPagesToCrawl / 2))

/** @type {Array<string>} */
const realShopURLs = JSON.parse(
  readFileSync(join(process.cwd(), '../data/real_shop_urls.json'), 'utf8')
).slice(startFrom, startFrom + Math.floor(totalPagesToCrawl / 2))

/**
 * @typedef {{
 *   price: number
 *   code: string
 *   discount: number
 *   hasPercentage: boolean
 *   hasLineThrough: boolean
 * }} PriceData
 */

/**
 * @typedef {{
 *   external?: boolean,
 *   prices?: Array<PriceData>
 * }} URLData
 */

/**
 * @typedef {{
 *   urls: Map<string, URLData>
 *   prices?: Array<PriceData>
 * }} ScrapedData
 */

/**
 * @param {import('playwright').ElementHandle} el
 * @returns {Promise<string>}
 */
async function getElementKey(el) {
  return await el.evaluate((/** @type {HTMLElement} */ node) => {
    /**
     * @param {HTMLElement} el
     * @returns string
     */
    function getElementKey(el) {
      if (!el.parentElement) {
        return 'root'
      }

      const index = Array.from(el.parentElement.children).findIndex((child) => child === el)

      return `${getElementKey(el.parentElement)}->${index}`
    }

    return getElementKey(node)
  })
}

/**
 * @param {string} url
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<string>}
 */
async function getPageContent(url, context) {
  const page = await context.newPage()
  try {
    await page.goto(url, { timeout: 30_000, waitUntil: 'networkidle' })
    return await page.content()
  } finally {
    await page.close()
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} origin
 * @param {ScrapedData} scrapedData
 */
async function extractLinks(page, origin, scrapedData) {
  const links = await page.evaluate((origin) => {
    return Array.from(document.querySelectorAll('[src], [href]'))
      .map((el) => el.getAttribute('href') || el.getAttribute('src'))
      .filter(
        (url) =>
          url &&
          url.startsWith('http') &&
          !url.includes('.css') &&
          !url.includes('font') &&
          !url.startsWith('#')
      )
      .map((url) => new URL(url, origin).toString())
  }, origin)

  for (const link of links) {
    if (!scrapedData.urls.has(link)) {
      scrapedData.urls.set(link, { external: !link.startsWith(origin) })
    }
  }
}

/**
 * @param {string} url
 * @param {string} origin
 * @param {ScrapedData} scrapedData
 * @param {import('playwright').BrowserContext} context
 * @param {Set<string>} [visited]
 * @param {number} [depth]
 * @param {number} [max]
 * @returns {Promise<void>}
 */
async function crawlRec(
  url,
  origin,
  scrapedData,
  context,
  visited = new Set(),
  depth = 1,
  max = 1
) {
  url = url.split('#')[0]
  if (visited.has(url)) return
  if (visited.size >= max) return
  visited.add(url)

  let pageSource
  try {
    pageSource = await getPageContent(url, context)
  } catch (err) {
    // console.warn(`Failed to fetch ${url}:`, err.message)
    return
  }

  const page = await context.newPage()
  await page.setContent(pageSource)

  await extractLinks(page, origin, scrapedData)

  if (depth > 0) {
    const internalLinks = Array.from(scrapedData.urls.keys()).filter((link) =>
      link.startsWith(origin)
    )
    for (const link of internalLinks) {
      await crawlRec(link, origin, scrapedData, context, visited, depth - 1, max - 1)
    }
  }

  await page.close()
}

/**
 * @typedef {Array<{
 *   price: number
 *   code: string
 *   discount: number
 *   hasPercentage: boolean
 *   hasLineThrough: boolean
 * }>} PricesData
 */

/**
 * @param {string} textContent
 * @returns {boolean}
 */
function hasPercentage(textContent) {
  return /\d+\s?%/.test(textContent)
}

/**
 * @param {string} textContent
 * @param {string} parentTextContent
 * @returns {import('price-extractor').IExtractResult | undefined}
 */
function getPriceData(textContent, parentTextContent) {
  const priceFromEl = searchPriceAndCode(textContent)
  if ('price' in priceFromEl) {
    return priceFromEl
  }

  const priceFromElParent = searchPriceAndCode(parentTextContent)
  if ('price' in priceFromElParent) {
    return priceFromElParent
  }

  return undefined
}

/**
 * @param {import('playwright').ElementHandle} el
 * @param {number} [stepsUp]
 * @returns {Promise<import('playwright').ElementHandle>}
 */
async function getPriceContainer(el, stepsUp = 0) {
  if (stepsUp === 4) return el

  const parentHandle = await el.evaluateHandle((el) => el.parentElement)
  if (!parentHandle) return el

  const childrenCount = await parentHandle.evaluate((parent) => parent.children.length)
  if (childrenCount > 2) return el

  return getPriceContainer(parentHandle, stepsUp + 1)
}

/**
 * @param {import('playwright').ElementHandle} el
 * @returns {Promise<boolean>}
 */
async function shouldBeIgnored(el) {
  return await el.evaluate((/** @type {Element} */ node) => {
    const currencyIndicators = ['$', '€', '£', '₪', '¥', '₩', '₦', '₱', '฿', '₴', '₫', '₣', '₡']
    return (
      node.children.length > 0 ||
      !currencyIndicators.some((symbol) => node.textContent?.includes(symbol)) ||
      !!node.closest(':is(script,style,.sr-only,.screen-reader-text,.visually-hidden)') ||
      !node.checkVisibility()
    )
  })
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{price: number, code: string, discount: number, hasPercentage: boolean, hasLineThrough: boolean}>>}
 */
async function extractPrices(page) {
  /** @type {Array<{
   *   price: number,
   *   code: string | undefined,
   *   discount: number,
   *   hasPercentage: boolean,
   *   hasLineThrough: boolean
   * }>} */
  const priceGroups = []
  const elementsSet = new Set()
  const allElements = await page.locator('*').elementHandles()

  /** @type {Array<import('playwright').ElementHandle>} */
  const currencyElements = []
  for (const el of allElements) {
    if (!(await shouldBeIgnored(el))) {
      currencyElements.push(el)
    }
  }

  for (const el of currencyElements) {
    if (elementsSet.has(await getElementKey(el))) continue

    const containerHandle = /** @type {import('playwright').ElementHandle<HTMLElement>} */ (
      await getPriceContainer(el)
    )

    if (!(await containerHandle.evaluate((node) => !!node))) {
      // console.warn('Could not find container for currency element.')
      continue
    }

    const allElementsInContainer = (await containerHandle.$$('*')).concat(containerHandle)

    /** @type {Array<import('playwright').ElementHandle>} */
    const filteredCurrencyElements = []
    for (const el of allElementsInContainer) {
      if (!(await shouldBeIgnored(el))) {
        filteredCurrencyElements.push(el)
      }
    }

    if (filteredCurrencyElements.length > 3) {
      // console.warn('Found more than three currency elements in a price container.')
      continue
    }

    const meta = {
      hasPercentage: hasPercentage(
        await containerHandle.evaluate(/** @type {Element} */ (node) => node.textContent)
      ),
      hasLineThrough: !!(await containerHandle.evaluate(
        (/** @type {Element} */ node) =>
          getComputedStyle(node).textDecorationLine === 'line-through' ||
          Array.from(node.querySelectorAll('*')).some(
            (node) => getComputedStyle(node).textDecorationLine === 'line-through'
          )
      )),
    }

    filteredCurrencyElements.forEach(async (el) => elementsSet.add(await getElementKey(el)))

    // Extract prices from filtered elements
    const extractedPrices = []
    for (const el of filteredCurrencyElements) {
      const priceData = getPriceData(
        await el.evaluate((node) => node.textContent),
        await el.evaluate((node) => node.parentNode.textContent)
      )
      if (priceData?.price !== undefined) {
        extractedPrices.push(priceData)
      }
    }

    if (extractedPrices.length === 1) {
      priceGroups.push({
        price: extractedPrices[0].price,
        code: extractedPrices[0].code,
        discount: 0,
        ...meta,
      })
    } else if (extractedPrices.length > 1) {
      priceGroups.push({
        price: Math.min(...extractedPrices.map((p) => p.price)),
        code: extractedPrices[0].code,
        discount: Number(
          (
            1 -
            Math.min(...extractedPrices.map((p) => p.price)) /
              Math.max(...extractedPrices.map((p) => p.price))
          ).toFixed(2)
        ),
        ...meta,
      })
    }
  }

  return priceGroups
}

/**
 * @param {string} url
 * @param {string} origin
 * @returns {Promise<ScrapedData>}
 */
async function crawl(url, origin) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()

  try {
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    const scrapedData = { urls: new Map(), prices: await extractPrices(page) }
    await crawlRec(url, origin, scrapedData, context)

    await browser.close()
    return scrapedData
  } catch (error) {
    await browser.close()
    return undefined
  }
}

/**
 * @param {Array<URL>} urls
 * @param {boolean} isFake
 * @param {number} [batchSize]
 * @returns {Promise<void>}
 */
async function batchProcess(urls, isFake, batchSize = 4) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)

    await Promise.all(
      batch.map(
        (url) =>
          new Promise((resolve) => {
            const file = join(dir, isFake ? 'fake' : 'real', `${url.host}.json`)
            access(file, constants.F_OK)
              .then(resolve)
              .catch(() => {
                crawl(url.href, url.origin)
                  .then((scrapedData) => {
                    return writeResults(url, scrapedData, isFake)
                  })
                  .then(resolve)
                  .catch(resolve)
              })
          })
      )
    )
  }
}

const dir = join(process.cwd(), '..', 'data', 'results')
mkdirSync(join(dir, 'fake'), { recursive: true })
mkdirSync(join(dir, 'real'), { recursive: true })

let progressCounter = 0

/**
 * @param {URL} url
 * @param {ScrapedData | undefined} scrapedData
 * @param {boolean} isFake
 * @returns {Promise<void>}
 */
async function writeResults(url, scrapedData, isFake) {
  const msNow = performance.now() - startTime
  updateLine(
    `Progress: ${((++progressCounter / totalPagesToCrawl) * 100).toFixed(
      2
    )} %   Estimated time left: ${formatDuration(
      (msNow / progressCounter) * (totalPagesToCrawl - progressCounter)
    )}`
  )

  // ignore pages with no prices and "Buy domain for..."
  if (scrapedData?.prices.length > 1) {
    await writeFile(
      join(dir, isFake ? 'fake' : 'real', `${url.host}.json`),
      JSON.stringify({
        url: url.href,
        isFake,
        links: Object.keys(Object.fromEntries(scrapedData.urls)),
        prices: scrapedData.prices,
      }),
      'utf8'
    )
  }
}

batchProcess(
  fakeShopURLs.map((urlString) => new URL('http' + '://' + urlString)),
  true
)
  .then(() => {
    return batchProcess(
      realShopURLs.map((urlString) => new URL('http' + '://' + urlString)),
      false
    )
  })
  .then(() => {
    updateLine(`Done. Duration: ${formatDuration(performance.now() - startTime)}`)
    process.stdout.write('\u0007')
  })
