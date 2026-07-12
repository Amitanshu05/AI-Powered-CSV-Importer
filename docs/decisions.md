# Decisions Log (ADR-style)

Short record of key decisions: what we chose, what else we considered, and why.
Add a new entry whenever a non-trivial choice is made during the build — this is your
"why did I do it this way" answer bank for the interview.

Format: **Decision → Alternatives considered → Reason**

---

### 1. Monorepo (frontend + backend in one repo)
- **Alternatives:** Two separate repos (frontend repo, backend repo)
- **Reason:** Solo submission, single evaluator needs to clone once and see the whole system.
  Simpler for a project this size; would reconsider for a real multi-team production app.

### 2. Stateless backend, no database
- **Alternatives:** Postgres/MongoDB to persist import history
- **Reason:** No requirement spans multiple requests in this assignment's flow. Statelessness
  gives trivial horizontal scaling and removes a class of bugs, at the cost of no import
  history/audit log — acceptable tradeoff at this scope. See `architecture.md` §3.

### 3. Google Gemini 2.5 Flash as the LLM provider
- **Alternatives:** OpenAI GPT, Anthropic Claude
- **Reason:** Most generous free tier of the three, fast, native structured JSON output
  (`responseSchema`) which directly supports our validation strategy. Abstracted behind
  `AIProviderService` so switching later is low-cost.

### 4. Zod as shared schema/validation library
- **Alternatives:** Joi, Yup, manual validation
- **Reason:** TypeScript-first (infers types directly from schema, no duplicate type
  definitions), used for both HTTP request validation and AI output validation — one
  definition of "valid CRM record," not two.

### 5. Express (not Fastify/NestJS)
- **Alternatives:** Fastify (faster), NestJS (more structured out of the box)
- **Reason:** Explicitly specified in the assignment's tech stack. We compensate for Express's
  lack of built-in structure with our own layered architecture (controllers/services/schemas)
  rather than switching frameworks.

### 6. TanStack Table + TanStack Query on frontend
- **Alternatives:** Hand-rolled table component, plain `fetch` + `useState`/`useEffect`
- **Reason:** Both are industry-standard, battle-tested, and directly solve requirements
  from the assignment (sticky headers, virtualization, loading/error states) without
  reinventing solved problems. Effort stays focused on the AI extraction quality.

### 7. Frontend does local CSV parsing; backend never sees the raw file
- **Alternatives:** Send raw file to backend, parse there
- **Reason:** Keeps backend stateless and file-free — it only ever receives/returns JSON.
  Also means the preview step (Step 2) costs zero backend/AI resources, matching the
  assignment's explicit "No AI processing should happen yet" instruction for that step.

### 8. Deployment: Render (backend) + Vercel (frontend)
- **Alternatives:** Railway (backend), single full-stack host
- **Reason:** Render has an actual free tier for web services (Railway's is trial-credit only
  now). Vercel is the standard for Next.js deployment. Tradeoff: Render free tier cold-starts
  after inactivity (~30-60s first request) — documented in README so it doesn't read as a bug.

### 9. Swapped ts-node-dev → tsx for dev server
- **Alternatives:** ts-node-dev (originally planned), nodemon + ts-node
- **Reason:** ts-node-dev is effectively unmaintained and broke immediately against a
  newer TypeScript version resolved during install (TypeScript 7.0 preview), throwing
  a cryptic `Cannot read properties of undefined (reading 'fileExists')` error. Switched
  to `tsx`, which is actively maintained, faster (esbuild-based), and required zero
  extra config. Also pinned `typescript@^5.6.0` explicitly to avoid accidentally
  installing a preview/unstable version again.

### 10. Removed explicit `moduleResolution` from tsconfig.json
- **Alternatives:** Keep `"moduleResolution": "node"` (deprecated alias for `node10`)
- **Reason:** TypeScript warned this option is deprecated and will stop working in TS 7.
  With `"module": "commonjs"` already set, TypeScript infers the correct classic Node
  resolution automatically — so the explicit (deprecated) setting was simply removed.

