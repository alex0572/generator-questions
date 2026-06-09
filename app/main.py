import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.logging_config import setup_logging
from app.routers import llm

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    setup_logging()
    yield


app = FastAPI(
    title="Генератор пользовательских вопросов",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(llm.router)


@app.get("/")
def root() -> dict:
    return {
        "service": "Генератор пользовательских вопросов",
        "docs": "/docs",
        "health": "/health",
        "llm_help": "GET /llm",
        "endpoints": {
            "generate_questions": "POST /llm/generate-questions",
            "chat": "POST /llm/chat",
            "chat_with_system": "POST /llm/chat-with-system",
            "chat_json": "POST /llm/chat-json",
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
