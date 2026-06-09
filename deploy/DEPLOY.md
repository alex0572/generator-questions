# Деплой на сервер (Docker Hub + мониторинг)

Production-развёртывание: образы с Docker Hub, на сервере только папка `deploy/` и `.env`. Исходный код на сервере не нужен.

## Образы

| Сервис | Имя образа | Порт |
|--------|------------|------|
| Backend | `${DOCKER_USER}/questions-backend:latest` | внутренний |
| Frontend | `${DOCKER_USER}/questions-frontend:latest` | 80 |

`DOCKER_USER` — ник на Docker Hub, задаётся в `deploy/.env` (файл в `.gitignore`, в репозиторий не коммитится).

Оба сервиса в сети `questions-network`. Nginx во frontend проксирует `/llm/*` и `/health` на `backend:8000`.

## 1. Публикация образов (машина разработчика)

В `deploy/.env`:

```env
DOCKER_USER=ваш_ник_на_docker_hub
```

**Windows (PowerShell):**

```powershell
docker login
cd deploy
.\build-and-push.ps1
```

**Linux / Git Bash:**

```bash
docker login
cd deploy
chmod +x build-and-push.sh
./build-and-push.sh
```

## 2. Что копировать на сервер

Минимальный набор:

```
deploy/
├── docker-compose.yml
├── .env.example          → скопировать в .env на сервере
├── healthwatch.sh
├── setup-healthwatch-cron.sh
├── update-containers.sh
└── setup-cron.sh         (опционально — автообновление образов)
```

**С Windows (PowerShell):**

```powershell
scp -r deploy/ user@<IP_СЕРВЕРА>:/opt/user-questions/
```

После копирования с Windows **обязательно** убрать CRLF (иначе `source .env` и shebang в `.sh` ломаются):

```bash
cd /opt/user-questions/deploy
sed -i 's/\r$//' .env *.sh
```

В репозитории для `.sh` и `.env` заданы LF через `.gitattributes`; при `scp` с Windows файлы всё равно могут приехать с `\r`.

## 3. Первичная настройка сервера (Ubuntu 20.04)

Установка Docker (один раз):

```bash
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl gnupg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu focal stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Перелогиньтесь после `usermod`.

Развёртывание приложения:

```bash
sudo mkdir -p /opt/user-questions
sudo chown $USER:$USER /opt/user-questions

cd /opt/user-questions/deploy
cp .env.example .env
nano .env   # DOCKER_USER, BASE_URL, API_KEY, MODEL=gpt-4o
chmod 600 .env

mkdir -p logs
sed -i 's/\r$//' .env *.sh
chmod +x healthwatch.sh setup-healthwatch-cron.sh update-containers.sh setup-cron.sh

docker compose pull
docker compose up -d
docker compose ps
```

Проверка:

| Что | URL |
|-----|-----|
| UI | `http://<IP_СЕРВЕРА>/` |
| Health | `http://<IP_СЕРВЕРА>/health` → `{"status":"ok"}` |
| Swagger | `http://<IP_СЕРВЕРА>/docs` |
| Health локально на сервере | `curl -s http://127.0.0.1/health` |

Сайт работает по **HTTP**. Без сертификата HTTPS в браузере не откроется — это ожидаемо.

## 4. Мониторинг и автоперезапуск

Три уровня защиты:

| Уровень | Что делает |
|---------|------------|
| `restart: unless-stopped` | Docker перезапускает контейнер при падении процесса |
| `healthcheck` в compose | Проверка backend и frontend каждые 30 с |
| `healthwatch.sh` + cron | Каждые 5 мин: запрос `/health`, при сбое — `compose down && up -d` |

Установка cron (один раз):

```bash
cd /opt/user-questions/deploy
./setup-healthwatch-cron.sh
```

Ожидаемый вывод:

```
Healthwatch cron установлен:
  */5 * * * * /opt/user-questions/deploy/healthwatch.sh >> /opt/user-questions/deploy/healthwatch-cron.log 2>&1
```

Проверка и логи:

```bash
crontab -l
./healthwatch.sh
tail -f healthwatch.log
tail -f healthwatch-cron.log
```

Переменные для `healthwatch.sh` (опционально, в `.env` или окружении):

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `HEALTH_URL` | `http://127.0.0.1/health` | URL проверки |
| `HEALTH_RETRIES` | `2` | Повторы перед перезапуском |
| `HEALTH_RETRY_DELAY` | `5` | Пауза между повторами (сек) |

### Типичные ошибки

| Симптом | Причина | Решение |
|---------|---------|---------|
| `$'\r': command not found` при `./healthwatch.sh` | CRLF в `.env` или `.sh` | `sed -i 's/\r$//' .env *.sh` |
| `bash\r: No such file or directory` | CRLF в shebang скрипта | `sed -i 's/\r$//' *.sh` |
| Push в `your-docker-hub-username/...` | Нет `DOCKER_USER` в `deploy/.env` | Заполнить `deploy/.env` и пересобрать |
| `Invalid API Key` (401) | Неверный ключ в `.env` на сервере, placeholder, или CRLF в `API_KEY` | См. раздел ниже |

### Ошибка 401 Invalid API Key

Ключ читается из `deploy/.env` на **сервере** (не из образа Docker). Проверка:

```bash
cd /opt/user-questions/deploy
sed -i 's/\r$//' .env
grep '^API_KEY=' .env          # не должно быть your_proxyapi_key
docker compose exec backend python -c "import os; k=os.getenv('API_KEY',''); print('len', len(k))"
```

Длина ключа должна совпадать с рабочим ключом из [ProxyAPI](https://proxyapi.ru/). После правки `.env` пересоздайте backend (иначе старые переменные останутся в процессе):

```bash
docker compose up -d --force-recreate backend
```

Скопировать `.env` с dev-машины (если ключ там уже рабочий):

```powershell
scp D:\CURSOR\GENERATOR\deploy\.env root@<IP_СЕРВЕРА>:/opt/user-questions/deploy/.env
```

На сервере после `scp`:

```bash
sed -i 's/\r$//' .env
chmod 600 .env
docker compose up -d --force-recreate backend
```

## 5. Обновление образов

После `build-and-push` на dev-машине:

```bash
cd /opt/user-questions/deploy
./update-containers.sh
# или вручную:
docker compose pull && docker compose up -d
```

Автообновление по cron (опционально):

```bash
./setup-cron.sh
```

Лог обновлений: `update.log`.

## 6. Локальная разработка

Корневой `docker-compose.yml` — hot-reload, порты 5173/8000.

Production-образы: `Dockerfile.prod`, `frontend/Dockerfile.prod`.
