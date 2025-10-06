"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Users,
  Clock,
  Star,
  Eye,
  Share2,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  onDelete?: (project: Project) => void;
  onToggleStar?: (nextValue: boolean) => void;
  onStatusChange?: (nextStatus: string) => void;
  onShare?: (project: Project) => void;
  isUpdating?: boolean;
  statusOptions?: readonly string[];
}

export default function ProjectCard({
  project,
  onDelete,
  onToggleStar,
  onStatusChange,
  onShare,
  isUpdating = false,
  statusOptions,
}: ProjectCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const availableStatuses = statusOptions ?? [
    "active",
    "planning",
    "completed",
    "archived",
  ];

  const handleDelete = () => {
    setDropdownOpen(false); // Close dropdown immediately
    setTimeout(() => {
      onDelete?.(project); // Small delay to ensure dropdown closes first
    }, 100);
  };

  const isStarred = Boolean(project.isStarred);
  const currentStatus =
    (project.status as string | undefined)?.toLowerCase() ?? "active";
  const canToggleStar = typeof onToggleStar === "function";
  const canChangeStatus = typeof onStatusChange === "function";

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              {!canToggleStar && isStarred && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                isStarred
                  ? "text-yellow-500 hover:text-yellow-400"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                if (canToggleStar) {
                  onToggleStar?.(!isStarred);
                }
              }}
              disabled={!canToggleStar || isUpdating}
              aria-pressed={isStarred}
            >
              <Star
                className={`h-4 w-4 ${
                  isStarred ? "fill-yellow-400 text-yellow-400" : ""
                }`}
              />
              <span className="sr-only">
                {isStarred ? "Unstar" : "Star"} project
              </span>
            </Button>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href={`/project/${project.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Open
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onShare?.(project);
                    setDropdownOpen(false);
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/project/${project.id}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("ProjectCard delete clicked!", project);
                    handleDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
          <img
            src={project.thumbnail ?? "@/public/project_placeholder.jpg"}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {project.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {project.collaborators}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(project.updated_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={currentStatus}
              onValueChange={(value) => {
                if (canChangeStatus) {
                  onStatusChange?.(value);
                }
              }}
              disabled={!canChangeStatus || isUpdating}
            >
              <SelectTrigger size="sm" className="min-w-[140px]">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge
              variant={currentStatus === "active" ? "default" : "secondary"}
            >
              {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </Badge>
          </div>
        </div>

        <Link href={`/project/${project.id}`}>
          <Button className="w-full">Open Project</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
