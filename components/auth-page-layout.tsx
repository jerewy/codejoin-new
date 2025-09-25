"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Highlight {
  title: string;
  description: string;
}

interface AuthPageLayoutProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  highlights?: Highlight[];
  footer?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function AuthPageLayout({
  children,
  eyebrow,
  title,
  description,
  badge,
  highlights,
  footer,
  backHref = "/",
  backLabel = "Back to landing",
}: AuthPageLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_theme(colors.sky.500)/12%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_theme(colors.indigo.500)/10%,_transparent_65%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="container mx-auto flex w-full items-center justify-between px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm backdrop-blur transition hover:border-white/20 hover:bg-white/10"
          >
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
          <Button
            asChild
            variant="ghost"
            className="text-slate-50 hover:bg-white/10 hover:text-white"
          >
            <Link href={backHref} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </header>

        <main className="container mx-auto flex w-full flex-1 flex-col-reverse items-center gap-12 px-6 pb-16 pt-4 lg:flex-row lg:items-stretch lg:justify-between">
          <section className="w-full max-w-xl space-y-8">
            {badge && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
                <Sparkles className="h-3 w-3" />
                {badge}
              </span>
            )}

            <div className="space-y-4">
              {eyebrow && (
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                  {eyebrow}
                </p>
              )}
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="text-base text-slate-200/80 lg:text-lg">
                {description}
              </p>
            </div>

            {highlights && highlights.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur"
                  >
                    <p className="text-lg font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-slate-200/70">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="w-full max-w-md lg:max-w-lg">
            <div className="rounded-3xl border border-white/10 bg-background/80 p-6 shadow-2xl backdrop-blur">
              {children}
            </div>
            {footer && (
              <div className="mt-6 text-center text-xs text-slate-300/70">
                {footer}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default AuthPageLayout;
