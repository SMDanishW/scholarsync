import time
from typing import List, Dict, Optional
from config import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    PINECONE_DIMENSION,
    PINECONE_CLOUD,
    PINECONE_REGION,
)

_index = None


def ensure_index_exists() -> None:
    """
    Creates the Pinecone serverless index if it doesn't exist yet.
    Blocks until the index is ready. Called once at startup.
    """
    from pinecone import Pinecone, ServerlessSpec

    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing_names = [idx.name for idx in pc.list_indexes()]

    if PINECONE_INDEX_NAME not in existing_names:
        print(f"[pinecone] Index '{PINECONE_INDEX_NAME}' not found — creating…")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=PINECONE_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
        )
        # Wait until the index is ready to accept requests
        for _ in range(60):
            status = pc.describe_index(PINECONE_INDEX_NAME).status
            if status.get("ready"):
                break
            time.sleep(2)
        print(f"[pinecone] Index '{PINECONE_INDEX_NAME}' is ready.")
    else:
        print(f"[pinecone] Index '{PINECONE_INDEX_NAME}' already exists.")


def _get_index():
    global _index
    if _index is None:
        from pinecone import Pinecone
        _index = Pinecone(api_key=PINECONE_API_KEY).Index(PINECONE_INDEX_NAME)
    return _index


def upsert_chunks(
    conversation_id: str,
    paper_id: str,
    paper_name: str,
    chunks: List[Dict],
    embeddings: List[List[float]],
) -> List[str]:
    """Upserts chunk vectors into the conversation namespace. Returns vector IDs."""
    index = _get_index()
    vectors = []
    for chunk, embedding in zip(chunks, embeddings):
        vid = f"{paper_id}_{chunk['chunk_index']}"
        vectors.append(
            {
                "id": vid,
                "values": embedding,
                "metadata": {
                    "conversation_id": conversation_id,
                    "paper_id": paper_id,
                    "paper_name": paper_name,
                    "page_number": chunk["page_number"],
                    "section_heading": chunk["section_heading"],
                    "text": chunk["text"][:1000],  # Pinecone metadata size limit
                },
            }
        )

    namespace = conversation_id
    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i : i + 100], namespace=namespace)

    return [v["id"] for v in vectors]


def query_chunks(
    conversation_id: str,
    query_embedding: List[float],
    paper_ids: Optional[List[str]] = None,
    top_k: int = 8,
) -> List[Dict]:
    index = _get_index()
    filter_dict: Dict = {"conversation_id": {"$eq": conversation_id}}
    if paper_ids:
        filter_dict["paper_id"] = {"$in": paper_ids}

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=conversation_id,
        filter=filter_dict,
        include_metadata=True,
    )

    return [
        {
            "score": match["score"],
            "paper_id": match["metadata"]["paper_id"],
            "paper_name": match["metadata"]["paper_name"],
            "page_number": match["metadata"]["page_number"],
            "section_heading": match["metadata"]["section_heading"],
            "text": match["metadata"]["text"],
        }
        for match in results["matches"]
    ]


def delete_paper_vectors(conversation_id: str, vector_ids: List[str]) -> None:
    """Delete specific vectors by ID (works on all Pinecone plan types)."""
    if not vector_ids:
        return
    index = _get_index()
    for i in range(0, len(vector_ids), 1000):
        index.delete(ids=vector_ids[i : i + 1000], namespace=conversation_id)


def delete_namespace(conversation_id: str) -> None:
    index = _get_index()
    index.delete(delete_all=True, namespace=conversation_id)
