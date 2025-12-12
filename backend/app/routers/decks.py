from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


# ---------- МОДЕЛИ SRS / КАРТОЧЕК / КОЛОД ----------


class CardSRS(BaseModel):
    """
    Простейшая модель для SRS-параметров карточки.

    Основано на идеях алгоритма SM-2:
    - ease_factor (EF) начинается с 2.5;
    - interval - количество дней до следующего повторения;
    - repetitions - сколько раз подряд карта была успешно воспроизведена;
    - next_review - дата, когда карту нужно показать снова.
    См. описание SM-2 / SuperMemo.  :contentReference[oaicite:1]{index=1}
    """

    interval: int = 0
    repetitions: int = 0
    ease_factor: float = 2.5
    next_review: date = Field(default_factory=date.today)
    last_grade: Optional[int] = None


class CardCreate(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    answer: str = Field(..., min_length=1, max_length=2000)


class Card(CardCreate):
    id: int
    srs: CardSRS = Field(default_factory=CardSRS)


class DeckCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)


class Deck(DeckCreate):
    id: int
    cards: List[Card] = Field(default_factory=list)


# ---------- ПРОСТЕЙШАЯ IN-MEMORY "БАЗА ДАННЫХ" ----------

# В рамках учебного прототипа мы храним данные просто в памяти процесса,
# как рекомендуют делать в быстрых примерах с FastAPI. :contentReference[oaicite:2]{index=2}

DECKS_DB: Dict[int, Deck] = {}
NEXT_DECK_ID: int = 1
NEXT_CARD_ID: int = 1


def _get_deck_or_404(deck_id: int) -> Deck:
    deck = DECKS_DB.get(deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


def _get_card_or_404(deck: Deck, card_id: int) -> Card:
    for card in deck.cards:
        if card.id == card_id:
            return card
    raise HTTPException(status_code=404, detail="Card not found")


# ---------- ЭНДПОИНТЫ ДЛЯ КОЛОД (как раньше, но с полем cards) ----------


@router.get("/", response_model=List[Deck])
def list_decks() -> List[Deck]:
    """
    Получить список всех колод.
    """
    return list(DECKS_DB.values())


@router.post("/", response_model=Deck, status_code=201)
def create_deck(payload: DeckCreate) -> Deck:
    """
    Создать новую колоду.

    Используется фронтендом на главной странице (UC-1 / UC-2).
    """
    global NEXT_DECK_ID

    deck = Deck(
        id=NEXT_DECK_ID,
        title=payload.title,
        description=payload.description,
        cards=[],
    )
    DECKS_DB[NEXT_DECK_ID] = deck
    NEXT_DECK_ID += 1
    return deck


@router.get("/{deck_id}", response_model=Deck)
def get_deck(deck_id: int) -> Deck:
    """
    Получить одну колоду по ID.
    """
    return _get_deck_or_404(deck_id)


@router.delete("/{deck_id}", status_code=204)
def delete_deck(deck_id: int) -> None:
    """
    Удалить колоду по ID.
    """
    if deck_id not in DECKS_DB:
        raise HTTPException(status_code=404, detail="Deck not found")
    del DECKS_DB[deck_id]
    return None


# ---------- ЭНДПОИНТЫ ДЛЯ КАРТОЧЕК ВНУТРИ КОЛОДЫ (UC-2) ----------


@router.get("/{deck_id}/cards", response_model=List[Card])
def list_cards(deck_id: int) -> List[Card]:
    """
    Получить все карточки в указанной колоде.
    """
    deck = _get_deck_or_404(deck_id)
    return deck.cards


@router.post("/{deck_id}/cards", response_model=Card, status_code=201)
def create_card(deck_id: int, payload: CardCreate) -> Card:
    """
    Добавить новую карточку в колоду.

    На следующих шагах этот эндпоинт будем использовать на странице
    /decks/[id] и /review.
    """
    global NEXT_CARD_ID

    deck = _get_deck_or_404(deck_id)

    card = Card(
        id=NEXT_CARD_ID,
        question=payload.question,
        answer=payload.answer,
        srs=CardSRS(),  # базовые SRS-параметры
    )
    deck.cards.append(card)
    NEXT_CARD_ID += 1
    return card


@router.put("/{deck_id}/cards/{card_id}", response_model=Card)
def update_card(deck_id: int, card_id: int, payload: CardCreate) -> Card:
    """
    Обновить текст вопроса / ответа карточки.
    """
    deck = _get_deck_or_404(deck_id)
    card = _get_card_or_404(deck, card_id)

    card.question = payload.question
    card.answer = payload.answer
    return card


@router.delete("/{deck_id}/cards/{card_id}", status_code=204)
def delete_card(deck_id: int, card_id: int) -> None:
    """
    Удалить карточку из колоды.
    """
    deck = _get_deck_or_404(deck_id)
    card = _get_card_or_404(deck, card_id)

    deck.cards = [c for c in deck.cards if c.id != card.id]
    return None
