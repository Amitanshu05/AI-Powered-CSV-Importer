# GrowEasy CSV Importer — Master Checklist

Position: Software Developer Intern
Deadline: 12 July 2026

Legend: [ ] pending · [~] in progress · [x] done

---

## Phase 0 — Setup & Docs (Day 1, morning)

- [x] Create GitHub repo (monorepo: `frontend/`, `backend/`, `docs/`)
- [x] Initialize `main` branch, add `.gitignore` (Node + Next.js)
- [x] Get Gemini API key from Google AI Studio, store locally (never commit)
- [x] Draft `docs/contract.md` — endpoint shapes, CRM schema, error format
- [x] Draft `docs/architecture.md` — stack reasoning, data flow, DB tradeoff note
- [x] Draft `docs/decisions.md` — start the ADR log (first entries: stateless, Zod, Gemini, Render/Vercel)
- [x] Create `docs/project-status.md` (empty template, update after each phase)
- [x] First commit + push: `chore: initial repo structure + docs`

## Phase 1 — Backend Core (Day 1, afternoon)

- [x] Scaffold Express + TypeScript project (`backend/`)
- [x] Set up `config/env.ts` with validated env vars (Zod)
- [x] Set up centralized error-handling middleware
- [x] Set up `pino` logging
- [x] Build `schemas/crm-record.schema.ts` (matching contract.md)
- [x] Commit: `feat: backend scaffold + config + error handling`

## Phase 2 — AI Pipeline (single row, dumb version first) (Day 1 evening – Day 2 morning)

- [x] Write a raw prompt for Gemini using the CRM field rules from the assignment (enums, note-appending, date format)
- [x] Get ONE row through: raw CSV row JSON → Gemini call → structured JSON output
- [x] Validate output against Zod schema manually, confirm it works end-to-end
- [x] Commit: `feat: single-row AI extraction working`
  - Also fixed along the way (see decisions.md #11): gemini-2.5-flash and
    gemini-2.5-flash-lite both retired by Google mid-2026 — switched to
    gemini-3.1-flash-lite (primary) + gemini-3.5-flash (fallback); fixed a
    responseSchema bug causing the AI to silently omit fields instead of
    extracting them.

## Phase 3 — Batching & Robustness (Day 2)

- [x] Extract into `AIProviderService` (interface + Gemini implementation)
- [x] Make model names configurable via env vars (`GEMINI_PRIMARY_MODEL`,
      `GEMINI_FALLBACK_MODEL`) instead of hardcoded
- [x] Extract into `BatchService`: chunking by row count, concurrency limit (p-limit)
- [x] Add retry with exponential backoff + model fallback on batch failure
- [x] Add row-level validation/skip logic (skip if no email AND no mobile)
- [x] Add skip reason surfaced in response payload
- [x] Handle multi-email / multi-mobile → append to `crm_note`
- [x] Handle newline escaping in `crm_note` for CSV safety (enforced in code)
- [x] Test with a messy multi-format CSV (different headers, missing fields, embedded commas)
- [x] Commit: `feat: batch processing, retry, validation layer`
  - Also fixed along the way (see decisions.md #16): AI was fabricating
    `created_at` dates for rows with no source date (prompt + schema bug —
    field wasn't allowed to be null); fixed prompt + schema, added code-level
    fallback (real processing timestamp, not an AI guess). Also enforced
    digits-only phone formatting in code rather than trusting the AI's
    compliance with the prompt instruction.

## Phase 4 — Backend API Surface (Day 2)

- [ ] Build `POST /api/import` — accepts parsed rows, returns extracted CRM records + skip summary
- [ ] Wire controller → services, confirm contract.md matches actual implementation
- [ ] Manual test via Postman/Thunder Client with real sample CSVs
- [ ] Commit: `feat: import API endpoint complete`

## Phase 5 — Frontend Core Flow (Day 2 evening – Day 3 morning)

- [ ] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui
- [ ] Step 1: Upload UI (drag & drop + file picker)
- [ ] Step 2: Local CSV parse (PapaParse) + preview table (TanStack Table, sticky headers, scroll)
- [ ] Step 3: Confirm button → calls backend API (TanStack Query)
- [ ] Step 4: Results table — success/skipped records, totals
- [ ] Loading states, error states throughout
- [ ] Commit: `feat: frontend upload-preview-confirm-results flow`

## Phase 6 — Polish & Bonus Points (Day 3)

- [ ] Progress indicator during AI processing (SSE or polling)
- [ ] Virtualized table confirmed working on large CSV (1000+ rows)
- [ ] Dark mode toggle
- [ ] A few targeted unit tests (validation logic, skip logic, multi-email handling)
- [ ] Responsive design check (mobile/tablet widths)
- [ ] Commit: `feat: progress indicator, dark mode, tests`

## Phase 7 — Dockerize (Day 3)

- [ ] `Dockerfile` for backend
- [ ] `Dockerfile` for frontend (or confirm Vercel handles it natively — document choice)
- [ ] `docker-compose.yml` for local full-stack run
- [ ] Commit: `chore: docker setup`

## Phase 8 — Deploy (Day 3)

- [ ] Deploy backend to Render, confirm env vars set, test live endpoint
- [ ] Deploy frontend to Vercel, point to live backend URL
- [ ] Full end-to-end test on the live deployed app (not localhost)
- [ ] Commit: `chore: deployment config`

## Phase 9 — Final Docs & Submission (Day 3, final hours)

- [ ] Update `docs/project-status.md` to final "complete" state
- [ ] Write final `README.md`: setup instructions, tech stack, architecture summary, live URL, known limitations (e.g. Render cold start)
- [ ] Final pass: re-check every explicit AI Instruction rule from the assignment doc against actual behavior
- [ ] Final commit + push: `docs: final README + submission ready`
- [ ] Send email to varun@groweasy.ai with: hosted URL, GitHub URL, position (Intern)

---

## Notes
- Update this file's checkboxes as we go — paste the current state into any new Claude session to resume with full context.
- Pair with `docs/project-status.md` for narrative progress notes (this file is task tracking, that one is "what happened and why").