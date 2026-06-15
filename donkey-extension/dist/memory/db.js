async function embedText(text) {
  for (let i = 0; i < 3; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000 * i))

    const result = await new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'EMBED', text }, response => {
          const err = chrome.runtime.lastError?.message
          if (err) resolve({ error: err })
          else if (!response?.success) resolve({ error: response?.error || 'no response' })
          else resolve({ vector: response.vector })
        })
      } catch (e) {
        resolve({ error: e.message })
      }
    })

    if (result.vector) return result.vector
    console.warn(`Donkey embed attempt ${i + 1} failed:`, result.error)
  }

  return null
}

function normalizeMemory(raw) {
  return {
    project: (raw.project || 'untagged').toLowerCase().trim().replace(/\s+/g, '-'),
    summary: raw.summary || '',
    richText: raw.richText || '',
    decisions: Array.isArray(raw.decisions) ? raw.decisions : [],
    mistakes: Array.isArray(raw.mistakes) ? raw.mistakes : [],
    learnings: Array.isArray(raw.learnings) ? raw.learnings : [],
    constraints: Array.isArray(raw.constraints) ? raw.constraints : [],
    open_questions: Array.isArray(raw.open_questions) ? raw.open_questions : [],
    context: Array.isArray(raw.context) ? raw.context : [],
    deep_context: raw.deep_context && typeof raw.deep_context === 'object' ? raw.deep_context : {},
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => t.toLowerCase().trim()) : []
  }
}

async function saveMemory(memoryObject) {
  const normalized = normalizeMemory(memoryObject)

  // Build a rich text blob for embedding: narrative + summary + key facts
  const textToEmbed = [
    normalized.richText,
    normalized.summary,
    normalized.tags.join(' '),
    normalized.learnings.join(' '),
    normalized.mistakes.join(' '),
    normalized.decisions.map(d => `${d.what} ${d.why}`).join(' '),
    normalized.context.join(' ')
  ].filter(Boolean).join(' ')

  const embedding = await embedText(textToEmbed)

  const memory = {
    ...normalized,
    embedding,
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
