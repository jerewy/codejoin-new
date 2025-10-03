"use client";
import { Users } from "lucide-react";
import { type Collaborator } from "@/lib/types";
import { useSocket } from "@/lib/socket";

type RealtimeCollaborator = ReturnType<typeof useSocket>["collaborators"][number];
type AnyCollaborator = Collaborator | RealtimeCollaborator;

interface CollaboratorsListProps {
  collaborators?: Collaborator[];
}

const getCollaboratorId = (collaborator: AnyCollaborator) =>
  "socketId" in collaborator ? collaborator.socketId : collaborator.user_id;

const getCollaboratorAvatar = (collaborator: AnyCollaborator) => {
  if ("userAvatar" in collaborator) {
    return collaborator.userAvatar ?? "/placeholder.svg";
  }

  return collaborator.user_avatar ?? "/placeholder.svg";
};

const getCollaboratorName = (collaborator: AnyCollaborator) => {
  if ("userName" in collaborator) {
    return collaborator.userName || "Collaborator";
  }

  return collaborator.full_name ?? "Collaborator";
};

export default function CollaboratorsList({
  collaborators = [],
}: CollaboratorsListProps) {
  const { collaborators: realtimeCollaborators } = useSocket();

  const activeCollaborators: AnyCollaborator[] =
    realtimeCollaborators.length > 0 ? realtimeCollaborators : collaborators;
  const onlineCount = activeCollaborators.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {activeCollaborators.slice(0, 3).map((collaborator) => (
          <div key={getCollaboratorId(collaborator)} className="relative">
            <img
              src={getCollaboratorAvatar(collaborator)}
              alt={getCollaboratorName(collaborator)}
              className="w-8 h-8 rounded-full border-2 border-background"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-green-500" />
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
