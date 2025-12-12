# ml/tracing/langfuse_config.py

"""
Интеграция с Langfuse для трассировки LLM-вызовов и генерации карточек.

Сохраняем те же интерфейсы, что и в заглушке:

- log_llm_call(prompt, response=None, error=None, metadata=None)
- trace_generation(prompt, cards)

Теперь вместо простого logging используем официальный Langfuse Python SDK,
который работает поверх публичного API /api/public (см. Public API docs).
"""

from __future__ import annotations

from typing import Dict, List, Optional, Any
import logging
import os
import json

logger = logging.getLogger(__name__)

try:
    # Официальный Python SDK Langfuse (pip install langfuse)
    # Docs: https://langfuse.com/docs/sdk/python/overview
    from langfuse import get_client

    _LANGFUSE_AVAILABLE = True
except Exception:  # ImportError и любые другие проблемы при импорте
    _LANGFUSE_AVAILABLE = False
    get_client = None  # type: ignore[assignment]


_langfuse_client = None  # кэшированный экземпляр клиента


def _init_client():
    """
    Ленивая инициализация клиента Langfuse.

    Клиент читает конфигурацию из переменных окружения:
    LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL.

    Если SDK не установлен или ключи не заданы — возвращаем None и не ломаем приложение.
    """
    if not _LANGFUSE_AVAILABLE:
        logger.warning("Langfuse SDK не установлен. Используем только стандартный logging.")
        return None

    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    base_url = os.getenv("LANGFUSE_BASE_URL")  # например: https://cloud.langfuse.com

    if not public_key or not secret_key:
        logger.warning(
            "LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY не заданы. "
            "Langfuse-трассировка отключена, используем только logging."
        )
        return None

    try:
        # get_client сам подхватывает конфиг из переменных окружения
        client = get_client()
        logger.info("Langfuse client инициализирован успешно.")
        return client
    except Exception as exc:  # pragma: no cover
        logger.error("Не удалось инициализировать Langfuse client: %r", exc)
        return None


def _get_client():
    """Глобальный доступ к клиенту с ленивой инициализацией и кешированием."""
    global _langfuse_client
    if _langfuse_client is None:
        _langfuse_client = _init_client()
    return _langfuse_client


def log_llm_call(
    prompt: str,
    response: Optional[str] = None,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Логирование отдельного LLM-вызова в Langfuse.

    Вызывается из ml.models.baseline._call_llm в трёх случаях:
    - нет OPENAI_API_KEY (конфигурационная ошибка);
    - успешный ответ модели (prompt + response);
    - исключение при вызове клиента OpenAI (ошибка).

    Поведение:
      1) если Langfuse недоступен — просто пишем payload в стандартный лог;
      2) если клиент есть — создаём наблюдение типа "generation" в Langfuse,
         чтобы в дашборде были видны prompt, ответ/ошибка и метаданные.
    """
    payload = {
        "prompt": prompt,
        "response": response,
        "error": error,
        "metadata": metadata or {},
    }

    client = _get_client()

    if client is None:
        # Fallback: старое поведение — только logging
        logger.info(
            "[Langfuse disabled] LLM call: %s",
            json.dumps(payload, ensure_ascii=False),
        )
        return None

    try:
        # Пример использования start_as_current_observation из SDK:
        # https://langfuse.com/docs/observability/sdk/python/overview
        model_name = (metadata or {}).get("model", "gpt-4o-mini")

        with client.start_as_current_observation(
            as_type="generation",
            name="baseline-llm-call",
            model=model_name,
            input=[{"role": "user", "content": prompt}],
        ) as generation:
            if error is not None:
                generation.update(
                    output={"error": error},
                    level="error",
                    metadata=(metadata or {}),
                )
            else:
                generation.update(
                    output=response,
                    metadata=(metadata or {}),
                )

    except Exception as exc:  # pragma: no cover
        # Никогда не ломаем бизнес-логику из-за телеметрии
        logger.error("Не удалось отправить данные о LLM-вызове в Langfuse: %r", exc)
        logger.info(
            "[Langfuse fallback] LLM call (local log only): %s",
            json.dumps(payload, ensure_ascii=False),
        )

    return None


def trace_generation(prompt: str, cards: List[Dict[str, str]]) -> None:
    """
    Трассировка сценария "Generate Flashcards" для Langfuse.

    :param prompt: исходный текст, по которому генерировались карточки;
    :param cards: список карточек (question/answer), которые вернула baseline-модель.
    """
    payload = {
        "event": "generate_flashcards",
        "prompt": prompt,
        "cards": cards,
        "cards_count": len(cards),
    }

    client = _get_client()

    if client is None:
        logger.info(
            "[Langfuse disabled] Generation trace: %s",
            json.dumps(payload, ensure_ascii=False),
        )
        return None

    try:
        # В v3 SDK нельзя передавать tags напрямую в start_as_current_observation,
        # вместо этого используем update_trace(tags=[...]) после создания span.
        with client.start_as_current_observation(
            as_type="span",
            name="generate-flashcards",
            input={"prompt": prompt},
            metadata={"cards_count": len(cards)},
        ) as span:
            # сохраняем результат генерации
            span.update(output={"cards": cards})
            # опционально добавляем теги на уровне trace
            span.update_trace(tags=["flashcards", "api"])

    except Exception as exc:  # pragma: no cover
        logger.error("Не удалось отправить трейс генерации в Langfuse: %r", exc)
        logger.info(
            "[Langfuse fallback] Generation trace (local log only): %s",
            json.dumps(payload, ensure_ascii=False),
        )

    return None
