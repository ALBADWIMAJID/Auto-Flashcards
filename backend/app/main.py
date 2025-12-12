# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# импортируем все нужные роутеры
from .routers import ai, decks
from .routers import review, stats, profile
from .exceptions import init_exception_handlers

# Создаём экземпляр FastAPI-приложения
app = FastAPI(
    title="Auto-Flashcards API",
    description="MVP прототип backend-сервиса для проекта Auto-Flashcards (роль: Fullstack)",
    version="0.1.0",
)

# Настройка CORS (для фронтенда на http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔹 Регистрируем глобальные обработчики ошибок
init_exception_handlers(app)


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    """
    Простой health-check эндпоинт.
    Нужен, чтобы быстро проверить, что backend запустился и отвечает.
    """
    return {"status": "ok"}


# Подключаем роутеры

# AI baseline
app.include_router(ai.router, prefix="/ai", tags=["ai"])

# Колоды и карточки
app.include_router(decks.router, prefix="/decks", tags=["decks"])

# Режим повторения (UC-3)
app.include_router(review.router, prefix="/review", tags=["review"])

# Статистика обучения (UC-4)
app.include_router(stats.router, prefix="/stats", tags=["stats"])

# Профиль пользователя (UC-5)
app.include_router(profile.router, prefix="/profile", tags=["profile"])
