import { EXTRACTION_PROMPT } from './prompt.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    if (url.pathname === '/embed') {
      try {
        const { text } = await request.json()
        const result = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [text] })
        return new Response(JSON.stringify({ vector: result.data[0] }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        })
      }
    }

    try {
      const { messages } = await request.json()

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        })
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 4000,
          temperature: 0.1,
          messages: [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: JSON.stringify(messages) }
          ]
        })
      })

      const groqData = await groqResponse.json()

      if (!groqResponse.ok) {
        return new Response(JSON.stringify({ error: 'Groq API error', detail: groqData }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        })
      }

      const raw = groqData.choices[0].message.content
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      let memory
      try {
        memory = JSON.parse(cleaned)
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Parse failed', raw }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        })
      }

      return new Response(JSON.stringify(memory), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }
  }
}
