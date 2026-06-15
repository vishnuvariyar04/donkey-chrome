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

  const withEmbeddings = allMemories.filter(m => m.embedding)
  const withoutEmbeddings = allMemories.filter(m => !m.embedding)

  const THRESHOLD = 0.4
  const RATIO = 0.82
  const results = []
  const trace = []

  if (withEmbeddings.length > 0) {
    const queryVec = await getQueryEmbedding(query)
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

  if (withoutEmbeddings.length > 0) {
    withoutEmbeddings.forEach(m => {
      trace.push({ project: m.project, score: null, included: false, reason: 'no embedding — re-save to enable semantic search' })
    })
  }

  // Deduplicate by project — semantic results come first so they take priority
  const seenProjects = new Set()
  const deduped = results.filter(m => {
    if (seenProjects.has(m.project)) return false
    seenProjects.add(m.project)
    return true
  })

  try { chrome.storage.local.set({ lastSearchTrace: { query, timestamp: Date.now(), trace } }) } catch (e) {}

  return deduped
}
