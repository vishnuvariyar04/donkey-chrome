const INPUT_SELECTORS = {
  'claude.ai': '.ProseMirror[contenteditable="true"]',
  'chatgpt.com': '#prompt-textarea',
  'chat.openai.com': '#prompt-textarea',
  'gemini.google.com': '.ql-editor[contenteditable="true"]'
}

function getInputEl() {
  const host = window.location.hostname
  const selector = INPUT_SELECTORS[host]
  return selector ? document.querySelector(selector) : null
}

function injectText(text) {
  const input = getInputEl()
  if (!input) {
    showToast('Could not find chat input', 'error')
    return
  }

  // contenteditable (Claude, Gemini)
  if (input.contentEditable === 'true') {
    input.focus()
    // Use execCommand to go through the editor's event system
    document.execCommand('selectAll', false, null)
    document.execCommand('insertText', false, text)
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    return
  }

  // textarea (ChatGPT)
  if (input.tagName === 'TEXTAREA') {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set
    nativeInputValueSetter.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }
}
