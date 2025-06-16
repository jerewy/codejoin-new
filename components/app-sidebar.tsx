"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Layers, Users, Settings } from "lucide-react";
import { sidebarNavItems } from "./sidebar-nav-items"; // Optional: put nav items in separate file
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // If using ShadCN's `cn` utility

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup title="Navigation">
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted",
                pathname === item.href
                  ? "bg-muted text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          ))}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* Optional: User info, logout button, etc */}
        <div className="text-xs text-muted-foreground px-3 py-1">
          Logged in as shadcn
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
