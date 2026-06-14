import logging
import os
from functools import lru_cache

from fastapi import FastAPI, HTTPException

logger = logging.getLogger(__name__)
from haystack import Document
from haystack.utils import Secret
from haystack_integrations.components.retrievers.qdrant import QdrantEmbeddingRetriever
from haystack_integrations.document_stores.qdrant import QdrantDocumentStore

from .schemas import IngestRequest, SearchRequest, SearchResponse, SearchMatch

app = FastAPI(title="deepreader-haystack-service")

# Qdrant connection settings are loaded from environment variables.
# This keeps the service configurable across local, staging, and production environments.
QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_COLLECTION_PREFIX = os.getenv("QDRANT_COLLECTION_PREFIX", "document_chunks")
QDRANT_TIMEOUT = float(os.getenv("QDRANT_TIMEOUT_SECONDS", "10"))


def _collection_name(provider: str) -> str:
    """Build the Qdrant collection name for a specific embedding provider."""
    # Each provider gets its own collection so embeddings from different models are not mixed.
    return f"{QDRANT_COLLECTION_PREFIX}_{provider.strip().lower()}"


@lru_cache(maxsize=8)
def _store_for_provider(provider: str) -> QdrantDocumentStore:
    """Return a cached Qdrant document store for the requested provider collection."""
    # Qdrant URL is required because all ingest and search operations depend on it.
    if not QDRANT_URL:
        raise RuntimeError("QDRANT_URL is required")

    # API key is optional to support local or unsecured Qdrant instances.
    api_key = Secret.from_token(QDRANT_API_KEY) if QDRANT_API_KEY else None

    # The document store is cached per provider to avoid rebuilding Qdrant clients repeatedly.
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
    """Simple health check endpoint for deployment and monitoring tools."""
    return {"status": "ok"}


@app.post("/ingest")
def ingest(req: IngestRequest) -> dict[str, int]:
    """Ingest chunks and their embeddings into the provider-specific Qdrant collection."""
    # Each text chunk must match exactly one embedding.
    # If the sizes differ, indexing would store incorrect chunk-vector pairs.
    if len(req.chunks) != len(req.embeddings):
        raise HTTPException(status_code=400, detail="chunks and embeddings size mismatch")

    try:
        store = _store_for_provider(req.provider)
        documents = []

        # Convert incoming chunks into Haystack documents before writing them to Qdrant.
        # Metadata is stored with each vector so search results can be mapped back to the source document.
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

        # Write all prepared documents to the provider-specific Qdrant collection.
        store.write_documents(documents)
        return {"indexed": len(documents)}
    except Exception as ex:
        logger.exception("Ingest failed for provider '%s'", req.provider)
        raise HTTPException(status_code=500, detail=f"haystack ingest failed: {ex}") from ex


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    """Search the provider collection using the supplied query embedding and return matches."""
    try:
        store = _store_for_provider(req.provider)

        # The retriever performs vector similarity search against the selected Qdrant collection.
        retriever = QdrantEmbeddingRetriever(document_store=store)

        # The caller is responsible for creating the query embedding.
        # This service focuses only on retrieving the nearest stored chunks.
        result = retriever.run(query_embedding=req.query_embedding, top_k=req.limit)
        docs = result.get("documents", [])
        matches = []

        # Convert Haystack documents back into the API response format used by DeepReader.
        # Most fields come from metadata because Qdrant stores the original chunk context there.
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
        logger.exception("Search failed for provider '%s'", req.provider)
        raise HTTPException(status_code=500, detail=f"haystack search failed: {ex}") from ex