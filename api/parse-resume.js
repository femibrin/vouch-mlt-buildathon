// /api/parse-resume — Parse a PDF resume into clean structured text using Claude's native PDF support.
// POST { pdf_b64, filename } → { text, meta }
//
// Vercel Hobby tier payload limit is ~4.5MB. Base64 encoding ≈ 1.37x raw size,
// so we cap raw PDF at 3MB (~4.1MB base64) to stay safely under the limit.

const Anthropic = require('@anthropic-ai/sdk').default;

const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.Anthropic_API_Key || process.env.anthropic_api_key;
const client = new Anthropic({ apiKey: API_KEY });

const MAX_BASE64_BYTES = 4_200_000; // ~3MB raw PDF after base64 encoding

const EXTRACT_PROMPT = `You're parsing a resume PDF for Vouch — a career articulation tool. The user has uploaded their resume as a PDF; we need it as clean, structured text so the AI can use it as standing context for every artifact going forward.

Extract the resume as readable plain text. Preserve structure:
- Name + contact (top)
- Each role: title, company, dates, then 2-6 bullet points capturing measurable outcomes
- Sections: Experience, Education, Skills, anything else relevant
- Do NOT add commentary, framing, or summary
- Do NOT use markdown headers (#, ##) — use simple line breaks and indentation
- Preserve metrics, company names, dates exactly as written
- Keep bullet points as "- " prefixed lines

Return ONLY the extracted text. No preamble, no "Here's the resume:" framing.`;

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
    const { pdf_b64, filename } = req.body;
    if (!pdf_b64 || typeof pdf_b64 !== 'string') {
      return res.status(400).json({ error: 'pdf_b64 is required (base64-encoded PDF, no data: prefix)' });
    }
    if (pdf_b64.length > MAX_BASE64_BYTES) {
      return res.status(413).json({
        error: 'PDF too large. Max ~3MB. For a longer resume, paste the text directly.',
        size_kb: Math.round(pdf_b64.length / 1024),
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdf_b64,
            },
          },
          {
            type: 'text',
            text: EXTRACT_PROMPT,
          },
        ],
      }],
    });

    const text = response.content[0]?.text || '';
    if (!text || text.length < 50) {
      return res.status(502).json({
        error: 'Could not extract meaningful text from the PDF. It may be a scanned image without OCR — try a text-based PDF, or paste the text directly.',
      });
    }

    return res.status(200).json({
      text: text.trim(),
      meta: {
        filename: filename || 'resume.pdf',
        model: response.model,
        usage: response.usage,
      },
    });
  } catch (err) {
    console.error('parse-resume error:', err);
    const detail = err.message || 'Unknown error';
    // Anthropic sometimes returns "invalid_request_error" for unsupported PDFs (scans, encrypted, etc.)
    if (detail.includes('document') || detail.includes('pdf')) {
      return res.status(400).json({
        error: 'PDF could not be processed. It may be image-only, encrypted, or in an unsupported format. Paste the text directly instead.',
        detail,
      });
    }
    return res.status(500).json({ error: 'Parse failed', detail });
  }
};
