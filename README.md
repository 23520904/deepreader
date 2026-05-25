<div align="center">
# 📚 DeepReader
**AI-powered deep reading platform — upload any book, then chat with it, summarize it, and learn from it.**
[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-Event_Streaming-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC244C?logo=qdrant&logoColor=white)](https://qdrant.tech/)
</div>
---
## 🗂️ Table of Contents
- [Overview](#-overview)
- [Feature Highlights](#-feature-highlights)
- [Architecture](#-architecture)
- [Service Breakdown](#-service-breakdown)
- [Frontend Pages & Components](#-frontend-pages--components)
- [Data Flow — Book Ingestion](#-data-flow--book-ingestion)
- [Data Flow — RAG Chat](#-data-flow--rag-chat)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Databases & Storage](#-databases--storage)
- [Security](#-security)
- [Observability](#-observability)
- [Repository Structure](#-repository-structure)
- [Full Tech Stack](#-full-tech-stack)
---
## 🌟 Overview
DeepReader is a **polyglot microservices application** for intelligent document reading. Upload a PDF or EPUB, then:
- **💬 Chat** with the book using RAG (Retrieval-Augmented Generation) — answers include page-level source citations
- **📝 Summarize** the entire book into structured key insights, persisted for future reference
- **🃏 Study** with AI-generated flashcards in four interactive modes (review, quiz, match-terms, memory flip, speed challenge)
- **📖 Read** the raw document inline in the browser with a dedicated reading workspace
The stack spans **Java**, **Python**, and **TypeScript**, connected by Docker Compose for local development and Kafka for asynchronous event processing.
---
## ✨ Feature Highlights
| Category | Features |
|---|---|
| **Book Management** | Upload PDF / EPUB · Async ingestion with job tracking · Processing status (`QUEUED → PROCESSING → COMPLETED / FAILED`) · Per-user library view · Inline document reader |
| **AI — Chat (RAG)** | Question answering grounded in the uploaded document · Source chunk citations with scores · Chat history persisted per book |
| **AI — Summaries** | Full-book summary generation · Multiple summaries stored and listed per book · Provider selection (Gemini / Groq) |
| **AI — Flashcards** | Generate 1–50 cards per request · Four study modes: **Review** (flip cards), **Quiz** (multiple choice), **Match Terms** (drag game), **Memory Flip** (memory game), **Speed Challenge** (timed) · Deck management with create/delete |
| **AI — Vision** | PDF page rasterization · Embedded image extraction · Gemini Vision analysis of page images |
| **Authentication** | Register / Login / Logout · JWT access + refresh token rotation · Redis-backed session store · Rate limiting per IP |
| **User Profile** | Update display name · Upload & crop avatar · Store personal LLM API token (Gemini / Groq) |
| **Study Progress** | Track reading sessions (start/end time, words read, WPM) · Progress API |
| **Admin Dashboard** | Audit log viewer · Dead-letter (failed ingestion job) inspector · Role-gated access (`ADMIN` only) |
| **Guardrails** | Daily LLM request cap per user · Daily upload cap per user · File size limit (configurable) · Idempotency keys on async ingestion |
| **Observability** | Prometheus metrics on all Java services · Pre-built Grafana dashboard · Alert rules · Per-request IDs |
| **Event Streaming** | Kafka topic for book domain events · Apache Camel route for Kafka integration · Dead-letter queue (DLQ) |
| **Object Storage** | Optional S3 / Backblaze B2 integration · Falls back to local filesystem |
---
## 🏗️ Architecture
```
┌──────────────────────────────────────────────────────────────────┐
│                    Browser / Client                              │
│              Next.js 16 · React 19 · TypeScript                  │
│                      localhost:3000                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTPS · JWT Bearer
┌────────────────────────▼─────────────────────────────────────────┐
│                     web-module  :8083                            │
│  Spring Boot 3.5 · WebFlux · Spring Security · JJWT             │
│  Auth · Books Gateway · Admin · User Profile · Study Progress    │
│  Rate Limit WebFilter · JWT WebFilter · CORS · Request ID        │
└───────┬──────────────────────────────────┬───────────────────────┘
        │ internal HTTP (WebClient)        │ Kafka SSL
        │                        ┌─────────▼─────────────────────┐
        │                        │  Apache Kafka (Aiven Cloud)   │
        │                        │  deepreader.book.events       │
        │                        │  deepreader.book.events.dlq   │
        │                        └─────────▲─────────────────────┘
        │                                  │ publish / consume
┌───────▼──────────────────────────────────┴───────────────────────┐
│                 business-service  :8082                          │
│  Spring Boot 3.5 · WebFlux · Apache Camel 4 · Spring Kafka      │
│  LibraryOrchestrationService · BookEventRoute · BookEventPublisher│
│  Fans out to ai-service and data-service                         │
└───────┬─────────────────────┬────────────────────────────────────┘
        │                     │ internal HTTP
┌───────▼──────────┐ ┌────────▼──────────────────────────────────┐
│  data-service    │ │             ai-service  :8080              │
│  :8081           │ │  Spring Boot 3.5 · WebFlux · Reactor       │
│  Spring Boot 3.5 │ │  Gemini API (embeddings)                   │
│  WebFlux         │ │  Groq API / LLaMA (chat & generation)      │
│  MongoDB (reactive)│ │  Qdrant gRPC client · Redis cache          │
│  JPA + Flyway    │ │  PDFBox · epublib · Haystack HTTP bridge   │
│  PostgreSQL      │ │  Async job worker · Object storage (S3/B2) │
│  Books, Chapters │ │  Guardrails · Rate limit · Vision/OCR      │
│  Summaries       │ │  IngestionQueueWorker (polling)            │
│  Flashcards      │ │  OperationalRetentionJob                   │
│  Chat History    │ └──────────────┬────────────────────────────┘
│  Reading Sessions│               │ internal HTTP
└──────────────────┘ ┌─────────────▼────────────────────────────┐
                     │       haystack-service  :8000             │
                     │  FastAPI · Python · Haystack-AI 2.27      │
                     │  QdrantDocumentStore (per-provider)        │
                     │  QdrantEmbeddingRetriever                  │
                     │  /ingest  /search  /health                 │
                     └──────────────┬───────────────────────────┘
                                    │ HTTP / gRPC
                     ┌──────────────▼───────────────────────────┐
                     │              Qdrant  :6333/:6334          │
                     │        Vector Database                    │
                     │  Per-provider collections                 │
                     │  Cosine similarity search                 │
                     └───────────────────────────────────────────┘
 Shared Infrastructure
 ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
 │ PostgreSQL  │  │  MongoDB 7  │  │  Redis 7    │
 │  :5432      │  │  :27017     │  │  :6379      │
 │ Users, Jobs │  │ Books,      │  │ Sessions,   │
 │ Flyway mig. │  │ Chapters,   │  │ Rate limit  │
 │             │  │ Chat, etc.  │  │ counters    │
 └─────────────┘  └─────────────┘  └─────────────┘
```
---
## 🔧 Service Breakdown
### `web-module` — Public API Gateway (`:8083`)
> **Spring Boot 3.5 · WebFlux · Spring Security · JJWT 0.11.5 · Redis · PostgreSQL · Flyway**
The single entry point for all browser traffic. Verifies JWT on every protected route, enforces CORS, and proxies book operations through to `business-service`.
| Class | Responsibility |
|---|---|
| `AuthController` | Register, login, logout, refresh, revoke |
| `PublicGatewayController` | Books upload/list/search/chat/summary/flashcards proxy |
| `AdminController` | Audit logs, dead-letter records (ADMIN role only) |
| `UserController` | Profile read/update, avatar, LLM token storage |
| `StudyProgressController` | Reading session tracking |
| `VisionPublicController` | PDF vision analysis proxy |
| `JwtService` | Sign + verify HS512 JWTs |
| `SessionService` | Redis-backed refresh token store |
| `UserAccountService` | Registration, first-user admin bootstrap |
| `AdminBootstrapService` | Seeds default admin on startup |
| `AuthWebFilter` | Extracts & validates JWT on every request |
| `RateLimitWebFilter` | Sliding-window rate limiting (Redis) |
---
### `business-service` — Orchestration Layer (`:8082`)
> **Spring Boot 3.5 · WebFlux · Apache Camel 4.18 · Spring Kafka · Micrometer/Prometheus**
Coordinates AI workflows, fans out calls between `ai-service` and `data-service`, and publishes domain events to Kafka.
| Class | Responsibility |
|---|---|
| `LibraryOrchestrationService` | Orchestrates upload → ingest → persist sequence |
| `LibraryBusinessController` | Internal `/internal/business/v1/books/**` routes |
| `VisionBusinessController` | Vision analysis relay |
| `BookEventRoute` | Apache Camel route: Kafka consumer for book events |
| `BookEventPublisher` | Publishes `BookDomainEvent` to Kafka topic |
| `AiServiceClient` | WebClient to `ai-service` |
| `DataServiceClient` | WebClient to `data-service` |
---
### `ai-service` — AI Processing Engine (`:8080`)
> **Spring Boot 3.5 · WebFlux · Reactor · Qdrant gRPC · Redis · PDFBox 3.0.7 · epublib 3.1 · AWS S3 SDK · Haystack HTTP**
The heaviest service: handles all AI operations from document parsing to generation.
| Class | Responsibility |
|---|---|
| `DocumentIngestionService` | End-to-end: parse → chunk → embed → store pipeline |
| `TextExtractionService` | Parse PDF (PDFBox) and EPUB (epublib) to text sections |
| `ChunkingService` | Split sections into overlapping chunks |
| `EmbeddingService` | Batch embed chunks via Gemini `text-embedding-004` (rate-aware, retries) |
| `QdrantVectorStoreService` | gRPC upsert/search against Qdrant |
| `RetrievalService` | Embed query → retrieve top-K chunks from Qdrant |
| `ChatService` | RAG: retrieve context → build prompt → call LLM → return answer + sources |
| `GenerationService` | Summary and flashcard generation via LLM |
| `LlmClientService` | Routes to Gemini or Groq based on provider |
| `PromptBuilderService` | Constructs RAG/summary/flashcard prompts |
| `VectorlessPromptBuilderService` | Prompts without vector context |
| `PdfVisionService` | PDF page → rasterized image → Gemini Vision |
| `PdfPageRasterizer` | Apache PDFBox page → BufferedImage |
| `PdfEmbeddedImageExtractor` | Extracts embedded images from PDF |
| `VisionService` | Gemini multimodal vision API client |
| `GuardrailService` | Daily rate cap checks (LLM requests + uploads) via Redis |
| `IngestionJobService` | CRUD for async ingestion job records in PostgreSQL |
| `IngestionQueueWorker` | Startup polling worker — picks up QUEUED jobs and processes them |
| `OperationalRetentionJob` | Periodic cleanup of old job records |
| `ObjectStorageService` | Upload/download file to S3/B2 or local filesystem |
| `AuditLogService` | Write user-action audit records |
| `DocumentIngestionController` | `/internal/ai/v1/documents/**` endpoints |
| `VisionController` | `/internal/ai/v1/vision/**` endpoints |
**Supported AI Providers:**
| Provider | Used For | Model |
|---|---|---|
| **Google Gemini** | Text embeddings | `text-embedding-004` |
| **Google Gemini** | Vision / image analysis | Gemini Vision |
| **Google Gemini** | Text generation (summary, flashcards, chat) | Configurable |
| **Groq** | Chat / text generation | `llama-3.1-8b-instant` (configurable) |
---
### `data-service` — Persistence Layer (`:8081`)
> **Spring Boot 3.5 · WebFlux · Spring Data MongoDB (Reactive) · Spring Data JPA · Flyway · PostgreSQL · Micrometer/Prometheus**
Dual-database service: **MongoDB** for document-oriented data (books, chapters, chat, flashcards), **PostgreSQL** for relational user accounts.
| Repository | Store | Entity |
|---|---|---|
| `BookRepository` | MongoDB | Book metadata |
| `ChapterRepository` | MongoDB | Chapter content |
| `ChapterSummaryRepository` | MongoDB | Saved summaries |
| `FlashcardRepository` | MongoDB | Flashcard decks |
| `ChatHistoryRepository` | MongoDB | Chat turn history |
| `ReadingSessionRepository` | MongoDB | Reading session records |
| `UserRepository` | MongoDB | User documents |
| `UserAccountJpaRepository` | PostgreSQL | Relational user accounts |
---
### `haystack-service` — Vector Search Bridge (`:8000`)
> **FastAPI · Python · Haystack-AI 2.27 · qdrant-haystack 10.3 · uvicorn**
Thin Python service that wraps Haystack's `QdrantDocumentStore` and `QdrantEmbeddingRetriever`. Maintains per-provider Qdrant collections with LRU caching of store instances.
| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check |
| `/ingest` | POST | Write pre-embedded chunks to Qdrant |
| `/search` | POST | Retrieve top-K matches by query embedding |
---
### `core` — Shared Library
> **Java 21 · Maven**
Shared DTOs and utilities used by `web-module`, `business-service`, and `data-service` to avoid code duplication.
---
## 🖥️ Frontend Pages & Components
> **Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Lucide React · Lottie React · pdf.js**
### Pages
| Route | Component | Description |
|---|---|---|
| `/` | `HomeHero`, `HomeScrollReveal`, `FeatureCardsShowcase` | Landing page with animated feature showcase |
| `/login` | `AuthShell` | JWT login form |
| `/signup` | `AuthShell` | Registration form |
| `/library` | `LibraryContent`, `LibraryHero`, `LibraryCard` | Personal book library with upload |
| `/library/[bookId]/read` | `ReadingWorkspace`, `ReadDocumentHeader` | In-browser document reader |
| `/flashcards` | Deck library | View and manage flashcard decks |
| `/flashcards/[deckId]/cards` | `CardsView` | Flip-card review mode |
| `/flashcards/[deckId]/review` | `ReviewView` | Spaced-review mode |
| `/flashcards/[deckId]/quiz` | `QuizView` | Multiple-choice quiz |
| `/flashcards/[deckId]/games` | `MatchTermsGame`, `MemoryFlipGame`, `SpeedChallengeGame` | Interactive study games |
| `/profile` | `ProfileEditor`, `ProfileForm`, `AvatarCropDialog` | Edit name, avatar, LLM token |
| `/admin` | `adminService` | Audit logs + dead-letter table (ADMIN only) |
| `/about` | About components | Mission, story, how-it-works |
| `/help-center` | `HelpCenterContent`, `HelpGuideContent` | FAQ and guides |
| `/contact` | Contact form | Support page |
### Key Components
| Component | Description |
|---|---|
| `AiStudyPanel` | Unified panel: switches between Chat, Summary, Flashcard tabs |
| `DocumentChatPanel` | RAG chat UI with streaming-friendly message list |
| `UploadModal` | Drag-and-drop book upload with provider selection |
| `ConfigureModal` | LLM API key configuration modal |
| `AuthRoleGuard` | Redirects unauthorized users away from protected routes |
| `FloatingHelpChat` | Lazy-loaded floating help assistant |
| `AccountSidebar` | User account management sidebar |
| `SiteNavbar` / `SiteFooter` | Global navigation and footer |
| `FlashcardModePage` | Wrapper for all four study mode views |
| `GameSetupModal` | Configure game parameters before starting |
### Services (API Client Layer)
| Service | Description |
|---|---|
| `authService` | Login, register, logout, refresh token |
| `libraryService` | Book CRUD, upload, search, chat, summary, flashcards |
| `readingService` | In-book reading session management |
| `studyProgressService` | Study progress tracking API |
| `profileService` | User profile read/update, avatar upload |
| `adminService` | Audit logs and dead-letter fetching |
| `apiClient` | Axios-based base client with JWT injection and refresh logic |
---
## 🔄 Data Flow — Book Ingestion
```
Browser
  │ POST /api/v1/books/upload  (multipart, JWT)
  ▼
web-module
  │ forwards to →
  ▼
business-service  POST /internal/business/v1/books/upload
  │ calls →
  ▼
ai-service  POST /internal/ai/v1/documents/upload/async
  │ 1. Saves file to Object Storage (S3/B2 or local)
  │ 2. Creates IngestionJob record (status: QUEUED) in PostgreSQL
  │ returns jobId immediately
  ▼
IngestionQueueWorker (polling every 5s)
  │ picks up QUEUED jobs →
  │ 1. TextExtractionService  → parse PDF/EPUB into DocumentSections
  │ 2. ChunkingService        → split into overlapping DocumentChunks
  │ 3. EmbeddingService       → Gemini batch embed (rate-aware, retries)
  │ 4. haystack-service POST /ingest  → write to Qdrant per-provider collection
  │ 5. Update job status: COMPLETED
  ▼
business-service
  │ DataServiceClient → data-service POST /internal/data/v1/books  (persist Book entity)
  │ BookEventPublisher → Kafka topic: deepreader.book.events
  ▼
data-service  → MongoDB  (stores Book, Chapters metadata)
Kafka          → BookEventRoute (Apache Camel) processes event, triggers downstream
```
---
## 🔄 Data Flow — RAG Chat
```
Browser
  │ POST /api/v1/books/{bookId}/chat  { query, provider }
  ▼
web-module  (JWT check + rate limit)
  │
  ▼
business-service  POST /internal/business/v1/books/{bookId}/chat
  │
  ▼
ai-service  POST /internal/ai/v1/documents/chat/ask
  │ 1. EmbeddingService   → embed the user query (Gemini)
  │ 2. RetrievalService   → haystack-service POST /search  → top-K chunks from Qdrant
  │ 3. PromptBuilderService → build RAG prompt with retrieved context
  │ 4. LlmClientService   → Groq or Gemini API (chat completion)
  │ 5. Return answer + source chunks
  ▼
business-service
  │ DataServiceClient → data-service POST /internal/data/v1/chats  (persist chat turn)
  ▼
web-module → Browser  { answer, sources[] }
```
---
## 🚀 Quick Start
### Prerequisites
| Tool | Version | Required For |
|---|---|---|
| Docker + Docker Compose | v2+ | All backend services |
| Node.js | 20+ | Frontend |
| npm | 9+ | Frontend |
| Gemini API Key | — | Embeddings (required) |
| Groq API Key | — | Chat LLM (or use Gemini) |
### Step 1 — Configure environment
```bash
cp .env.example .env
```
Open `.env` and fill in the minimum required values:
```env
# ── AI providers ─────────────────────────────────────────
GEMINI_API_KEY=your-google-gemini-api-key
GROQ_API_KEY=your-groq-api-key
# ── Security ─────────────────────────────────────────────
JWT_SECRET=replace-with-a-random-secret-at-least-32-chars
```
> **Local development note:** The `DOCKER_*` prefixed variables in `.env.example` already point all services to the local Docker containers — no external databases required except the AI API keys.
### Step 2 — Start backend
```bash
# From the repository root
docker compose up -d --build
```
First build takes a few minutes (downloads JDK layers, Python deps). Subsequent starts are fast.
**Verify all services are healthy:**
```bash
# All should return {"status":"UP"} or {"status":"ok"}
curl http://localhost:8083/actuator/health   # web-module
curl http://localhost:8082/actuator/health   # business-service
curl http://localhost:8080/actuator/health   # ai-service
curl http://localhost:8081/actuator/health   # data-service
curl http://localhost:8000/health            # haystack-service
```
### Step 3 — Start frontend
```bash
cd frontend
npm install
npm run dev
```
**Open [http://localhost:3000](http://localhost:3000)**
### Step 4 — First login
1. Go to `/signup` and register — the **first account created is automatically ADMIN**
2. Optionally go to **Settings ⚙️** to add your personal Gemini/Groq API key
3. Go to **Library 📚**, upload a `.pdf` or `.epub`
4. Wait for `COMPLETED` status, then click the book to start reading
---
## ⚙️ Environment Variables
See [`.env.example`](.env.example) for the complete reference. Key groups:
### AI Providers
| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (embedding + generation) |
| `GROQ_API_KEY` | Groq API key (chat LLM) |
| `GROQ_BASE_URL` | Groq base URL (default: `https://api.groq.com/openai/v1`) |
| `GROQ_CHAT_MODEL` | Chat model name (default: `llama-3.1-8b-instant`) |
| `GEMINI_EMBEDDING_BATCH_SIZE` | Chunks per embedding batch (default: `50`) |
| `GEMINI_EMBEDDING_BATCH_DELAY_MS` | Delay between batches in ms (default: `32000`) |
| `GEMINI_EMBEDDING_MAX_RETRIES` | Max retries on rate limit (default: `5`) |
### Security & Auth
| Variable | Description |
|---|---|
| `JWT_SECRET` | HS512 signing secret (min 32 chars) |
| `JWT_TTL_SECONDS` | Access token lifetime (default: `86400` = 24h) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |
### Guardrails
| Variable | Description |
|---|---|
| `GUARDRAILS_MAX_LLM_REQUESTS_PER_DAY` | Daily LLM cap per user (default: `500`) |
| `GUARDRAILS_MAX_UPLOADS_PER_DAY` | Daily upload cap per user (default: `100`) |
| `INGESTION_MAX_FILE_SIZE_BYTES` | Max file size (default: `26214400` = 25 MB) |
| `INGESTION_MAX_RETRIES` | Job retry limit (default: `3`) |
### Worker
| Variable | Description |
|---|---|
| `WORKER_ENABLED` | Enable background ingestion worker (default: `true`) |
| `WORKER_POLL_INTERVAL_MS` | Job polling interval (default: `5000`) |
| `WORKER_BATCH_SIZE` | Jobs processed per poll cycle (default: `5`) |
### Databases
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL JDBC URL |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `QDRANT_HOST` / `QDRANT_GRPC_PORT` | Qdrant gRPC endpoint |
### Object Storage (Optional)
| Variable | Description |
|---|---|
| `STORAGE_ENABLED` | Enable S3/B2 storage (default: `false` in Docker) |
| `STORAGE_ENDPOINT` | S3-compatible endpoint URL |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Credentials |
| `STORAGE_BUCKET` | Bucket name (default: `deepreader-documents`) |
### Kafka (Optional)
| Variable | Description |
|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | Broker address |
| `KAFKA_CAMEL_ROUTE_ENABLED` | Enable Camel Kafka consumer (default: `false` in Docker) |
| `KAFKA_PUBLISHER_ENABLED` | Enable event publishing (default: `false` in Docker) |
| `BOOK_EVENTS_TOPIC` | Topic name (default: `deepreader.book.events`) |
| `BOOK_EVENTS_DLQ_TOPIC` | Dead-letter topic |
---
## 🌐 API Reference
Full request/response contracts: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
### Public — `web-module` (`:8083`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register new user, receive JWT |
| POST | `/api/v1/auth/login` | Public | Login, receive JWT |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Public | Revoke session |
| POST | `/api/v1/books/upload` | JWT | Upload PDF/EPUB, trigger ingestion |
| GET | `/api/v1/books/` | JWT | List user's books |
| POST | `/api/v1/books/{bookId}/chat` | JWT | RAG chat with book |
| POST | `/api/v1/books/{bookId}/search` | JWT | Semantic chunk search |
| POST | `/api/v1/books/{bookId}/summary` | JWT | Generate summary |
| POST | `/api/v1/books/{bookId}/flashcards` | JWT | Generate flashcards |
| GET | `/api/v1/books/{bookId}/summaries` | JWT | List stored summaries |
| GET | `/api/v1/books/{bookId}/flashcards` | JWT | List stored flashcards |
| GET | `/api/v1/books/{bookId}/chats` | JWT | Chat history |
| GET | `/api/v1/admin/audit-logs` | JWT + ADMIN | Audit log listing |
| GET | `/api/v1/admin/dead-letters` | JWT + ADMIN | Failed ingestion jobs |
### Internal — `ai-service` (`:8080`)
| Method | Path | Description |
|---|---|---|
| POST | `/internal/ai/v1/documents/upload` | Sync ingest |
| POST | `/internal/ai/v1/documents/upload/async` | Async ingest (returns jobId) |
| GET | `/internal/ai/v1/documents/jobs/{jobId}` | Poll job status |
| POST | `/internal/ai/v1/documents/search` | Semantic search |
| POST | `/internal/ai/v1/documents/chat/ask` | RAG chat |
| POST | `/internal/ai/v1/documents/summary` | Generate summary |
| POST | `/internal/ai/v1/documents/flashcards` | Generate flashcards |
### Internal — `data-service` (`:8081`)
| Method | Path | Description |
|---|---|---|
| POST/GET | `/internal/data/v1/books` | Book CRUD |
| POST/GET | `/internal/data/v1/chapters` | Chapter CRUD |
| POST/GET | `/internal/data/v1/summaries` | Summary CRUD |
| POST/GET | `/internal/data/v1/flashcards` | Flashcard CRUD |
| POST/GET | `/internal/data/v1/chats` | Chat history CRUD |
| POST/GET | `/internal/data/v1/reading-sessions` | Reading session CRUD |
| POST/GET | `/internal/data/v1/relational/users` | PostgreSQL user accounts |
### Health Endpoints
| Service | URL |
|---|---|
| web-module | `GET http://localhost:8083/actuator/health` |
| business-service | `GET http://localhost:8082/actuator/health` |
| ai-service | `GET http://localhost:8080/actuator/health` |
| data-service | `GET http://localhost:8081/actuator/health` |
| haystack-service | `GET http://localhost:8000/health` |
---
## 🗄️ Databases & Storage
### PostgreSQL 17
- **Used by:** `web-module`, `ai-service`, `data-service`
- **Schemas managed by Flyway** (auto-migrate on startup)
- Tables: `app_users`, `ingestion_jobs`, `audit_logs`, `dead_letters`
### MongoDB 7
- **Used by:** `data-service` (Spring Data Reactive MongoDB)
- Collections: `books`, `chapters`, `chapter_summaries`, `flashcards`, `chat_histories`, `reading_sessions`, `users`
### Redis 7
- **Used by:** `web-module` (session store, rate-limit counters), `ai-service` (guardrail counters)
- Persisted with `appendonly yes`
### Qdrant (Vector DB)
- **Used by:** `ai-service` (gRPC) + `haystack-service` (HTTP)
- Per-provider collections named `{QDRANT_COLLECTION_PREFIX}_{provider}` (e.g. `document_chunks_gemini`)
- Cosine similarity, 768-dim vectors (Gemini `text-embedding-004`)
### Object Storage (S3 / Backblaze B2)
- **Optional.** When `STORAGE_ENABLED=false`, files are stored locally at `STORAGE_LOCAL_DIRECTORY`
- AWS S3 SDK v2 (`software.amazon.awssdk:s3`)
---
## 🔐 Security
| Mechanism | Details |
|---|---|
| **JWT** | HS512 signed access tokens (JJWT 0.11.5) · configurable TTL |
| **Refresh Tokens** | Stored in Redis · rotated on each `/refresh` call |
| **Password Hashing** | Spring Security Crypto (BCrypt) |
| **Rate Limiting** | Sliding-window per IP via Redis (both `web-module` and `ai-service`) |
| **Role-Based Access** | `USER` and `ADMIN` roles · admin endpoints gated by `AuthWebFilter` |
| **CORS** | Configurable allowed origins via `CORS_ALLOWED_ORIGINS` |
| **Security Headers** | `SecurityHeadersWebFilter` adds CSP, HSTS, X-Frame-Options |
| **Request ID** | `RequestIdWebFilter` stamps every request with a unique trace ID |
| **Guardrails** | Daily LLM request + upload caps per user, enforced in Redis |
| **Kafka SSL** | Aiven-issued certificates for mutual TLS on Kafka connections |
| **Idempotency** | `Idempotency-Key` header on async ingestion prevents duplicate jobs |
---
## 📊 Observability
All four Java services expose **Micrometer → Prometheus** metrics at `/actuator/prometheus`.
### Prometheus (`observability/prometheus.yml`)
Scrapes every 15 seconds:
- `ai-service:8080`
- `business-service:8082`
- `data-service:8081`
- `web-module:8083`
Alert rules loaded from `observability/alerts.yml`.
### Grafana (`observability/grafana-dashboard.json`)
Pre-built dashboard covering JVM metrics and application-level indicators. Import into your Grafana instance.
### Structured Logging
Each request carries a unique Request ID (set by `RequestIdWebFilter` / `SecurityHeadersWebFilter`), making log correlation across services straightforward.
---
## 📁 Repository Structure
```
deepreader/
│
├── frontend/                       # Next.js 16 web application
│   └── src/
│       ├── app/                    # Next.js App Router pages
│       ├── components/             # React components (library, flashcards, auth, admin…)
│       ├── services/               # API client wrappers
│       ├── lib/                    # Utilities (auth, reading, flashcard study logic)
│       └── types/                  # TypeScript type definitions
│
├── web-module/                     # Spring Boot — public gateway & auth (:8083)
│   └── src/main/java/com/deepreader/web_module/
│       ├── config/                 # Security, JWT, rate-limit filters
│       ├── controller/             # Auth, Books, Admin, User, Progress
│       └── service/                # JWT, Session, UserAccount, StudyProgress
│
├── business-service/               # Spring Boot — orchestration & events (:8082)
│   └── src/main/java/com/deepreader/business_service/
│       ├── client/                 # WebClient to ai-service, data-service
│       ├── controller/             # Internal library + vision routes
│       ├── event/                  # Kafka domain events & publisher
│       ├── integration/            # Apache Camel BookEventRoute
│       └── service/                # LibraryOrchestrationService
│
├── ai-service/                     # Spring Boot — AI processing engine (:8080)
│   └── src/main/java/com/deepreader/ai_service/
│       ├── config/                 # Gemini, Groq, Qdrant, Worker, Storage props
│       ├── controller/             # Ingestion + Vision internal APIs
│       ├── model/                  # API models + provider models (Gemini/Groq)
│       ├── service/                # All AI services (embed, chunk, chat, vision…)
│       └── startup/                # IngestionQueueWorker, RetentionJob, QdrantVerifier
│
├── data-service/                   # Spring Boot — data persistence (:8081)
│   └── src/main/java/com/deepreader/data_service/
│       ├── controller/             # Library data + relational user endpoints
│       ├── entity/                 # JPA entities (PostgreSQL)
│       ├── repository/             # MongoDB reactive repos + JPA repo
│       └── service/                # LibraryDataService, UserAccountJpaService
│
├── haystack-service/               # FastAPI Python — vector search bridge (:8000)
│   └── app/
│       ├── main.py                 # /health, /ingest, /search endpoints
│       └── schemas.py              # Pydantic request/response models
│
├── core/                           # Shared Java library (DTOs, utils)
│
├── observability/                  # Prometheus + Grafana + Alerts configs
│   ├── prometheus.yml
│   ├── grafana-dashboard.json
│   └── alerts.yml
│
├── aiven_connect/                  # Kafka SSL certificates (gitignored)
├── docs/                           # API reference, runbooks, getting started
├── docker-compose.yml              # Full local stack (9 services)
├── .env.example                    # Environment variable template
└── README.md                       # This file
```
---
## 🧰 Full Tech Stack
### Backend — Java Services
| Technology | Version | Used In |
|---|---|---|
| Java (OpenJDK) | 21 | All Java services |
| Spring Boot | 3.5.13 | All Java services |
| Spring WebFlux (Reactor) | 3.5.x | All Java services |
| Spring Security | 6.x | web-module |
| Spring Data MongoDB Reactive | 3.5.x | data-service |
| Spring Data JPA | 3.5.x | data-service |
| Spring Data Redis | 3.5.x | web-module, ai-service |
| Spring Kafka | 3.x | business-service |
| Apache Camel | 4.18.0 | business-service |
| JJWT | 0.11.5 | web-module |
| Flyway | Latest | ai-service, data-service |
| Qdrant Java Client | 1.15.0 | ai-service |
| AWS S3 SDK v2 | 2.25.53 | ai-service |
| Apache PDFBox | 3.0.7 | ai-service |
| epublib | 3.1 | ai-service |
| Micrometer Prometheus | Latest | business-service, data-service |
| SpringDoc OpenAPI | 2.8.9 | ai-service, web-module |
| Lombok | Latest | All Java services |
| Maven Enforcer | 3.5.0 | All Java services |
### Backend — Python Service
| Technology | Version | Used In |
|---|---|---|
| Python | 3.x | haystack-service |
| FastAPI | 0.115.0 | haystack-service |
| uvicorn | 0.30.6 | haystack-service |
| Haystack-AI | 2.27.0 | haystack-service |
| qdrant-haystack | 10.3.0 | haystack-service |
### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.4 | React framework, App Router |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Lucide React | 1.16.0 | Icon library |
| Lottie React | 2.4.1 | Animated illustrations |
| pdf.js (pdfjs-dist) | 5.7.x | In-browser PDF rendering |
### Infrastructure
| Technology | Version | Purpose |
|---|---|---|
| Docker / Docker Compose | v2+ | Container orchestration |
| PostgreSQL | 17-alpine | Relational store (users, jobs) |
| MongoDB | 7 | Document store (books, chat, etc.) |
| Redis | 7-alpine | Cache, sessions, rate limits |
| Qdrant | latest | Vector database |
| Apache Kafka | Aiven Cloud | Event streaming |
| Prometheus | — | Metrics collection |
| Grafana | — | Metrics visualization |
| AWS S3 / Backblaze B2 | — | File object storage (optional) |
---
## 📚 Further Reading
| Document | Description |
|---|---|
| [Getting Started Guide](docs/GETTING_STARTED.md) | Step-by-step startup walkthrough (Vietnamese) |
| [API Reference](docs/API_REFERENCE.md) | Full request/response contracts for all services |
| [Production Deployment Runbook](docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md) | Production deployment checklist |
| [Grant Admin Manual](docs/GRANT_ADMIN_MANUAL.md) | How to grant/revoke admin role |
---
<div align="center">
Made with ❤️ — **DeepReader** · A deep reading experience powered by AI
</div>
