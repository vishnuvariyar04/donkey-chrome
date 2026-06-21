// Dynamic Proxy configuration
const DEFAULT_PROXY_URL = 'https://donkey-proxy.donkeyproxy.workers.dev'

// ── Anonymous telemetry (PostHog) ────────────────────────────────────────────
// Routed through the background worker so host-page CSP can't block it. We send
// only a random per-install id — never email or chat content.
const POSTHOG_HOST = 'https://us.i.posthog.com'
const POSTHOG_KEY = 'phc_CNYwapYLcXdhHgs2YiT3zPeDeGDDgggLAQE5wCmUvkF6'

function getDistinctId() {
  return new Promise(resolve => {
    chrome.storage.local.get('donkeyDistinctId', (data) => {
      if (data.donkeyDistinctId) return resolve(data.donkeyDistinctId)
      const id = crypto.randomUUID()
      chrome.storage.local.set({ donkeyDistinctId: id }, () => resolve(id))
    })
  })
}

async function captureEvent(event, properties = {}) {
  if (!POSTHOG_KEY || POSTHOG_KEY.startsWith('phc_REPLACE')) return
  try {
    const distinct_id = await getDistinctId()
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id,
        properties: {
          ...properties,
          $lib: 'donkey-extension',
          app_version: chrome.runtime.getManifest().version
        },
        timestamp: new Date().toISOString()
      })
    })
  } catch (e) {
    // Telemetry must never affect UX.
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') })
    captureEvent('extension_installed', { reason: details.reason })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'PING') {
    sendResponse({ alive: true })
    return
  }

  if (message.type === 'TRACK') {
    captureEvent(message.event, message.properties || {})
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

