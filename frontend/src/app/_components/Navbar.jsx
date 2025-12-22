"use client";

import Link from "next-intl/link";
import { usePathname } from "next-intl/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

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
        "text-slate-300 hover:text-slate-50 hover:bg-slate-800/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        active && "text-sky-100 bg-slate-800/70 ring-1 ring-slate-700"
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
      : "text-slate-200 hover:text-emerald-200 hover:bg-slate-800/60 ring-1 ring-slate-800";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx(
        "rounded-full px-3 py-1.5 text-xs md:text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
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
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400/80" />
            </span>
            <div className="leading-tight">
              <div className="text-sm md:text-base font-semibold text-slate-100 group-hover:text-sky-200 transition-colors">
                {t("brand")}
              </div>
              <div className="text-[10px] md:text-xs text-slate-400">{t("tagline")}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((it) => (
              <NavItem key={it.href} href={it.href} label={it.label} active={isActive(it.href)} />
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/40 px-2 py-1">
            {LOCALES.map((item) => (
              <Link
                key={item.code}
                href={pathname}
                locale={item.code}
                className={cx(
                  "rounded-full px-2 py-1 text-[11px] font-semibold transition",
                  locale === item.code
                    ? "bg-slate-800/80 text-slate-100"
                    : "text-slate-400 hover:text-slate-100"
                )}
                aria-label={t("language")}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cx(
                "md:hidden inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 px-3 py-2",
                "text-slate-200 hover:bg-slate-800/60 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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

            <span className="hidden sm:inline-block h-6 w-px bg-slate-800 mx-1" />

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
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-3">
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
                      ? "bg-slate-800/80 text-slate-100"
                      : "text-slate-400 hover:text-slate-100 border border-slate-800/70"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

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
