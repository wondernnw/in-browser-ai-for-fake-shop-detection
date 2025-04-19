import { crawl } from './crawler.js'

async function initiateCrawl() {
  const { urls, ...rest } = await crawl(location.href, location.origin)
  chrome.runtime.sendMessage({
    action: 'fake-shop-stop-result',
    data: {
      shopURL: location.origin,
      links: Array.from(urls.keys()),
      ...rest,
    },
  })
}

chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.action) {
    case 'fake-shop-start-crawl':
      void initiateCrawl()
      break
  }
})
