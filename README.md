# DeepReader
> AI-powered deep reading platform — upload any book, chat with it, summarize it, and study with auto-generated flashcards.
![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?logo=springboot&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-FastAPI-3776AB?logo=python&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Kafka](https://img.shields.io/badge/Apache_Kafka-SSL-231F20?logo=apachekafka&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC244C)
---
## What is DeepReader?
DeepReader lets you upload any PDF or EPUB file and interact with it using AI. Once a book is processed, you can:
- **Chat** with the book — ask any question, get grounded answers with source citations (RAG)
- **Summarize** — generate and store structured key insights for any book
- **Flashcards** — auto-generate study cards and study them in 5 interactive modes
- **Read** — view the original document inline in the browser
The project is a polyglot microservices system built with **Java** (Spring Boot), **Python** (FastAPI), and **TypeScript** (Next.js), orchestrated with Docker Compose and connected via Apache Kafka for async event streaming.
---
## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Services](#services)
- [Frontend](#frontend)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Databases](#databases)
- [Security](#security)
- [Observability](#observability)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Docs](#docs)
---
## Features
### AI Capabilities
| Feature | Description |
|---|---|
| RAG Chat | Ask questions about any uploaded book. AI retrieves relevant chunks from Qdrant and answers with source citations. Chat history is persisted per book. |
| Summarization | Generate a full-book summary using Gemini or Groq. Multiple summaries can be stored and listed per book. |
| Flashcards | Generate 1–50 study cards per request. Cards are stored and available in the deck library. |
| Vision / OCR | PDF pages are rasterized and passed to Gemini Vision for image-level analysis. Embedded images are also extractable. |
### Study Modes (Flashcards)
| Mode | Description |
|---|---|
| Cards | Classic flip-card review |
| Review | Spaced repetition-style review |
| Quiz | Multiple choice questions |
| Match Terms | Drag-and-match game |
| Memory Flip | Memory card flip game |
| Speed Challenge | Timed card challenge |
### Platform Features
| Feature | Description |
|---|---|
| Book ingestion | Upload PDF or EPUB. Async job pipeline: parse → chunk → embed → index. Status: `QUEUED → PROCESSING → COMPLETED / FAILED` |
| Inline reader | Read the original document inside the browser (pdf.js) |
| User auth | JWT access + refresh token rotation. BCrypt passwords. Redis session store. |
| User profile | Update display name, upload and crop avatar, store personal LLM API key |
| Admin dashboard | View audit logs and failed ingestion (dead-letter) records. ADMIN role required. |
| Rate limiting | Per-IP sliding-window rate limiter in both `web-module` and `ai-service` |
| Guardrails | Configurable daily caps: LLM requests and uploads per user |
| Object storage | Optional S3 / Backblaze B2 integration with local filesystem fallback |
| Event streaming | Kafka topic (`deepreader.book.events`) + dead-letter queue + Apache Camel route |
| Observability | Prometheus metrics on all Java services, Grafana dashboard, alert rules |
---
## Architecture
```
┌─────────────────────────────────────────┐
│         Browser — localhost:3000        │
│   Next.js 16 · React 19 · TypeScript   │
└──────────────────┬──────────────────────┘
                   │ JWT Bearer
                   ▼
┌─────────────────────────────────────────┐
│      web-module  :8083                  │
│  Public API gateway                     │
│  Auth · Books · Admin · Profile         │
│  JWT filter · Rate limiter · CORS       │
└──────────────────┬──────────────────────┘
                   │ internal HTTP
                   ▼
┌─────────────────────────────────────────┐      ┌────────────────────────┐
│      business-service  :8082            │◄────►│  Apache Kafka          │
│  Orchestration layer                    │      │  (Aiven Cloud SSL)     │
│  Apache Camel · Spring Kafka            │      │  book.events           │
│  Fans out → ai-service + data-service   │      │  book.events.dlq       │
└─────────┬──────────────┬────────────────┘      └────────────────────────┘
          │              │ internal HTTP
          ▼              ▼
┌──────────────┐  ┌───────────────────────────────────┐
│ data-service │  │ ai-service  :8080                  │
│ :8081        │  │ AI processing engine               │
│              │  │ Gemini embeddings + vision         │
│ MongoDB      │  │ Groq / LLaMA chat generation       │
│ PostgreSQL   │  │ PDFBox · epublib · Qdrant gRPC     │
│ (Flyway)     │  │ Async ingestion worker             │
│              │  │ Object storage (S3 / local)        │
└──────────────┘  └──────────────┬────────────────────┘
                                 │ internal HTTP
                                 ▼
                  ┌──────────────────────────────────┐
                  │ haystack-service  :8000          │
                  │ FastAPI · Haystack-AI 2.27       │
                  │ QdrantDocumentStore              │
                  │ QdrantEmbeddingRetriever         │
                  └──────────────┬───────────────────┘
                                 │ gRPC / HTTP
                                 ▼
                  ┌──────────────────────────────────┐
                  │ Qdrant  :6333 / :6334            │
                  │ Vector database                  │
                  │ Per-provider collections         │
                  │ Cosine similarity search         │
                  └──────────────────────────────────┘
Shared infrastructure
  PostgreSQL :5432   MongoDB :27017   Redis :6379
```
---
## Services
### `web-module` — Public Gateway (`:8083`)
**Stack:** Spring Boot 3.5 · WebFlux · Spring Security · JJWT 0.11.5 · Redis · PostgreSQL
The single entry point for all browser traffic. Validates JWT on every protected route, enforces CORS and rate limiting, and forwards book operations to `business-service`.
| Class | Role |
|---|---|
| `AuthController` | Register, login, refresh, logout, revoke |
| `PublicGatewayController` | Books upload / list / chat / summary / flashcards proxy |
| `AdminController` | Audit logs, dead-letter records (ADMIN only) |
| `UserController` | Profile read/update, avatar, LLM token |
| `StudyProgressController` | Reading session tracking |
| `VisionPublicController` | PDF vision proxy |
| `JwtService` | Sign + verify HS512 JWTs |
| `SessionService` | Redis-backed refresh token store |
| `UserAccountService` | Registration, first-user ADMIN bootstrap |
| `AuthWebFilter` | JWT extraction + validation on every request |
| `RateLimitWebFilter` | Sliding-window rate limiting via Redis |
| `SecurityHeadersWebFilter` | CSP, HSTS, X-Frame-Options |
---
### `business-service` — Orchestration (`:8082`)
**Stack:** Spring Boot 3.5 · WebFlux · Apache Camel 4.18 · Spring Kafka · Micrometer
Coordinates the full AI workflow. Fans requests out to `ai-service` and `data-service`, and publishes domain events to Kafka.
| Class | Role |
|---|---|
| `LibraryOrchestrationService` | upload → ingest → persist sequence |
| `BookEventRoute` | Apache Camel: Kafka consumer for book domain events |
| `BookEventPublisher` | Publishes `BookDomainEvent` to Kafka |
| `AiServiceClient` | WebClient to `ai-service` |
| `DataServiceClient` | WebClient to `data-service` |
---
### `ai-service` — AI Engine (`:8080`)
**Stack:** Spring Boot 3.5 · WebFlux · Reactor · Qdrant gRPC · Redis · PDFBox 3.0.7 · epublib 3.1 · AWS S3 SDK v2
The core service. Handles document parsing, chunking, embedding, vector storage, RAG chat, summarization, flashcard generation, and PDF vision.
**Ingestion pipeline (per job):**
```
TextExtractionService  →  parse PDF (PDFBox) or EPUB (epublib) into sections
ChunkingService        →  split into overlapping DocumentChunks
EmbeddingService       →  batch embed with Gemini text-embedding-004 (rate-aware, retries)
haystack-service       →  POST /ingest → write vectors to Qdrant
IngestionJobService    →  update job status to COMPLETED
```
**Key classes:**
| Class | Role |
|---|---|
| `DocumentIngestionService` | Top-level pipeline coordinator |
| `TextExtractionService` | PDF / EPUB → text sections |
| `ChunkingService` | Sections → overlapping chunks |
| `EmbeddingService` | Gemini batch embedding with retry and delay |
| `QdrantVectorStoreService` | gRPC upsert / search |
| `RetrievalService` | Query embed → top-K chunk retrieval |
| `ChatService` | RAG: retrieve → prompt → LLM → answer + sources |
| `GenerationService` | Summary and flashcard LLM generation |
| `LlmClientService` | Routes to Gemini or Groq |
| `PromptBuilderService` | RAG / summary / flashcard prompt templates |
| `PdfVisionService` | PDF → rasterized image → Gemini Vision |
| `PdfPageRasterizer` | PDFBox page → BufferedImage |
| `PdfEmbeddedImageExtractor` | Extract images embedded in PDF |
| `GuardrailService` | Daily LLM request + upload cap checks (Redis) |
| `IngestionQueueWorker` | Background polling worker (every 5 s) |
| `OperationalRetentionJob` | Periodic cleanup of stale job records |
| `ObjectStorageService` | S3 / B2 / local file storage |
| `AuditLogService` | User-action audit records |
**Supported AI providers:**
| Provider | Used for | Default model |
|---|---|---|
| Google Gemini | Embeddings | `text-embedding-004` |
| Google Gemini | Vision analysis | Gemini Vision |
| Google Gemini | Text generation | configurable |
| Groq | Chat / generation | `llama-3.1-8b-instant` |
---
### `data-service` — Persistence (`:8081`)
**Stack:** Spring Boot 3.5 · WebFlux · Spring Data MongoDB Reactive · Spring Data JPA · Flyway · PostgreSQL
Dual-database service. MongoDB for document-oriented data, PostgreSQL for relational user accounts.
| Repository | Store | Data |
|---|---|---|
| `BookRepository` | MongoDB | Book metadata |
| `ChapterRepository` | MongoDB | Chapter content |
| `ChapterSummaryRepository` | MongoDB | Stored summaries |
| `FlashcardRepository` | MongoDB | Flashcard cards |
| `ChatHistoryRepository` | MongoDB | Chat turns |
| `ReadingSessionRepository` | MongoDB | Reading sessions |
| `UserRepository` | MongoDB | User documents |
| `UserAccountJpaRepository` | PostgreSQL | Relational user accounts |
---
### `haystack-service` — Vector Bridge (`:8000`)
**Stack:** FastAPI · Python · Haystack-AI 2.27 · qdrant-haystack 10.3 · uvicorn
Thin Python service wrapping Haystack's `QdrantDocumentStore` and `QdrantEmbeddingRetriever`. Maintains an LRU cache of store instances per AI provider.
| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Liveness check |
| `/ingest` | POST | Write pre-embedded chunks to Qdrant |
| `/search` | POST | Retrieve top-K chunks by query embedding |
---
### `core` — Shared Library
Shared Java DTOs and utilities used by `web-module`, `business-service`, and `data-service`.
---
## Frontend
**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Lucide React · Lottie React · pdf.js
### Pages
| Route | Description |
|---|---|
| `/` | Landing page — animated hero, feature showcase, scroll reveal |
| `/login` `/signup` | JWT auth forms |
| `/library` | Personal book library — upload, browse, delete |
| `/library/[bookId]/read` | Inline PDF reader + AI study panel (chat / summary / flashcards) |
| `/flashcards` | Flashcard deck library — create and manage decks |
| `/flashcards/[deckId]/cards` | Flip-card review |
| `/flashcards/[deckId]/review` | Spaced review mode |
| `/flashcards/[deckId]/quiz` | Multiple-choice quiz |
| `/flashcards/[deckId]/games` | Match Terms · Memory Flip · Speed Challenge |
| `/profile` | Edit name, avatar crop + upload, personal LLM key |
| `/admin` | Audit logs + dead-letter inspector (ADMIN only) |
| `/about` | Mission, story, how it works |
| `/help-center` | FAQ and step-by-step guides |
| `/contact` | Support contact form |
### Key Components
| Component | Description |
|---|---|
| `AiStudyPanel` | Tabbed panel: Chat / Summary / Flashcards |
| `DocumentChatPanel` | RAG chat UI with source citations |
| `ReadingWorkspace` | In-browser PDF viewer + study panel layout |
| `UploadModal` | Drag-and-drop upload with provider selector |
| `ConfigureModal` | Personal LLM key configuration |
| `AuthRoleGuard` | Route guard for role-based access |
| `FlashcardModePage` | Wrapper for all study mode views |
| `MatchTermsGame` `MemoryFlipGame` `SpeedChallengeGame` | Interactive study games |
| `AvatarCropDialog` | Client-side avatar cropping |
| `FloatingHelpChat` | Lazy-loaded floating help assistant |
### API Services
| Service | Description |
|---|---|
| `apiClient` | Base Axios client — JWT injection, auto-refresh on 401 |
| `authService` | Login, register, logout, token refresh |
| `libraryService` | Book CRUD, upload, chat, search, summary, flashcards |
| `readingService` | Reading session management |
| `studyProgressService` | Study progress API |
| `profileService` | Profile read/update, avatar upload |
| `adminService` | Audit logs and dead-letters |
---
## Quick Start
### Prerequisites
| Tool | Minimum version |
|---|---|
| Docker + Docker Compose | v2+ |
| Node.js | 20+ |
| Gemini API Key | — (required for embeddings) |
| Groq API Key | — (optional, for chat) |
### 1. Set up environment
```bash
cp .env.example .env
```
Edit `.env` and set the required values:
```env
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
JWT_SECRET=at-least-32-characters-of-random-secret
```
> All `DOCKER_*` variables in `.env.example` already point to the local Docker containers. No external databases needed for local development.
### 2. Start the backend
```bash
docker compose up -d --build
```
The first build downloads JDK + Python layers (~5 min). Subsequent starts take seconds.
Check everything is healthy:
```bash
curl http://localhost:8083/actuator/health   # web-module       → {"status":"UP"}
curl http://localhost:8082/actuator/health   # business-service → {"status":"UP"}
curl http://localhost:8080/actuator/health   # ai-service       → {"status":"UP"}
curl http://localhost:8081/actuator/health   # data-service     → {"status":"UP"}
curl http://localhost:8000/health            # haystack-service → {"status":"ok"}
```
### 3. Start the frontend
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000**
### 4. First use
1. Go to `/signup` — register your account. **The first user registered is automatically ADMIN.**
2. Go to **Settings ⚙️** to optionally store your personal Gemini/Groq key.
3. Go to **Library 📚** → upload a `.pdf` or `.epub`.
4. Wait for status `COMPLETED`, then click the book to start reading and chatting.
---
## Environment Variables
Full reference: [`.env.example`](.env.example)
### Required
| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (embeddings + generation) |
| `JWT_SECRET` | HS512 signing secret — minimum 32 characters |
### AI / LLM
| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | Groq API key |
| `GROQ_CHAT_MODEL` | `llama-3.1-8b-instant` | Groq chat model |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Groq base URL |
| `GEMINI_EMBEDDING_BATCH_SIZE` | `50` | Chunks per embedding batch |
| `GEMINI_EMBEDDING_BATCH_DELAY_MS` | `32000` | Delay between batches (ms) |
| `GEMINI_EMBEDDING_MAX_RETRIES` | `5` | Max retries on rate limit |
### Auth
| Variable | Default | Description |
|---|---|---|
| `JWT_TTL_SECONDS` | `86400` | Access token lifetime (24 h) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
### Guardrails
| Variable | Default | Description |
|---|---|---|
| `GUARDRAILS_MAX_LLM_REQUESTS_PER_DAY` | `500` | Daily LLM cap per user |
| `GUARDRAILS_MAX_UPLOADS_PER_DAY` | `100` | Daily upload cap per user |
| `INGESTION_MAX_FILE_SIZE_BYTES` | `26214400` | Max file size (25 MB) |
| `INGESTION_MAX_RETRIES` | `3` | Job retry limit |
### Background Worker
| Variable | Default | Description |
|---|---|---|
| `WORKER_ENABLED` | `true` | Enable ingestion background worker |
| `WORKER_POLL_INTERVAL_MS` | `5000` | Polling interval |
| `WORKER_BATCH_SIZE` | `5` | Jobs per poll cycle |
### Object Storage (optional)
| Variable | Default | Description |
|---|---|---|
| `STORAGE_ENABLED` | `false` | Enable S3 / Backblaze B2 |
| `STORAGE_ENDPOINT` | — | S3-compatible endpoint |
| `STORAGE_ACCESS_KEY` | — | Access key |
| `STORAGE_SECRET_KEY` | — | Secret key |
| `STORAGE_BUCKET` | `deepreader-documents` | Bucket name |
### Kafka (optional)
| Variable | Default | Description |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | — | Broker address |
| `KAFKA_CAMEL_ROUTE_ENABLED` | `false` | Enable Camel Kafka consumer |
| `KAFKA_PUBLISHER_ENABLED` | `false` | Enable event publishing |
| `BOOK_EVENTS_TOPIC` | `deepreader.book.events` | Main event topic |
| `BOOK_EVENTS_DLQ_TOPIC` | `deepreader.book.events.dlq` | Dead-letter topic |
---
## API Overview
Full request/response contracts: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)
### Public endpoints — `web-module` (`:8083`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | — | Register + receive JWT |
| `POST` | `/api/v1/auth/login` | — | Login + receive JWT |
| `POST` | `/api/v1/auth/refresh` | — | Rotate refresh token |
| `POST` | `/api/v1/auth/logout` | — | Revoke session |
| `POST` | `/api/v1/books/upload` | JWT | Upload PDF/EPUB |
| `GET` | `/api/v1/books/` | JWT | List user's books |
| `POST` | `/api/v1/books/{bookId}/chat` | JWT | RAG chat with book |
| `POST` | `/api/v1/books/{bookId}/search` | JWT | Semantic search |
| `POST` | `/api/v1/books/{bookId}/summary` | JWT | Generate summary |
| `POST` | `/api/v1/books/{bookId}/flashcards` | JWT | Generate flashcards |
| `GET` | `/api/v1/books/{bookId}/summaries` | JWT | Stored summaries |
| `GET` | `/api/v1/books/{bookId}/flashcards` | JWT | Stored flashcards |
| `GET` | `/api/v1/books/{bookId}/chats` | JWT | Chat history |
| `GET` | `/api/v1/admin/audit-logs` | JWT + ADMIN | Audit logs |
| `GET` | `/api/v1/admin/dead-letters` | JWT + ADMIN | Failed jobs |
### Internal endpoints — `ai-service` (`:8080`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/internal/ai/v1/documents/upload` | Sync ingest |
| `POST` | `/internal/ai/v1/documents/upload/async` | Async ingest → returns `jobId` |
| `GET` | `/internal/ai/v1/documents/jobs/{jobId}` | Poll job status |
| `POST` | `/internal/ai/v1/documents/chat/ask` | RAG chat |
| `POST` | `/internal/ai/v1/documents/search` | Semantic search |
| `POST` | `/internal/ai/v1/documents/summary` | Generate summary |
| `POST` | `/internal/ai/v1/documents/flashcards` | Generate flashcards |
### Internal endpoints — `data-service` (`:8081`)
| Method | Path | Description |
|---|---|---|
| `POST/GET` | `/internal/data/v1/books` | Book CRUD |
| `POST/GET` | `/internal/data/v1/chapters` | Chapter CRUD |
| `POST/GET` | `/internal/data/v1/summaries` | Summary CRUD |
| `POST/GET` | `/internal/data/v1/flashcards` | Flashcard CRUD |
| `POST/GET` | `/internal/data/v1/chats` | Chat history CRUD |
| `POST/GET` | `/internal/data/v1/reading-sessions` | Reading session CRUD |
| `POST/GET` | `/internal/data/v1/relational/users` | PostgreSQL user accounts |
---
## Databases
### PostgreSQL 17 (`:5432`)
Used by `web-module`, `ai-service`, `data-service`. Schema managed by **Flyway** (auto-migrate on startup).
Tables: `app_users` · `ingestion_jobs` · `audit_logs` · `dead_letters`
### MongoDB 7 (`:27017`)
Used by `data-service` via Spring Data Reactive MongoDB.
Collections: `books` · `chapters` · `chapter_summaries` · `flashcards` · `chat_histories` · `reading_sessions` · `users`
### Redis 7 (`:6379`)
Used by `web-module` (JWT sessions, rate-limit counters) and `ai-service` (guardrail counters). Persistence enabled with `appendonly yes`.
### Qdrant (`:6333` / `:6334`)
Vector database used by `ai-service` (gRPC) and `haystack-service` (HTTP). Per-provider collections: `document_chunks_gemini`, `document_chunks_groq`, etc. Vectors are 768-dimensional with cosine similarity (Gemini `text-embedding-004`).
### Object Storage
Optional. When `STORAGE_ENABLED=false`, files are stored locally. When enabled, uses AWS S3 SDK v2 against any S3-compatible endpoint (AWS, Backblaze B2, MinIO, etc.).
---
## Security
| Mechanism | Detail |
|---|---|
| JWT | HS512 signed, configurable TTL via `JWT_TTL_SECONDS` |
| Refresh tokens | Stored in Redis, rotated on every `/auth/refresh` call |
| Password hashing | BCrypt via Spring Security Crypto |
| Rate limiting | Sliding-window per IP, enforced in Redis (`web-module` + `ai-service`) |
| Roles | `USER` and `ADMIN` — admin routes gated in `AuthWebFilter` |
| CORS | Configurable via `CORS_ALLOWED_ORIGINS` |
| Security headers | CSP · HSTS · X-Frame-Options set by `SecurityHeadersWebFilter` |
| Request tracing | Unique request ID stamped on every request by `RequestIdWebFilter` |
| Guardrails | Daily LLM request and upload caps, enforced with Redis counters |
| Kafka SSL | Mutual TLS with Aiven-issued certificates |
| Idempotency | `Idempotency-Key` header on async ingestion prevents duplicate jobs |
| Admin bootstrap | First registered user is auto-promoted to ADMIN |
---
## Observability
All four Java services expose Micrometer → Prometheus metrics at `/actuator/prometheus`.
**Prometheus** (`observability/prometheus.yml`) scrapes every 15 seconds:
```
ai-service       → :8080/actuator/prometheus
business-service → :8082/actuator/prometheus
data-service     → :8081/actuator/prometheus
web-module       → :8083/actuator/prometheus
```
Alert rules are loaded from `observability/alerts.yml`.
**Grafana** — import `observability/grafana-dashboard.json` for a pre-built JVM + application metrics dashboard.
**Log correlation** — every request carries a unique trace ID set by `RequestIdWebFilter`, making cross-service log tracing straightforward.
---
## Project Structure
```
deepreader/
├── frontend/                    Next.js 16 web app
│   └── src/
│       ├── app/                 App Router pages
│       ├── components/          UI components (library, flashcards, auth, admin…)
│       ├── services/            API client layer
│       ├── lib/                 Shared utilities
│       └── types/               TypeScript types
│
├── web-module/                  Spring Boot — public gateway :8083
│   └── src/main/java/…/
│       ├── config/              Security, JWT, rate-limit, CORS filters
│       ├── controller/          Auth, Books, Admin, User, Progress
│       └── service/             JWT, Session, UserAccount, StudyProgress
│
├── business-service/            Spring Boot — orchestration :8082
│   └── src/main/java/…/
│       ├── client/              WebClient to ai-service and data-service
│       ├── event/               Kafka domain events and publisher
│       ├── integration/         Apache Camel BookEventRoute
│       └── service/             LibraryOrchestrationService
│
├── ai-service/                  Spring Boot — AI engine :8080
│   └── src/main/java/…/
│       ├── config/              Gemini, Groq, Qdrant, Worker, Storage config
│       ├── controller/          Internal ingestion + vision APIs
│       ├── model/               Request/response + provider models
│       ├── service/             Embedding, chunking, chat, vision, storage…
│       └── startup/             IngestionQueueWorker, RetentionJob, QdrantVerifier
│
├── data-service/                Spring Boot — persistence :8081
│   └── src/main/java/…/
│       ├── controller/          Library data + relational user endpoints
│       ├── entity/              JPA entities for PostgreSQL
│       ├── repository/          MongoDB reactive repos + JPA repo
│       └── service/             LibraryDataService, UserAccountJpaService
│
├── haystack-service/            FastAPI — vector search bridge :8000
│   └── app/
│       ├── main.py              /health /ingest /search
│       └── schemas.py           Pydantic models
│
├── core/                        Shared Java library (DTOs, utils)
├── observability/               Prometheus config, Grafana dashboard, alert rules
├── aiven_connect/               Kafka SSL certificates (gitignored)
├── docs/                        API reference, runbooks, getting started guide
├── docker-compose.yml           Full local stack definition
└── .env.example                 Environment variable template
```
---
## Tech Stack
### Backend — Java
| Library | Version | Used in |
|---|---|---|
| Java (OpenJDK) | 21 | All services |
| Spring Boot | 3.5.13 | All services |
| Spring WebFlux / Reactor | 3.5 | All services |
| Spring Security | 6.x | web-module |
| Spring Data MongoDB Reactive | 3.5 | data-service |
| Spring Data JPA | 3.5 | data-service |
| Spring Data Redis | 3.5 | web-module, ai-service |
| Spring Kafka | 3.x | business-service |
| Apache Camel | 4.18.0 | business-service |
| JJWT | 0.11.5 | web-module |
| Flyway | latest | ai-service, data-service |
| Qdrant Java Client (gRPC) | 1.15.0 | ai-service |
| AWS S3 SDK v2 | 2.25.53 | ai-service |
| Apache PDFBox | 3.0.7 | ai-service |
| epublib | 3.1 | ai-service |
| Micrometer Prometheus | latest | business-service, data-service |
| SpringDoc OpenAPI | 2.8.9 | ai-service, web-module |
| Lombok | latest | All services |
### Backend — Python
| Library | Version |
|---|---|
| FastAPI | 0.115.0 |
| uvicorn | 0.30.6 |
| Haystack-AI | 2.27.0 |
| qdrant-haystack | 10.3.0 |
### Frontend
| Library | Version | Purpose |
|---|---|---|
| Next.js | 16.2.4 | React framework, App Router |
| React | 19.2.4 | UI |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Lucide React | 1.16.0 | Icons |
| Lottie React | 2.4.1 | Animations |
| pdf.js (pdfjs-dist) | 5.7.x | In-browser PDF rendering |
### Infrastructure
| Tool | Version | Purpose |
|---|---|---|
| Docker Compose | v2+ | Container orchestration |
| PostgreSQL | 17-alpine | Relational store |
| MongoDB | 7 | Document store |
| Redis | 7-alpine | Cache + sessions |
| Qdrant | latest | Vector database |
| Apache Kafka | Aiven Cloud | Event streaming |
| Prometheus | — | Metrics |
| Grafana | — | Dashboards |
---
## Docs
| File | Description |
|---|---|
| [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md) | Full startup walkthrough and workflow guide |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Complete request/response contracts for all services |
| [`docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`](docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md) | Production deployment checklist |
| [`docs/GRANT_ADMIN_MANUAL.md`](docs/GRANT_ADMIN_MANUAL.md) | How to grant the ADMIN role |
