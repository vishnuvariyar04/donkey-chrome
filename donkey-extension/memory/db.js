async function saveMemory(memoryObject) {
  const memory = {
    ...memoryObject,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    savedAt: Date.now(),
    source: (typeof window !== 'undefined' && window.location) ? window.location.hostname : 'unknown'
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['memories', 'projects'], (data) => {
      const memories = data.memories || {}
      const projects = data.projects || {}

      memories[memory.id] = memory

      const existing = projects[memory.project]
      projects[memory.project] = {
        name: memory.project,
        lastUpdated: Date.now(),
        memoryCount: existing ? existing.memoryCount + 1 : 1
      }

      chrome.storage.local.set({ memories, projects }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve(memory)
      })
    })
  })
}

async function getMemoriesByProject(projectName) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['memories'], (data) => {
      const query = projectName.toLowerCase()
      resolve(Object.values(data.memories || {}).filter(m => {
        const proj = m.project.toLowerCase()
        return proj === query || proj.includes(query) || query.includes(proj)
      }))
    })
  })
}

async function getAllMemories() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['memories'], (data) => {
      resolve(Object.values(data.memories || {}))
    })
  })
}

async function getAllProjects() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['projects'], (data) => {
      resolve(Object.values(data.projects || {}))
    })
  })
}
