"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Folder, Users, Clock, Star } from "lucide-react"

interface QuickStatsProps {
  projects: Array<{
    status: string
    collaborators: number
    isStarred: boolean
  }>
}

export default function QuickStats({ projects }: QuickStatsProps) {
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === "active").length
  const totalCollaborators = projects.reduce((sum, p) => sum + p.collaborators, 0)
  const starredProjects = projects.filter((p) => p.isStarred).length

  const stats = [
    {
      title: "Total Projects",
      value: totalProjects,
      icon: Folder,
      description: `${activeProjects} active`,
    },
    {
      title: "Collaborators",
      value: totalCollaborators,
      icon: Users,
      description: "Across all projects",
    },
    {
      title: "Hours This Week",
      value: "24.5",
      icon: Clock,
      description: "+12% from last week",
    },
    {
      title: "Starred Projects",
      value: starredProjects,
      icon: Star,
      description: "Quick access",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
