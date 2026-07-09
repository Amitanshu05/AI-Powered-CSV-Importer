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

---

*Add new entries below as they come up during the build (batching strategy specifics,
retry counts, prompt design choices worth recording, etc.).*