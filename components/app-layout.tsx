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
import { useState, useEffect } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const isLoggedIn = useAuthStatus();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Define which routes should have the sidebar
  const sidebarRoutes = [
    "dashboard",
    "settings",
    "project",
    "ai-assistant",
    "templates-section",
  ];
  const isProtectedRoute = sidebarRoutes.includes(segment || "");
  const hasSidebar = isLoggedIn && isProtectedRoute;

  // Project pages should always have sidebar closed for focus
  const isProjectPage = segment === "project";

  // Read sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarOpen");
    if (savedState !== null) {
      const savedOpen = JSON.parse(savedState);
      // On project pages, always close sidebar regardless of saved state
      setIsSidebarOpen(isProjectPage ? false : savedOpen);
    }
  }, []);

  // Handle route changes - close sidebar when entering project, restore when leaving
  useEffect(() => {
    if (isProjectPage) {
      // Always close sidebar on project pages
      setIsSidebarOpen(false);
    } else {
      // Restore saved state when leaving project pages
      const savedState = localStorage.getItem("sidebarOpen");
      if (savedState !== null) {
        setIsSidebarOpen(JSON.parse(savedState));
      }
    }
  }, [isProjectPage]);

  // Save sidebar state to localStorage (but not when on project pages)
  useEffect(() => {
    if (!isProjectPage) {
      localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen, isProjectPage]);

  if (isProtectedRoute && !isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You must be logged in to access dashboard.
          </p>
          <Button asChild>
            <Link href="/login">Log In</Link>
          </Button>
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
          if (!isProjectPage) {
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
