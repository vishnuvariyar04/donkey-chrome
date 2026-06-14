async function searchMemories(query, projectFilter = null) {
  let memories = projectFilter
    ? await getMemoriesByProject(projectFilter)
    : await getAllMemories()

  if (!query) return memories

  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2)

  return memories
    .map(memory => {
      // Score each memory against the query keywords
      let score = 0
      const searchable = JSON.stringify(memory).toLowerCase()

      keywords.forEach(kw => {
        // Tag match is weighted highest
        if (memory.tags?.some(t => t.includes(kw))) score += 5
        // Project name match
        if (memory.project?.toLowerCase().includes(kw)) score += 3
        // Any field match
        if (searchable.includes(kw)) score += 1
      })

      return { memory, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ memory }) => memory)
}
