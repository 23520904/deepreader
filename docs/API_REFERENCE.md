# DeepReader API Reference

This document lists the current HTTP APIs in the repository, grouped by service and intended audience.

## Public APIs (`web-module`)

### Auth API
Base path: `/api/v1/auth`

- `POST /register`  
  Register a new account.
- `POST /login`  
  Authenticate and issue tokens/session credentials.
- `POST /refresh`  
  Refresh access token/session.
- `POST /logout`  
  Logout current session.
- `POST /revoke`  
  Revoke token/session.

### Books API
Base path: `/api/v1/books`

- `POST /upload`  
  Upload a PDF/EPUB for ingestion.
- `GET /`  
  List books for the current user.
- `POST /{bookId}/search`  
  Search relevant content in a book.
- `POST /{bookId}/chat`  
  Ask grounded questions over a book.
- `POST /{bookId}/summary`  
  Generate a book summary.
- `POST /{bookId}/flashcards`  
  Generate flashcards.
- `GET /{bookId}/summaries`  
  List generated summaries.
- `GET /{bookId}/flashcards`  
  List generated flashcards.
- `GET /{bookId}/chats`  
  List chat history.

### Admin API
Base path: `/api/v1/admin`

- `GET /audit-logs`  
  Retrieve audit logs.
- `GET /dead-letters`  
  Retrieve dead-letter items.

## Internal APIs (`business-service`)

### Books orchestration
Base path: `/internal/business/v1/books`

- `POST /upload`  
  Orchestrate upload + ingestion workflow.
- `GET /`  
  List books from orchestrated data flow.
- `POST /{bookId}/search`  
  Orchestrate search flow.
- `POST /{bookId}/chat`  
  Orchestrate chat flow.
- `POST /{bookId}/summary`  
  Orchestrate summary generation and persistence.
- `POST /{bookId}/flashcards`  
  Orchestrate flashcard generation and persistence.
- `GET /{bookId}/summaries`  
  Read summaries.
- `GET /{bookId}/flashcards`  
  Read flashcards.
- `GET /{bookId}/chats`  
  Read chat history.

## Internal APIs (`ai-service`)

### AI documents API
Base path: `/internal/ai/v1/documents`

- `POST /upload`  
  Synchronous ingestion.
- `POST /upload/async`  
  Asynchronous ingestion job creation.
- `GET /jobs/{jobId}`  
  Retrieve async ingestion job status.
- `POST /search`  
  Retrieval endpoint for chunks.
- `POST /chat/ask`  
  Grounded chat answer generation.
- `POST /summary`  
  Summary generation.
- `POST /flashcards`  
  Flashcard generation.

## Internal APIs (`data-service`)

### Main data API
Base path: `/internal/data/v1`

- `POST /users`, `GET /users`
- `POST /books`, `GET /books`, `GET /books/{bookId}`
- `POST /chapters`, `GET /books/{bookId}/chapters`
- `POST /summaries`, `GET /books/{bookId}/summaries`
- `POST /flashcards`, `GET /books/{bookId}/flashcards`
- `POST /chats`, `GET /books/{bookId}/chats`
- `POST /reading-sessions`, `GET /books/{bookId}/reading-sessions`

### Relational users API
Base path: `/internal/data/v1/relational/users`

- `POST /`  
  Create relational user account record.
- `GET /`  
  List relational user account records.

## Health Endpoints

- `ai-service`: `GET /actuator/health` (port `8080`)
- `data-service`: `GET /actuator/health` (port `8081`)
- `business-service`: `GET /actuator/health` (port `8082`)
- `web-module`: `GET /actuator/health` (port `8083`)
- `haystack-service`: `GET /health` (port `8000`)
