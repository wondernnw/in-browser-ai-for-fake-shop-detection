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
    case 'fake-shop-stop-result':
      console.info('Received result:', msg)
      if (msg.data[0] < 0.5) {
        window.alert(`I'm real (${msg.data[0]}).`)
      } else {
        window.alert(`I'm fake (${msg.data[0]})!`)
      }

      break
  }
})
