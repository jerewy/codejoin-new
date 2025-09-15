"use client";

import { useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Users,
  Shield,
  Webhook,
  Trash2,
  Plus,
  Github,
  Globe,
  Lock,
  Eye,
  UserPlus,
  Crown,
  User,
  MoreHorizontal,
  Copy,
  AlertTriangle,
  Save,
  RefreshCw,
  Key,
  Zap,
  Cloud,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface ProjectSettingsProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectSettingsPage({
  params: paramsPromise,
}: ProjectSettingsProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isLoading, setIsLoading] = useState(false);
  const params = React.use(paramsPromise);

  const [projectSettings, setProjectSettings] = useState({
    name: "My Awesome Project",
    description: "A collaborative coding project built with CodeJoin",
    visibility: "private",
    defaultBranch: "main",
    autoSave: true,
    realTimeSync: true,
    codeCompletion: true,
    linting: true,
    formatting: true,
    gitIntegration: true,
    deploymentHooks: false,
    notifications: {
      commits: true,
      collaborators: true,
      deployments: false,
      issues: true,
    },
  });

  const [collaborators] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "owner",
      joinedAt: "2024-01-15",
      lastActive: "2 hours ago",
    },
    {
      id: 2,
      name: "Sarah Chen",
      email: "sarah@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "admin",
      joinedAt: "2024-02-01",
      lastActive: "1 day ago",
    },
    {
      id: 3,
      name: "Mike Rodriguez",
      email: "mike@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "member",
      joinedAt: "2024-02-10",
      lastActive: "3 days ago",
    },
    {
      id: 4,
      name: "Alex Kim",
      email: "alex@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "member",
      joinedAt: "2024-02-15",
      lastActive: "1 week ago",
    },
  ]);

  const [integrations] = useState([
    {
      id: "github",
      name: "GitHub",
      description: "Sync with GitHub repository",
      icon: Github,
      connected: true,
      config: {
        repository: "johndoe/awesome-project",
        branch: "main",
        autoSync: true,
        url: "github.com",
      },
    },
    {
      id: "vercel",
      name: "Vercel",
      description: "Deploy to Vercel",
      icon: Globe,
      connected: false,
      config: null,
    },
    {
      id: "netlify",
      name: "Netlify",
      description: "Deploy to Netlify",
      icon: Cloud,
      connected: false,
      config: null,
    },
  ]);

  const [webhooks] = useState([
    {
      id: 1,
      url: "https://api.example.com/webhook",
      events: ["push", "pull_request"],
      active: true,
      lastTriggered: "2024-01-20T10:30:00Z",
    },
    {
      id: 2,
      url: "https://deploy.example.com/hook",
      events: ["push"],
      active: false,
      lastTriggered: "2024-01-18T15:45:00Z",
    },
  ]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast({
      title: "Settings saved",
      description: "Your project settings have been updated successfully.",
    });
  };

  const handleInviteCollaborator = async () => {
    if (!inviteEmail) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsInviteDialogOpen(false);
    setInviteEmail("");
    setInviteRole("member");

    toast({
      title: "Invitation sent",
      description: `Invitation sent to ${inviteEmail}`,
    });
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmation !== projectSettings.name) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast({
      title: "Project deleted",
      description: "Your project has been permanently deleted.",
      variant: "destructive",
    });

    router.push("/dashboard");
  };

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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href={`/project/${params.id}`}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
                      fill="#FF5722"
                    />
                    <path
                      d="M14 10L18 14M18 10L14 14"
                      stroke="#0D47A1"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 18L18 22M18 18L14 22"
                      stroke="#0D47A1"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="font-bold text-primary">CodeJoin</span>
                </div>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Project Settings</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6 overflow-y-auto">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="collaborators">
              <Users className="h-4 w-4 mr-2" />
              Collaborators
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Zap className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="danger">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Danger Zone
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
                <CardDescription>
                  Update your project's basic information and settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={projectSettings.name}
                      onChange={(e) =>
                        setProjectSettings({
                          ...projectSettings,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={projectSettings.visibility}
                      onValueChange={(value) =>
                        setProjectSettings({
                          ...projectSettings,
                          visibility: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Private
                          </div>
                        </SelectItem>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Public
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={projectSettings.description}
                    onChange={(e) =>
                      setProjectSettings({
                        ...projectSettings,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe your project..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-branch">Default Branch</Label>
                  <Input
                    id="default-branch"
                    value={projectSettings.defaultBranch}
                    onChange={(e) =>
                      setProjectSettings({
                        ...projectSettings,
                        defaultBranch: e.target.value,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editor Settings</CardTitle>
                <CardDescription>
                  Configure your coding environment preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Save</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically save changes as you type
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.autoSave}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          autoSave: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Real-time Sync</Label>
                      <p className="text-sm text-muted-foreground">
                        Sync changes with collaborators in real-time
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.realTimeSync}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          realTimeSync: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Code Completion</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable AI-powered code suggestions
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.codeCompletion}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          codeCompletion: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Linting</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable code linting and error detection
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.linting}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          linting: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Formatting</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically format code on save
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.formatting}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          formatting: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Commits</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when commits are made
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.notifications.commits}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          notifications: {
                            ...projectSettings.notifications,
                            commits: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Collaborators</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when collaborators join or leave
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.notifications.collaborators}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          notifications: {
                            ...projectSettings.notifications,
                            collaborators: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Deployments</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify about deployment status
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.notifications.deployments}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          notifications: {
                            ...projectSettings.notifications,
                            deployments: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Issues</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify about new issues and comments
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.notifications.issues}
                      onCheckedChange={(checked) =>
                        setProjectSettings({
                          ...projectSettings,
                          notifications: {
                            ...projectSettings.notifications,
                            issues: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Collaborators */}
          <TabsContent value="collaborators" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project Collaborators</CardTitle>
                    <CardDescription>
                      Manage who has access to this project.
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isInviteDialogOpen}
                    onOpenChange={setIsInviteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Collaborator
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Collaborator</DialogTitle>
                        <DialogDescription>
                          Send an invitation to collaborate on this project.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-email">Email Address</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            placeholder="colleague@example.com"
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
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsInviteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleInviteCollaborator}
                          disabled={!inviteEmail || isLoading}
                        >
                          {isLoading ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Send Invitation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={collaborator.avatar || "/placeholder.svg"}
                          alt={collaborator.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{collaborator.name}</p>
                            {getRoleIcon(collaborator.role)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {collaborator.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {collaborator.joinedAt} • Last active{" "}
                            {collaborator.lastActive}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(collaborator.role)}>
                          {collaborator.role}
                        </Badge>
                        {collaborator.role !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Change Role</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Remove Access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
                <CardDescription>
                  Connect your project with external services and tools.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.map((integration) => {
                    const IconComponent = integration.icon;
                    return (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-8 w-8" />
                          <div>
                            <p className="font-medium">{integration.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {integration.description}
                            </p>
                            {integration.connected && integration.config && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Connected to:{" "}
                                {integration.config?.repository ||
                                  integration.config?.url}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {integration.connected ? (
                            <>
                              <Badge variant="secondary">Connected</Badge>
                              <Button variant="outline" size="sm">
                                Configure
                              </Button>
                              <Button variant="outline" size="sm">
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <Button size="sm">Connect</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Webhooks</CardTitle>
                    <CardDescription>
                      Configure webhooks to receive notifications about project
                      events.
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{webhook.url}</p>
                          <Badge
                            variant={webhook.active ? "default" : "secondary"}
                          >
                            {webhook.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Events: {webhook.events.join(", ")}</span>
                          <span>
                            Last triggered:{" "}
                            {new Date(
                              webhook.lastTriggered
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
                <CardDescription>
                  Manage project access and security settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require all collaborators to enable 2FA
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Branch Protection</Label>
                    <p className="text-sm text-muted-foreground">
                      Protect main branch from direct pushes
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Code Review Required</Label>
                    <p className="text-sm text-muted-foreground">
                      Require code review before merging
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage API keys for this project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Project API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Created on Dec 15, 2024
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                    <Button variant="destructive" size="sm">
                      Revoke
                    </Button>
                  </div>
                </div>
                <Button>
                  <Key className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  These actions are irreversible. Please proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                  <div>
                    <p className="font-medium">Archive Project</p>
                    <p className="text-sm text-muted-foreground">
                      Archive this project. It will be read-only and hidden from
                      your dashboard.
                    </p>
                  </div>
                  <Button variant="outline">Archive</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                  <div>
                    <p className="font-medium">Transfer Ownership</p>
                    <p className="text-sm text-muted-foreground">
                      Transfer this project to another user or organization.
                    </p>
                  </div>
                  <Button variant="outline">Transfer</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                  <div>
                    <p className="font-medium text-destructive">
                      Delete Project
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this project and all of its data. This
                      cannot be undone.
                    </p>
                  </div>
                  <Dialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete Project</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently
                          delete the project and all of its data.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>
                            Type{" "}
                            <code className="bg-muted px-1 rounded">
                              {projectSettings.name}
                            </code>{" "}
                            to confirm:
                          </Label>
                          <Input
                            value={deleteConfirmation}
                            onChange={(e) =>
                              setDeleteConfirmation(e.target.value)
                            }
                            placeholder={projectSettings.name}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteProject}
                          disabled={
                            deleteConfirmation !== projectSettings.name ||
                            isLoading
                          }
                        >
                          {isLoading ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Delete Project
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
