"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Filter,
  Download,
  Code,
  Palette,
  Smartphone,
  Globe,
  Database,
  Zap,
} from "lucide-react";
import TemplateCard from "@/components/template-card";
import TemplatePreview from "@/components/template-preview";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import NavLinks from "@/components/nav-links";

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const isLoggedIn = useAuthStatus();
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <Card className="max-w-md w-full p-6">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-semibold">
              Please Log In
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground mt-2">
              You need to be logged in to access the templates.
            </p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href="/login" className="w-full">
                Log In
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = [
    { id: "all", name: "All Templates", icon: Globe },
    { id: "react", name: "React", icon: Code },
    { id: "vue", name: "Vue.js", icon: Code },
    { id: "angular", name: "Angular", icon: Code },
    { id: "html", name: "HTML/CSS", icon: Palette },
    { id: "mobile", name: "Mobile", icon: Smartphone },
    { id: "backend", name: "Backend", icon: Database },
    { id: "ai", name: "AI/ML", icon: Zap },
  ];

  const templates = [
    {
      id: 1,
      name: "E-commerce Store",
      description: "Complete online store with cart, payments, and admin panel",
      category: "react",
      difficulty: "Advanced",
      downloads: 1250,
      rating: 4.8,
      tags: ["React", "TypeScript", "Stripe", "Tailwind"],
      author: "CodeJoin Team",
      thumbnail: "/placeholder.svg?height=200&width=300",
      featured: true,
    },
    {
      id: 2,
      name: "Portfolio Website",
      description: "Modern portfolio template with animations and dark mode",
      category: "html",
      difficulty: "Beginner",
      downloads: 2100,
      rating: 4.9,
      tags: ["HTML", "CSS", "JavaScript", "GSAP"],
      author: "Sarah Chen",
      thumbnail: "/placeholder.svg?height=200&width=300",
      featured: true,
    },
    {
      id: 3,
      name: "Task Management App",
      description: "Kanban-style task manager with real-time collaboration",
      category: "vue",
      difficulty: "Intermediate",
      downloads: 890,
      rating: 4.7,
      tags: ["Vue.js", "Vuex", "Socket.io", "Node.js"],
      author: "Mike Rodriguez",
      thumbnail: "/placeholder.svg?height=200&width=300",
      featured: false,
    },
    {
      id: 4,
      name: "Weather Dashboard",
      description: "Beautiful weather app with charts and forecasts",
      category: "react",
      difficulty: "Intermediate",
      downloads: 1560,
      rating: 4.6,
      tags: ["React", "Chart.js", "API", "PWA"],
      author: "Alex Kim",
      thumbnail: "/placeholder.svg?height=200&width=300",
      featured: false,
    },
    {
      id: 5,
      name: "Chat Application",
      description: "Real-time chat app with video calls and file sharing",
      category: "backend",
      difficulty: "Advanced",
      downloads: 750,
      rating: 4.8,
      tags: ["Node.js", "Socket.io", "WebRTC", "MongoDB"],
      author: "Emma Wilson",
      thumbnail: "/placeholder.svg?height=200&width=300",
      featured: true,
    },
    {
      id: 6,
      name: "AI Image Generator",
      description: "Generate images using AI with a beautiful interface",
      category: "ai",
      difficulty: "Advanced",
      downloads: 420,
      rating: 4.9,
      tags: ["Python", "FastAPI", "Stable Diffusion", "React"],
      author: "David Park",
      thumbnail: "/placeholder.svg?height=200&width=300",
      featured: false,
    },
  ];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredTemplates = templates.filter((t) => t.featured);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Templates</h1>
          </div>
          <NavLinks />
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Upload Template
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6">
        {/* Featured Templates */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Featured Templates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={setSelectedTemplate}
                featured={true}
              />
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? "default" : "ghost"
                    }
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <category.icon className="h-4 w-4 mr-2" />
                    {category.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Difficulty
                  </label>
                  <div className="space-y-2">
                    {["Beginner", "Intermediate", "Advanced"].map((level) => (
                      <label
                        key={level}
                        className="flex items-center space-x-2"
                      >
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rating
                  </label>
                  <div className="space-y-2">
                    {["4+ Stars", "3+ Stars", "2+ Stars"].map((rating) => (
                      <label
                        key={rating}
                        className="flex items-center space-x-2"
                      >
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{rating}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Templates Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {selectedCategory === "all"
                  ? "All Templates"
                  : categories.find((c) => c.id === selectedCategory)?.name}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredTemplates.length} templates
                </span>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Sort by
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={setSelectedTemplate}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
