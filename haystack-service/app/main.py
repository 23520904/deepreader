import os
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from haystack import Document
from haystack.utils import Secret
from haystack_integrations.components.retrievers.qdrant import QdrantEmbeddingRetriever
from haystack_integrations.document_stores.qdrant import QdrantDocumentStore

from .schemas import IngestRequest, SearchRequest, SearchResponse, SearchMatch

app = FastAPI(title="deepreader-haystack-service")

QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_COLLECTION_PREFIX = os.getenv("QDRANT_COLLECTION_PREFIX", "document_chunks")
QDRANT_TIMEOUT = float(os.getenv("QDRANT_TIMEOUT_SECONDS", "10"))


def _collection_name(provider: str) -> str:
    return f"{QDRANT_COLLECTION_PREFIX}_{provider.strip().lower()}"


@lru_cache(maxsize=8)
def _store_for_provider(provider: str) -> QdrantDocumentStore:
    if not QDRANT_URL:
        raise RuntimeError("QDRANT_URL is required")
    api_key = Secret.from_token(QDRANT_API_KEY) if QDRANT_API_KEY else None
    return QdrantDocumentStore(
        url=QDRANT_URL,
        api_key=api_key,
        index=_collection_name(provider),
        recreate_index=False,
        wait_result_from_api=True,
        timeout=QDRANT_TIMEOUT,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest")
def ingest(req: IngestRequest) -> dict[str, int]:
    if len(req.chunks) != len(req.embeddings):
        raise HTTPException(status_code=400, detail="chunks and embeddings size mismatch")
    try:
        store = _store_for_provider(req.provider)
        documents = []
        for chunk, embedding in zip(req.chunks, req.embeddings):
            documents.append(
                Document(
                    id=chunk.chunk_id,
                    content=chunk.content,
                    embedding=embedding,
                    meta={
                        "document_id": chunk.document_id,
                        "chunk_id": chunk.chunk_id,
                        "file_name": chunk.file_name,
                        "section_id": chunk.section_id,
                        "title": chunk.title,
                        "chunk_index": chunk.chunk_index,
                    },
                )
            )
        store.write_documents(documents)
        return {"indexed": len(documents)}
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"haystack ingest failed: {ex}") from ex


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    try:
        store = _store_for_provider(req.provider)
        retriever = QdrantEmbeddingRetriever(document_store=store)
        result = retriever.run(query_embedding=req.query_embedding, top_k=req.limit)
        docs = result.get("documents", [])
        matches = []
        for doc in docs:
            meta = doc.meta or {}
            matches.append(
                SearchMatch(
                    document_id=meta.get("document_id"),
                    chunk_id=meta.get("chunk_id") or doc.id,
                    file_name=meta.get("file_name"),
                    section_id=meta.get("section_id"),
                    title=meta.get("title"),
                    chunk_index=meta.get("chunk_index"),
                    content=doc.content,
                    score=float(doc.score or 0.0),
                )
            )
        return SearchResponse(matches=matches)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"haystack search failed: {ex}") from ex
