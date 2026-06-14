# RAG Pipeline Health Checklist

> Audited via GitNexus (3,992 nodes, 8,754 edges, 300 flows) — 2026-06-14

## Pipeline Map

```
Upload
  └─ DocumentIngestionController.uploadDocument
       └─ DocumentIngestionService.ingestBytes
            ├─ TextExtractionService.extractSections       (PDF / EPUB)
            ├─ ObjectStorageService.storeDocument
            ├─ DocumentIndexStoreService.save              (metadata)
            ├─ ChunkingService.chunkDocument
            ├─ EmbeddingService.embedAll                   (Gemini)
            └─ Haystack POST /ingest  ✓ verified

Search
  └─ RetrievalService.search
       ├─ EmbeddingService.embed → Haystack POST /search   (vector-first) ✓ verified
       └─ lexicalFallback                                  (if vector empty/fails)

Chat
  └─ ChatService.ask
       ├─ RetrievalService.search                          (vector-first) ✓ fixed + verified
       ├─ PromptBuilderService.buildAnswerPrompt
       └─ LlmClientService.generateAnswer                  (Groq)

PDF Vision
  └─ PdfVisionService.analyzePdf
       └─ PdfEmbeddedImageExtractor → Gemini vision
```

---

## Bugs

- [x] **CRITICAL — Chat bypasses vector search** ✓ Fixed
  `ChatService.ask` was calling `retrievalService.searchLexical` instead of
  `retrievalService.search`. Now fixed — chat uses vector-first search
  (Haystack cosine similarity via Gemini embeddings) with lexical fallback.
  File: [ChatService.java:109](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L109)

- [x] **CRITICAL — `QdrantVectorStoreService` is dead code inside ai-service** ✓ Fixed
  Per the architecture: ai-service → haystack-service (HTTP proxy) → Qdrant DB.
  Removed all 4 files that formed the unused direct-Qdrant cluster:
  `QdrantVectorStoreService`, `QdrantConnectionVerifier`, `QdrantConfig`,
  `QdrantProperties`. Qdrant is accessed exclusively through the Haystack
  proxy service; no pipeline code was affected.

- [ ] **HIGH — Guardrail race condition**
  `GuardrailService.enforceDailyLimit` does an `INSERT … ON CONFLICT UPDATE`
  then a separate `SELECT` — two round-trips with no transaction. Concurrent
  requests can both read a value below the limit and both proceed.
  File: [GuardrailService.java:31-45](ai-service/src/main/java/com/deepreader/ai_service/service/GuardrailService.java#L31-L45)

- [ ] **MEDIUM — File size validated after full read**
  `ingestDocument` calls `validateUpload(fileName, -1)` (skips size check)
  before reading all bytes into memory, then validates size after. A
  malicious or oversized upload is fully buffered before being rejected.
  File: [DocumentIngestionService.java:88-103](ai-service/src/main/java/com/deepreader/ai_service/service/DocumentIngestionService.java#L88-L103)

- [ ] **MEDIUM — `validateEmbeddingProvider` accepts Groq but always uses Gemini**
  The method accepts `GROQ` as a valid provider but `embedWithGemini` is
  always called regardless. The provider parameter is silently ignored.
  File: [EmbeddingService.java:296-300](ai-service/src/main/java/com/deepreader/ai_service/service/EmbeddingService.java#L296-L300)

---

## Quality Issues

- [ ] **Chunk size and overlap are hard-coded**
  `ChunkingService` uses fixed `DEFAULT_CHUNK_SIZE = 1000` and
  `DEFAULT_OVERLAP = 150` with no config binding. Different document types
  benefit from different chunk sizes.
  File: [ChunkingService.java:24-29](ai-service/src/main/java/com/deepreader/ai_service/service/ChunkingService.java#L24-L29)

- [ ] **Section "summarize" is a plain truncation**
  `TextExtractionService.summarize` takes the first 280 characters. This is
  used as the `summary` field on `DocumentSection` and in lexical scoring.
  An actual extractive summary would improve retrieval quality.
  File: [TextExtractionService.java:149-152](ai-service/src/main/java/com/deepreader/ai_service/service/TextExtractionService.java#L149-L152)

- [ ] **Domain-specific token weights are hard-coded**
  `importantChatTermWeight` and `importantQueryTokenWeight` hard-code boosts
  for Java / OOP terms ("oop", "java", "class", "inheritance", etc.). This
  biases retrieval for Java programming documents and degrades quality for
  any other subject matter.
  Files: [RetrievalService.java:347-353](ai-service/src/main/java/com/deepreader/ai_service/service/RetrievalService.java#L347-L353),
  [ChatService.java:295-301](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L295-L301)

- [ ] **Answer JSON extraction is fragile**
  `extractJson` uses `indexOf('{')` / `lastIndexOf('}')` to pull the JSON
  blob from the LLM response. Nested JSON or markdown code fences with
  braces can produce malformed JSON that silently falls back to the
  "not found" answer.
  File: [ChatService.java:413-421](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L413-L421)

- [ ] **Vietnamese language detection is hard-coded unicode**
  `needsAnswerRepair` / `containsVietnameseText` contains a 500-character
  regex of raw Unicode codepoints. This is a brittle language-detection
  workaround; consider using a library (e.g. `lingua`) or instructing the
  LLM to respond in a specific language via the system prompt.
  File: [ChatService.java:345-388](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L345-L388)

- [~] **No retry on Haystack HTTP calls** — accepted risk
  `DocumentIngestionService.indexProvider` and `RetrievalService.searchViaHaystack`
  call Haystack with no retry logic. Transient failures drop vector results
  silently or skip indexing with only a log warning.
  Files: [DocumentIngestionService.java:214-219](ai-service/src/main/java/com/deepreader/ai_service/service/DocumentIngestionService.java#L214-L219),
  [RetrievalService.java:387-411](ai-service/src/main/java/com/deepreader/ai_service/service/RetrievalService.java#L387-L411)

---

## What's Working Well

- [x] Gemini embedding has proper retry + back-off for HTTP 429 rate limits
- [x] Chunk overlap (150 chars) preserves context across chunk boundaries
- [x] Vector search falls back to lexical search automatically on failure
- [x] Ingestion is tolerant — provider failure does not block document save
- [x] Qdrant collection creation validates vector dimension on startup
- [x] `DocumentIngestionService` runs on `boundedElastic` scheduler (no reactor thread blocking)
- [x] PDF and EPUB both supported in extraction pipeline
- [x] Structured JSON answer format with `grounded` flag and `usedChunkIds` for citation
- [x] Answer repair loop (up to 2 attempts) for bad LLM output
- [x] Daily usage guardrails per user per metric key
- [x] Background ingestion queue worker via `IngestionQueueWorker`
- [x] PDF vision pipeline for image-embedded PDFs via Gemini multimodal

---

## Priority Order

| Priority | Item |
|----------|------|
| 1 | ~~Chat bypasses vector search~~ ✓ Fixed |
| 2 | ~~Remove dead `QdrantVectorStoreService` from ai-service~~ ✓ Fixed |
| 3 | Guardrail race condition (wrap in transaction) |
| 4 | File size check before buffering |
| 5 | ~~Haystack retry logic~~ accepted risk |
| 6 | Make chunk size configurable |
| 7 | Fix provider validation in EmbeddingService |
| 8 | Replace fragile JSON extraction with regex or structured output |
| 9 | Move domain weights to config / remove OOP bias |
| 10 | Replace Vietnamese regex with proper language detection |
