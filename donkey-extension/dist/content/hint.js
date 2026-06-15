;(function () {
  const INPUT_SELECTORS = {
    'claude.ai': '.ProseMirror[contenteditable="true"]',
    'chatgpt.com': '#prompt-textarea',
    'chat.openai.com': '#prompt-textarea',
    'gemini.google.com': '.ql-editor[contenteditable="true"]'
  }

  function getInputEl() {
    const selector = INPUT_SELECTORS[window.location.hostname]
    return selector ? document.querySelector(selector) : null
  }

  function showHint(input) {
    removeHint()
    const rect = input.getBoundingClientRect()
    const hint = document.createElement('div')
    hint.id = 'donkey-hint'
    hint.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - rect.top + 10}px;
      left: ${rect.left}px;
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      padding: 8px 14px;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.45);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    `
    const row = (cmd, dim, desc) => `
      <div style="display:flex;align-items:baseline;gap:6px;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
        <span style="color:#fff;font-weight:600;white-space:nowrap">${cmd}</span>
        ${dim ? `<span style="color:#555;white-space:nowrap">${dim}</span>` : ''}
        <span style="color:#555">—</span>
        <span style="color:#888">${desc}</span>
      </div>
    `
    hint.innerHTML = `
      <div style="font-size:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#444;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:2px">Donkey</div>
      ${row('@donkey save', '', 'save the full conversation as memory')}
      ${row('@donkey save', '&lt;describe what to capture&gt;', 'save a specific idea or decision')}
      ${row('@donkey', '&lt;what are you working on&gt;', 'pull in relevant past context')}
    `
    document.body.appendChild(hint)
  }

  function removeHint() {
    document.getElementById('donkey-hint')?.remove()
  }

  let hintVisible = false

  document.addEventListener('input', () => {
    const input = getInputEl()
    if (!input) return
    const text = (input.tagName === 'TEXTAREA' ? input.value : input.innerText)
      .replace(/[​-‍﻿]/g, '').trim()

    // Show while user is still on the first word after @donkey
    const spaces = (text.match(/\s/g) || []).length
    const shouldShow = text.startsWith('@donkey') && spaces <= 1

    if (shouldShow && !hintVisible) {
      showHint(input)
      hintVisible = true
    } else if (!shouldShow && hintVisible) {
      removeHint()
      hintVisible = false
    }
  }, true)

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      removeHint()
      hintVisible = false
    }
  }, true)
})()
