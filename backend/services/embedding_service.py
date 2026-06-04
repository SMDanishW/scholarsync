from typing import List
from config import EMBEDDING_MODEL

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def warmup() -> None:
    """Pre-load model on startup to avoid first-request latency."""
    _get_model()


def embed_texts(texts: List[str]) -> List[List[float]]:
    return _get_model().encode(texts, convert_to_numpy=True).tolist()


def embed_query(text: str) -> List[float]:
    return _get_model().encode([text], convert_to_numpy=True)[0].tolist()
