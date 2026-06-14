const PROXY_URL = 'https://donkey-proxy.donkeyproxy.workers.dev'
// Replace with your actual Cloudflare Worker URL after deploy

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'EXTRACT_MEMORY') {
    fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: message.messages })
    })
      .then(async r => {
        const text = await r.text()
        if (!r.ok) {
          throw new Error(`Proxy returned status ${r.status}: ${text}`)
        }
        try {
          return JSON.parse(text)
        } catch (e) {
          throw new Error(`Invalid JSON from proxy: ${text}`)
        }
      })
      .then(memory => sendResponse({ success: true, memory }))
      .catch(err => sendResponse({ success: false, error: err.message }))

    return true // keeps the message channel open for async response
  }

})
