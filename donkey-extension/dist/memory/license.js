// Donkey licensing — count-based free trial + one-time lifetime unlock.
//
// The trial is measured in SAVES (the value-creating action), not days:
// a memory tool's payoff is delayed (save today, retrieve next week), so a
// time-based trial can expire before the user ever feels the magic. Counting
// saves guarantees every trial user can complete the save→retrieve loop.
//
// Retrieval (`@donkey use`) is always free — only saving is gated.

const DONKEY_FREE_SAVE_LIMIT = 5

// Self-hosted Razorpay Checkout on the worker (reliable key delivery).
const DONKEY_LTD_URL = 'https://donkey-proxy.donkeyproxy.workers.dev/buy'

const DONKEY_PROXY_DEFAULT = 'https://donkey-proxy.donkeyproxy.workers.dev'

async function getLicenseState() {
  return new Promise(resolve => {
    chrome.storage.local.get(
      ['donkeyPro', 'donkeySavesUsed', 'donkeyLicenseKey'],
      data => resolve({
        pro: !!data.donkeyPro,
        savesUsed: data.donkeySavesUsed || 0,
        limit: DONKEY_FREE_SAVE_LIMIT,
        licenseKey: data.donkeyLicenseKey || null
      })
    )
  })
}

async function canSave() {
  const s = await getLicenseState()
  return s.pro || s.savesUsed < s.limit
}

async function incrementSaveCount() {
  const s = await getLicenseState()
  if (s.pro) return
  return new Promise(resolve => {
    chrome.storage.local.set({ donkeySavesUsed: s.savesUsed + 1 }, resolve)
  })
}

// Validates a license key against the proxy/worker, which is the same backend
// that mints keys from the Razorpay webhook. Server contract:
//   POST {proxyUrl}/verify-license  { key }  ->  { valid: true } | { valid: false, error }
async function activateLicense(key) {
  const clean = (key || '').trim()
  if (!clean) return { ok: false, error: 'Enter a license key' }

  const { proxyUrl, donkeyDistinctId } = await new Promise(r =>
    chrome.storage.local.get(['proxyUrl', 'donkeyDistinctId'], r))
  const base = proxyUrl || DONKEY_PROXY_DEFAULT

  try {
    const res = await fetch(`${base}/verify-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: clean, deviceId: donkeyDistinctId || null })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.valid) {
      return { ok: false, error: data.error || 'Invalid or expired key' }
    }
    await new Promise(r =>
      chrome.storage.local.set({ donkeyPro: true, donkeyLicenseKey: clean }, r)
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
