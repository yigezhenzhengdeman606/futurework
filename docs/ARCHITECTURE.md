# Future Atlas implementation

## Runtime

Node.js 22+, standard library only. `server.mjs` binds to 127.0.0.1; `PORT` defaults to 3000. This is a local MVP, not a public multi-user service. The original Python/RunPod template remains available but is not used by the new application.

Browser → JSON HTTP API → deterministic career engine → optional AI explanation.
Server → fixed arXiv AI Atom API → atomic `.cache/market.json` snapshot.

No database, account system, analytics, dependency installation, or API key persistence. Profile, simulation choices, AI configuration and reports live in page memory and clear on reload. Users may explicitly download a report; downloads contain profile data but never the API key.

## Endpoints

- `GET /api/catalog`: industries, six roles, 17 SDGs.
- `GET /api/market`: last attempted/successful refresh, source items, rule-based industry estimates.
- `POST /api/report`: `{profile, ai?}`.
- `POST /api/simulation`: `{roleId, ai?}`.
- `POST /api/rematch`: `{profile, experience: {roleId, choices:[0,2,0], enjoyment:4}, stress:{answers:[2,3,4,5]}, ai?}`.

Profile example: `{occupation:"行政助理",industry:"行政与客服",skills:["沟通","Excel"],hours:5,goals:[4,8]}`.
AI example: `{provider:"deepseek",model:"deepseek-flash",key:"..."}`. Only fixed OpenAI and DeepSeek HTTPS endpoints are allowed. No arbitrary URL forwarding. The key is sent in the Authorization header and is not echoed or logged. AI responses are untrusted text rendered with escaping; AI never replaces deterministic match calculations. Invalid provider/configuration yields 400; provider failure/timeout yields a usable rule report and a fallback status.

## Daily refresh and provenance

On startup and every minute, check whether the last attempt is at least 24 hours old. If due, fetch `https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=60` with a 15-second timeout. Concurrent requests share one in-flight refresh. Persist the snapshot using temporary-file rename. A failed source request preserves last successful items and timestamp, records failure status and waits until the next daily attempt. A restart loads the previous snapshot before serving. The server must remain running for unattended updates; while stopped it cannot update, and catches up on startup. This is a rolling 24-hour schedule, not midnight in any particular timezone.

Atom research titles are technology signals, not job postings or employment outcomes. Each industry's manually specified demo exposure baseline is increased by the number of matching titles, capped at eight points. It can decrease again when new feed items replace old ones. There is no calibrated forecasting model or employment probability. No news is fabricated when the feed is unavailable. Reports are generated against the snapshot available at submission; existing reports are not silently rewritten. The dashboard polls the latest server snapshot every minute.

## Matching and simulation

### Personalized AI workflow

`src/personalize.mjs` supplies validated JSON generation for questionnaires, report selection/individual plans, and post-experience self-report questions. AI questions retain the three canonical option dimensions and add two personal open questions, whose text and answers travel with the profile into subsequent reports. AI reports select exactly three unique IDs from the existing catalog candidate set, can reorder them beyond the initial rule top three, and replace each role's rationale and skill-practice actions. They cannot invent role IDs, drop required skill-path entries, or change rule scores, SDGs or estimated learning time. The UI labels AI ordering and rule-based scores separately. AI self-report rewrites four work scenarios using the evaluated experience; the 1–5 direction and rule scoring remain. All structural failures return rule results with explicit status; semantic quality and originality still require real-model acceptance testing.

`POST /api/profile-insight` summarizes submitted profile context; `POST /api/market-insight` uses a bounded current source snapshot for user-initiated trend interpretation. `POST /api/stress-questions` validates/evaluates the experience before generating questions. Report and rematch endpoints each make one structured model request, not both structured and generic enhancement requests. Snapshot polling and UI rerenders do not invoke AI. Generic API key consent applies to these stages; forms and reimbursement remain deterministic. No provider calls or paid live evaluations are made by the automated tests.