### 11. Swapped Gemini models mid-build + fixed a responseSchema bug
- **What was wrong:** `gemini-2.5-flash` and `gemini-2.5-flash-lite`, the originally
  planned models, were both retired by Google mid-2026 — calls started failing.
  Separately, the AI was silently omitting fields from its structured output
  instead of extracting them.
- **Fix:** Switched to `gemini-3.1-flash-lite` (primary) and `gemini-3.5-flash`
  (fallback), both confirmed GA and current as of July 10, 2026. The omission bug
  was a `responseSchema` issue — fields weren't marked as required-but-nullable
  correctly, so the model could skip them entirely rather than explicitly
  returning `null`. Fixed by marking every field required-but-nullable in the
  schema, consistent with the same pattern later reused for `created_at` (#16).
- **Why model names are env vars, not hardcoded:** `GEMINI_PRIMARY_MODEL` /
  `GEMINI_FALLBACK_MODEL` mean the next model retirement is a config change,
  not a code change — same reasoning as `AIProviderService`'s abstraction in
  `architecture.md` §2.

### 12. One Gemini call per batch of rows, not per row
- **Alternatives:** One AI call per individual CSV row
- **Reason:** A single LLM call has fixed latency overhead regardless of how
  many rows it processes in one structured-output call, up to its context
  limit. Batching amortizes that overhead across many rows instead of paying
  it per row — directly why `BatchService` exists per `architecture.md` §2's
  layering table ("A single LLM call has a token ceiling... must be chunked").

### 13. BATCH_SIZE = 20, BATCH_CONCURRENCY = 1 (both env-configurable)
- **Alternatives:** Larger batches (fewer, bigger AI calls) or fully sequential
  processing (no concurrency)
- **Reason:** 20 rows per batch balances prompt size against per-call latency;
  processing 1 batches concurrently speeds up large files without tripping
  Gemini's rate limits. Both are env vars, not hardcoded, so they can be tuned
  post-deployment without a code change — same philosophy as #11's model names.

### 14. Pinned p-limit to ^3.1.0
- **Alternatives:** Latest p-limit (v4+)
- **Reason:** p-limit v4 and later are ESM-only, which is incompatible with this
  project's `"module": "commonjs"` TypeScript config (see #10). v3.1.0 is the
  last CommonJS-compatible release, so it's pinned explicitly rather than left
  on a caret range that could silently upgrade into a broken install.

### 15. Newline escaping in `crm_note` enforced in code, not just prompted
- **What was wrong:** Multi-email/multi-mobile rows get extra values appended
  into `crm_note` (contract.md §1), and if the source data contains embedded
  newlines, an unescaped newline inside a CSV field breaks re-export as CSV
  later — the row would visually split across multiple lines.
- **Fix:** `batch.service.ts` escapes any newline in `crm_note` to `\n`
  unconditionally, regardless of whether the AI already did so correctly.
  Same "never trust the model's output blindly" principle as #16 and
  `architecture.md` §2 — asking the prompt to do it is a request, enforcing it
  in code is a guarantee.

### 16. Fixed created_at fabrication + enforced phone digit-formatting in code
- **What was wrong:** rows with no date anywhere in the source were getting a
  fabricated `created_at` (the AI invented a value). Root cause: the prompt
  explicitly said "if no date, use the current date" (contradicting the "never
  fabricate" rule stated for every other field), AND `created_at` was the only
  field not marked nullable in Gemini's `responseSchema` — the model was
  structurally unable to say "I don't know." Separately, phone numbers were
  coming back with spaces (`"98765 43210"`) instead of digits-only, despite the
  prompt asking for digits-only — the AI didn't reliably comply.
- **Fix:** (1) prompt now explicitly forbids inventing a date, matching the
  "null is a valid answer" rule already used elsewhere; (2) `created_at` marked
  `nullable: true` in both the Gemini responseSchema and the Zod schema, same
  pattern as every other field; (3) `batch.service.ts` now normalizes every raw
  AI record BEFORE Zod validation — if `created_at` is null, our own code fills
  the current processing timestamp (an honest "we don't know the original date"
  fallback, not an AI guess); phone numbers get `.replace(/\D/g, "")` regardless
  of what the AI returned.
- **Why the fallback belongs in code, not the prompt:** consistent with
  architecture.md §2's core principle — "never trust the model's output blindly."
  Asking nicely in a prompt is a request; enforcing the actual business rule in
  code is a guarantee. Verified via `npm run test:batch`: rows with a real source
  date keep it, rows with no source date get today's real timestamp (not a fake
  date), and all phone numbers come back digits-only.

### 17. Frontend folder structure: 4 feature folders, not architecture.md's literal 3
- **Alternatives:** Literal `upload/`, `table/`, `ui/` as named in architecture.md §6
- **Reason:** checklist.md's Phase 5 already splits the work into 4 distinct steps
  (Upload UI → Preview table → Confirm/API call → Results table), and contract.md
  treats "preview" (frontend-only, zero cost) and "results" (post-API) as separate
  concerns. Mapped folders to those 4 steps: `upload/`, `preview/`, `import/`,
  `results/`. Confirmed explicitly with the developer before writing code.

### 18. Non-CSV file uploads rejected with inline error, not silently ignored or force-parsed
- **Alternatives:** Silently reject the drop; try parsing any file type anyway
- **Reason:** Silent rejection gives no feedback; force-parsing garbage rows would
  produce a confusing preview. Inline error naming the bad file is clearest,
  consistent with "never trust input blindly" (architecture.md §2).

### 19. Large-CSV threshold set at 5,000 rows — warns, does not block
- **Alternatives:** No warning at all; hard block above a row limit
- **Reason:** BATCH_SIZE=20 means a 5,000-row file is ~250 sequential AI batches —
  worth flagging so the user isn't confused by a long wait. No technical ceiling
  requires an actual block.

### 20. Preview table caps rendered rows at 100 (pre-virtualization)
- **Alternatives:** Render all parsed rows immediately; build virtualization now
- **Reason:** checklist.md explicitly places virtualization under Phase 6 bonus,
  not Phase 5. Capping avoids a laggy preview in the meantime; all parsed rows
  are still sent to the backend on Confirm regardless of what's rendered.

### 21. Fixed TanStack Table crash on blank/duplicate CSV headers
- **What was wrong:** A real test CSV had a trailing blank header column.
  `id: field` with `field === ""` produced a falsy id; TanStack Table's internal
  `if (!id)` check treated empty string as "no id," throwing
  "Columns require an id when using a non-string header" and crashing the whole
  preview/results table.
- **Fix:** New shared `src/lib/csv-columns.ts` (`buildSafeColumns`) guarantees a
  non-empty, unique `id` and display `label` for every column regardless of the
  raw header, while `accessorFn` (not `accessorKey`) always reads the exact
  original field name — so data is never renamed or misread, only the column
  id/label used for rendering. Applied to both `features/preview/columns.tsx`
  and `features/results/columns.tsx` (skipped-rows table) since both build
  columns dynamically from raw CSV headers.

### 22. Import errors split into NETWORK_ERROR vs. contract-level errors, both retryable
- **Alternatives:** Treat all fetch failures the same; make the user re-upload on any error
- **Reason:** contract.md §2 only defines request-level error codes
  (INVALID_PAYLOAD/AI_PROVIDER_ERROR/EMPTY_ROWS), which assume a response was
  received. A network failure (backend unreachable) never gets that far. Both
  are caught in `import-rows.ts` as one `ImportRequestError` type so the UI
  doesn't special-case them, and a Retry button re-fires the same already-
  parsed rows — no re-upload needed, since the rows never left the browser
  until Confirm.

### 23. Fixed missing font configuration (next/font)
- **What was wrong:** `layout.tsx` never configured `next/font`, so no sans-serif
  font was actually loaded — the browser fell back to a serif font on headings,
  confirmed visually in testing (looked like Times/Georgia instead of Inter).
- **Fix:** Wired `Inter` via `next/font/google` into the `--font-sans` CSS
  variable that shadcn's `globals.css` already expected, per `components.json`'s
  existing `cssVariables: true` setup — no theme file changes needed, just the
  missing font loader.

### 24. Replaced shadcn's default neutral (zero-chroma) theme with an indigo accent
- **What was wrong:** `components.json` had `baseColor: "neutral"`, meaning every
  theme color was `oklch(x 0 0)` — literally zero saturation. Combined with
  `--background` and `--card` both being pure white, the app had no visible
  color and no card elevation contrast at all.
- **Fix:** Set `--primary`/`--ring`/`--accent` to real indigo values (confirmed
  against actual browser DevTools computed styles, not assumed), and changed
  `--background` to a soft light-gray so white cards visibly lift off the page.
  Verified against screenshots before/after — this was a real bug, not a
  subjective style opinion, since a zero-chroma theme is not a valid design
  choice for "modern SaaS" regardless of taste.

### 25. Visual polish scoped to single-page structure only — no dashboard shell
- **Alternatives:** Restructure into a multi-page dashboard matching the
  reference screenshots' sidebar/topbar layout
- **Reason:** Explicitly rejected by the developer. checklist.md/architecture.md
  never scope a dashboard shell — this is a single-flow tool. Matched the
  reference's visual *quality* (elevation, spacing, typography, button weight,
  hover transitions) via a shared `src/lib/ui.ts` token file (`cardSurface`,
  `cardPadding`) applied consistently across every panel, not per-component
  guesswork. Structure was explicitly left untouched.

