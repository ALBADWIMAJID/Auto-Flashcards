# backend/models/deck.py

"""
Модель колоды (deck) — набор карточек по конкретной теме / дисциплине.
"""

from typing import Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Deck(Base):
    """
    Колода карточек.
    """
    __tablename__ = "decks"

    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    owner: Mapped["User"] = relationship(back_populates="decks")

    # Связанные карточки
    cards: Mapped[list["Card"]] = relationship(
        back_populates="deck",
        cascade="all, delete-orphan",
    )

    # История сессий повторения
    review_sessions: Mapped[list["ReviewSession"]] = relationship(
        back_populates="deck",
        cascade="all, delete-orphan",
    )
