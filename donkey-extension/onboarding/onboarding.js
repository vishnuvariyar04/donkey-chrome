document.addEventListener('DOMContentLoaded', () => {
  initSimulator()
})

// 2. Chat Simulator
function initSimulator() {
  const chatMessages = document.getElementById('chat-messages')
  const input = document.getElementById('sandbox-input')
  const sendBtn = document.getElementById('send-btn')
  const menu = document.getElementById('autocomplete-menu')
  const items = document.querySelectorAll('.autocomplete-item')
  const toast = document.getElementById('injection-toast')

  let activeIndex = 0
  let isMenuVisible = false

  // Resize textarea on content height
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight - 4}px`

    // Check trigger autocomplete
    const val = input.value
    if (val.startsWith('@donkey') && !val.includes(' ', 8)) {
      showMenu()
    } else {
      hideMenu()
    }
  })

  function showMenu() {
    menu.style.display = 'flex'
    isMenuVisible = true
    updateActiveItem()
  }

  function hideMenu() {
    menu.style.display = 'none'
    isMenuVisible = false
  }

  function updateActiveItem() {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('active')
        // Scroll menu if needed
        item.scrollIntoView({ block: 'nearest' })
      } else {
        item.classList.remove('active')
      }
    })
  }

  // Keyboard navigation inside text input
  input.addEventListener('keydown', (e) => {
    if (isMenuVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        activeIndex = (activeIndex + 1) % items.length
        updateActiveItem()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        activeIndex = (activeIndex - 1 + items.length) % items.length
        updateActiveItem()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        selectItem(items[activeIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        hideMenu()
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    }
  })

  // Mouse select item
  items.forEach((item, idx) => {
    item.addEventListener('mouseenter', () => {
      activeIndex = idx
      updateActiveItem()
    })
    item.addEventListener('click', () => {
      selectItem(item)
    })
  })

  function selectItem(item) {
    const cmd = item.getAttribute('data-cmd')
    input.value = cmd
    hideMenu()
    input.focus()
    // Auto resize
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight - 4}px`
  }

  // Send message
  sendBtn.addEventListener('click', sendMessage)

  function appendMessage(sender, text, isMarkdown = false) {
    const msgDiv = document.createElement('div')
    msgDiv.className = `message ${sender}`

    const contentDiv = document.createElement('div')
    contentDiv.className = 'message-content'

    if (isMarkdown) {
      // Very basic formatting converter
      let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
      contentDiv.innerHTML = formatted
    } else {
      contentDiv.innerText = text
    }

    msgDiv.appendChild(contentDiv)
    chatMessages.appendChild(msgDiv)
    chatMessages.scrollTop = chatMessages.scrollHeight
    return msgDiv
  }

  function sendMessage() {
    const text = input.value.trim()
    if (!text) return

    appendMessage('user', text)
    input.value = ''
    input.style.height = 'auto'
    hideMenu()

    // Process commands in simulator
    setTimeout(() => {
      if (text === '@donkey save') {
        simulateSave()
      } else if (text.startsWith('@donkey use') || text.includes('mock-auth')) {
        simulateUse(text)
      } else {
        simulateNormalChat(text)
      }
    }, 600)
  }

  // 1. Simulate saving context
  function simulateSave() {
    const msgDiv = appendMessage('assistant', 'Starting memory extraction...')
    const content = msgDiv.querySelector('.message-content')

    // Append loading bar
    const progress = document.createElement('div')
    progress.className = 'progress-container'
    progress.innerHTML = '<div class="progress-bar"></div>'

    const label = document.createElement('div')
    label.className = 'progress-label'
    label.textContent = 'Scraping conversation history...'

    content.appendChild(progress)
    content.appendChild(label)

    setTimeout(() => {
      label.textContent = 'Contacting Cloudflare proxy worker...'
    }, 500)

    setTimeout(() => {
      label.textContent = 'Storing structured memory in IndexedDB...'
    }, 1000)

    setTimeout(() => {
      content.innerHTML = `
        <p>🫏 <strong>Donkey:</strong> Scraped 12 turns of active conversation.</p>
        <p>Memory extracted and saved locally under project <strong><code>mock-auth</code></strong>!</p>
        <p style="margin-top:8px;padding-left:10px;border-left:2px solid #818cf8;font-size:11px;color:#94a3b8">
          <strong>Summary:</strong> Auth system using JWT sessions and MongoDB storage.<br>
          <strong>Decisions:</strong> 2 captured (JWT for sessions, MongoDB for auth)<br>
          <strong>Mistakes:</strong> 1 captured (Avoid token variables in memory)
        </p>
      `
    }, 1500)
  }

  // 2. Simulate injecting memory
  function simulateUse(command) {
    // Show toast notification slide-in
    toast.classList.add('show')
    setTimeout(() => {
      toast.classList.remove('show')
    }, 3000)

    // Append assistant response showing injection
    appendMessage('assistant', `🫏 **Donkey:** Injected memory block for **\`mock-auth\`** into your chat input!

See the text in the input box below. You can send this formatted context straight to the AI model in your next message.`, true)

    // Place the memory text block in the input
    const memoryText = `--- Memory: mock-auth (saved 6/17/2026) ---
Context: Node.js authentication module using JWT.
Decisions:
- Using JWT for sessions (because: scalable stateless auth)
- MongoDB for user credentials storage (because: flexible document schema)
Mistakes:
- Using local variable state for active tokens (caused token leaks on server crash)
--- End of memory ---

`
    input.value = memoryText
    input.focus()
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight - 4}px`
  }

  // 3. Normal chat fallback inside simulator
  function simulateNormalChat(text) {
    appendMessage('assistant', `🤖 **AI Assistant:** I received your message: "${text}"

To test **Donkey's** core functionality:
1. Type **\`@donkey save\`** and press Enter to simulate saving this conversation thread.
2. Select **\`@donkey use mock-auth\`** to see how Donkey formats and injects memories into your input!`, true)
  }
}
