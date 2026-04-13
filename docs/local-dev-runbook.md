# Local Dev Runbook

## Start backend stack

From repository root:

1. Copy `.env.example` to `.env`
2. Set at least one LLM key:
   - `OPENAI_API_KEY=...` or `GEMINI_API_KEY=...`
3. Run:
   - `docker compose up --build`

Services after startup:
- Public API gateway: `http://localhost:8083`
- Internal AI service: `http://localhost:8080` (not exposed in production)
- Qdrant HTTP: `http://localhost:6333`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

Versioned API:
- Public: `/api/v1/...` (via `web-module`)
- Internal-only: `/internal/{service}/v1/...` (service-to-service)

## API smoke tests (PowerShell)

Register and capture token:

```bash
$AUTH = curl -X POST "http://localhost:8083/api/v1/auth/register" `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"

$TOKEN = ($AUTH | ConvertFrom-Json).token
$REFRESH = ($AUTH | ConvertFrom-Json).refreshToken
$HEADERS = @{"Authorization"="Bearer $TOKEN"}
```

Refresh access token:

```bash
curl -X POST "http://localhost:8083/api/v1/auth/refresh" `
  -H "Content-Type: application/json" `
  -d "{\"refreshToken\":\"$REFRESH\"}"
```

Upload:

```bash
curl -X POST "http://localhost:8083/api/v1/books/upload" `
  -F "userId=test-user" `
  -F "provider=gemini" `
  -F "file=@C:/tmp/book.pdf"
```

Set variables:

```bash
$BOOK_ID="<paste-book-id>"
$PROVIDER="gemini"   # or "openai"
```

Search:

```bash
curl -X POST "http://localhost:8083/api/v1/books/$BOOK_ID/search" `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"main argument of chapter 1\",\"limit\":5,\"provider\":\"$PROVIDER\"}"
```

Chat ask:

```bash
curl -X POST "http://localhost:8083/api/v1/books/$BOOK_ID/chat" `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"What are the key ideas?\",\"limit\":5,\"provider\":\"$PROVIDER\"}"
```

Summary:

```bash
curl -X POST "http://localhost:8083/api/v1/books/$BOOK_ID/summary" `
  -H "Content-Type: application/json" `
  -d "{\"provider\":\"$PROVIDER\"}"
```

Flashcards:

```bash
curl -X POST "http://localhost:8083/api/v1/books/$BOOK_ID/flashcards" `
  -H "Content-Type: application/json" `
  -d "{\"provider\":\"$PROVIDER\",\"count\":10}"
```

## CI and performance

- CI workflow file: `.github/workflows/ai-service-ci.yml`
- k6 script: `performance/k6-basic.js`
- k6 instructions: `docs/performance-testing.md`
- k6 CI workflow: `.github/workflows/k6-performance.yml`
- baseline template: `docs/performance-baseline-template.md`
- API version policy: `docs/api-versioning-policy.md`
- backup/restore runbook: `docs/runbook-backup-restore.md`
- operational hardening guide: `docs/operational-hardening.md`
