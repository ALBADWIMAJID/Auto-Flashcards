"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";


/**
 * Страница UC-3: ежедневное повторение по SRS.
 * Здесь фронтенд реально работает с бекенд-эндпоинтами:
 *   - GET  /decks/
 *   - GET  /review/next?deck_id=...
 *   - POST /review/answer
 */
export default function ReviewPage() {
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(null);

  const [currentCard, setCurrentCard] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [answering, setAnswering] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --- Загрузка списка колод при первом рендере ---
  useEffect(() => {
    const fetchDecks = async () => {
      setLoadingDecks(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/decks/`);
        if (!res.ok) {
          throw new Error(`Ошибка загрузки колод: ${res.status}`);
        }
        const data = await res.json();
        setDecks(data);
        if (data.length > 0) {
          setSelectedDeckId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить список колод. Проверьте backend.");
      } finally {
        setLoadingDecks(false);
      }
    };

    fetchDecks();
  }, []);

  // --- Загрузить следующую карточку для выбранной колоды ---
  const loadNextCard = async () => {
    if (!selectedDeckId) {
      setError("Сначала выберите колоду.");
      return;
    }
    setLoadingCard(true);
    setError("");
    setMessage("");
    setShowAnswer(false);
    setCurrentCard(null);

    try {
      const url = `${API_BASE}/review/next?deck_id=${selectedDeckId}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки карточки: ${res.status}`);
      }
      const data = await res.json();

      if (!data.card) {
        setMessage("На сегодня в этой колоде нет карточек к повторению. 🎉");
        setCurrentCard(null);
      } else {
        setCurrentCard(data.card);
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось получить следующую карточку. Проверьте backend.");
    } finally {
      setLoadingCard(false);
    }
  };

  // --- Отправка оценки по карточке ---
  const handleGrade = async (grade) => {
    if (!currentCard || !selectedDeckId) return;

    setAnswering(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/review/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deck_id: selectedDeckId,
          card_id: currentCard.card_id,
          grade,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ошибка отправки оценки: ${res.status} ${text}`);
      }

      const data = await res.json();
      // data.next_review — дата следующего повторения (можно отобразить пользователю)
      console.log("Next review date:", data.next_review);

      // Сразу загружаем следующую карточку
      await loadNextCard();
    } catch (err) {
      console.error(err);
      setError("Не удалось отправить оценку. Проверьте backend.");
    } finally {
      setAnswering(false);
      setShowAnswer(false);
    }
  };

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        {/* Заголовок */}
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Ежедневное повторение </h1>
          <p className="text-sm text-slate-300">
            Здесь пользователь видит карточки, которые нужно повторить сегодня,
            и оценивает, насколько хорошо он помнит ответ. Бекенд использует
            простую SRS-логику, чтобы планировать дату следующего повторения.
          </p>
        </header>

        {/* Выбор колоды */}
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="text-xs text-slate-400">Выбор колоды</div>
              {loadingDecks ? (
                <div className="text-xs text-slate-400">
                  Загрузка списка колод...
                </div>
              ) : decks.length === 0 ? (
                <div className="text-xs text-amber-400">
                  Колоды ещё не созданы. Сначала создайте колоду и карточки на
                  главной странице или через Swagger (эндпоинты{" "}
                  <code>/decks/</code> и{" "}
                  <code>/decks/&lbrace;deck_id&rbrace;/cards</code>).
                </div>
              ) : (
                <select
                  className="w-full md:w-64 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={selectedDeckId ?? ""}
                  onChange={(e) =>
                    setSelectedDeckId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title} (ID: {deck.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={loadNextCard}
              disabled={!selectedDeckId || loadingCard || loadingDecks}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 px-4 py-2 text-sm font-semibold transition-colors"
            >
              {loadingCard ? "Загрузка..." : "Начать повторение"}
            </button>
          </div>

          {/* Сообщения об ошибках / инфо */}
          {error && (
            <div className="mt-2 rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-2 rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200">
              {message}
            </div>
          )}
        </section>

        {/* Карточка для повторения */}
        {currentCard && (
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-xs text-slate-400 mb-1">
              Карточка к повторению · deck #{currentCard.deck_id} · card #
              {currentCard.card_id}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-200">Вопрос:</div>
              <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm whitespace-pre-wrap">
                {currentCard.question}
              </div>

              <button
                type="button"
                onClick={() => setShowAnswer((prev) => !prev)}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 py-2 px-4 text-sm font-semibold transition-colors"
              >
                {showAnswer ? "Скрыть ответ" : "Показать ответ"}
              </button>

              {showAnswer && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-200">
                    Ответ:
                  </div>
                  <div className="rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-sm whitespace-pre-wrap">
                    {currentCard.answer}
                  </div>

                  <div className="pt-2 text-xs text-slate-400">
                    Оцените, насколько хорошо вы помните эту карточку:
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleGrade(0)}
                      disabled={answering}
                      className="rounded-lg bg-red-700 hover:bg-red-600 disabled:bg-slate-700 disabled:text-slate-400 px-3 py-2 text-xs font-semibold transition-colors"
                    >
                      Сложно (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrade(1)}
                      disabled={answering}
                      className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 px-3 py-2 text-xs font-semibold transition-colors"
                    >
                      Нормально (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrade(2)}
                      disabled={answering}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 px-3 py-2 text-xs font-semibold transition-colors"
                    >
                      Легко (2)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
