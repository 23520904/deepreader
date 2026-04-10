# Local Dev Runbook

## Start backend stack

From repository root:

1. Copy `.env.example` to `.env`
2. Set at least one LLM key:
   - `OPENAI_API_KEY=...` or `GEMINI_API_KEY=...`
3. Run:
   - `docker compose up --build`

Services after startup:
- API: `http://localhost:8080`
- Qdrant HTTP: `http://localhost:6333`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

Versioned API:
- Preferred: `/api/v1/...`
- Legacy `/api/...` still works but is deprecated.

## API smoke tests (PowerShell)

Register and capture token:

```bash
$AUTH = curl -X POST "http://localhost:8080/api/auth/register" `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"

$TOKEN = ($AUTH | ConvertFrom-Json).token
$REFRESH = ($AUTH | ConvertFrom-Json).refreshToken
$HEADERS = @{"Authorization"="Bearer $TOKEN"}
```

Refresh access token:

```bash
curl -X POST "http://localhost:8080/api/v1/auth/refresh" `
  -H "Content-Type: application/json" `
  -d "{\"refreshToken\":\"$REFRESH\"}"
```

Upload:

```bash
curl -X POST "http://localhost:8080/api/documents/upload" `
  -H "Authorization: Bearer $TOKEN" `
  -F "file=@C:/tmp/book.pdf"
```

Set variables:

```bash
$DOC_ID="<paste-document-id>"
$PROVIDER="gemini"   # or "openai"
```

Search:

```bash
curl -X POST "http://localhost:8080/api/documents/search" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"main argument of chapter 1\",\"limit\":5,\"provider\":\"$PROVIDER\"}"
```

Chat ask:

```bash
curl -X POST "http://localhost:8080/api/documents/chat/ask" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"What are the key ideas?\",\"limit\":5,\"provider\":\"$PROVIDER\"}"
```

Summary:

```bash
curl -X POST "http://localhost:8080/api/documents/summary" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"documentId\":\"$DOC_ID\",\"provider\":\"$PROVIDER\"}"
```

Flashcards:

```bash
curl -X POST "http://localhost:8080/api/documents/flashcards" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"documentId\":\"$DOC_ID\",\"provider\":\"$PROVIDER\",\"count\":10}"
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
