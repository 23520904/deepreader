# DeepReader

> An AI-powered document reading & study platform. Upload PDF/EPUB books, ask questions about them, generate summaries, and create flashcards — all powered by Gemini embeddings and a Groq LLM backend.

---

## Table of Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [Running Services Individually (Dev Mode)](#running-services-individually-dev-mode)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Default Credentials](#default-credentials)

---

## What it does

DeepReader lets you:

- 📄 **Upload documents** — PDF and EPUB files are parsed, chunked, and indexed into a vector store.
- 💬 **Chat with your book** — Ask natural-language questions; the AI retrieves the most relevant passages and answers with citations.
- 🔍 **Semantic search** — Search across the full document content using vector similarity.
- 📝 **AI summaries** — Generate chapter/document summaries using an LLM.
- 🃏 **Flashcard generation** — Automatically produce study flashcards (Q&A pairs) from the document.
- 👁️ **Vision / image analysis** — Extract and interpret images embedded in PDFs.
- 🗂️ **Library management** — Personal library per user, with book delete and admin-library view.
- 👤 **Auth** — JWT-based registration, login, refresh-token rotation, and logout.
- 🛡️ **Guardrails** — Daily rate limits for LLM requests and uploads per user.

---

## Architecture

DeepReader is a **microservices monorepo**. All services communicate internally over HTTP (WebFlux reactive clients). The frontend is a separate Next.js app.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                      │
│                  Next.js frontend  :3000                     │
└────────────────────────┬────────────────────────────────────┘
                         │ REST + JWT
                         ▼
┌────────────────────────────────────────────────────────────┐
│               web-module  :8083                             │
│  Auth (JWT/refresh), API gateway, admin, study progress    │
│  → PostgreSQL (users, sessions, audit)                     │
│  → Redis (session store)                                   │
└────────┬───────────────────────────────────────────────────┘
         │ delegates to
         ▼
┌────────────────────────────────────────────────────────────┐
│             business-service  :8082                         │
│  Library CRUD, orchestrates AI + data calls,               │
│  optional Kafka event publishing (Apache Camel)            │
└────────┬───────────────────────────┬───────────────────────┘
         │                           │
         ▼                           ▼
┌────────────────┐       ┌─────────────────────────────────┐
│  data-service  │       │          ai-service  :18080      │
│     :18081     │       │                                  │
│  Book metadata │       │  Ingestion pipeline:             │
│  (PostgreSQL + │       │   ├─ PDF/EPUB text extraction    │
│   MongoDB)     │       │   ├─ Chunking                    │
│  Chat history  │       │   ├─ Gemini embeddings           │
│  Flashcards    │       │   └─ Qdrant vector indexing      │
│  Summaries     │       │                                  │
└────────────────┘       │  Query pipeline:                 │
                         │   ├─ Embed query (Gemini)        │
                         │   ├─ Vector retrieval (Qdrant)   │
                         │   └─ LLM answer (Groq)           │
                         │                                  │
                         │  Generation:                     │
                         │   ├─ Summaries                   │
                         │   └─ Flashcards                  │
                         └────────────┬────────────────────┘
                                      │ vector ops
                                      ▼
                         ┌────────────────────────────────┐
                         │  haystack-service  :8000       │
                         │  Python / FastAPI              │
                         │  Haystack + Qdrant integration │
                         │  /ingest  /search              │
                         └────────────┬───────────────────┘
                                      │
                                      ▼
                         ┌────────────────────────────────┐
                         │         Qdrant  :6333/6334     │
                         │    Vector database              │
                         └────────────────────────────────┘

Infrastructure (shared):
  PostgreSQL :5432  —  users, sessions, audit, relational book data
  MongoDB    :27017 —  document content (sections, chunks)
  Redis      :6379  —  JWT refresh-token session store
```

### Request flow — "Chat with a book"

```
Frontend  →  web-module (/api/v1/books/{id}/chat)
          →  business-service (/internal/books/{id}/chat)
          →  ai-service (/internal/documents/{id}/chat)
               ├─ Embed the user question (Gemini API)
               ├─ haystack-service /search  →  Qdrant top-k chunks
               ├─ Build prompt from retrieved chunks
               └─ Groq LLM generates the answer
          ←  answer streamed back through the chain
```

### Document ingestion flow

```
User uploads PDF/EPUB  →  web-module
                       →  business-service
                       →  ai-service
                            ├─ TextExtractionService  (PDFBox / epublib)
                            ├─ PdfVisionService       (image extraction, optional)
                            ├─ ChunkingService        (split into passages)
                            ├─ EmbeddingService       (Gemini batch embeddings)
                            └─ haystack-service /ingest  →  Qdrant
                       →  data-service  (persist metadata & sections in Mongo/PG)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| API Gateway / Auth | Spring Boot 3.5 (WebFlux reactive), Java 21, JJWT |
