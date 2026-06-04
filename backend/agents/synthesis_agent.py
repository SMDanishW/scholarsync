from typing import List, Dict

_INTENT_INSTRUCTIONS: Dict[str, str] = {
    "summarize": (
        "Provide a comprehensive, structured summary of the paper(s). "
        "Cover: research objectives, methodology, key findings, and conclusions."
    ),
    "methodology": (
        "Extract and explain the methodology in detail. "
        "Describe the research design, data sources, analysis techniques, and experimental setup."
    ),
    "findings": (
        "Identify and explain the key findings and results. "
        "Be specific and quantitative where the source supports it."
    ),
    "limitations": (
        "Identify all limitations acknowledged in the paper(s). "
        "Explain what constraints or gaps the authors noted."
    ),
    "compare": (
        "Compare the papers across key dimensions: research objectives, methodology, "
        "findings, and limitations. Use a structured format with clear headings per dimension."
    ),
    "general_qa": (
        "Answer the user's question accurately using the provided research excerpts as your primary source."
    ),
}


def build_synthesis_prompt(intent: str, query: str, chunks: List[Dict]) -> List[Dict]:
    instruction = _INTENT_INSTRUCTIONS.get(intent, _INTENT_INSTRUCTIONS["general_qa"])

    if not chunks:
        system = (
            "You are a research analysis assistant. "
            "No papers have been uploaded to this conversation yet. "
            "Politely inform the user that they need to upload at least one PDF "
            "using the panel on the right before you can answer research questions."
        )
    else:
        context_parts = [
            f"[Source: {c['paper_name']} | Page {c['page_number']} | {c['section_heading']}]\n{c['text']}"
            for c in chunks
        ]
        context = "\n\n---\n\n".join(context_parts)
        system = (
            f"You are a research analysis assistant. {instruction}\n\n"
            "Base your response strictly on the provided source excerpts. "
            "When referencing specific information, cite inline as (Paper Name, p. X). "
            "Be precise, structured, and academically clear.\n\n"
            f"SOURCE EXCERPTS:\n{context}"
        )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": query},
    ]


def extract_citations(chunks: List[Dict], max_citations: int = 5) -> List[Dict]:
    """Build citation objects from the top retrieved chunks."""
    citations: List[Dict] = []
    seen: set = set()

    for chunk in chunks[:max_citations]:
        key = (chunk["paper_id"], chunk["page_number"])
        if key in seen:
            continue
        seen.add(key)

        # Take the first two sentences as the quoted snippet
        text = chunk["text"].replace("\n", " ")
        sentences = text.split(". ")
        quote = ". ".join(sentences[:2]).strip()
        if not quote.endswith("."):
            quote += "."
        if len(quote) > 350:
            quote = quote[:347] + "..."

        citations.append(
            {
                "paper_id": chunk["paper_id"],
                "paper_name": chunk["paper_name"],
                "page_number": chunk["page_number"],
                "section_heading": chunk["section_heading"],
                "quoted_text": quote,
            }
        )

    return citations
