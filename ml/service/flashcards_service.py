# ml/service/flashcards_service.py

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
import time
import logging

from ml.models.baseline import generate_flashcards
from ml.tracing.langfuse_config import trace_generation

logger = logging.getLogger(__name__)


@dataclass
class FlashcardsRequest:
    """
    Запрос на генерацию карточек.

    text      — исходный учебный текст
    max_cards — максимальное количество карточек
    """
    text: str
    max_cards: int = 5


@dataclass
class FlashcardsResponse:
    """
    Результат генерации карточек.

    cards      — список карточек (question/answer)
    cached     — были ли данные взяты из кэша
    latency_ms — "стоимость" генерации в миллисекундах
    """
    cards: List[Dict[str, str]]
    cached: bool
    latency_ms: float


class FlashcardsService:
    """
    Сервис генерации флеш-карточек поверх baseline-модели.

    Здесь мы:
    - добавляем простой in-memory кэш
    - считаем latency
    - отправляем трейс в Langfuse (через trace_generation)
    """

    def __init__(self, cache_ttl_seconds: int = 60):
        self._cache_ttl = cache_ttl_seconds
        # key -> (expires_at, cards)
        self._cache: Dict[str, Tuple[float, List[Dict[str, str]]]] = {}

    def _make_cache_key(self, text: str, max_cards: int) -> str:
        # Простейший ключ: hash текста + max_cards
        return f"{hash(text)}:{max_cards}"

    def _get_from_cache(self, key: str) -> Optional[List[Dict[str, str]]]:
        now = time.time()
        entry = self._cache.get(key)
        if not entry:
            return None

        expires_at, cards = entry
        if expires_at < now:
            # кэш протух — удаляем
            self._cache.pop(key, None)
            return None

        return cards

    def _set_cache(self, key: str, cards: List[Dict[str, str]]) -> None:
        expires_at = time.time() + self._cache_ttl
        self._cache[key] = (expires_at, cards)

    def generate(self, request: FlashcardsRequest) -> FlashcardsResponse:
        """
        Основной метод сервиса.

        1) пробуем взять результат из кэша
        2) если кэша нет — вызываем baseline-модель
        3) шлём трейс в Langfuse (если настроен)
        """
        text = request.text.strip()
        if not text:
            return FlashcardsResponse(cards=[], cached=False, latency_ms=0.0)

        cache_key = self._make_cache_key(text, request.max_cards)

        # 1) пробуем кэш
        cached_cards = self._get_from_cache(cache_key)
        if cached_cards is not None:
            return FlashcardsResponse(
                cards=cached_cards,
                cached=True,
                latency_ms=0.0,
            )

        # 2) baseline-запрос
        start = time.perf_counter()
        cards_data = generate_flashcards(text, max_cards=request.max_cards)
        latency_ms = (time.perf_counter() - start) * 1000.0

        # 3) сохраняем в кэш
        if cards_data:
            self._set_cache(cache_key, cards_data)

        # 4) отправляем трейс (fire-and-forget)
        try:
            trace_generation(prompt=text, cards=cards_data)
        except Exception as exc:  # pragma: no cover
            logger.error("Не удалось отправить трейс генерации: %r", exc)

        return FlashcardsResponse(
            cards=cards_data,
            cached=False,
            latency_ms=latency_ms,
        )


# Глобальный "ленивый" экземпляр сервиса, которым можно пользоваться из кода.
flashcards_service = FlashcardsService(cache_ttl_seconds=60)
