# AI-Powered CSV Importer

An intelligent CSV import tool that uses AI to extract and normalize messy spreadsheet data into a clean, CRM-ready format.

Built for the **Software Developer Intern** take-home assignment at GrowEasy — demonstrating backend architecture, AI integration, and frontend UX for data-heavy workflows.

**Status:** ✅ Complete — deployed and submission-ready.

---

## 🚀 Live Demo

- **Frontend:** https://ai-powered-csv-importer-virid.vercel.app/
- **Backend:** https://groweasy-backend-ffnk.onrender.com

> ⚠️ **Note:** Backend is hosted on Render's free tier. The first request after inactivity may take **30–60 seconds** due to cold start. This is expected and documented, not a bug.

---

## ✨ Features

- Upload and preview CSV files with **zero AI cost at the preview stage**
- AI-powered extraction into a structured CRM format (name, email, phone, company, notes, status, source, and more)
- Handles messy, unstructured, real-world input intelligently
- Batch processing with configurable chunk size and concurrency control
- Automatic retry with exponential backoff + model fallback on failures
- Row-level fault isolation — one bad row never sacks an entire batch
- Real-time progress updates during import via Server-Sent Events (SSE)
- Separate result views:
  - ✅ Successfully imported rows
  - ⚠️ Skipped rows, each with a specific reason
- Virtualized tables — tested smoothly on 1000+ row CSVs
- Dark mode with persistence
- Responsive design (mobile/tablet/desktop)
- Large file support (no hard row limit; a soft warning appears above 5,000 rows)

---

## 🏗️ Tech Stack

### Frontend
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Table (with `@tanstack/react-virtual` for row virtualization)
- TanStack Query
- PapaParse (in-browser CSV parsing)

### Backend
- Node.js + Express + TypeScript
- Zod (shared schema validation — both request validation and AI output validation)
- pino (structured logging)
- p-limit (batch concurrency control)
- Google Gemini API (AI extraction), abstracted behind an `AIProviderService` interface
  - Primary model: `gemini-3.1-flash-lite`
  - Fallback model: `gemini-3.5-flash`
  - *(Both configurable via env vars — no code change needed if models change again.)*

### Infra
- Docker + Docker Compose for local full-stack development
- Deployment: **Vercel** (frontend) + **Render** (backend)

---

## 📂 Project Structure

```
/frontend   → Next.js app (feature-based folders: upload/, preview/, import/, results/)
/backend    → Express API (controllers/services/schemas layering)
/docs       → Living documentation (contract, architecture, decisions, status)
```

Monorepo setup — one clone gets the whole system, simpler for evaluation at this scale.

---

## 🔄 How It Works

**Step 1 — Upload**
File is parsed locally in the browser (PapaParse). No backend or AI calls yet.

**Step 2 — Preview**
Shows the parsed rows in a table and validates structure before anything is sent server-side — this step is completely free.

**Step 3 — Import (AI Processing)**
On confirm, already-parsed rows are sent to the backend as JSON. Rows are chunked into batches and sent to Gemini for structured extraction, then strictly validated against a shared Zod schema before being accepted. Progress streams back in real time over SSE.

**Step 4 — Results**
Imported rows and skipped rows (each with a reason) are shown in separate, virtualized tables with summary totals.

---

## ⚙️ Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/Amitanshu05/AI-Powered-CSV-Importer.git
cd AI-Powered-CSV-Importer
```

### 2. Backend setup

```powershell
cd backend
npm install
```

Create a `.env` file in `backend/` with:

```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
NODE_ENV=development
GEMINI_PRIMARY_MODEL=gemini-3.1-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.5-flash
BATCH_SIZE=20
BATCH_CONCURRENCY=1
```

Run the backend:

```powershell
npm run dev
```

Backend runs on: `http://localhost:5000`

### 3. Frontend setup

```powershell
cd ../frontend
npm install
```

Create a `.env.local` file in `frontend/` with:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Run the frontend:

```powershell
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## 🐳 Docker (Optional Local Setup)

Docker support is included for local development and testing. Production deployments are hosted separately (Vercel for frontend, Render for backend) — Docker here is for local convenience, not how the live app is actually deployed.

```bash
docker compose up --build
```

---

## 📡 API Overview

Full request/response contract lives in [`docs/contract.md`](docs/contract.md). Summary:

| Endpoint | Purpose |
|---|---|
| `POST /api/import` | Submit parsed rows, get back `{ imported, skipped, totalImported, totalSkipped }` as a single JSON response |
| `POST /api/import/stream` | Same input/output shape, streamed as Server-Sent Events for real-time per-batch progress |
| `GET /api/health` | Basic health check for deployment sanity |

The backend is fully **stateless** — no database, no session, no job IDs. Every request carries everything it needs and returns everything it produces in one request/response (or one SSE stream) lifecycle.

---

## 🧠 Key Design Decisions

- **Stateless backend, no database** — the full pipeline (parse → batch → AI → validate → return) fits inside a single request; statelessness means trivial horizontal scaling and no server-side state bugs, at the cost of no import history/audit log (an explicit, acceptable tradeoff at this scope).
- **Batch processing, not per-row calls** — amortizes LLM call latency across many rows and stays under context/token ceilings.
- **Shared Zod schema for both AI output and API request validation** — one definition of "a valid CRM record," never trusted blindly even when Gemini's structured output mode reduces (but doesn't eliminate) malformed results.
- **Batch-level AND row-level fault isolation** — a failed batch retries with backoff; a single invalid row inside an otherwise-good batch is skipped, not the whole batch.
- **AI abstraction layer (`AIProviderService`)** — switching providers or model versions is a config change, not a rewrite (this already paid off once — see below).
- **Frontend-only CSV parsing** — the preview step costs zero backend/AI resources, and the backend never touches a raw file, only structured JSON.
- **SSE for progress, not polling** — keeps the entire batch loop inside one stateless HTTP lifecycle instead of reintroducing server-side job state.

Full rationale, alternatives considered, and a running log of real bugs fixed during the build (model deprecations, schema issues, date fabrication, phone formatting, table crashes, and more) are in [`docs/decisions.md`](docs/decisions.md) and [`docs/architecture.md`](docs/architecture.md).

---

## ⚠️ Known Limitations

- Large CSV files take longer due to sequential batch AI processing (a soft warning appears above 5,000 rows)
- Backend cold start on Render's free tier (~30–60s on first request after inactivity)
- No persistent storage — import history is not saved after the session ends (an intentional, documented tradeoff of the stateless design, not an oversight)

---

## 🧪 Testing

Run backend tests:

```powershell
npm run test
```

Tests are targeted rather than exhaustive, focused on the logic with the highest real bug-history during the build:
- CSV column safety (`buildSafeColumns` — fixes a real crash on blank/duplicate headers)
- AI output normalization (`created_at` fallback, phone digit-stripping, multi-email/mobile handling)

---

## 📌 Future Improvements

- Add a database for import history and audit logs
- File upload directly via backend (for persistence)
- Retry individual failed rows without re-uploading the whole file
- Further progress-visualization polish
- Drag-and-drop UX enhancements

---

## 👨‍💻 Author

Built by Amitanshu as part of the GrowEasy Software Developer Intern take-home assignment.

## 📄 License

For evaluation purposes only.