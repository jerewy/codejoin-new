import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AppLayout } from "@/components/app-layout";
import { RouteChangeIndicator } from "@/components/route-change-indicator";
import { SocketProvider } from "@/lib/socket";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CodeJoin - Collaborative Coding Platform",
  description: "Real-time collaborative coding with AI assistance",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="next-chunk-recovery" strategy="beforeInteractive">
          {`
            (() => {
              if (window.__NEXT_CHUNK_RECOVERY_INITIALIZED) {
                return;
              }

              window.__NEXT_CHUNK_RECOVERY_INITIALIZED = true;

              const STORAGE_KEY = 'next-chunk-retry-state';
              const MAX_RETRIES = 3;
              const CHUNK_PATH_PATTERN = /\/_next\/static\/(chunks|app|webpack)\//;

              const readRetryState = () => {
                try {
                  const raw = sessionStorage.getItem(STORAGE_KEY);
                  if (!raw) {
                    return { count: 0 };
                  }

                  const parsed = JSON.parse(raw);
                  if (!parsed || typeof parsed.count !== 'number' || Number.isNaN(parsed.count)) {
                    return { count: 0 };
                  }

                  return { count: parsed.count };
                } catch (error) {
                  console.warn('Unable to read chunk retry state', error);
                  return { count: 0 };
                }
              };

              const persistRetryState = (state) => {
                try {
                  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                } catch (error) {
                  console.warn('Unable to persist chunk retry state', error);
                }
              };

              const resetRetryState = () => {
                try {
                  sessionStorage.removeItem(STORAGE_KEY);
                } catch (error) {
                  console.warn('Unable to reset chunk retry state', error);
                }
              };

              const reloadWithBuster = (retryCount) => {
                const url = new URL(window.location.href);
                url.searchParams.set('chunkRetry', String(retryCount));
                url.searchParams.set('_ts', String(Date.now()));
                window.location.replace(url.toString());
              };

              const scheduleRecoveryReload = () => {
                const { count } = readRetryState();

                if (count >= MAX_RETRIES) {
                  resetRetryState();
                  console.error('Chunk failed to load after multiple attempts.');
                  return;
                }

                const nextCount = count + 1;
                persistRetryState({ count: nextCount });
                reloadWithBuster(nextCount);
              };

              const isChunkScript = (target) => {
                if (!target || target.tagName !== 'SCRIPT') {
                  return false;
                }

                const src = target.src || '';
                return CHUNK_PATH_PATTERN.test(src);
              };

              const isChunkLoadError = (error) => {
                if (!error) {
                  return false;
                }

                const message = typeof error === 'string' ? error : error.message || '';
                if (!message) {
                  return false;
                }

                return message.includes('ChunkLoadError') || message.includes('Loading chunk');
              };

              const handleScriptError = (event) => {
                if (isChunkScript(event?.target)) {
                  scheduleRecoveryReload();
                }
              };

              const handleUnhandledRejection = (event) => {
                if (isChunkLoadError(event?.reason)) {
                  event.preventDefault?.();
                  scheduleRecoveryReload();
                }
              };

              window.addEventListener('error', handleScriptError, true);
              window.addEventListener('unhandledrejection', handleUnhandledRejection);
              window.addEventListener('load', () => {
                resetRetryState();
              });
            })();
          `}
        </Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SocketProvider>
            <AppLayout>{children}</AppLayout>
            <Toaster />
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
