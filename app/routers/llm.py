import asyncio
import logging
import time
from functools import lru_cache
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.llm_client import LLMClient, QuestionGenerationError
from app.services.question_generator import PageFetchError, PageParseError, run_full

router = APIRouter(prefix="/llm", tags=["llm"])
logger = logging.getLogger(__name__)


@lru_cache
def get_llm_client() -> LLMClient:
    return LLMClient()


class ChatRequest(BaseModel):
    prompt: str


class ChatWithSystemRequest(BaseModel):
    system_prompt: str
    user_prompt: str


class ChatJsonRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    json_standard: str = Field(..., alias="jsonStandard")

    model_config = {"populate_by_name": True}


class ChatResponse(BaseModel):
    response: str


class ChatJsonResponse(BaseModel):
    data: dict


class GenerateQuestionsRequest(BaseModel):
    url: str
    mode: Literal["fast", "quality"] = "fast"


class GenerateQuestionsResponse(BaseModel):
    url: str
    questions: list[str]
    page_title: str | None = None
    mode: Literal["fast", "quality"]


@router.get("")
def llm_index() -> dict:
    return {
        "note": "Открытие URL в браузере — это GET. Для запросов к LLM используйте POST или Swagger: /docs",
        "endpoints": [
            {"method": "POST", "path": "/llm/chat", "body": {"prompt": "ваш вопрос"}},
            {
                "method": "POST",
                "path": "/llm/generate-questions",
                "body": {"url": "https://example.com", "mode": "fast"},
            },
        ],
    }


@router.get("/chat")
def chat_help() -> dict:
    return {
        "method": "POST",
        "path": "/llm/chat",
        "body": {"prompt": "Назови столицу Франции."},
        "swagger": "/docs#/llm/chat_endpoint_llm_chat_post",
    }


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(body: ChatRequest) -> ChatResponse:
    try:
        result = get_llm_client().chat(body.prompt)
    except (ValueError, QuestionGenerationError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ChatResponse(response=result)


@router.post("/chat-with-system", response_model=ChatResponse)
def chat_with_system_endpoint(body: ChatWithSystemRequest) -> ChatResponse:
    try:
        result = get_llm_client().chat_with_system(
            body.system_prompt, body.user_prompt
        )
    except (ValueError, QuestionGenerationError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ChatResponse(response=result)


@router.post("/chat-json", response_model=ChatJsonResponse)
def chat_json_endpoint(body: ChatJsonRequest) -> ChatJsonResponse:
    try:
        data = get_llm_client().chat_json(
            body.system_prompt,
            body.user_prompt,
            body.json_standard,
        )
    except (ValueError, QuestionGenerationError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ChatJsonResponse(data=data)


@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(
    request: GenerateQuestionsRequest,
) -> GenerateQuestionsResponse:
    started = time.perf_counter()
    logger.info(
        "POST /llm/generate-questions | url=%s | mode=%s",
        request.url,
        request.mode,
    )
    try:
        llm_client = get_llm_client()
        result = await asyncio.to_thread(
            run_full, request.url, llm_client, request.mode
        )
    except PageParseError as exc:
        logger.warning(
            "POST /llm/generate-questions | ошибка валидации | url=%s | detail=%s",
            request.url,
            exc,
        )
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except PageFetchError as exc:
        logger.warning(
            "POST /llm/generate-questions | ошибка загрузки | url=%s | detail=%s",
            request.url,
            exc,
        )
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except QuestionGenerationError as exc:
        logger.error(
            "POST /llm/generate-questions | ошибка LLM | url=%s | detail=%s",
            request.url,
            exc,
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "POST /llm/generate-questions | непредвиденная ошибка | url=%s",
            request.url,
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    logger.info(
        "POST /llm/generate-questions | успех | url=%s | mode=%s | count=%s | "
        "duration=%.2fs",
        result.url,
        result.mode,
        len(result.questions),
        time.perf_counter() - started,
    )
    return GenerateQuestionsResponse(
        url=result.url,
        questions=result.questions,
        page_title=result.page_title,
        mode=result.mode,
    )
