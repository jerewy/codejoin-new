"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { X, Download, Star, Eye, Users, Code } from "lucide-react"

interface TemplatePreviewProps {
  template: any
  onClose: () => void
}

export default function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{template.name}</h2>
              <p className="text-muted-foreground">{template.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <img
                src={template.thumbnail || "/placeholder.svg"}
                alt={template.name}
                className="w-full aspect-video object-cover rounded-lg"
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{template.rating} rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>{template.downloads.toLocaleString()} downloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>by {template.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>{template.difficulty}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Responsive design</li>
                  <li>• Modern UI components</li>
                  <li>• TypeScript support</li>
                  <li>• Dark mode ready</li>
                  <li>• Well documented</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Live Demo
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
