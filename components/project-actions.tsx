"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Save, Share2, Settings, Download, MoreVertical } from "lucide-react";
import Link from "next/link";
import ProjectSharingModal from "./project-sharing-modal";
import ProjectExportModal from "./project-export-modal";

interface ProjectActionsProps {
  projectId?: string;
  projectName?: string;
  files?: Array<{
    id: string;
    name: string;
    type: 'file' | 'folder';
    content?: string | null;
    language?: string | null;
    parent_id?: string | null;
  }>;
}

export default function ProjectActions({
  projectId = "default-project",
  projectName = "Untitled Project",
  files = []
}: ProjectActionsProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const dispatch = (type: string) => {
    window.dispatchEvent(new CustomEvent(`project:${type}`));
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsShareModalOpen(true)}
        >
          <Share2 className="h-4 w-4 mr-1" /> Share
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsExportModalOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projectId ? (
              <DropdownMenuItem asChild>
                <Link
                  href={`/project/${projectId}/settings`}
                  className="flex w-full items-center"
                  prefetch
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Project Settings
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <Settings className="h-4 w-4 mr-2" />
                Project Settings
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProjectSharingModal
        projectId={projectId}
        projectName={projectName}
        isOpen={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
      />

      <ProjectExportModal
        projectId={projectId}
        projectName={projectName}
        files={files}
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
      />
    </>
  );
}
