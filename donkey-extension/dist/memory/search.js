function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function getQueryEmbedding(text) {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ type: 'EMBED', text }, response => {
        if (chrome.runtime.lastError || !response?.success) resolve(null)
        else resolve(response.vector)
      })
    } catch (e) {
      resolve(null)
    }
  })
}

async function searchMemories(query, topK = 5) {
  const allMemories = await getAllMemories()
  if (!query || allMemories.length === 0) return allMemories

  // 1. Try to find a matching project first
  const projects = await getAllProjects()
  const cleanQuery = query.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, ' ')
  const queryTokens = cleanQuery.split(/[\s-]+/).filter(Boolean)

  let matchedProjectNames = []
  let semanticQuery = query

  if (queryTokens.length > 0 && projects.length > 0) {
    const sluggedQuery = queryTokens.join('-')
    const exactMatch = projects.find(p => p.name === sluggedQuery || p.name === query.trim().toLowerCase())

    if (exactMatch) {
      matchedProjectNames = [exactMatch.name]
      semanticQuery = ""
    } else {
      // Find candidate projects: where either the project name contains all query tokens,
      // or the query contains all tokens of the project name.
      const candidates = projects.filter(p => {
        const projectTokens = p.name.split('-').filter(Boolean)
        if (projectTokens.length === 0) return false
        const queryIsSubset = queryTokens.every(t => projectTokens.includes(t))
        const projectIsSubset = projectTokens.every(t => queryTokens.includes(t))
        return queryIsSubset || projectIsSubset
      })

      if (candidates.length > 0) {
        matchedProjectNames = candidates.map(c => c.name)

        // Remove matched project name words from semantic query
        const matchedTokens = new Set(candidates.flatMap(c => c.name.split('-')))
        const remainingTokens = queryTokens.filter(t => !matchedTokens.has(t))
        semanticQuery = remainingTokens.join(' ')
      }
    }
  }

  const trace = []
  let results = []

  // Determine target memories
  const isStrictProjectSearch = matchedProjectNames.length > 0
  const targetMemories = isStrictProjectSearch
    ? allMemories.filter(m => matchedProjectNames.includes(m.project))
    : allMemories

  if (isStrictProjectSearch) {
    // If the remaining semantic query is empty, return all memories of the matched project(s)
    if (!semanticQuery.trim()) {
      targetMemories.forEach(m => {
        trace.push({
          project: m.project,
          score: 1.0,
          included: true,
          reason: 'exact or token project match'
        })
      })
      
      try {
        chrome.storage.local.set({ lastSearchTrace: { query, timestamp: Date.now(), trace } })
      } catch (e) {}

      // Deduplicate by project
      const seenProjects = new Set()
      return targetMemories.filter(m => {
        if (seenProjects.has(m.project)) return false
        seenProjects.add(m.project)
        return true
      })
    }
  }

  // Perform semantic search on targetMemories (either the filtered ones or all)
  const withEmbeddings = targetMemories.filter(m => m.embedding)
  const withoutEmbeddings = targetMemories.filter(m => !m.embedding)

  const THRESHOLD = 0.4
  const RATIO = 0.82

  if (withEmbeddings.length > 0) {
    const searchString = semanticQuery || query
    const queryVec = await getQueryEmbedding(searchString)
    if (queryVec) {
      const scored = withEmbeddings
        .map(m => ({ memory: m, score: cosineSimilarity(queryVec, m.embedding) }))
        .sort((a, b) => b.score - a.score)

      const topScore = scored[0]?.score ?? 0

      scored.forEach(({ memory: m, score }) => {
        const passThreshold = score > THRESHOLD
        const passRatio = topScore > 0 && (score / topScore) > RATIO
        const included = passThreshold && passRatio
        let reason = ''
        if (!passThreshold) reason = `score ${score.toFixed(3)} ≤ ${THRESHOLD}`
        else if (!passRatio) reason = `ratio ${(score/topScore).toFixed(3)} ≤ ${RATIO} (top: ${topScore.toFixed(3)})`
        else reason = `score ${score.toFixed(3)}, ratio ${(score/topScore).toFixed(3)}`
        
        trace.push({ project: m.project, score: +score.toFixed(4), included, reason })
        if (included) results.push(m)
      })
    }
  }

  // For memories without embeddings:
  // If we matched the project strictly, we should still return them!
  if (withoutEmbeddings.length > 0) {
    withoutEmbeddings.forEach(m => {
      if (isStrictProjectSearch) {
        trace.push({ project: m.project, score: null, included: true, reason: 'project match, no embedding' })
        results.push(m)
      } else {
        trace.push({ project: m.project, score: null, included: false, reason: 'no embedding — re-save to enable semantic search' })
      }
    })
  }

  // Deduplicate by project — semantic results come first so they take priority
  const seenProjects = new Set()
  const deduped = results.filter(m => {
    if (seenProjects.has(m.project)) return false
    seenProjects.add(m.project)
    return true
  })

  try {
    chrome.storage.local.set({ lastSearchTrace: { query, timestamp: Date.now(), trace } })
  } catch (e) {}

  return deduped
}
