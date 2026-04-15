# DeepReader MVP Scope

## Mandatory features
- User register/login/refresh/revoke
- Upload book (PDF/EPUB)
- Search and chat with uploaded book
- Book summary and flashcards generation
- Learning history (chat/summaries/flashcards)

## Non-functional targets
- API p95 latency: under 1500ms for non-LLM endpoints
- Max upload file size: 25MB (`INGESTION_MAX_FILE_SIZE_BYTES`)
- Free-plan quota defaults:
  - `GUARDRAILS_MAX_LLM_REQUESTS_PER_DAY=500`
  - `GUARDRAILS_MAX_UPLOADS_PER_DAY=100`

## Definition of Done
- API endpoints stable and documented in OpenAPI
- All services compile and run in Docker Compose
- Prometheus + Grafana dashboards available
- Backup and restore runbook documented
- Public demo URL deployed from free cloud tier