| Business Orchestration | Spring Boot 3.5 (WebFlux), Apache Camel 4 (Kafka events) |
| AI Service | Spring Boot 3.5 (WebFlux), Apache PDFBox 3, epublib |
| Data Service | Spring Boot 3.5 (WebFlux), PostgreSQL, MongoDB |
| Vector Retrieval | Python 3, FastAPI, Haystack AI 2.27, qdrant-haystack |
| Embeddings | Google Gemini API |
| LLM (Chat/Generation) | Groq API (llama-3.1-8b-instant by default) |
| Vector DB | Qdrant |
| Relational DB | PostgreSQL 17 |
| Document DB | MongoDB 7 |
| Cache / Sessions | Redis 7 |
| Observability | Micrometer, Prometheus-compatible metrics |
| Build | Maven (multi-module), npm |
| Containerisation | Docker, Docker Compose |

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker + Docker Compose | v24 / v2.24 |
| Java (JDK) | 21 |
| Maven | 3.9 |
| Node.js | 20 |
| npm | 10 |

> If you only use **Docker Compose**, you only need Docker — Java/Node are not required on the host.

---

## Quick Start (Docker Compose)

This is the recommended way to run the full stack.

### 1. Clone the repo

```bash
git clone <repo-url>
cd deepreader
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in the required secrets:

```env
# Required — AI providers
GEMINI_API_KEY=your-gemini-key-here
GROQ_API_KEY=your-groq-key-here

# Required — JWT signing secret (min 32 characters)
JWT_SECRET=replace-with-a-strong-random-secret-32chars

# Optional — CORS for your frontend origin (defaults cover localhost:3000)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

All other variables have working defaults for local Docker usage.

### 3. Start all backend services

```bash
docker-compose up -d
```

This starts (in dependency order):

```
postgres → mongodb → redis → qdrant
         → haystack-service
         → ai-service
         → data-service
         → business-service
         → web-module
```

Check that everything is up:

```bash
docker-compose ps
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Stopping everything

```bash
# Stop and remove containers (keeps volumes / data)
docker-compose down

# Stop and wipe all data volumes
docker-compose down -v
```

---

## Running Services Individually (Dev Mode)

Useful when iterating on a single service without rebuilding all Docker images.

### Start infrastructure only

```bash
docker-compose up -d postgres mongodb redis qdrant
```

### Build all Java modules

```bash
# From the repo root
mvn install -DskipTests
```

### Run individual Java services

Each service can be started from its own directory:

```bash
# Terminal 1 — haystack (Python)
cd haystack-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# Terminal 2 — ai-service
cd ai-service
mvn spring-boot:run

# Terminal 3 — data-service
cd data-service
mvn spring-boot:run

# Terminal 4 — business-service
cd business-service
mvn spring-boot:run

# Terminal 5 — web-module (API gateway + auth)
cd web-module
mvn spring-boot:run

# Terminal 6 — frontend
cd frontend
npm install
npm run dev
```

> **Note:** Each service reads its config from `.env` (or system environment). Make sure your `.env` is set up before starting any service locally.

---

## Environment Variables

Below are the key variables. See `.env.example` for the full list with comments.

### AI Providers

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key — used for text embeddings |
| `GROQ_API_KEY` | Groq API key — used for LLM chat & generation |
| `GROQ_CHAT_MODEL` | Groq model name (default: `llama-3.1-8b-instant`) |

### Auth & Security

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | HS256 signing secret (min 32 chars, **change in production**) |
| `JWT_TTL_SECONDS` | Access token TTL (default: `86400` = 24 h) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |

### Databases

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | JDBC URL for PostgreSQL |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | PostgreSQL credentials |
| `MONGODB_URI` | MongoDB connection URI |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |

### Vector Store

| Variable | Description |
|----------|-------------|
| `QDRANT_URL` | Qdrant REST URL (haystack service uses this) |
| `QDRANT_HOST` / `QDRANT_GRPC_PORT` | Qdrant gRPC (ai-service uses this) |
| `QDRANT_API_KEY` | Qdrant API key (leave empty for local) |
| `QDRANT_COLLECTION_PREFIX` | Collection name prefix (default: `document_chunks`) |

### Guardrails

| Variable | Default | Description |
|----------|---------|-------------|
| `GUARDRAILS_MAX_LLM_REQUESTS_PER_DAY` | `500` | Per-user daily LLM call limit |
| `GUARDRAILS_MAX_UPLOADS_PER_DAY` | `100` | Per-user daily upload limit |
| `INGESTION_MAX_FILE_SIZE_BYTES` | `26214400` (25 MB) | Max upload file size |

### Service Ports

| Variable | Default | Service |
|----------|---------|---------|
| `WEB_MODULE_HOST_PORT` | `8083` | Auth gateway |
| `AI_SERVICE_HOST_PORT` | `18080` | AI service |
| `DATA_SERVICE_HOST_PORT` | `18081` | Data service |
| `BUSINESS_SERVICE_HOST_PORT` | `18082` | Business service |
| `HAYSTACK_PORT` | `8000` | Haystack (Python) |

---

## API Overview

All public endpoints are exposed through the **web-module** at `http://localhost:8083`.

