# backend/app/routers/ai.py

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ml.models.baseline import generate_flashcards
from ml.tracing.langfuse_config import trace_generation

router = APIRouter()


class GenerateRequest(BaseModel):
    """
    Входная модель для генерации карточек.
    text — это учебный материал (упрощённо: обычный текст).
    """
    text: str


class Flashcard(BaseModel):
    """
    Одна карточка (вопрос-ответ).
    В MVP используем только question/answer.
    """
    question: str
    answer: str


class GenerateResponse(BaseModel):
    """
    Ответ сервиса генерации: список карточек.
    """
    cards: List[Flashcard]


@router.post("/generate", response_model=GenerateResponse)
async def generate_cards(payload: GenerateRequest) -> GenerateResponse:
    """
    Эндпоинт для генерации карточек на основе текста.

    Внутри:
    - вызывает baseline-модель из ml/models/baseline.py;
    - опционально отправляет данные в систему трассировки (Langfuse stub).
    """
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст для генерации пустой")

    # 1) вызываем baseline-модель
    cards_data = generate_flashcards(text)

    # 2) отправляем данные в "трассировку" (сейчас это просто заглушка)
    trace_generation(prompt=text, cards=cards_data)

    # 3) преобразуем словари в Pydantic-модели для ответа API
    cards = [Flashcard(**card) for card in cards_data]

    return GenerateResponse(cards=cards)
