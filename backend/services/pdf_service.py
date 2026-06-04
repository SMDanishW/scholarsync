import hashlib
import re
from typing import List, Dict
from pypdf import PdfReader

# Common academic section heading patterns
_SECTION_PATTERNS = [
    r"^(abstract|introduction|background|motivation|related work|literature review|"
    r"methodology|methods|materials and methods|experimental setup|experiments|"
    r"results|findings|discussion|conclusion|conclusions|future work|future directions|"
    r"limitations|references|bibliography|acknowledgements|acknowledgments|"
    r"appendix|evaluation|analysis|overview|summary)\s*$",
    r"^\d+\.?\s+[A-Z][^.!?]{2,60}$",     # "1. Introduction" / "1 Introduction"
    r"^[IVX]+\.?\s+[A-Z][^.!?]{2,60}$",  # "II. Methods"
]


def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def _is_section_heading(line: str) -> bool:
    line = line.strip()
    if not line or len(line) > 100:
        return False
    for pattern in _SECTION_PATTERNS:
        if re.match(pattern, line, re.IGNORECASE):
            return True
    # ALL-CAPS lines that aren't just numbers/punctuation
    if line.isupper() and 3 <= len(line) <= 80 and not line.replace(" ", "").isdigit():
        return True
    return False


def get_page_count(pdf_path: str) -> int:
    return len(PdfReader(pdf_path).pages)


def extract_chunks(
    pdf_path: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> List[Dict]:
    """
    Extracts text from every page and splits into overlapping word-based chunks.
    Each chunk carries its starting page number and nearest detected section heading.
    Returns a list of dicts: {chunk_index, text, page_number, section_heading}.
    """
    reader = PdfReader(pdf_path)
    current_section = "Introduction"

    # Build a flat token list: (word, page_number, section_heading)
    tokens: List[tuple] = []
    for page_idx, page in enumerate(reader.pages):
        raw = page.extract_text() or ""
        for line in raw.split("\n"):
            line = line.strip()
            if not line:
                continue
            if _is_section_heading(line):
                current_section = line
            for word in line.split():
                tokens.append((word, page_idx + 1, current_section))

    if not tokens:
        return []

    chunks: List[Dict] = []
    i = 0
    while i < len(tokens):
        window = tokens[i : i + chunk_size]
        if not window:
            break
        chunks.append(
            {
                "chunk_index": len(chunks),
                "text": " ".join(t[0] for t in window),
                "page_number": window[0][1],
                "section_heading": window[0][2],
            }
        )
        i += chunk_size - overlap

    return chunks
