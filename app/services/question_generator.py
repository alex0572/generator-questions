"""Агент генерации пользовательских вопросов по содержанию веб-страницы."""

from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from app.services.llm_client import LLMClient, QuestionGenerationError

logger = logging.getLogger(__name__)

GenerationMode = Literal["fast", "quality"]

QUESTIONS_JSON_SCHEMA = (
    '{"questions": ["string", "string", "string", "string", "string"]}'
)
TOPICS_JSON_SCHEMA = '{"topics": ["string", "string", "string"]}'
SYSTEM_PROMPT = (
    "Ты обычный пользователь сайта. Прочитай текст страницы и сформулируй "
    "ровно 5 логичных вопросов на русском, которые возникли бы после прочтения. "
    "Вопросы должны быть связаны с содержанием страницы."
)
QUALITY_TOPICS_PROMPT = (
    "Ты аналитик контента. Прочитай текст страницы и выдели 3–5 ключевых тем, "
    "которые могут вызвать вопросы у читателя. Темы должны быть конкретными."
)
QUALITY_QUESTIONS_PROMPT = (
    "Ты обычный пользователь сайта. На основе текста страницы и выделенных тем "
    "сформулируй ровно 5 логичных вопросов на русском. "
    "Вопросы должны охватывать разные темы и быть связаны с содержанием."
)
RETRY_PROMPT_SUFFIX = (
    "\n\nВажно: в ответе должно быть ровно 5 непустых вопросов в массиве questions."
)

MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_CHARS", "12000"))
MIN_TEXT_LENGTH = 200
FETCH_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "30"))
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
GENERATOR_MAX_TOKENS = 2048
LOG_PREVIEW_LENGTH = 300


class PageFetchError(Exception):
    """Ошибка загрузки страницы."""


class PageParseError(Exception):
    """Ошибка извлечения текста из HTML."""


@dataclass
class GenerationResult:
    url: str
    questions: list[str]
    page_title: str | None
    mode: GenerationMode


def _preview(text: str, limit: int = LOG_PREVIEW_LENGTH) -> str:
    one_line = " ".join(text.split())
    if len(one_line) <= limit:
        return one_line
    return f"{one_line[:limit]}…"


def _normalize_url(url: str) -> str:
    cleaned = url.strip()
    if not cleaned:
        raise PageParseError("URL не указан")
    if cleaned.startswith("://") or ":///" in cleaned:
        raise PageParseError("Некорректный URL")
    parsed = urlparse(cleaned)
    if not parsed.scheme:
        cleaned = f"https://{cleaned}"
        parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise PageParseError("Некорректный URL")
    host = parsed.netloc.split("@")[-1].split(":")[0]
    if not host or host.startswith(".") or ".." in host:
        raise PageParseError("Некорректный URL")
    return cleaned


def _is_retryable_http_error(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 500, 502, 503, 504)
    return isinstance(exc, (httpx.ConnectError, httpx.TimeoutException))


