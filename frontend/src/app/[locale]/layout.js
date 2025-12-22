import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../i18n/routing";
import Navbar from "../_components/Navbar";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("layout");

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="min-h-screen flex flex-col bg-background">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,var(--glow-1),transparent_55%),radial-gradient(800px_circle_at_80%_20%,var(--glow-2),transparent_55%),radial-gradient(900px_circle_at_50%_90%,var(--glow-3),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--overlay-from),var(--overlay-to))]" />
        </div>

        <Navbar />

        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
        </main>

        <footer className="border-t border-border/70 bg-surface-1/70 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 text-[10px] md:text-xs text-muted flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <span>{t("footerLeft")}</span>
            <span className="text-muted-faint">{t("footerRight")}</span>
          </div>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
