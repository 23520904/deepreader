# DeepReader API Reference

Detailed HTTP API contracts grouped by service.  
All request/response bodies below are JSON unless explicitly marked `multipart/form-data`.

## Public APIs (`web-module`)

### Auth API
Base path: `/api/v1/auth`

#### `POST /register`
- Purpose: register a new user and issue tokens.
- Request body:
  - `email` (string, required, valid email)
  - `password` (string, required, 8-128 chars)
- Response body (`AuthResponse`):
  - `userId` (string)
  - `email` (string)
  - `token` (string, access JWT)
  - `refreshToken` (string)
  - `role` (string, e.g. `USER`, `ADMIN`)

#### `POST /login`
- Purpose: authenticate an existing user and issue tokens.
- Request body:
  - `email` (string, required, valid email)
  - `password` (string, required)
- Response body: same as `POST /register`.

#### `POST /refresh`
- Purpose: rotate refresh token and issue a new access token.
- Request body:
  - `refreshToken` (string, required)
- Response body: same as `POST /register`.

#### `POST /logout`
- Purpose: revoke current refresh token/session.
- Request body:
  - `refreshToken` (string, required)
- Response: empty body (`200`).

#### `POST /revoke`
- Purpose: alias of `/logout`.
- Request/response: same as `POST /logout`.

### Books API
Base path: `/api/v1/books`

#### `POST /upload`
- Purpose: upload PDF/EPUB and trigger ingestion.
- Content type: `multipart/form-data`
- Form fields:
  - `file` (file, required)
  - `provider` (string, optional; model provider override)
- Response body (`BookUploadResponse`):
  - `book` (`Book`)
    - `id`, `userId`, `aiDocumentId`, `title`, `status`, `totalChapters`, `format`, `createdAt`
  - `provider` (string)
  - `aiDocumentId` (string)
  - `chunkCount` (integer)

#### `GET /`
- Purpose: list books for authenticated user.
- Response body: array of `Book`.

#### `POST /{bookId}/search`
- Purpose: retrieve relevant chunks for query.
- Path params:
  - `bookId` (string, required)
- Request body (`BookQueryRequest`):
  - `query` (string, required, non-blank)
  - `limit` (integer, optional, min `1`, max `20`)
  - `provider` (string, optional)
- Response body (`AiSearchResponse`):
  - `query` (string)
  - `limit` (integer)
  - `provider` (string)
  - `matches` (array of `AiRetrievedChunk`)
    - `documentId`, `chunkId`, `fileName`, `sectionId`, `title`, `chunkIndex`, `content`, `score`

#### `POST /{bookId}/chat`
- Purpose: ask grounded question using retrieved context.
- Path params:
  - `bookId` (string, required)
- Request body: same as `POST /{bookId}/search`.
- Response body (`AiChatResponse`):
  - `query` (string)
  - `answer` (string)
  - `sources` (array of `AiSourceReference`)
    - `documentId`, `chunkId`, `fileName`, `sectionId`, `title`, `chunkIndex`, `content`, `score`

#### `POST /{bookId}/summary`
- Purpose: generate summary for book document.
- Path params:
  - `bookId` (string, required)
- Request body (`BookSummaryCommand`):
  - `provider` (string, optional)
- Response body (`AiSummaryResponse`):
  - `documentId` (string)
  - `provider` (string)
  - `summary` (string)

#### `POST /{bookId}/flashcards`
- Purpose: generate flashcards.
- Path params:
  - `bookId` (string, required)
- Request body (`BookFlashcardCommand`):
  - `provider` (string, optional)
  - `count` (integer, optional, min `1`, max `50`)
- Response body (`AiFlashcardResponse`):
  - `documentId` (string)
  - `provider` (string)
  - `flashcards` (array)
    - `question` (string)
    - `answer` (string)

#### `GET /{bookId}/summaries`
- Purpose: list stored summaries for a book.
- Response body: array of `ChapterSummary`:
  - `id`, `chapterId`, `bookId`, `content`, `model`, `createdAt`

#### `GET /{bookId}/flashcards`
- Purpose: list stored flashcards for a book.
- Response body: array of `Flashcard`:
  - `id`, `chapterId`, `bookId`, `userId`, `question`, `answer`, `createdAt`

