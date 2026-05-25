# 📚 DeepReader

**DeepReader** is an AI-powered deep reading platform that lets you upload PDF/EPUB books and interact with them through chat (RAG), auto-generated summaries, and AI flashcards.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📤 **Book Ingestion** | Upload PDF or EPUB files; content is chunked and vector-indexed automatically |
| 💬 **RAG Chat** | Ask questions about any book and receive grounded answers with source citations |
| 📝 **AI Summaries** | Generate and store concise summaries of your books |
| 🃏 **Flashcards** | Auto-generate study flashcards from key concepts in your books |
| 🔐 **Auth & Roles** | JWT-based authentication with `USER` and `ADMIN` roles |
| 📊 **Admin Dashboard** | Audit logs and dead-letter inspection for failed ingestion jobs |
| 📡 **Event Streaming** | Kafka-backed event pipeline (Apache Camel routes) for async book processing |
| 🔭 **Observability** | Prometheus metrics + Grafana dashboards + alert rules |

---

## 🏗️ Architecture

DeepReader is a **polyglot microservices monorepo**. All services communicate internally via HTTP; the event pipeline uses Kafka over SSL (Aiven).

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                  │
│                    localhost:3000                        │
└──────────────────────┬──────────────────────────────────┘
                       │ REST (JWT)
┌──────────────────────▼──────────────────────────────────┐
│               web-module  (Spring Boot)                 │
│                    :8083                                 │
│  Auth, Books API, Admin API — public gateway            │
└──────┬────────────────────────────────────┬─────────────┘
       │ internal HTTP                      │ Kafka events
┌──────▼──────────┐               ┌─────────▼─────────────┐
│ business-service│               │    Apache Kafka        │
│  (Spring Boot)  │               │  (Aiven Cloud / SSL)   │
│     :8082       │               └───────────────────────┘
│ Camel orchestr. │
└──┬──────────┬───┘
   │          │ internal HTTP
   │    ┌─────▼────────┐
   │    │ data-service │  ← MongoDB + PostgreSQL
   │    │ (Spring Boot)│
   │    │    :8081     │
   │    └──────────────┘
   │ internal HTTP
┌──▼────────────────────────────────────────────────────┐
│                  ai-service (Spring Boot)             │
│                       :8080                           │
│  Ingestion · Retrieval · Chat · Summary · Flashcards  │
│  PostgreSQL (jobs) · Redis (cache) · Qdrant (vectors) │
└───────────────────┬───────────────────────────────────┘
                    │ internal HTTP
          ┌─────────▼────────────┐
          │  haystack-service    │  ← FastAPI / Python
          │       :8000          │
          │  Haystack-AI + Qdrant│
          └──────────────────────┘
```

### Services at a Glance

| Service | Stack | Port | Role |
|---|---|---|---|
| `frontend` | Next.js 16 / React 19 / TypeScript / Tailwind v4 | 3000 | User-facing web UI |
| `web-module` | Spring Boot 3.5 / Java 21 | 8083 | Public API gateway, auth, JWT |
| `business-service` | Spring Boot 3.5 / Java 21 / Camel 4 / Kafka | 8082 | Orchestration & event routing |
| `ai-service` | Spring Boot 3.5 / Java 21 / WebFlux | 8080 | AI processing (embed, chunk, chat, summary, flashcards) |
| `data-service` | Spring Boot 3.5 / Java 21 / WebFlux | 8081 | MongoDB + PostgreSQL persistence |
| `haystack-service` | FastAPI / Python / Haystack-AI 2.27 | 8000 | Vector ingest & semantic search via Qdrant |

### Infrastructure Dependencies

| Component | Purpose | Default (Docker) |
|---|---|---|
| PostgreSQL 17 | Relational data (users, jobs, sessions) | `localhost:5432` |
| MongoDB 7 | Document store (books, chapters, chats) | `localhost:27017` |
| Redis 7 | Caching & rate-limit counters | `localhost:6379` |
| Qdrant | Vector database for semantic search | `localhost:6333` |
| Apache Kafka | Event streaming (book lifecycle events) | Aiven Cloud (SSL) |
| AWS S3 / Backblaze B2 | File storage for uploaded documents | optional |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** v2+
- **Node.js** 20+ and **npm**
- API keys: **Gemini** (embedding) and/or **Groq** (chat LLM)

### 1. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# AI providers (at least one required)
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# Security
JWT_SECRET=replace-with-strong-random-secret-32-bytes-min
```

> For a fully local stack, the Docker-prefixed overrides (`DOCKER_*`) in `.env.example` already point everything to the local containers — no external services needed except the AI API keys.

### 2. Start Backend Services

```bash
# From the repo root
docker compose up -d --build
```

This builds and starts all five backend services plus PostgreSQL, MongoDB, Redis, and Qdrant. Wait a few minutes for the first build. Subsequent starts are faster.

**Service health endpoints:**