### 26. Used `hover:brightness-110` instead of a literal gradient on the primary button
- **Alternatives:** Hardcoded CSS gradient on the Confirm Import button
- **Reason:** A hardcoded gradient stop would bypass the CSS-variable theme
  system (`--primary`) — if the theme color changes later, a hardcoded gradient
  wouldn't follow it. `brightness-110` achieves the same "richer on hover" feel
  while staying fully theme-driven.

### 27. Progress indicator: SSE, not polling
- **Alternatives:** Polling a job-status endpoint (`GET /api/import/:jobId/status`)
- **Reason:** Polling requires the backend to persist job state between separate
  HTTP requests — reintroducing exactly the server-side state `architecture.md`
  §3 explicitly rejected ("any backend instance can handle any request... no
  server-side memory leaks"). SSE keeps the whole batch loop inside one HTTP
  request/response lifecycle — same stateless request, just streamed instead
  of buffered — so it's the only progress mechanism that doesn't contradict the
  existing stateless architecture. New endpoint `POST /api/import/stream`,
  additive alongside the original `POST /api/import` (see contract.md §2.5).

  ### 28. Row virtualization via @tanstack/react-virtual, not a manual windowing implementation
- **Alternatives:** Hand-rolled scroll-based windowing; react-window
- **Reason:** Already committed to the TanStack ecosystem (Table + Query,
  decisions.md #6) — react-virtual shares conventions and composes cleanly
  with the existing DataTable instead of introducing a second virtualization
  library with different APIs. Applied once in the shared DataTable component,
  so preview, imported, and skipped tables all got virtualization from a
  single change. Verified on a real 1335-row CSV.

### 29. Dark mode via manual class toggle + localStorage, not next-themes
- **Alternatives:** next-themes package
- **Reason:** globals.css already had a complete `.dark` CSS variable block
  defined by shadcn init — toggling the `dark` class on `<html>` was all
  that was missing. Didn't add a dependency for something achievable in ~20
  lines. Respects system preference (`prefers-color-scheme`) as the initial
  default, explicit user choice persisted to localStorage afterward.

### 30. Unit tests target the actual bug-fix logic, not full coverage
- **Alternatives:** Comprehensive test suite across all components/services
- **Reason:** checklist.md explicitly asks for "a few targeted" tests, not
  full coverage, given the timeline. Chose the functions with the highest
  bug-history: buildSafeColumns (decisions.md #21's crash fix) and the four
  batch.service.ts normalization helpers (decisions.md #11-16's fixes) —
  tests that would have caught those real bugs if they'd existed earlier,
  rather than tests for already-simple, low-risk code.

### 31. Responsive pass: spacing/wrap adjustments only, no separate mobile layout
- **Alternatives:** Distinct mobile-specific component variants
- **Reason:** The existing Tailwind responsive classes already handled most
  breakpoints; the only real narrow-viewport issues were the dropzone's
  padding and the results tabs bar not wrapping. Fixed both with `sm:`
  breakpoint utilities on the same components — no structural duplication.

  ### 32. Excluded test files and vitest config from production TypeScript builds
- **What was wrong:** `npm run build` (backend's `tsc`, frontend's `next build`)
  both typecheck every `.ts` file in the project by default, including
  `*.test.ts` files and `vitest.config.ts` — but `vitest` is a dev-only
  dependency, never installed in the Docker runner stage (`npm ci --omit=dev`),
  so the build failed trying to resolve its types.
- **Fix:** Added `"exclude": [..., "**/*.test.ts", "vitest.config.ts"]` to both
  `backend/tsconfig.json` and `frontend/tsconfig.json`. Test files were never
  meant to be part of the compiled production output in the first place —
  `npm run test` (vitest) runs them directly without going through `tsc`/
  `next build` at all, so excluding them from the build doesn't affect test
  execution, only removes them from something that never needed to see them.


### 33. Cursor pointer for all interactive elements
- **Alternatives:** Default cursor behavior
- **Reason:** Improves UX clarity — users immediately understand clickable elements. Applied consistently across buttons and interactive UI.

### 34. Standardized padding system for UI consistency
- **Alternatives:** Per-component manual spacing
- **Reason:** Earlier UI felt inconsistent (some cramped, some oversized). Standardizing padding via shared tokens (`cardPadding`, button spacing) ensures visual balance across all components.

### 35. Improved visual hierarchy (font weight + contrast)
- **Alternatives:** Default shadcn typography
- **Reason:** UI initially looked “flat” with weak emphasis. Increased font weight, contrast, and spacing to create clearer hierarchy and improve readability.

### 36. Balanced tab/button sizing and spacing
- **Alternatives:** Uneven padding and text scaling
- **Reason:** Tabs previously felt either cramped or oversized. Adjusted padding and alignment so both "Imported" and "Skipped" feel visually balanced and equally important.

### 37. Hover feedback improvements for better affordance
- **Alternatives:** Minimal or no hover states
- **Reason:** Stronger hover states (background + color + brightness) make UI feel more interactive and responsive.

### 38. Consistent design tokens instead of scattered styles
- **Alternatives:** Inline Tailwind classes everywhere
- **Reason:** Centralizing styles in `ui.ts` improves maintainability and keeps the design system consistent across pages.

### 39. Avoid over-design — maintain single-flow UX
- **Alternatives:** Adding dashboards, sidebars, complex layouts
- **Reason:** Keeping UI simple aligns with assignment scope and improves usability — focus stays on CSV import workflow.

### 40. Iterative UI refinement based on real usage feedback
- **Alternatives:** One-time design implementation
- **Reason:** Real testing revealed spacing, contrast, and interaction issues that weren’t obvious initially — refining based on usage led to a more polished product.
---

*Add new entries below as they come up during the build (batching strategy specifics,
retry counts, prompt design choices worth recording, etc.).*