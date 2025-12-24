"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getSessionSafe, getUserSafe } from "../../lib/supabaseSession";
import { useRouter } from "../../../i18n/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "uploads";

const MAX_ANSWER_LEN = 2000;
const MAX_QUESTION_LEN = 500;
const MIN_GENERATE_CARDS = 1;
const MAX_GENERATE_CARDS = 30;

function clipStr(s, maxLen) {
  if (!s) return "";
  const t = String(s);
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function clampInt(value, min, max) {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function guessMimeByName(name) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (n.endsWith(".txt")) return "text/plain";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  return "";
}

function sanitizeFileName(name) {
  const raw = String(name || "file").trim();
  const parts = raw.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";
  const stem = parts.join(".") || "file";
  const safeStem = stem
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const safeExt = ext
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
  const finalStem = safeStem || "file";
  return safeExt ? `${finalStem}.${safeExt}` : finalStem;
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / Math.pow(1024, idx);
  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deckQuery, setDeckQuery] = useState("");

  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadMaxCards, setUploadMaxCards] = useState(10);
  const [isDragActive, setIsDragActive] = useState(false);

  const [aiStatus, setAiStatus] = useState("");
  const [aiError, setAiError] = useState("");
  const [generatingDeckId, setGeneratingDeckId] = useState(null);

  const deckCount = decks.length;
  const cardCount = decks.reduce((sum, deck) => sum + (deck.cards?.length || 0), 0);
  const recentUploads = uploadedFiles.slice(-3).reverse();
  const latestUpload = uploadedFiles[uploadedFiles.length - 1] || null;
  const trimmedQuery = deckQuery.trim().toLowerCase();
  const filteredDecks = trimmedQuery
    ? decks.filter((deck) => {
        const title = (deck.title || "").toLowerCase();
        const desc = (deck.description || "").toLowerCase();
        return title.includes(trimmedQuery) || desc.includes(trimmedQuery);
      })
    : decks;
  const deckCountText = trimmedQuery
    ? t("collection.filteredCount", { shown: filteredDecks.length, total: deckCount })
    : t("collection.count", { count: deckCount });

  const apiFetch = async (path, options = {}) => {
    const { data: sessionData, error: sessionErr } = await getSessionSafe();
    if (sessionErr) throw new Error(sessionErr.message);

    const token = sessionData?.session?.access_token;
    if (!token) {
      router.push("/login");
      throw new Error(t("messages.noSession"));
    }

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    if (
      !headers.has("Content-Type") &&
      options.body &&
      typeof options.body === "string"
    ) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      router.push("/login");
      throw new Error(t("messages.unauthorized"));
    }

    return res;
  };

  useEffect(() => {
    const load = async () => {
      const { data, error: userError } = await getUserSafe();
      if (userError || !data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);

      try {
        const res = await apiFetch("/decks/", { method: "GET" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(t("messages.loadDecksError", { status: res.status, details: text }));
        }
        const json = await res.json();
        setDecks(Array.isArray(json) ? json : []);
      } catch (err) {
        setError(err?.message || t("messages.loadDecksUnknown"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, t]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    setError("");

    try {
      const res = await apiFetch("/decks/", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription?.trim() || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(t("messages.createDeckError", { status: res.status, details: text }));
      }

      const created = await res.json();
      setDecks((prev) => [...prev, created]);
      setNewTitle("");
      setNewDescription("");
    } catch (err) {
      setError(err?.message || t("messages.createDeckUnknown"));
    } finally {
      setCreating(false);
    }
  };

  const handleSelectFile = (file) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setUploadError("");
    setUploadMessage("");
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleSelectFile(file);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setUploadError("");
    setUploadMessage("");
    setAiError("");
    setAiStatus("");

    if (!selectedFile) {
      setUploadError(t("messages.noFile"));
      return;
    }
    if (!user) {
      setUploadError(t("messages.noUser"));
      return;
    }

    setUploading(true);

    try {
      const file = selectedFile;

      const name = (file.name || "").toLowerCase();
      const ok =
        name.endsWith(".txt") ||
        name.endsWith(".pdf") ||
        name.endsWith(".docx") ||
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".webp");
      if (!ok) {
        throw new Error(t("messages.unsupportedFile"));
      }

      const safeName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `user-${user.id}/${fileName}`;

      const { data, error: uploadErrorObj } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadErrorObj) throw uploadErrorObj;

      setUploadedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          path: data?.path || filePath,
          size: file.size || 0,
          type: file.type || guessMimeByName(file.name),
          uploadedAt: new Date().toISOString(),
        },
      ]);

      setSelectedFile(null);
      setUploadMessage(t("messages.uploaded", { name: file.name }));
    } catch (err) {
      setUploadError(err?.message || t("messages.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateFromUpload = async (deckId) => {
    setAiError("");
    setAiStatus("");

    if (!uploadedFiles.length) {
      setAiError(t("messages.noUpload"));
      return;
    }
    if (!user) {
      setAiError(t("messages.noUser"));
      return;
    }

    const lastFile = uploadedFiles[uploadedFiles.length - 1];
    setGeneratingDeckId(deckId);

    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(lastFile.path);

      if (downloadError) throw downloadError;
      if (!blob) throw new Error(t("messages.downloadError"));

      const mime = blob.type || guessMimeByName(lastFile.name) || "";
      const f = new File([blob], lastFile.name, { type: mime });

      const form = new FormData();
      form.append("file", f);
      const maxCards = clampInt(uploadMaxCards, MIN_GENERATE_CARDS, MAX_GENERATE_CARDS);
      form.append("max_cards", String(maxCards));

      const aiRes = await fetch(`${API_BASE}/ai/generate-file`, {
        method: "POST",
        body: form,
      });

      if (!aiRes.ok) {
        const msg = await aiRes.text().catch(() => "");
        throw new Error(t("messages.aiGenerateFailed", { status: aiRes.status, details: msg }));
      }

      const aiJson = await aiRes.json();
      const cards = aiJson.cards || [];
      if (!cards.length) throw new Error(t("messages.aiNoCards"));

      for (const card of cards) {
        const question = clipStr(card.question, MAX_QUESTION_LEN).trim();
        const answer = clipStr(card.answer, MAX_ANSWER_LEN).trim();

        if (!question || !answer) continue;

        const res = await apiFetch(`/decks/${deckId}/cards`, {
          method: "POST",
          body: JSON.stringify({ question, answer }),
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error("Error creating card:", txt);
        }
      }

      const deckRes = await apiFetch(`/decks/${deckId}`, { method: "GET" });
      if (deckRes.ok) {
        const updatedDeck = await deckRes.json();
        setDecks((prev) => prev.map((d) => (d.id === deckId ? updatedDeck : d)));
      }

      setAiStatus(t("messages.aiGenerated", { count: cards.length, id: deckId }));
    } catch (err) {
      setAiError(err?.message || t("messages.aiError"));
    } finally {
      setGeneratingDeckId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-2 to-background px-4">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-violet-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-violet-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-strong text-lg font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-2 to-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        ></div>
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-surface-2/90 border-b border-border-strong/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                {t("brand")}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg border border-border-strong bg-surface-3/70 hover:bg-surface-4/60 text-muted-strong hover:text-foreground transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">{t("signOut")}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-surface-3/80 to-surface-2/90 backdrop-blur-xl border border-border-strong/60 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-2xl sm:text-3xl shadow-lg">
                AF
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                  {t("welcome", { name: user.user_metadata?.full_name || t("fallbackName") })}
                </h1>
                <p className="text-muted text-sm sm:text-base">{user.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    {t("status.signedIn")}
                  </span>
                  {latestUpload && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-border-strong/70 bg-surface-3/70 px-3 py-1 text-xs text-muted-strong max-w-[320px]">
                      <span>{t("overview.stats.latestUpload")}:</span>
                      <span className="truncate">{latestUpload.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/review")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {t("actions.goToReview")}
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("overview.title")}</h2>
              <p className="text-sm text-muted">{t("overview.subtitle")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border-strong/70 bg-surface-3/90 p-4 shadow-lg">
              <p className="text-xs uppercase tracking-wide text-muted-faint">{t("overview.stats.decks")}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{deckCount}</p>
            </div>
            <div className="rounded-2xl border border-border-strong/70 bg-surface-3/90 p-4 shadow-lg">
              <p className="text-xs uppercase tracking-wide text-muted-faint">{t("overview.stats.cards")}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{cardCount}</p>
            </div>
            <div className="rounded-2xl border border-border-strong/70 bg-surface-3/90 p-4 shadow-lg">
              <p className="text-xs uppercase tracking-wide text-muted-faint">{t("overview.stats.uploads")}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{uploadedFiles.length}</p>
            </div>
            <div className="rounded-2xl border border-border-strong/70 bg-surface-3/90 p-4 shadow-lg">
              <p className="text-xs uppercase tracking-wide text-muted-faint">{t("overview.stats.maxCards")}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{uploadMaxCards}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-surface-3/90 backdrop-blur-xl border border-border-strong/60 shadow-xl hover:border-violet-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("createDeck.title")}</h2>
                <p className="text-muted text-xs sm:text-sm">{t("createDeck.subtitle")}</p>
              </div>
            </div>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-strong mb-2">
                  {t("createDeck.titleLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t("createDeck.titlePlaceholder")}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-border-strong bg-surface-2/80 text-foreground placeholder:text-muted-faint outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-strong mb-2">
                  {t("createDeck.descriptionLabel")}
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t("createDeck.descriptionPlaceholder")}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-border-strong bg-surface-2/80 text-foreground placeholder:text-muted-faint outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                />
              </div>

              {error && (
                <div className="p-3 sm:p-4 rounded-xl bg-red-950/50 border border-red-500/50 flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-surface-4 disabled:to-surface-4 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t("createDeck.creating")}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t("createDeck.submit")}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-surface-3/90 backdrop-blur-xl border border-border-strong/60 shadow-xl hover:border-blue-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("upload.title")}</h2>
                <p className="text-muted text-xs sm:text-sm">{t("upload.subtitle")}</p>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed px-4 py-6 transition-all ${
                  isDragActive
                    ? "border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                    : "border-border-strong bg-surface-2/80"
                }`}
              >
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <div className="pointer-events-none flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedFile ? selectedFile.name : t("upload.dropHint")}
                    </p>
                    <p className="mt-1 text-xs text-muted-faint">
                      {selectedFile
                        ? `${formatBytes(selectedFile.size)} • ${(selectedFile.type || guessMimeByName(selectedFile.name) || "file").toUpperCase()}`
                        : t("upload.supported")}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-strong mb-2">
                  {t("upload.maxCardsLabel")}
                </label>
                <input
                  type="number"
                  min={MIN_GENERATE_CARDS}
                  max={MAX_GENERATE_CARDS}
                  value={uploadMaxCards}
                  onChange={(e) => {
                    const next = clampInt(e.target.value, MIN_GENERATE_CARDS, MAX_GENERATE_CARDS);
                    setUploadMaxCards(next);
                  }}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-border-strong bg-surface-2/80 text-foreground placeholder:text-muted-faint outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <p className="mt-2 text-xs text-muted-faint">{t("upload.maxCardsHint")}</p>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-surface-4 disabled:to-surface-4 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t("upload.uploading")}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {t("upload.submit")}
                  </>
                )}
              </button>

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="text-red-200 text-sm">{uploadError}</p>
                </div>
              )}
              {uploadMessage && (
                <div className="p-3 rounded-xl bg-green-950/50 border border-green-500/50 flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-200 text-sm">{uploadMessage}</p>
                </div>
              )}
              {recentUploads.length > 0 && (
                <div className="rounded-xl border border-border-strong/70 bg-surface-2/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-faint">
                    {t("upload.recentTitle")}
                  </p>
                  <div className="mt-3 space-y-2">
                    {recentUploads.map((item) => (
                      <div
                        key={item.path}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-3/70 px-3 py-2 text-xs"
                      >
                        <span className="text-muted-strong truncate">{item.name}</span>
                        <span className="text-muted-faint whitespace-nowrap">
                          {formatBytes(item.size)} • {formatDate(item.uploadedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {(aiError || aiStatus) && (
          <div className="mb-6 sm:mb-8">
            {aiError && (
              <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 flex items-start gap-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-200">{aiError}</p>
              </div>
            )}
            {aiStatus && (
              <div className="p-4 rounded-xl bg-green-950/50 border border-green-500/50 flex items-start gap-3">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-200">{aiStatus}</p>
              </div>
            )}
          </div>
        )}

        <section className="p-6 sm:p-8 rounded-2xl bg-surface-3/90 backdrop-blur-xl border border-border-strong/60 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t("collection.title")}</h2>
                <p className="text-muted text-sm">{deckCountText}</p>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={deckQuery}
                onChange={(e) => setDeckQuery(e.target.value)}
                placeholder={t("collection.searchPlaceholder")}
                className="w-full px-4 py-2.5 rounded-xl border border-border-strong bg-surface-2/80 text-foreground placeholder:text-muted-faint outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>

          {deckCount === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-4/60 flex items-center justify-center">
                <svg className="w-10 h-10 text-muted-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-muted text-lg">{t("collection.emptyTitle")}</p>
              <p className="text-muted-faint text-sm mt-2">{t("collection.emptyHint")}</p>
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-4/60 flex items-center justify-center">
                <svg className="w-10 h-10 text-muted-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-6 4h4m1-10h.01M12 5a7 7 0 100 14 7 7 0 000-14z" />
                </svg>
              </div>
              <p className="text-muted text-lg">{t("collection.noResultsTitle")}</p>
              <p className="text-muted-faint text-sm mt-2">{t("collection.noResultsHint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="group p-6 rounded-xl bg-surface-2/90 border border-border-strong hover:border-violet-500/50 shadow-lg hover:shadow-violet-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-2">
                        {deck.title}
                      </h3>
                      {deck.description && (
                        <p className="text-muted text-sm line-clamp-2">{deck.description}</p>
                      )}
                    </div>
                    <div className="ml-3 w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-sm text-muted">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{t("collection.cardsCount", { count: deck.cards?.length || 0 })}</span>
                  </div>

                  <button
                    onClick={() => handleGenerateFromUpload(deck.id)}
                    disabled={generatingDeckId === deck.id}
                    className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-surface-4 disabled:to-surface-4 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingDeckId === deck.id ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t("collection.generating")}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {t("collection.generate")}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
