# Performance Testing

## Prerequisites

- backend stack running: `docker compose up --build`
- at least one document uploaded for the test user (for meaningful search/chat responses)
- k6 installed locally: [https://k6.io/docs/get-started/installation/](https://k6.io/docs/get-started/installation/)

## Basic load test

Run from repository root:

```bash
k6 run performance/k6-basic.js
```

Optional tuning:

```bash
BASE_URL=http://localhost:8083 VUS=20 DURATION=60s PROVIDER=gemini TEST_BOOK_ID=<bookId> k6 run performance/k6-basic.js
```

## CI execution

- Workflow: `.github/workflows/k6-performance.yml`
- Scheduled run: every Monday at 02:00 UTC
- Manual run: GitHub Actions -> `k6-performance` -> `Run workflow` (set `vus`, `duration`, `provider`)
- Optional PR run:
  - add label `run-k6` to the PR
  - workflow runs only for PRs with this label
- Artifact:
  - `k6-summary` (contains `summary.json`)

## What this test hits

- `POST /api/v1/auth/login` (or register fallback)
- `POST /api/v1/books/{bookId}/search`
- `POST /api/v1/books/{bookId}/chat`

## Initial target thresholds

- `http_req_failed < 5%`
- `p95 http_req_duration < 1500ms`

## Reporting template

- Fill this after each run: `docs/performance-baseline-template.md`
