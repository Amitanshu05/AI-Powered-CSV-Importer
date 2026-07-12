# Architecture — GrowEasy CSV Importer

This document explains *why* the system is built the way it is. Every decision below maps to a specific
requirement or failure mode from the assignment — nothing here is decoration.

---

## 1. High-Level Data Flow

```
┌──────────────┐     raw file      ┌──────────────────┐
│   Browser    │ ───────────────▶  │  Local CSV Parse  │   (PapaParse, in-browser)
│  (drag/drop  │                   │  + Preview Table   │   No backend call yet.
│  or picker)  │                   └─────────┬─────────┘
└──────────────┘                             │ user reviews preview
                                              │ clicks "Confirm"
                                              ▼
                                   ┌───────────────────────┐
                                   │  POST /api/import      │
                                   │  body: { rows: [...] } │  (already-parsed JSON,
                                   └─────────┬─────────────┘   NOT the raw file)
                                             ▼
                              ┌────────────────────────────┐
                              │  Controller → BatchService   │
                              │  chunk rows → concurrency-   │
                              │  limited batches             │
                              └─────────┬────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │  AIProviderService (Gemini)     │
                        │  structured JSON output mode    │
                        └─────────┬───────────────────────┘
                                  ▼
                     ┌─────────────────────────────┐
                     │  ValidationService (Zod)      │
                     │  enum checks, skip logic,     │
                     │  multi-email/mobile handling  │
                     └─────────┬─────────────────────┘
                               ▼
                  { imported: [...], skipped: [...] }
                               │
                               ▼
                     Response table in browser
```

---

## 2. Why This Layering (not a monolith route handler)

Each layer exists because of a specific problem we identified up front, not by default:

| Layer | Exists because... |
|---|---|
| **Frontend local parse** | AI cost/latency shouldn't be paid just to preview a file. Also lets users catch a wrong file before we spend an API call on it. |
| **BatchService** | A single LLM call has a token ceiling. Large CSVs (hundreds/thousands of rows) must be chunked. Also owns concurrency limits so we don't get rate-limited by Gemini. |
| **AIProviderService** | Abstracts the actual LLM SDK behind an interface. If Gemini has an outage or we want to compare providers, it's a config change, not a rewrite. |
| **ValidationService** | The AI's structured output mode reduces malformed JSON but does not guarantee semantic correctness (e.g., it could still emit `data_source: "some_random_value"`). This layer is the actual enforcement point for the enum/business rules — we never trust the model's output blindly. |

This mirrors a common real-world pattern: **generation and validation are different concerns, done by different code, even when generation is "structured."** LLM structured-output modes reduce syntax errors; they do not enforce your business rules.

---

## 3. Why Stateless (no database)

**Decision:** No database. The backend holds no data between requests.

**Reasoning:**
- The full pipeline (parse → batch → AI → validate → return) fits in a single request/response cycle. There's no natural "session" that spans multiple HTTP calls.
- Statelessness means any backend instance can handle any request — trivial horizontal scaling, no sticky sessions, no server-side memory leaks from held file data.
- It removes an entire class of bugs (stale state, cleanup logic, concurrent-request collisions) that a stateful design would introduce for zero functional benefit here.

**Tradeoff, acknowledged directly (per review from another advisor on this project):**
Going stateless means we give up: persistence of import history, retrying a failed import without re-uploading, and audit logs of past imports. For this assignment's scope — a single upload → preview → confirm → result flow — none of these are required or asked for. If this were a real production feature, the natural next step would be adding a lightweight table (e.g. Postgres) to store import batches and results for history/audit purposes. We're explicitly deferring that, not overlooking it — see `decisions.md`.

---

## 4. Why Zod as Shared Validation Layer

One library serves two jobs:
1. **Request validation** — is `POST /api/import`'s body shaped correctly?
2. **AI output validation** — did Gemini's structured response actually match `CrmRecordSchema`, including the enum constraints?

Using the same schema definition for both means the "shape of a valid CRM record" is defined exactly once (`schemas/crm-record.schema.ts`), and both the API boundary and the AI boundary are checked against that single definition. This is also what `contract.md` mirrors in documentation form — code and docs describe the same schema, not two independently-maintained versions.

---

## 5. Why Batch-Level AND Row-Level Fault Isolation

Two levels of resilience, not one:
- **Batch level:** if an entire batch call fails (network error, provider downtime), retry with exponential backoff (max 2-3 attempts) before giving up on that batch.
- **Row level:** if a batch succeeds but one row inside it is invalid (fails Zod validation, missing email+mobile, etc.), only that row is skipped — the other 19/20 rows in the batch still get returned as `imported`.

Without row-level isolation, one bad row would force us to discard an entire otherwise-good batch — unacceptable at scale, and against the whole spirit of "handling messy datasets" that's explicitly in the evaluation criteria.

---

## 6. Frontend Architecture Notes

- **Feature-based folder structure** (`upload/`, `preview/`, `import/`, `results/` — mapped
  to the 4 sub-steps of the import flow, not the 3 literally sketched at planning time)
  rather than type-based (`components/`, `containers/`, `pages/` split arbitrarily) — keeps
  everything related to one concern physically together, easier to navigate for a reviewer
  skimming the repo. See decisions.md #17 for why this diverged from the original 3-folder
  sketch.
  
- **TanStack Query** owns all server communication — gives loading/error/retry states without hand-rolled `useEffect` fetch logic, which is a common source of race-condition bugs in junior code.
- **TanStack Table** owns the preview and results tables — virtualization and sticky headers come from the library, not custom-built, so effort goes into correctness of data rather than reinventing table rendering.

---

## 7. What We Deliberately Did NOT Build

Being explicit about scope boundaries is itself a signal of engineering judgment:
- No user auth/accounts — not asked for, adds nothing to the evaluation.
- No database/persistence — see Section 3.
- No multi-tenant support — single-user tool as specified.
- No custom-built CSV parser or table virtualization — using battle-tested libraries (PapaParse, TanStack) instead of reinventing solved problems, so effort concentrates on the actual hard part: AI field mapping.

---

*This document should stay in sync with actual implementation. If a decision here changes during build, update this file and add an entry to `decisions.md` explaining the change.*