# backend/models/user.py

"""
Модель пользователя системы Auto-Flashcards.
"""

from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(Base):
    """
    Пользователь системы (Студент).
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Отношения
    decks: Mapped[list["Deck"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    def __str__(self) -> str:
        return self.email
