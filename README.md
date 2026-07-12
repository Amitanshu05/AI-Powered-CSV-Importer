# AI-Powered CSV Importer

An intelligent CSV import tool that uses AI to extract and normalize messy spreadsheet data into a clean CRM-ready format.

Built as part of an assignment to demonstrate backend architecture, AI integration, and frontend UX for data-heavy workflows.

---

## 🚀 Live Demo

- Frontend: https://ai-powered-csv-importer-virid.vercel.app/
- Backend: https://groweasy-backend-ffnk.onrender.com

> ⚠️ Note: Backend is hosted on Render free tier. First request may take **30–60 seconds** due to cold start.

---

## ✨ Features

- Upload and preview CSV files (no AI cost at preview stage)
- AI-powered extraction into structured CRM format:
  - Name, Email, Phone, Company, Notes, Created At
- Handles messy/unstructured input intelligently
- Batch processing with concurrency control
- Progress tracking during import
- Separate views for:
  - ✅ Successfully imported rows
  - ⚠️ Skipped rows (with reasons)
- Large file support (no hard limit, but processing time scales)

---

## 🏗️ Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Table
- TanStack Query

### Backend
- Node.js + Express
- TypeScript
- Zod (validation)
- Google Gemini API (AI extraction)

---

## 📂 Project Structure

/frontend → Next.js app
/backend → Express API


Monorepo setup for easier evaluation and local setup.

---

## ⚙️ Local Setup

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd <repo-name>

cd backend
npm install

GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
NODE_ENV=development
GEMINI_PRIMARY_MODEL=gemini-3.1-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.5-flash
BATCH_SIZE=20
BATCH_CONCURRENCY=3

Run backend:
npm run dev

Backend runs on:
http://localhost:5000

3. Setup Frontend
cd ../frontend
npm install

Create a .env.local file:

NEXT_PUBLIC_API_URL=http://localhost:5000

Run frontend:

npm run dev

Frontend runs on:
👉 http://localhost:3000

🔄 How It Works
Step 1: Upload CSV
File is parsed locally in the browser
No backend/AI calls at this stage

Step 2: Preview
Shows first rows of CSV
Validates structure before sending

Step 3: Import (AI Processing)
Data is sent to backend
Processed in batches using Gemini AI
Each row is transformed into structured CRM format

Step 4: Results
Imported rows displayed separately
Skipped rows include failure reasons

🧠 Key Design Decisions
Stateless backend → no database, easier scaling
Batch processing → avoids token/rate limits
Strict schema validation (Zod) → prevents bad AI output
AI abstraction layer → easy to switch providers
Frontend CSV parsing → reduces backend load
SSE streaming (progress updates) → real-time feedback without polling

See decisions.md for full breakdown.

⚠️ Known Limitations
Large CSV files take longer due to batch AI processing
Backend cold start on Render (~30–60s)
No persistent storage (data is not saved after session)
🧪 Testing

Run tests (backend):

npm run test

Tests focus on:

CSV column safety
AI normalization logic

## 🐳 Docker (Optional Local Setup)

Docker support is included for local development and testing.

However, the production deployments are hosted separately:
- Frontend → Vercel
- Backend → Render

To run with Docker:

```bash
docker-compose up --build


📌 Future Improvements
Add database for import history
File upload via backend (for persistence)
Retry failed rows individually
Better progress visualization
Drag-and-drop UX enhancements
👨‍💻 Author

Built as part of an AI + full-stack engineering assignment.

📄 License

For evaluation purposes only.