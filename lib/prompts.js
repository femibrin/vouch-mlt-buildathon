// Vouch — Prompt Templates
// Brand voice: confident, declarative, evidence-routed, no tone-policing.
// Methodology: Office Hours career coaching, codified.

const SYSTEM_PROMPT = `You are Vouch — a career articulation engine for first-generation and underrepresented mid-career professionals.

VOICE
- Confident, declarative, direct. You do not soften the user.
- Never tone-police. The user gets to talk their shit.
- Route assertion through evidence, not personality.
- Use specific numbers, dates, names from the user's data. Generic = failure.

METHODOLOGY (Office Hours, codified)
- Articulate work as Context → Action → Result (CAR).
- Surface "office housework" patterns — uncompensated coordination, scheduling, agenda-setting, mentorship, status-chasing — and propose a "glamour move" that converts that work into a scoped role.
- Decode vague feedback ("more development," "exposure is uneven") into specific signal: is the gap about scope, audience, or impact?
- Map evidence to plausible next moves (internal + external + adjacent).
- For underrepresented professionals: mitigate backlash structurally (via evidence routing), not stylistically (via softening).

FRAMING ANCHORS
- The articulation gap is upstream of the confidence gap, the sponsorship gap, and the feedback bias.
- Per Adler 2012 (JPSP): narrative agency themes increase before outcomes improve. Articulation is causally upstream of advancement.
- Coqual data: only 27% of self-identified sponsors actually advocate, because protégés cannot supply evidence on demand. Your job is to fix that.

OUTPUT
- When asked for JSON, return only valid JSON. No markdown fences.
- When asked for a document, return markdown with clean headings, no preamble.`;

// ---------------------------------------------------------------------------
// REFLECT — surfaces 4 reflections from the dump.
// Returns structured JSON for the UI to render.
// ---------------------------------------------------------------------------

const REFLECT_PROMPT = (dumpContent) => `Read this raw dump from a user. It's messy by design — project briefs, calendar exports, performance feedback, OKRs, Slack threads.

Produce four reflections as a single JSON object with this exact shape:

{
  "year_articulated": {
    "themes": [
      { "label": "Theme name", "evidence": "1-2 sentence specific summary with numbers/names from the dump" }
    ],
    "wins_count": 5
  },
  "underselling": {
    "wins_missing_impact": [
      { "raw": "the win as the user wrote it", "missing": "what business outcome they did not attach" }
    ],
    "housework": {
      "pattern": "describe the office-housework pattern detected (cross-functional coordination, status-chasing, agenda-setting, mentorship — anything uncompensated and non-promotable)",
      "evidence": "specific count or duration from the dump",
      "glamour_move": "a single concrete proposed role/scope conversion appropriate to the user's level — e.g., 'Propose the Cross-LOB Rollout Lead role for FY26'",
      "draft_email": "a 4-6 paragraph email the user could send to their manager proposing the glamour move. Confident, declarative, evidence-routed. No softening. Use the user's actual numbers."
    }
  },
  "feedback_decoded": {
    "raw": "verbatim quote of the most consequential piece of vague feedback in the dump (or null if no feedback present)",
    "specific": "is the feedback specific? what's missing?",
    "pattern": "is this language recurring across cycles?",
    "meaning": "what does it actually mean — exposure gap, scope gap, skill gap, sponsorship gap?",
    "question_to_ask_back": "the single best question the user should ask their manager / committee in response",
    "severity": "green | yellow | red — green = above-and-beyond / positive feedback; yellow = soft signal worth attention; red = critical / immediate action needed (career-impacting language, repeated 'not ready' patterns, scope-narrowing)",
    "severity_reason": "1 sentence explaining the color you assigned — read between the lines"
  },
  "next_moves": [
    {
      "role": "Specific role title and org type (anonymize specific companies if user mentions targets)",
      "match": "high | mid | low",
      "strengths": "1-sentence specific strength",
      "gaps": "1-sentence specific gap to close",
      "rationale": "1-sentence why this is plausible from the evidence"
    }
  ],
  "recommendation": "1-2 sentence strategic recommendation across the next_moves"
}

Return 3-4 themes, all wins missing impact you detect (up to 4), 1 housework pattern, 3 next moves.

USER DUMP:
${dumpContent}`;

