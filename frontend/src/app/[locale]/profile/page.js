"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "../../../i18n/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "uploads";

const MAX_ANSWER_LEN = 2000;
const MAX_QUESTION_LEN = 500;

function clipStr(s, maxLen) {
  if (!s) return "";
  const t = String(s);
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function guessMimeByName(name) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (n.endsWith(".txt")) return "text/plain";
  return "";
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [aiStatus, setAiStatus] = useState("");
  const [aiError, setAiError] = useState("");
  const [generatingDeckId, setGeneratingDeckId] = useState(null);

  const apiFetch = async (path, options = {}) => {
    const { data: sessionData, error: sessionErr } =
      await supabase.auth.getSession();
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
      const { data, error: userError } = await supabase.auth.getUser();
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
        name.endsWith(".txt") || name.endsWith(".pdf") || name.endsWith(".docx");
      if (!ok) {
        throw new Error(t("messages.unsupportedFile"));
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `user-${user.id}/${fileName}`;

      const { data, error: uploadErrorObj } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadErrorObj) throw uploadErrorObj;

      setUploadedFiles((prev) => [
        ...prev,
        { name: file.name, path: data?.path || filePath },
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
      form.append("max_cards", "5");

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-violet-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-violet-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-300 text-lg font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        ></div>
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 shadow-lg">
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
              className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-2"
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
        <header className="mb-6 sm:mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-2xl sm:text-3xl shadow-lg">
              AF
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {t("welcome", { name: user.user_metadata?.full_name || t("fallbackName") })}
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">{user.email}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:border-violet-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">{t("createDeck.title")}</h2>
                <p className="text-slate-400 text-xs sm:text-sm">{t("createDeck.subtitle")}</p>
              </div>
            </div>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("createDeck.titleLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t("createDeck.titlePlaceholder")}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-600 bg-slate-950/50 text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("createDeck.descriptionLabel")}
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t("createDeck.descriptionPlaceholder")}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-600 bg-slate-950/50 text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
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
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          <div className="p-6 sm:p-8 rounded-2xl bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:border-blue-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">{t("upload.title")}</h2>
                <p className="text-slate-400 text-xs sm:text-sm">{t("upload.subtitle")}</p>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] || null);
                    setUploadError("");
                    setUploadMessage("");
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-600 bg-slate-950/50 text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 file:font-medium hover:border-blue-500/50 transition-all cursor-pointer"
                />
                <p className="mt-2 text-xs text-slate-500">{t("upload.supported")}</p>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        <section className="p-6 sm:p-8 rounded-2xl bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t("collection.title")}</h2>
              <p className="text-slate-400 text-sm">{t("collection.count", { count: decks.length })}</p>
            </div>
          </div>

          {decks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-slate-400 text-lg">{t("collection.emptyTitle")}</p>
              <p className="text-slate-500 text-sm mt-2">{t("collection.emptyHint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="group p-6 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-violet-500/50 shadow-lg hover:shadow-violet-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
                        {deck.title}
                      </h3>
                      {deck.description && (
                        <p className="text-slate-400 text-sm line-clamp-2">{deck.description}</p>
                      )}
                    </div>
                    <div className="ml-3 w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{t("collection.cardsCount", { count: deck.cards?.length || 0 })}</span>
                  </div>

                  <button
                    onClick={() => handleGenerateFromUpload(deck.id)}
                    disabled={generatingDeckId === deck.id}
                    className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
