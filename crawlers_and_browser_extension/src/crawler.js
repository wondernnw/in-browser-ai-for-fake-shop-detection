import { extractPrices } from './priceExtraction.js'

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
 * @typedef {{
 *   prices?: PricesData
 * }} URLData
 */

/**
 * @typedef {{
 *   urls: Map<string, URLData>
 * }} ScrapedData
 */

/**
 * @param {Element} el
 * @param {string} origin
 * @returns {string}
 */
function getURLFromElement(el, origin) {
  return (
    'href' in el && typeof el.href === 'string'
      ? el.href
      : 'src' in el && typeof el.src === 'string'
      ? el.src
      : origin
  ).split('#')[0]
}

/**
 * @param {Element} el
 * @param {string} origin
 * @returns {boolean}
 */
function isExternal(el, origin) {
  const url = getURLFromElement(el, origin)
  return !url.startsWith(origin)
}

/**
 * @param {string} url
 * @param {string} origin
 * @param {ScrapedData} scrapedData
 * @param {Set<string>} [visited]
 * @param {number} [depth]
 * @param {number} [max]
 * @returns {Promise<void>}
 */
async function crawlRec(url, origin, scrapedData, visited = new Set(), depth = 1, max = 1) {
  url = url.split('#')[0]
  if (visited.has(url)) return
  if (visited.size >= max) return
  visited.add(url)

  console.info('crawling', url)

  let pageSource
  try {
    pageSource = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    }).then((response) => {
      if (!response.ok) {
        return
      }

      if (!response.headers.get('content-type').includes('text/html')) {
        return
      }

      return response.text()
    })
  } catch (err) {
    console.warn(`Failed to fetch page source for ${url}`, err.name)
    return
  }

  if (!pageSource) return

  const parser = new DOMParser()
  const doc = parser.parseFromString(pageSource, 'text/html')

  /** @type {Array<{url: string, data: URLData}>} */
  const urls = await Promise.all(
    Array.from(doc.querySelectorAll('[src], [href]'))
      .filter((el) => {
        const url = el.getAttribute('href') || el.getAttribute('src')
        const absURL = getURLFromElement(el, origin)
        return (
          !!url &&
          absURL.startsWith('http') &&
          !scrapedData.urls.has(url) &&
          !url.includes('.css') &&
          !url.includes('font') &&
          !url.startsWith('#')
        )
      })
      .filter((el) => {
        return isExternal(el, origin)
      })
      .map((el) => {
        return new Promise((resolve) => {
          const absURL = getURLFromElement(el, origin)

          resolve({
            url: absURL,
          })
        })
      })
  )

  for (const entry of urls) {
    scrapedData.urls.set(entry.url, entry.data)
  }

  if (depth <= 0) {
    return
  }

  await Promise.all(
    Array.from(doc.querySelectorAll('a'))
      .filter((a) => {
        return !isExternal(a, origin) && !!a.href
      })
      .map((a) => {
        return crawlRec(a.href, origin, scrapedData, visited, depth - 1, max - 1)
      })
  )

  return
}

/**
 * @param {string} url
 * @param {string} origin
 * @returns {Promise<ScrapedData>}
 */
export async function crawl(url, origin) {
  const scrapedData = { urls: new Map(), prices: extractPrices() }
  await crawlRec(url, origin, scrapedData)
  console.info('done', scrapedData)
  return scrapedData
}
