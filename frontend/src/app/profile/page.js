"use client";

import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

/**
 * Страница профиля (UC-5), связанная с бекендом:
 *   - GET  /profile/
 *   - PUT  /profile/
 *   - POST /profile/reset-progress
 */
export default function ProfilePage() {
  const [form, setForm] = useState({
    username: "",
    language: "ru",
    theme: "dark",
    daily_goal: 20,
  });

  const [lastResetAt, setLastResetAt] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --- Загрузка профиля при открытии страницы ---
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/profile/`);
        if (!res.ok) {
          throw new Error(`Ошибка загрузки профиля: ${res.status}`);
        }
        const data = await res.json();
        setForm({
          username: data.username ?? "",
          language: data.language ?? "ru",
          theme: data.theme ?? "dark",
          daily_goal: data.daily_goal ?? 20,
        });
        setLastResetAt(data.last_reset_at ?? null);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить профиль. Проверьте backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (field) => (event) => {
    const value =
      field === "daily_goal" ? Number(event.target.value) : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // --- Сохранить настройки профиля ---
  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/profile/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.username,
          language: form.language,
          theme: form.theme,
          daily_goal: form.daily_goal,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ошибка сохранения профиля: ${res.status}`);
      }

      const data = await res.json();
      setMessage("Настройки профиля сохранены.");
      setLastResetAt(data.last_reset_at ?? lastResetAt);
    } catch (err) {
      console.error(err);
      setError("Не удалось сохранить профиль.");
    } finally {
      setSaving(false);
    }
  };

  // --- Сброс прогресса по карточкам ---
  const handleResetProgress = async () => {
    if (
      !confirm(
        "Точно сбросить прогресс по всем карточкам во всех колодах?"
      )
    ) {
      return;
    }

    setResetting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/profile/reset-progress`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Ошибка сброса прогресса: ${res.status}`);
      }

      const data = await res.json();
      setMessage(
        `Прогресс сброшен: колод ${data.reset_decks}, карточек ${data.reset_cards}.`
      );
      setLastResetAt(data.timestamp ?? new Date().toISOString());
    } catch (err) {
      console.error(err);
      setError("Не удалось сбросить прогресс.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">
            Профиль пользователя 
          </h1>
          <p className="text-sm text-slate-300">
            Здесь можно настроить язык интерфейса, тему и дневную цель по
            карточкам, а также при необходимости сбросить прогресс по
            всем колодам.
          </p>
        </header>

        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
        >
          {loading && (
            <div className="text-xs text-slate-400 mb-2">
              Загрузка профиля...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-xs text-red-200 mb-2">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200 mb-2">
              {message}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-medium">
              Имя пользователя
            </label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={form.username}
              onChange={handleChange("username")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium">
                Язык интерфейса
              </label>
              <select
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
                value={form.language}
                onChange={handleChange("language")}
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium">
                Тема оформления
              </label>
              <select
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
                value={form.theme}
                onChange={handleChange("theme")}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium">
              Дневная цель по карточкам
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={form.daily_goal}
              onChange={handleChange("daily_goal")}
            />
          </div>

          {lastResetAt && (
            <div className="text-[10px] text-slate-500">
              Последний сброс прогресса: {lastResetAt}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 py-2 px-4 text-sm font-semibold transition-colors"
            >
              {saving ? "Сохранение..." : "Сохранить настройки"}
            </button>

            <button
              type="button"
              disabled={resetting}
              onClick={handleResetProgress}
              className="rounded-lg bg-red-700 hover:bg-red-600 disabled:bg-slate-700 disabled:text-slate-400 py-2 px-4 text-xs font-semibold transition-colors"
            >
              {resetting ? "Сброс..." : "Сбросить прогресс по карточкам"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
