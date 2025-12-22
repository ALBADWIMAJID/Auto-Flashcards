"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Link, useRouter } from "../../../i18n/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/* ---------------------------------- UI Utils --------------------------------- */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200/20 border-t-slate-200/80"
      aria-hidden="true"
    />
  );
}

function Button({ variant = "primary", loading, className, children, ...props }) {
  const styles =
    variant === "primary"
      ? "bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800"
      : variant === "secondary"
      ? "bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800"
      : variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800"
      : variant === "warn"
      ? "bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800"
      : "bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800";

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold",
        "transition disabled:opacity-70 disabled:cursor-not-allowed",
        styles,
        className
      )}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Select({ className, ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100",
        "outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/15",
        className
      )}
    />
  );
}

function Alert({ type = "error", title, children }) {
  const tone =
    type === "success"
      ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-100"
      : type === "info"
      ? "border-sky-500/30 bg-sky-950/30 text-sky-100"
      : "border-rose-500/30 bg-rose-950/30 text-rose-100";

  return (
    <div className={cx("rounded-2xl border px-4 py-3", tone)}>
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      <div className={cx(title ? "mt-1" : "", "text-xs opacity-90")}>{children}</div>
    </div>
  );
}

function CardShell({ title, subtitle, right, children }) {
  return (
    <section className="rounded-3xl border border-slate-800/70 bg-slate-900/40 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-col gap-3 border-b border-slate-800/60 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-base md:text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="text-xs md:text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SkeletonBlock({ h = "h-12" }) {
  return (
    <div className={cx("w-full animate-pulse rounded-2xl border border-slate-800/70 bg-slate-950/50", h)} />
  );
}

/* --------------------------------- Data helpers --------------------------------- */
async function apiFetchAuthed(router, t, path, options = {}) {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw new Error(sessionErr.message);

  const token = sessionData?.session?.access_token;
  if (!token) {
    router.push("/login");
    throw new Error(t("messages.noSession"));
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    router.push("/login");
    throw new Error(t("messages.unauthorized"));
  }

  return res;
}

/* --------------------------------- Page --------------------------------- */
export default function ReviewPage() {
  const t = useTranslations("review");
  const router = useRouter();

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(true);

  const [currentCard, setCurrentCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  const hasDecks = decks.length > 0;
  const canLoad = Boolean(selectedDeckId) && !loadingCard;

  const loadDecks = useCallback(async () => {
    setLoadingDecks(true);
    setError("");

    try {
      const res = await apiFetchAuthed(router, t, "/decks/", { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const details = text ? ` "${text}"` : "";
        throw new Error(t("messages.failedLoadDecks", { status: res.status, details }));
      }

      const list = (await res.json()) || [];
      setDecks(Array.isArray(list) ? list : []);

      const firstId = Array.isArray(list) && list[0]?.id ? String(list[0].id) : "";
      setSelectedDeckId(firstId);
    } catch (err) {
      setError(err?.message || t("messages.loadDecksError"));
      setDecks([]);
      setSelectedDeckId("");
    } finally {
      setLoadingDecks(false);
    }
  }, [router, t]);

  const loadNextCard = useCallback(async () => {
    if (!selectedDeckId) {
      setError(t("messages.noDeckSelected"));
      return;
    }

    setLoadingCard(true);
    setError("");
    setInfoMessage("");
    setShowAnswer(false);

    try {
      const res = await apiFetchAuthed(router, t, `/review/next?deck_id=${encodeURIComponent(selectedDeckId)}`, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const details = text ? ` "${text}"` : "";
        throw new Error(t("messages.failedLoadNext", { status: res.status, details }));
      }

      const json = await res.json();
      if (!json?.card) {
        setCurrentCard(null);
        setInfoMessage(t("messages.noDueCards"));
      } else {
        setCurrentCard(json.card);
      }
    } catch (err) {
      setError(err?.message || t("messages.loadNextError"));
      setCurrentCard(null);
    } finally {
      setLoadingCard(false);
    }
  }, [router, selectedDeckId, t]);

  const handleAnswer = useCallback(
    async (grade) => {
      if (!currentCard || !selectedDeckId) return;

      setSubmitting(true);
      setError("");
      setInfoMessage("");

      try {
        const res = await apiFetchAuthed(router, t, "/review/answer", {
          method: "POST",
          body: JSON.stringify({
            deck_id: Number.isFinite(Number(selectedDeckId)) ? Number(selectedDeckId) : selectedDeckId,
            card_id: currentCard.id,
            grade,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const details = text ? ` "${text}"` : "";
          throw new Error(t("messages.failedSubmit", { status: res.status, details }));
        }

        const data = await res.json();
        if (!data?.next_card) {
          setCurrentCard(null);
          setInfoMessage(t("messages.sessionFinished"));
          setShowAnswer(false);
        } else {
          setCurrentCard(data.next_card);
          setShowAnswer(false);
        }
        setSessionCount((n) => n + 1);
      } catch (err) {
        setError(err?.message || t("messages.submitError"));
      } finally {
        setSubmitting(false);
      }
    },
    [router, currentCard, selectedDeckId, t]
  );

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  useEffect(() => {
    if (!selectedDeckId) return;
    setCurrentCard(null);
    setInfoMessage("");
    setError("");
    setSessionCount(0);
    void loadNextCard();
  }, [selectedDeckId, loadNextCard]);

  const deckOptions = useMemo(() => {
    return decks.map((d) => ({
      id: String(d.id),
      title: d.title,
    }));
  }, [decks]);

  const activeDeck = useMemo(
    () => decks.find((d) => String(d.id) === String(selectedDeckId)),
    [decks, selectedDeckId]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/30 p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t("header.title")} <span className="text-slate-400 text-base">(UC-3)</span>
            </h1>
            <p className="text-sm text-slate-300">{t("header.subtitle")}</p>
            <div className="mt-2 text-xs text-slate-500">
              {t("header.apiLabel")}: <span className="text-slate-300">{API_BASE}</span> -{" "}
              <span className="text-emerald-300">{t("header.authRequired")}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" loading={loadingDecks} onClick={() => loadDecks()} className="w-auto">
              {t("actions.reloadDecks")}
            </Button>
            <Button
              variant="primary"
              loading={loadingCard}
              disabled={!selectedDeckId}
              onClick={() => loadNextCard()}
              className="w-auto"
            >
              {t("actions.loadNext")}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {error ? (
          <Alert type="error" title={t("alerts.errorTitle")}>
            {error}
          </Alert>
        ) : null}
        {infoMessage ? (
          <Alert type="success" title={t("alerts.infoTitle")}>
            {infoMessage}
          </Alert>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardShell
          title={t("deck.title")}
          subtitle={t("deck.subtitle")}
          right={
            <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
              GET <span className="text-slate-200">/decks/</span>
            </span>
          }
        >
          {loadingDecks ? (
            <div className="space-y-3">
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
          ) : !hasDecks ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
              <div className="font-semibold">{t("deck.emptyTitle")}</div>
              <div className="mt-1 text-xs opacity-90">
                {t.rich("deck.emptyHint", {
                  profile: (chunks) => (
                    <Link href="/profile" className="text-amber-200 hover:underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-end justify-between gap-3">
                  <label className="text-xs font-medium text-slate-200">{t("deck.availableLabel")}</label>
                  <span className="text-[11px] text-slate-500">{t("deck.totalCount", { count: decks.length })}</span>
                </div>

                <Select
                  value={selectedDeckId}
                  onChange={(e) => {
                    setSelectedDeckId(e.target.value);
                    setShowAnswer(false);
                  }}
                >
                  {deckOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} (id={d.id})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAnswer(false);
                    void loadNextCard();
                  }}
                  disabled={!canLoad}
                  className="w-full"
                >
                  {t("actions.refresh")}
                </Button>

                <Button
                  variant="primary"
                  onClick={() => {
                    setShowAnswer(false);
                    void loadNextCard();
                  }}
                  disabled={!canLoad}
                  className="w-full"
                >
                  {t("actions.nextCard")}
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">{t("deck.tipTitle")}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {t.rich("deck.tipBody", {
                    strong: (chunks) => <span className="text-slate-200">{chunks}</span>,
                  })}
                </div>
              </div>
            </div>
          )}
        </CardShell>

        <CardShell
          title={t("card.title")}
          subtitle={t("card.subtitle")}
          right={
            <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
              GET/POST <span className="text-slate-200">/review</span>
            </span>
          }
        >
          {loadingCard ? (
            <div className="space-y-3">
              <SkeletonBlock h="h-6" />
              <SkeletonBlock h="h-20" />
              <SkeletonBlock h="h-10" />
            </div>
          ) : !currentCard ? (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
              <div className="text-sm font-semibold">{t("card.emptyTitle")}</div>
              <div className="mt-1 text-xs text-slate-400">
                {selectedDeckId ? t("card.emptyHintWithDeck") : t("card.emptyHintNoDeck")}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t("card.deckLabel", { deck: activeDeck?.title || selectedDeckId })}</span>
                  <span>{t("card.cardLabel", { id: currentCard.id })}</span>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-400">{t("card.questionLabel")}</div>
                  <div className="mt-1 text-base font-semibold text-slate-50">{currentCard.question}</div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAnswer((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 transition"
                  >
                    {showAnswer ? t("card.hideAnswer") : t("card.showAnswer")}
                  </button>

                  {showAnswer ? (
                    <div className="mt-3 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 text-sm text-slate-200">
                      {currentCard.answer}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-500">{t("card.revealHint")}</div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/40 p-4">
                <div className="text-xs font-semibold text-slate-300 mb-3">{t("grade.title")}</div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="danger" disabled={submitting} loading={submitting} onClick={() => handleAnswer(0)}>
                    {t("grade.again")}
                  </Button>

                  <Button variant="warn" disabled={submitting} onClick={() => handleAnswer(3)}>
                    {t("grade.hard")}
                  </Button>

                  <Button variant="primary" disabled={submitting} onClick={() => handleAnswer(4)}>
                    {t("grade.good")}
                  </Button>

                  <Button variant="success" disabled={submitting} onClick={() => handleAnswer(5)}>
                    {t("grade.easy")}
                  </Button>
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  {t.rich("grade.hint", {
                    strong: (chunks) => <span className="text-slate-300">{chunks}</span>,
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>{t("session.title")}</span>
                  <span className="text-slate-400">{t("session.count", { count: sessionCount })}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${Math.min(sessionCount * 12, 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-500">{t("session.hint")}</div>
              </div>
            </div>
          )}
        </CardShell>
      </div>
    </div>
  );
}
