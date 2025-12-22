"use client";

import Link from "next-intl/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next-intl/navigation";
import { supabase } from "../../lib/supabaseClient";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/* ------------------------------ UI helpers ------------------------------ */
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
      : "bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800";

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

function StatTile({ label, value, hint, tone = "default" }) {
  const toneText =
    tone === "accent"
      ? "text-sky-100"
      : tone === "warn"
      ? "text-amber-100"
      : tone === "success"
      ? "text-emerald-100"
      : "text-slate-50";

  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={cx("mt-2 text-3xl font-bold tracking-tight", toneText)}>{value ?? "..."}</div>
      {hint ? <div className="mt-2 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="h-[118px] w-full animate-pulse rounded-3xl border border-slate-800/70 bg-slate-950/50" />
  );
}

/* ------------------------------ API helper ------------------------------ */
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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    router.push("/login");
    throw new Error(t("messages.unauthorized"));
  }

  return res;
}

/* -------------------------------- Page -------------------------------- */
export default function StatsPage() {
  const t = useTranslations("stats");
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await apiFetchAuthed(router, t, "/stats/overview", { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const details = text ? ` "${text}"` : "";
        throw new Error(t("messages.failedLoad", { status: res.status, details }));
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setStats(null);
      setError(err?.message || t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const completionHint = useMemo(() => {
    if (!stats) return { pct: 0, text: t("progress.empty") };
    const total = Number(stats.total_cards || 0);
    const learned = Number(stats.learned_cards || 0);
    if (!total) return { pct: 0, text: t("progress.emptyNoCards") };
    const pct = Math.max(0, Math.min(100, Math.round((learned / total) * 100)));
    return { pct, text: t("progress.percent", { pct }) };
  }, [stats, t]);

  const dueHint = useMemo(() => {
    if (!stats) return t("dueHints.none");
    const due = Number(stats.due_today || 0);
    if (due === 0) return t("dueHints.zero");
    if (due < 10) return t("dueHints.light");
    if (due < 30) return t("dueHints.medium");
    return t("dueHints.high");
  }, [stats, t]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/30 p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t("header.title")} <span className="text-slate-400 text-base">(UC-4)</span>
            </h1>
            <p className="text-sm text-slate-300">{t("header.subtitle")}</p>
            <div className="mt-2 text-xs text-slate-500">
              {t("header.endpointLabel")}: <span className="text-slate-300">GET {API_BASE}/stats/overview</span> -{" "}
              <span className="text-emerald-300">{t("header.protected")}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadStats} loading={loading} className="w-auto">
              {t("actions.refresh")}
            </Button>
            <Link
              href="/review"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800/70 transition"
            >
              {t("actions.goToReview")}
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <Alert type="error" title={t("alerts.errorTitle")}>
          {error}
        </Alert>
      ) : null}

      <CardShell
        title={t("overview.title")}
        subtitle={t("overview.subtitle")}
        right={
          <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
            {t("overview.badge")}
          </span>
        }
      >
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
            <div className="md:col-span-2">
              <SkeletonTile />
            </div>
          </div>
        ) : !stats ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
            <div className="text-sm font-semibold">{t("empty.title")}</div>
            <div className="mt-1 text-xs text-slate-400">{t("empty.hint")}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <StatTile label={t("tiles.totalDecks")} value={stats.total_decks} hint={t("tiles.totalDecksHint")} />
              <StatTile label={t("tiles.totalCards")} value={stats.total_cards} hint={t("tiles.totalCardsHint")} />

              <StatTile
                label={t("tiles.dueToday")}
                value={stats.due_today}
                hint={dueHint}
                tone={Number(stats.due_today || 0) > 25 ? "warn" : "accent"}
              />

              <StatTile
                label={t("tiles.learned")}
                value={stats.learned_cards}
                hint={t("tiles.learnedHint")}
                tone="success"
              />

              <div className="md:col-span-2 rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs text-slate-400">{t("reviewed.label")}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                    {stats.reviewed_cards ?? "..."}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">{t("reviewed.hint")}</div>
                </div>

                <div className="w-full md:w-[320px]">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{t("progress.label")}</span>
                    <span className="text-slate-300">{completionHint?.text ?? ""}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-900/60 border border-slate-800">
                    <div
                      className="h-full bg-emerald-500/70 transition-all duration-300"
                      style={{ width: `${completionHint?.pct ?? 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600">{t("progress.tip")}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
              <div className="text-sm font-semibold">{t("next.title")}</div>
              <div className="mt-1 text-xs text-slate-400">{t("next.hint")}</div>
            </div>
          </div>
        )}
      </CardShell>
    </div>
  );
}
