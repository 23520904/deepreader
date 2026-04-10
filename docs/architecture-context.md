# DeepReader Backend Context

## Product direction
DeepReader is a cloud-deployable backend for a website frontend that helps users upload PDF/EPUB books, ask questions about the content, generate summaries, and create flashcards automatically.

## Architecture direction
- Frontend: separate website deployment
- Backend: Spring Boot API service designed for future microservice decomposition
- LLM providers: OpenAI and Gemini only
- Vector database: Qdrant
- Metadata persistence: PostgreSQL
- Document parsing: Apache PDFBox + EPUBLib

## RAG inspiration
The implementation follows a lightweight architecture inspired by RAGFlow concepts:
- clean ingestion pipeline
- chunk-based indexing
- vector retrieval first, lexical fallback second
- task-specific prompts for chat, summary, and flashcards

## Cleanup decisions
- Ollama removed
- Camel-driven backend flow removed from active build
- deployment focus set to `ai-service`; other modules are deferred
- website-first cloud deployment prioritized over desktop assumptions

## Current implementation scope
- upload PDF/EPUB
- index document chunks for both OpenAI and Gemini
- retrieve relevant chunks
- ask questions with source-backed answers
- generate summaries
- generate flashcards