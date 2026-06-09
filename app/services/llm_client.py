"""Клиент для общения с LLM через Proxy API (OpenAI-совместимый)."""

import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

load_dotenv()

logger = logging.getLogger(__name__)


class QuestionGenerationError(Exception):
    """Ошибка генерации вопросов через LLM."""


_RETRYABLE_LLM_ERRORS = (
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
)


class LLMClient:
    """Обёртка над OpenAI-совместимым Proxy API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.base_url = (base_url or os.getenv("BASE_URL", "")).strip()
        self.api_key = (api_key or os.getenv("API_KEY", "")).strip()
        self.model = (model or os.getenv("MODEL", "gpt-4o")).strip()
        self.system_prompt: Optional[str] = None
        self.max_tokens: int = 1024

        if not self.base_url:
            raise ValueError("base_url не задан (параметр или переменная BASE_URL)")
        if not self.api_key:
            raise ValueError("api_key не задан (параметр или переменная API_KEY)")

        self._client = OpenAI(
            base_url=self.base_url.rstrip("/"),
            api_key=self.api_key,
            default_headers={"Authorization": f"Bearer {self.api_key}"},
        )

    @retry(
        retry=retry_if_exception_type(_RETRYABLE_LLM_ERRORS),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    def _create_completion(self, **kwargs) -> str:
        try:
            response = self._client.chat.completions.create(**kwargs)
        except (AuthenticationError, BadRequestError) as exc:
            raise QuestionGenerationError(f"Ошибка LLM API: {exc}") from exc
        except _RETRYABLE_LLM_ERRORS:
            logger.warning("Повтор запроса к LLM после временной ошибки")
            raise
        except Exception as exc:
            raise QuestionGenerationError(f"Ошибка LLM API: {exc}") from exc

        content = response.choices[0].message.content
        return content or ""

    def chat(self, prompt: str) -> str:
        messages: list[dict[str, str]] = []
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        messages.append({"role": "user", "content": prompt})

        return self._create_completion(
            model=self.model,
            messages=messages,
            max_tokens=self.max_tokens,
        )

    def chat_with_system(self, system_prompt: str, user_prompt: str) -> str:
        return self._create_completion(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=self.max_tokens,
        )

    def chat_json(
        self, system_prompt: str, user_prompt: str, json_standard: str
    ) -> dict:
        full_system = (
            f"{system_prompt}\n\n"
            f"Ответ должен быть валидным JSON и соответствовать схеме:\n{json_standard}"
        )
        content = self._create_completion(
            model=self.model,
            messages=[
                {"role": "system", "content": full_system},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=self.max_tokens,
            response_format={"type": "json_object"},
        )
        try:
            return json.loads(content or "{}")
        except json.JSONDecodeError as exc:
            raise QuestionGenerationError("LLM вернул невалидный JSON") from exc


if __name__ == "__main__":
    client = LLMClient()
    client.system_prompt = "Ты краткий помощник. Отвечай на русском."
    client.max_tokens = 256

    print("=== chat ===")
    print(client.chat("Назови столицу Франции одним словом."))
