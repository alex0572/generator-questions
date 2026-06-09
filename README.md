# Генератор пользовательских вопросов

Агент по содержанию веб-страницы формирует **5 логичных вопросов**, которые могли бы задать пользователи после прочтения.

Стек: **FastAPI** (бэкенд) + **React/Vite** (фронтенд) + **Docker Compose**. LLM — OpenAI-совместимый [ProxyAPI](https://proxyapi.ru/docs).

## Быстрый старт (Docker)

```bash
cd GENERATOR
cp .env.example .env
# Впишите API_KEY в .env
docker compose up --build -d
```

- Фронтенд (dev): http://localhost:5173
- API: http://localhost:8000/health
- Swagger: http://localhost:8000/docs

## CLI (приёмка по ТЗ)

```bash
pip install -r requirements.txt
cp .env.example .env   # заполните API_KEY
python agent.py https://example.com
python agent.py --quality https://example.com
```

## Dev-режим без Docker

```bash
# Терминал 1 — бэкенд
pip install -r requirements.txt
uvicorn app.main:app --reload

# Терминал 2 — фронтенд
cd frontend && npm install && npm run dev
```

Откройте http://localhost:5173 — Vite обращается к API на :8000.

### Возможности UI

- Режимы **Fast** / **Quality**
- Заголовок страницы из `<title>`
- Экспорт **JSON** и **CSV**
- История последних 5 запросов (localStorage)
- Тёмная / светлая тема
- Примеры URL для быстрого старта

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Проверка живости |
| POST | `/llm/generate-questions` | `{"url": "...", "mode": "fast"}` → полный ответ |

Ответ `POST /llm/generate-questions`:

```json
{
  "url": "https://example.com",
  "questions": ["...", "...", "...", "...", "..."],
  "page_title": "Example Domain",
  "mode": "fast"
}
```

Режимы: `fast` (1 вызов LLM) или `quality` (темы → вопросы, 2 вызова).

### Коды ошибок

| Ситуация | HTTP |
|----------|------|
| Невалидный URL / мало контента | 422 |
| Ошибка загрузки страницы | 502 |
| Ошибка ProxyAPI / LLM | 503 |

## Переменные окружения

Локальная разработка — корневой `.env`:

```env
BASE_URL=https://api.proxyapi.ru/openai/v1
API_KEY=<ключ ProxyAPI>
MODEL=gpt-4o
REQUEST_TIMEOUT=30
MAX_TEXT_CHARS=12000
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Production — `deploy/.env` (дополнительно `DOCKER_USER` для образов на Hub).

## Production (Docker Hub + сервер)

Образы: `<DOCKER_USER>/questions-backend` и `<DOCKER_USER>/questions-frontend`.  
`DOCKER_USER` задаётся в `deploy/.env` (в git не коммитится).

### Сборка и публикация (dev-машина)

```powershell
# В deploy/.env: DOCKER_USER=ваш_ник на Hub, API_KEY для локальных тестов при необходимости
docker login
cd deploy
.\build-and-push.ps1
```

Linux / Git Bash:

```bash
docker login
cd deploy
chmod +x build-and-push.sh
./build-and-push.sh
```

### Развёртывание на сервере

На сервер копируется только `deploy/`. Исходники не нужны.

```powershell
# С Windows
scp -r deploy root@<IP>:/opt/user-questions/
```

```bash
cd /opt/user-questions/deploy
cp .env.example .env && nano .env   # DOCKER_USER, API_KEY, MODEL
sed -i 's/\r$//' .env *.sh          # обязательно после scp с Windows
chmod 600 .env
chmod +x healthwatch.sh setup-healthwatch-cron.sh update-containers.sh
mkdir -p logs
docker compose pull && docker compose up -d
```

Проверка: `http://<IP>/` и `curl -s http://127.0.0.1/health`.

### Мониторинг (healthwatch)

```bash
./setup-healthwatch-cron.sh   # /health каждые 5 мин, автоперезапуск при сбое
crontab -l
./healthwatch.sh              # ручной запуск
tail -f healthwatch.log healthwatch-cron.log
```

Обновление после новой сборки:

```bash
./update-containers.sh
# или: docker compose pull && docker compose up -d
```

Полная инструкция, troubleshooting (CRLF, 401 API Key, HTTPS): **[deploy/DEPLOY.md](deploy/DEPLOY.md)**

## Структура

```
GENERATOR/
├── app/
│   ├── main.py
│   ├── routers/llm.py
│   └── services/
│       ├── llm_client.py
│       └── question_generator.py
├── agent.py                 # CLI: python agent.py <url>
├── frontend/                # React UI
├── deploy/                  # Production compose, healthwatch, build-and-push
│   ├── docker-compose.yml
│   ├── healthwatch.sh
│   ├── setup-healthwatch-cron.sh
│   └── DEPLOY.md
└── docker-compose.yml       # Dev hot-reload
```
