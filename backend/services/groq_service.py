import re
from typing import List, Dict, Generator
from config import GROQ_API_KEY, LLM_MODEL

_client = None


def _get_client():
    global _client
    if _client is None:
        from groq import Groq
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def _strip_think(text: str) -> str:
    """Remove <think>…</think> blocks that Qwen3 may emit in non-streaming responses."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def chat_completion(
    messages: List[Dict],
    json_mode: bool = False,
    max_tokens: int | None = None,
) -> str:
    client = _get_client()
    kwargs: Dict = {"model": LLM_MODEL, "messages": messages, "temperature": 0}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens
    response = client.chat.completions.create(**kwargs)
    raw = response.choices[0].message.content or ""
    return _strip_think(raw)


def stream_completion(messages: List[Dict]) -> Generator[str, None, None]:
    """
    Streams response tokens from the LLM, stripping Qwen3 <think>…</think> blocks
    so only the final answer reaches the client.
    """
    client = _get_client()
    stream = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        stream=True,
        temperature=0.2,
    )

    buffer = ""
    in_think = False

    for chunk in stream:
        content = chunk.choices[0].delta.content or ""
        if not content:
            continue
        buffer += content

        # Strip <think>...</think> blocks that Qwen3 may emit
        while True:
            if not in_think:
                start = buffer.find("<think>")
                if start == -1:
                    if buffer:
                        yield buffer
                        buffer = ""
                    break
                if start > 0:
                    yield buffer[:start]
                buffer = buffer[start + len("<think>"):]
                in_think = True
            else:
                end = buffer.find("</think>")
                if end == -1:
                    buffer = ""  # discard thinking content
                    break
                buffer = buffer[end + len("</think>"):]
                in_think = False

    if buffer and not in_think:
        yield buffer
