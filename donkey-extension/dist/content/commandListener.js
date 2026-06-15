const INPUT_SELECTORS_FOR_LISTENER = {
  'claude.ai': '.ProseMirror[contenteditable="true"]',
  'chatgpt.com': '#prompt-textarea',
  'chat.openai.com': '#prompt-textarea',
  'gemini.google.com': '.ql-editor[contenteditable="true"]'
}

const RESPONSE_SELECTORS = {
  'claude.ai': '.font-claude-response-body',
  'chatgpt.com': '[data-message-author-role="assistant"] .markdown',
  'chat.openai.com': '[data-message-author-role="assistant"] .markdown',
  'gemini.google.com': 'model-response .markdown'
}

const MEMORY_PROMPT = `Map our entire conversation into a structured JSON memory object. Write the JSON directly in your response message. Do NOT create a file, do NOT use an artifact, do NOT use code blocks or markdown fences. Keep structured fields concise (1 sentence per item). Return ONLY the raw JSON object starting with { and ending with }, nothing else.

{
  "project": "A short consistent slug for this project or topic (e.g. 'auth-service', 'mobile-app'). Infer it from context. Never use 'untagged' or generic names. If it clearly belongs to an existing project concept, reuse that name.",
  "summary": "1-2 sentences on what was accomplished or discussed.",
  "richText": "Write 2-3 paragraphs narrating this conversation as if briefing a future session. Cover: what was being built and why, the key decisions made and their reasoning, what failed or was rejected and why, and what a future session absolutely must know to continue without losing context. Be specific and concrete — name actual things, not just categories.",
  "decisions": [{"what": "decision made", "why": "reasoning"}],
  "mistakes": ["mistake or rejected approach and why it failed"],
  "learnings": ["concrete thing discovered or confirmed"],
  "constraints": ["hard limit or requirement that cannot be changed"],
  "open_questions": ["unresolved item that needs future attention"],
  "context": ["background a future session must know"],
  "deep_context": {},
  "tags": ["2 to 4 lowercase keywords that best describe this work"]
}

For deep_context: replace the empty object with a concise nested object (max 3-4 key-value pairs) capturing key structures like core architecture or main technical decisions. Keep values very short.`

let donkeySubmitting = false

function clearInput(input) {
  console.log('Donkey debug: clearInput started');
  if (input.contentEditable === 'true') {
    input.focus()
    document.execCommand('selectAll', false, null)
    document.execCommand('delete', false, null)
  } else {
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  console.log('Donkey debug: clearInput finished');
}

async function handleCommand(command) {
  console.log('Donkey debug: handleCommand called. action =', command.action);

  if (command.action === 'save') {
    showToast('Asking AI to map context...', 'loading')

    const host = window.location.hostname
    const msgSelector = RESPONSE_SELECTORS[host] || '.font-claude-response-body'
    const beforeCount = document.querySelectorAll(msgSelector).length
    console.log('Donkey debug: msgSelector =', msgSelector, 'beforeCount =', beforeCount);

    const input = getInputEl()
    if (!input) {
      console.log('Donkey debug: input element NOT found!');
      showToast('Could not find chat input', 'error')
      return
    }

    console.log('Donkey debug: Injecting extraction prompt...');
    if (input.contentEditable === 'true') {
      input.focus()
      document.execCommand('insertText', false, MEMORY_PROMPT)
      input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    } else {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      setter.call(input, MEMORY_PROMPT)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    console.log('Donkey debug: Waiting 150ms for editor state digestion...');
    await new Promise(resolve => setTimeout(resolve, 150))

    console.log('Donkey debug: Submitting extraction prompt...');
    await submitPrompt(input)

    showToast('Waiting for AI response...', 'loading')
    console.log('Donkey debug: Starting waitForNewResponse...');
    const responseText = await waitForNewResponse(msgSelector, beforeCount)
    console.log('Donkey debug: waitForNewResponse completed. responseText length =', responseText ? responseText.length : 'null');

    if (!responseText) {
      showToast('No response received — try again', 'error')
      return
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    console.log('Donkey debug: Regex match outcome =', jsonMatch ? 'Matched!' : 'Not matched');
    if (!jsonMatch) {
      console.log('Donkey debug: Regex could not find JSON block in response:', responseText);
      showToast('AI did not return valid JSON', 'error')
      return
    }

    let memory
    try {
      memory = JSON.parse(jsonMatch[0])
      console.log('Donkey debug: JSON successfully parsed! project =', memory.project);
    } catch (e) {
      console.log('Donkey debug: JSON parsing failed on string:', jsonMatch[0], 'Error:', e);
      showToast('Could not parse AI response', 'error')
      return
    }

    if (command.project) memory.project = command.project

    showToast('Embedding and saving... (may take a few seconds)', 'loading')
    const saved = await saveMemory(memory)

    if (saved.embedding) {
      showToast(`Saved with semantic search — ${saved.project}`, 'success')
    } else {
      showToast(`Saved without embedding — check console for error (F12)`, 'error')
    }
    return
  }

  if (command.action === 'use') {
    showToast('Searching memories...', 'loading')
    const memories = await searchMemories(command.query)

    if (memories.length === 0) {
      showToast(`No memories found for: ${command.query}`, 'error')
      return
    }

    const items = memories.map(m => ({ project: m.project, text: formatMemory(m, command.filter) }))
    injectText(items.map(i => i.text).join('\n'))
    showMemoryPanel(items, remaining => {
      injectText(remaining.map(i => i.text).join('\n'))
    })
    return
  }

  if (command.action === 'unknown') {
    showToast(`Unknown command: @donkey ${command.raw}`, 'error')
  }
}

async function submitPrompt(input) {
  const sendSelectors = [
    'button[aria-label="Send Message"]',
    'button[aria-label="Send message"]',
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]'
  ]
  for (const sel of sendSelectors) {
    const btn = document.querySelector(sel)
    if (btn && !btn.disabled) {
      console.log('Donkey debug: Found active send button. Clicking selector:', sel);
      btn.click()
      return
    }
  }

  console.log('Donkey debug: Active send button NOT found. Falling back to Enter keyevent...');
  donkeySubmitting = true
  input.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter', code: 'Enter', keyCode: 13,
    bubbles: true, cancelable: true
  }))
  setTimeout(() => { donkeySubmitting = false }, 1000)
}

