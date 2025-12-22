"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "../../i18n/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/* ---------------------------------- Utils --------------------------------- */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function truncateMiddle(str, left = 10, right = 10) {
  if (!str) return "";
  if (str.length <= left + right + 3) return str;
  return `${str.slice(0, left)}...${str.slice(-right)}`;
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
function Badge({ tone = "default", children }) {
  const styles =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
      : tone === "info"
      ? "border-sky-500/30 bg-sky-950/40 text-sky-200"
      : tone === "warn"
      ? "border-amber-500/30 bg-amber-950/40 text-amber-200"
      : "border-slate-700 bg-slate-900/60 text-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        styles
      )}
    >
      {children}
    </span>
  );
}

function Button({ variant = "primary", loading, className, children, ...props }) {
  const styles =
    variant === "primary"
      ? "bg-sky-600 hover:bg-sky-500 text-white"
      : variant === "secondary"
      ? "bg-slate-900/60 hover:bg-slate-800/70 text-slate-100 border border-slate-800"
      : variant === "ghost"
      ? "bg-transparent hover:bg-slate-900/60 text-slate-200 border border-slate-800/70"
      : "bg-emerald-600 hover:bg-emerald-500 text-white";

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

function ButtonLink({ href, variant = "primary", className, children }) {
  const styles =
    variant === "primary"
      ? "bg-sky-600 hover:bg-sky-500 text-white"
      : variant === "secondary"
      ? "bg-slate-900/60 hover:bg-slate-800/70 text-slate-100 border border-slate-800"
      : "bg-transparent hover:bg-slate-900/60 text-slate-200 border border-slate-800/70";

  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold",
        "transition",
        styles,
        className
      )}
    >
      {children}
    </Link>
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

function FeatureCard({ title, description }) {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-xs text-slate-400">{description}</div>
    </div>
  );
}

