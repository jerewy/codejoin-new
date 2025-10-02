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
              const STORAGE_KEY = 'next-chunk-retry-count';
              const MAX_RETRIES = 3;

              const handleChunkError = (event) => {
                const target = event?.target;
                if (!target || target.tagName !== 'SCRIPT') {
                  return;
                }

                const src = target.src || '';
                if (!src.includes('/_next/static/chunks/')) {
                  return;
                }

                try {
                  const retries = Number(sessionStorage.getItem(STORAGE_KEY) || '0');

                  if (Number.isNaN(retries)) {
                    sessionStorage.setItem(STORAGE_KEY, '1');
                    window.location.reload();
                    return;
                  }

                  if (retries >= MAX_RETRIES) {
                    sessionStorage.removeItem(STORAGE_KEY);
                    console.error('Chunk failed to load after multiple attempts.');
                    return;
                  }

                  sessionStorage.setItem(STORAGE_KEY, String(retries + 1));
                  window.location.reload();
                } catch (storageError) {
                  console.warn('Unable to persist chunk retry count', storageError);
                  window.location.reload();
                }
              };

              window.addEventListener('error', handleChunkError, true);
              window.addEventListener('load', () => {
                try {
                  sessionStorage.removeItem(STORAGE_KEY);
                } catch (storageError) {
                  console.warn('Unable to reset chunk retry count', storageError);
                }
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
