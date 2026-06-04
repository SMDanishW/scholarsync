import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from api import conversations, upload, chat
from config import UPLOAD_DIR

app = FastAPI(title="Research Portal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    # Allow all origins so ngrok tunnels and local dev both work without
    # reconfiguring on every session. This is a single-user local tool —
    # tighten this if you ever deploy to a fixed public URL.
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(upload.router)
app.include_router(chat.router)


@app.on_event("startup")
def startup() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    init_db()
    from services.pinecone_service import ensure_index_exists
    ensure_index_exists()
    from services.embedding_service import warmup
    warmup()


@app.get("/health")
def health():
    return {"status": "ok"}