// ---------------------------------------------------------------------------
// ARTIFACT PROMPTS — five generation modes
// Each takes (dump, reflections, optionalInputs) and returns markdown.
// ---------------------------------------------------------------------------

const buildContext = (dump, reflections) => `USER DUMP:
${dump}

VOUCH'S REFLECTIONS (parsed from the dump, use as evidence):
${typeof reflections === 'string' ? reflections : JSON.stringify(reflections, null, 2)}`;

const ARTIFACT_PROMPTS = {
  // -------------------------------------------------------------------------
  performance_review: (dump, reflections, _extra) => `Generate a performance-review SELF-ASSESSMENT.

Frame selection:
- If the dump contains past feedback like "development needed," use the **Redemption Sequence** frame (acknowledge prior signal → demonstrate response → forward ask).
- Otherwise use **CAR (Context-Action-Result)** structure.

LEADERSHIP / TEAM PERFORMANCE — IF the dump contains evidence of people leadership (mentorship, direct reports, team scaling, coaching, hiring, promotions you helped drive), add a dedicated section. Some operators are evaluated heavily on team outcomes — surface it explicitly.

Structure the document with these sections (markdown):

# Performance Review — Self-Assessment

**[User name from dump] · [Role from dump] · [Review period]**

## Executive Summary
2-3 sentences. Lead with the biggest measurable outcome. Use specific numbers.

## Key Outcomes
3 outcomes. Each as:
**N. [Outcome title with metric]**
- *Situation:* [from dump]
- *Action:* [from dump]
- *Result:* [from dump, with source attribution if possible — e.g., "[source · Caleb Slack 2026-02-14]"]

## Leadership & Team Performance
*(Include this section ONLY if the dump contains people-leadership signal — direct reports, mentorship, team scaling, hiring, promotions you drove. Otherwise omit.)*
2-4 bullets. Each names the leadership outcome with the person/team and the measurable result. Examples:
- Coached [name/role] from [start state] to [end state — shipped X, promoted to Y]
- Scaled team from N to M in [period]
- Mentored [N] junior PMs; [X] received above-bar ratings
- Built the rubric / hiring loop that [outcome]

## Growth Areas
1-2 paragraphs. If prior feedback exists, name it directly. Then translate it (e.g., "the gap reads as leadership-level exposure, not skill execution"). Then commit to a specific action.

## What I'm Asking For
3 bullets. Specific, evidence-supported asks. Senior consideration / stretch assignment / skip-level cadence.

Voice: declarative. No hedging. Use first-person ("I led," not "I had the opportunity to lead").

${buildContext(dump, reflections)}`,

  // -------------------------------------------------------------------------
  promo_case: (dump, reflections, extra) => `Generate a PROMO CASE — the packet a sponsor walks into committee with.

Target level: ${extra?.target_level || 'next level up from current'}

Frame: STAR or CAR structured around scope expansion. Demonstrate the user is already operating at the next level.

Structure (markdown):

# Promo Case — [User → Target Level]

**Submitted by: [name]. Sponsored by: [manager name from dump or "Manager"].**

## Why Now
2-3 sentences. The unmistakable signal that says "this person is doing the work at the next level already."

## Scope at Current Level vs. Demonstrated Scope
A short comparison table:

| Dimension | Current level expectation | What [user] is actually doing |
| --- | --- | --- |
| Scope | [from level framework or inferred] | [from dump, specific] |
| Audience | [...] | [...] |
| Impact | [...] | [...] |
| Influence | [...] | [...] |

(3-5 rows.)

## Evidence — Three Proof Points
3 outcomes in STAR. Each ends with the next-level competency it demonstrates ("Demonstrates: Multi-team Technical Leadership").

## Leadership Multiplier (if applicable)
*(Include only if the dump contains team-leadership signal — direct reports, mentorship, hiring, promotion drives.)*
2-3 bullets demonstrating people-leadership beyond the user's individual contributions. Promo committees weight this heavily for senior+ levels. Surface it.

## Trajectory
2-3 sentences. Where this trajectory is heading in the next 12 months if confirmed.

## The Ask
Specific committee asks. What decision, by when, with what supporting evidence already in the packet.

${buildContext(dump, reflections)}`,

  // -------------------------------------------------------------------------
  interview_prep: (dump, reflections, extra) => `Generate INTERVIEW PREP for a target role — external company OR internal transfer.

JOB DESCRIPTION:
${extra?.jd || '(no JD provided — infer target competencies from dump)'}

USER'S NOTES ON THE ROLE (pros / cons / recruiter or hiring-manager signal):
${extra?.feedback || '(no role feedback provided)'}

INTERNAL VS. EXTERNAL — if the JD or notes indicate this is an internal transfer (different team, different LOB, same company), call this out in the "Why You" section and use the user's existing internal-credibility evidence (sponsors, prior cross-functional work, internal references) as part of the pitch.

Frame: STAR for stories. Address gaps directly using the user's actual evidence.

Structure (markdown):

# Interview Prep — [Target Role at Target Company]

## Why This Role / Why You
3 short paragraphs.
1. Why this company/role (specific, not generic — use one detail from the JD).
2. Why you for this role — 2-3 evidence-backed strengths.
3. The gap (if any) and how your record actually answers it.

## Five Stories — Mapped to JD Competencies
Five STAR-structured stories from the dump. For each:
**Story N: [Title]**
- *Maps to:* [competency from JD]
- *Situation:* ...
- *Task:* ...
- *Action:* ...
- *Result:* [with numbers]
- *Variants:* [1-line note: how to retell this for an adjacent competency]

## Anticipated Question Themes
4-6 themes the user should expect, each with a 1-line angle to lead with.

## Address the Concern (Directly)
If user notes contain pushback (e.g., "less API experience"), name it head-on and route through evidence. 2-3 sentences each for each concern. Never apologize.

## Questions to Ask Them
5 questions, ordered: strategic → role-specific → judgment-testing → cultural → close. Each tagged with what the question reveals about how the user thinks.

## Tactical
- What to bring (portfolio piece, leave-behind, etc.)
- The 90-second open if they ask "tell me about yourself"
- The exit line

## Networking Toolkit
Three drop-in scripts the user can lift directly. Confident, evidence-routed, no hedging.

### A. The 30-second pitch (for conferences / introductions / internal coffees)
A 70-100 word self-introduction that names: current role + biggest measurable outcome + the move you're exploring + the specific connection you're looking for. Memorizable. Spoken cadence.

### B. The cold outreach email (LinkedIn / referral / internal recruiter)
A 5-7 sentence email to a stranger at a target company or an internal hiring manager. Subject line + body. Names: why them specifically (something from their work, not generic), what you've done that's relevant, what you're asking for (15 minutes, not a job). Sign-off.

### C. The warm intro ask (to an existing contact)
A 4-5 sentence message asking a current contact for an introduction. Names: the target, why this person is the right intro, the value to the target (so the contact has something to offer), the forwardable blurb the contact can paste into their intro email.

${buildContext(dump, reflections)}`,

  // -------------------------------------------------------------------------
  sponsor_conversation: (dump, reflections, extra) => `Generate a SPONSOR / PERSONAL BOARD BRIEFING.

This artifact serves two related uses:
1. Briefing a single sponsor before a skip-level / one-on-one conversation.
2. Updating a Personal Board of Directors (multi-sponsor) on the user's trajectory.

The output supports both — sponsor-facing language, with a Personal Board variant at the end.

SPONSOR / BOARD CONTEXT:
${extra?.sponsor || '(no sponsor profile provided — write the generic version)'}

THE ASK:
${extra?.ask || '(no specific ask — propose the most strategic one based on the dump)'}

Frame: briefing memo, scannable in 5 minutes.

Structure (markdown):

# Sponsor Briefing — [Date]

**Author: [user]. Audience: [sponsor / Personal Board].**

## Where I Am
3-4 sentences. Current role, last 6-12 months of measurable outcomes, last meaningful feedback received.

## Trajectory Over Time
*(Include this section ONLY if the dump contains multi-year or multi-cycle data — ratings across years, feedback evolution, skill development arc. Otherwise omit.)*
A short narrative across the user's last 2-3 cycles. For each cycle: rating direction (improving / steady / regressing), key feedback theme, skills built. End with: "Where this puts me now: [1 sentence trajectory read]." This is the data sponsors actually need to advocate.

## Where I Want to Go
2-3 sentences. Specific next move — internal or external. Specific timeframe.

## What I'm Doing About It
3 bullets. Evidence-backed actions already underway.

## What I Need From You
2-3 specific asks. Each ask names:
- What you're asking the sponsor to do
- Why their advocacy specifically (vs. someone else's)
- What you'll hand them to make it easy (the packet, the data point, the introduction script)

## The Question to Leave With
1 sentence. The question you want them turning over after the meeting.

---

## Personal Board Update Variant
A 1-page version of the above, with this header:
**To: [Personal Board members]. From: [user]. Quarterly update — [period].**

5-7 bullet points covering: top theme of the quarter, biggest win, biggest unblock, where you're stuck, what you need, what's next.

${buildContext(dump, reflections)}`,

  // -------------------------------------------------------------------------
  career_acceleration: (dump, reflections, extra) => `Generate a CAREER ACCELERATION strategic decision memo.

This is not "what should I do." This is "here's what your record actually says about you, here are 3 plausible directions it supports, here's the top recommendation, and here's how to move on it in 90 days."

USER CONTEXT (target tracks / companies / constraints):
${extra?.targets || '(no specific targets — derive from the dump)'}

Frame: strategic decision memo. Modeled on management-consulting case structure but informed by individual evidence, not market sizing.

Structure (markdown):

# Career Acceleration — Strategic Read

**For: [user]. As of: [date].**

## What Your Record Says About You
3-4 sentences. The unmistakable through-line across your work. Not titles, not employers — the *pattern*. The thing you keep doing well, the thing you keep being asked to do.

## Three Plausible Directions
Three candidate next moves. Each:

**Direction N: [Specific role + org archetype]**
- *Fit signal:* [from your record, specific]
- *Stretch:* [the gap to close]
- *Time-to-credibility:* [3 months / 6-12 months / 12-24 months]
- *Compensation read:* [where this lands relative to current — directional]
- *Risk:* [the one thing that could go wrong]

Mix at least one internal/adjacent and one bolder/external option.

## Top Recommendation
1-2 paragraphs. Pick one direction. Explain why this one over the others. Be willing to be wrong — say what would change your mind.

## 90-Day Plan
- **Days 1-30:** [3-4 concrete actions — conversations, artifacts, evidence to build]
- **Days 31-60:** [3-4 actions — applications, networking, internal positioning]
- **Days 61-90:** [3-4 actions — decision criteria check-in, board updates, offer logistics]

## Networking Toolkit
Three drop-in scripts the user can lift directly. Confident, evidence-routed, no hedging.

### A. The 30-second pitch (for conferences / introductions)
A 70-100 word self-introduction that names: current role + biggest measurable outcome + the move you're exploring + the specific connection you're looking for. Memorizable. Spoken cadence.

### B. The cold outreach email (LinkedIn / referral)
A 5-7 sentence email to a stranger at a target company. Subject line + body. Names: why them specifically (something from their work, not generic), what you've done that's relevant, what you're asking for (15 minutes, not a job). Sign-off.

### C. The warm intro ask (to an existing contact)
A 4-5 sentence message asking a current contact for an introduction. Names: the target, why this person is the right intro, the value to the target (so the contact has something to offer), the forwardable blurb the contact can paste into their intro email.

## Decision Criteria
4-5 criteria to use when an actual offer or opportunity arrives. Each criterion + the threshold that would make it a yes vs. a pass.

## Open Questions
3 questions the user should hold open and revisit in 30 days.

${buildContext(dump, reflections)}`,
};

module.exports = {
  SYSTEM_PROMPT,
  REFLECT_PROMPT,
  ARTIFACT_PROMPTS,
};
