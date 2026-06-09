"""Настройка логирования приложения (консоль и опционально файл)."""

import logging
import os
import sys
from pathlib import Path

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def setup_logging() -> None:
    """Инициализирует логирование один раз при старте приложения."""
    global _configured
    if _configured:
        return

    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    handlers: list[logging.Handler] = []

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    handlers.append(console)

    log_file = os.getenv("LOG_FILE", "").strip()
    if log_file:
        path = Path(log_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(path, encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
        handlers.append(file_handler)

    logging.basicConfig(level=level, handlers=handlers, force=True)
    logging.getLogger("app").setLevel(level)

    root = logging.getLogger()
    destinations = ["console"]
    if log_file:
        destinations.append(str(Path(log_file).resolve()))
    logging.getLogger("app").info(
        "Логирование включено: level=%s, вывод=%s",
        level_name,
        ", ".join(destinations),
    )

    _configured = True
