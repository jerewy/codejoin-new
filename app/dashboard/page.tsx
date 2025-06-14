"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  Activity,
} from "lucide-react"
import Link from "next/link"
import ProjectCard from "@/components/project-card"
import RecentActivity from "@/components/recent-activity"
import QuickStats from "@/components/quick-stats"

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")

  const projects = [
    {
      id: "1",
      name: "E-commerce Website",
      description: "Modern React-based online store with payment integration",
      type: "React",
      collaborators: 3,
      lastModified: "2 hours ago",
      status: "active",
      isStarred: true,
      thumbnail: "/placeholder.svg?height=120&width=200",
      tags: ["React", "TypeScript", "Stripe"],
    },
    {
      id: "2",
      name: "Portfolio Site",
      description: "Personal portfolio website with animations",
      type: "HTML/CSS/JS",
      collaborators: 1,
      lastModified: "1 day ago",
      status: "completed",
      isStarred: false,
      thumbnail: "/placeholder.svg?height=120&width=200",
      tags: ["HTML", "CSS", "JavaScript"],
    },
    {
      id: "3",
      name: "Task Management App",
      description: "Collaborative task management with real-time updates",
      type: "Vue.js",
      collaborators: 5,
      lastModified: "3 days ago",
      status: "active",
      isStarred: true,
      thumbnail: "/placeholder.svg?height=120&width=200",
      tags: ["Vue.js", "Node.js", "MongoDB"],
    },
    {
      id: "4",
      name: "Weather Dashboard",
      description: "Real-time weather data visualization",
      type: "Python",
      collaborators: 2,
      lastModified: "1 week ago",
      status: "archived",
      isStarred: false,
      thumbnail: "/placeholder.svg?height=120&width=200",
      tags: ["Python", "Flask", "API"],
    },
    {
      id: "5",
      name: "Mobile Game",
      description: "2D puzzle game built with JavaScript",
      type: "JavaScript",
      collaborators: 4,
      lastModified: "2 weeks ago",
      status: "active",
      isStarred: false,
      thumbnail: "/placeholder.svg?height=120&width=200",
      tags: ["JavaScript", "Canvas", "Game"],
    },
    {
      id: "6",
      name: "API Documentation",
      description: "Interactive API documentation site",
      type: "Markdown",
      collaborators: 2,
      lastModified: "3 weeks ago",
      status: "completed",
      isStarred: true,
      thumbnail: "/placeholder.svg?height=120&width=200",
      tags: ["Markdown", "Documentation"],
    },
  ]

  const recentActivity = [
    {
      id: 1,
      user: "Sarah Chen",
      action: "edited",
      target: "E-commerce Website",
      time: "2 minutes ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: 2,
      user: "Mike Rodriguez",
      action: "commented on",
      target: "Task Management App",
      time: "15 minutes ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: 3,
      user: "Alex Kim",
      action: "joined",
      target: "Portfolio Site",
      time: "1 hour ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: 4,
      user: "You",
      action: "created",
      target: "Weather Dashboard",
      time: "2 hours ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  ]

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === "all" || project.status === selectedFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
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
                <path d="M14 10L18 14M18 10L14 14" stroke="#0D47A1" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 18L18 22M18 18L14 22" stroke="#0D47A1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-xl font-bold text-primary">CodeJoin</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-primary">
              Dashboard
            </Link>
            <Link href="/templates" className="text-sm font-medium hover:underline underline-offset-4">
              Templates
            </Link>
            <Link href="/teams" className="text-sm font-medium hover:underline underline-offset-4">
              Teams
            </Link>
            <Link href="/settings" className="text-sm font-medium hover:underline underline-offset-4">
              Settings
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <img src="/placeholder.svg?height=32&width=32" alt="Profile" className="h-6 w-6 rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, John!</h1>
          <p className="text-muted-foreground">
            You have {projects.filter((p) => p.status === "active").length} active projects and{" "}
            {projects.filter((p) => p.collaborators > 1).length} collaborative projects.
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
                    <DropdownMenuItem onClick={() => setSelectedFilter("all")}>All Projects</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedFilter("active")}>Active</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedFilter("completed")}>Completed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedFilter("archived")}>Archived</DropdownMenuItem>
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
                            <p className="text-sm text-muted-foreground">{project.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={project.status === "active" ? "default" : "secondary"}>
                            {project.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {project.collaborators}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {project.lastModified}
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
                  <Activity className="h-5 w-5" />
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
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
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
                    <p className="text-xs text-muted-foreground">Client review</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    2 days
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Task Management App</p>
                    <p className="text-xs text-muted-foreground">Beta release</p>
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
  )
}
