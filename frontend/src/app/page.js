"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/* ---------------------------------- Utils --------------------------------- */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function truncateMiddle(str, left = 10, right = 10) {
  if (!str) return "";
  if (str.length <= left + right + 3) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}

/* ------------------------------- Auth + Fetch ------------------------------- */
async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session?.access_token || null;
}

async function fetchWithAuth(url, options = {}) {
  const token = await getAccessToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}

/* --------------------------------- UI Bits -------------------------------- */
function TopNav({ isAuthed }) {
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
              <div className="text-xs text-slate-400">MVP • Next.js + FastAPI + Supabase</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/30 p-1">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={cx(
                  "rounded-xl px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-50 hover:bg-slate-800/60 transition",
                  it.href === "/" && "bg-slate-800/60 text-slate-50"
                )}
              >
                {it.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                isAuthed
                  ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-200"
                  : "border-rose-500/30 bg-rose-950/30 text-rose-200"
              )}
            >
              <span className={cx("h-2 w-2 rounded-full", isAuthed ? "bg-emerald-400" : "bg-rose-400")} />
              {isAuthed ? "Signed in" : "Signed out"}
            </span>
          </div>
        </div>
      </div>
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

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label className="text-xs font-medium text-slate-200">{label}</label>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100",
        "outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/15",
        "placeholder:text-slate-600",
        props.className
      )}
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100",
        "outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/15",
        "placeholder:text-slate-600",
        props.className
      )}
    />
  );
}

function Button({ variant = "primary", loading, className, ...props }) {
  const styles =
    variant === "primary"
      ? "bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800"
      : variant === "success"
      ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800"
      : "bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800";

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
      {props.children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200/20 border-t-slate-200/80"
      aria-hidden="true"
    />
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone =
    toast.type === "success"
      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-100"
      : toast.type === "warning"
      ? "border-amber-500/30 bg-amber-950/40 text-amber-100"
      : "border-rose-500/30 bg-rose-950/40 text-rose-100";

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))]">
      <div className={cx("rounded-2xl border px-4 py-3 shadow-xl backdrop-blur", tone)}>
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm">
            <div className="font-semibold">{toast.title}</div>
            <div className="mt-0.5 text-xs opacity-90">{toast.message}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-xs opacity-80 hover:opacity-100 hover:bg-white/5"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 w-full animate-pulse rounded-2xl border border-slate-800/70 bg-slate-950/50"
        />
      ))}
    </div>
  );
}

