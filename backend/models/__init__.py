# backend/models/__init__.py

"""
Пакет ORM-моделей для БД Auto-Flashcards.

Содержит:
- Base — базовый класс (models.base)
- User — пользователь
- Deck — колода
- Card — карточка
- ReviewSession, ReviewAnswer — сессии повторения и ответы
"""

from .base import Base
from .user import User
from .deck import Deck
from .card import Card
from .review import ReviewSession, ReviewAnswer

__all__ = [
    "Base",
    "User",
    "Deck",
    "Card",
    "ReviewSession",
    "ReviewAnswer",
]
