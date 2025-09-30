"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Button } from "@/components/button";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const isLoggedIn = useAuthStatus();
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const isAuthConfigured = !!supabaseClient;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Define which routes should have the sidebar
  const sidebarRoutes = [
    "dashboard",
    "project",
    "settings",
    "new-project",
    "ai-assistant",
    "templates-section",
    "teams",
  ];
  const isProtectedRoute = sidebarRoutes.includes(segment || "");
  const hasSidebar = isAuthConfigured && isLoggedIn && isProtectedRoute;

  // Project pages should always have sidebar closed for focus
  const isSidebarClosed =
    segment === "project" ||
    segment === "settings" ||
    segment === "new-project";

  // Handle route changes and initialize sidebar state when we are on the client
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isSidebarClosed) {
      setIsSidebarOpen(false);
      return;
    }

    const savedState = window.localStorage.getItem("sidebarOpen");
    if (savedState === null) {
      setIsSidebarOpen(false);
      return;
    }

    try {
      setIsSidebarOpen(JSON.parse(savedState));
    } catch (error) {
      console.warn("Failed to parse sidebar state", error);
      window.localStorage.removeItem("sidebarOpen");
      setIsSidebarOpen(false);
    }
  }, [isSidebarClosed]);

  // Persist sidebar state (except when forcibly closed on project routes)
  useEffect(() => {
    if (typeof window === "undefined" || isSidebarClosed) {
      return;
    }

    window.localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarClosed, isSidebarOpen]);

  if (isProtectedRoute && (!isAuthConfigured || !isLoggedIn)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            {isAuthConfigured
              ? "You must be logged in to access dashboard."
              : "Authentication is currently unavailable. Please configure Supabase environment variables."}
          </p>
          {isAuthConfigured ? (
            <Button asChild>
              <Link href="/login">Log In</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // If the route has a sidebar, render the full dashboard layout
  if (hasSidebar) {
    return (
      <SidebarProvider
        open={isSidebarOpen}
        onOpenChange={(open) => {
          // Only allow toggling when not on project pages
          if (!isSidebarClosed) {
            setIsSidebarOpen(open);
          }
        }}
      >
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // For routes without a sidebar (like /login), just render the page content
  return <>{children}</>;
}
