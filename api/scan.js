export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing API key. In your Vercel dashboard go to Settings → Environment Variables and add ANTHROPIC_API_KEY with your key from https://console.anthropic.com/keys'
    })
  }

  try {
    const { messages, model, max_tokens } = req.body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1500,
        messages: messages
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: (data.error && data.error.message) ? data.error.message : 'Anthropic API error: ' + response.status
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message })
  }
}
