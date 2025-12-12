# backend/models/card.py

"""
Модель одной карточки (вопрос-ответ) в колоде.
"""

from typing import Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Card(Base):
    """
    Карточка: вопрос / ответ + дополнительные поля.
    """
    __tablename__ = "cards"

    deck_id: Mapped[int] = mapped_column(ForeignKey("decks.id"), index=True)
    deck: Mapped["Deck"] = relationship(back_populates="cards")

    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)

    # Дополнительно можно хранить подсказки, теги, сложность и т.п.
    hint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
