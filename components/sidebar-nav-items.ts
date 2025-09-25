import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bot,
  FolderPlus,
  Layers,
  Users,
  Settings,
} from "lucide-react";

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
        title: "AI Assistant",
        href: "/ai-assistant",
        icon: Bot,
        badge: "Beta",
      },
    ],
  },
  {
    title: "Creation",
    items: [
      {
        title: "New Project",
        href: "/new-project",
        icon: FolderPlus,
      },
      {
        title: "Templates",
        href: "/templates-section",
        icon: Layers,
      },
    ],
  },
  {
    title: "Collaboration",
    items: [
      {
        title: "Teams",
        href: "/teams",
        icon: Users,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

export const sidebarNavItems = sidebarNavSections.flatMap((section) => section.items);
