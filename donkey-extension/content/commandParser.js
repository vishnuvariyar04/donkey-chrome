function parseCommand(raw) {
  // Normalise: lower case and trim
  const text = raw.replace('@donkey', '').trim().toLowerCase()

  // @donkey save [project]
  if (text === 'save' || text === '') {
    return { action: 'save' }
  }
  const saveMatch = text.match(/^save\s+(?:project\s+)?(.+)$/)
  if (saveMatch) {
    return { action: 'save', project: saveMatch[1].trim() }
  }

  // Strip leading "use " if present to support both "@donkey use learnings from X" and "@donkey learnings from X"
  let clean = text.replace(/^use\s+/, '').trim()

  // 1. Mistakes
  const mistakesMatch = clean.match(/^(?:avoid\s+)?mistakes\s+(?:in\s+|from\s+|of\s+)?(?:project\s+)?(.+)$/)
  if (mistakesMatch) {
    return { action: 'use', project: mistakesMatch[1].trim(), filter: 'mistakes' }
  }

  // 2. Decisions
  const decisionsMatch = clean.match(/^decisions\s+(?:from\s+|in\s+|of\s+)?(?:project\s+)?(.+)$/)
  if (decisionsMatch) {
    return { action: 'use', project: decisionsMatch[1].trim(), filter: 'decisions' }
  }

  // 3. Learnings
  const learningsMatch = clean.match(/^learnings\s+(?:from\s+|in\s+|of\s+)?(?:project\s+)?(.+)$/)
  if (learningsMatch) {
    return { action: 'use', project: learningsMatch[1].trim(), filter: 'learnings' }
  }

  // 4. Constraints
  const constraintsMatch = clean.match(/^constraints\s+(?:from\s+|in\s+|of\s+)?(?:project\s+)?(.+)$/)
  if (constraintsMatch) {
    return { action: 'use', project: constraintsMatch[1].trim(), filter: 'constraints' }
  }

  // 5. Context / Background
  const contextMatch = clean.match(/^(?:context|background)\s+(?:from\s+|in\s+|of\s+)?(?:project\s+)?(.+)$/)
  if (contextMatch) {
    return { action: 'use', project: contextMatch[1].trim(), filter: 'context' }
  }

  // 6. Open Questions
  const questionsMatch = clean.match(/^(?:open\s+)?questions\s+(?:from\s+|in\s+|of\s+)?(?:project\s+)?(.+)$/)
  if (questionsMatch) {
    return { action: 'use', project: questionsMatch[1].trim(), filter: 'open_questions' }
  }

  // 7. Full project fallback
  // Strip "project " if present at start of clean
  const projectFallback = clean.replace(/^project\s+/, '').trim()
  return { action: 'use', project: projectFallback, filter: 'full' }
}
