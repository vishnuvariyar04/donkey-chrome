const PROVIDER_SELECTORS = {
  'claude.ai': {
    messages: '[data-testid="user-message"], [data-testid="ai-turn"] [data-testid="message-content"]',
    userRole: '[data-testid="user-message"]',
    assistantRole: '[data-testid="ai-turn"]'
  },
  'chatgpt.com': {
    messages: '[data-message-content-for-conversation-role]',
    userRole: '[data-message-author-role="user"]',
    assistantRole: '[data-message-author-role="assistant"]'
  },
  'chat.openai.com': {
    messages: '[data-message-content-for-conversation-role]',
    userRole: '[data-message-author-role="user"]',
    assistantRole: '[data-message-author-role="assistant"]'
  },
  'gemini.google.com': {
    messages: '.conversation-turn, model-response, user-query',
    userRole: 'user-query',
    assistantRole: 'model-response'
  }
}

function scrapeConversation() {
  const host = window.location.hostname
  const selectors = PROVIDER_SELECTORS[host]

  if (!selectors) return []

  const messageEls = document.querySelectorAll(selectors.messages)

  const messages = Array.from(messageEls).map(el => {
    const isUser = !!el.closest(selectors.userRole)
    return {
      role: isUser ? 'user' : 'assistant',
      text: el.innerText.trim()
    }
  }).filter(m => m.text.length > 0)

  // Truncate each message to 2000 chars to preserve breadth over depth
  const truncated = messages.map(m => ({
    ...m,
    text: m.text.length > 2000 ? m.text.slice(0, 2000) + '…' : m.text
  }))

  // If it fits comfortably, send everything
  const totalLength = truncated.map(m => m.text).join(' ').length
  if (totalLength <= 80000) return truncated

  // Too long — sample: first 20 (context) + last 60 (recent work)
  const first = truncated.slice(0, 20)
  const last = truncated.slice(-60)
  const seen = new Set(first.map((_, i) => i))
  const combined = [
    ...first,
    { role: 'system', text: '[… earlier messages omitted …]' },
    ...last.filter((_, i) => !seen.has(truncated.length - 60 + i))
  ]

  return combined
}
