export type TeamRole = "owner" | "admin" | "member";

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar: string | null;
  joinedAt: string;
  lastActive: string;
  projects: number;
}

export interface TeamProjectContributor {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

export type TeamProjectStatus = "active" | "planning" | "paused" | "completed";

export interface TeamProject {
  id: string;
  name: string;
  summary: string;
  status: TeamProjectStatus;
  updatedAt: string;
  progress: number;
  tags: string[];
  contributors: TeamProjectContributor[];
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: Exclude<TeamRole, "owner">;
  invitedBy: string;
  invitedAt: string;
  status: InvitationStatus;
}

export interface TeamMetrics {
  memberCount: number;
  projectCount: number;
  activeProjects: number;
  pendingInvites: number;
  weeklyActive: number;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  role: TeamRole;
  lastActive: string;
  createdAt: string;
  metrics: TeamMetrics;
  members: TeamMember[];
  projects: TeamProject[];
  invitations: TeamInvitation[];
}

const placeholderAvatar = (size: number) => `/placeholder.svg?height=${size}&width=${size}`;

export const TEAM_DATA: TeamSummary[] = [
  {
    id: "team-frontend-guild",
    name: "Frontend Guild",
    description: "Designs and builds polished user experiences across CodeJoin surfaces.",
    avatar: placeholderAvatar(80),
    role: "owner",
    lastActive: "Active 12 minutes ago",
    createdAt: "2024-01-15T09:30:00.000Z",
    metrics: {
      memberCount: 6,
      projectCount: 4,
      activeProjects: 2,
      pendingInvites: 1,
      weeklyActive: 5,
    },
    members: [
      {
        id: "member-sarah-chen",
        name: "Sarah Chen",
        email: "sarah.chen@codejoin.dev",
        role: "owner",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-01-15T09:30:00.000Z",
        lastActive: "Online",
        projects: 6,
      },
      {
        id: "member-felix-mora",
        name: "Felix Mora",
        email: "felix.mora@codejoin.dev",
        role: "admin",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-02-03T11:12:00.000Z",
        lastActive: "15 minutes ago",
        projects: 5,
      },
      {
        id: "member-amelia-price",
        name: "Amelia Price",
        email: "amelia.price@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-03-22T14:25:00.000Z",
        lastActive: "1 hour ago",
        projects: 3,
      },
      {
        id: "member-omar-wilson",
        name: "Omar Wilson",
        email: "omar.wilson@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-04-18T08:45:00.000Z",
        lastActive: "Yesterday",
        projects: 2,
      },
      {
        id: "member-ana-silva",
        name: "Ana Silva",
        email: "ana.silva@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-05-02T10:10:00.000Z",
        lastActive: "Yesterday",
        projects: 4,
      },
      {
        id: "member-jacob-lin",
        name: "Jacob Lin",
        email: "jacob.lin@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-06-09T09:05:00.000Z",
        lastActive: "2 days ago",
        projects: 1,
      },
    ],
    projects: [
      {
        id: "project-design-system",
        name: "Design System 2.0",
        summary: "Refactoring shared components for accessibility and theming upgrades.",
        status: "active",
        updatedAt: "2025-09-24T14:45:00.000Z",
        progress: 72,
        tags: ["React", "TypeScript", "Design Tokens"],
        contributors: [
          {
            id: "member-sarah-chen",
            name: "Sarah Chen",
            avatar: placeholderAvatar(32),
            role: "Lead",
          },
          {
            id: "member-felix-mora",
            name: "Felix Mora",
            avatar: placeholderAvatar(32),
            role: "Reviewer",
          },
          {
            id: "member-amelia-price",
            name: "Amelia Price",
            avatar: placeholderAvatar(32),
            role: "Contributor",
          },
        ],
      },
      {
        id: "project-playground",
        name: "Interactive Playground",
        summary: "New onboarding tour with embedded live code and guardrails for new users.",
        status: "planning",
        updatedAt: "2025-09-20T10:12:00.000Z",
        progress: 35,
        tags: ["Next.js", "Tutorial", "Experiment"],
        contributors: [
          {
            id: "member-amelia-price",
            name: "Amelia Price",
            avatar: placeholderAvatar(32),
            role: "Owner",
          },
          {
            id: "member-ana-silva",
            name: "Ana Silva",
            avatar: placeholderAvatar(32),
            role: "Design",
          },
        ],
      },
      {
        id: "project-theme-editor",
        name: "Live Theme Editor",
        summary: "Expose runtime theming controls with persistent workspace presets.",
        status: "active",
        updatedAt: "2025-09-18T17:30:00.000Z",
        progress: 58,
        tags: ["UI", "Feature", "Accessibility"],
        contributors: [
          {
            id: "member-jacob-lin",
            name: "Jacob Lin",
            avatar: placeholderAvatar(32),
            role: "Engineer",
          },
          {
            id: "member-sarah-chen",
            name: "Sarah Chen",
            avatar: placeholderAvatar(32),
            role: "Reviewer",
          },
        ],
      },
      {
        id: "project-status-dashboard",
        name: "Workspace Status Dashboard",
        summary: "Surface realtime code execution health metrics in the editor sidebar.",
        status: "paused",
        updatedAt: "2025-09-12T09:00:00.000Z",
        progress: 40,
        tags: ["Dashboard", "Monitoring"],
        contributors: [
          {
            id: "member-omar-wilson",
            name: "Omar Wilson",
            avatar: placeholderAvatar(32),
            role: "Observer",
          },
        ],
      },
    ],
    invitations: [
      {
        id: "invite-frontend-1",
        email: "jamie.taylor@codejoin.dev",
        role: "member",
        invitedBy: "Sarah Chen",
        invitedAt: "2025-09-22T15:00:00.000Z",
        status: "pending",
      },
    ],
  },
  {
    id: "team-backend-platform",
    name: "Backend Platform",
    description: "Maintains code execution infrastructure and real-time collaboration services.",
    avatar: placeholderAvatar(80),
    role: "admin",
    lastActive: "Synced 1 hour ago",
    createdAt: "2023-11-02T12:00:00.000Z",
    metrics: {
      memberCount: 4,
      projectCount: 3,
      activeProjects: 2,
      pendingInvites: 1,
      weeklyActive: 4,
    },
    members: [
      {
        id: "member-darius-long",
        name: "Darius Long",
        email: "darius.long@codejoin.dev",
        role: "admin",
        avatar: placeholderAvatar(40),
        joinedAt: "2023-11-02T12:00:00.000Z",
        lastActive: "Online",
        projects: 8,
      },
      {
        id: "member-leah-santos",
        name: "Leah Santos",
        email: "leah.santos@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2023-12-10T08:20:00.000Z",
        lastActive: "10 minutes ago",
        projects: 7,
      },
      {
        id: "member-ian-ross",
        name: "Ian Ross",
        email: "ian.ross@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-01-07T09:10:00.000Z",
        lastActive: "2 hours ago",
        projects: 6,
      },
      {
        id: "member-zhang-wei",
        name: "Wei Zhang",
        email: "wei.zhang@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-02-19T13:40:00.000Z",
        lastActive: "Yesterday",
        projects: 4,
      },
    ],
    projects: [
      {
        id: "project-docker-optimizer",
        name: "Docker Runner Optimizer",
        summary: "Reduce cold-start time for polyglot execution containers by 40%.",
        status: "active",
        updatedAt: "2025-09-23T19:05:00.000Z",
        progress: 81,
        tags: ["Node.js", "Docker", "Performance"],
        contributors: [
          {
            id: "member-darius-long",
            name: "Darius Long",
            avatar: placeholderAvatar(32),
            role: "Lead",
          },
          {
            id: "member-leah-santos",
            name: "Leah Santos",
            avatar: placeholderAvatar(32),
            role: "Contributor",
          },
        ],
      },
      {
        id: "project-event-stream",
        name: "Realtime Event Stream",
        summary: "Scalable event fan-out for cursor sync and diagnostics.",
        status: "active",
        updatedAt: "2025-09-21T16:22:00.000Z",
        progress: 64,
        tags: ["WebSockets", "Redis", "Observability"],
        contributors: [
          {
            id: "member-ian-ross",
            name: "Ian Ross",
            avatar: placeholderAvatar(32),
            role: "Engineer",
          },
          {
            id: "member-zhang-wei",
            name: "Wei Zhang",
            avatar: placeholderAvatar(32),
            role: "SRE",
          },
        ],
      },
      {
        id: "project-audit-log",
        name: "Audit Log API",
        summary: "Structured log ingestion for compliance exports and retention tooling.",
        status: "planning",
        updatedAt: "2025-09-18T08:50:00.000Z",
        progress: 22,
        tags: ["API", "Security", "Compliance"],
        contributors: [
          {
            id: "member-leah-santos",
            name: "Leah Santos",
            avatar: placeholderAvatar(32),
            role: "Owner",
          },
        ],
      },
    ],
    invitations: [
      {
        id: "invite-backend-1",
        email: "mikael.hughes@codejoin.dev",
        role: "admin",
        invitedBy: "Darius Long",
        invitedAt: "2025-09-15T09:45:00.000Z",
        status: "pending",
      },
      {
        id: "invite-backend-2",
        email: "nina.vergara@codejoin.dev",
        role: "member",
        invitedBy: "Leah Santos",
        invitedAt: "2025-08-30T13:25:00.000Z",
        status: "accepted",
      },
    ],
  },
  {
    id: "team-mobile-studio",
    name: "Mobile Studio",
    description: "Builds CodeJoin companion apps and offline-first research prototypes.",
    avatar: placeholderAvatar(80),
    role: "member",
    lastActive: "Reviewed 3 days ago",
    createdAt: "2024-05-28T14:15:00.000Z",
    metrics: {
      memberCount: 3,
      projectCount: 2,
      activeProjects: 1,
      pendingInvites: 1,
      weeklyActive: 2,
    },
    members: [
      {
        id: "member-liv-hart",
        name: "Liv Hart",
        email: "liv.hart@codejoin.dev",
        role: "admin",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-05-28T14:15:00.000Z",
        lastActive: "Online",
        projects: 5,
      },
      {
        id: "member-samir-roy",
        name: "Samir Roy",
        email: "samir.roy@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-06-02T10:30:00.000Z",
        lastActive: "Yesterday",
        projects: 3,
      },
      {
        id: "member-june-larsen",
        name: "June Larsen",
        email: "june.larsen@codejoin.dev",
        role: "member",
        avatar: placeholderAvatar(40),
        joinedAt: "2024-07-17T09:05:00.000Z",
        lastActive: "3 days ago",
        projects: 2,
      },
    ],
    projects: [
      {
        id: "project-ios-sandbox",
        name: "iOS Sandbox",
        summary: "SwiftUI playground with offline code execution for campus research.",
        status: "active",
        updatedAt: "2025-09-16T12:40:00.000Z",
        progress: 54,
        tags: ["Swift", "Research"],
        contributors: [
          {
            id: "member-liv-hart",
            name: "Liv Hart",
            avatar: placeholderAvatar(32),
            role: "Lead",
          },
          {
            id: "member-june-larsen",
            name: "June Larsen",
            avatar: placeholderAvatar(32),
            role: "Designer",
          },
        ],
      },
      {
        id: "project-android-companion",
        name: "Android Companion",
        summary: "Compile and run from mobile with Replit-style session recovery.",
        status: "planning",
        updatedAt: "2025-09-10T09:15:00.000Z",
        progress: 18,
        tags: ["Kotlin", "Offline"],
        contributors: [
          {
            id: "member-samir-roy",
            name: "Samir Roy",
            avatar: placeholderAvatar(32),
            role: "Engineer",
          },
        ],
      },
    ],
    invitations: [
      {
        id: "invite-mobile-1",
        email: "claire.nguyen@codejoin.dev",
        role: "member",
        invitedBy: "Liv Hart",
        invitedAt: "2025-09-05T11:00:00.000Z",
        status: "pending",
      },
    ],
  },
];
