# Courtly — система управления спортивными центрами

Веб-приложение для автоматизации работы спортивного центра: онлайн-бронирование залов и кортов, личные кабинеты по ролям, CRM, платежи и аналитика для руководства.

**Стек:** React (Vite) · Django REST Framework · PostgreSQL · Docker Compose

## О проекте

Courtly — информационная система, которая объединяет в одном веб-приложении процессы, которые в типичном центре часто ведутся вручную: запись по телефону и в мессенджерах, учёт в Excel, разрозненные таблицы по клиентам и оплатам.

### Возможности

| Область | Что реализовано |
|---------|-----------------|
| Инфраструктура | Филиалы, залы (корты), расписание, временные слоты, мероприятия |
| Бронирование | Онлайн-запись с проверкой занятости и контролем пересечений по времени |
| Пользователи | Четыре роли с разграничением прав доступа (RBAC) |
| CRM | Карточки клиентов, журнал записей, история бронирований и платежей |
| Финансы | Статусы оплаты, обработка платёжных webhook-ов |
| Аналитика | KPI и обзорные отчёты для руководства центра |

### Роли и маршруты

| Роль | Маршрут | Основные задачи |
|------|---------|-----------------|
| Клиент | `/app` | Запись на зал, история бронирований, оплата |
| Тренер | `/trainer` | Расписание занятий, доступность, отметка сессий, выплаты |
| Администратор | `/admin` | Журнал записей, CRM, слоты, залы, мероприятия, чат |
| Руководитель | `/director` | Обзор и KPI, филиалы, уведомления, чек-листы |

### Архитектура

Клиент-серверная трёхуровневая схема:

- **Frontend** — SPA на React + Vite; маршрутизация по ролям.
- **Backend** — Django + DRF: REST API, бизнес-логика бронирования, CRM, платежи, аутентификация.
- **Данные** — PostgreSQL; все сервисы поднимаются через Docker Compose.

Автотесты backend: **93** сценария (`api.tests`), все проходят успешно.

## Демонстрация

Записи экрана по сценариям защиты ВКР. Файлы лежат в каталоге [`videos/`](./videos/).

### Клиент (`/app`)

| Сценарий | Видео |
|----------|-------|
| Вход | [Вход.mp4](./videos/Клиент/Вход.mp4) |
| Запись через панель (drawer) | [Запись через панель.mp4](./videos/Клиент/Запись%20через%20панель.mp4) |
| Запись через фильтры | [Запись через фильтры.mp4](./videos/Клиент/Запись%20через%20фильтры.mp4) |
| Просмотр истории | [Просмотр истории.mp4](./videos/Клиент/Просмотр%20истории.mp4) |

### Администратор (`/admin`)

| Сценарий | Видео |
|----------|-------|
| База клиентов | [База клиентов.mp4](./videos/Админ/База%20клиентов.mp4) |
| Добавление новой записи | [Добавление новой записи.mp4](./videos/Админ/Добавление%20новой%20записи.mp4) |
| Чат | [Чат.mp4](./videos/Админ/Чат.mp4) |

### Тренер (`/trainer`)

| Сценарий | Видео |
|----------|-------|
| Доступность | [Доступность.mp4](./videos/Тренер/Доступность.mp4) |
| Чат | [Чат.mp4](./videos/Тренер/Чат.mp4) |

### Руководитель (`/director`)

| Сценарий | Видео |
|----------|-------|
| Обзор | [Обзор.mp4](./videos/Руководитель/Обзор.mp4) |
| Уведомления | [Уведы.mp4](./videos/Руководитель/Уведы.mp4) |
| Чек-лист | [Чек-лист.mp4](./videos/Руководитель/Чек-лист.mp4) |
| Создание филиала | [Создание филиала.mp4](./videos/Руководитель/Создание%20филиала.mp4) |

## Структура репозитория

| Путь | Назначение |
|------|------------|
| `frontend/` | SPA (Vite + React) |
| `backend/` | Django 5, приложение `api` |
| `docker-compose.yml` | PostgreSQL, backend, frontend для локальной разработки |
| `.env.example` | Пример переменных для Docker и локального запуска |
| `videos/` | Screencast для презентации и защиты ВКР |

## Требования

- **С Docker:** Docker Engine + Docker Compose v2.
- **Без Docker:** Python 3.12+ (или 3.11+), Node.js 20+, PostgreSQL 16+.

## Быстрый старт (Docker)

1. Скопируйте окружение и при необходимости отредактируйте секреты:

   ```bash
   cp .env.example .env
   ```

2. Поднимите сервисы (БД, API, фронт):

   ```bash
   docker compose up --build
   ```

3. В **новом терминале** примените миграции и демо-данные:

   ```bash
   docker compose exec backend python manage.py migrate
   docker compose exec backend python manage.py seed_full_database
   ```

   Либо по шагам: `seed_demo_users` (роли и доступ к филиалам `1` и `2`), затем `seed_journal_demo` (плотное расписание на текущий месяц). Логины: `client.courtly.demo@courtly.demo`, `trainer.courtly.demo@…`, `admin.…`, `director.…` — пароль `CourtlyDemo1!`.

4. Откройте в браузере:

   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API health: [http://localhost:8000/api/health/ready/](http://localhost:8000/api/health/ready/)
   - OpenAPI JSON: [http://localhost:8000/api/openapi.json](http://localhost:8000/api/openapi.json) (дублируется под `/api/v1/openapi.json`)

## Локальный запуск без Docker (кратко)

1. Запустите PostgreSQL (или только БД из compose: `docker compose up -d db`).
2. В `.env` укажите доступ с хоста, например: `POSTGRES_HOST=127.0.0.1`, `POSTGRES_PORT=15432` (см. комментарии в `.env.example`).
3. Backend:

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_full_database
   python manage.py runserver 0.0.0.0:8000
   ```

4. Frontend:

   ```bash
   cd frontend
   npm ci
   set VITE_API_URL=http://localhost:8000
   set VITE_USE_API=true
   npm run dev
   ```

## Тесты

**В Docker** (рекомендуется, БД уже в сети `db:5432`):

```bash
docker compose exec backend python manage.py test api.tests --verbosity 1
```

**На хосте** (должен быть доступен PostgreSQL с теми же `POSTGRES_*`, что в `.env`):

```bash
cd backend
python manage.py test api.tests --verbosity 1
```

Проверка фронта:

```bash
cd frontend && npm ci && npm run build
```

## Документация API

- Спецификация OpenAPI 3.0: `GET /api/openapi.json`.
- Аутентификация: заголовок `Authorization: Token <key>`.
- Версионирование: префикс `/api/v1/`; пути `/api/` с заголовками deprecation.

## Pull Request / CI

- Required checks: `test-backend`, `test-frontend`.
- Backend: `makemigrations --check --dry-run`, `python manage.py test api.tests`.
- Frontend: `npm ci`, `npm run build`.

## Прочее

- **Лимиты запросов:** `auth`, `profile`, `booking_write`, `booking_mutate` (см. `backend/api/throttling.py`).
- **Сброс пароля:** `POST /api/auth/password-reset/request/` и `.../confirm/`.
- **Логи:** JSON, `request_id`, заголовок `X-Request-ID`.
- **Sentry:** `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` в `.env.example`.
