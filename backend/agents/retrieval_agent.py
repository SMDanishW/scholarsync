from agents.state import AgentState
from services.embedding_service import embed_query
from services.pinecone_service import query_chunks
from config import TOP_K_RETRIEVAL


def retrieval_agent(state: AgentState) -> dict:
    query_embedding = embed_query(state["query"])
    paper_ids = state.get("relevant_paper_ids") or None

    chunks = query_chunks(
        conversation_id=state["conversation_id"],
        query_embedding=query_embedding,
        paper_ids=paper_ids,
        top_k=TOP_K_RETRIEVAL,
    )

    return {"retrieved_chunks": chunks}
