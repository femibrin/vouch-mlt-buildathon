# Vouch

> *"I knew I'd done the work. I just couldn't say it."*

**Vouch is a career articulation and acceleration engine.** It closes the **evidence gap** — the structural distance between the work you've done and the receipts the people deciding your trajectory can actually see, remember, and carry.

Built by [Femi Brinson](https://github.com/femibrin) and [Austin Hood](https://github.com/) for the **MLT20 AI Buildathon** · Careers & Future of Work track.

🔗 **Live demo:** https://vouch-prototype-sage.vercel.app

---

## The problem

For over a decade, mid-career stall has been framed as a confidence problem. The confidence gap. Imposter syndrome. The sponsorship gap. The feedback bias.

The research now names the underlying constraint directly: **the articulation gap.** Some call it signal drift (Confidence.in / Dave Martin). Some call it the recognition gap. We call it the **evidence gap** — because that's the gap users can close, and the gap we built for.

Four independent academic streams converge:
- **Coffman & Klinowski (*Management Science* 2025)** — the feedback deficit is supply-side, from managers' bias.
- **Chamorro-Premuzic (*HBR* 2013)** — the "confidence gap" is a translation/reception problem, not an internal deficit.
- **Exley & Judd (2021)** — women of color self-rate lowest as a rational defensive mechanism, not low belief.
- **Adler 2012 (*JPSP*)** — narrative agency themes increase *before* outcome improvement. Evidence is causally upstream of advancement.

Only **27% of self-identified sponsors actually advocate** for their protégés, because protégés can't supply evidence on demand (Coqual). The system breaks at the evidence layer.

---

## How Vouch works

Three loops, plus standing context.

### 0 · Profile (standing context)
Drop in your resume, a target JD, your LinkedIn. Once. Vouch knows your baseline for every artifact going forward.

### 1 · Dump
The raw material for the moment you're prepping for. Projects, calendar, feedback, OKRs, Slack threads. No structure required.

### 2 · Mirror — four reflections back to you
- **01** · *Your year, articulated* — themes + CAR-structured wins
- **02** · *Underselling + eating your time* — gaps in business-impact attribution **plus office-housework patterns**, with an inline "Plan a glamour move" flow that drafts the email to your manager proposing the role that converts housework into a scoped, promotable mandate
- **03** · *Your feedback, decoded* — vague performance language interpreted, severity color-coded (green / yellow / red), with the question to ask back
- **04** · *Where your evidence points next* — moves your record supports, internal and external

### 3 · Vouch — generate the artifact
Four artifact types ship live — one tight story: **tools for the moments you'd otherwise wing it.**

| Trigger | Artifact | Frame |
|---|---|---|
| Performance Review | Self-assessment | Redemption Sequence |
| Promo Case | Committee packet | CAR · Competency-Mapped |
| Interview Prep *(external or internal transfer)* | 5 STAR stories + concern-addressing + Q to ask + networking toolkit | STAR · JD-Mapped |
| Sponsor Conversation | Briefing memo + Personal Board update + trajectory-over-time | Briefing Memo |

Every artifact: editable, source-tagged, exportable to **PDF / Word / Markdown**.

---

## What makes Vouch distinctive

**Evidence-first, never tone-policed.** Self-promotion is structurally penalized for first-gen and underrepresented professionals (Heilman 2001, Rudman 1998, Wayne & Sun 2022). Vouch routes assertion through *objective data* — source-tagged to projects, calendar, feedback — so users don't have to perform agentic self-advocacy that triggers backlash. **The data does the asserting. Users get to speak plainly.**

**Office-housework surfacing → glamour move.** Women and underrepresented professionals absorb 4× more service labor (Williams, Babcock, Padilla). Vouch detects the pattern and offers a concrete role-conversion proposal *with the email drafted*. The only career tool that bridges articulation → trajectory.

**Universal product, wedge intelligence.** Vouch never asks the user to self-identify by race, gender, or first-gen status. The wedge fit lives in the *intelligence layer* — how the AI interprets vague feedback, decodes coded patterns, names the language first-gen professionals actually receive.

---

## Audience

**Wedge — our heart:** the 15,000+ Rising Leaders in MLT's network. First-generation, underrepresented, mid-career operators.

**Broader:** any mid-career professional. Gallup says only 23% of employees strongly agree their manager gives meaningful feedback.

---

## Sustainability path

| Tier | Audience | Notes |
|---|---|---|
| **Free for a quarter** | MLT alums · Rising Leaders · CAP cohort | 90-day full-cycle trial, then freemium with alum discount |
| **Freemium individual** | Mid-career professionals broadly | Deeper feedback decoding, integrations |
| **B2B partner programs** | Enterprises measuring talent equity (Black Equity at Work scorecard) | Standardized talent data |
| **Phase 2 — manager-facing** | Calibration prep, performance ROI | Gallup: $2.4M–$35M annual review cost per 10K-person company |

---

## Tech stack

- **Frontend** — Single-page HTML + Tailwind (CDN) + vanilla JS. Marked.js for markdown rendering, html2pdf.js for client-side PDF export
- **Deploy** — Vercel (static frontend + four Node serverless functions)
- **API routes** — All tuned to fit Vercel hobby-tier 60s function cap
  - `/api/reflect` — **Claude Haiku 4.5**, returns structured JSON for the four Mirror reflections (fast structured extraction)
  - `/api/generate` — **Claude Sonnet 4.6** for all four artifact types (Performance Review, Promo Case, Interview Prep, Sponsor Conversation)
  - `/api/suggest-jd` — Sonnet 4.6, generates a plausible stretch JD from a resume
  - `/api/parse-resume` — Sonnet 4.6, reads PDFs natively via document content blocks (no parsing library)
- **AI** — Anthropic Claude via `@anthropic-ai/sdk` (Sonnet 4.6 + Haiku 4.5)
- **Design system** — Lane C: pure white, cobalt blue `#2050f0`, DM Serif Display headlines (italic-cobalt for emphasis), `-apple-system` for body, pill primary CTAs, iOS-bubble quote pills
- **Storage** — `localStorage` for profile (no server-side persistence)

---

## Local development

```bash
git clone https://github.com/femibrin/vouch-mlt-buildathon.git
cd vouch-mlt-buildathon
npm install
# Set ANTHROPIC_API_KEY in your env
vercel dev
```

API key required: get one at https://console.anthropic.com/settings/keys. Add to a local `.env.local` file:

```
ANTHROPIC_API_KEY=sk-ant-...
```

For production deploy, set `ANTHROPIC_API_KEY` in Vercel project env vars (marked as Sensitive). Variable name is case-insensitive in our code — it also accepts `Anthropic_API_Key`.

---

## Project structure

```
.
├── index.html                  # Full client app (Tailwind + vanilla JS, Lane C design system)
├── api/
│   ├── reflect.js              # POST { dump } → { reflections } — Haiku 4.5
│   ├── generate.js             # POST { dump, type, ... } → { artifact, frame } — Sonnet 4.6 (all types)
│   ├── suggest-jd.js           # POST { resume, direction? } → { role_title, company_archetype, jd } — Sonnet 4.6
│   └── parse-resume.js         # POST { pdf_b64 } → { text } — Sonnet 4.6 native PDF document blocks
├── lib/
│   └── prompts.js              # System prompt + REFLECT_PROMPT + 4 artifact prompt templates
├── visual-prd.html             # Visual one-pager (Lane C, paste-into-a-judges-laptop friendly)
├── package.json                # @anthropic-ai/sdk
├── vercel.json                 # Function config (maxDuration per endpoint)
├── LICENSE                     # MIT
└── README.md
```

---

## Research foundation

Vouch is built on a synthesized evidence base of 40+ academic and industry citations across sponsorship gaps, feedback bias, self-promotion penalties, cognitive load of career maintenance, organizational failure, and narrative identity theory.

Full consolidated evidence base, with verification flags on commonly-circulated stats that fail replication (e.g., McKinsey *Diversity Wins* 33% outperformance, per Green & Hand 2024), lives in the parent project folder as `research-notes.md`.

---

## Acknowledgments

- **MLT** — Management Leadership for Tomorrow — for hosting the buildathon and shaping the community this is built for
- **Confidence.in / Dave Martin** — for the *Signal Drift* framing, which sharpened how we name the gap
- **Office Hours** — the decade-long coaching practice (Femi's IP) whose methodology underpins the prompts
- The 40+ researchers cited in `research-notes.md` whose work made this scaffolding possible

---

## License

[MIT](./LICENSE) © 2026 Femi Brinson · Austin Hood

---

***Vouch — for yourself, before you ask someone else to vouch for you.***
