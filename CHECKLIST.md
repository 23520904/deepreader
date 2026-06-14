# Chat Pipeline Improvement Checklist

Pipeline: `Frontend → ChatService → RetrievalService (Haystack vector + lexical fallback) → PromptBuilderService → LlmClientService (Groq) → parse JSON → source chips`

---

## CRITICAL — Breaks answers silently

- [x] **Repair prompt has no source context**
  `buildAnswerRepairPrompt` only sends `query + previous_answer` — no chunks.
  The LLM cannot re-ground or fix the answer without the sources.
  **Fix:** pass the original context into the repair prompt.
  File: [PromptBuilderService.java:74](ai-service/src/main/java/com/deepreader/ai_service/service/PromptBuilderService.java#L74)

- [x] **`needsAnswerRepair` fires on legitimate answers**
  Checks for `"the sources"` — triggers on answers like *"The sources of energy include..."*
  Causes a wasteful repair loop and burns Groq quota.
  **Fix:** tighten to `"based on the sources"` / `"the provided sources"` only; remove bare `"the sources"`.
  File: [ChatService.java:341](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L341)

- [x] **JSON parse failure → silent "not found" answer**
  If the LLM puts an unescaped quote or newline inside the `"answer"` JSON field, `objectMapper.readValue` throws → `parseStructuredChatAnswer` returns `null` → `toChatResponse` returns *"I could not find this information"* even when the LLM found a good answer.
  **Fix:** after parse failure, try extracting the raw answer text between `"answer":"` and the next `","grounded"` as a fallback.
  File: [ChatService.java:372](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L372)

---

## HIGH — Reduces answer quality

- [x] **Chunk char limit too small (1,100 chars)**
  `GROQ_MAX_CHUNK_CHARS = 1_100` cuts content mid-sentence.
  Total context budget is 12,000 chars for 6 chunks = 2,000 chars/chunk available.
  **Fix:** raise to `1_800` — fits within the 12k budget and gives the LLM more complete passages.
  File: [ChatService.java:52](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L52)

- [x] **Hard-coded Java/OOP relevance boosts break non-Java documents**
  `importantChatTermWeight` returns 1.8× for `java, class, object, constructor...`
  `chatRelevanceScore` has special-case boosts for `constructor`, `overloading`, `public`, `private`.
  These boost wrong chunks for any non-Java document (history, biology, economics, etc.).
  **Fix:** remove all domain-specific boosts. Keep only the generic term-in-title (+2.5) and term-in-content (+1.0) scoring.
  File: [ChatService.java:213](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L213)

- [x] **Vector search fetches at most 20 candidates, then filters client-side**
  `candidateLimit = min(20, max(limit, limit*4))` — with `limit=12` gives 20.
  After filtering to the user's document, could be far fewer than 12 good matches.
  **Fix:** pass `documentId` to Haystack as a filter field so the server filters, not the client. If Haystack doesn't support it, raise `candidateLimit` to at least `limit * 4`.
  File: [RetrievalService.java:152](ai-service/src/main/java/com/deepreader/ai_service/service/RetrievalService.java#L152)

- [x] **Candidate pool too small: 12 fetched, 6 used**
  `GROQ_CANDIDATE_MATCHES = 12` → `selectContextChunks` picks top 6.
  Only a 2× selection pool. For diverse multi-part questions, the best chunks may not be in the top 12.
  **Fix:** raise `GROQ_CANDIDATE_MATCHES` to `18` for a 3× pool.
  File: [ChatService.java:42](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L42)

---

## MEDIUM — Reduces reliability / UX

- [x] **`chunkById` is recomputed on every `usedChunkId` lookup**
  Called once per `chunkId` in the stream at line 154 but rebuilds the map each time.
  **Fix:** hoist `chunkById(matches)` to a local variable before the stream.
  File: [ChatService.java:153](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L153)

- [x] **Overview query detection is brittle**
  Regex like `"what.*document"` misses *"summarise the file"*, *"what are the main topics?"*, *"give me an overview"*.
  **Fix:** extend the pattern list or use a simpler keyword-set check.
  File: [ChatService.java:263](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L263)

- [x] **Lexical fallback for overview returns sections spread by index, not by content density**
  `representativeSections` picks evenly-spaced section indices — first, last, and midpoints.
  For documents with many short/empty early sections (title slides, table of contents), this returns noise.
  **Fix:** filter out sections with fewer than ~100 chars of content before picking representatives.
  File: [RetrievalService.java:263](ai-service/src/main/java/com/deepreader/ai_service/service/RetrievalService.java#L263)

- [x] **Source chips show chunkIndex but lexical fallback sets it from `pageNumber`**
  `toRetrievedChunk` maps `section.pageNumber()` to `chunkIndex` in the `RetrievedChunk` record.
  So chips show "chunk 3" when it's actually page 3 — confusing for users.
  **Fix:** use separate `pageNumber` field in the display label, or rename the chip label to "page N" when the source came from lexical fallback.
  File: [RetrievalService.java:201](ai-service/src/main/java/com/deepreader/ai_service/service/RetrievalService.java#L201)

- [x] **`extractJson` is fragile with nested JSON or escaped braces**
  Uses `indexOf('{')` / `lastIndexOf('}')` — fails if the LLM wraps the JSON in a markdown code block like ` ```json{...}``` `.
  **Fix:** strip ` ```json ` / ` ``` ` wrappers before extraction.
  File: [ChatService.java:389](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L389)

---

## PERFORMANCE — Slower than before

- [x] **Prompt grew 53% — more input tokens to Groq**
  Old: 6 chunks × 1,100 chars + ~700 instruction ≈ 7,900 chars. New: 6 chunks × 1,800 chars + ~700 ≈ 12,100 chars.
  Groq's prefill time is proportional to input length — this is the primary cause of visible slowdown.
  **Options (pick one):** (a) drop `GROQ_MAX_CHUNK_CHARS` to `1_400` as a quality/speed middle ground; (b) reduce `GROQ_CONTEXT_MATCHES` from 6 → 5 to keep total prompt under ~10,500 chars.
  File: [ChatService.java:37](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L37)

- [x] **Repair prompt grew from ~300 chars to ~12,100 chars**
  Old `buildAnswerRepairPrompt` only sent query + bad answer. New version sends the full source context.
  If `needsAnswerRepair` triggers (up to 2 attempts), each attempt is now a full-size Groq call — potentially tripling total LLM time.
  **Fix:** pass only top 2–3 chunks to the repair prompt, not all 6. Repair only needs enough grounding to fix tone/language, not the full context.
  File: [PromptBuilderService.java:74](ai-service/src/main/java/com/deepreader/ai_service/service/PromptBuilderService.java#L74)

- [x] **`GROQ_MAX_CONTEXT_CHARS = 18,000` conflicts with `GROQ_MAX_PROMPT_CHARS = 16,000`**
  With 6 chunks × 1,800 chars, actual context peaks at ~11,400 chars — the 18,000 cap is never reached.
  But if chunk count or headers ever grow, total prompt will exceed 16,000 and `fitGroqPrompt` silently truncates mid-chunk and appends `[Prompt truncated]` inside the Sources section. This noise could break the LLM's JSON output.
  **Fix:** set `GROQ_MAX_CONTEXT_CHARS` to `GROQ_MAX_PROMPT_CHARS - 1_500` (≈ 14,500) so it always fits with room for instruction overhead.
  Files: [ChatService.java:47](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L47), [LlmClientService.java:33](ai-service/src/main/java/com/deepreader/ai_service/service/LlmClientService.java#L33)

---

## LOW — Polish / Nice to have

- [x] **LLM model: `llama-3.1-8b-instant` is weaker than `llama-3.3-70b-versatile`**
  The 8b model was chosen to avoid Groq rate limits. If a user adds their own Groq key, they could use 70b.
  **Fix:** check `userToken` in `LlmClientService` and upgrade model to `70b` when a user-supplied key is present.
  File: [LlmClientService.java:134](ai-service/src/main/java/com/deepreader/ai_service/service/LlmClientService.java#L134)

- [ ] **No deduplication of near-identical chunks in context**
  Two adjacent chunks can have overlapping text (sliding window chunking). The LLM receives repeated content, wasting token budget.
  **Fix:** after `selectContextChunks`, deduplicate chunks whose content has >70% overlap with an already-selected chunk.

- [x] **`GROQ_MAX_CONTEXT_CHARS = 12_000` is conservative**
  llama-3.1-8b-instant supports 128k context. Groq's free tier limits are on tokens/minute, not context size.
  **Fix:** safely raise to `18_000` to allow more content per answer without hitting Groq's request-size limit.
  File: [ChatService.java:47](ai-service/src/main/java/com/deepreader/ai_service/service/ChatService.java#L47)

- [x] **Source chips show `fileName · chunk N` but fileName is often a long UUID or path**
  The full filename may be truncated with no useful info visible.
  **Fix:** show only the base filename without extension and without path prefix.
  File: [DocumentChatPanel.tsx:488](frontend/src/components/library/DocumentChatPanel.tsx#L488)

- [x] **Clicking a source chip should highlight the cited text in the PDF canvas**
  `handleSourceClick` in [read/page.tsx:835](frontend/src/app/library/%5BbookId%5D/read/page.tsx#L835) navigates to the correct page but does nothing with the text.
  The PDF is rendered on a `<canvas>` (not DOM text), so highlighting requires:
  1. Use `pdfPage.getTextContent()` to get character positions on that page.
  2. Match the chunk `content` string against the text items to find bounding boxes.
  3. Draw a semi-transparent highlight rectangle over the canvas via a second overlay `<canvas>` (or a positioned `<div>`) layered on top of `pdfCanvasRef`.
  4. Clear the highlight when the user navigates away or clicks elsewhere.
  The overlay `<canvas>` approach is simplest: same size as the PDF canvas, `position: absolute`, `pointer-events: none`, drawn with `fillStyle = "rgba(255,220,0,0.35)"`.
  Files: [read/page.tsx:835](frontend/src/app/library/%5BbookId%5D/read/page.tsx#L835), [ReadingWorkspace.tsx](frontend/src/components/library/read/ReadingWorkspace.tsx), [DocumentChatPanel.tsx](frontend/src/components/library/DocumentChatPanel.tsx)