function StepCard({ step, title, description, href, cta }) {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-xs font-semibold">
          {step}
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs text-slate-400">{description}</div>
        </div>
      </div>
      {href ? (
        <Link
          href={href}
          className="mt-4 inline-flex text-xs font-semibold text-sky-300 hover:text-sky-200"
        >
          {cta}
        </Link>
      ) : null}
    </div>
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

function Toast({ toast, onClose, closeLabel }) {
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
            {closeLabel}
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
  const t = useTranslations("landing");

  const [user, setUser] = useState(null);
  const isAuthed = useMemo(() => Boolean(user?.id), [user]);

  const [toast, setToast] = useState(null);
  const pushToast = useCallback((type, title, message) => {
    setToast({ type, title, message, id: Date.now() });
  }, []);

  const [text, setText] = useState("");
  const [cards, setCards] = useState([]);
  const [maxCards, setMaxCards] = useState(5);
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState("");

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
        throw new Error(t("messages.unauthorized"));
      }

      if (!response.ok) {
        throw new Error(t("messages.loadDecksError", { status: response.status }));
      }

      const data = await response.json();
      setDecks(Array.isArray(data) ? data : []);
    } catch (e) {
      const fallback = t("messages.unknownLoadDecks");
      const msg = e instanceof Error ? e.message : fallback;
      setErrorDecks(msg);
    } finally {
      setLoadingDecks(false);
    }
  }, [t]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getUser();
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
      const msg = t("messages.signInRequired");
      setErrorDecks(msg);
      pushToast("warning", t("toasts.signInRequiredTitle"), msg);
      return;
    }

    const title = deckTitle.trim();
    const description = (deckDescription || "").trim();

    if (!title) {
      const msg = t("messages.missingTitle");
      setErrorDecks(msg);
      pushToast("warning", t("toasts.missingTitleTitle"), msg);
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

      if (response.status === 401) throw new Error(t("messages.unauthorized"));

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || t("messages.createDeckError", { status: response.status }));
      }

      setDeckTitle("");
      setDeckDescription("");
      pushToast("success", t("toasts.deckCreatedTitle"), t("toasts.deckCreatedMessage", { title }));
      await loadDecks();
    } catch (e) {
      const fallback = t("messages.unknownCreateDeck");
      const msg = e instanceof Error ? e.message : fallback;
      setErrorDecks(msg);
      pushToast("error", t("toasts.createFailedTitle"), msg);
    } finally {
      setCreatingDeck(false);
    }
  }

  async function handleGenerate() {
    setErrorAI("");
    setCards([]);

    const trimmed = text.trim();
    if (!trimmed) {
      const msg = t("messages.missingText");
      setErrorAI(msg);
      pushToast("warning", t("toasts.missingTextTitle"), msg);
      return;
    }

    const maxCardsNumber = Math.min(20, Math.max(1, Number(maxCards) || 5));
    setMaxCards(maxCardsNumber);

    setLoadingAI(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, max_cards: maxCardsNumber }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || t("messages.aiFailed", { status: response.status }));
      }

      const data = await response.json();
      const list = Array.isArray(data.cards) ? data.cards : [];
      setCards(list);

      pushToast(
        "success",
        t("toasts.cardsGeneratedTitle"),
        list.length ? t("toasts.cardsGeneratedMessage", { count: list.length }) : t("toasts.cardsGeneratedEmpty")
      );
    } catch (e) {
      const fallback = t("messages.unknownGenerate");
      const msg = e instanceof Error ? e.message : fallback;
      setErrorAI(msg);
      pushToast("error", t("toasts.generationFailedTitle"), msg);
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
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 md:p-10">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{t("badges.ai")}</Badge>
              <Badge tone="success">{t("badges.sm2")}</Badge>
              <Badge>{t("badges.fast")}</Badge>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("hero.title")}</h1>
              <p className="text-sm md:text-base text-slate-300">{t("hero.subtitle")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/register" variant="primary">
                {t("hero.ctaPrimary")}
              </ButtonLink>
              <ButtonLink href="#quickstart" variant="secondary">
                {t("hero.ctaSecondary")}
              </ButtonLink>
              {isAuthed ? (
                <ButtonLink href="/review" variant="ghost">
                  {t("hero.ctaReview")}
                </ButtonLink>
              ) : (
                <ButtonLink href="/login" variant="ghost">
                  {t("hero.ctaSignin")}
                </ButtonLink>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                {t("hero.apiLabel")}: <span className="text-slate-200">{API_BASE_URL}</span>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>{isAuthed ? t("hero.signedInAs", { user: userLabel }) : t("hero.signedOut")}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t("quickStart.title")}</div>
              <Badge tone="warn">{t("quickStart.badge")}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-xs font-semibold">
                  1
                </span>
                <div>
                  <div className="text-sm font-semibold">{t("quickStart.steps.oneTitle")}</div>
                  <div className="text-xs text-slate-400">{t("quickStart.steps.oneDesc")}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-xs font-semibold">
                  2
                </span>
                <div>
                  <div className="text-sm font-semibold">{t("quickStart.steps.twoTitle")}</div>
                  <div className="text-xs text-slate-400">{t("quickStart.steps.twoDesc")}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-xs font-semibold">
                  3
                </span>
                <div>
                  <div className="text-sm font-semibold">{t("quickStart.steps.threeTitle")}</div>
                  <div className="text-xs text-slate-400">{t("quickStart.steps.threeDesc")}</div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <ButtonLink href="/register" variant="primary">
                {t("quickStart.ctaPrimary")}
              </ButtonLink>
              <ButtonLink href="#quickstart" variant="secondary">
                {t("quickStart.ctaSecondary")}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{t("howItWorks.title")}</h2>
            <p className="text-sm text-slate-400">{t("howItWorks.subtitle")}</p>
          </div>
          <ButtonLink href="/register" variant="secondary">
            {t("howItWorks.cta")}
          </ButtonLink>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StepCard
            step="01"
            title={t("howItWorks.steps.oneTitle")}
            description={t("howItWorks.steps.oneDesc")}
            href="/register"
            cta={t("howItWorks.steps.oneCta")}
          />
          <StepCard
            step="02"
            title={t("howItWorks.steps.twoTitle")}
            description={t("howItWorks.steps.twoDesc")}
            href="#quickstart"
            cta={t("howItWorks.steps.twoCta")}
          />
          <StepCard
            step="03"
            title={t("howItWorks.steps.threeTitle")}
            description={t("howItWorks.steps.threeDesc")}
            href="/profile"
            cta={t("howItWorks.steps.threeCta")}
          />
          <StepCard
            step="04"
            title={t("howItWorks.steps.fourTitle")}
            description={t("howItWorks.steps.fourDesc")}
            href="/review"
            cta={t("howItWorks.steps.fourCta")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard title={t("features.aiTitle")} description={t("features.aiDesc")} />
          <FeatureCard title={t("features.spacedTitle")} description={t("features.spacedDesc")} />
          <FeatureCard title={t("features.progressTitle")} description={t("features.progressDesc")} />
        </div>
      </section>

      <section id="quickstart" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{t("lab.title")}</h2>
          <p className="text-sm text-slate-400">{t("lab.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CardShell
            title={t("generator.title")}
            subtitle={t("generator.subtitle")}
            right={
              <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
                POST <span className="text-slate-200">/ai/generate</span>
              </span>
            }
          >
            <div className="space-y-4">
              <Field label={t("generator.studyLabel")} hint={t("generator.studyHint")}>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder={t("generator.studyPlaceholder")}
                />
              </Field>

              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="w-full md:w-40">
                  <Field label={t("generator.maxLabel")} hint={t("generator.maxHint")}>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={maxCards}
                      onChange={(e) => setMaxCards(Number(e.target.value))}
                    />
                  </Field>
                </div>

                <Button onClick={handleGenerate} loading={loadingAI} className="w-full md:w-auto">
                  {loadingAI ? t("generator.generating") : t("generator.generate")}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full md:w-auto"
                  onClick={() => {
                    setText("");
                    setCards([]);
                    setErrorAI("");
                    pushToast("success", t("toasts.clearedTitle"), t("toasts.clearedMessage"));
                  }}
                >
                  {t("generator.clear")}
                </Button>
              </div>

              {errorAI ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
                  <div className="font-semibold">{t("generator.errorTitle")}</div>
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
                        <div className="text-xs text-slate-400">{t("generator.cardLabel", { index: i + 1 })}</div>
                        <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-[11px] text-slate-400">
                          {t("generator.qa")}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-50">{c.question}</div>
                      <div className="mt-2 text-sm text-slate-300">{c.answer}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                  <div className="text-sm font-semibold">{t("generator.noResultsTitle")}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {t.rich("generator.noResultsHint", {
                      strong: (chunks) => <span className="text-slate-200">{chunks}</span>,
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardShell>

          <CardShell
            title={t("decks.title")}
            subtitle={t("decks.subtitle")}
            right={
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
                  GET/POST <span className="text-slate-200">/decks/</span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    isAuthed
                      ? loadDecks()
                      : pushToast("warning", t("toasts.signInRequiredTitle"), t("messages.signInRequired"))
                  }
                  loading={loadingDecks}
                >
                  {t("decks.reload")}
                </Button>
              </div>
            }
          >
            {!isAuthed ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
                <div className="font-semibold">{t("decks.notSignedTitle")}</div>
                <div className="mt-1 text-xs opacity-90">
                  {t.rich("decks.notSignedHint", {
                    login: (chunks) => (
                      <Link className="text-amber-200 hover:underline" href="/login">
                        {chunks}
                      </Link>
                    ),
                    register: (chunks) => (
                      <Link className="text-amber-200 hover:underline" href="/register">
                        {chunks}
                      </Link>
                    ),
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t("decks.createTitle")}</h3>
                  <span className="text-[11px] text-slate-500">{t("decks.titleRequired")}</span>
                </div>

                <Field label={t("decks.titleLabel")}>
                  <Input
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    placeholder={t("decks.titlePlaceholder")}
                  />
                </Field>

                <Field label={t("decks.descriptionLabel")} hint={t("decks.descriptionHint")}>
                  <Textarea
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    rows={3}
                    placeholder={t("decks.descriptionPlaceholder")}
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
                  {creatingDeck ? t("decks.creatingButton") : t("decks.createButton")}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t("decks.listTitle")}</h3>
                  <span className="text-[11px] text-slate-500">
                    {isAuthed ? t("decks.totalCount", { count: decks.length }) : ""}
                  </span>
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
                              {t("decks.idLabel", {
                                id: truncateMiddle(String(d.id), 8, 8),
                              })}
                            </div>
                          </div>
                          <Link
                            href="/profile"
                            className="rounded-xl border border-slate-800 bg-slate-900/30 px-2.5 py-1 text-[11px] text-slate-300 opacity-0 group-hover:opacity-100 transition hover:bg-slate-800/60"
                          >
                            {t("decks.manage")}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                    <div className="text-sm font-semibold">{t("decks.noDecksTitle")}</div>
                    <div className="mt-1 text-xs text-slate-400">{t("decks.noDecksHint")}</div>
                  </div>
                )}
              </div>
            </div>
          </CardShell>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{t("cta.title")}</h2>
            <p className="text-sm text-slate-400">{t("cta.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/register" variant="primary">
              {t("cta.primary")}
            </ButtonLink>
            <ButtonLink href="/review" variant="secondary">
              {t("cta.secondary")}
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="pb-4 text-center text-xs text-slate-500">{t("footer")}</footer>

      <Toast toast={toast} onClose={() => setToast(null)} closeLabel={t("toast.close")} />
    </div>
  );
}
