# ml/api/schemas.py

from __future__ import annotations

from typing import List
from pydantic import BaseModel


class Flashcard(BaseModel):
    """
    Одна флеш-карточка.
    """
    question: str
    answer: str


class GenerateFlashcardsRequest(BaseModel):
    """
    Входная модель для API-слоя LLM-сервиса.
    """
    text: str
    max_cards: int = 5


class GenerateFlashcardsResponse(BaseModel):
    """
    Ответ API: список карточек + метаданные.
    """
    cards: List[Flashcard]
    cached: bool
    latency_ms: float
