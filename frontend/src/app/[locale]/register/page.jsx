"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Link, useRouter } from "../../../i18n/navigation";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Input({ label, hint, className, ...props }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label className="text-xs font-medium text-slate-200">{label}</label>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
      <input
        {...props}
        className={cx(
          "w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100",
          "outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/15",
          "placeholder:text-slate-600",
          className
        )}
      />
    </div>
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
        "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold",
        "transition disabled:opacity-70 disabled:cursor-not-allowed",
        styles,
        className
      )}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      ) : null}
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

export default function RegisterPage() {
  const t = useTranslations("register");
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const canSubmit = useMemo(() => {
    const nameOk = fullName.trim().length >= 2;
    const emailOk = email.trim().includes("@");
    const passOk = password.length >= 6;
    return nameOk && emailOk && passOk;
  }, [fullName, email, password]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const name = fullName.trim();
    const mail = email.trim();

    if (name.length < 2) {
      setError(t("errors.nameShort"));
      return;
    }
    if (!mail.includes("@")) {
      setError(t("errors.invalidEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("errors.passwordShort"));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data?.session?.access_token) {
        router.push("/profile");
        return;
      }

      setInfo(t("infoMessage"));
      router.push("/login");
    } catch (err) {
      setError(err?.message || t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="border-b border-slate-800/60 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-800 bg-slate-950/40">
                  <span className="text-sm font-bold tracking-tight">AF</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
                  <p className="text-xs text-slate-400">{t("subtitle")}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 px-6 py-5">
              <Input
                label={t("fullNameLabel")}
                placeholder={t("fullNamePlaceholder")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />

              <Input
                label={t("emailLabel")}
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                type="email"
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-end justify-between gap-3">
                  <label className="text-xs font-medium text-slate-200">{t("passwordLabel")}</label>
                  <span className="text-[11px] text-slate-500">{t("passwordHint")}</span>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={t("passwordPlaceholder")}
                    className={cx(
                      "w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 pr-12 text-sm text-slate-100",
                      "outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/15",
                      "placeholder:text-slate-600"
                    )}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800/60"
                    aria-label={showPassword ? t("hidePasswordAria") : t("showPasswordAria")}
                  >
                    {showPassword ? t("hide") : t("show")}
                  </button>
                </div>
              </div>

              {error ? (
                <Alert type="error" title={t("errorTitle")}>
                  {error}
                </Alert>
              ) : null}

              {info ? (
                <Alert type="success" title={t("infoTitle")}>
                  {info}
                </Alert>
              ) : null}

              <Button type="submit" loading={loading} disabled={!canSubmit}>
                {loading ? t("submitting") : t("submit")}
              </Button>

              <Button variant="secondary" type="button" disabled={loading} onClick={() => router.push("/login")}>
                {t("alreadyAccount")}
              </Button>

              <div className="pt-1 text-center text-xs text-slate-500">
                {t("footer")}{" "}
                <Link href="/" className="text-sky-300 hover:underline">
                  {t("backHome")}
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-4 text-center text-[11px] text-slate-600">
            {t("confirmationNote")}
          </div>
        </div>
      </div>
    </main>
  );
}
