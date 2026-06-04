import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "research-portal")
PINECONE_CLOUD: str = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION: str = os.getenv("PINECONE_REGION", "us-east-1")

MAX_PAPERS_PER_CONVERSATION: int = 5
CHUNK_SIZE: int = 500        # words per chunk (≈375–500 tokens)
CHUNK_OVERLAP: int = 50      # word overlap between consecutive chunks
TOP_K_RETRIEVAL: int = 8
EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
PINECONE_DIMENSION: int = 384
LLM_MODEL: str = "qwen/qwen3-32b"

UPLOAD_DIR: str = "uploads"
DATABASE_URL: str = "sqlite:///./research_portal.db"
