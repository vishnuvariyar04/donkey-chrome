// Anonymous, fire-and-forget telemetry helper for content scripts & popup.
//
// Events are routed through the background service worker (see background.js)
// so they aren't blocked by the host page's CSP, and so the PostHog key and
// the anonymous install id live in exactly one place.
//
// No PII is ever sent — only a random install id + the event name/props.
function track(event, properties = {}) {
  try {
    chrome.runtime.sendMessage({ type: 'TRACK', event, properties })
  } catch (e) {
    // Telemetry must never break the product.
  }
}
