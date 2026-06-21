const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type'
}

// ── Licensing helpers ────────────────────────────────────────────────────────
// Keys + activation counts live in the LICENSES KV namespace:
//   key:<KEY>        -> { paymentId, email, created, maxActivations, devices[] }
//   payment:<PAYID>  -> <KEY>   (so /claim is idempotent per payment)

const MAX_ACTIVATIONS = 3

// Lifetime price (Razorpay counts in the smallest unit — 2900 = $29.00).
const PRICE_AMOUNT = 2900
const PRICE_CURRENCY = 'USD'

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  const seg = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(4))
    return [...bytes].map(b => chars[b % chars.length]).join('')
  }
  return `DONKEY-${seg()}-${seg()}-${seg()}`
}

async function getOrCreateKeyForPayment(env, paymentId, email) {
  const existing = await env.LICENSES.get(`payment:${paymentId}`)
  if (existing) return existing

  const key = generateLicenseKey()
  const record = {
    paymentId,
    email: email || null,
    created: Date.now(),
    maxActivations: MAX_ACTIVATIONS,
    devices: []
  }
  await env.LICENSES.put(`key:${key}`, JSON.stringify(record))
  await env.LICENSES.put(`payment:${paymentId}`, key)
  return key
}

// The extension's "Activate" button calls this.
async function handleVerifyLicense(request, env) {
  let body
  try { body = await request.json() } catch { return json({ valid: false, error: 'Bad request' }, 400) }

  const key = (body.key || '').trim().toUpperCase()
  const deviceId = body.deviceId || null
  if (!key) return json({ valid: false, error: 'No key provided' })

  const raw = await env.LICENSES.get(`key:${key}`)
  if (!raw) return json({ valid: false, error: 'Invalid or unknown key' })

  const record = JSON.parse(raw)
  const devices = record.devices || []
  const max = record.maxActivations || MAX_ACTIVATIONS

  // Track this device, enforcing the per-key activation cap.
  if (deviceId && !devices.includes(deviceId)) {
    if (devices.length >= max) {
      return json({ valid: false, error: 'Activation limit reached for this key' })
    }
    devices.push(deviceId)
    record.devices = devices
    await env.LICENSES.put(`key:${key}`, JSON.stringify(record))
  }

  return json({ valid: true })
}

// HMAC-SHA256 verification of the raw webhook body against X-Razorpay-Signature.
async function verifyRazorpaySignature(rawBody, signature, secret) {
  if (!secret || !signature) return false
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(rawBody))
  const expected = [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, '0')).join('')
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

// Razorpay calls this on a successful payment; it mints the key.
async function handleWebhook(request, env) {
  const rawBody = await request.text()
  const signature = request.headers.get('X-Razorpay-Signature')
  const ok = await verifyRazorpaySignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)
  if (!ok) return new Response('Invalid signature', { status: 400 })

  let event
  try { event = JSON.parse(rawBody) } catch { return new Response('Bad JSON', { status: 400 }) }

  const paidEvents = ['payment.captured', 'order.paid', 'payment_link.paid']
  if (paidEvents.includes(event.event)) {
    const payment = event.payload?.payment?.entity || {}
    const link = event.payload?.payment_link?.entity || {}
    const paymentId = payment.id || link.id
    const email = payment.email || link.customer?.email || null
    if (paymentId) await getOrCreateKeyForPayment(env, paymentId, email)
  }

  // Always 200 so Razorpay doesn't retry events we intentionally ignore.
  return new Response('ok', { status: 200 })
}

