"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import Link from "next/link";
import ProjectCard from "@/components/project-card";
import RecentActivity from "@/components/recent-activity";
import QuickStats from "@/components/quick-stats";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabaseClient";
import { Project, Activity, RawActivity } from "@/lib/types";

const UserDropdown = dynamic(() => import("@/components/user-dropdown"), {
  ssr: false,
});

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [userName, setUserName] = useState<string>("");

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
            setProjects(projectsResponse.data);
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
      selectedFilter === "all" || project.status === selectedFilter;
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">My Projects</h2>
              <div className="flex items-center gap-2">
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
              </div>
            </div>

            <Tabs defaultValue="grid" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-[200px] mb-4">
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>

              <TabsContent value="grid">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="list">
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <Card key={project.id} className="p-4">
                      <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={
                              project.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {project.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {project.collaborators}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(project.updated_at).toLocaleDateString()}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
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
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Team Member
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Folder className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Import from GitHub
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">E-commerce Website</p>
                    <p className="text-xs text-muted-foreground">
                      Client review
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    2 days
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Task Management App</p>
                    <p className="text-xs text-muted-foreground">
                      Beta release
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    1 week
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
