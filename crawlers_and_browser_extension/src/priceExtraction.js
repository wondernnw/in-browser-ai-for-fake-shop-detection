import { searchPriceAndCode } from 'price-extractor'
import { currencyIndicators } from './currencyIndicators.js'

/**
 * @param {Array<Element>} els
 * @returns {boolean}
 */
function hasLineThrough(els) {
  return els.some((el) => getComputedStyle(el).textDecorationLine === 'line-through')
}

/**
 * @param {Element} el
 * @returns {boolean}
 */
function hasPercentage(el) {
  return /\d+\s?%/.test(el.textContent)
}

/**
 * @param {Element} el
 * @returns {import('price-extractor').IExtractResult | undefined}
 */
function getPriceData(el) {
  const priceFromEl = searchPriceAndCode(el.textContent)
  if ('price' in priceFromEl) {
    return priceFromEl
  }

  const priceFromElParent = searchPriceAndCode(el.parentElement?.textContent)
  if ('price' in priceFromElParent) {
    return priceFromElParent
  }

  console.warn('Could not extract price data from element', el)
  return undefined
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

/**
 * @param {HTMLElement} el
 * @param {number} [stepsUp]
 * @returns {HTMLElement}
 */
function getPriceContainer(el, stepsUp = 0) {
  if (stepsUp === 4) return el

  if (el.parentElement.children.length > 4) return el

  return getPriceContainer(el.parentElement, stepsUp + 1)
}

/**
 * @param {Element} el
 * @returns {boolean}
 */
function shouldBeIgnored(el) {
  return (
    el.children.length > 0 ||
    !currencyIndicators.some((symbol) => el.textContent?.includes(symbol)) ||
    !!el.closest(':is(script,style,.sr-only,.screen-reader-text,.visually-hidden)') ||
    !el.checkVisibility()
  )
}

/**
 * @returns {PricesData}
 */
export function extractPrices() {
  const elements = Array.from(document.body.querySelectorAll('*'))

  const elementsSet = new Set()

  const currencyElements = elements.filter((el) => {
    return !shouldBeIgnored(el)
  })

  const priceGroups = []
  currencyElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return
    if (elementsSet.has(getElementKey(el))) return

    const container = getPriceContainer(el)

    if (!container) {
      console.warn('Could not find container for currency element', el)
      return
    }

    const allElementsInContainer = Array.from(container.querySelectorAll('*')).concat(container)

    const currencyElementsInContainer = allElementsInContainer.filter((el) => {
      if (shouldBeIgnored(el)) {
        return false
      }

      const priceData = getPriceData(el)
      return priceData?.price !== undefined
    })

    currencyElementsInContainer.forEach((el) => {
      if (!(el instanceof HTMLElement)) return
      elementsSet.add(getElementKey(el))
    })

    if (currencyElementsInContainer.length > 3) {
      console.warn('Found more than three currency elements in a price container', container)
      return
    }

    const meta = {
      hasPercentage: hasPercentage(container),
      hasLineThrough: hasLineThrough(allElementsInContainer.concat(container)),
    }

    const extractedPrices = currencyElementsInContainer
      .map((el) => {
        const priceData = getPriceData(el)
        if (!priceData?.price) return undefined

        return {
          price: priceData.price,
          code: priceData.code,
        }
      })
      .filter((d) => !!d)

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
  })

  return priceGroups
}