#### `GET /{bookId}/chats`
- Purpose: list chat history for a book.
- Response body: array of `ChatHistory`:
  - `id`, `userId`, `bookId`, `role`, `content`, `timestamp`

### Admin API
Base path: `/api/v1/admin`

#### `GET /audit-logs?limit=100`
- Purpose: list latest audit logs (admin only).
- Query params:
  - `limit` (integer, optional, clamped to `1..500`)
- Response body: array of objects:
  - `user_id`, `action`, `details`, `created_at`

#### `GET /dead-letters?sinceHours=24`
- Purpose: list ingestion dead-letter records (admin only).
- Query params:
  - `sinceHours` (integer, optional, clamped to `1..168`)
- Response body: array of objects:
  - `job_id`, `user_id`, `file_name`, `error_message`, `attempts`, `created_at`

## Internal APIs (`business-service`)

### Books orchestration
Base path: `/internal/business/v1/books`

#### `POST /upload`
- Content type: `multipart/form-data`
- Params:
  - `userId` (query param, required)
  - `provider` (query param, optional)
  - `file` (form file part, required)
- Response body: `BookUploadResponse` (same fields as public upload response).

#### `GET /`
- Query params:
  - `userId` (string, optional)
- Response body: array of `Book`.

#### `POST /{bookId}/search`
- Request body: `BookQueryRequest` (`query`, `limit`, `provider`).
- Response body: `AiSearchResponse`.

#### `POST /{bookId}/chat`
- Request body: `BookQueryRequest`.
- Response body: `AiChatResponse`.

#### `POST /{bookId}/summary`
- Request body: `BookSummaryCommand` (`provider`).
- Response body: `AiSummaryResponse`.

#### `POST /{bookId}/flashcards`
- Request body: `BookFlashcardCommand` (`provider`, `count`).
- Response body: `AiFlashcardResponse`.

#### `GET /{bookId}/summaries`
- Response body: array of `ChapterSummary`.

#### `GET /{bookId}/flashcards`
- Response body: array of `Flashcard`.

#### `GET /{bookId}/chats`
- Response body: array of `ChatHistory`.

## Internal APIs (`ai-service`)

### AI documents API
Base path: `/internal/ai/v1/documents`

Header expectations:
- `X-User-Id` required on all endpoints below.
- `Idempotency-Key` optional on `POST /upload/async`.

#### `POST /upload`
- Content type: `multipart/form-data`
- Form fields:
  - `file` (required)
- Response body (`IngestionResult`):
  - `documentId` (string)
  - `fileName` (string)
  - `chunkCount` (integer)
  - `chunkIds` (array of string)
  - `indexedProviders` (array of string)

#### `POST /upload/async`
- Content type: `multipart/form-data`
- Form fields:
  - `file` (required)
- Response body (`IngestionJobResponse`):
  - `jobId` (string)
  - `fileName` (string)
  - `status` (string; e.g. queued/running/completed/failed)
  - `documentId` (string, nullable while pending)
  - `errorMessage` (string, nullable)

#### `GET /jobs/{jobId}`
- Path params:
  - `jobId` (string, required)
- Response body: `IngestionJobResponse`.

#### `POST /search`
- Request body (`SearchRequest`):
  - `query` (string)
  - `limit` (integer, optional)
  - `provider` (string, optional)
- Response body (`SearchResponse`):
  - `query` (string)
  - `limit` (integer)
  - `provider` (string)
  - `matches` (array of `RetrievedChunk`)
    - `documentId`, `chunkId`, `fileName`, `sectionId`, `title`, `chunkIndex`, `content`, `score`

#### `POST /chat/ask`
- Request body (`ChatAskRequest`):
  - `query` (string)
  - `limit` (integer, optional)
  - `provider` (string, optional)
- Response body (`ChatAskResponse`):
  - `query` (string)
  - `answer` (string)
  - `sources` (array of `SourceReference`)
    - `documentId`, `chunkId`, `fileName`, `sectionId`, `title`, `chunkIndex`, `content`, `score`

#### `POST /summary`
- Request body (`SummaryRequest`):
  - `documentId` (string)
  - `provider` (string, optional)
- Response body (`SummaryResponse`):
  - `documentId` (string)
  - `provider` (string)
  - `summary` (string)

#### `POST /flashcards`
- Request body (`FlashcardRequest`):
  - `documentId` (string)
  - `provider` (string, optional)
  - `count` (integer, optional)
