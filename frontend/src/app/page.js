"use client";

import { useEffect, useState } from "react";

// Базовый URL для backend API.
// В dev-режиме по умолчанию используем локальный backend,
// а в production-режиме значение можно переопределить через
// переменную окружения NEXT_PUBLIC_API_BASE_URL.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Главная страница MVP для роли Fullstack:
 * 1) Генерация карточек из текста (/ai/generate)
 * 2) Простейшее управление колодами (/decks)
 */
export default function HomePage() {
  // --- Состояния для AI генерации ---
  const [text, setText] = useState("");
  const [cards, setCards] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState("");

  // --- Состояния для Decks ---
  const [decks, setDecks] = useState([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [errorDecks, setErrorDecks] = useState("");

  // Загрузить список колод при загрузке страницы
  useEffect(() => {
    void loadDecks();
  }, []);

  const loadDecks = async () => {
    setErrorDecks("");
    setLoadingDecks(true);
    try {
      const response = await fetch(`${API_BASE_URL}/decks/`);
      if (!response.ok) {
        throw new Error(`Ошибка загрузки колод: ${response.status}`);
      }
      const data = await response.json();
      setDecks(data || []);
    } catch (e) {
      setErrorDecks(e.message || "Неизвестная ошибка при загрузке колод.");
    } finally {
      setLoadingDecks(false);
    }
  };

  const handleCreateDeck = async () => {
    setErrorDecks("");

    const title = deckTitle.trim();
    const description = (deckDescription || "").trim();

    if (!title) {
      setErrorDecks("Пожалуйста, введите название колоды.");
      return;
    }

    setCreatingDeck(true);
    try {
      const response = await fetch(`${API_BASE_URL}/decks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || `Ошибка создания колоды: ${response.status}`
        );
      }

      // можно использовать ответ при необходимости
      // const created = await response.json();

      // Очищаем форму и перезагружаем список
      setDeckTitle("");
      setDeckDescription("");
      await loadDecks();
    } catch (e) {
      setErrorDecks(e.message || "Неизвестная ошибка при создании колоды.");
    } finally {
      setCreatingDeck(false);
    }
  };

  const handleGenerate = async () => {
    setErrorAI("");
    setCards([]);

    const trimmed = text.trim();
    if (!trimmed) {
      setErrorAI("Пожалуйста, введите текст для генерации.");
      return;
    }

    setLoadingAI(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setCards(data.cards || []);
    } catch (e) {
      setErrorAI(e.message || "Неизвестная ошибка при генерации.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl space-y-10">
        {/* Заголовок */}
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Auto-Flashcards — MVP прототип</h1>
          <p className="text-sm text-slate-300">
            Backend: FastAPI · Frontend: Next.js · Роль: Fullstack
          </p>
        </header>

        {/* Блок AI генерации карточек */}
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold">
            1. Генерация карточек из текста (AI baseline)
          </h2>

          <p className="text-xs text-slate-400">
            Введите учебный текст, нажмите{" "}
            <span className="font-semibold">«Сгенерировать карточки»</span>, и
            endpoint <code className="text-sky-400">/ai/generate</code> вернёт
            список простых карточек.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Учебный текст</label>
            <textarea
              className="w-full h-32 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="Например: FastAPI — это современный веб-фреймворк для Python..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loadingAI}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 py-2 text-sm font-semibold transition-colors"
          >
            {loadingAI ? "Генерация..." : "Сгенерировать карточки"}
          </button>

          {errorAI && (
            <div className="rounded-lg border border-red-600 bg-red-950/60 px-3 py-2 text-sm text-red-200">
              Ошибка: {errorAI}
            </div>
          )}

          {cards.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Сгенерированные карточки</h3>
              <ul className="space-y-2">
                {cards.map((card, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <div className="font-medium mb-1">Вопрос {idx + 1}:</div>
                    <div className="mb-1">{card.question}</div>
                    <div className="text-slate-300">
                      <span className="font-medium">Ответ: </span>
                      {card.answer}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cards.length === 0 && !errorAI && !loadingAI && (
            <p className="text-xs text-slate-500">
              Карточки ещё не сгенерированы. Введите текст и нажмите кнопку выше.
            </p>
          )}
        </section>

        {/* Блок управления колодами */}
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold">
            2. Управление колодами 
          </h2>

          <p className="text-xs text-slate-400">
            Здесь реализован простой CRUD через endpoint{" "}
            <code className="text-sky-400">/decks</code>: создание и просмотр
            колод в памяти.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Форма создания новой колоды */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Создать новую колоду</h3>

              <div className="space-y-2">
                <label className="block text-xs font-medium">
                  Название колоды
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Например: Вопросы по FastAPI"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium">
                  Описание (необязательно)
                </label>
                <textarea
                  className="w-full h-20 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Краткое описание колоды..."
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                />
              </div>

              <button
                onClick={handleCreateDeck}
                disabled={creatingDeck}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 py-2 text-sm font-semibold transition-colors"
              >
                {creatingDeck ? "Создание..." : "Создать колоду"}
              </button>
            </div>

            {/* Список существующих колод */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Список колод</h3>
                <button
                  onClick={loadDecks}
                  disabled={loadingDecks}
                  className="text-xs rounded-lg border border-slate-600 px-2 py-1 hover:bg-slate-800 disabled:opacity-60"
                >
                  {loadingDecks ? "Обновление..." : "Обновить"}
                </button>
              </div>

              {errorDecks && (
                <div className="rounded-lg border border-red-600 bg-red-950/60 px-3 py-2 text-xs text-red-200">
                  Ошибка: {errorDecks}
                </div>
              )}

              {decks.length === 0 && !loadingDecks && !errorDecks && (
                <p className="text-xs text-slate-500">
                  Колод пока нет. Создайте первую колоду в форме слева.
                </p>
              )}

              {decks.length > 0 && (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {decks.map((deck) => (
                    <li
                      key={deck.id}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    >
                      <div className="font-semibold">{deck.title}</div>
                      {deck.description && (
                        <div className="text-xs text-slate-300 mt-1">
                          {deck.description}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1">
                        ID: {deck.id}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
