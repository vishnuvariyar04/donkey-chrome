// Relative time formatter
function getRelativeTime(timestamp) {
  if (!timestamp) return 'never'
  const ms = Date.now() - timestamp
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const hrs = Math.floor(min / 60)
  const days = Math.floor(hrs / 24)

  if (sec < 60) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Render memories tab
async function render() {
  const container = document.getElementById('projects')
  const projects = await getAllProjects()

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"></path>
        </svg>
        <div class="empty-title">No memories saved yet</div>
        <div class="empty-desc">Type "@donkey save" in Claude, ChatGPT, or Gemini to capture facts, decisions, and instructions.</div>
      </div>
    `
    return
  }

  projects.sort((a, b) => b.lastUpdated - a.lastUpdated)

  container.innerHTML = projects.map(p => `
    <div class="project" data-id="${p.name}">
      <div class="project-title-row">
        <div class="project-name">${p.name}</div>
        <button class="delete-project-btn" data-project="${p.name}" title="Delete project">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
      <div class="project-meta">${p.memoryCount} memory object${p.memoryCount !== 1 ? 's' : ''} · saved ${getRelativeTime(p.lastUpdated)}</div>
    </div>
  `).join('')

  // Wire up individual delete buttons
  document.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const projectName = btn.getAttribute('data-project')
      if (confirm(`Are you sure you want to delete all memory for "${projectName}"?`)) {
        await deleteProject(projectName)
        render()
      }
    })
  })
}

// Delete a single project and its memories
async function deleteProject(projectName) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['memories', 'projects'], (data) => {
      const memories = data.memories || {}
      const projects = data.projects || {}

      // Delete the project entry
      delete projects[projectName]

      // Filter out memories belonging to this project
      const updatedMemories = {}
      for (const id in memories) {
        if (memories[id].project !== projectName) {
          updatedMemories[id] = memories[id]
        }
      }

      chrome.storage.local.set({ memories: updatedMemories, projects }, () => {
        resolve()
      })
    })
  })
}

// Render retrieval logs
async function renderTrace() {
  const data = await new Promise(resolve => chrome.storage.local.get('lastSearchTrace', resolve))
  const t = data.lastSearchTrace
  if (!t) return

  document.getElementById('trace-section').style.display = 'block'
  document.getElementById('trace-query').innerHTML =
    `Searching <b>"${t.query}"</b> <span style="color:#64748b;float:right">${new Date(t.timestamp).toLocaleTimeString()}</span>`

  document.getElementById('trace-rows').innerHTML = t.trace.map(r => `
    <div class="trace-row ${r.included ? 'pass' : 'fail'}">
      <span class="trace-badge">${r.included ? '✓' : '✕'}</span>
      <div style="flex: 1;">
        <div class="trace-name">${r.project}</div>
        <div class="trace-detail">${r.score !== null ? `Similarity: ${(r.score * 100).toFixed(0)}% · ` : ''}${r.reason}</div>
      </div>
    </div>
  `).join('')
}

// Tab navigation handler
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn')
  const tabContents = document.querySelectorAll('.tab-content')

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab')

      tabButtons.forEach(b => b.classList.remove('active'))
      tabContents.forEach(c => c.classList.remove('active'))

      btn.classList.add('active')
      document.getElementById(`tab-${tabId}`).classList.add('active')
    })
  })
}

// Settings inputs and controls

// Erase database controls
function wireDeleteControls() {
  const clearBtn = document.getElementById('clear-btn')
  const confirmBar = document.getElementById('confirm-bar')
  const confirmYes = document.getElementById('confirm-yes')
  const confirmNo = document.getElementById('confirm-no')

  clearBtn.addEventListener('click', () => {
    confirmBar.style.display = 'block'
    clearBtn.style.display = 'none'
  })

  confirmNo.addEventListener('click', () => {
    confirmBar.style.display = 'none'
    clearBtn.style.display = 'block'
  })

  confirmYes.addEventListener('click', () => {
    chrome.storage.local.remove(['memories', 'projects', 'lastSearchTrace'], () => {
      confirmBar.style.display = 'none'
      clearBtn.style.display = 'block'
      document.getElementById('projects').innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"></path>
          </svg>
          <div class="empty-title">No memories saved yet</div>
          <div class="empty-desc">Type "@donkey save" in Claude, ChatGPT, or Gemini to capture facts, decisions, and instructions.</div>
        </div>
      `
      document.getElementById('trace-section').style.display = 'none'
    })
  })
}

// Plan / lifetime-deal controls
async function renderPlan() {
  const lic = await getLicenseState()
  const statusBadge = document.getElementById('plan-status')
  const planText = document.getElementById('plan-text')
  const upgradeBtn = document.getElementById('upgrade-btn')
  const licenseRow = document.getElementById('license-row')

  if (lic.pro) {
    statusBadge.classList.add('online')
    statusBadge.classList.remove('offline')
    planText.textContent = 'Lifetime — unlimited'
    upgradeBtn.style.display = 'none'
    licenseRow.style.display = 'none'
  } else {
    statusBadge.classList.remove('online')
    const left = Math.max(0, lic.limit - lic.savesUsed)
    planText.textContent = `Free trial — ${left} of ${lic.limit} saves left`
    upgradeBtn.style.display = 'flex'
    licenseRow.style.display = 'flex'
  }
}

function wirePlanControls() {
  document.getElementById('upgrade-btn').addEventListener('click', () => {
    track('upgrade_clicked', { placement: 'settings' })
    chrome.tabs.create({ url: DONKEY_LTD_URL })
  })

  document.getElementById('activate-btn').addEventListener('click', async () => {
    const input = document.getElementById('license-input')
    const msg = document.getElementById('license-msg')
    msg.style.display = 'flex'
    msg.textContent = 'Checking…'

    const result = await activateLicense(input.value)
    if (result.ok) {
      track('license_activated')
      msg.textContent = '✓ Activated — unlimited unlocked'
      input.value = ''
      renderPlan()
    } else {
      msg.textContent = `✕ ${result.error}`
    }
  })
}

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  render()
  initTabs()
  wireDeleteControls()
  renderTrace()
  renderPlan()
  wirePlanControls()
})
