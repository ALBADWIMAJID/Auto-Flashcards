"""
Baseline-модель генерации флеш-карточек.

1) Пытаемся вызвать LLM через OpenAI (chat.completions).
2) Парсим результат в формате простого текста:

    Q: вопрос
    A: ответ
    ---
    Q: ...
    A: ...

3) Если LLM не отвечает или формат некорректный — используем локальный
   fallback: разбиение текста на предложения.
"""

from typing import List, Dict
import logging
import os

from openai import OpenAI

# Логгер для сообщений об ошибках
logger = logging.getLogger(__name__)


def _split_into_sentences(text: str) -> List[str]:
    """
    Упрощённое разбиение текста на предложения по точкам, вопросительным и восклицательным знакам.
    """
    raw_parts = (
        text.replace("?", ".")
        .replace("!", ".")
        .split(".")
    )
    sentences: List[str] = [part.strip() for part in raw_parts if part.strip()]
    return sentences


def _parse_llm_output(raw_text: str, max_cards: int) -> List[Dict[str, str]]:
    """
    Парсим ответ модели в формате:

    Q: ...
    A: ...
    ---
    Q: ...
    A: ...

    Модель может немного "флудить", поэтому мы просто выдёргиваем строки,
    начинающиеся с 'Q:' и 'A:'.
    """
    cards: List[Dict[str, str]] = []

    # Разбиваем по разделителю между карточками
    blocks = [b.strip() for b in raw_text.split("---") if b.strip()]

    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        question = ""
        answer = ""

        for line in lines:
            lower = line.lower()
            if lower.startswith("q:"):
                question = line[2:].strip()
            elif lower.startswith("a:"):
                answer = line[2:].strip()

        if question and answer:
            cards.append(
                {
                    "question": question,
                    "answer": answer,
                }
            )

        if len(cards) >= max_cards:
            break

    return cards


def _generate_flashcards_locally(text: str, max_cards: int) -> List[Dict[str, str]]:
    """
    Локальный fallback без LLM.
    Если LLM недоступен или отключён — используем простое разбиение на предложения.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    sentences = _split_into_sentences(cleaned)
    cards: List[Dict[str, str]] = []

    for idx, sentence in enumerate(sentences[:max_cards], start=1):
        question = f"О чём говорится в предложении №{idx}?"
        answer = sentence
        cards.append(
            {
                "question": question,
                "answer": answer,
            }
        )

    if not cards:
        cards.append(
            {
                "question": "Какова основная идея этого текста?",
                "answer": cleaned,
            }
        )

    return cards


def _call_llm(text: str, max_cards: int) -> List[Dict[str, str]]:
    """
    Вызов LLM через OpenAI Chat Completions.
    Если что-то идёт не так — возвращаем пустой список, и выше сработает fallback.
    """
    # Проверяем, есть ли ключ
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY не найден, используем локальный fallback.")
        return []

    try:
        # Инициализируем клиента ТОЛЬКО если ключ есть
        client = OpenAI(api_key=api_key)
    except Exception as exc:
        logger.exception("Не удалось инициализировать OpenAI-клиент: %s", exc)
        return []

    prompt = (
        "Ты помогаешь студенту создавать учебные флеш-карточки.\n"
        f"Сгенерируй не более {max_cards} карточек по этому тексту.\n\n"
        "ФОРМАТ КАЖДОЙ КАРТОЧКИ СТРОГО ТАКОЙ:\n"
        "Q: Вопрос\n"
        "A: Краткий и точный ответ\n\n"
        "Между карточками ставь строку из трёх дефисов:\n"
        "---\n\n"
        "Никаких пояснений до или после карточек не добавляй.\n\n"
        f"Текст:\n{text}\n"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Ты лаконичный ассистент, который генерирует флеш-карточки по учебному тексту.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )

        raw_text = response.choices[0].message.content or ""
        logger.info("LLM raw output (first 500 chars): %s", raw_text[:500])

        cards = _parse_llm_output(raw_text, max_cards)
        return cards

    except Exception as exc:
        # Если что-то упало (лимиты, сеть, формат и т.п.) — логируем и возвращаем пустой список
        logger.error("Не удалось сгенерировать карточки через LLM: %r", exc)
        return []


def generate_flashcards(text: str, max_cards: int = 5) -> List[Dict[str, str]]:
    """
    Публичная функция, которую вызывает backend:

    1. Пробуем сгенерировать карточки через LLM.
    2. Если LLM не сработал или вернул мусор — используем простой локальный fallback.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    # 1) пробуем LLM
    cards = _call_llm(cleaned, max_cards)
    if cards:
        return cards

    # 2) если не получилось — простой локальный вариант
    return _generate_flashcards_locally(cleaned, max_cards)
