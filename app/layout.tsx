import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProviderWrapper } from "@/components/theme-provider-wrapper";
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
        <ThemeProviderWrapper
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SocketProvider>
            <AppLayout>{children}</AppLayout>
            <Toaster />
          </SocketProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
