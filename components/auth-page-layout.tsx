"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AuthPageLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  eyebrow?: string;
  footer?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function AuthPageLayout({
  children,
  eyebrow,
  title,
  description,
  footer,
  backHref = "/",
  backLabel = "Back to landing",
}: AuthPageLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-36 right-1/2 h-72 w-72 translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-100 transition hover:text-white">
          <svg
            width="22"
            height="22"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow"
          >
            <path
              d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
              fill="#f97316"
            />
            <path
              d="M14 10L18 14M18 10L14 14"
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M14 18L18 22M18 18L14 22"
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-base font-semibold">CodeJoin</span>
        </Link>
        <Button asChild variant="ghost" className="text-slate-100 hover:bg-white/10 hover:text-white">
          <Link href={backHref} className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-4">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300/80">{eyebrow}</p>
            )}
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
            {description && <p className="text-sm text-slate-300">{description}</p>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-background/90 p-6 shadow-2xl backdrop-blur">
            {children}
          </div>

          {footer && <div className="text-center text-xs text-slate-400">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export default AuthPageLayout;
