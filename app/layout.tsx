import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServerThemeProvider } from "@/components/server-theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SonnerToasterStyled } from "@/components/ui/sonner-toaster";
import { AppLayout } from "@/components/app-layout";
import { RouteChangeIndicator } from "@/components/route-change-indicator";
import { SocketProvider } from "@/lib/socket";
import { DockerConnectionProvider } from "@/lib/docker-connection-manager";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalErrorHandler } from "@/components/global-error-handler";
import { VersionManagerInitializer } from "@/components/version-manager-initializer";

const inter = Inter({ subsets: ["latin"] });

// Generate build-time metadata
const buildTime = new Date().toISOString();
const buildHash = Math.random().toString(36).substring(7);

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
      <head>
        {/* Version meta tags for client-side detection */}
        <meta name="app-version" content="1.0.0" />
        <meta name="build-time" content={buildTime} />
        <meta name="build-hash" content={buildHash} />

        {/* Preload critical resources */}
        <link rel="preload" href="/_next/static/css/app/globals.css" as="style" />

        {/* Security headers - Note: X-Frame-Options should be set via HTTP headers, not meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />

        {/* Cache control */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ServerThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <DockerConnectionProvider>
              <SocketProvider>
                <GlobalErrorHandler />
                <VersionManagerInitializer />
                <AppLayout>{children}</AppLayout>
                <Toaster />
                <SonnerToasterStyled />
              </SocketProvider>
            </DockerConnectionProvider>
          </ServerThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
