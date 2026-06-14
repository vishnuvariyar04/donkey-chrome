const SUPPORTED_HOSTS = [
  'claude.ai',
  'chatgpt.com',
  'chat.openai.com',
  'gemini.google.com'
]

function init() {
  const host = window.location.hostname
  if (!SUPPORTED_HOSTS.includes(host)) return

  attachListener()

  const startObserver = () => {
    const observer = new MutationObserver(() => {})
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => observer.disconnect(), 30000)
  }

  if (document.body) {
    startObserver()
  } else {
    document.addEventListener('DOMContentLoaded', startObserver)
  }
}

init()
