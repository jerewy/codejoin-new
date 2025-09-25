"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Sparkles, Bot } from "lucide-react";

import { sidebarNavSections } from "./sidebar-nav-items";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border/60 bg-sidebar/90">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">CodeJoin</span>
            <span className="text-xs text-muted-foreground">AI workspace</span>
          </div>
        </Link>
        <Button asChild size="sm" className="mt-3 w-full gap-2 text-xs">
          <Link href="/ai-assistant">
            <Bot className="h-4 w-4" />
            Launch AI Assistant
          </Link>
        </Button>
      </SidebarHeader>
      <SidebarContent className="space-y-4 px-2 py-4">
        {sidebarNavSections.map((section) => (
          <SidebarGroup key={section.title} className="gap-2">
            <SidebarGroupLabel className="px-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        className="group gap-3 rounded-md px-2 py-2 text-sm"
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-colors",
                              isActive && "text-primary"
                            )}
                          />
                          <span className="flex-1 text-left font-medium text-sidebar-foreground">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge ? (
                        <SidebarMenuBadge className="border border-border bg-transparent px-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {item.badge}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60 px-3 py-4 text-xs text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-sidebar-foreground">Workspace</span>
          <span>All systems operational</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
