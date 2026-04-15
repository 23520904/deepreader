# Dependency Cleanup Report

## Scope
This report summarizes dependency inventory, cleanup actions, and evidence-based decisions for `core`, `ai-service`, `business-service`, `data-service`, and `web-module`.

Artifacts generated:
- `docs/dependency-inventory/*-dep-tree.txt`
- `docs/dependency-inventory/*-dep-analyze.txt`
- `docs/dependency-inventory/*-updates.txt`
- `effective-pom.xml`

## Dependency actions completed

### Removed
- `web-module/pom.xml`
  - `org.flywaydb:flyway-core`
  - `org.flywaydb:flyway-database-postgresql`
  - unused test dependencies (`spring-boot-starter-test`, `reactor-test`, `spring-security-test`)
  - `spring-boot-configuration-processor`
- `business-service/pom.xml`
  - unused test dependencies (`spring-boot-starter-test`, `reactor-test`)
- `data-service/pom.xml`
  - unused test dependencies (`spring-boot-starter-test`, `reactor-test`)

### Kept with explicit reason
- `ai-service/pom.xml`
  - `com.google.guava:guava`
  - `com.google.protobuf:protobuf-java`
  - Reason: removing them caused compile failures from `QdrantVectorStoreService` due to required classes (`ListenableFuture`, protobuf message classes). Marked as `required-transitive`.

## Package/class evidence

### `io.jsonwebtoken.*`
- Active usage found in `web-module/src/main/java/com/deepreader/web_module/service/JwtService.java`.
- Action: migrated JWT implementation to JJWT APIs, dependency is now directly used.

### `org.flywaydb.*`
- No direct imports in `web-module` and migration disabled there; Flyway deps removed from `web-module`.
- Flyway remains in modules where database migration is active.

### `org.springframework.data.redis.*`
- Usage found in:
  - `web-module/src/main/java/com/deepreader/web_module/config/RateLimitWebFilter.java`
  - `ai-service/src/main/java/com/deepreader/ai_service/config/web/RateLimitWebFilter.java`
- Action: `web-module` rate-limit moved from in-memory map to Redis-backed reactive counter.

### `io.grpc.*`, `com.google.protobuf.*`, `com.google.common.*`
- No direct import usage in app classes, but compile-time dependency required by Qdrant client integration.
- Action: keep in `ai-service`; labeled `required-transitive`.

## Direct-used / direct-unused / test-only / runtime-only summary

### core
- direct-used: current set
- direct-unused: none detected by analyze
- test-only: none
- runtime-only: none

### ai-service
- direct-used: spring starters, qdrant client, aws s3, pdf/epub, postgres runtime
- test-only: `spring-boot-starter-test`
- runtime-only: `postgresql`
- required-transitive: `guava`, `protobuf-java`

### business-service
- direct-used: webflux, actuator, micrometer, kafka, camel starters, validation, core
- test-only: none (removed)
- runtime-only: none

### data-service
- direct-used: mongodb reactive, jpa, flyway, webflux, validation, actuator, micrometer, core
- test-only: none (removed)
- runtime-only: `postgresql`

### web-module
- direct-used: webflux, security, validation, jdbc, redis, actuator, springdoc, jwt, postgres runtime, core, business-service
- direct-unused removed: flyway, extra test deps
- test-only: none (removed)
- runtime-only: `postgresql`, `jjwt-impl`, `jjwt-jackson`

## Build quality hardening applied
- Added Maven Enforcer to all modules with:
  - `dependencyConvergence`
  - `requireReleaseDeps` (allowing `com.deepreader:*` snapshots)
- Switched Enforcer to **fail mode** (`<fail>true</fail>`) for all modules.
- Added targeted convergence whitelist for known transitive conflicts:
  - `ai-service`: `com.google.protobuf:protobuf-java`, `com.google.guava:guava`, `com.google.errorprone:error_prone_annotations`, `commons-logging:commons-logging`
  - `business-service`, `web-module`: `at.yawk.lz4:lz4-java`
- Added CI workflow:
  - `.github/workflows/dependency-hygiene.yml`
  - Runs `dependency:analyze` per module and fails if `Unused declared dependencies found`.

