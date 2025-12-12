# tests/test_health_and_ai.py
"""
Базовые тесты для backend:

1. Проверяем, что /health отвечает 200 и {"status": "ok"}.
2. Проверяем, что /ai/generate работает хотя бы в fallback-режиме,
   даже если нет ключа OPENAI_API_KEY.
"""

import os

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_ok():
    """
    Эндпоинт /health должен возвращать 200 и JSON {"status": "ok"}.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert data.get("status") == "ok"


def test_ai_generate_fallback_works():
    """
    Тестируем /ai/generate в условиях, когда LLM может быть недоступен.

    Мы специально удаляем переменную окружения OPENAI_API_KEY,
    чтобы модель перешла в локальный fallback-режим и всё равно
    вернула какие-то простые карточки.
    """
    # Удаляем ключ, если он есть, чтобы гарантированно включить fallback
    os.environ.pop("OPENAI_API_KEY", None)

    payload = {
        "text": "FastAPI — это современный веб-фреймворк для Python, "
                "который упрощает создание REST API."
    }

    response = client.post("/ai/generate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)
    cards = data.get("cards")
    # В ответе должен быть список карточек (даже если он небольшой)
    assert isinstance(cards, list)
    # В локальном fallback обычно будет хотя бы одна карточка
    assert len(cards) >= 1
    first = cards[0]
    assert "question" in first
    assert "answer" in first
