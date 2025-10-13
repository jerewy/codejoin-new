import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Bot, FolderPlus, Settings } from "lucide-react";

export type SidebarNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type SidebarNavSection = {
  title: string;
  items: SidebarNavItem[];
};

export const sidebarNavSections: SidebarNavSection[] = [
  {
    title: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "New Project",
        href: "/new-project",
        icon: FolderPlus,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
  {
    title: "AI Tools",
    items: [
      {
        title: "AI Assistant",
        href: "/ai-assistant",
        icon: Bot,
        badge: "Beta",
      },
      ],
  },
];

export const sidebarNavItems = sidebarNavSections.flatMap(
  (section) => section.items
);
