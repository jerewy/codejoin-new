"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Users,
  Crown,
  Shield,
  User,
  MoreHorizontal,
  Settings,
  UserPlus,
  Mail,
  Calendar,
  Activity,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SidebarTrigger } from "@/components/ui/sidebar";

const teams = [
  {
    id: "1",
    name: "Frontend Team",
    description: "Responsible for all frontend development and UI/UX design",
    members: 8,
    projects: 12,
    role: "owner",
    avatar: "/placeholder.svg?height=80&width=80",
    created: "2023-01-15",
    lastActive: "2 hours ago",
  },
  {
    id: "2",
    name: "Backend Engineers",
    description: "API development, database design, and server infrastructure",
    members: 6,
    projects: 8,
    role: "admin",
    avatar: "/placeholder.svg?height=80&width=80",
    created: "2023-02-20",
    lastActive: "1 day ago",
  },
  {
    id: "3",
    name: "Mobile Development",
    description: "Cross-platform mobile app development team",
    members: 4,
    projects: 5,
    role: "member",
    avatar: "/placeholder.svg?height=80&width=80",
    created: "2023-03-10",
    lastActive: "3 days ago",
  },
];

const teamMembers = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@example.com",
    role: "owner",
    avatar: "/placeholder.svg?height=40&width=40",
    joinedAt: "2023-01-15",
    lastActive: "Online",
    projects: 8,
  },
  {
    id: "2",
    name: "Mike Rodriguez",
    email: "mike@example.com",
    role: "admin",
    avatar: "/placeholder.svg?height=40&width=40",
    joinedAt: "2023-01-20",
    lastActive: "2 hours ago",
    projects: 6,
  },
  {
    id: "3",
    name: "Alex Kim",
    email: "alex@example.com",
    role: "member",
    avatar: "/placeholder.svg?height=40&width=40",
    joinedAt: "2023-02-01",
    lastActive: "1 day ago",
    projects: 4,
  },
  {
    id: "4",
    name: "Emma Wilson",
    email: "emma@example.com",
    role: "member",
    avatar: "/placeholder.svg?height=40&width=40",
    joinedAt: "2023-02-15",
    lastActive: "3 days ago",
    projects: 3,
  },
];

const invitations = [
  {
    id: "1",
    email: "john@example.com",
    role: "member",
    invitedBy: "Sarah Chen",
    invitedAt: "2023-12-01",
    status: "pending",
  },
  {
    id: "2",
    email: "lisa@example.com",
    role: "admin",
    invitedBy: "Mike Rodriguez",
    invitedAt: "2023-11-28",
    status: "pending",
  },
];

export default function TeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(teams[0]);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleCreateTeam = () => {
    // Handle team creation logic here
    setIsCreateTeamOpen(false);
    setNewTeamName("");
    setNewTeamDescription("");
  };

  const handleInviteMember = () => {
    // Handle member invitation logic here
    setIsInviteMemberOpen(false);
    setInviteEmail("");
    setInviteRole("member");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    placeholder="Describe your team's purpose"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateTeamOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={!newTeamName}>
                    Create Team
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 container py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Teams Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">My Teams</h2>
                <Badge variant="secondary">{teams.length}</Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTeam.id === team.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={team.avatar || "/placeholder.svg"}
                          alt={team.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {team.name}
                            </h3>
                            {getRoleIcon(team.role)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {team.members} members
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Team Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedTeam.avatar || "/placeholder.svg"}
                        alt={selectedTeam.name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className="text-2xl font-bold">
                            {selectedTeam.name}
                          </h1>
                          <Badge
                            variant={getRoleBadgeVariant(selectedTeam.role)}
                          >
                            {selectedTeam.role}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">
                          {selectedTeam.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {selectedTeam.members} members
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            {selectedTeam.projects} projects
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Created{" "}
                            {new Date(
                              selectedTeam.created
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Team
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Invite Link
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Team Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>

              {/* Team Tabs */}
              <Tabs defaultValue="members" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Team Members</h3>
                    <Dialog
                      open={isInviteMemberOpen}
                      onOpenChange={setIsInviteMemberOpen}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input
                              id="invite-email"
                              type="email"
                              placeholder="Enter email address"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invite-role">Role</Label>
                            <Select
                              value={inviteRole}
                              onValueChange={setInviteRole}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
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
                              disabled={!inviteEmail}
                            >
                              Send Invitation
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <Card key={member.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatar || "/placeholder.svg"}
                                alt={member.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{member.name}</h4>
                                  {getRoleIcon(member.role)}
                                  <Badge
                                    variant={getRoleBadgeVariant(member.role)}
                                    className="text-xs"
                                  >
                                    {member.role}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{member.email}</span>
                                  <span>•</span>
                                  <span>{member.projects} projects</span>
                                  <span>•</span>
                                  <span>
                                    Joined{" "}
                                    {new Date(
                                      member.joinedAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
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
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Message
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Profile
                                  </DropdownMenuItem>
                                  {member.role !== "owner" && (
                                    <DropdownMenuItem className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" />
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

                  {/* Pending Invitations */}
                  {invitations.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-muted-foreground">
                        Pending Invitations
                      </h4>
                      <div className="space-y-2">
                        {invitations.map((invitation) => (
                          <Card key={invitation.id} className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
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
                                      {new Date(
                                        invitation.invitedAt
                                      ).toLocaleDateString()}
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
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-2">
                      Team Projects
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Projects shared with this team will appear here
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Team Project
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-2">
                      Team Settings
                    </h3>
                    <p className="text-muted-foreground">
                      Configure team permissions, integrations, and more
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
