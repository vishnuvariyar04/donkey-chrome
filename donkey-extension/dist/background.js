// Dynamic Proxy configuration
const DEFAULT_PROXY_URL = 'https://donkey-proxy.podinary.workers.dev'

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'PING') {
    sendResponse({ alive: true })
    return
  }

  if (message.type === 'PING_PROXY') {
    const url = message.url || DEFAULT_PROXY_URL
    fetch(url, { method: 'OPTIONS' })
      .then(r => {
        if (r.ok || r.status === 405) {
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: `Proxy returned status ${r.status}` })
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message })
      })
    return true
  }

  if (message.type === 'EMBED') {
    chrome.storage.local.get('proxyUrl', (data) => {
      const proxyUrl = data.proxyUrl || DEFAULT_PROXY_URL
      fetch(`${proxyUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.text })
      })
        .then(async r => {
          const res = await r.json()
          if (!r.ok) throw new Error(`CF worker ${r.status}: ${JSON.stringify(res)}`)
          if (!res.vector) throw new Error(`No vector in response: ${JSON.stringify(res)}`)
          return res.vector
        })
        .then(vector => sendResponse({ success: true, vector }))
        .catch(err => {
          console.error('Donkey embed error:', err.message)
          sendResponse({ success: false, error: err.message })
        })
    })
    return true
  }

  if (message.type === 'EXTRACT_MEMORY') {
    chrome.storage.local.get('proxyUrl', (data) => {
      const proxyUrl = data.proxyUrl || DEFAULT_PROXY_URL
      fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: message.messages })
      })
        .then(async r => {
          const text = await r.text()
          if (!r.ok) throw new Error(`Proxy returned status ${r.status}: ${text}`)
          try { return JSON.parse(text) }
          catch (e) { throw new Error(`Invalid JSON from proxy: ${text}`) }
        })
        .then(memory => sendResponse({ success: true, memory }))
        .catch(err => sendResponse({ success: false, error: err.message }))
    })
    return true
  }

})

