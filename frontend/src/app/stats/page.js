"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

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
async function apiFetchAuthed(router, path, options = {}) {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw new Error(sessionErr.message);

  const token = sessionData?.session?.access_token;
  if (!token) {
    router.push("/login");
    throw new Error("Unauthorized: please login first.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    router.push("/login");
    throw new Error("Unauthorized (token missing/expired).");
  }

  return res;
}

/* -------------------------------- Page -------------------------------- */
export default function StatsPage() {
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await apiFetchAuthed(router, "/stats/overview", { method: "GET" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Failed to load stats: ${res.status}${t ? ` "${t}"` : ""}`);
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setStats(null);
      setError(err?.message || "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const completionHint = useMemo(() => {
    if (!stats) return { pct: 0, text: "Start reviewing to build your stats." };
    const total = Number(stats.total_cards || 0);
    const learned = Number(stats.learned_cards || 0);
    if (!total) return { pct: 0, text: "Add cards to get progress." };
    const pct = Math.max(0, Math.min(100, Math.round((learned / total) * 100)));
    return { pct, text: `${pct}% learned (approx.)` };
  }, [stats]);

  const dueHint = useMemo(() => {
    if (!stats) return "No data yet.";
    const due = Number(stats.due_today || 0);
    if (due === 0) return "No due cards right now. Great time to add or generate new ones.";
    if (due < 10) return "Light day: knock these out quickly.";
    if (due < 30) return "Manageable load: schedule a short session.";
    return "Busy queue: break it into chunks to avoid fatigue.";
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/30 p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Learning statistics <span className="text-slate-400 text-base">(UC-4)</span>
            </h1>
            <p className="text-sm text-slate-300">
              Overview of your decks, cards, due items, and review momentum.
            </p>
            <div className="mt-2 text-xs text-slate-500">
              Endpoint: <span className="text-slate-300">GET {API_BASE}/stats/overview</span> -{" "}
              <span className="text-emerald-300">Protected</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadStats} loading={loading} className="w-auto">
              Refresh
            </Button>
            <Link
              href="/review"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800/70 transition"
            >
              Go to Review
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error ? (
        <Alert type="error" title="Error">
          {error}
        </Alert>
      ) : null}

      <CardShell
        title="Overview"
        subtitle="Data is scoped to your account."
        right={
          <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-400">
            Protected - Bearer token
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
            <div className="text-sm font-semibold">No data</div>
            <div className="mt-1 text-xs text-slate-400">
              Try refreshing, or complete at least one review session.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <StatTile label="Total decks" value={stats.total_decks} hint="Decks linked to your account." />
              <StatTile label="Total cards" value={stats.total_cards} hint="All cards across decks." />

              <StatTile
                label="Due today"
                value={stats.due_today}
                hint={dueHint}
                tone={Number(stats.due_today || 0) > 25 ? "warn" : "accent"}
              />

              <StatTile
                label="Learned cards"
                value={stats.learned_cards}
                hint="Heuristic: repetitions >= 3"
                tone="success"
              />

              <div className="md:col-span-2 rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs text-slate-400">Reviewed cards</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                    {stats.reviewed_cards ?? "..."}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">Cards that received at least one grade.</div>
                </div>

                <div className="w-full md:w-[320px]">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progress</span>
                    <span className="text-slate-300">{completionHint?.text ?? ""}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-900/60 border border-slate-800">
                    <div
                      className="h-full bg-emerald-500/70 transition-all duration-300"
                      style={{ width: `${completionHint?.pct ?? 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600">
                    Tip: Keep daily reviews small and consistent.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
              <div className="text-sm font-semibold">Next step</div>
              <div className="mt-1 text-xs text-slate-400">
                If "Due today" is 0, hop into Review to cement recent learning or add new cards from Profile.
              </div>
            </div>
          </div>
        )}
      </CardShell>
    </div>
  );
}
