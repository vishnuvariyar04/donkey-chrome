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
      background: rgba(10, 11, 16, 0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 7px 10px;
      z-index: 999999;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-width: 320px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    `
    const row = (cmd, dim, desc) => `
      <div style="display:flex;align-items:baseline;gap:5px;font-size:11px;line-height:1.35;">
        <span style="color:#e2e8f0;font-weight:600;white-space:nowrap">${cmd}</span>
        ${dim ? `<span style="color:#64748b;white-space:nowrap">${dim}</span>` : ''}
        <span style="color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${desc}</span>
      </div>
    `
    hint.innerHTML = `
      <div style="font-size:9px;font-weight:700;color:#818cf8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:1px">Donkey</div>
      ${row('@donkey save', '', 'save this chat as memory')}
      ${row('@donkey use', '&lt;project&gt;', 'inject a saved project')}
      ${row('@donkey', '[filter] from &lt;project&gt;', 'inject only those segments')}
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
