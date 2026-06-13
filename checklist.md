# DeepReader — Code Audit Checklist

Generated: 2026-06-14

---

## ✅ Docker — Fixed

- [x] **`.dockerignore` created** — Excludes `.git`, `**/target`, `frontend/node_modules`, `frontend/.next`, `.env*`, `aiven_connect`, and OS noise. Prevents hundreds of MB of unneeded files from being sent as build context on every build.

- [x] **All Java Dockerfiles: added `# syntax=docker/dockerfile:1.7` header** — Enables BuildKit features (cache mounts) required by the `--mount=type=cache` instructions. (`web-module`, `business-service`, `data-service` Dockerfiles)

- [x] **All Java Dockerfiles: Maven dependency cache mount added** — `RUN --mount=type=cache,target=/root/.m2 mvn ... dependency:go-offline` and the package step now reuse the Maven local repo across builds instead of re-downloading all dependencies every time. (`web-module`, `business-service`, `data-service` Dockerfiles)

- [x] **All Java Dockerfiles: run as non-root user** — Added `RUN addgroup --system app && adduser --system --ingroup app app` + `USER app` in the runtime stage. Services no longer run as root inside the container.

- [x] **All Java Dockerfiles: JVM respects container memory limit** — Added `-XX:MaxRAMPercentage=75.0` to every `ENTRYPOINT`. The JVM now caps its heap at 75% of the cgroup memory limit instead of defaulting to 25% of total host RAM.

- [x] **`web-module/Dockerfile`: removed unnecessary `business-service/src` copy** — web-module is a self-contained HTTP gateway; it has no compiled dependency on business-service source. Removing the copy reduces build context and prevents spurious cache invalidation when business-service changes.

- [x] **`business-service/Dockerfile`: fixed hardcoded JAR filename** — Changed `COPY .../business-service-0.0.1-SNAPSHOT-exec.jar` to `COPY .../*-exec.jar`. The build no longer breaks when the version string is bumped.

- [x] **`haystack-service/Dockerfile`: added non-root user** — Python uvicorn process now runs as a system `app` user, not root.

- [x] **`haystack-service/Dockerfile`: added `HEALTHCHECK`** — `CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"` with 15 s interval / 5 retries. Docker and compose can now report the container as healthy before dependent services start connecting.

---

## ⚠️ Docker — Still To Do (docker-compose.yml)

- [ ] **Insecure credential defaults** — `POSTGRES_PASSWORD`, `DATABASE_PASSWORD`, `APP_ADMIN_PASSWORD:-admin12345`, and `JWT_SECRET:-dev-change-me-...` are hardcoded fallbacks that silently work in production if env vars are not set. Remove defaults for all secrets and require explicit values.

- [ ] **MongoDB has no authentication** — No `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` set. Any process that can reach port 27017 has full admin access.

- [ ] **Redis has no password** — `redis` `command` only enables AOF; no `--requirepass`. Add `--requirepass ${REDIS_PASSWORD}` and propagate `REDIS_PASSWORD` to all service definitions.

- [ ] **Infrastructure ports bound to `0.0.0.0`** — `postgres:5432`, `mongodb:27017`, `redis:6379`, `qdrant:6333/6334` are reachable from any interface on the host. Prefix with `127.0.0.1:` or remove host `ports:` entirely for services that only need to be on the internal Docker network.

- [ ] **`qdrant` uses `latest` tag** — `image: qdrant/qdrant:latest` pulls a different version on each fresh build. Pin to a specific version (e.g. `v1.9.2`).

- [ ] **`qdrant` and `haystack-service` have no healthchecks in compose** — Dependents use `condition: service_started` so they may connect before these services are ready. Add a `healthcheck` block to both (Qdrant exposes `GET /healthz`) and change dependents to `condition: service_healthy`.

- [ ] **Java services have no healthchecks in compose** — `business-service` depends on `ai-service` and `data-service` with `service_started`. JVM startup takes 10–20 s. Add a `healthcheck` using Spring Actuator `/actuator/health` for each Java service.

