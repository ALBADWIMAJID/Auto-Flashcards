from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

# Используем общую "базу" из decks.py, чтобы уметь сбрасывать прогресс
from .decks import DECKS_DB, CardSRS

router = APIRouter()


class Profile(BaseModel):
    """
    Настройки профиля пользователя (UC-5).
    В рамках MVP храним профиль просто в памяти процесса.
    """
    username: str = "Majid"
    language: str = "ru"
    theme: str = "dark"
    daily_goal: int = Field(default=20, ge=1, le=500)
    last_reset_at: Optional[datetime] = None


class ProfileUpdate(BaseModel):
    """
    Модель для частичного обновления профиля.
    Все поля опциональные.
    """
    username: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    daily_goal: Optional[int] = Field(default=None, ge=1, le=500)


class ResetProgressResponse(BaseModel):
    """
    Ответ на сброс прогресса по карточкам.
    """
    reset_decks: int
    reset_cards: int
    timestamp: datetime


# Простое in-memory хранилище профиля
IN_MEMORY_PROFILE = Profile()


@router.get("/", response_model=Profile)
def get_profile() -> Profile:
    """
    Получить текущие настройки профиля.
    """
    return IN_MEMORY_PROFILE


@router.put("/", response_model=Profile)
def update_profile(payload: ProfileUpdate) -> Profile:
    """
    Обновить настройки профиля (частично).
    """
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(IN_MEMORY_PROFILE, key, value)
    return IN_MEMORY_PROFILE


@router.post("/reset-progress", response_model=ResetProgressResponse)
def reset_progress() -> ResetProgressResponse:
    """
    Сбросить прогресс по всем карточкам во всех колодах:
    - заново инициализируем SRS-параметры (CardSRS);
    - обновляем last_reset_at в профиле.
    """
    reset_decks = 0
    reset_cards = 0

    for deck in DECKS_DB.values():
        reset_decks += 1
        for card in deck.cards:
            card.srs = CardSRS()
            reset_cards += 1

    ts = datetime.utcnow()
    IN_MEMORY_PROFILE.last_reset_at = ts

    return ResetProgressResponse(
        reset_decks=reset_decks,
        reset_cards=reset_cards,
        timestamp=ts,
    )