```
GET http://localhost:8083/actuator/health  # web-module
GET http://localhost:8082/actuator/health  # business-service
GET http://localhost:8080/actuator/health  # ai-service
GET http://localhost:8081/actuator/health  # data-service
GET http://localhost:8000/health           # haystack-service
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📖 Using DeepReader

### Step 1 — Register & Log In
Navigate to `/register`, create an account, and log in.

> 🔑 **First registered user** is automatically granted the `ADMIN` role.

### Step 2 — Configure AI Provider (Optional)
Go to **Settings (⚙️)** in the top-right menu. Enter your personal Gemini or Groq API key, or leave blank to use the server's default key.

### Step 3 — Upload a Book
Go to the **Library (📚)** page, choose your AI provider, and click **Upload Book** to select a `.pdf` or `.epub` file.

The book enters `PROCESSING` status while the system:
1. Parses the file (PDFBox / epublib)
2. Chunks the content
3. Generates vector embeddings (Gemini `text-embedding-004`)
4. Stores chunks in Qdrant via `haystack-service`

When status becomes `COMPLETED`, the book is ready.

### Step 4 — Deep Read with AI
Click on any completed book to open the workspace:

| Tool | What it does |
|---|---|
| 💬 **Chat** | Ask any question; AI retrieves relevant chunks and answers with source citations (RAG) |
| 📝 **Summary** | Generate and save a comprehensive summary of the book |
| 🃏 **Flashcards** | Generate N study cards (1–50) from key concepts; tap to flip |

---

## 🔐 Admin Access

The **Admin Dashboard** is available at `/admin` and shows:
- **Audit Logs** — all significant user actions
- **Dead Letters** — failed ingestion jobs with error details

### Grant Admin Role

**Automatic:** The first account registered in an empty database gets `ADMIN` automatically.

**Manual:** Connect to PostgreSQL, open the `app_users` table, and change the `role` column from `USER` to `ADMIN` for the desired account. The user must re-login.

---

## 📁 Repository Structure

```
deepreader/
├── frontend/               # Next.js 16 web app
├── web-module/             # Spring Boot — public API gateway & auth
├── business-service/       # Spring Boot — Camel orchestration & Kafka
├── ai-service/             # Spring Boot — AI processing (embed/chat/summary/flashcards)
├── data-service/           # Spring Boot — MongoDB + PostgreSQL persistence
├── haystack-service/       # FastAPI — Haystack-AI vector ingest & search
├── core/                   # Shared Java library (DTOs, utils)
├── observability/          # Prometheus config, Grafana dashboard, alert rules
├── aiven_connect/          # Kafka SSL certificates (gitignored)
├── docs/                   # API reference, getting started, runbooks
├── ops/                    # Operational scripts
├── scripts/                # Utility scripts
├── docker-compose.yml      # Full local stack definition
└── .env.example            # Environment variable template
```

---

## ⚙️ Configuration Reference

Key environment variables (see [`.env.example`](.env.example) for the full list):

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (embedding) | — |
| `GROQ_API_KEY` | Groq API key (chat LLM) | — |
| `JWT_SECRET` | JWT signing secret (≥ 32 chars) | — |
| `JWT_TTL_SECONDS` | Token lifetime in seconds | `86400` |
| `INGESTION_MAX_FILE_SIZE_BYTES` | Max upload size | `26214400` (25 MB) |
| `GUARDRAILS_MAX_LLM_REQUESTS_PER_DAY` | Daily LLM request cap per user | `500` |
| `GUARDRAILS_MAX_UPLOADS_PER_DAY` | Daily upload cap per user | `100` |
| `WORKER_POLL_INTERVAL_MS` | Async ingestion worker poll interval | `5000` |
| `KAFKA_CAMEL_ROUTE_ENABLED` | Enable Kafka event pipeline | `false` (local) |
| `STORAGE_ENABLED` | Enable S3/B2 file storage | `false` (local) |

---

## 🌐 API Overview

Full contract details are in [docs/API_REFERENCE.md](docs/API_REFERENCE.md).

| Base Path | Service | Auth |
|---|---|---|
| `/api/v1/auth` | web-module | Public |
| `/api/v1/books` | web-module | JWT Bearer |
| `/api/v1/admin` | web-module | JWT + ADMIN role |
| `/internal/business/v1/books` | business-service | Internal |
| `/internal/ai/v1/documents` | ai-service | Internal (`X-User-Id` header) |
| `/internal/data/v1` | data-service | Internal |
| `/` | haystack-service | Internal |

---

## 📊 Observability

The `observability/` directory contains ready-to-use configs:

- **`prometheus.yml`** — scrape config for all Spring Boot actuator endpoints
- **`grafana-dashboard.json`** — pre-built dashboard for JVM + app metrics
- **`alerts.yml`** — Prometheus alert rules for service health

Spring Boot services expose metrics at `/actuator/prometheus` (Micrometer + Prometheus registry).

---

## 🛠️ Development

### Running a Single Service Locally

Each Java service is a standard Spring Boot Maven project:

```bash
cd ai-service
./mvnw spring-boot:run
```

### Running Infrastructure Only

To run only the databases while developing services locally:

```bash
docker compose up -d postgres mongodb redis qdrant
```

### Frontend Development

```bash
cd frontend
npm run dev    # dev server with hot reload on :3000
npm run build  # production build
npm run lint   # ESLint check
```

---

## 📚 Further Reading

- [Getting Started Guide](docs/GETTING_STARTED.md)
- [API Reference](docs/API_REFERENCE.md)
- [Production Deployment Runbook](docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md)
- [Grant Admin Manual](docs/GRANT_ADMIN_MANUAL.md)

---

## 🧑‍💻 Tech Stack Summary

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Lucide React |
| Backend (Java) | Spring Boot 3.5, Java 21, WebFlux (Reactor), Spring Security, Spring Kafka, Apache Camel 4 |
| AI Processing | Google Gemini (embeddings), Groq / LLaMA (chat), Apache PDFBox, epublib, Haystack-AI |
| Databases | PostgreSQL 17, MongoDB 7, Redis 7, Qdrant (vector DB) |
| Messaging | Apache Kafka (Aiven Cloud, SSL) |
| DevOps | Docker, Docker Compose, Flyway (DB migrations), Maven Enforcer |
| Observability | Prometheus, Grafana, Spring Boot Actuator, Micrometer |
| Storage | AWS S3 / Backblaze B2 (optional) |