/* --------------------------------- Page ----------------------------------- */
export default function HomePage() {
  // --- Auth state ---
  const [user, setUser] = useState(null);
  const isAuthed = useMemo(() => Boolean(user?.id), [user]);

  // --- Toast ---
  const [toast, setToast] = useState(null);
  const pushToast = useCallback((type, title, message) => {
    setToast({ type, title, message, id: Date.now() });
  }, []);

  // --- AI ---
  const [text, setText] = useState("");
  const [cards, setCards] = useState([]);
  const [maxCards, setMaxCards] = useState(5);
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState("");

  // --- Decks ---
  const [decks, setDecks] = useState([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [errorDecks, setErrorDecks] = useState("");

  const loadDecks = useCallback(async () => {
    setErrorDecks("");
    setLoadingDecks(true);

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/decks/`);

      if (response.status === 401) {
        setDecks([]);
        throw new Error("Unauthorized (401). Please sign in again.");
      }

      if (!response.ok) {
        throw new Error(`Failed to load decks: ${response.status}`);
      }

      const data = await response.json();
      setDecks(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error while loading decks.";
      setErrorDecks(msg);
    } finally {
      setLoadingDecks(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getUser(); // authentic user fetch
      if (!mounted) return;

      setUser(data?.user || null);
      if (data?.user) loadDecks();
    }

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadDecks();
      else setDecks([]);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [loadDecks]);

  async function handleCreateDeck() {
    setErrorDecks("");

    if (!isAuthed) {
      const msg = "Please sign in before creating a deck.";
      setErrorDecks(msg);
      pushToast("warning", "Sign in required", msg);
      return;
    }

    const title = deckTitle.trim();
    const description = (deckDescription || "").trim();

    if (!title) {
      const msg = "Deck title is required.";
      setErrorDecks(msg);
      pushToast("warning", "Missing title", msg);
      return;
    }

    setCreatingDeck(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/decks/`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || null,
        }),
      });

      if (response.status === 401) throw new Error("Unauthorized (401). Please sign in again.");

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to create deck: ${response.status}`);
      }

      setDeckTitle("");
      setDeckDescription("");
      pushToast("success", "Deck created", `"${title}" has been created.`);
      await loadDecks();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error while creating deck.";
      setErrorDecks(msg);
      pushToast("error", "Create failed", msg);
    } finally {
      setCreatingDeck(false);
    }
  }

  async function handleGenerate() {
    setErrorAI("");
    setCards([]);

    const trimmed = text.trim();
    if (!trimmed) {
      const msg = "Please paste a study text first.";
      setErrorAI(msg);
      pushToast("warning", "Missing text", msg);
      return;
    }

    const maxCardsNumber = Math.min(20, Math.max(1, Number(maxCards) || 5));

    setLoadingAI(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, max_cards: maxCardsNumber }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `AI request failed: ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data.cards) ? data.cards : [];
      setCards(list);

      pushToast(
        "success",
        "Cards generated",
        list.length ? `Generated ${list.length} cards.` : "No cards were generated."
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error while generating.";
      setErrorAI(msg);
      pushToast("error", "Generation failed", msg);
    } finally {
      setLoadingAI(false);
    }
  }

  const userLabel = useMemo(() => {
    if (!user) return "";
    const email = user.email || "";
    return email ? truncateMiddle(email, 14, 10) : truncateMiddle(user.id, 10, 10);
  }, [user]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <TopNav isAuthed={isAuthed} />

      {/* Background glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/30 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Build decks faster. Review smarter.
              </h1>
              <p className="text-sm text-slate-300">
                Generate flashcards with AI and manage decks via your API.
              </p>
              <div className="mt-2 text-xs text-slate-500">
                API: <span className="text-slate-300">{API_BASE_URL}</span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="text-xs text-slate-400">
                Status:{" "}
                <span className={cx("font-semibold", isAuthed ? "text-emerald-300" : "text-rose-300")}>
                  {isAuthed ? "Authenticated" : "Not authenticated"}
                </span>
              </div>
              {isAuthed ? (
                <div className="text-xs text-slate-400">
                  User: <span className="text-slate-200">{userLabel}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Tip: go to <Link className="text-sky-300 hover:underline" href="/profile">Profile</Link> to sign in.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* AI */}
          <CardShell
            title="AI Card Generator"
            subtitle="Paste a study text, choose number of cards, and generate Q/A."
            right={
              <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
                POST <span className="text-slate-200">/ai/generate</span>
              </span>
            }
          >
            <div className="space-y-4">
              <Field label="Study text" hint="Try 2–5 paragraphs">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="Paste your lecture notes here…"
                />
              </Field>

              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="w-full md:w-40">
                  <Field label="Max cards" hint="1–20">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={maxCards}
                      onChange={(e) => setMaxCards(Number(e.target.value))}
                    />
                  </Field>
                </div>

                <Button
                  onClick={handleGenerate}
                  loading={loadingAI}
                  className="w-full md:w-auto"
                >
                  {loadingAI ? "Generating…" : "Generate"}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full md:w-auto"
                  onClick={() => {
                    setText("");
                    setCards([]);
                    setErrorAI("");
                    pushToast("success", "Cleared", "Text and results cleared.");
                  }}
                >
                  Clear
                </Button>
              </div>

              {errorAI ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
                  <div className="font-semibold">Error</div>
                  <div className="mt-1 text-xs opacity-90">{errorAI}</div>
                </div>
              ) : null}

              {loadingAI ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 w-full animate-pulse rounded-2xl border border-slate-800/70 bg-slate-950/50"
                    />
                  ))}
                </div>
              ) : cards.length ? (
                <div className="space-y-2">
                  {cards.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-xs text-slate-400">Card {i + 1}</div>
                        <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-[11px] text-slate-400">
                          Q/A
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-50">
                        {c.question}
                      </div>
                      <div className="mt-2 text-sm text-slate-300">{c.answer}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                  <div className="text-sm font-semibold">No results yet</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Paste text and click <span className="text-slate-200">Generate</span>.
                  </div>
                </div>
              )}
            </div>
          </CardShell>

          {/* Decks */}
          <CardShell
            title="Decks"
            subtitle="Create a deck and view your list (requires Bearer token via Supabase)."
            right={
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
                  GET/POST <span className="text-slate-200">/decks/</span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => (isAuthed ? loadDecks() : pushToast("warning", "Sign in required", "Please sign in first."))}
                  loading={loadingDecks}
                >
                  Reload
                </Button>
              </div>
            }
          >
            {!isAuthed ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
                <div className="font-semibold">Login required</div>
                <div className="mt-1 text-xs opacity-90">
                  Go to <Link className="text-amber-200 hover:underline" href="/profile">Profile</Link> to sign in, then you can read/create decks.
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Create deck</h3>
                  <span className="text-[11px] text-slate-500">Title required</span>
                </div>

                <Field label="Title">
                  <Input
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    placeholder="e.g., Data Structures — Week 3"
                  />
                </Field>

                <Field label="Description" hint="optional">
                  <Textarea
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    rows={3}
                    placeholder="Short description…"
                  />
                </Field>

                {errorDecks ? (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs text-rose-100">
                    {errorDecks}
                  </div>
                ) : null}

                <Button
                  variant="success"
                  onClick={handleCreateDeck}
                  loading={creatingDeck}
                  disabled={!isAuthed}
                  className="w-full"
                >
                  {creatingDeck ? "Creating…" : "Create deck"}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Your decks</h3>
                  <span className="text-[11px] text-slate-500">{isAuthed ? `${decks.length} total` : ""}</span>
                </div>

                {loadingDecks ? (
                  <SkeletonList />
                ) : isAuthed && decks.length ? (
                  <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {decks.map((d) => (
                      <div
                        key={d.id}
                        className="group rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4 hover:bg-slate-950/70 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">{d.title}</div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              ID: <span className="text-slate-300">{truncateMiddle(String(d.id), 8, 8)}</span>
                            </div>
                          </div>
                          <Link
                            href={`/decks`}
                            className="rounded-xl border border-slate-800 bg-slate-900/30 px-2.5 py-1 text-[11px] text-slate-300 opacity-0 group-hover:opacity-100 transition hover:bg-slate-800/60"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                    <div className="text-sm font-semibold">No decks yet</div>
                    <div className="mt-1 text-xs text-slate-400">Create your first deck on the left.</div>
                  </div>
                )}
              </div>
            </div>
          </CardShell>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-500">
          Built for the Auto-Flashcards project • UI with Tailwind utility classes.
        </footer>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}
