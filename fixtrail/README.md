# FixTrail

**Document repairs. Track deadlines. See patterns.**

FixTrail helps renters build a dated, photo-backed record of housing problems. A tenant snaps a photo, the app suggests a category and priority (and shows what it saw), a response clock starts, and one tap produces a PDF repair notice. Each building gets an anonymous dashboard that surfaces patterns, like several households reporting mold, without exposing any individual report.

Built for the GDG Hacktober housing theme. MIT licensed.

## Why this isn't "just ask a chatbot"

A chatbot can explain a photo once. FixTrail's value comes from the system around the model:

| Capability | Why a one-off prompt can't do it |
| --- | --- |
| **Persistent, dated record** with the photo stored privately | A chat has no durable, timestamped evidence trail you can hand to a landlord or agency |
| **Deadline engine** (plain date math, unit tested) | Deadlines must be exactly right; this is deliberately *not* delegated to an LLM |
| **Building-level patterns** across many households | Needs shared state across users; no single conversation can see it |
| **Privacy-preserving aggregation** (k-anonymity threshold) | Requires a data layer with rules about what may be shown |
| **Generated repair notice** with photo, timeline, and citation | Output is a document built from stored data, not a chat answer |
| **Safety rules around the model** (severity floors, schema validation, abstain-on-doubt) | Guardrails live in code, outside the prompt |

## What the AI does (and doesn't)

- **Does:** looks at one photo (plus an optional one-line note) and returns strict JSON: `category`, `severity`, `confidence`, `visible_evidence`.
- **Doesn't:** compute deadlines, decide legal rights, assign blame, or see anyone else's data.
- **Never trusted blindly:** the output is validated against a schema (invented categories or extra fields are rejected), safety floors are applied in code (a gas smell can never be rated below *emergency*), low confidence routes to human confirmation, non-housing photos are rejected, and the tenant always has the final say.
- **Fails safe:** if the model is down or returns junk, the tenant gets a manual form instead of an error.

## Architecture

```
Browser (Next.js, mobile-first, keyboard accessible)
  │  photo compressed + EXIF/GPS stripped client-side (canvas re-encode)
  ▼
Next.js route handlers (server)
  ├─ POST /api/classify ──► Google AI Studio API (Gemma / Gemini) ──► JSON
  │        └─ zod schema ─► safety rules (floors, confidence, not_housing)
  ├─ POST /api/reports ───► Store ──► Supabase Postgres + private Storage bucket
  ├─ GET/PATCH/DELETE /api/reports/[id]   (owner only)
  ├─ POST /api/reports/[id]/notice ──► pdf-lib ──► PDF
  └─ GET /api/buildings/[id] ──► aggregate.ts (k-anonymity) ──► counts only
```

- **Identity:** no accounts for the one-day build. Each device holds a random token; the server stores only its SHA-256 hash and returns "not found" for anything not owned by the caller.
- **Storage:** `lib/store.ts` has two implementations behind one interface, an in-memory demo store (zero setup) and Supabase.
- **Classifier:** `lib/classify.ts` calls the Google AI Studio REST API with the model id you set in `AI_MODEL`. With no key it uses a keyword mock so the app still runs end to end.

## Run it locally (2 minutes, no keys needed)

```bash
npm install
npm run dev        # http://localhost:3000
```

With no environment variables the app runs in **demo mode**: in-memory data seeded with two fictional buildings, and a keyword classifier that reads your *written description* (it does not analyze the photo, and the UI says so).

### Turn on the real model

1. Create a key at https://aistudio.google.com/apikey
2. `cp .env.example .env.local` and set `GEMINI_API_KEY` and `AI_MODEL` (use the exact model id shown in AI Studio).
3. **Check that your chosen model accepts image input.** If a Gemma 4 variant does, use it and enter the Gemma track. If not, use a Gemini model and describe the setup honestly in your submission.

### Turn on persistence (Supabase, free tier)

1. Create a project at https://supabase.com
2. In the SQL editor, run `supabase/schema.sql`.
3. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. The service-role key is server-only. Never expose it in client code.
4. Optional: `npm run seed:supabase` loads the fictional demo buildings and reports.

### Deploy (Vercel, free tier)

