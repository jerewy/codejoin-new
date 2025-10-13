"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Button } from "@/components/button";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const { isLoggedIn, isInitialized: isAuthStatusInitialized } = useAuthStatus();
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const [isAuthConfigured, setIsAuthConfigured] = useState(false);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize isAuthConfigured after mount to prevent hydration mismatch
  useEffect(() => {
    setIsAuthConfigured(!!supabaseClient);
    setIsAuthInitialized(true);
  }, [supabaseClient]);

  // Combined initialization state
  const isFullyInitialized = isAuthInitialized && isAuthStatusInitialized;

  // Define which routes should have the sidebar
  const sidebarRoutes = [
    "dashboard",
    "project",
    "settings",
    "new-project",
    "ai-assistant",
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
    if (typeof window === "undefined") {
      return;
    }

    const savedState = window.localStorage.getItem("sidebarOpen");

    if (savedState !== null) {
      try {
        const savedOpen = JSON.parse(savedState);
        // On project pages, always close sidebar regardless of saved state
        setIsSidebarOpen(isSidebarClosed ? false : savedOpen);
      } catch (error) {
        console.warn("Failed to parse sidebar state from localStorage", error);
        window.localStorage.removeItem("sidebarOpen");
        setIsSidebarOpen(false);
      }
    } else if (isSidebarClosed) {
      setIsSidebarOpen(false);
    }
  }, [isSidebarClosed]);

  // Handle route changes - close sidebar when entering project, restore when leaving
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isSidebarClosed) {
      // Always close sidebar on project pages
      setIsSidebarOpen(false);
    } else {
      // Restore saved state when leaving project pages
      const savedState = window.localStorage.getItem("sidebarOpen");
      if (savedState !== null) {
        try {
          setIsSidebarOpen(JSON.parse(savedState));
        } catch (error) {
          console.warn("Failed to parse sidebar state from localStorage", error);
          window.localStorage.removeItem("sidebarOpen");
          setIsSidebarOpen(false);
        }
      }
    }
  }, [isSidebarClosed]);

  // Save sidebar state to localStorage (but not when on project pages)
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isSidebarClosed) {
      window.localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen, isSidebarClosed]);

  // Show loading state during auth initialization to prevent hydration mismatch
  if (!isFullyInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
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
