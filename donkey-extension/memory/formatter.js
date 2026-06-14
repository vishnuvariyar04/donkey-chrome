function formatMemory(memory, filter = 'full') {

  const lines = []
  lines.push(`--- Memory: ${memory.project} (saved ${new Date(memory.savedAt).toLocaleDateString()}) ---`)

  if (filter === 'full' || filter === 'summary') {
    if (memory.summary) lines.push(`\nContext: ${memory.summary}`)
  }

  if (filter === 'full' || filter === 'decisions') {
    if (memory.decisions?.length) {
      lines.push('\nDecisions made:')
      memory.decisions.forEach(d => lines.push(`- ${d.what} (because: ${d.why})`))
    }
  }

  if (filter === 'full' || filter === 'mistakes') {
    if (memory.mistakes?.length) {
      lines.push('\nMistakes and rejected approaches:')
      memory.mistakes.forEach(m => lines.push(`- ${m}`))
    }
  }

  if (filter === 'full' || filter === 'learnings') {
    if (memory.learnings?.length) {
      lines.push('\nLearnings:')
      memory.learnings.forEach(l => lines.push(`- ${l}`))
    }
  }

  if (filter === 'full' || filter === 'constraints') {
    if (memory.constraints?.length) {
      lines.push('\nConstraints:')
      memory.constraints.forEach(c => lines.push(`- ${c}`))
    }
  }

  if (filter === 'full' || filter === 'open_questions') {
    if (memory.open_questions?.length) {
      lines.push('\nOpen questions:')
      memory.open_questions.forEach(q => lines.push(`- ${q}`))
    }
  }

  if (filter === 'full' || filter === 'context') {
    if (memory.context?.length) {
      lines.push('\nBackground context:')
      memory.context.forEach(c => lines.push(`- ${c}`))
    }
  }

  if (filter === 'full') {
    if (memory.deep_context && Object.keys(memory.deep_context).length > 0) {
      lines.push('\nDetailed context:')
      lines.push(JSON.stringify(memory.deep_context, null, 2))
    }
  }

  lines.push('--- End of memory ---\n')
  return lines.join('\n')
}

function formatMemories(memories, filter = 'full') {
  return memories.map(m => formatMemory(m, filter)).join('\n')
}
