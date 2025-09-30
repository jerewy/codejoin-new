"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { LoadingScreen } from "@/components/LoadingScreen";
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
  const [isHydrated, setIsHydrated] = useState(false);

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

  // Handle hydration and read sidebar state from localStorage on mount
  useEffect(() => {
    setIsHydrated(true);
    const savedState = localStorage.getItem("sidebarOpen");
    if (savedState !== null) {
      const savedOpen = JSON.parse(savedState);
      // On project pages, always close sidebar regardless of saved state
      setIsSidebarOpen(isSidebarClosed ? false : savedOpen);
    }
  }, []);

  // Handle route changes - close sidebar when entering project, restore when leaving
  useEffect(() => {
    if (isSidebarClosed) {
      // Always close sidebar on project pages
      setIsSidebarOpen(false);
    } else {
      // Restore saved state when leaving project pages
      const savedState = localStorage.getItem("sidebarOpen");
      if (savedState !== null) {
        setIsSidebarOpen(JSON.parse(savedState));
      }
    }
  }, [isSidebarClosed]);

  // Save sidebar state to localStorage (but not when on project pages)
  useEffect(() => {
    if (!isSidebarClosed) {
      localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen, isSidebarClosed]);

  // Show loading during hydration to prevent mismatch
  if (!isHydrated) {
    return (
      <LoadingScreen
        message="Reconnecting to your workspace…"
        description="Hang tight while we restore your dashboard state."
      />
    );
  }

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
