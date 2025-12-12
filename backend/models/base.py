# backend/models/base.py

"""
Базовые настройки SQLAlchemy для моделей БД.
На данном этапе (MVP) мы определяем только структуру моделей,
без привязки к конкретному engine (Supabase/PostgreSQL будет настроен позже).
"""

from typing import Any

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Базовый класс для всех ORM-моделей.
    """
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    def __repr__(self) -> str:
        fields = []
        for key, value in self.__dict__.items():
            if key.startswith("_"):
                continue
            fields.append(f"{key}={value!r}")
        fields_str = ", ".join(fields)
        return f"<{self.__class__.__name__} {fields_str}>"
