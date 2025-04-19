import * as tf from '@tensorflow/tfjs'
import * as psl from 'psl'

const iconDefault = {
  path: {
    128: '../icons/icon128.png',
  },
}

const iconDisabled = {
  path: {
    128: '../icons/icon128_disabled.png',
  },
}
const iconProcessing = {
  path: {
    128: '../icons/icon128_processing.png',
  },
}

/** @type {tf.LayersModel} */
let model

chrome.action.setIcon(iconDisabled)

/**
 * @typedef {{
 *   num_digits: number
 *   num_letters: number
 *   num_dots: number
 *   num_hyphens: number
 *   external_count: number
 *   social_media_links: number
 *   social_media_shallow_links: number
 *   social_media_share_links: number
 *   total_products: number
 *   percentage_discounted_products: number
 *   percentage_extremely_discounted_products: number
 * }} InferenceInputData
 */

/**
 * @param {string} link
 * @returns {string | null}
 */
function getDomain(link) {
  const url = new URL(link)
  const parseResult = psl.parse(url.hostname)
  if ('domain' in parseResult) {
    return parseResult.domain
  }
  return null
}

/**
 * @param {{shopURL: string, prices: import('./crawler.js').PricesData, links: Array<string> }} data
 * @returns InferenceInputData
 */
function transformDataToFeatures(data) {
  const total_products = data.prices.length
  const discounted_products = data.prices.filter((price) => price.discount > 0).length
  const extremely_discounted_products = data.prices.filter((price) => price.discount > 0.5).length
  const percentage_discounted_products =
    total_products === 0 ? 0 : discounted_products / total_products
  const percentage_extremely_discounted_products =
    total_products === 0 ? 0 : extremely_discounted_products / total_products

  const socialMediaPatterns = {
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\b/,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\b/,
    youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\b/,
    pinterest: /(?:https?:\/\/)?(?:www\.)?pinterest\.com\b/,
    tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\b/,
    googleplus: /(?:https?:\/\/)?(?:www\.)?plus\.google\.com\b/,
    X: /(?:https?:\/\/)?(?:www\.)?X\.com\b/,
    twitter: /(?:https?:\/\/)?(?:www\.)?twitter\.com\b/,
  }

  const socialMediaLinks = {
    social_media_links: data.links.filter((link) =>
      Object.values(socialMediaPatterns).some((pattern) => pattern.test(link))
    ).length,
    social_media_shallow_links: data.links.filter((link) =>
      Object.values(socialMediaPatterns).some((pattern) =>
        new RegExp(pattern.source + '(?:$|/$)').test(link)
      )
    ).length,
    social_media_share_links: data.links.filter((link) =>
      Object.values(socialMediaPatterns).some(
        (pattern) => pattern.test(link) && link.includes('share')
      )
    ).length,
  }

  console.info('data.shopURL', data.shopURL)

  const shopDomain = getDomain(data.shopURL)

  /** @type InferenceInputData */
  const combinedData = {
    num_digits: data.shopURL.match(/\d/g)?.length ?? 0,
    num_letters: data.shopURL.match(/[a-zA-Z]/g)?.length ?? 0,
    num_dots: data.shopURL.match(/\./g)?.length ?? 0,
    num_hyphens: data.shopURL.match(/-/g)?.length ?? 0,
    external_count: data.links.filter((link) => {
      if (shopDomain === null) return true
      return !link.includes(shopDomain)
    }).length,
    ...socialMediaLinks,
    total_products,
    percentage_discounted_products,
    percentage_extremely_discounted_products,
  }

  console.info('combinedData', combinedData)

  return combinedData
}

/**
 * @param {InferenceInputData} data
 * @returns {tf.Tensor2D}
 */
function transformFeaturesToTensor(data) {
  const keyOrder = [
    'num_digits',
    'num_letters',
    'num_dots',
    'num_hyphens',
    'external_count',
    'social_media_links',
    'social_media_shallow_links',
    'social_media_share_links',
    'total_products',
    'percentage_discounted_products',
    'percentage_extremely_discounted_products',
  ]

  const inputArray = keyOrder.map((key) => data[key])
  const inputTensor = tf.tensor2d(inputArray, [1, inputArray.length])

  return inputTensor
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.action) {
    case 'fake-shop-stop-result': {
      const inferenceData = transformDataToFeatures(msg.data)

      const inputTensor = transformFeaturesToTensor(inferenceData)

      const output = model.predict(inputTensor)

      if (output instanceof tf.Tensor) {
        const outputData = output.dataSync()
        output.dispose()

        console.log('Inference result:', outputData)

        // TODO: set inference result icon
      } else {
        console.error('Invalid output:', output)
      }

      // Object.values(inputTensor).forEach((v) => v.dispose())

      chrome.action.setIcon(iconDefault)
      sendResponse()

      return true
    }
  }
})

/**
 * @returns {Promise<void>}
 */
async function loadCustomModel() {
  // await tf.setBackend('wasm')
  await tf.ready()

  const modelUrl = chrome.runtime.getURL('static/model/model.json')
  model = await tf.loadLayersModel(modelUrl)
}

loadCustomModel().then(() => {
  chrome.action.setIcon(iconDefault)

  chrome.action.onClicked.addListener(async (tab) => {
    chrome.action.setIcon(iconProcessing)

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'fake-shop-start-crawl' })
    } catch (err) {
      console.trace(err)
      chrome.action.setIcon(iconDefault)
    }
  })
})
