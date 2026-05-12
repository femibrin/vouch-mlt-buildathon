// /api/generate — Generates the chosen artifact (5 types).
// POST { dump, type, reflections?, jd?, feedback?, target_level?, sponsor?, ask?, targets? }
//   → { artifact: markdown, frame, meta }

const Anthropic = require('@anthropic-ai/sdk').default;
const { SYSTEM_PROMPT, ARTIFACT_PROMPTS } = require('../lib/prompts');

const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.Anthropic_API_Key || process.env.anthropic_api_key;
const client = new Anthropic({ apiKey: API_KEY });

const VALID_TYPES = ['performance_review', 'promo_case', 'interview_prep', 'sponsor_conversation', 'career_acceleration'];

const DEFAULT_FRAME = {
  performance_review: 'Redemption Sequence',
  promo_case: 'CAR · Competency-Mapped',
  interview_prep: 'STAR · JD-Mapped',
  sponsor_conversation: 'Briefing Memo',
  career_acceleration: 'Strategic Decision Memo',
};

// Model selection per artifact — Opus where prose density matters, Sonnet for the shorter / more structured outputs.
const MODEL_BY_TYPE = {
  performance_review: 'claude-opus-4-7',
  promo_case: 'claude-sonnet-4-6',
  interview_prep: 'claude-opus-4-7',
  sponsor_conversation: 'claude-sonnet-4-6',
  career_acceleration: 'claude-opus-4-7',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it in Vercel project env vars.' });
  }

  try {
    const { dump, type, reflections, jd, feedback, target_level, sponsor, ask, targets } = req.body;

    if (!dump || typeof dump !== 'string' || dump.length < 30) {
      return res.status(400).json({ error: 'dump is required and must be at least 30 characters' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const builder = ARTIFACT_PROMPTS[type];
    const extra = { jd, feedback, target_level, sponsor, ask, targets };
    const userPrompt = builder(dump, reflections, extra);

    const model = MODEL_BY_TYPE[type] || 'claude-opus-4-7';
    const response = await client.messages.create({
      model,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0]?.text || '';
    // Strip leading code fence if model added one
    const cleaned = text.replace(/^```(?:markdown|md)?\s*\n?/, '').replace(/\n?```\s*$/, '');

    return res.status(200).json({
      artifact: cleaned.trim(),
      frame: DEFAULT_FRAME[type],
      type,
      meta: {
        model: response.model,
        usage: response.usage,
      },
    });
  } catch (err) {
    console.error('generate error:', err);
    return res.status(500).json({
      error: 'Generation failed',
      detail: err.message,
    });
  }
};