async function waitForNewResponse(msgSelector, beforeCount) {
  return new Promise((resolve) => {
    let lastText = ''
    let stableCount = 0
    let totalWait = 0

    const interval = setInterval(() => {
      totalWait++
      if (totalWait > 120) {
        console.log('Donkey debug: waitForNewResponse TIMEOUT reached (120s)');
        clearInterval(interval)
        resolve(null)
        return
      }

      const allEls = document.querySelectorAll(msgSelector)
      if (allEls.length <= beforeCount) {
        if (totalWait % 5 === 0) {
          console.log(`Donkey debug: Still waiting for new element. allEls.length (${allEls.length}) <= beforeCount (${beforeCount})`);
        }
        return
      }

      const newEls = Array.from(allEls).slice(beforeCount)
      const currentText = newEls.map(el => el.innerText || el.textContent).join('\n').trim()
      const cleanCurrent = currentText.trim().replace(/\s+/g, ' ')

      if (totalWait % 5 === 0) {
        console.log(`Donkey debug: polling... cleanCurrent length: ${cleanCurrent.length}, stableCount: ${stableCount}`);
      }

      if (cleanCurrent.length > 0 && cleanCurrent === lastText) {
        stableCount++
        if (stableCount >= 4) {
          console.log('Donkey debug: text stabilized. Final cleanCurrent length:', cleanCurrent.length);
          clearInterval(interval)
          resolve(currentText)
        }
      } else {
        lastText = cleanCurrent
        stableCount = 0
      }
    }, 1000)
  })
}


function attachListener() {
  if (donkeyListenerAttached) return
  donkeyListenerAttached = true

  console.log('Donkey debug: attachListener running');
  window.addEventListener('keydown', async (e) => {
    if (donkeySubmitting) return
    if (e.key !== 'Enter' || e.shiftKey) return

    const host = window.location.hostname
    const selector = INPUT_SELECTORS_FOR_LISTENER[host]
    if (!selector) return

    const input = document.querySelector(selector)
    if (!input) return
    if (!input.contains(document.activeElement) && document.activeElement !== input) return

    const textVal = input.tagName === 'TEXTAREA' ? input.value : input.innerText
    const text = (textVal || '').replace(/[​-‍﻿]/g, '').trim()
    if (!text.startsWith('@donkey')) return

    console.log('Donkey debug: Intercepted @donkey command keydown Enter! text =', text);
    e.preventDefault()
    e.stopImmediatePropagation()

    clearInput(input)

    const command = parseCommand(text)
    await handleCommand(command)
  }, true)
}

let donkeyListenerAttached = false
