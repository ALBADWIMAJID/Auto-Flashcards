# backend/app/routers/ai.py

from typing import List

from fastapi import APIRouter, HTTPException

from ml.service.flashcards_service import (
    flashcards_service,
    FlashcardsRequest,
)
from ml.api.schemas import (
    Flashcard,
    GenerateFlashcardsRequest,
    GenerateFlashcardsResponse,
)

router = APIRouter()


@router.post(
    "/generate",
    response_model=GenerateFlashcardsResponse,
    summary="Генерация флеш-карточек из текста",
)
async def generate_flashcards_endpoint(
    payload: GenerateFlashcardsRequest,
) -> GenerateFlashcardsResponse:
    """
    Эндпоинт для генерации флеш-карточек по учебному тексту.

    Вход:
    - text: исходный текст
    - max_cards: максимум карточек

    Выход:
    - cards: список {question, answer}
    - cached: был ли результат взят из кэша
    - latency_ms: сколько миллисекунд заняла генерация
    """
    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="Текст для генерации пустой",
        )

    # 1) Формируем запрос к сервису
    service_request = FlashcardsRequest(
        text=text,
        max_cards=payload.max_cards,
    )

    # 2) Вызываем слой сервиса (с кэшем, latency и Langfuse-трейсами)
    result = flashcards_service.generate(service_request)

    # 3) Преобразуем словари в Pydantic-модели
    cards_models: List[Flashcard] = [
        Flashcard(**card) for card in result.cards
    ]

    # 4) Возвращаем расширенный ответ (совместимый с Lab 3)
    return GenerateFlashcardsResponse(
        cards=cards_models,
        cached=result.cached,
        latency_ms=result.latency_ms,
    )
