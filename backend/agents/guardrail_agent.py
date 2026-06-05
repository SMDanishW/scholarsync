import json
from typing import List, Dict
from services.groq_service import chat_completion

_SYSTEM_PROMPT = """You are a strict fact-checking agent. Your job is to verify that an AI \
assistant's response is grounded strictly in the provided source excerpts from research papers.

Rules:
- SUPPORTED: a claim that is explicitly stated or is a clear, direct paraphrase of the source text.
- UNSUPPORTED: a claim that introduces external knowledge, speculation, or facts not present \
in the excerpts.
- If there are no source excerpts (empty list), return verdict "skip".

Return ONLY a JSON object with this exact shape — no other text:
{
  "verdict": "pass" | "fail" | "skip",
  "issues": ["<description of unsupported claim>", ...],
  "corrected_response": "<response with unsupported claims removed or replaced>"
}

If verdict is "pass": issues must be [] and corrected_response must equal the original response.
If verdict is "skip": issues must be [] and corrected_response must equal the original response.
If verdict is "fail": list every unsupported claim in issues and provide corrected_response \
that removes or replaces those claims with only what is supported."""


def guardrail_agent(response: str, chunks: List[Dict]) -> Dict:
    """
    Verifies that `response` is grounded in `chunks`.

    Returns a dict:
        {
            "verdict": "pass" | "fail" | "skip",
            "issues": [...],
            "corrected_response": "..."
        }

    - "skip"  → no chunks available (no papers uploaded); response returned unchanged.
    - "pass"  → all claims are supported; response returned unchanged.
    - "fail"  → unsupported claims found; corrected_response has them removed/replaced.

    Never raises — on any parsing failure falls back to {"verdict": "pass", ...}.
    """
    if not chunks:
        return {"verdict": "skip", "issues": [], "corrected_response": response}

    # Truncate each chunk to 300 chars — enough for grounding checks, avoids
    # bloating the prompt and pushing the output over Groq's token limit.
    excerpts = "\n\n".join(
        f"[Source {i + 1} | {c['paper_name']} p.{c['page_number']}]\n"
        f"{c['text'][:300].rstrip()}{'…' if len(c['text']) > 300 else ''}"
        for i, c in enumerate(chunks)
    )

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"SOURCE EXCERPTS:\n{excerpts}\n\n"
                f"ASSISTANT RESPONSE TO CHECK:\n{response}"
            ),
        },
    ]

    # Dynamically size output budget: guardrail must reproduce the full response in JSON.
    # Rough token estimate (4 chars ≈ 1 token); leave 200 tokens for system prompt overhead.
    # Keep total (input + output) under 5800 to stay clear of the 6000 TPM ceiling.
    estimated_input_tokens = (len(excerpts) + len(response)) // 4 + 200
    max_output_tokens = max(512, min(3000, 5800 - estimated_input_tokens))
    raw = chat_completion(messages, json_mode=True, max_tokens=max_output_tokens)

    try:
        result = json.loads(raw)
        verdict = result.get("verdict", "pass")
        if verdict not in {"pass", "fail", "skip"}:
            verdict = "pass"
        issues = result.get("issues", [])
        if not isinstance(issues, list):
            issues = []
        corrected = result.get("corrected_response") or response
        return {"verdict": verdict, "issues": issues, "corrected_response": corrected}
    except (json.JSONDecodeError, AttributeError, TypeError):
        # Parsing failed — treat as pass so the original response still reaches the user
        return {"verdict": "pass", "issues": [], "corrected_response": response}
