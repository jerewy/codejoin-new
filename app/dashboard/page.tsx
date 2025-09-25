"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Users,
  Clock,
  Folder,
  Trash2,
  Share2,
  Settings,
  Eye,
  GitBranch,
  Calendar,
  Activity as ActivityIcon,
  AlertTriangle,
  LayoutGrid,
  List,
  Star as StarIcon,
} from "lucide-react";
import Link from "next/link";
import ProjectCard from "@/components/project-card";
import RecentActivity from "@/components/recent-activity";
import QuickStats from "@/components/quick-stats";
import dynamic from "next/dynamic";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabaseClient";
import { Project, Activity, RawActivity } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["active", "planning", "completed", "archived"] as const;

const UserDropdown = dynamic(() => import("@/components/user-dropdown"), {
  ssr: false,
});

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  isDeleting: boolean;
}

function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  isDeleting,
}: DeleteConfirmationProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    const handleEnter = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !isDeleting) {
        onConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("keydown", handleEnter);
      dialogRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleEnter);
    };
  }, [isOpen, onClose, onConfirm, isDeleting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        tabIndex={-1}
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h2 className="text-lg font-semibold">Delete Project</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">"{projectName}"</span>?
          <span className="block mt-2 text-red-600">
            This will permanently remove all project files and data.
          </span>
          <span className="block mt-2 font-medium">
            This action cannot be undone.
          </span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "active" | "planning" | "completed" | "archived" | "starred"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [pendingProjects, setPendingProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function getDashboardData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const [profileResponse, projectsResponse, activityResponse] =
            await Promise.all([
              // Query 1: Fetch user profile
              supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single(),

              // Query 2: Fetch projects
              supabase.rpc("get_projects_for_user"),

              // Query 3: Fetch recent activities
              supabase
                .from("activities")
                .select(
                  `
                id,
                created_at,
                activity_type,
                metadata,
                profiles ( full_name, user_avatar ),
                projects ( name )
              `
                )
                .order("created_at", { ascending: false })
                .limit(5),
            ]);

          console.log("Projects data from backend:", projectsResponse.data);
          console.log("Activity data from backend:", activityResponse.data);

          // Handle profile data
          if (profileResponse.error) throw profileResponse.error;
          if (profileResponse.data) {
            console.log(profileResponse.data);
            setUserName(profileResponse.data.full_name || "User");
          }

          // Handle projects data
          if (projectsResponse.error) throw projectsResponse.error;
          if (projectsResponse.data) {
            setProjects(
              projectsResponse.data.map((project: Project) => ({
                ...project,
                status: project.status?.toLowerCase() ?? project.status,
              }))
            );
          }

          // Handle and format activities data
          if (activityResponse.error) throw activityResponse.error;
          if (activityResponse.data) {
            const formattedActivities = activityResponse.data.map(
              (activity: RawActivity) => {
                // 1. Check if profiles is an array; if so, take the first item.
                //    If not, use it as is.
                const profile = Array.isArray(activity.profiles)
                  ? activity.profiles[0]
                  : activity.profiles;

                // Do the same for the project
                const project = Array.isArray(activity.projects)
                  ? activity.projects[0]
                  : activity.projects;

                // 2. Now, reliably use the 'profile' and 'project' variables
                return {
                  id: activity.id,
                  description: `${
                    profile?.full_name || "Unknown user"
                  } performed action '${activity.activity_type}' on project ${
                    project?.name || "Unknown project"
                  }`,
                  timestamp: activity.created_at,
                  user_name: profile?.full_name || "Unknown user",
                  user_avatar: profile?.user_avatar || "/default-avatar.png",
                };
              }
            );
            setRecentActivity(formattedActivities);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    getDashboardData();
  }, []);

  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);

    try {
      console.log('Attempting to delete project:', projectToDelete.id);

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to delete a project');
      }

      // Verify user owns this project
      const { data: projectCheck, error: checkError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectToDelete.id)
        .single();

      if (checkError) {
        console.error('Error checking project ownership:', checkError);
        throw new Error('Failed to verify project ownership');
      }

      if (projectCheck.user_id !== user.id) {
        throw new Error('You can only delete your own projects');
      }

      // First, delete all project nodes (files and folders)
      const { error: nodesError } = await supabase
        .from('project_nodes')
        .delete()
        .eq('project_id', projectToDelete.id);

      if (nodesError) {
        console.error('Error deleting project nodes:', nodesError);
        throw nodesError;
      }

      // Then delete the project itself
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (projectError) {
        console.error('Error deleting project:', projectError);
        throw projectError;
      }

      console.log('Project deleted successfully');

      // Remove project from local state
      setProjects(projects.filter(p => p.id !== projectToDelete.id));

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setProjectToDelete(null);

      // Show success message
      console.log(`Project "${projectToDelete.name}" deleted successfully`);

    } catch (error) {
      console.error('Error deleting project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete project: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (project: Project) => {
    console.log('Opening delete dialog for project:', project);
    // Close the dropdown first
    setOpenDropdowns(new Set());
    setTimeout(() => {
      setProjectToDelete(project);
      setDeleteDialogOpen(true);
    }, 100);
  };

  // Handle dropdown open state
  const handleDropdownOpenChange = (projectId: string, open: boolean) => {
    setOpenDropdowns(prev => {
      const next = new Set(prev);
      if (open) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  };

  const updatePendingState = (projectId: string, isPending: boolean) => {
    setPendingProjects((prev) => {
      const next = new Set(prev);
      if (isPending) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  };

  const handleToggleStar = async (project: Project, nextValue: boolean) => {
    updatePendingState(project.id, true);
    const previousValue = Boolean(project.isStarred);

    setProjects((prev) =>
      prev.map((item) =>
        item.id === project.id ? { ...item, isStarred: nextValue } : item
      )
    );

    try {
      const { error } = await supabase
        .from("projects")
        .update({ isStarred: nextValue })
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      toast({
        title: nextValue ? "Project starred" : "Project unstarred",
        description: nextValue
          ? `${project.name} is now pinned to the top of your workspace.`
          : `${project.name} has been removed from your starred projects.`,
      });
    } catch (error) {
      console.error("Failed to toggle star state", error);
      setProjects((prev) =>
        prev.map((item) =>
          item.id === project.id ? { ...item, isStarred: previousValue } : item
        )
      );
      toast({
        variant: "destructive",
        title: "Unable to update project",
        description: "Please try starring the project again.",
      });
    } finally {
      updatePendingState(project.id, false);
    }
  };

  const handleStatusChange = async (project: Project, nextStatus: string) => {
    if (project.status === nextStatus) return;

    updatePendingState(project.id, true);
    const previousStatus = project.status;

    setProjects((prev) =>
      prev.map((item) =>
        item.id === project.id ? { ...item, status: nextStatus } : item
      )
    );

    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: nextStatus })
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      const formattedStatus =
        nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
      toast({
        title: "Project status updated",
        description: `${project.name} is now marked as ${formattedStatus}.`,
      });
    } catch (error) {
      console.error("Failed to update project status", error);
      setProjects((prev) =>
        prev.map((item) =>
          item.id === project.id ? { ...item, status: previousStatus } : item
        )
      );
      toast({
        variant: "destructive",
        title: "Unable to update status",
        description: "Something went wrong while saving the new status.",
      });
    } finally {
      updatePendingState(project.id, false);
    }
  };

  if (loading) {
    return <div>Loading your dashboard...</div>;
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      );
    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "starred"
        ? Boolean(project.isStarred)
        : project.status === selectedFilter);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="flex items-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2"
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
              <span className="text-xl font-bold text-primary">CodeJoin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="./new-project">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
            <UserDropdown />
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">
            You have {projects.filter((p) => p.status === "active").length}{" "}
            active projects and{" "}
            {projects.filter((p) => p.collaborators > 1).length} collaborative
            projects.
          </p>
        </div>

        {/* Quick Stats */}
        <QuickStats projects={projects} />

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Projects Section */}
          <div className="lg:col-span-3">
            <div className="mb-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">My Projects</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedFilter("all")}>
                        All Projects
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("active")}
                      >
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("planning")}
                      >
                        Planning
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("completed")}
                      >
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("archived")}
                      >
                        Archived
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant={selectedFilter === "starred" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectedFilter((current) =>
                        current === "starred" ? "all" : "starred"
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    <StarIcon
                      className={`h-4 w-4 ${
                        selectedFilter === "starred"
                          ? "fill-yellow-400 text-yellow-500"
                          : ""
                      }`}
                    />
                    Starred
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Showing {filteredProjects.length} of {projects.length} projects
              </p>
            </div>

            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as "grid" | "list")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 max-w-[220px] mb-4">
                <TabsTrigger value="grid" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>

              <TabsContent value="grid">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onDelete={openDeleteDialog}
                      onToggleStar={(nextValue) =>
                        handleToggleStar(project, nextValue)
                      }
                      onStatusChange={(nextStatus) =>
                        handleStatusChange(project, nextStatus)
                      }
                      isUpdating={pendingProjects.has(project.id)}
                      statusOptions={STATUS_OPTIONS}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="list">
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <Card key={project.id} className="p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <img
                            src={project.thumbnail || "/placeholder.svg"}
                            alt={project.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                          <div>
                            <h3 className="font-semibold">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              project.isStarred
                                ? "text-yellow-500 hover:text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                            onClick={() =>
                              handleToggleStar(
                                project,
                                !(project.isStarred ?? false)
                              )
                            }
                            disabled={pendingProjects.has(project.id)}
                            aria-pressed={Boolean(project.isStarred)}
                          >
                            <StarIcon
                              className={`h-4 w-4 ${
                                project.isStarred
                                  ? "fill-yellow-400 text-yellow-400"
                                  : ""
                              }`}
                            />
                            <span className="sr-only">
                              {project.isStarred ? "Unstar" : "Star"} project
                            </span>
                          </Button>
                          <Select
                            value={(project.status as string | undefined) ?? "active"}
                            onValueChange={(value) =>
                              handleStatusChange(project, value)
                            }
                            disabled={pendingProjects.has(project.id)}
                          >
                            <SelectTrigger size="sm" className="min-w-[140px]">
                              <SelectValue placeholder="Set status" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.charAt(0).toUpperCase() +
                                    status.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge
                            variant={
                              project.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {project.status ?? "active"}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {project.collaborators}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(project.updated_at).toLocaleDateString()}
                          </div>
                          <DropdownMenu
                            open={openDropdowns.has(project.id)}
                            onOpenChange={(open) =>
                              handleDropdownOpenChange(project.id, open)
                            }
                          >
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem asChild>
                                <Link href={`/project/${project.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Open
                                </Link>
                              </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (typeof navigator !== "undefined" && navigator.share) {
                                navigator.share({
                                  title: project.name,
                                  text:
                                    project.description ||
                                    "Check out this project",
                                  url: `${window.location.origin}/project/${project.id}`,
                                });
                              } else if (
                                typeof navigator !== "undefined" &&
                                navigator.clipboard
                              ) {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/project/${project.id}`
                                );
                                alert("Project link copied to clipboard!");
                              }
                            }}
                          >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/project/${project.id}/settings`}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Settings
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Delete button clicked!', project);
                                  openDeleteDialog(project);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecentActivity activities={recentActivity} />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={"./new-project"}>
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Project
                  </Button>
                </Link>
                <Link href="/teams">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </Button>
                </Link>
                <Link href="/templates-section">
                  <Button className="w-full justify-start" variant="outline">
                    <Folder className="h-4 w-4 mr-2" />
                    Browse Templates
                  </Button>
                </Link>
                <Link href="/new-project">
                  <Button className="w-full justify-start" variant="outline">
                    <GitBranch className="h-4 w-4 mr-2" />
                    Import from GitHub
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Project Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Project Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Active Projects</p>
                    <p className="text-xs text-muted-foreground">
                      Currently in development
                    </p>
                  </div>
                  <Badge variant="default" className="text-xs">
                    {projects.filter((p) => p.status === "active").length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Total Projects</p>
                    <p className="text-xs text-muted-foreground">
                      All time projects
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {projects.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Collaborators</p>
                    <p className="text-xs text-muted-foreground">
                      Total team members
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {projects.reduce((sum, p) => sum + (p.collaborators || 0), 0)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
        projectName={projectToDelete?.name || ""}
        isDeleting={isDeleting}
      />
    </div>
  );
}
