"""CLI-точка входа агента: python agent.py [--quality] <url>"""

from __future__ import annotations

import argparse
import sys

from app.services.llm_client import QuestionGenerationError
from app.services.question_generator import (
    GenerationMode,
    PageFetchError,
    PageParseError,
    run_full,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Генератор пользовательских вопросов по URL страницы",
    )
    parser.add_argument("url", help="URL веб-страницы")
    parser.add_argument(
        "--quality",
        action="store_true",
        help="Режим quality: 2 шага LLM (темы → вопросы)",
    )
    args = parser.parse_args()

    mode: GenerationMode = "quality" if args.quality else "fast"
    try:
        result = run_full(args.url, mode=mode)
    except PageParseError as exc:
        print(f"Ошибка: {exc}", file=sys.stderr)
        return 1
    except PageFetchError as exc:
        print(f"Ошибка загрузки: {exc}", file=sys.stderr)
        return 1
    except QuestionGenerationError as exc:
        print(f"Ошибка генерации: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"Ошибка конфигурации: {exc}", file=sys.stderr)
        return 1

    if result.page_title:
        print(f"Страница: {result.page_title}")
    print(f"Режим: {result.mode}")
    print()
    for index, question in enumerate(result.questions, start=1):
        print(f"{index}. {question}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
