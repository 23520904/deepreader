# Performance Baseline Report Template

Use this template after each k6 run (local or CI artifact from `performance/results/summary.json`).

## Run metadata

- Date:
- Environment: (local / CI / staging)
- Git commit SHA:
- Provider: (`gemini` / `openai`)
- k6 config: `VUS=`, `DURATION=`
- Notes:

## Summary metrics

| Metric | Value | Target | Pass/Fail |
|---|---:|---:|---|
| Total requests |  | n/a | n/a |
| Error rate (`http_req_failed`) |  | `< 5%` |  |
| p50 latency (`http_req_duration`) |  | informational |  |
| p95 latency (`http_req_duration`) |  | `< 1500ms` |  |
| p99 latency (`http_req_duration`) |  | informational |  |
| Request throughput (`http_reqs`) |  | informational |  |

## Endpoint-level observations

| Endpoint | Status trend | Latency trend | Notes |
|---|---|---|---|
| `/api/v1/auth/login` |  |  |  |
| `/api/v1/books/{bookId}/search` |  |  |  |
| `/api/v1/books/{bookId}/chat` |  |  |  |

## Regressions / anomalies

- Regression detected: (yes/no)
- Compared against baseline run: (link/commit/date)
- Suspected cause:
- Follow-up ticket:

## Action items

- [ ] 
- [ ] 
- [ ] 
