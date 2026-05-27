from pydantic import BaseModel, Field


class ChunkPayload(BaseModel):
    chunk_id: str
    document_id: str
    file_name: str
    section_id: str
    title: str
    chunk_index: int
    content: str


class IngestRequest(BaseModel):
    provider: str
    chunks: list[ChunkPayload]
    embeddings: list[list[float]]


class SearchRequest(BaseModel):
    provider: str
    query_embedding: list[float]
    limit: int = Field(default=5, ge=1, le=20)


class SearchMatch(BaseModel):
    document_id: str | None = None
    chunk_id: str | None = None
    file_name: str | None = None
    section_id: str | None = None
    title: str | None = None
    chunk_index: int | None = None
    content: str
    score: float


class SearchResponse(BaseModel):
    matches: list[SearchMatch]
