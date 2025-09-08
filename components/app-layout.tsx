"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Button } from "@/components/button";
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

  // Read/write sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarOpen");
    if (savedState !== null) setIsSidebarOpen(JSON.parse(savedState));
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  if (isProtectedRoute && !isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You must be logged in to access dashboard.
          </p>
          <Button asChild>
            <a href="/login">Log In</a>
          </Button>
        </div>
      </div>
    );
  }

  // If the route has a sidebar, render the full dashboard layout
  if (hasSidebar) {
    return (
      <SidebarProvider
        defaultOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <SidebarInset>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1">{children}</main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // For routes without a sidebar (like /login), just render the page content
  return <>{children}</>;
}
