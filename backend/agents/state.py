from typing import TypedDict, List, Optional, Dict


class ChunkResult(TypedDict):
    score: float
    paper_id: str
    paper_name: str
    page_number: int
    section_heading: str
    text: str


class AgentState(TypedDict):
    conversation_id: str
    query: str
    paper_ids: List[str]
    paper_names: Dict[str, str]      # paper_id -> filename
    intent: Optional[str]            # set by router agent
    relevant_paper_ids: List[str]    # set by router agent
    retrieved_chunks: List[ChunkResult]  # set by retrieval agent
