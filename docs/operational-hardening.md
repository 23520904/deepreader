# Operational Hardening Guide

## Cost controls

- Set conservative limits in `.env`:
  - `GUARDRAILS_MAX_LLM_REQUESTS_PER_DAY`
  - `GUARDRAILS_MAX_UPLOADS_PER_DAY`
- Prefer `gemini` for lower-cost defaults unless quality requires higher-tier models.
- Track request volume and p95 latency from Prometheus.

## Abuse protections

- JWT auth required for document APIs.
- Redis-backed rate limiting active for `/api/documents` and `/api/v1/documents`.
- Daily quotas enforced via `usage_counters`.

## Token/session security

- Short-lived access token via JWT.
- Rotating refresh token sessions via `auth_sessions`.
- Revoke refresh token on logout.

## Queue reliability

- Async jobs are durable in `ingestion_jobs`.
- Worker polls pending jobs and retries up to `INGESTION_MAX_RETRIES`.
- Terminal failures are moved to dead-letter table `ingestion_job_dead_letters`.
