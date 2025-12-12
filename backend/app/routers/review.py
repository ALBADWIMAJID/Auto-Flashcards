from __future__ import annotations

from datetime import date, timedelta
from typing import Optional, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Импортируем "базу" и модели из decks.py
from .decks import DECKS_DB, Deck, Card, CardSRS

router = APIRouter()


# ---------- Pydantic-модели для API ----------


class ReviewCard(BaseModel):
    deck_id: int
    card_id: int
    question: str
    answer: str


class ReviewNextResponse(BaseModel):
    """
    Ответ на GET /review/next:
    - либо card = объект карточки,
    - либо card = null, если на сегодня нет карточек к повторению.
    """
    card: Optional[ReviewCard]


class ReviewAnswerRequest(BaseModel):
    """
    Тело POST /review/answer.
    grade:
      0 = Сложно
      1 = Нормально
      2 = Легко
    """
    deck_id: int
    card_id: int
    grade: int = Field(..., ge=0, le=2)


class ReviewAnswerResponse(BaseModel):
    """
    Ответ после оценки карточки:
    - сама карточка
    - дата следующего повторения next_review
    """
    card: ReviewCard
    next_review: date


# ---------- Вспомогательные функции ----------


def _get_deck_and_card(deck_id: int, card_id: int) -> Tuple[Deck, Card]:
    deck = DECKS_DB.get(deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    for card in deck.cards:
        if card.id == card_id:
            return deck, card

    raise HTTPException(status_code=404, detail="Card not found")


def _apply_grade(card: Card, grade: int) -> None:
    """
    Простая версия SRS-логики для карточки.

    grade:
      0 = Сложно
      1 = Нормально
      2 = Легко
    """
    srs: CardSRS = card.srs
    srs.last_grade = grade

    # Базовая логика:
    # - при "сложно" сбрасываем повторения и ставим короткий интервал
    # - при "нормально"/"легко" увеличиваем repetitions и интервал
    if grade == 0:
        # Пользователь плохо помнит карточку
        srs.repetitions = 0
        srs.interval = 1
        srs.ease_factor = max(1.3, srs.ease_factor - 0.2)
    else:
        # Пользователь в целом помнит карточку
        srs.repetitions += 1
        if srs.repetitions == 1:
            srs.interval = 1
        elif srs.repetitions == 2:
            srs.interval = 6
        else:
            srs.interval = int(round(srs.interval * srs.ease_factor))

        if grade == 1:
            # Нормально — слегка уменьшаем ease_factor
            srs.ease_factor = max(1.3, srs.ease_factor - 0.05)
        elif grade == 2:
            # Легко — увеличиваем ease_factor
            srs.ease_factor = srs.ease_factor + 0.1

    srs.next_review = date.today() + timedelta(days=srs.interval)


def _to_review_card(deck_id: int, card: Card) -> ReviewCard:
    return ReviewCard(
        deck_id=deck_id,
        card_id=card.id,
        question=card.question,
        answer=card.answer,
    )


# ---------- Эндпоинты UC-3: режим повторения ----------


@router.get("/next", response_model=ReviewNextResponse)
def get_next_card(deck_id: int) -> ReviewNextResponse:
    """
    Вернуть следующую карточку к повторению для указанной колоды.

    Логика:
    - выбираем все карточки, у которых next_review <= сегодня;
    - сортируем по next_review и id;
    - если подходящих нет, возвращаем card = null.
    """
    deck = DECKS_DB.get(deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    today = date.today()
    candidates = [card for card in deck.cards if card.srs.next_review <= today]

    if not candidates:
        # На сегодня нет карточек к повторению
        return ReviewNextResponse(card=None)

    candidates.sort(key=lambda c: (c.srs.next_review, c.id))
    card = candidates[0]
    return ReviewNextResponse(card=_to_review_card(deck.id, card))


@router.post("/answer", response_model=ReviewAnswerResponse)
def answer_card(payload: ReviewAnswerRequest) -> ReviewAnswerResponse:
    """
    Принять оценку пользователя по карточке и пересчитать SRS-параметры.
    """
    deck, card = _get_deck_and_card(payload.deck_id, payload.card_id)
    _apply_grade(card, payload.grade)
    return ReviewAnswerResponse(
        card=_to_review_card(deck.id, card),
        next_review=card.srs.next_review,
    )
