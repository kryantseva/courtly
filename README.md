# Courtly — система управления спортивными центрами

## О проекте

Веб-приложение для автоматизации работы спортивного центра: онлайн-бронирование залов и кортов, личные кабинеты по ролям, CRM, платежи и аналитика для руководства. Проект состоит из:

- **Backend:** Django + Django REST Framework + PostgreSQL (REST API, бизнес-логика, токен-авторизация)
- **Frontend:** React + Vite (SPA с маршрутизацией по ролям)
- **Инфраструктура:** Docker Compose для локальной разработки

## Основные возможности

- Онлайн-бронирование залов и кортов с проверкой занятости
- Четыре роли пользователей: клиент, тренер, администратор, руководитель
- CRM: карточки клиентов, журнал записей, история бронирований и платежей
- Управление филиалами, расписанием, слотами и мероприятиями
- Обработка платежей и webhook-ов
- Аналитика и KPI для руководства центра
- Встроенный чат между участниками

### Роли и маршруты

| Роль | Маршрут | Основные задачи |
|------|---------|-----------------|
| Клиент | `/app` | Запись на зал, история бронирований, оплата |
| Тренер | `/trainer` | Расписание занятий, доступность, выплаты |
| Администратор | `/admin` | Журнал записей, CRM, слоты, залы, чат |
| Руководитель | `/director` | Обзор и KPI, филиалы, уведомления, чек-листы |

## Видеообзор

https://drive.google.com/file/d/1z9TK90pLipNgDop8q1LGML5igUIX1XOC/view?usp=sharing

---

## Быстрый старт (локально, через Docker Compose)

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/yourusername/courtly.git
cd courtly
```

### 2. Настройте переменные окружения

Скопируйте пример и при необходимости отредактируйте секреты:

```bash
cp .env.example .env
```

Основные переменные в `.env`:

```env
POSTGRES_DB=courtly
POSTGRES_USER=courtly
POSTGRES_PASSWORD=courtly
POSTGRES_HOST=db
POSTGRES_PORT=5432

DJANGO_SECRET_KEY=your_secret_key
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend

VITE_USE_API=true
VITE_API_URL=http://localhost:8000
```

### 3. Запустите проект

```bash
docker compose up --build
```

- Backend будет доступен на [http://localhost:8000](http://localhost:8000)
- Frontend — на [http://localhost:5173](http://localhost:5173)

### 4. Наполнение тестовыми данными

В **новом терминале** выполните:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_full_database
```

Демо-аккаунты (пароль `CourtlyDemo1!`):

- `client.courtly.demo@courtly.demo` — клиент
- `trainer.courtly.demo@courtly.demo` — тренер
- `admin.courtly.demo@courtly.demo` — администратор
- `director.courtly.demo@courtly.demo` — руководитель

---

## Ручной запуск (без Docker)

1. Установите Python 3.11+, Node.js 20+, PostgreSQL 16+
2. Запустите PostgreSQL (или только БД из compose: `docker compose up -d db`)
3. Создайте `.env` по образцу `.env.example`. Для доступа с хоста укажите `POSTGRES_HOST=127.0.0.1` и `POSTGRES_PORT=15432`
4. Backend:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate   # или .venv\Scripts\activate на Windows
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_full_database
   python manage.py runserver 0.0.0.0:8000
   ```

5. Frontend:

   ```bash
   cd frontend
   npm ci
   set VITE_API_URL=http://localhost:8000   # Windows
   set VITE_USE_API=true
   npm run dev
   ```

---

## Как создать .env файлы

- Скопируйте `.env.example` в `.env` в корне репозитория
- Не храните реальные секреты в публичном репозитории!
- Переменные `VITE_*` используются фронтендом; остальные — backend и Docker Compose

---

## Тесты

**Backend** (в Docker):

```bash
docker compose exec backend python manage.py test api.tests --verbosity 1
```

**Frontend:**

```bash
cd frontend && npm ci && npm run build
```

---

## Контакты

- Автор: https://t.me/kryantseva
- Email: marshmallowiangel@mail.ru

---

**Удачи!**