- Response body (`FlashcardResponse`):
  - `documentId` (string)
  - `provider` (string)
  - `flashcards` (array)
    - `question` (string)
    - `answer` (string)

### Error response behavior (`ai-service`)
- Validation/business failures return:
  - status `400` with body `{ "error": "<message>" }`
- Guardrail/rate-limit failures return:
  - status `429` with body `{ "error": "<message>" }`

## Internal APIs (`data-service`)

### Main data API
Base path: `/internal/data/v1`

#### `POST /users`
- Request body (`User`):
  - `id`, `email`, `passwordHash`, `fullName`, `role`, `createdAt`
- Response body: saved `User`.

#### `GET /users`
- Response body: array of `User`.

#### `POST /books`
- Request body (`Book`):
  - `id`, `userId`, `aiDocumentId`, `title`, `status`, `totalChapters`, `format`, `createdAt`
- Response body: saved `Book`.

#### `GET /books?userId=...`
- Query params:
  - `userId` (string, optional)
- Response body: array of `Book`.

#### `GET /books/{bookId}`
- Response body: `Book`.

#### `POST /chapters`
- Request body (`Chapter`):
  - `id`, `bookId`, `chapterNumber`, `title`, `content`, `wordCount`
- Response body: saved `Chapter`.

#### `GET /books/{bookId}/chapters`
- Response body: array of `Chapter`.

#### `POST /summaries`
- Request body (`ChapterSummary`):
  - `id`, `chapterId`, `bookId`, `content`, `model`, `createdAt`
- Response body: saved `ChapterSummary`.

#### `GET /books/{bookId}/summaries`
- Response body: array of `ChapterSummary`.

#### `POST /flashcards`
- Request body (`Flashcard`):
  - `id`, `chapterId`, `bookId`, `userId`, `question`, `answer`, `createdAt`
- Response body: saved `Flashcard`.

#### `GET /books/{bookId}/flashcards`
- Response body: array of `Flashcard`.

#### `POST /chats`
- Request body (`ChatHistory`):
  - `id`, `userId`, `bookId`, `role`, `content`, `timestamp`
- Response body: saved `ChatHistory`.

#### `GET /books/{bookId}/chats`
- Response body: array of `ChatHistory`.

#### `POST /reading-sessions`
- Request body (`ReadingSession`):
  - `id`, `userId`, `bookId`, `chapterId`, `startTime`, `endTime`, `wordsRead`, `wpm`
- Response body: saved `ReadingSession`.

#### `GET /books/{bookId}/reading-sessions`
- Response body: array of `ReadingSession`.

### Relational users API
Base path: `/internal/data/v1/relational/users`

#### `POST /`
- Request body (`UserAccountUpsertRequest`):
  - `email` (string, required, valid email)
  - `passwordHash` (string, required)
  - `fullName` (string, optional)
  - `role` (string, required)
- Response body (`UserAccountEntity`):
  - `id` (number)
  - `email` (string)
  - `passwordHash` (string)
  - `fullName` (string)
  - `role` (string)
  - `createdAt` (datetime)

#### `GET /`
- Response body: array of `UserAccountEntity`.

## Internal APIs (`haystack-service`)

Base path: `/`

#### `GET /health`
- Response body:
  - `status` (string, expected `ok`)

#### `POST /ingest`
- Request body:
  - `provider` (string, required)
  - `chunks` (array, required)
    - `chunk_id`, `document_id`, `file_name`, `section_id`, `title`, `chunk_index`, `content`
  - `embeddings` (array of float arrays, required)
- Response body:
  - `indexed` (integer)

#### `POST /search`
- Request body:
  - `provider` (string, required)
  - `query_embedding` (array of float, required)
  - `limit` (integer, optional, `1..20`, default `5`)
- Response body:
  - `matches` (array)
    - `document_id`, `chunk_id`, `file_name`, `section_id`, `title`, `chunk_index`, `content`, `score`

## Health Endpoints

- `ai-service`: `GET /actuator/health` (port `8080`)
- `data-service`: `GET /actuator/health` (port `8081`)
- `business-service`: `GET /actuator/health` (port `8082`)
- `web-module`: `GET /actuator/health` (port `8083`)
- `haystack-service`: `GET /health` (port `8000`)
