import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Auto-Flashcards — MVP прототип",
  description: "Учебный прототип системы авто-генерации флеш-карточек.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <div className="min-h-screen flex flex-col">
          {/* Верхняя панель навигации */}
          <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold">
                Auto-Flashcards · <span className="text-slate-400">MVP</span>
              </div>

              <nav className="flex gap-4 text-xs md:text-sm">
                <Link href="/" className="hover:text-sky-400">
                  Главная 
                </Link>
                <Link href="/review" className="hover:text-sky-400">
                  Повторение 
                </Link>
                <Link href="/stats" className="hover:text-sky-400">
                  Статистика 
                </Link>
                <Link href="/profile" className="hover:text-sky-400">
                  Профиль 
                </Link>
              </nav>
            </div>
          </header>

          {/* Контент конкретной страницы */}
          <main className="flex-1">
            {children}
          </main>

          {/* Небольшой футер для вида */}
          <footer className="border-t border-slate-800 bg-slate-950/90">
            <div className="max-w-5xl mx-auto px-4 py-3 text-[10px] md:text-xs text-slate-500 flex justify-between">
              <span>· Auto-Flashcards</span>
              <span></span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
