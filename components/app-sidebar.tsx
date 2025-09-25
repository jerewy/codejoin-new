"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, Sparkles, Bot } from "lucide-react";

import { sidebarNavSections } from "./sidebar-nav-items";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border/60 bg-sidebar/95">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">CodeJoin</span>
            <span className="text-xs text-muted-foreground">
              Collaborative AI workspace
            </span>
          </div>
        </Link>
        <div className="flex items-center justify-between px-3">
          <Badge className="rounded-full border-primary/30 bg-primary/10 text-[0.65rem] font-medium uppercase tracking-wide text-primary">
            Pro plan
          </Badge>
          <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
            <Link href="/ai-assistant">
              <Bot className="h-4 w-4" />
              Launch AI
            </Link>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1 py-4">
        {sidebarNavSections.map((section) => (
          <SidebarGroup key={section.title} className="gap-1">
            <SidebarGroupLabel className="px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        className="group items-start gap-3 py-2"
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-colors",
                              isActive && "text-primary"
                            )}
                          />
                          <span className="flex flex-1 flex-col text-left">
                            <span className="text-sm font-medium leading-tight">
                              {item.title}
                            </span>
                            {item.description ? (
                              <span
                                className={cn(
                                  "text-xs text-muted-foreground transition-colors group-data-[collapsible=icon]:hidden",
                                  isActive && "text-sidebar-accent-foreground/80"
                                )}
                              >
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge ? (
                        <SidebarMenuBadge className="border border-primary/30 bg-primary/10 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
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
      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        <div className="rounded-lg border border-sidebar-border/60 bg-sidebar/70 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sidebar-foreground">
                Workspace synced
              </span>
              <span className="text-[11px] text-muted-foreground">
                All systems operational
              </span>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-center gap-2 text-xs"
          >
            <Link href="/settings">Manage settings</Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