function claimPage(message, key) {
  const keyBlock = key ? `
    <div class="key">${key}</div>
    <button onclick="navigator.clipboard.writeText('${key}');this.textContent='Copied!'">Copy key</button>
    <p class="hint">Open the Donkey extension → Settings → paste this key → Activate.</p>` : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Donkey — Your License</title>
  <style>
    body{font-family:-apple-system,Segoe UI,sans-serif;background:#090a0f;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
    .card{max-width:440px;text-align:center;background:#11131c;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px}
    h1{font-size:20px;margin:0 0 8px;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    p{color:#94a3b8;font-size:14px;line-height:1.5}
    .key{font-family:monospace;font-size:18px;letter-spacing:1px;background:#090a0f;border:1px solid rgba(129,140,248,.4);border-radius:10px;padding:14px;margin:20px 0;color:#f8fafc;word-break:break-all}
    button{background:linear-gradient(135deg,#6366f1,#4f46e5);border:none;color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    .hint{margin-top:18px;font-size:12px;color:#64748b}
  </style></head>
  <body><div class="card"><h1>Donkey Lifetime</h1><p>${message}</p>${keyBlock}</div></body></html>`
}

// The page the buyer lands on after paying — shows their key (no email needed).
async function handleClaim(request, env, url) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8' }
  const paymentId = url.searchParams.get('payment_id') || url.searchParams.get('razorpay_payment_id')

  if (!paymentId) {
    return new Response(claimPage('Missing payment reference. Please use the link from your payment confirmation.'), { headers })
  }

  // 1. The webhook may have already created the key.
  let key = await env.LICENSES.get(`payment:${paymentId}`)

  // 2. Fallback: confirm the payment with Razorpay directly, then create it.
  if (!key && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    try {
      const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`) }
      })
      const p = await r.json()
      if (r.ok && (p.status === 'captured' || p.status === 'authorized')) {
        key = await getOrCreateKeyForPayment(env, paymentId, p.email)
      }
    } catch (e) { /* fall through to the "not found" message */ }
  }

  if (!key) {
    return new Response(claimPage('We could not confirm your payment yet. If you just paid, wait a few seconds and refresh this page.'), { headers })
  }

  return new Response(claimPage('Payment confirmed — here is your lifetime license key:', key), { headers })
}

// Self-hosted Razorpay Checkout — gives us a JS success callback we fully
// control, so key delivery never depends on Razorpay's redirect settings.
function buyPage(keyId, order) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Donkey Lifetime — Checkout</title>
  <style>
    body{font-family:-apple-system,Segoe UI,sans-serif;background:#090a0f;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
    .card{max-width:420px;text-align:center;background:#11131c;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px}
    h1{font-size:20px;margin:0 0 8px;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    p{color:#94a3b8;font-size:14px;line-height:1.5}
    button{margin-top:18px;background:linear-gradient(135deg,#6366f1,#4f46e5);border:none;color:#fff;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
    .hint{margin-top:14px;font-size:12px;color:#64748b}
  </style></head>
  <body><div class="card">
    <h1>Donkey Lifetime</h1>
    <p>One-time payment — unlimited memory across Claude, ChatGPT &amp; Gemini, forever.</p>
    <button id="pay">Pay now</button>
    <p class="hint">Secure checkout via Razorpay.</p>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var options = {
      key: ${JSON.stringify(keyId)},
      order_id: ${JSON.stringify(order.id)},
      amount: ${order.amount},
      currency: ${JSON.stringify(order.currency)},
      name: 'Donkey',
      description: 'Lifetime license',
      handler: function (response) {
        window.location.href = '/claim?razorpay_payment_id=' + response.razorpay_payment_id
      },
      theme: { color: '#6366f1' }
    }
    var rzp = new Razorpay(options)
    document.getElementById('pay').onclick = function () { rzp.open() }
    rzp.open()
  </script>
  </body></html>`
}

async function handleBuy(request, env) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8' }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return new Response(claimPage('Checkout is not configured yet.'), { headers })
  }

  try {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: PRICE_AMOUNT,
        currency: PRICE_CURRENCY,
        notes: { product: 'donkey-lifetime' }
      })
    })
    const order = await r.json()
    if (!r.ok || !order.id) {
      return new Response(claimPage('Could not start checkout. Please try again.'), { headers })
    }
    return new Response(buyPage(env.RAZORPAY_KEY_ID, order), { headers })
  } catch (e) {
    return new Response(claimPage('Could not start checkout. Please try again.'), { headers })
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    // /claim is a top-level browser navigation (GET), so handle it before the
    // POST-only guard below.
    if (url.pathname === '/buy') {
      return handleBuy(request, env)
    }

    if (url.pathname === '/claim') {
      return handleClaim(request, env, url)
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
    }

    if (url.pathname === '/embed') {
      try {
        const { text } = await request.json()
        const result = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [text] })
        return new Response(JSON.stringify({ vector: result.data[0] }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        })
      }
    }

    // ── Licensing routes ──
    if (url.pathname === '/verify-license') {
      return handleVerifyLicense(request, env)
    }

    if (url.pathname === '/webhook') {
      return handleWebhook(request, env)
    }

    return json({ error: 'Not found' }, 404)
  }
}
