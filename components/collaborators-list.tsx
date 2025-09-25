"use client";
import { Users } from "lucide-react";
import { type Collaborator } from "@/lib/types"; // 1. Import your database-driven type
import { useSocket } from "@/lib/socket";

// 2. Update the props interface to use the imported Collaborator type
interface CollaboratorsListProps {
  collaborators?: Collaborator[];
  projectId?: string;
}

export default function CollaboratorsList({
  collaborators = [],
  projectId,
}: CollaboratorsListProps) {
  const { collaborators: realtimeCollaborators } = useSocket();

  // Use real-time collaborators if available, otherwise fall back to prop collaborators
  const activeCollaborators = realtimeCollaborators.length > 0 ? realtimeCollaborators : collaborators;
  const onlineCount = activeCollaborators.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {activeCollaborators.slice(0, 3).map((collaborator) => (
          <div key={collaborator.userId || (collaborator as any).user_id} className="relative">
            <img
              src={(collaborator.userAvatar || (collaborator as any).user_avatar) || "/placeholder.svg"}
              alt={(collaborator.userName || (collaborator as any).full_name) || "Collaborator"}
              className="w-8 h-8 rounded-full border-2 border-background"
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-green-500`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{onlineCount} online</span>
      </div>
    </div>
  );
}
