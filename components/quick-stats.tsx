"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Users, Clock, Star, Code } from "lucide-react";

interface QuickStatsProps {
  projects: Array<{
    status: string | null; // Allow for null status
    collaborators: number;
    isStarred: boolean | null; // Allow for null
    language: string | null; // Add language
    created_at: string; // Add creation date
  }>;
}

export default function QuickStats({ projects }: QuickStatsProps) {
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalCollaborators = projects.reduce(
    (sum, p) => sum + (p.collaborators ?? 0),
    0
  );
  const starredProjects = projects.filter((p) => p.isStarred).length;

  const getMostFrequentLanguage = () => {
    if (projects.length === 0) return "N/A";

    // Count languages from project language arrays and individual language field
    const languageCounts = projects.reduce((acc, p) => {
      // Handle project.language field (single language)
      if (p.language && typeof p.language === 'string') {
        acc[p.language] = (acc[p.language] || 0) + 1;
      }

      // Handle projects that might have language arrays in tags or other fields
      // Check if the project has tags that might represent languages
      if ('tags' in p && Array.isArray((p as any).tags)) {
        const languageKeywords = ['JavaScript', 'Python', 'Java', 'TypeScript', 'C#', 'Go', 'Rust', 'Swift', 'C++', 'C', 'SQL'];
        (p as any).tags.forEach((tag: string) => {
          const normalizedTag = languageKeywords.find(lang =>
            lang.toLowerCase() === tag.toLowerCase() ||
            (tag.toLowerCase() === 'js' && lang === 'JavaScript') ||
            (tag.toLowerCase() === 'ts' && lang === 'TypeScript') ||
            (tag.toLowerCase() === 'py' && lang === 'Python')
          );
          if (normalizedTag) {
            acc[normalizedTag] = (acc[normalizedTag] || 0) + 1;
          }
        });
      }

      return acc;
    }, {} as Record<string, number>);

    // Return the most frequent language or "None" if no languages found
    const languageEntries = Object.entries(languageCounts);
    if (languageEntries.length === 0) return "None";

    const [topLanguage] = languageEntries.reduce(
      (a, b) => (a[1] > b[1] ? a : b)
    );

    return topLanguage;
  };

  const mostFrequentLanguage = getMostFrequentLanguage();
  // New stat calculation
  const completedProjects = projects.filter(
    (p) => p.status === "completed"
  ).length;
  // ...
  const projectsThisMonth = projects.filter((p) => {
    const projectDate = new Date(p.created_at);
    const now = new Date();
    return (
      projectDate.getMonth() === now.getMonth() &&
      projectDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const stats = [
    {
      title: "Total Projects",
      value: totalProjects,
      icon: Folder,
      description: `${activeProjects} active projects`,
    },
    {
      title: "Collaborators",
      value: totalCollaborators,
      icon: Users,
      description: "Across all projects",
    },
    {
      // REPLACED "Hours This Week"
      title: "Top Language",
      value: mostFrequentLanguage, // Use the new calculation
      icon: Code, // You might need to import this icon from lucide-react
      description: "Most frequently used",
    },
    {
      title: "Starred",
      value: starredProjects,
      icon: Star,
      description: `${completedProjects} projects completed`,
    },
  ];

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
  );
}
