async function render() {
  const container = document.getElementById('projects')
  const projects = await getAllProjects()

  if (projects.length === 0) {
    container.innerHTML = '<div class="empty">No memories saved yet.<br>Use @donkey save in any AI chat.</div>'
    return
  }

  projects.sort((a, b) => b.lastUpdated - a.lastUpdated)

  container.innerHTML = projects.map(p => `
    <div class="project">
      <div class="project-name">${p.name}</div>
      <div class="project-meta">${p.memoryCount} memory object${p.memoryCount !== 1 ? 's' : ''} · last saved ${new Date(p.lastUpdated).toLocaleDateString()}</div>
    </div>
  `).join('')
}

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
      document.getElementById('projects').innerHTML =
        '<div class="empty">No memories saved yet.<br>Use @donkey save in any AI chat.</div>'
      document.getElementById('trace-section').style.display = 'none'
    })
  })
}

async function renderTrace() {
  const data = await new Promise(resolve => chrome.storage.local.get('lastSearchTrace', resolve))
  const t = data.lastSearchTrace
  if (!t) return

  document.getElementById('trace-section').style.display = 'block'
  document.getElementById('trace-query').innerHTML =
    `<b>"${t.query}"</b> <span style="color:#9ca3af">· ${new Date(t.timestamp).toLocaleTimeString()}</span>`

  document.getElementById('trace-rows').innerHTML = t.trace.map(r => `
    <div class="trace-row ${r.included ? 'pass' : 'fail'}">
      <span class="trace-badge">${r.included ? '✅' : '❌'}</span>
      <div>
        <div class="trace-name">${r.project}</div>
        <div class="trace-detail">${r.score !== null ? `score: ${r.score} · ` : ''}${r.reason}</div>
      </div>
    </div>
  `).join('')
}

render()
wireDeleteControls()
renderTrace()