Optional profile fields are declared in `profileOptions` and served by `/api/catalog`: interests, major category/detail, career stage, work style, transition objective, and learning preference. Each role has editorial interest/major/style associations. Add 3 per matching interest (capped at two), 5 for a related major, and 3 for work style; transition goals add industry-continuity, cross-industry, chosen-SDG or low-pressure preference bonuses. These never count as acquired skills or remove skill gaps. Unlisted major details appear in the report and AI context but are not keyword-scored. Learning preference and career stage change the practice guidance. Missing optional fields retain the prior matching behavior; invalid enum values are rejected. The report includes selected profile context for AI explanations as well as local report downloads.

Base score 45, +8 per shared skill, +3 per shared SDG, +8 for industry continuity, bounded to 10–98. On rematch, the experienced role gets `(enjoyment−3)*5 + round((decision quality−4)/2)`, minus 3 if energy is below 50. Every role gets `(self-reported tolerance−role pressure)*3`. Scores are ranking aids rather than psychometric measurements. Equal scores preserve catalog order. The top three distinct roles are returned, but users can explore other catalog roles through the API.

Each role has its own task and expected artifact, with three shared decision patterns. Server validates and calculates the three decisions' energy and quality. AI can add a reflection question; the interactive branches remain rule based. Four pressure questions measure scenario preferences and are not clinical tests. Experience feedback plus profile and self-report affect rematching. Learning plans target missing skills, estimate 12 hours per skill divided by weekly availability, and name an artifact for practice and peer review. A professional role may require qualifications outside this plan.

SDG names follow [UN's 17 goals](https://sdgs.un.org/goals). Role-to-SDG connections and skill inheritance are editorial learning mappings, not UN endorsement. Conceptual occupational exposure reference: [ILO 2025 refined index](https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure). The app does not import or claim to reproduce ILO scores.

## Before public deployment

### Animated daily-life simulation

With an API key, `/api/day` generates the entire story via one JSON-mode model request (up to 6,500 output tokens, 60-second timeout); the opening cover no longer makes a separate paid simulation call. `src/day-ai.mjs` checks that all 13 indexed events are present in order, with bounded nonempty titles/text and exactly three validated decisions in each work event. Only narrative fields are merged; computed times, event types and snooze outcome remain server-owned. Generated work rounds replace the UI's rule rounds. The response includes a six-hour HMAC-signed record of role and decision scoring, so `/api/rematch` evaluates against the same rounds seen by the user instead of the original template. Keys and profiles are not included in the signed record. The signing key is ephemeral; a server restart invalidates old experience records. Missing keys use rules without a model request; provider errors, incomplete JSON or invalid scoring return an explicitly labeled full rule fallback. DeepSeek JSON generation disables thinking mode to reserve the output budget for the story. Both actual paid use and narrative quality require real-key acceptance testing; automated tests mock the provider.

`src/day.mjs` validates and calculates schedules; `public/day-ui.js` handles the setup/alarm/timeline/summary phases. `/api/day/preview` returns the derived alarm without drawing randomness. `/api/day` validates the role and schedule, draws the snooze outcome once for that request, and returns 13 chronological scenes. A snooze draw below 0.7 oversleeps enough to arrive at least 15 minutes late; otherwise wake is delayed exactly two minutes. A minimum two-minute buffer prevents the safe branch from also arriving late. Immediate waking does not draw randomness. Repeated rendering and scene navigation do not redraw the outcome. Restarting the experience can draw again; results are not persisted across refreshes. Existing three decision scores remain the inputs to pressure rematching, with the daily summary included for reflection, without penalizing lateness as a vocational trait.

Times are simulated Beijing local clock values, independent of device timezone. Bedtimes before 06:00 are interpreted as next day, capped at 03:00; settings must leave an hour between arriving home and bedtime. The default 10:00–19:00 comes from a [2021 historical report](https://www.cnfin.com/gs-lb/detail/20211101/3443978_1.html) of ByteDance's working hours, not a claim about current average corporate hours. This is a configurable daytime-company scenario, not a validated shift pattern for every profession. Preparation durations are product defaults. Reduced-motion preferences disable transition and illustration animations; decisions never auto-advance and browser timers do not decide lateness. No paid model calls are needed for the daily schedule or choices.

Add authentication, HTTPS/reverse-proxy origin configuration, abuse/usage controls, durable per-user data with consent, a production scheduler, and empirically calibrated labor-market data. RunPod/GPU integration and submission proof documents have not been implemented or fabricated. No hosted deployment is created by this local coding task.
