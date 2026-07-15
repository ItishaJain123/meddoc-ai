# MedDoc AI 🩺

**Your personal medical document assistant** — upload medical reports and instantly understand what your values mean, how they compare to safe ranges, and how they change over time. No medical background needed.

**Live demo:** [meddoc-ai.vercel.app](https://meddoc-ai.vercel.app) — click **"Try with sample data"** to explore without uploading anything.

---

## What it does

Patients receive lab reports full of numbers and jargon. MedDoc AI turns them into clear, actionable insight:

- 📄 **Document analysis** — upload PDFs or images of lab reports, prescriptions, and X-rays; AI extracts every metric, medication, and clinical finding automatically
- 📊 **Health dashboard** — a one-glance health score ring, abnormal-value alerts, and charts showing exactly which values need attention
- 💬 **Smart Chat (RAG)** — ask questions about *your own* reports in plain language (English, Hindi, and more); every answer cites the source document
- 📈 **Health trends** — track any lab value across reports over time, with safe-range bands
- 🕐 **Timeline** — every report, out-of-range value, and medication in one chronological view
- ⚖️ **Report comparison** — side-by-side diff of two reports with an AI "what changed" narrative
- 💊 **Medications** — auto-extracted from prescriptions, with browser reminders
- 🎯 **Health goals** — one-click goals suggested from your abnormal values, tracked automatically as new reports arrive
- 📋 **Doctor-ready summary** — AI-generated health briefing, printable and shareable via expiring link
- 🫧 **Companion desktop app** — an on-screen buddy that reminds you to drink water, eat, take medicines, and move, synced to your MedDoc account (see [`companion/`](./companion))
- 🌙 Full dark mode, command palette (Ctrl+K), demo mode with sample data

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router 7, Recharts, CSS Modules, Clerk (auth) |
| Backend | Node.js, Express 5, Prisma ORM |
| Database | PostgreSQL / MySQL (provider-agnostic schema) |
| AI | Google Gemini via LangChain — chat, extraction, embeddings (RAG) |
| Security | Helmet CSP, AES-256 encryption at rest for uploads, rate limiting, Clerk JWT on every API route |

## Architecture

```
client/  React SPA (Vercel)
   │  REST + SSE (streaming chat)
   ▼
server/  Express API
   ├─ Clerk auth middleware → per-user data isolation
   ├─ Document pipeline: verify (is it medical?) → extract text →
   │  encrypt file → chunk → embed → store metrics & findings
   ├─ RAG chat: similarity search over the user's chunks → Gemini
   │  with citation-enforced prompt → SSE token stream
   └─ Prisma → PostgreSQL / MySQL
```

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL or MySQL database
- [Clerk](https://clerk.com) application (publishable + secret keys)
- [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### 1. Clone & install

```bash
git clone https://github.com/ItishaJain123/meddoc-ai.git
cd meddoc-ai
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

Create `server/.env` (see `server/.env.example`):

```env
MEDDOC_NODE_ENV=development
MEDDOC_CLIENT_URL=http://localhost:5173
MEDDOC_DATABASE_URL=postgresql://user:password@host/db
MEDDOC_CLERK_SECRET_KEY=sk_test_xxxxx
MEDDOC_GOOGLE_API_KEY=AIzaSyxxxxx
MEDDOC_GEMINI_MODEL=gemini-3.1-flash-lite-preview
MEDDOC_GEMINI_EMBEDDING_MODEL=text-embedding-004
MEDDOC_UPLOAD_DIR=./uploads
MEDDOC_VECTOR_STORE_DIR=./vector_store
MEDDOC_MAX_FILE_SIZE=10485760
MEDDOC_ENCRYPTION_KEY=<64-char hex string>   # openssl rand -hex 32
```

Create `client/.env` (see `client/.env.example`):

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_API_URL=http://localhost:5000/api
```

### 3. Set up the database

```bash
cd server
npx prisma db push       # creates tables
```

### 4. Run

```bash
# terminal 1 — API on :5000
cd server && npm run dev

# terminal 2 — client on :5173
cd client && npm run dev
```

Sign up, then click **"Try with sample data"** on the dashboard to explore every feature without uploading anything.

## Project structure

```
client/src/
  pages/          Dashboard, Documents, Chat, Trends, Timeline,
                  Summary, Medications, Goals, Compare, Landing…
  components/     Layout, Chat, Documents, CommandPalette, Onboarding
  hooks/          useChat, useDocuments, useMetrics, useTheme
  services/       fetch wrappers per API area

server/src/
  routes/         one router per feature area
  controllers/    request handling
  services/       business logic (documents, chat, demo data)
  agents/         AI: RAG chain, extractors, embeddings, verification
  middleware/     Clerk auth, rate limiting
  utils/          encryption, goal progress, share tokens, retry
  prisma/         schema (User, Document, HealthMetric, Conversation,
                  DocumentFinding, HealthGoal, …)

companion/        Electron desktop app — on-screen reminders (water,
                  meals, medicines, movement), Clerk-gated, see its
                  own README for setup
```

## Security notes

- Every API route requires a Clerk-issued JWT; all queries are scoped to the authenticated user
- Uploaded files are AES-256 encrypted at rest and securely wiped on delete
- Helmet CSP, HSTS, rate limiting, and 1 MB body limits on the API
- Share links are signed tokens that expire after 72 hours

## Medical disclaimer

MedDoc AI provides **informational assistance only** and does not replace professional medical advice, diagnosis, or treatment. Always consult your doctor for medical decisions.
