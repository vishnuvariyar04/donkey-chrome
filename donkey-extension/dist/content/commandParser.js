function parseCommand(raw) {
  const text = raw.replace('@donkey', '').trim()
  const lower = text.toLowerCase()

  if (/^save(\s|$)/i.test(text) || text === '') {
    const instructionMatch = text.match(/^save\s+(.+)$/i)
    return { action: 'save', instruction: instructionMatch?.[1]?.trim() || null }
  }

  // 1. Detect filter intent using context-aware matching to avoid matching filter keywords that are part of project names
  let filter = 'full'
  let cleanedText = text

  const filterPatterns = [
    { type: 'mistakes', baseRegexStr: 'mistake[s]?|went wrong|fail(?:ed|ure)?|avoid|rejected|didn[\'’]t work|bad approach' },
    { type: 'decisions', baseRegexStr: 'decision[s]?|chose|picked|went with|selected|settled on|why did' },
    { type: 'learnings', baseRegexStr: 'learn(?:ing[s]?|ed|s)?|discover[y]?[s]?|found out|realized|figured out|insight[s]?' },
    { type: 'constraints', baseRegexStr: 'constraint[s]?|limit[s]?|requirement[s]?|must|cannot|can[\'’]t|restriction[s]?' },
    { type: 'open_questions', baseRegexStr: 'question[s]?|unclear|unknown|open|unresolved|wonder|pending' },
    { type: 'context', baseRegexStr: 'context|background|about|overview|summary|what was' }
  ]

  const prepositions = 'from|in|of|about|on|for|to'
  const startHelpers = 'give\\s+me\\s+|show\\s+|get\\s+|retrieve\\s+|use\\s+'

  for (const f of filterPatterns) {
    const prepRegex = new RegExp('\\b(' + f.baseRegexStr + ')\\b\\s+(?:' + prepositions + ')\\b', 'gi')
    const startRegex = new RegExp('^(?:' + startHelpers + ')?\\b(' + f.baseRegexStr + ')\\b', 'gi')

    let match = text.match(prepRegex)
    if (match) {
      filter = f.type
      cleanedText = cleanedText.replace(prepRegex, '')
      break
    }

    match = text.match(startRegex)
    if (match) {
      filter = f.type
      cleanedText = cleanedText.replace(startRegex, '')
      break
    }
  }

  // 2. Strip general helper/filler words
  const helperRegex = /\b(use|project[s]?|from|give\s+me|get|avoid|in|for|show|retrieve|what\s+is|what\s+are|please|me|tell|display|a|the|an|of|with)\b/gi
  cleanedText = cleanedText.replace(helperRegex, '')

  // Clean up whitespace
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim()

  return { action: 'use', query: cleanedText, filter }
}

