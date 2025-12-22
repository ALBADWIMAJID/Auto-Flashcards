"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Link, usePathname } from "../../i18n/navigation";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const THEME_STORAGE_KEY = "af-theme";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
  { code: "ru", label: "RU" },
];

function NavItem({ href, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition",
        "text-muted hover:text-foreground hover:bg-surface-3/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2",
        active && "text-foreground bg-surface-3/80 ring-1 ring-border"
      )}
    >
      {label}
      {active ? (
        <span className="absolute -bottom-1 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-sky-500/70" />
      ) : null}
    </Link>
  );
}

function PillLink({ href, children, variant = "ghost", onClick }) {
  const styles =
    variant === "primary"
      ? "bg-emerald-600/90 hover:bg-emerald-500 text-white ring-1 ring-emerald-500/40"
      : "text-foreground hover:text-emerald-200 hover:bg-surface-3/70 ring-1 ring-border";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx(
        "rounded-full px-3 py-1.5 text-xs md:text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2",
        styles
      )}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      const resolved =
        stored === "light" || stored === "dark"
          ? stored
          : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      document.documentElement.dataset.theme = resolved;
      setTheme(resolved);
    } catch (e) {
      setTheme("dark");
    }
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        document.documentElement.dataset.theme = next;
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (e) {}
      return next;
    });
  }

  const navItems = useMemo(
    () => [
      { href: "/", label: t("home") },
      { href: "/review", label: t("review") },
      { href: "/stats", label: t("stats") },
      { href: "/profile", label: t("profile") },
    ],
    [t]
  );

  const isActive = useMemo(() => {
    return (href) => {
      if (!pathname) return false;
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(`${href}/`);
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-surface-1/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400/80" />
            </span>
            <div className="leading-tight">
              <div className="text-sm md:text-base font-semibold text-foreground group-hover:text-sky-200 transition-colors">
                {t("brand")}
              </div>
              <div className="text-[10px] md:text-xs text-muted">{t("tagline")}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((it) => (
              <NavItem key={it.href} href={it.href} label={it.label} active={isActive(it.href)} />
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface-2/70 px-2 py-1">
              {LOCALES.map((item) => (
                <Link
                  key={item.code}
                  href={pathname}
                  locale={item.code}
                  className={cx(
                    "rounded-full px-2 py-1 text-[11px] font-semibold transition",
                    locale === item.code
                      ? "bg-surface-3/80 text-foreground"
                      : "text-muted hover:text-foreground"
                  )}
                  aria-label={t("language")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/70 px-3 py-1 text-[11px] font-semibold transition",
                "text-muted-strong hover:text-foreground hover:bg-surface-3/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
              )}
              aria-label={t("themeToggle")}
            >
              <span>{theme === "dark" ? t("themeDark") : t("themeLight")}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="opacity-80"
              >
                {theme === "dark" ? (
                  <path
                    d="M12 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm6.36 2.64a1 1 0 0 1 0 1.41l-1.41 1.41a1 1 0 1 1-1.41-1.41l1.41-1.41a1 1 0 0 1 1.41 0ZM21 11a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2Zm-3.05 7.95a1 1 0 0 1-1.41 0l-1.41-1.41a1 1 0 0 1 1.41-1.41l1.41 1.41a1 1 0 0 1 0 1.41ZM12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm-5.95.95a1 1 0 0 1 0-1.41l1.41-1.41a1 1 0 1 1 1.41 1.41l-1.41 1.41a1 1 0 0 1-1.41 0ZM5 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h2Zm3.05-7.95a1 1 0 0 1 1.41 0l1.41 1.41a1 1 0 0 1-1.41 1.41L8.05 4.46a1 1 0 0 1 0-1.41ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M20.354 14.354A8 8 0 0 1 9.646 3.646 8 8 0 1 0 20.354 14.354Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cx(
                "md:hidden inline-flex items-center justify-center rounded-2xl border border-border bg-surface-2/70 px-3 py-2",
                "text-foreground hover:bg-surface-3/70 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
              )}
              aria-label={t("openMenu")}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="sr-only">{t("menu")}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="opacity-90"
                aria-hidden="true"
              >
                {mobileOpen ? (
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>

            <span className="hidden sm:inline-block h-6 w-px bg-border mx-1" />

            <PillLink href="/login">{t("login")}</PillLink>
            <PillLink href="/register" variant="primary">
              {t("getStarted")}
            </PillLink>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={cx(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-200",
            mobileOpen ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"
          )}
        >
          <div className="rounded-3xl border border-border/70 bg-surface-1/80 p-3">
            <div className="flex flex-wrap gap-2">
              {navItems.map((it) => (
                <NavItem
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={isActive(it.href)}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {LOCALES.map((item) => (
                <Link
                  key={item.code}
                  href={pathname}
                  locale={item.code}
                  onClick={() => setMobileOpen(false)}
                  className={cx(
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition",
                    locale === item.code
                      ? "bg-surface-3/80 text-foreground"
                      : "text-muted hover:text-foreground border border-border/70"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                toggleTheme();
                setMobileOpen(false);
              }}
              className={cx(
                "mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/70 px-3 py-1 text-[11px] font-semibold transition",
                "text-muted-strong hover:text-foreground hover:bg-surface-3/80"
              )}
              aria-label={t("themeToggle")}
            >
              <span>{theme === "dark" ? t("themeDark") : t("themeLight")}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="opacity-80"
              >
                {theme === "dark" ? (
                  <path
                    d="M12 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm6.36 2.64a1 1 0 0 1 0 1.41l-1.41 1.41a1 1 0 1 1-1.41-1.41l1.41-1.41a1 1 0 0 1 1.41 0ZM21 11a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2Zm-3.05 7.95a1 1 0 0 1-1.41 0l-1.41-1.41a1 1 0 0 1 1.41-1.41l1.41 1.41a1 1 0 0 1 0 1.41ZM12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm-5.95.95a1 1 0 0 1 0-1.41l1.41-1.41a1 1 0 1 1 1.41 1.41l-1.41 1.41a1 1 0 0 1-1.41 0ZM5 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h2Zm3.05-7.95a1 1 0 0 1 1.41 0l1.41 1.41a1 1 0 0 1-1.41 1.41L8.05 4.46a1 1 0 0 1 0-1.41ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M20.354 14.354A8 8 0 0 1 9.646 3.646 8 8 0 1 0 20.354 14.354Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </button>

            <div className="mt-3 flex items-center gap-2">
              <PillLink href="/login" onClick={() => setMobileOpen(false)}>
                {t("login")}
              </PillLink>
              <PillLink href="/register" variant="primary" onClick={() => setMobileOpen(false)}>
                {t("getStarted")}
              </PillLink>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