- [ ] **Duplicate SMTP env vars** — Both `SMTP_USER`/`SMTP_PASS` and `SMTP_USERNAME`/`SMTP_PASSWORD` exist, the latter falling back to the former. Remove one pair and standardise to `SMTP_USERNAME`/`SMTP_PASSWORD`.

- [ ] **No network isolation** — All services share the default bridge. Define named networks (e.g. `frontend`, `backend`, `infra`) and assign each service to only the networks it needs.

- [ ] **`aiven_connect` bind-mount is a silent failure risk** — If `./aiven_connect` doesn't exist Docker creates an empty dir, giving Kafka SSL paths that point to nothing. Gate the volume behind a Docker Compose profile or document the required directory structure.

---

## 🔴 Critical Security Issues

- [ ] **LLM API token stored in plaintext** — `app_users.llm_api_token` is stored unencrypted in the database. If the DB is compromised, all users' Groq/Gemini keys are exposed. Encrypt the column at rest or use a secrets vault. (`LlmClientService.java:230`, `UserAccountService.java:225`)

- [ ] **Auth tokens stored in localStorage** — `authSession.ts:20` saves both the JWT access token and the refresh token to `localStorage`. Any XSS vulnerability in the app lets an attacker steal both tokens and hijack sessions indefinitely. Use `httpOnly` cookies for the refresh token instead.

- [ ] **Brute-force on auth endpoint is under-throttled** — `RateLimitWebFilter` (web-module) sets `authMaxRequestsPerMinute` to **600** (default), allowing up to 10 login attempts per second per user+IP pair. This effectively allows a brute-force attack on passwords. Reduce to ~10–20 req/min for auth paths. (`web-module/.../RateLimitWebFilter.java:31`)

- [ ] **User enumeration via forgot-password** — `AuthController.forgotPassword()` throws `"Email is not registered"` when the email is unknown, leaking whether an account exists. Return the same success message regardless and silently skip the OTP send. (`AuthController.java:143`)

- [ ] **Actuator endpoints are publicly accessible** — `AuthWebFilter.isPublicPath()` allows `/actuator/**` without any authentication. Spring Actuator can expose environment variables, health details, beans, and metrics. Restrict to internal networks or require admin auth. (`AuthWebFilter.java:92`)

- [ ] **JWT secret has no minimum-length enforcement** — `JwtService.signingKey()` calls `secret.getBytes(UTF_8)` with no validation. A short secret (e.g. `"secret"`) makes HMAC-SHA256 trivially brute-forceable. Enforce a minimum of 32 bytes in `JwtProperties`. (`JwtService.java:74`)

---

## 🟠 Medium Security Issues

- [ ] **In-memory rate limit counter never evicts old entries (memory leak)** — `RateLimitWebFilter` (ai-service) uses `ConcurrentHashMap<String, WindowCounter>` as a Redis fallback. Old per-minute keys are never removed, so the map grows indefinitely under load. Add a scheduled eviction or use a bounded cache. (`ai-service/.../RateLimitWebFilter.java:34`)

- [ ] **Indirect prompt injection from document content** — `PromptBuilderService.buildAnswerPrompt()` embeds raw document chunk content directly into LLM prompts without sanitisation. A malicious document could contain adversarial instructions that alter the LLM's behaviour. Consider wrapping chunk content with structural delimiters and instructing the model to treat it as data only. (`PromptBuilderService.java:56–68`)

- [ ] **File upload validates only extension, not content type** — `DocumentIngestionService.validateUpload()` checks `.pdf`/`.epub` by filename only. A malicious file with a `.pdf` extension but different content passes validation. Add magic-byte/MIME detection after reading the bytes. (`DocumentIngestionService.java:230–237`)

- [ ] **Admin rate-limit exemption is overly broad** — `RateLimitWebFilter` (web-module) skips all `/api/v1/admin/**` paths. A compromised admin token could be used to flood admin queries with no throttling. Apply a separate (lower) admin limit. (`web-module/.../RateLimitWebFilter.java:54`)

