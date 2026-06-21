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

const MEMORY_SCHEMA = `Return ONLY a raw JSON object — no markdown, no code blocks, no explanation. Start with { and end with }. Use this exact schema:
{
  "project": "short-kebab-case slug inferred from context (e.g. 'auth-service', 'reddit-idea'). Never use 'untagged'.",
  "summary": "1-2 sentences on what this is about.",
  "richText": "2-3 paragraphs briefing a future session: what it is, key decisions and reasoning, what failed and why, what must be known to continue. Be concrete — name actual things.",
  "decisions": [{"what": "decision", "why": "reasoning"}],
  "mistakes": ["rejected approach and why"],
  "learnings": ["concrete thing discovered"],
  "constraints": ["hard requirement that cannot change"],
  "open_questions": ["unresolved item needing future attention"],
  "context": ["background a future session must know"],
  "deep_context": {},
  "tags": ["2 to 4 lowercase keywords"]
}
For deep_context: a concise nested object (max 3-4 key-value pairs) with core architecture or key technical decisions. Keep values short. Leave any array empty if not applicable.`

const MEMORY_PROMPT_FULL = `Map our entire conversation into a memory object. ${MEMORY_SCHEMA}`

function buildTargetedPrompt(instruction) {
  return `The user wants to save this specific thing from our conversation: "${instruction}"

Extract and capture only what's relevant to that. ${MEMORY_SCHEMA}`
}

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
    if (!(await canSave())) {
      track('trial_exhausted')
      showUpgradeToast()
      return
    }

    const prompt = command.instruction
      ? buildTargetedPrompt(command.instruction)
      : MEMORY_PROMPT_FULL

    showToast(command.instruction ? `Saving: "${command.instruction}"...` : 'Asking AI to map context...', 'loading')

    const host = window.location.hostname
    const msgSelector = RESPONSE_SELECTORS[host] || '.font-claude-response-body'
    const beforeCount = document.querySelectorAll(msgSelector).length

    const input = getInputEl()
    if (!input) {
      showToast('Could not find chat input', 'error')
      return
    }

    if (input.contentEditable === 'true') {
      input.focus()
      document.execCommand('insertText', false, prompt)
      input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    } else {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      setter.call(input, prompt)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    await new Promise(resolve => setTimeout(resolve, 150))
    await submitPrompt(input)

    showToast('Waiting for AI response...', 'loading')
    const responseText = await waitForNewResponse(msgSelector, beforeCount)

    if (!responseText) {
      showToast('No response received — try again', 'error')
      return
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      showToast('AI did not return valid JSON', 'error')
      return
    }

    let memory
    try {
      memory = JSON.parse(jsonMatch[0])
    } catch (e) {
      showToast('Could not parse AI response', 'error')
      return
    }

    showToast('Embedding and saving...', 'loading')
    const saved = await saveMemory(memory)

    // Only burn a trial credit once the save actually succeeds.
    await incrementSaveCount()
    const lic = await getLicenseState()
    const leftSuffix = lic.pro
      ? ''
      : ` · ${Math.max(0, lic.limit - lic.savesUsed)} free saves left`

    track('memory_saved', {
      source: saved.source,
      targeted: !!command.instruction,
      embedded: !!saved.embedding
    })

    if (saved.embedding) {
      showToast(`Saved — ${saved.project}${leftSuffix}`, 'success')
    } else {
      showToast(`Saved without embedding — check console (F12)`, 'error')
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
    track('memory_retrieved', { source: window.location.hostname, count: items.length, filter: command.filter })
    injectText(items.map(i => i.text).join('\n'))
    const { donkeyHasInjected } = await new Promise(r => chrome.storage.local.get('donkeyHasInjected', r))
    if (!donkeyHasInjected) chrome.storage.local.set({ donkeyHasInjected: true })
    showMemoryPanel(items, remaining => {
      injectText(remaining.map(i => i.text).join('\n'))
    }, !donkeyHasInjected)
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
