import json
from agents.state import AgentState

_VALID_INTENTS = {
    "summarize",
    "methodology",
    "findings",
    "limitations",
    "compare",
    "general_qa",
}

_SYSTEM = (
    "You are a query router for a research paper analysis assistant. "
    "Given a user query and list of uploaded papers, classify the intent and "
    "identify which papers are relevant. Respond ONLY with valid JSON."
)

_USER_TEMPLATE = """\
Uploaded papers:
{papers_list}

User query: {query}

Respond with JSON:
{{
  "intent": "<one of: summarize, methodology, findings, limitations, compare, general_qa>",
  "relevant_paper_ids": ["<id1>", ...],
  "reasoning": "<one sentence>"
}}

Rules:
- Use "compare" only when the user explicitly wants to compare papers.
- If no specific paper is mentioned, include all paper IDs.
- If no papers are uploaded, use "general_qa" and an empty list."""


def router_agent(state: AgentState) -> dict:
    from services.groq_service import chat_completion

    paper_names: dict = state.get("paper_names", {})
    papers_list = (
        "\n".join(f"- {name} (id: {pid})" for pid, name in paper_names.items())
        if paper_names
        else "(none uploaded)"
    )

    raw = chat_completion(
        [
            {"role": "system", "content": _SYSTEM},
            {
                "role": "user",
                "content": _USER_TEMPLATE.format(
                    papers_list=papers_list, query=state["query"]
                ),
            },
        ],
        json_mode=True,
    )

    try:
        data = json.loads(raw)
        intent = data.get("intent", "general_qa")
        if intent not in _VALID_INTENTS:
            intent = "general_qa"
        raw_ids: list = data.get("relevant_paper_ids", [])
        valid_ids = [pid for pid in raw_ids if pid in paper_names]
        if not valid_ids:
            valid_ids = list(paper_names.keys())
    except (json.JSONDecodeError, TypeError):
        intent = "general_qa"
        valid_ids = list(paper_names.keys())

    return {"intent": intent, "relevant_paper_ids": valid_ids}
