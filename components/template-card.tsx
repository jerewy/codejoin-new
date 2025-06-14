"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Download, Eye } from "lucide-react"

interface TemplateCardProps {
  template: {
    id: number
    name: string
    description: string
    category: string
    difficulty: string
    downloads: number
    rating: number
    tags: string[]
    author: string
    thumbnail: string
    featured?: boolean
  }
  onPreview?: (template: any) => void
  featured?: boolean
}

export default function TemplateCard({ template, onPreview, featured = false }: TemplateCardProps) {
  return (
    <Card className={`group hover:shadow-md transition-shadow ${featured ? "border-primary/50" : ""}`}>
      <CardHeader className="pb-2">
        <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
          <img
            src={template.thumbnail || "/placeholder.svg"}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="line-clamp-2">{template.description}</CardDescription>
          </div>
          {featured && <Badge variant="default">Featured</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {template.rating}
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {template.downloads.toLocaleString()}
            </div>
          </div>
          <Badge
            variant={
              template.difficulty === "Beginner"
                ? "secondary"
                : template.difficulty === "Intermediate"
                  ? "default"
                  : "destructive"
            }
          >
            {template.difficulty}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">by {template.author}</div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPreview?.(template)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
