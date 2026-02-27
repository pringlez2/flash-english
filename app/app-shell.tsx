"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isStudySession, setIsStudySession] = useState(false);

  useEffect(() => {
    if (pathname !== "/study") {
      setIsStudySession(false);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setIsStudySession(params.get("session") === "1");
  }, [pathname]);

  return (
    <div className={`main-shell${isStudySession ? " study-focus-shell" : ""}`}>
      {!isStudySession && (
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
      )}
      {children}
    </div>
  );
}
