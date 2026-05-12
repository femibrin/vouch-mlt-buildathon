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

    // Cap dump size to keep total context manageable (~30K chars ≈ 7.5K tokens of input)
    const trimmedDump = dump.length > 30000 ? dump.slice(0, 30000) + '\n\n[...truncated for length]' : dump;

    // Haiku 4.5 — fastest model. Reflect is structured JSON extraction + classification.
    // Sonnet was hitting Vercel's 60s hobby-tier cap on dense dumps; Haiku finishes in time.
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: REFLECT_PROMPT(trimmedDump) }],
    });

    const text = response.content[0]?.text || '';

    // Robust JSON extraction — handles preambles, postscripts, code fences, BOM, smart quotes
    let jsonText = text.trim();

    // 1. Strip leading BOM if present
    if (jsonText.charCodeAt(0) === 0xFEFF) jsonText = jsonText.slice(1);

    // 2. Strip code fences if present
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    // 3. Slice from first { to last } — handles preamble AND postscript
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }

    // 4. Smart-quote normalization (rare but harmless)
    jsonText = jsonText.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    let reflections;
    try {
      reflections = JSON.parse(jsonText);
    } catch (e) {
      // Fallback: try once more with trailing-comma repair
      try {
        const repaired = jsonText.replace(/,(\s*[}\]])/g, '$1');
        reflections = JSON.parse(repaired);
      } catch (e2) {
        console.error('Failed to parse reflection JSON:', text.slice(0, 400));
        return res.status(502).json({
          error: 'Model returned unparseable output',
          detail: e.message,
          raw: text.slice(0, 800),
          stop_reason: response.stop_reason,
        });
      }
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
