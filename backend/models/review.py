# backend/models/review.py

"""
Модели для сессий повторения (SRS) и ответов пользователя.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ReviewSession(Base):
    """
    Сессия повторения для конкретной колоды.
    """
    __tablename__ = "review_sessions"

    deck_id: Mapped[int] = mapped_column(ForeignKey("decks.id"), index=True)
    deck: Mapped["Deck"] = relationship(back_populates="review_sessions")

    started_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Связанные ответы по карточкам
    answers: Mapped[list["ReviewAnswer"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class ReviewAnswer(Base):
    """
    Ответ пользователя по конкретной карточке в рамках сессии повторения.
    """
    __tablename__ = "review_answers"

    session_id: Mapped[int] = mapped_column(ForeignKey("review_sessions.id"), index=True)
    session: Mapped["ReviewSession"] = relationship(back_populates="answers")

    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id"), index=True)

    rating: Mapped[str] = mapped_column(
        String(10),
        doc="Оценка ответа: например 'Bad' / 'Good' / 'Easy'",
    )

    # Можно хранить комментарий или дополнительные данные
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
