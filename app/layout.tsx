import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flash English",
  description: "모바일 1인용 영어 플래시카드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="main-shell">
          <header className="mb-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-extrabold text-teal-900">
              Flash English
            </Link>
            <nav className="flex gap-3 text-sm text-slate-700">
              <Link href="/add">추가</Link>
              <Link href="/study">학습</Link>
              <Link href="/cards">카드</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
