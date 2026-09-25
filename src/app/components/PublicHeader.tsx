"use client";

import Link from "next/link";
import Image from "next/image";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <Image
            src="/black-logo.svg"
            alt="Paşa Home"
            width={120}
            height={48}
            className="h-8 w-auto sm:h-10"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/bayi-talebi"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            Bayi Talebi
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170] sm:px-4 sm:py-2.5 sm:text-sm"
          >
            Bayi Girişi
          </Link>
        </div>
      </div>
    </header>
  );
}