- [ ] **GuardrailService has a TOCTOU race condition** — `enforceDailyLimit()` does an UPSERT then a separate SELECT to check the value. Under concurrent requests, the counter can be slightly exceeded before the guard triggers. Use a single atomic SQL expression (e.g. `RETURNING value`) to eliminate the gap. (`GuardrailService.java:30–46`)

- [ ] **SQL concatenation in `queryUserRecords`** — `UserAccountService.queryUserRecords(String whereClause, ...)` appends a `whereClause` string directly into the SQL query. Current callers pass only hardcoded strings, but this pattern is unsafe for future callers. Refactor to avoid the dynamic-SQL approach. (`UserAccountService.java:434`)

---

## 🟡 RAG Pipeline Issues

- [ ] **Chat always uses lexical search — vector search is never called for `/chat/ask`** — `ChatService.ask()` calls `retrievalService.searchLexical()` unconditionally, bypassing vector/semantic search entirely. The `RetrievalService.search()` method (which runs vector-first with lexical fallback) is never invoked from the chat path. This defeats the purpose of embedding the document. Switch to `retrievalService.search()` and pass the provider. (`ChatService.java:108–111`)

- [ ] **`provider` parameter in `ChatService.ask()` is silently ignored** — The 5-argument `ask()` method accepts a `provider` parameter but never uses it. The caller in `DocumentIngestionController` passes `request.provider()`, creating a false impression that provider selection works in chat. (`ChatService.java:107`)

- [ ] **Answer repair prompt does not include source context** — `buildAnswerRepairPrompt()` only receives the previous bad answer, not the original document chunks. If the LLM fails to format its JSON, the repair call has no grounding context and may produce a hallucinated or confidently wrong structured answer. Pass the original context (or a condensed version) to the repair prompt. (`PromptBuilderService.java:74–81`, `ChatService.java:135`)

- [ ] **`doLexicalSearch` returns `VECTOR_PROVIDER` as the search provider in the response** — `RetrievalService.doLexicalSearch()` builds `new SearchResponse(query, limit, VECTOR_PROVIDER, lexicalMatches)`, misrepresenting lexical results as coming from the vector provider. This misleads any consumer checking the provider field. (`RetrievalService.java:126`)

- [ ] **Context window constants are hard-coded and Java-specific** — `ChatService` hard-codes `GROQ_MAX_CONTEXT_CHARS = 12_000` and `GROQ_MAX_CHUNK_CHARS = 1_100`. `importantChatTermWeight()` hard-codes Java/OOP terms (`"oop"`, `"java"`, `"class"`, etc.), biasing retrieval scores toward Java documents. These should be configurable or domain-agnostic. (`ChatService.java:47–52`, `295–301`)

- [ ] **Same bias exists in `RetrievalService.importantQueryTokenWeight()`** — Hard-coded Java/OOP terms get 2× weight in lexical scoring, creating poor results for non-Java documents. (`RetrievalService.java:347–353`)

---

## 🔵 Redundant / Dead Code

- [ ] **`VectorlessPromptBuilderService.java` is effectively empty** — The file exists (1 line) and is presumably a placeholder with no implementation. Either implement it or remove it to avoid confusion.

- [ ] **`ChatService.ask(userId, query, limit)` 3-arg overload is redundant** — It only calls the 5-arg version with `null` for `documentId` and `provider`. No logic difference. Consolidate into one method with defaults. (`ChatService.java:97–99`)

- [ ] **`GenerationService.createFlashcards(4-arg)` overload is redundant** — Immediately delegates to the 6-arg version with hardcoded `"en"`, `"mixed"`, `"all"`. Remove the overload and update call sites to pass explicit defaults. (`GenerationService.java:109–111`)

- [ ] **`GenerationService.filterStudyFlashcards(2-arg)` and `parseFlashcards(2-arg)` are redundant** — Both delegate to their 3-arg counterparts with hardcoded `"en"`. These exist as package-private test helpers but leak the internal `language` default. (`GenerationService.java:265–267`, `709–711`)

