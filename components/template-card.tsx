"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Download, Eye } from "lucide-react";

interface TemplateSummary {
  id: string | number;
  name: string;
  description: string;
  category?: string | null;
  difficulty?: string | null;
  downloads?: number | null;
  rating?: number | null;
  tags?: string[] | null;
  author?: string | null;
  thumbnail?: string | null;
  featured?: boolean | null;
  language?: string | null;
}

interface TemplateCardProps {
  template: TemplateSummary;
  onPreview?: (template: TemplateSummary) => void;
  featured?: boolean;
}

const difficultyVariant = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "secondary" as const;
    case "Intermediate":
      return "default" as const;
    case "Advanced":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

export default function TemplateCard({ template, onPreview, featured = false }: TemplateCardProps) {
  const tags = template.tags?.length
    ? template.tags
    : template.category
      ? [template.category]
      : template.language
        ? [template.language]
        : [];
  const rating = template.rating ?? 4.6;
  const downloads = template.downloads ?? 0;
  const difficulty = template.difficulty ?? "Community";
  const author = template.author ?? "CodeJoin Community";
  const thumbnail = template.thumbnail ?? "/placeholder.svg";

  return (
    <Card className={`group hover:shadow-md transition-shadow ${featured ? "border-primary/50" : ""}`}>
      <CardHeader className="pb-2">
        <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
          <img
            src={thumbnail}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
            <CardDescription className="line-clamp-2 text-sm">
              {template.description}
            </CardDescription>
          </div>
          {featured && <Badge variant="default">Featured</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {rating.toFixed(1)}
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {downloads.toLocaleString()}
            </div>
          </div>
          <Badge variant={difficultyVariant(difficulty)}>{difficulty}</Badge>
        </div>

        <div className="text-xs text-muted-foreground">by {author}</div>

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
  );
}



