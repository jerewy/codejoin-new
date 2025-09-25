"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download, Star, Eye, Users, Code, Calendar } from "lucide-react";

type TemplatePreviewData = {
  id: string | number;
  name: string;
  description: string;
  tags?: string[] | null;
  rating?: number | null;
  downloads?: number | null;
  author?: string | null;
  difficulty?: string | null;
  thumbnail?: string | null;
  updatedAt?: string | null;
  language?: string | null;
};

interface TemplatePreviewProps {
  template: TemplatePreviewData;
  onClose: () => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Recently updated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently updated";
  }
  return parsed.toLocaleDateString();
};

export default function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const tags = template.tags?.length ? template.tags : template.language ? [template.language] : [];
  const rating = template.rating ?? 4.6;
  const downloads = template.downloads ?? 0;
  const author = template.author ?? "CodeJoin Community";
  const difficulty = template.difficulty ?? "Community";
  const thumbnail = template.thumbnail ?? "/placeholder.svg";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold leading-tight">{template.name}</h2>
              <p className="text-muted-foreground text-sm md:text-base">
                {template.description}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close template preview">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <img
                src={thumbnail}
                alt={template.name}
                className="w-full aspect-video object-cover rounded-lg"
                loading="lazy"
              />
            </div>

            <div className="space-y-4">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{rating.toFixed(1)} rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>{downloads.toLocaleString()} downloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>by {author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>{difficulty}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Calendar className="h-4 w-4" />
                  <span>Updated {formatDate(template.updatedAt)}</span>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">What you get</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Starter structure tailored for {template.language ?? "your stack"}</li>
                  <li>Idiomatic examples with comments you can build on</li>
                  <li>Ready-to-run entry file and supporting configs</li>
                  <li>Curated resource links inside the code comments</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
                <Button variant="outline" onClick={onClose}>
                  <Eye className="h-4 w-4 mr-2" />
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

