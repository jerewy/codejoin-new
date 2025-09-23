"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Package, Code, Zap, Database, Globe, FileText, Star } from "lucide-react"

export default function ExtensionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const categories = [
    { id: "all", name: "All Extensions", icon: Package },
    { id: "languages", name: "Languages", icon: Code },
    { id: "tools", name: "Tools", icon: Zap },
    { id: "themes", name: "Themes", icon: Globe },
    { id: "snippets", name: "Snippets", icon: FileText },
    { id: "debuggers", name: "Debuggers", icon: Database },
  ]

  const extensions = [
    {
      id: "prettier",
      name: "Prettier",
      description: "Code formatter that enforces a consistent style",
      category: "tools",
      author: "Prettier",
      version: "2.8.4",
      rating: 4.9,
      downloads: 15000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: true,
      enabled: true,
      featured: true,
    },
    {
      id: "eslint",
      name: "ESLint",
      description: "Linting utility for JavaScript and TypeScript",
      category: "tools",
      author: "ESLint Team",
      version: "8.36.0",
      rating: 4.8,
      downloads: 12000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: true,
      enabled: true,
      featured: true,
    },
    {
      id: "python",
      name: "Python",
      description: "Rich support for the Python language",
      category: "languages",
      author: "Microsoft",
      version: "2023.6.0",
      rating: 4.7,
      downloads: 8000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: true,
      enabled: true,
      featured: false,
    },
    {
      id: "go",
      name: "Go",
      description: "Rich Go language support",
      category: "languages",
      author: "Go Team",
      version: "0.37.1",
      rating: 4.6,
      downloads: 3000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: false,
    },
    {
      id: "docker",
      name: "Docker",
      description: "Makes it easy to build, manage, and deploy containerized applications",
      category: "tools",
      author: "Microsoft",
      version: "1.25.1",
      rating: 4.5,
      downloads: 5000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: true,
    },
    {
      id: "gitlens",
      name: "GitLens",
      description: "Supercharge Git within CodeJoin",
      category: "tools",
      author: "GitKraken",
      version: "13.5.0",
      rating: 4.9,
      downloads: 7000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: true,
    },
    {
      id: "rust-analyzer",
      name: "Rust Analyzer",
      description: "Rust language support with code intelligence",
      category: "languages",
      author: "Rust Team",
      version: "0.4.1423",
      rating: 4.8,
      downloads: 1200000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: false,
    },
    {
      id: "material-theme",
      name: "Material Theme",
      description: "The most popular theme for CodeJoin",
      category: "themes",
      author: "Mattia Astorino",
      version: "2.5.0",
      rating: 4.9,
      downloads: 9000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: false,
    },
    {
      id: "live-server",
      name: "Live Server",
      description: "Launch a development local server with live reload feature",
      category: "tools",
      author: "Ritwick Dey",
      version: "5.7.9",
      rating: 4.7,
      downloads: 4500000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: false,
    },
    {
      id: "debugger-for-chrome",
      name: "Debugger for Chrome",
      description: "Debug your JavaScript code in the Chrome browser",
      category: "debuggers",
      author: "Microsoft",
      version: "4.13.0",
      rating: 4.6,
      downloads: 3800000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: false,
    },
    {
      id: "code-snippets",
      name: "Code Snippets",
      description: "Code snippets for JavaScript, TypeScript, and React",
      category: "snippets",
      author: "CodeJoin Team",
      version: "1.8.0",
      rating: 4.5,
      downloads: 2500000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
      featured: false,
    },
    {
      id: "ai-code-assistant",
      name: "AI Code Assistant",
      description: "AI-powered code completion and suggestions",
      category: "tools",
      author: "CodeJoin AI Team",
      version: "2.0.0",
      rating: 4.9,
      downloads: 6000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: true,
      enabled: true,
      featured: true,
    },
  ]

  const filteredExtensions = extensions.filter((extension) => {
    const matchesSearch =
      extension.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      extension.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || extension.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredExtensions = extensions.filter((e) => e.featured)
  const installedExtensions = extensions.filter((e) => e.installed)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Extensions</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search extensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Upload Extension
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6">
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Featured Extensions */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Featured Extensions</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {featuredExtensions.map((extension) => (
                  <Card key={extension.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={extension.icon || "/placeholder.svg"}
                            alt={extension.name}
                            className="w-10 h-10 rounded"
                          />
                          <div>
                            <h3 className="font-semibold">{extension.name}</h3>
                            <p className="text-xs text-muted-foreground">{extension.author}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{extension.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{extension.rating}</span>
                          </div>
                          <span>{extension.downloads.toLocaleString()} downloads</span>
                        </div>
                        <Button
                          variant={extension.installed ? "outline" : "default"}
                          size="sm"
                          className="w-full"
                        >
                          {extension.installed ? "Installed" : "Install"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