@retry(
    retry=retry_if_exception(_is_retryable_http_error),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _fetch_html_once(url: str) -> httpx.Response:
    with httpx.Client(
        timeout=FETCH_TIMEOUT,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        return response


def fetch_html(url: str) -> str:
    """Скачивает HTML по URL."""
    normalized = _normalize_url(url)
    logger.info("Загрузка HTML | url=%s", normalized)
    started = time.perf_counter()
    try:
        response = _fetch_html_once(normalized)
    except httpx.HTTPError as exc:
        logger.error("Ошибка загрузки | url=%s | error=%s", normalized, exc)
        raise PageFetchError(f"Не удалось скачать страницу: {exc}") from exc

    content_type = response.headers.get("content-type", "")
    html = response.text
    if "text" not in content_type and "html" not in content_type:
        if not html.strip():
            raise PageFetchError("Пустой ответ от сервера")

    if not html.strip():
        raise PageFetchError("Пустой HTML")

    logger.info(
        "HTML загружен | url=%s | status=%s | bytes=%s | duration=%.2fs",
        normalized,
        response.status_code,
        len(html.encode("utf-8", errors="replace")),
        time.perf_counter() - started,
    )
    return html


def extract_page_title(html: str) -> str | None:
    """Извлекает заголовок страницы из тега <title>."""
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return None
    if title_tag := soup.find("title"):
        title = title_tag.get_text(strip=True)
        return title or None
    return None


def html_to_text(html: str) -> str:
    """Очищает HTML, оставляя только текст."""
    logger.info("Извлечение текста | html_chars=%s", len(html))
    started = time.perf_counter()
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception as exc:
        raise PageParseError(f"Не удалось разобрать HTML: {exc}") from exc

    for tag in soup(["script", "style", "noscript", "svg", "meta", "link"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text).strip()

    if len(text) < MIN_TEXT_LENGTH:
        raise PageParseError(
            f"Недостаточно текста на странице (минимум {MIN_TEXT_LENGTH} символов)"
        )

    truncated = len(text) > MAX_TEXT_LENGTH
    result = text[:MAX_TEXT_LENGTH]
    logger.info(
        "Текст извлечён | chars=%s | truncated=%s | duration=%.2fs | preview=%r",
        len(result),
        truncated,
        time.perf_counter() - started,
        _preview(result),
    )
    return result


def _extract_questions(data: dict) -> list[str]:
    raw = data.get("questions") or []
    if not isinstance(raw, list):
        raise QuestionGenerationError("LLM вернул некорректный формат вопросов")
    questions = [str(item).strip() for item in raw if str(item).strip()]
    if len(questions) != 5:
        raise QuestionGenerationError(
            f"Ожидалось 5 вопросов, получено {len(questions)}"
        )
    return questions


def _extract_topics(data: dict) -> list[str]:
    raw = data.get("topics") or []
    if not isinstance(raw, list):
        raise QuestionGenerationError("LLM вернул некорректный формат тем")
    topics = [str(item).strip() for item in raw if str(item).strip()]
    if not topics:
        raise QuestionGenerationError("LLM не вернул темы для анализа")
    return topics


def _with_max_tokens(llm_client: LLMClient, fn):
    original = llm_client.max_tokens
    llm_client.max_tokens = GENERATOR_MAX_TOKENS
    try:
        return fn()
    finally:
        llm_client.max_tokens = original


def _generate_questions_fast(
    page_text: str,
    llm_client: LLMClient,
    *,
    extra_system_suffix: str = "",
) -> list[str]:
    def _call():
        data = llm_client.chat_json(
            system_prompt=SYSTEM_PROMPT + extra_system_suffix,
            user_prompt=page_text,
            json_standard=QUESTIONS_JSON_SCHEMA,
        )
        return _extract_questions(data)

    return _with_max_tokens(llm_client, _call)


def _generate_questions_quality(page_text: str, llm_client: LLMClient) -> list[str]:
    def _call():
        topics_data = llm_client.chat_json(
            system_prompt=QUALITY_TOPICS_PROMPT,
            user_prompt=page_text,
            json_standard=TOPICS_JSON_SCHEMA,
        )
        topics = _extract_topics(topics_data)
        logger.info("Quality mode: темы=%s", topics)

        user_prompt = (
            f"Текст страницы:\n{page_text}\n\n"
            f"Ключевые темы:\n" + "\n".join(f"- {t}" for t in topics)
        )
        data = llm_client.chat_json(
            system_prompt=QUALITY_QUESTIONS_PROMPT,
            user_prompt=user_prompt,
            json_standard=QUESTIONS_JSON_SCHEMA,
        )
        return _extract_questions(data)

    return _with_max_tokens(llm_client, _call)


def _generate_questions(
    page_text: str,
    llm_client: LLMClient,
    mode: GenerationMode,
) -> list[str]:
    if mode == "quality":
        try:
            return _generate_questions_quality(page_text, llm_client)
        except QuestionGenerationError:
            logger.warning("Quality mode: повтор с fast-промптом")
            return _generate_questions_fast(page_text, llm_client)

    try:
        return _generate_questions_fast(page_text, llm_client)
    except QuestionGenerationError:
        logger.warning("Повторная генерация с уточняющим промптом")
        return _generate_questions_fast(
            page_text,
            llm_client,
            extra_system_suffix=RETRY_PROMPT_SUFFIX,
        )


def run_full(
    url: str,
    llm_client: LLMClient | None = None,
    mode: GenerationMode = "fast",
) -> GenerationResult:
    """Полный результат генерации для API."""
    pipeline_started = time.perf_counter()
    logger.info("=== Генерация вопросов: старт === | url=%s | mode=%s", url, mode)

    client = llm_client or LLMClient()
    normalized = _normalize_url(url)
    html = fetch_html(url)
    page_title = extract_page_title(html)
    page_text = html_to_text(html)
    questions = _generate_questions(page_text, client, mode)

    logger.info(
        "=== Генерация вопросов: успешно === | url=%s | mode=%s | title=%r | "
        "duration=%.2fs",
        normalized,
        mode,
        page_title,
        time.perf_counter() - pipeline_started,
    )
    return GenerationResult(
        url=normalized,
        questions=questions,
        page_title=page_title,
        mode=mode,
    )


def run(
    url: str,
    llm_client: LLMClient | None = None,
    mode: GenerationMode = "fast",
) -> list[str]:
    """Точка входа агента по ТЗ — возвращает только список вопросов."""
    return run_full(url, llm_client, mode).questions
