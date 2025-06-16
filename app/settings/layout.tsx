"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Button } from "@/components/button";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLoggedIn = useAuthStatus();
  if (!isLoggedIn) {
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

  return (
    <SidebarProvider>
      <SidebarInset>
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
