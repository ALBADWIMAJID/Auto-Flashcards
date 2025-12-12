# tests/test_decks.py
"""
Интеграционные тесты для эндпоинтов /decks.

Покрываем базовые сценарии:
- список колод (UC-1)
- создание новой колоды (UC-1 / UC-2)
- получение колоды по ID
"""

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.routers import decks as decks_module

client = TestClient(app)


def reset_decks_state() -> None:
    """
    Сбрасываем in-memory "базу данных" перед каждым тестом,
    чтобы тесты были изолированы друг от друга.
    """
    decks_module.DECKS_DB.clear()
    decks_module.NEXT_DECK_ID = 1


def test_list_decks_initially_empty():
    """
    При старте приложения список колод должен быть пустым.
    """
    reset_decks_state()

    response = client.get("/decks/")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert data == []  # изначально колод нет


def test_create_deck_and_list():
    """
    Создаём одну колоду и убеждаемся, что она появляется
    в списке /decks/.
    """
    reset_decks_state()

    payload = {
        "title": "Тестовая колода",
        "description": "Короткое описание для юнит-теста",
    }

    # Создание колоды
    create_resp = client.post("/decks/", json=payload)
    assert create_resp.status_code == 201

    created = create_resp.json()
    assert isinstance(created, dict)
    assert created["title"] == payload["title"]
    assert created["description"] == payload["description"]
    assert "id" in created
    assert isinstance(created["id"], int)

    deck_id = created["id"]

    # Список колод
    list_resp = client.get("/decks/")
    assert list_resp.status_code == 200
    decks = list_resp.json()
    assert isinstance(decks, list)
    assert len(decks) == 1

    deck = decks[0]
    assert deck["id"] == deck_id
    assert deck["title"] == payload["title"]
    assert deck["description"] == payload["description"]
    assert "cards" in deck
    assert isinstance(deck["cards"], list)


def test_get_deck_by_id():
    """
    Проверяем, что /decks/{deck_id} возвращает созданную колоду.
    """
    reset_decks_state()

    payload = {
        "title": "Колода для get_deck",
        "description": "Проверка получения колоды по ID",
    }

    create_resp = client.post("/decks/", json=payload)
    assert create_resp.status_code == 201
    created = create_resp.json()
    deck_id = created["id"]

    # Получаем колоду по ID
    get_resp = client.get(f"/decks/{deck_id}")
    assert get_resp.status_code == 200

    deck = get_resp.json()
    assert deck["id"] == deck_id
    assert deck["title"] == payload["title"]
    assert deck["description"] == payload["description"]
    assert isinstance(deck.get("cards", []), list)