## Backend gap fixed during smoke setup
- `business-service` published artifact was previously replaced by Spring Boot fat jar, causing downstream runtime class loading failures in `web-module` (`NoClassDefFoundError` for business DTOs).
- Action: configured `spring-boot-maven-plugin` with `<classifier>exec</classifier>` in `business-service/pom.xml`.
- Result: normal jar remains consumable as dependency while executable fat jar is attached as `-exec`.

## Verification
- `mvn -DskipTests compile` passed after cleanup iterations.
- `mvn test` passed with remaining useful test (`IngestionJobServiceTest`).
- After Enforcer fail-mode switch and whitelist setup:
  - `mvn -DskipTests compile` passed (total ~28s)
  - `mvn test` passed (total ~49s)

## Local performance smoke (backend)
- Command:
  - `docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run --summary-export docs/dependency-inventory/k6-smoke-summary.json -e BASE_URL=http://host.docker.internal:8083 performance/k6-basic.js`
- Preconditions used:
  - `web-module` started locally from source with environment loaded from `.env`
  - infra containers started for local dependencies where applicable
- Script hardening:
  - Updated `performance/k6-basic.js` to avoid crashing on non-JSON auth responses and safely skip iteration when token retrieval fails.
- Result snapshot (30s, 10 VUs):
  - `http_reqs`: 318
  - `http_req_duration p95`: ~935.7 ms (latency threshold target met)
  - `http_req_failed`: ~62.26% (failure-rate threshold not met)
  - `auth success`: 120 pass / 99 fail
- Artifacts:
  - `docs/dependency-inventory/k6-smoke-summary.json`

## Auth fail-rate root cause and fix
- Root cause: `RateLimitWebFilter` was applying the same low anonymous rate limit to `/api/v1/auth/**` traffic. Under smoke load, auth calls were throttled (`429`) and surfaced as auth failures.
- Backend fix:
  - Added dedicated auth limit in `RateLimitWebFilter` with route-aware limit selection.
  - New config key in `web-module`:
    - `deepreader.rate-limit.auth-requests-per-minute=${RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE:600}`
- Post-fix k6 evidence:
  - First post-fix run (`docs/dependency-inventory/k6-smoke-summary-postfix.json`):
    - `http_req_failed`: `0.00%` (pass)
    - `http_req_duration p95`: `~5.33s` (fail; warmup outlier)
  - Warm run (`docs/dependency-inventory/k6-smoke-summary-postfix-warm.json`):
    - `http_req_failed`: `0.00%` (pass)
    - `http_req_duration p95`: `~577.5ms` (pass)
    - `checks_failed`: `0`

## Remaining follow-ups
- Measure artifact size / build-time deltas in CI and append to this report.
- Apply selected dependency minor/patch upgrades from update reports in a separate PR.
- Add long-run (>=10 min) load profile to validate stability beyond smoke window.

## k6 warmup strategy (CI)
- `performance/k6-basic.js` now runs 2 scenarios:
  - `warmup`: pre-heats auth/db/cache paths
  - `main`: measured traffic used for SLO thresholds
- Thresholds now target only measured phase tags:
  - `http_req_failed{phase:main} < 5%`
  - `http_req_duration{phase:main} p95 < 1500ms`
- CI workflow update in `.github/workflows/k6-performance.yml`:
  - Added `warmup_duration` workflow input (default `15s`)
  - Exposed `WARMUP_DURATION` and `WARMUP_VUS` env vars for k6 runtime
- Outcome:
  - Reduces cold-start outlier noise
  - Makes k6 gate reflect steady-state backend behavior more reliably

## Additional backend hardening completed
- Docker multi-module build reliability:
  - Updated module Dockerfiles (`data-service`, `business-service`, `web-module`) to copy all sibling module `pom.xml` files required by the parent reactor.
  - Verified with `docker compose build ai-service data-service business-service web-module` (all images built successfully).
- Auth API integration safety net:
  - Added `web-module` test dependency: `spring-boot-starter-test` (test scope).
  - Added `AuthControllerWebFluxTest` covering:
    - successful register contract
    - invalid login payload returns `400`
  - Verified with `mvn -pl web-module test` and full `mvn test`.
