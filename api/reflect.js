// /api/reflect — Surfaces 4 reflections from the user's raw dump.
// POST { dump } → { reflections: {...} }

const Anthropic = require('@anthropic-ai/sdk').default;
const { SYSTEM_PROMPT, REFLECT_PROMPT } = require('../lib/prompts');

const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.Anthropic_API_Key || process.env.anthropic_api_key;
const client = new Anthropic({ apiKey: API_KEY });

module.exports = async (req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it in Vercel project env vars.' });
  }

  try {
    const { dump } = req.body;
    if (!dump || typeof dump !== 'string' || dump.length < 30) {
      return res.status(400).json({ error: 'dump is required and must be at least 30 characters' });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: REFLECT_PROMPT(dump) }],
    });

    const text = response.content[0]?.text || '';

    // Try to extract JSON — strip any preamble or code fences
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const firstBrace = jsonText.indexOf('{');
    if (firstBrace > 0) jsonText = jsonText.slice(firstBrace);

    let reflections;
    try {
      reflections = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse reflection JSON:', text.slice(0, 200));
      return res.status(502).json({
        error: 'Model returned unparseable output',
        detail: e.message,
        raw: text.slice(0, 500),
      });
    }

    return res.status(200).json({
      reflections,
      meta: {
        model: response.model,
        usage: response.usage,
      },
    });
  } catch (err) {
    console.error('reflect error:', err);
    return res.status(500).json({
      error: 'Reflection failed',
      detail: err.message,
    });
  }
};
