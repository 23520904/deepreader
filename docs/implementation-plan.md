# DeepReader Implementation Plan

## Implemented in this cleanup
- reduce the active Maven build to the backend service that matters now
- remove unsupported model integrations so only OpenAI and Gemini remain
- keep the backend deployable for a website-oriented cloud setup
- support PDF and EPUB ingestion
- create dual-provider vector indexing so users can choose either provider later
- expose REST APIs for upload, semantic search, chat, summary, and flashcards
- persist indexed document metadata in PostgreSQL instead of in-memory storage
- remove hardcoded secret defaults from service configuration
- add JWT auth endpoints and per-user document isolation
- add async ingestion jobs with status polling endpoint
- add OpenAPI documentation and actuator health/readiness endpoints
- add request-id propagation and basic per-user rate limiting
- add integration tests that cover upload/search/chat/summary/flashcards flows
- add Flyway migrations and versioned schema evolution baseline
- add S3-compatible object storage integration for uploaded source files
- add GitHub Actions CI workflow with lint/test/package stages
- add basic k6 load-test script and performance test documentation
- add refresh token session management and token rotation endpoints
- add durable DB-backed ingestion queue worker with retries/dead-letter support
- add RBAC foundations (USER/ADMIN role model and admin-only operational endpoints)
- add API governance with `/api/v1` canonical paths and deprecation headers on legacy routes
- add operational hardening controls (daily quotas, abuse guardrails, runbooks)

## Intentionally deferred
- auth and user accounts
- reading progress analytics
- compare-multiple-books workflow
- separate gateway/business/data services with production persistence boundaries
- frontend website code

## Why this phased approach
This gives you a cleaner, deployable backend foundation first. After this, the project can be split further into more microservices once the website-facing API contract is stable.