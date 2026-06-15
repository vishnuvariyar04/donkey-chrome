function parseCommand(raw) {
  const text = raw.replace('@donkey', '').trim()
  const lower = text.toLowerCase()

  // save [optional project name override]
  if (/^save(\s|$)/i.test(text) || text === '') {
    const projectMatch = text.match(/^save\s+(.+)$/i)
    return { action: 'save', project: projectMatch?.[1]?.trim() }
  }

  // Detect filter intent from natural language — keywords can appear anywhere
  let filter = 'full'
  if (/mistake|went wrong|fail|avoid|rejected|didn.t work|bad approach/.test(lower)) filter = 'mistakes'
  else if (/decision|chose|picked|went with|selected|settled on|why did/.test(lower)) filter = 'decisions'
  else if (/learn|discover|found out|realized|figured out|insight/.test(lower)) filter = 'learnings'
  else if (/constraint|limit|requirement|must|cannot|can.t|restriction/.test(lower)) filter = 'constraints'
  else if (/question|unclear|unknown|open|unresolved|wonder|pending/.test(lower)) filter = 'open_questions'
  else if (/context|background|about|overview|summary|what was/.test(lower)) filter = 'context'

  // Pass the full natural language text as the search query — semantic search handles the rest
  return { action: 'use', query: text, filter }
}
