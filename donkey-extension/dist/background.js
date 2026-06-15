const PROXY_URL = 'https://donkey-proxy.podinary.workers.dev'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'PING') {
    sendResponse({ alive: true })
    return
  }

  if (message.type === 'EMBED') {
    fetch(`${PROXY_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message.text })
    })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(`CF worker ${r.status}: ${JSON.stringify(data)}`)
        if (!data.vector) throw new Error(`No vector in response: ${JSON.stringify(data)}`)
        return data.vector
      })
      .then(vector => sendResponse({ success: true, vector }))
      .catch(err => {
        console.error('Donkey embed error:', err.message)
        sendResponse({ success: false, error: err.message })
      })
    return true
  }

  if (message.type === 'EXTRACT_MEMORY') {
    fetch(PROXY_URL, {
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
    return true
  }

})
