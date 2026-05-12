// /api/suggest-jd — Generates a plausible JD based on the user's resume + direction
// POST { resume, direction? } → { jd, role_title }

const Anthropic = require('@anthropic-ai/sdk').default;

const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.Anthropic_API_Key || process.env.anthropic_api_key;
const client = new Anthropic({ apiKey: API_KEY });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' });
  }

  try {
    const { resume, direction } = req.body;
    if (!resume || typeof resume !== 'string' || resume.length < 100) {
      return res.status(400).json({ error: 'resume is required (paste at least 100 chars of resume content)' });
    }

    const prompt = `Read this resume and generate a plausible, specific job description for a role this person could plausibly target as their next move.

The JD should be:
- Realistic — a role that exists at a company archetype matching their profile (FAANG / scale-up / enterprise / startup)
- Stretching — at or one level above where they're currently demonstrated, not just lateral
- Specific — use real-sounding role title, company archetype, and concrete responsibilities
- Honest about the gap — include 1-2 nice-to-haves the user may not yet have, so the AI's later interview-prep can address them

Return ONLY valid JSON with this shape:

{
  "role_title": "Specific role title — e.g., 'Senior Product Manager, Enterprise AI'",
  "company_archetype": "Company archetype — e.g., 'Series C enterprise AI startup, ~250 employees'",
  "jd": "Full job description as a multi-paragraph string. Include: About the role, About you (required), Bonus (nice-to-have). 300-500 words."
}

USER PREFERENCE (optional direction):
${direction || '(no specific direction — pick the most plausible stretch role from the resume)'}

RESUME:
${resume}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '';
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const firstBrace = jsonText.indexOf('{');
    if (firstBrace > 0) jsonText = jsonText.slice(firstBrace);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      return res.status(502).json({ error: 'Model returned unparseable output', detail: e.message });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('suggest-jd error:', err);
    return res.status(500).json({ error: 'JD suggestion failed', detail: err.message });
  }
};