1. Push this repo to GitHub, then import it in Vercel.
2. Add the same environment variables from `.env.local` in the Vercel project settings.
3. Deploy. (Vercel's request body limit is about 4.5 MB; photos are compressed to well under that in the browser, and the server rejects anything over 3 MB.)

Free-tier limits and model availability change, so confirm them before demo day.

## Testing

```bash
npm test             # 56 unit tests (deadlines, aggregation, safety, classifier parsing, PDF, store)
npm run typecheck
npm run build
npm run eval         # accuracy of the real model on YOUR labeled photos
```

**What the automated tests cover:** deadline math including boundaries; the privacy threshold and "one household spamming isn't a pattern"; severity floors; rejection of malformed or injected model output; graceful fallback when the API errors, times out, or returns junk; PDF generation with unicode, huge strings, and corrupt photos; ownership isolation in the store.

**What they don't cover:** real model accuracy. Run the eval:

1. Put 20 to 30 labeled photos in `eval/images/` (mold, leaks, pests, broken locks, plus some irrelevant photos and blurry ones).
2. List them in `eval/labels.csv`.
3. `npm run eval` writes `eval/RESULTS.md` with category accuracy, priority agreement, the share sent to human review, and tokens per report. Copy those numbers here:

> _Results: add your numbers after running the eval._

Also run before you submit: Lighthouse accessibility audit, a full keyboard-only pass through report, review, and notice download, and a screen-reader pass on the report flow.

## Rubric map

| Rubric item | Where to look |
| --- | --- |
| Problem definition, impact multiplier | Landlord-response gap is measurable; building dashboard turns individual complaints into patterns |
| Stakeholder empathy | Add 2 to 3 short renter quotes here after you talk to classmates: _TODO_ |
| AI integration and necessity | Photo understanding with structured output; deadlines/aggregation intentionally not AI |
| Architectural soundness | Store interface, schema validation, tests, working prototype |
| Safety and grounding | `lib/safety.ts`, `lib/classify.ts` (schema, floors, abstain, injection handling) |
| Privacy | EXIF stripped in browser, token hashed, private bucket, RLS on, k-anonymity, delete-all button |
| Inclusive design | Labeled form controls, skip link, focus styles, status never color-only, live regions, 44px targets (built toward WCAG 2.1 AA; run Lighthouse and a screen-reader test before claiming it) |
| Deployment viability | One repo, free-tier stack, `.env.example`, no server to run |
| Inference cost | One small image call per report; photos downscaled to 1280px; see below |
| Documentation | This file, `docs/DEMO_SCRIPT.md`, commented config in `lib/jurisdiction.ts` |

### Inference cost

Photos are downscaled to at most 1280 px before upload, and each report makes one classification call. `npm run eval` prints average input and output tokens per report. Set `EVAL_PRICE_IN_PER_M` and `EVAL_PRICE_OUT_PER_M` (dollars per million tokens, from your provider's pricing page) and it computes cost per report, so you can state a real number instead of a guess.

## Responsible AI notes

- **Bias / blame:** the prompt tells the model to describe only what is visible and not assign cause or fault.
- **Prompt injection:** text in photos and the tenant's note is treated as data; the note is stripped of angle brackets before being placed in the prompt; only schema-valid JSON is accepted.
- **Human in the loop:** the tenant confirms or edits category and priority before anything is saved, and edits are recorded.
- **Not legal advice:** shown in the footer and printed on every notice.

## Known limitations (be upfront with judges)

- **No real accounts.** Device tokens are enough for a demo, but lose the browser data and you lose access. Next step: Supabase Auth.
- **Dashboard counts are self-reported** and can be gamed; the k-anonymity threshold limits privacy risk, not manipulation.
- **Response times are defaults, not law.** `lib/jurisdiction.ts` holds the requested response windows (1 / 3 / 14 / 30 days) and legal citations. The windows are app defaults. The two section-level citations are marked `needsVerification` and are **not** printed in notices until someone checks them against the current Virginia Code and sets `verified: true`. Have someone confirm before you present anything as legal guidance.
- **In-memory rate limiting** resets per serverless instance.
- **Virginia only** for now; adding a state means adding a jurisdiction config.

## Project layout

```
app/            pages and API routes (Next.js App Router)
components/     small shared UI pieces
lib/            all logic: deadlines, aggregate, safety, classify, notice, store
supabase/       schema.sql
tests/          vitest unit tests
scripts/        eval.ts (model accuracy), seed-supabase.ts
eval/           labels.csv + images/ for your accuracy test
docs/           demo script
```

## License

MIT. See `LICENSE`.
