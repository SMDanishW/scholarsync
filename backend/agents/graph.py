from langgraph.graph import StateGraph, START, END
from agents.state import AgentState
from agents.router_agent import router_agent
from agents.retrieval_agent import retrieval_agent


def _should_retrieve(state: AgentState) -> str:
    """Skip Pinecone retrieval when no papers have been uploaded."""
    return "retrieve" if state.get("paper_ids") else "skip"


def _build() -> object:
    g: StateGraph = StateGraph(AgentState)
    g.add_node("router", router_agent)
    g.add_node("retrieval", retrieval_agent)
    g.add_edge(START, "router")
    g.add_conditional_edges(
        "router",
        _should_retrieve,
        {"retrieve": "retrieval", "skip": END},
    )
    g.add_edge("retrieval", END)
    return g.compile()


compiled_graph = _build()
