# Project Status — GrowEasy CSV Importer

Purpose: narrative log of what's been done and why, updated after every meaningful milestone.
Paste this file's contents into a fresh Claude session to resume with full context if needed.

Position: Software Developer Intern  
Repo: https://github.com/Amitanshu05/AI-Powered-CSV-Importer  
Deadline: 12 July 2026

---

## Current Phase: Phase 6 complete — starting Phase 7 (Dockerize)

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

- **Phase 4 — Backend API Surface:** `controllers/import.controller.ts` (thin HTTP layer —
  validates request against `ImportRequestSchema`, calls `processRows()`, shapes response
  exactly per contract.md, distinguishes EMPTY_ROWS/INVALID_PAYLOAD/AI_PROVIDER_ERROR)
  and `routes/import.routes.ts` (mounts POST /import), wired into `app.ts` under `/api`.
  Verified via real HTTP requests (PowerShell Invoke-RestMethod): success case returned
  correct imported/skipped shape, EMPTY_ROWS error case returned correct 400 + error body.
  No issues found this phase.

- **Phase 5 — Frontend Core Flow (complete):** Full upload → preview → confirm →
  results flow built and verified end-to-end against the live backend, including
  a stress test with a CSV containing embedded commas, quotes, and newlines (all
  correctly skipped with the right reason, none crashed the UI). `features/import/`
  (typed fetch to POST /api/import distinguishing NETWORK_ERROR from contract-level
  errors, TanStack Query mutation hook, indeterminate-progress UI) and
  `features/results/` (imported/skipped tabs, totals summary, all 15 CrmRecord
  fields rendered) built per contract.md §2 exactly. Three real bugs found during
  manual testing and fixed, all logged in decisions.md #22-26: a TanStack Table
  crash on blank/duplicate CSV headers, a missing next/font config causing a
  serif-font fallback, and shadcn's default neutral (zero-chroma) theme replaced
  with an indigo accent + light-gray page background for visible card elevation —
  all confirmed against real screenshots, not assumed. Visual polish pass done
  strictly within single-page scope per explicit developer instruction: no
  sidebar/topbar/dashboard shell added, only elevation/spacing/typography/
  transitions refined (decisions.md #26).

- **Phase 6 — Polish & Bonus Points (complete):** Real-time SSE progress
  (decisions.md #27), row virtualization via @tanstack/react-virtual in the
  shared DataTable (decisions.md #28) — verified on a real 1335-row CSV with
  smooth scroll, no lag. Dark mode toggle persisted to localStorage with
  system-preference fallback (decisions.md #29). Unit tests added on both
  sides: frontend covers buildSafeColumns edge cases (blank/duplicate headers)
  and CSV validation helpers; backend covers chunking, created_at fallback,
  phone normalization, and newline escaping — the exact bug-fix logic from
  decisions.md #11-16 (decisions.md #30). Responsive spacing pass on dropzone
  and results tabs for narrow viewports (decisions.md #31). One AI-extraction
  data-quality observation logged, not fixed (out of Phase 5/6 scope): a
  `mailto:` prefix occasionally survives partially in extracted emails —
  passes validation since still syntactically valid, but factually wrong.
  Candidate for a Phase 2 prompt refinement, not a frontend bug.

## In Progress
- **Phase 7 — Dockerize:** starting now.

## Not Started Yet
- Phase 8 — Deploy
- Phase 9 — Final Docs & Submission

## Key Decisions Made So Far
(unchanged...)

## Known Issues / Open Questions
- None currently.

## Next Immediate Step
Phase 7: Dockerize both frontend and backend with production-ready configs,
ensure environment variables are handled correctly, and verify containers run
locally before moving to deployment.

---

*Update this file after every phase completes, or after any significant decision/change mid-phase.*