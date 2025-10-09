"use client"

import { Toaster as SonnerToaster } from "sonner"

export function SonnerToasterStyled() {
  return (
    <SonnerToaster
      theme="system"
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        className: "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        style: {
          background: "hsl(var(--background))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--foreground))",
          borderRadius: "calc(var(--radius) - 2px)",
        },
        // Success toasts
        success: {
          style: {
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--primary))",
            color: "hsl(var(--foreground))",
          },
          iconTheme: {
            primary: "hsl(var(--primary))",
            secondary: "hsl(var(--primary-foreground))",
          },
        },
        // Error toasts
        error: {
          style: {
            background: "hsl(var(--destructive))",
            border: "1px solid hsl(var(--destructive))",
            color: "hsl(var(--destructive-foreground))",
          },
          iconTheme: {
            primary: "hsl(var(--destructive-foreground))",
            secondary: "hsl(var(--destructive))",
          },
        },
        // Info toasts
        info: {
          style: {
            background: "hsl(var(--muted))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--muted-foreground))",
          },
          iconTheme: {
            primary: "hsl(var(--accent))",
            secondary: "hsl(var(--accent-foreground))",
          },
        },
        // Warning toasts
        warning: {
          style: {
            background: "hsl(var(--accent))",
            border: "1px solid hsl(var(--accent))",
            color: "hsl(var(--accent-foreground))",
          },
          iconTheme: {
            primary: "hsl(var(--accent-foreground))",
            secondary: "hsl(var(--accent))",
          },
        },
      }}
      className="toaster group"
      style={{
        "--normal-bg": "hsl(var(--background))",
        "--normal-border": "hsl(var(--border))",
        "--normal-text": "hsl(var(--foreground))",
        "--success-bg": "hsl(var(--background))",
        "--success-border": "hsl(var(--primary))",
        "--success-text": "hsl(var(--foreground))",
        "--error-bg": "hsl(var(--destructive))",
        "--error-border": "hsl(var(--destructive))",
        "--error-text": "hsl(var(--destructive-foreground))",
        "--info-bg": "hsl(var(--muted))",
        "--info-border": "hsl(var(--border))",
        "--info-text": "hsl(var(--muted-foreground))",
      } as React.CSSProperties}
    />
  )
}