# DeepReader Production Deployment Runbook

This runbook is for deploying the current cloud-first DeepReader backend and web stack.

## 1) Prerequisites

- Docker and Docker Compose installed on deployment host.
- Network access from host to:
  - Aiven Kafka
  - Supabase PostgreSQL
  - MongoDB Atlas
  - Upstash Redis
  - Qdrant Cloud
  - Backblaze B2 S3 endpoint
- TLS cert files for Aiven Kafka available in `aiven_connect/`:
  - `service.key`
  - `service.cert`
  - `ca.pem`

## 2) Required Configuration

Create `.env` from `.env.example` and set all required values.

Critical variables:

- AI and RAG:
  - `OPENAI_API_KEY` (optional if only Gemini)
  - `GEMINI_API_KEY`
  - `HAYSTACK_BASE_URL` (default `http://haystack-service:8000`)
  - `QDRANT_URL`, `QDRANT_HOST`, `QDRANT_API_KEY`
- Datastores:
  - `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
  - `RELATIONAL_DATABASE_URL`, `RELATIONAL_DATABASE_USERNAME`, `RELATIONAL_DATABASE_PASSWORD`
  - `DEEPREADER_DATA_MONGODB_URI` (must include DB name)
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_SSL_ENABLED=true`
- Kafka:
  - `KAFKA_BOOTSTRAP_SERVERS`
  - `KAFKA_SECURITY_PROTOCOL=SSL`
  - `KAFKA_SSL_KEY_PATH=/etc/aiven/service.key`
  - `KAFKA_SSL_CERTIFICATE_CHAIN_PATH=/etc/aiven/service.cert`
  - `KAFKA_SSL_CA_CERT_PATH=/etc/aiven/ca.pem`
  - `KAFKA_SSL_KEYSTORE_LOCATION=/etc/aiven/client-keystore.pem`
  - `BOOK_EVENTS_TOPIC=deepreader.book.events`
  - `BOOK_EVENTS_DLQ_TOPIC=deepreader.book.events.dlq`
  - `KAFKA_CAMEL_ROUTE_ENABLED=true`
- Storage:
  - `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`
- Security:
  - `JWT_SECRET` (replace default with strong random secret)
  - `CORS_ALLOWED_ORIGINS` (set production web origin)

## 3) Build and Launch

From repository root:

```powershell
docker compose build
docker compose up -d
```

Check service state:

```powershell
docker compose ps -a
```

Expected running services:
- `haystack-service`
- `ai-service`
- `data-service`
- `business-service`
- `web-module`

## 4) Post-Deploy Verification

### Health checks

```powershell
powershell -Command "(Invoke-RestMethod -Uri 'http://localhost:8000/health' -Method Get) | ConvertTo-Json -Compress"
powershell -Command "(Invoke-RestMethod -Uri 'http://localhost:8080/actuator/health' -Method Get) | ConvertTo-Json -Compress"
powershell -Command "(Invoke-RestMethod -Uri 'http://localhost:8081/actuator/health' -Method Get) | ConvertTo-Json -Compress"
powershell -Command "(Invoke-RestMethod -Uri 'http://localhost:8082/actuator/health' -Method Get) | ConvertTo-Json -Compress"
powershell -Command "(Invoke-RestMethod -Uri 'http://localhost:8083/actuator/health' -Method Get) | ConvertTo-Json -Compress"
```

All services should return status `UP` (or `ok` for Haystack).

### RAG smoke test

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/healthcheck-rag.ps1"
```

Expected:
- Haystack health passed
- Ingest passed
- Search passed
- AI service health passed

### Kafka consumer check

```powershell
docker logs deepreader-business-service --tail 200
```

Expected logs include:
- `Started book-events-audit-route`
- `Subscribed to topic(s) deepreader.book.events`

No `UNKNOWN_TOPIC_OR_PARTITION` and no SSL/key errors.

## 5) Rollback Procedure

If deployment fails after update:

1. Stop updated stack:
   ```powershell
   docker compose down
   ```
2. Restore previous known-good image tags or git revision.
3. Relaunch:
   ```powershell
   docker compose up -d
   ```
4. Re-run health and smoke checks.

## 6) Operational Notes

- Keep `.env` out of version control.
- Rotate any leaked keys immediately.
- Keep `aiven_connect/` out of version control.
- Monitor logs after each deploy:
  ```powershell
  docker compose logs -f ai-service data-service business-service web-module haystack-service
  ```