- [ ] **`PromptBuilderService.buildAnswerPrompt(2-arg)` overload is unused in the actual chat flow** — `ChatService` always calls the 4-arg version with explicit limits. The default 2-arg version has a larger `DEFAULT_ANSWER_CONTEXT_CHARS` (18,000) than what the chat service actually wants (12,000), which would over-send context if someone accidentally calls the wrong overload. (`PromptBuilderService.java:20–22`)

- [ ] **`RetrievalService.search(5-arg)` / `searchLexical(4-arg)` code duplication** — Both `doSearch` and `doLexicalSearch` duplicate the document-loading and empty-check logic. Extract the shared setup into a private helper. (`RetrievalService.java:86–127`)

- [ ] **`GenerationService.addFlashcard(5-arg)` private default overload** — The private 5-arg version only wraps the 6-arg version with `"en"`. Not externally visible but adds noise to an already large file. (`GenerationService.java:859–861`)

---

## ⚪ Code Quality / Correctness

- [ ] **Password minimum-length validation is too weak** — `validatePassword()` only requires ≥8 characters with no complexity rules (no uppercase, digit, or symbol requirement). Consider stricter defaults or at least a configurable policy. (`UserAccountService.java:472–475`)

- [ ] **4-digit OTP has a small entropy space** — 10,000 possible codes with `maxAttempts=5` means ~0.05% per-attempt success probability. While the lockout mitigates this, a 6-digit OTP would be significantly stronger at negligible UX cost. (`EmailOtpService.java:103`)

- [ ] **`EmailOtpService.ensureTable()` runs DDL on every first request** — The lazy DDL approach (instead of Flyway/Liquibase migrations) means the table schema can silently diverge from what the code expects if already created by an earlier version. Use proper schema migrations. (`EmailOtpService.java:225–248`, `UserAccountService.java:395–426`)

- [ ] **`ensureProfileColumns()` adds columns via DDL at runtime** — Same anti-pattern: `ALTER TABLE ADD COLUMN IF NOT EXISTS` is executed on every service startup (once per process). This is a migration concern that belongs in a versioned schema migration tool, not application code. (`UserAccountService.java:395–426`)

- [ ] **`RetrievalService.vectorSearch()` null-checks `embeddingService`** — `embeddingService` is a constructor-injected Spring bean and can never be null at runtime. The null check (`if (embeddingService == null)`) is dead code. (`RetrievalService.java:134`)

- [ ] **`ChatService` uses a non-thread-safe `ObjectMapper` instance** — `ObjectMapper objectMapper = new ObjectMapper()` is created as a field initialiser. `ObjectMapper` itself is thread-safe after configuration, so this is fine — but it bypasses Spring's shared/configured `ObjectMapper` bean, meaning any custom serialisation settings won't apply. Inject the Spring-managed bean instead. (`ChatService.java:77`)

- [ ] **Error messages from `IllegalStateException` are surfaced directly to clients** — `DocumentIngestionController.handleBadRequest()` maps `IllegalStateException` to HTTP 400 and returns `ex.getMessage()` verbatim. Messages like `"Groq and Gemini generation failed. groq: Missing required property..."` leak internal provider configuration details. Sanitise error messages before returning them. (`DocumentIngestionController.java:303–308`)

- [ ] **`AuditLogService.log()` in `AuthController.resetPassword()` passes `null` as userId** — `auditLogService.log(null, "AUTH_PASSWORD_RESET", "email=" + request.email())` logs the email in plain text in `details`. If audit logs are ever inspected, this creates a PII exposure vector. Use a masked/hashed email in the details. (`AuthController.java:162`)

- [ ] **Tokens passed in URL fragment after Google OAuth** — `redirectToGoogleCallbackSuccess` places the JWT access token and refresh token in the URL hash fragment. While fragments are not sent to servers, they appear in browser history and can be read by any JS on the callback page (including third-party scripts). Consider a server-side session cookie exchange instead. (`AuthController.java:278–288`)
