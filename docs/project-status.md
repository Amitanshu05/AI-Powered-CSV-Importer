# Project Status — GrowEasy CSV Importer

Purpose: narrative log of what's been done and why, updated after every meaningful milestone.
Paste this file's contents into a fresh Claude session to resume with full context if needed.

Position: Software Developer Intern
Repo: https://github.com/Amitanshu05/AI-Powered-CSV-Importer
Deadline: 12 July 2026

---

## Current Phase: Phase 4 — Backend API Surface (starting next)

## Stack Locked
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Table/Query + PapaParse
- Backend: Node.js + Express + TypeScript + Zod + pino + p-limit
- AI: Google Gemini — gemini-3.1-flash-lite (primary), gemini-3.5-flash (fallback) —
  both confirmed GA and current as of July 10, 2026
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
  along the way, logged in decisions.md #9-10: swapped ts-node-dev → tsx, removed deprecated
  `moduleResolution` from tsconfig.json.
- **Phase 2 — AI Pipeline:** `prompts/crm-extraction.prompt.ts` written (full field rules,
  enum constraints, ISO date format, multi-email/multi-mobile handling). `scripts/test-single-row.ts`
  proved one raw CSV row → Gemini structured-output call → Zod validation, end to end.
  Two issues fixed, logged in decisions.md #11: Gemini model retirements (switched to
  gemini-3.1-flash-lite primary / gemini-3.5-flash fallback), and a responseSchema bug
  causing silent field omission (fixed by marking all fields required-but-nullable).
- **Phase 3 — Batching & Robustness:** `services/ai-provider.service.ts` (AIProvider
  interface + GeminiAIProvider implementation, retry + model fallback, model names from
  env vars) and `services/batch.service.ts` (chunking via BATCH_SIZE, concurrency via
  p-limit + BATCH_CONCURRENCY, batch-level fault isolation, row-level skip logic) both
  built and verified working via `scripts/test-batch.ts` (5 mixed rows → 3 imported,
  2 skipped, counts matched). One real bug found and fixed during testing, logged in
  decisions.md #16: the AI was fabricating `created_at` dates for rows with no source
  date at all — root cause was the prompt explicitly instructing "use current date if
  none found" AND `created_at` being the one field not marked nullable in the response
  schema, so the model had no honest way to say "no date." Fixed at all three layers:
  prompt no longer allows fabrication, schema makes the field nullable (matching every
  other field), and `batch.service.ts` now fills a real fallback timestamp in code
  (not an AI guess) when the AI correctly reports null. Also enforced phone-number
  digit-only formatting in code rather than trusting AI prompt compliance. Both fixes
  re-verified via a second `npm run test:batch` run — confirmed working correctly.

## In Progress
- **Phase 4 — Backend API Surface:** not yet started. Next: build `POST /api/import`
  route wired to `batch.service.ts`'s `processRows()`, matching `contract.md`'s
  request/response shape exactly, tested manually with real sample CSV data.

## Not Started Yet
- Phase 5 — Frontend Core Flow
- Phase 6 — Polish & Bonus Points
- Phase 7 — Dockerize
- Phase 8 — Deploy
- Phase 9 — Final Docs & Submission

## Key Decisions Made So Far
(Full detail in docs/decisions.md — this is just a quick-reference summary)
1. Monorepo, not two separate repos
2. Stateless backend, no DB
3. Gemini as LLM provider — model names configurable via env (currently
   gemini-3.1-flash-lite primary, gemini-3.5-flash fallback)
4. Zod as shared validation layer (API + AI output)
5. Express kept as specified, structure compensates for its minimalism
6. TanStack Table/Query on frontend
7. Frontend parses CSV locally; backend never touches raw file
8. Render + Vercel for deployment
9. tsx instead of ts-node-dev
10. Removed deprecated `moduleResolution` config
11. Gemini model swap + responseSchema required-fields fix
12. One Gemini call per batch of rows, not per row
13. BATCH_SIZE = 20, BATCH_CONCURRENCY = 3 (both configurable via env)
14. p-limit pinned to ^3.1.0 (CommonJS compatibility — v4+ is ESM-only)
15. Newline escaping in crm_note enforced in code, not just prompted
16. Fixed created_at fabrication bug (prompt + schema + code-level fallback) and
    enforced phone digit-only formatting in code — see decisions.md #16 for full detail

## Known Issues / Open Questions
- None currently. gemini-3.5-flash's earlier 503 flakiness (noted in a prior session)
  has not recurred during Phase 3 testing — model fallback logic remains in place
  regardless, as a general resilience measure, not just a workaround for that issue.

## Next Immediate Step
Phase 4: build the `POST /api/import` Express route — controller calls
`batch.service.ts`'s `processRows()`, request validated against `ImportRequestSchema`,
response shaped exactly per `contract.md` §2. Manual test with real sample CSV data
via Postman/Thunder Client or a simple curl/PowerShell request.

---

*Update this file after every phase completes, or after any significant decision/change mid-phase.*