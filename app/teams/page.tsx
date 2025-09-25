"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  TeamInvitation,
  TeamProject,
  TeamRole,
  TeamSummary,
} from "@/lib/data/teams";
import {
  Activity,
  Calendar,
  Copy,
  Crown,
  Edit,
  ExternalLink,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type InviteRole = TeamInvitation["role"];

const DEFAULT_AVATAR = "/placeholder.svg";

const createLocalId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `team-${Date.now()}`;
};

const formatRelativeTime = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const diff = Date.now() - date.getTime();
  const seconds = Math.max(1, Math.round(diff / 1000));
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const formatDate = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleDateString();
};

const formatStatus = (status: TeamProject["status"]) =>
  status
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (match) => match.toUpperCase());

const getRoleIcon = (role: TeamRole) => {
  switch (role) {
    case "owner":
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case "admin":
      return <Shield className="h-4 w-4 text-blue-500" />;
    default:
      return <User className="h-4 w-4 text-gray-500" />;
  }
};

const getRoleBadgeVariant = (role: TeamRole) => {
  switch (role) {
    case "owner":
      return "default" as const;
    case "admin":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

const getProjectStatusBadgeVariant = (status: TeamProject["status"]) => {
  switch (status) {
    case "active":
      return "default" as const;
    case "completed":
      return "secondary" as const;
    case "paused":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const pluralize = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/teams");
      if (!response.ok) {
        throw new Error(`Failed to fetch teams (${response.status})`);
      }

      const data = (await response.json()) as { teams: TeamSummary[] };
      const nextTeams = data.teams ?? [];

      setTeams(nextTeams);
      setSelectedTeamId((currentId) => {
        if (currentId && nextTeams.some((team) => team.id === currentId)) {
          return currentId;
        }
        return nextTeams[0]?.id ?? null;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load teams");
      setTeams([]);
      setSelectedTeamId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) {
      return teams;
    }
    const query = searchQuery.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.description.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  const summary = useMemo(() => {
    if (!selectedTeam) {
      return {
        memberCount: 0,
        projectCount: 0,
        activeProjects: 0,
        pendingInvites: 0,
        weeklyActive: 0,
      };
    }

    return {
      memberCount:
        selectedTeam.metrics?.memberCount ?? selectedTeam.members.length,
      projectCount:
        selectedTeam.metrics?.projectCount ?? selectedTeam.projects.length,
      activeProjects:
        selectedTeam.metrics?.activeProjects ??
        selectedTeam.projects.filter((project) => project.status === "active")
          .length,
      pendingInvites:
        selectedTeam.metrics?.pendingInvites ??
        selectedTeam.invitations.filter(
          (invitation) => invitation.status === "pending"
        ).length,
      weeklyActive:
        selectedTeam.metrics?.weeklyActive ??
        Math.min(selectedTeam.members.length, 5),
    };
  }, [selectedTeam]);

  const pendingInvitations = useMemo(
    () =>
      selectedTeam?.invitations.filter(
        (invitation) => invitation.status === "pending"
      ) ?? [],
    [selectedTeam]
  );

  const showListSkeleton = isLoading && teams.length === 0;
  const showDetailsSkeleton = isLoading && !selectedTeam;

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const newTeam: TeamSummary = {
      id: createLocalId(),
      name: newTeamName.trim(),
      description:
        newTeamDescription.trim() || "New team created from the dashboard",
      avatar: null,
      role: "owner",
      lastActive: "Active just now",
      createdAt: timestamp,
      metrics: {
        memberCount: 1,
        projectCount: 0,
        activeProjects: 0,
        pendingInvites: 0,
        weeklyActive: 1,
      },
      members: [
        {
          id: createLocalId(),
          name: "You",
          email: "you@codejoin.dev",
          role: "owner",
          avatar: DEFAULT_AVATAR,
          joinedAt: timestamp,
          lastActive: "Online",
          projects: 0,
        },
      ],
      projects: [],
      invitations: [],
    };

    setTeams((prev) => [newTeam, ...prev]);
    setSelectedTeamId(newTeam.id);
    setIsCreateTeamOpen(false);
    setNewTeamName("");
    setNewTeamDescription("");
  };

  const handleInviteMember = () => {
    if (!selectedTeam || !inviteEmail.trim()) {
      return;
    }

    const newInvitation: TeamInvitation = {
      id: createLocalId(),
      email: inviteEmail.trim(),
      role: inviteRole,
      invitedBy: "You",
      invitedAt: new Date().toISOString(),
      status: "pending",
    };

    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== selectedTeam.id) {
          return team;
        }
        const invitations = [...team.invitations, newInvitation];
        const pending = invitations.filter(
          (invitation) => invitation.status === "pending"
        ).length;
        return {
          ...team,
          invitations,
          metrics: {
            ...team.metrics,
            pendingInvites: pending,
          },
        };
      })
    );

    setInviteEmail("");
    setInviteRole("member");
    setIsInviteMemberOpen(false);
  };
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Teams"
        description="Organize your collaborators, assign roles, and keep every project team aligned in CodeJoin."
        leading={<SidebarTrigger />}
        startContent={
          <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground sm:flex">
            <Users className="h-4 w-4" />
            Collaboration hub
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTeams}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input
                      id="team-name"
                      placeholder="Enter team name"
                      value={newTeamName}
                      onChange={(event) => setNewTeamName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-description">Description</Label>
                    <Textarea
                      id="team-description"
                      placeholder="Describe your team's purpose"
                      value={newTeamDescription}
                      onChange={(event) =>
                        setNewTeamDescription(event.target.value)
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateTeamOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTeam}
                      disabled={!newTeamName.trim()}
                    >
                      Create Team
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex-1">
        <div className="container py-6">
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span>{error}</span>
              <Button variant="link" size="sm" onClick={fetchTeams}>
                Try again
              </Button>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">My Teams</h2>
                  <Badge variant="secondary">{teams.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                  <Input
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2">
                  {showListSkeleton ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <Card key={`team-skeleton-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-3 w-1/3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredTeams.length > 0 ? (
                    filteredTeams.map((team) => (
                      <Card
                        key={team.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTeamId === team.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={team.avatar || DEFAULT_AVATAR}
                              alt={team.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-medium">
                                  {team.name}
                                </h3>
                                {getRoleIcon(team.role)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {pluralize(
                                  team.metrics?.memberCount ??
                                    team.members.length,
                                  "member"
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        {searchQuery
                          ? "No teams match your search."
                          : "Create your first team to get started."}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="space-y-6">
                {showDetailsSkeleton ? (
                  <Card>
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-6 w-1/3" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton
                            key={`metric-skeleton-${index}`}
                            className="h-24"
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : selectedTeam ? (
                  <>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-4">
                            <img
                              src={selectedTeam.avatar || DEFAULT_AVATAR}
                              alt={selectedTeam.name}
                              className="h-16 w-16 rounded-full object-cover"
                            />
                            <div>
                              <div className="mb-1 flex items-center gap-2">
                                <h1 className="text-2xl font-bold">
                                  {selectedTeam.name}
                                </h1>
                                <Badge
                                  variant={getRoleBadgeVariant(
                                    selectedTeam.role
                                  )}
                                >
                                  {selectedTeam.role}
                                </Badge>
                              </div>
                              <p className="mb-2 text-muted-foreground">
                                {selectedTeam.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {pluralize(summary.memberCount, "member")}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Activity className="h-4 w-4" />
                                  {pluralize(summary.projectCount, "project")}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Created {formatDate(selectedTeam.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs">
                              {selectedTeam.lastActive}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Team
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Invite Link
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Team Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Members
                            </span>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="mt-3 text-2xl font-semibold">
                            {summary.memberCount}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {summary.weeklyActive} active this week
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Active projects
                            </span>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="mt-3 text-2xl font-semibold">
                            {summary.activeProjects}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pluralize(summary.projectCount, "project")} total
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Pending invites
                            </span>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="mt-3 text-2xl font-semibold">
                            {summary.pendingInvites}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pendingInvitations.length > 0
                              ? "Awaiting responses"
                              : "No pending requests"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Created
                            </span>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="mt-3 text-2xl font-semibold">
                            {new Date(selectedTeam.createdAt).getFullYear()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatRelativeTime(selectedTeam.createdAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Tabs defaultValue="members" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger
                          value="members"
                          className="flex items-center justify-center gap-2"
                        >
                          Members
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {summary.memberCount}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="projects"
                          className="flex items-center justify-center gap-2"
                        >
                          Projects
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {summary.projectCount}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                      </TabsList>

                      <TabsContent value="members" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            Team Members
                          </h3>
                          <Dialog
                            open={isInviteMemberOpen}
                            onOpenChange={setIsInviteMemberOpen}
                          >
                            <DialogTrigger asChild>
                              <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite Member
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Invite Team Member</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="invite-email">
                                    Email Address
                                  </Label>
                                  <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="Enter email address"
                                    value={inviteEmail}
                                    onChange={(event) =>
                                      setInviteEmail(event.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="invite-role">Role</Label>
                                  <Select
                                    value={inviteRole}
                                    onValueChange={(value) =>
                                      setInviteRole(value as InviteRole)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="member">
                                        Member
                                      </SelectItem>
                                      <SelectItem value="admin">
                                        Admin
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsInviteMemberOpen(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleInviteMember}
                                    disabled={!inviteEmail.trim()}
                                  >
                                    Send Invitation
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="space-y-2">
                          {selectedTeam.members.map((member) => (
                            <Card key={member.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={member.avatar || DEFAULT_AVATAR}
                                      alt={member.name}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium">
                                          {member.name}
                                        </h4>
                                        {getRoleIcon(member.role)}
                                        <Badge
                                          variant={getRoleBadgeVariant(
                                            member.role
                                          )}
                                          className="text-xs"
                                        >
                                          {member.role}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                        <span>{member.email}</span>
                                        <span>�</span>
                                        <span>
                                          {pluralize(
                                            member.projects,
                                            "project"
                                          )}
                                        </span>
                                        <span>�</span>
                                        <span>
                                          Joined {formatDate(member.joinedAt)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {member.lastActive}
                                    </Badge>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                          <Mail className="mr-2 h-4 w-4" />
                                          Send Message
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          View Profile
                                        </DropdownMenuItem>
                                        {member.role !== "owner" && (
                                          <DropdownMenuItem className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Remove from Team
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {pendingInvitations.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="font-medium text-muted-foreground">
                              Pending Invitations
                            </h4>
                            <div className="space-y-2">
                              {pendingInvitations.map((invitation) => (
                                <Card
                                  key={invitation.id}
                                  className="border-dashed"
                                >
                                  <CardContent className="p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                          <Mail className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-medium">
                                              {invitation.email}
                                            </h4>
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {invitation.role}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            Invited by {invitation.invitedBy} on{" "}
                                            {formatDate(invitation.invitedAt)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          Pending
                                        </Badge>
                                        <Button variant="outline" size="sm">
                                          Resend
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="projects" className="space-y-4">
                        {selectedTeam.projects.length > 0 ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            {selectedTeam.projects.map((project) => (
                              <Card key={project.id} className="h-full">
                                <CardContent className="flex h-full flex-col gap-4 p-5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h4 className="text-lg font-semibold">
                                        {project.name}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        {project.summary}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={getProjectStatusBadgeVariant(
                                        project.status
                                      )}
                                    >
                                      {formatStatus(project.status)}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <Progress value={project.progress} />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{project.progress}% complete</span>
                                      <span>
                                        Updated{" "}
                                        {formatRelativeTime(project.updatedAt)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag) => (
                                      <Badge
                                        key={`${project.id}-${tag}`}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="mt-auto flex items-center justify-between gap-3 text-sm">
                                    <div className="flex -space-x-2">
                                      {project.contributors
                                        .slice(0, 3)
                                        .map((contributor) => (
                                          <img
                                            key={contributor.id}
                                            src={
                                              contributor.avatar ||
                                              DEFAULT_AVATAR
                                            }
                                            alt={contributor.name}
                                            title={`${contributor.name} � ${contributor.role}`}
                                            className="h-8 w-8 rounded-full border-2 border-background object-cover"
                                          />
                                        ))}
                                      {project.contributors.length > 3 && (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
                                          +{project.contributors.length - 3}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {pluralize(
                                        project.contributors.length,
                                        "contributor"
                                      )}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed p-8 text-center">
                            <h3 className="mb-2 text-lg font-semibold">
                              No team projects yet
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                              Share a workspace with {selectedTeam.name} to see
                              it appear here.
                            </p>
                            <Button>
                              <Plus className="mr-2 h-4 w-4" />
                              Create Team Project
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-4">
                        <div className="rounded-md border border-dashed p-8 text-center">
                          <h3 className="mb-2 text-lg font-semibold">
                            Team Settings
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Role management and integrations for{" "}
                            {selectedTeam.name} are coming soon. In the
                            meantime, use the actions menu above to make quick
                            edits.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                      Select a team to view details, or create a new one to get
                      started.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