### Auth — `/api/v1/auth`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login — returns JWT + refresh token |
| `POST` | `/refresh` | Rotate refresh token, issue new access token |
| `POST` | `/logout` | Revoke session |

### Books / Library — `/api/v1/books`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Upload a PDF or EPUB file |
| `GET` | `/` | List your books |
| `DELETE` | `/{bookId}` | Delete a book |
| `GET` | `/{bookId}/content` | Get extracted book content (sections) |
| `GET` | `/{bookId}/source` | Download original file (PDF/EPUB) |
| `POST` | `/{bookId}/search` | Semantic search within the book |
| `POST` | `/{bookId}/chat` | Ask a question about the book (RAG) |
| `POST` | `/{bookId}/summary` | Generate an AI summary |
| `POST` | `/{bookId}/flashcards` | Generate AI flashcards |
| `GET` | `/{bookId}/summaries` | List saved summaries |
| `GET` | `/{bookId}/flashcards` | List saved flashcards |
| `GET` | `/{bookId}/chats` | List chat history |
| `POST` | `/{bookId}/chat-threads/delete` | Delete a chat thread |

### User — `/api/v1/users`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/me` | Get current user profile |
| `PUT` | `/me` | Update profile |

### Admin — `/api/v1/admin`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List all users (admin only) |
| `GET` | `/books/admin-library` | Admin library view |

---

## Project Structure

```
deepreader/
├── core/                    # Shared domain models (Book, Flashcard, ChatHistory…)
├── ai-service/              # Document ingestion, embedding, RAG, generation
│   └── src/main/java/…/service/
│       ├── DocumentIngestionService.java
│       ├── EmbeddingService.java       ← Gemini batch embeddings
│       ├── RetrievalService.java       ← vector search + prompt build
│       ├── ChatService.java            ← RAG chat pipeline
│       ├── GenerationService.java      ← summaries & flashcards
│       ├── QdrantVectorStoreService.java
│       └── TextExtractionService.java  ← PDF/EPUB parsing
├── data-service/            # Persistence layer (PostgreSQL + MongoDB)
├── business-service/        # Orchestration, library CRUD, Kafka events
├── web-module/              # Auth gateway, JWT, public REST API
│   └── src/main/java/…/controller/
│       ├── AuthController.java
│       ├── PublicGatewayController.java
│       ├── AdminController.java
│       └── StudyProgressController.java
├── haystack-service/        # Python FastAPI — Haystack + Qdrant integration
│   └── app/
│       ├── main.py          # /ingest and /search endpoints
│       └── schemas.py
├── frontend/                # Next.js 16 UI
│   └── src/
│       ├── app/
│       │   ├── (auth)/      # Login / register pages
│       │   ├── library/     # Book library + reader
│       │   ├── flashcards/  # Flashcard decks
│       │   ├── admin/       # Admin panel
│       │   └── profile/     # User profile
│       ├── components/      # Shared UI components
│       ├── services/        # API client layer
│       └── types/           # TypeScript types
├── observability/           # Prometheus / Grafana config
├── docs/                    # Additional documentation
├── docker-compose.yml       # Full stack orchestration
├── pom.xml                  # Maven parent POM
└── .env.example             # Environment variable template
```

---

## Default Credentials

When the application starts for the first time with `APP_ADMIN_SEED_ENABLED=true` (the default), an admin account is automatically created:

| Field | Value |
|-------|-------|
| Email | `admin@deepreader.local` |
| Username | `admin` |
| Password | `admin12345` |

> **Change the admin password immediately in any non-local environment.**

---

## Observability

The `observability/` directory contains Prometheus and Grafana configuration. Each Spring Boot service exposes Micrometer metrics at `/actuator/prometheus`. Key custom metrics include:

- `deepreader.auth.register.success` — successful registrations
- `deepreader.auth.login.success` — successful logins

---

## Notes

- **Optional object storage (S3-compatible):** By default, uploaded files are stored on the local filesystem inside Docker volumes. Set `STORAGE_ENABLED=true` and configure `STORAGE_*` variables to use S3 / Backblaze B2 / MinIO.
- **Optional Kafka:** The business-service includes Apache Camel routes for publishing book events to Kafka. Disabled by default (`DOCKER_KAFKA_CAMEL_ROUTE_ENABLED=false`). Configure `KAFKA_*` variables and Aiven certificates in `./aiven_connect/` to enable.
- **Reactive stack:** All Spring Boot services use Spring WebFlux (non-blocking reactive I/O). Blocking calls are isolated on `Schedulers.boundedElastic()`.
