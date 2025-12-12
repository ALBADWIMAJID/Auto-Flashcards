from __future__ import annotations

from datetime import date
from typing import Dict

from fastapi import APIRouter
from pydantic import BaseModel

# Импортируем "базу" и модели из decks.py
from .decks import DECKS_DB, Deck, Card

router = APIRouter()


class StatsOverview(BaseModel):
    """
    Сводная статистика по обучению (UC-4).
    """
    total_decks: int
    total_cards: int
    due_today: int
    learned_cards: int
    reviewed_cards: int


def _calculate_stats() -> StatsOverview:
    today = date.today()

    total_decks = len(DECKS_DB)
    total_cards = 0
    due_today = 0
    learned_cards = 0
    reviewed_cards = 0

    for deck in DECKS_DB.values():  # type: Deck
        for card in deck.cards:  # type: Card
            total_cards += 1

            # Карты, которые нужно повторить сегодня
            if card.srs.next_review <= today:
                due_today += 1

            # Считаем "выученными" карты с 3 и более успешными повторениями
            if card.srs.repetitions >= 3:
                learned_cards += 1

            # Карты, по которым уже была хотя бы одна оценка
            if card.srs.last_grade is not None:
                reviewed_cards += 1

    return StatsOverview(
        total_decks=total_decks,
        total_cards=total_cards,
        due_today=due_today,
        learned_cards=learned_cards,
        reviewed_cards=reviewed_cards,
    )


@router.get("/overview", response_model=StatsOverview)
def get_stats_overview() -> StatsOverview:
    """
    Эндпоинт UC-4: сводная статистика по колодам и карточкам.

    На основе текущего состояния in-memory "БД" (DECKS_DB) возвращает:
    - total_decks     — количество колод;
    - total_cards     — общее количество карточек;
    - due_today       — сколько карточек нужно повторить сегодня;
    - learned_cards   — сколько карточек считаются выученными;
    - reviewed_cards  — по скольким карточкам уже были ответы.
    """
    return _calculate_stats()
