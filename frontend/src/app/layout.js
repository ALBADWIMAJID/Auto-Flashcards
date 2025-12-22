import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Auto-Flashcards MVP",
  description:
    "Generate flashcards with AI, review with spaced repetition, and manage decks with Supabase auth.",
};

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const themeScript = `
    (function () {
      try {
        var stored = localStorage.getItem("af-theme");
        var theme =
          stored === "light" || stored === "dark"
            ? stored
            : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        document.documentElement.dataset.theme = theme;
      } catch (e) {}
    })();
  `;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
