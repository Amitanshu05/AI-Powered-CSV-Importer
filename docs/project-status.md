# Project Status — GrowEasy CSV Importer

Purpose: narrative log of what's been done and why, updated after every meaningful milestone.
Paste this file's contents into a fresh Claude session to resume with full context if needed.

Position: Software Developer Intern
Repo: https://github.com/Amitanshu05/AI-Powered-CSV-Importer
Deadline: 12 July 2026

---

## Current Phase: Phase 3 — Batching & Robustness (starting next)

## Stack Locked
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Table/Query + PapaParse
- Backend: Node.js + Express + TypeScript + Zod + pino + p-limit
- AI: Google Gemini — gemini-3.1-flash-lite (primary), gemini-3.5-flash (fallback) —
  see decisions.md #11 for why the original gemini-2.5-flash choice changed
- Database: none (stateless by design — see architecture.md §3)
- Deployment: Vercel (frontend) + Render (backend)

## Completed
- **Phase 0 — Setup & Docs:** repo created (monorepo: frontend/, backend/, docs/), .gitignore
  configured, Gemini API key obtained and stored in backend/.env (not committed),
  .env.example committed, contract.md / architecture.md / decisions.md all drafted and pushed.
- **Phase 1 — Backend Core:** Express + TypeScript scaffolded (strict mode), `config/env.ts`
  (fail-fast Zod validation of env vars, tested working), `config/logger.ts` (pino, pretty
  in dev), `config/app-error.ts` + `middleware/error-handler.ts` (centralized error handling
  matching contract.md's error shape), `schemas/crm-record.schema.ts` (mirrors contract.md
  exactly), minimal `app.ts` with `/api/health` verified returning 200. Two debugging fixes
  along the way, logged in decisions.md #9-10: swapped ts-node-dev → tsx (unmaintained,
  broke against TS 7.0 preview), removed deprecated `moduleResolution` from tsconfig.json.
- **Phase 2 — AI Pipeline:** `prompts/crm-extraction.prompt.ts` written (full field rules,
  enum constraints, ISO date format, multi-email/multi-mobile handling, explicit
  "never omit a field" instruction). `scripts/test-single-row.ts` proves one raw CSV
  row → Gemini structured-output call → Zod validation, end to end, confirmed with a
  genuinely correct extraction on a deliberately messy test row (mismatched column
  names, two emails, two phone numbers, non-enum status text — all mapped correctly).
  Two real issues hit and fixed along the way, logged in decisions.md #11:
  (1) both gemini-2.5-flash and gemini-2.5-flash-lite are now fully retired by Google —
  switched to gemini-3.1-flash-lite as primary, gemini-3.5-flash as fallback (currently
  flaky on free tier, revisit later); (2) Gemini's responseSchema only marked
  `created_at` as required, so the model would silently omit fields instead of
  extracting them — fixed by marking all fields required (still nullable). Small
  retry-with-backoff + model fallback also added (pulled forward from Phase 3's planned
  retry logic, scoped to this one call only, to unblock testing during a Gemini outage).

## In Progress
- **Phase 3 — Batching & Robustness:** not yet started. Next: extract the working
  single-row logic into `AIProviderService`, and make Gemini model names configurable
  via env vars (`GEMINI_PRIMARY_MODEL` / `GEMINI_FALLBACK_MODEL`) rather than hardcoded —
  added as an explicit Phase 3 item after hitting two live model retirements in one day.

## Not Started Yet
- Phase 4 — Backend API Surface
- Phase 5 — Frontend Core Flow
- Phase 6 — Polish & Bonus Points
- Phase 7 — Dockerize
- Phase 8 — Deploy
- Phase 9 — Final Docs & Submission

## Key Decisions Made So Far
(Full detail in docs/decisions.md — this is just a quick-reference summary)
1. Monorepo, not two separate repos
2. Stateless backend, no DB
3. ~~Gemini 2.5 Flash~~ — retired by Google mid-2026; now gemini-3.1-flash-lite
   (primary) + gemini-3.5-flash (fallback) — see #11
4. Zod as shared validation layer (API + AI output)
5. Express kept as specified, structure compensates for its minimalism
6. TanStack Table/Query on frontend
7. Frontend parses CSV locally; backend never touches raw file
8. Render + Vercel for deployment
9. tsx instead of ts-node-dev (unmaintained, broke against TS 7.0 preview)
10. Removed deprecated `moduleResolution` config (inferred automatically from `module: commonjs`)
11. Gemini model swap + responseSchema required-fields fix (see decisions.md for full detail)

## Known Issues / Open Questions
- gemini-3.5-flash returning persistent 503s on free tier as of today — using
  gemini-3.1-flash-lite as primary for now. Revisit model order once confirmed stable.

## Next Immediate Step
Phase 3: extract AIProviderService (interface + Gemini implementation, model names from
env vars), extract BatchService (chunking + concurrency limit), add batch-level retry
with backoff, add row-level skip logic (no email AND no mobile → skip with reason),
test against a real messy multi-format CSV.

---

*Update this file after every phase completes, or after any significant decision/change mid-phase.*