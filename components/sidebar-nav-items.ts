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
  description?: string;
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
        description: "Project overview & insights",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "AI Assistant",
        description: "Chat, voice & code automations",
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
        description: "Spin up a collaborative space",
        href: "/new-project",
        icon: FolderPlus,
      },
      {
        title: "Templates",
        description: "Start from curated blueprints",
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
        description: "Manage invites & permissions",
        href: "/teams",
        icon: Users,
      },
      {
        title: "Settings",
        description: "Workspace preferences",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

export const sidebarNavItems = sidebarNavSections.flatMap((section) => section.items);
