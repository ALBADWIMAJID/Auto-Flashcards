"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

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

function TopNav() {
  const items = [
    { href: "/", label: "Home" },
    { href: "/decks", label: "Decks" },
    { href: "/review", label: "Review" },
    { href: "/stats", label: "Stats" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <div className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-sm font-bold tracking-tight">AF</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Auto-Flashcards</div>
              <div className="text-xs text-slate-400">Review - UC-3 - SM-2</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/30 p-1">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={cx(
                  "rounded-xl px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-50 hover:bg-slate-800/60 transition",
                  it.href === "/review" && "bg-slate-800/60 text-slate-50"
                )}
              >
                {it.label}
              </Link>
            ))}
          </div>

          <Link
            href="/profile"
            className="rounded-2xl border border-slate-800 bg-slate-900/30 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/60 transition"
          >
            Back to profile
          </Link>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Data helpers --------------------------------- */
async function apiFetchAuthed(router, path, options = {}) {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw new Error(sessionErr.message);

  const token = sessionData?.session?.access_token;
  if (!token) {
    router.push("/login");
    throw new Error("No active session token (please login).");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    router.push("/login");
    throw new Error("Unauthorized (token missing/expired).");
  }

  return res;
}

/* --------------------------------- Page --------------------------------- */
export default function ReviewPage() {
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
      const res = await apiFetchAuthed(router, "/decks/", { method: "GET" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Failed to load decks: ${res.status}${t ? ` "${t}"` : ""}`);
      }

      const list = (await res.json()) || [];
      setDecks(Array.isArray(list) ? list : []);

      const firstId = Array.isArray(list) && list[0]?.id ? String(list[0].id) : "";
      setSelectedDeckId(firstId);
    } catch (err) {
      setError(err?.message || "Error while loading decks.");
      setDecks([]);
      setSelectedDeckId("");
    } finally {
      setLoadingDecks(false);
    }
  }, [router]);

  const loadNextCard = useCallback(async () => {
    if (!selectedDeckId) {
      setError("Please select a deck first.");
      return;
    }

    setLoadingCard(true);
    setError("");
    setInfoMessage("");
    setShowAnswer(false);

    try {
      const res = await apiFetchAuthed(router, `/review/next?deck_id=${encodeURIComponent(selectedDeckId)}`, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Error loading next card: ${res.status}${text ? ` "${text}"` : ""}`);
      }

      const json = await res.json();
      if (!json?.card) {
        setCurrentCard(null);
        setInfoMessage("No due cards today for this deck.");
      } else {
        setCurrentCard(json.card);
      }
    } catch (err) {
      setError(err?.message || "Error while loading next card.");
      setCurrentCard(null);
    } finally {
      setLoadingCard(false);
    }
  }, [router, selectedDeckId]);

  const handleAnswer = useCallback(
    async (grade) => {
      if (!currentCard || !selectedDeckId) return;

      setSubmitting(true);
      setError("");
      setInfoMessage("");

      try {
        const res = await apiFetchAuthed(router, "/review/answer", {
          method: "POST",
          body: JSON.stringify({
            deck_id: Number.isFinite(Number(selectedDeckId)) ? Number(selectedDeckId) : selectedDeckId,
            card_id: currentCard.id,
            grade,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Error submitting answer: ${res.status}${text ? ` "${text}"` : ""}`);
        }

        const data = await res.json();
        if (!data?.next_card) {
          setCurrentCard(null);
          setInfoMessage("Session finished for this deck.");
          setShowAnswer(false);
        } else {
          setCurrentCard(data.next_card);
          setShowAnswer(false);
        }
        setSessionCount((n) => n + 1);
      } catch (err) {
        setError(err?.message || "Error while submitting answer.");
      } finally {
        setSubmitting(false);
      }
    },
    [router, currentCard, selectedDeckId]
  );

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  useEffect(() => {
    // When deck changes reset and load
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
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <TopNav />

      {/* Background glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        {/* Page header */}
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/30 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Review mode <span className="text-slate-400 text-base">(UC-3)</span>
              </h1>
              <p className="text-sm text-slate-300">
                Select a deck, flip the card, then grade your recall (SM-2). Keep runs short and focused.
              </p>
              <div className="mt-2 text-xs text-slate-500">
                API: <span className="text-slate-300">{API_BASE}</span> - <span className="text-emerald-300">Auth required</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" loading={loadingDecks} onClick={() => loadDecks()} className="w-auto">
                Reload decks
              </Button>
              <Button
                variant="primary"
                loading={loadingCard}
                disabled={!selectedDeckId}
                onClick={() => loadNextCard()}
                className="w-auto"
              >
                Load next
              </Button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          {error ? (
            <Alert type="error" title="Error">
              {error}
            </Alert>
          ) : null}
          {infoMessage ? (
            <Alert type="success" title="Info">
              {infoMessage}
            </Alert>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: deck selection */}
          <CardShell
            title="Choose a deck"
            subtitle="Your review session will use due cards from the selected deck."
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
                <div className="font-semibold">No decks found</div>
                <div className="mt-1 text-xs opacity-90">
                  Create a deck first from{" "}
                  <Link href="/profile" className="text-amber-200 hover:underline">
                    Profile
                  </Link>
                  .
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-end justify-between gap-3">
                    <label className="text-xs font-medium text-slate-200">Available decks</label>
                    <span className="text-[11px] text-slate-500">{decks.length} total</span>
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
                    Refresh current
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
                    Next card
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                  <div className="text-sm font-semibold">Tip</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Click <span className="text-slate-200">Show answer</span>, then pick Again / Hard / Good / Easy.
                    If unsure, lean on <span className="text-slate-200">Good</span> to keep momentum.
                  </div>
                </div>
              </div>
            )}
          </CardShell>

          {/* Right: current card */}
          <CardShell
            title="Current card"
            subtitle="Question first, then reveal the answer, then grade your recall."
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
                <div className="text-sm font-semibold">No active card</div>
                <div className="mt-1 text-xs text-slate-400">
                  {selectedDeckId ? "Try loading next card." : "Select a deck first."}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Deck: {activeDeck?.title || selectedDeckId}</span>
                    <span>Card: {currentCard.id}</span>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-400">Question</div>
                    <div className="mt-1 text-base font-semibold text-slate-50">{currentCard.question}</div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAnswer((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 transition"
                    >
                      {showAnswer ? "Hide answer" : "Show answer"}
                    </button>

                    {showAnswer ? (
                      <div className="mt-3 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 text-sm text-slate-200">
                        {currentCard.answer}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-slate-500">Reveal the answer when you're ready.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/70 bg-slate-950/40 p-4">
                  <div className="text-xs font-semibold text-slate-300 mb-3">Grade your recall</div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="danger" disabled={submitting} loading={submitting} onClick={() => handleAnswer(0)}>
                      Again (0)
                    </Button>

                    <Button variant="warn" disabled={submitting} onClick={() => handleAnswer(3)}>
                      Hard (3)
                    </Button>

                    <Button variant="primary" disabled={submitting} onClick={() => handleAnswer(4)}>
                      Good (4)
                    </Button>

                    <Button variant="success" disabled={submitting} onClick={() => handleAnswer(5)}>
                      Easy (5)
                    </Button>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    If you're not sure, prefer <span className="text-slate-300">Good</span>.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/70 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Session</span>
                    <span className="text-slate-400">{sessionCount} cards graded</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${Math.min(sessionCount * 12, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Progress resets when you switch decks. Keep a streak going.
                  </div>
                </div>
              </div>
            )}
          </CardShell>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-600">
          Review UI - consistent Tailwind components - App Router navigation
        </footer>
      </div>
    </main>
  );
}
