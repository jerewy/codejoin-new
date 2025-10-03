"use client";
import { Users } from "lucide-react";
import { type Collaborator } from "@/lib/types";
import { useSocket } from "@/lib/socket";

type RealtimeCollaborator = ReturnType<
  typeof useSocket
>["collaborators"][number];
type AnyCollaborator = Collaborator | RealtimeCollaborator;

interface CollaboratorsListProps {
  collaborators?: Collaborator[];
}

const getCollaboratorId = (collaborator: AnyCollaborator) =>
  "socketId" in collaborator ? collaborator.socketId : collaborator.user_id;

const resolveAvatar = (value?: string | null) =>
  value && value.trim().length > 0 ? value : "/placeholder.svg";

const getCollaboratorAvatar = (collaborator: AnyCollaborator) => {
  if ("userAvatar" in collaborator) {
    return resolveAvatar(collaborator.userAvatar);
  }

  return resolveAvatar(collaborator.user_avatar);
};

const resolveName = (value?: string | null) =>
  value && value.trim().length > 0 ? value : "Collaborator";

const getCollaboratorName = (collaborator: AnyCollaborator) => {
  if ("userName" in collaborator) {
    return resolveName(collaborator.userName);
  }

  return resolveName(collaborator.full_name);
};

export default function CollaboratorsList({
  collaborators = [],
}: CollaboratorsListProps) {
  const { collaborators: realtimeCollaborators } = useSocket();

  const fallbackCollaborators = new Map(
    collaborators.map((collaborator) => [collaborator.user_id, collaborator])
  );

  const activeCollaborators: AnyCollaborator[] =
    realtimeCollaborators.length > 0
      ? realtimeCollaborators.map((collaborator) => {
          const fallback = fallbackCollaborators.get(collaborator.userId);
          if (!fallback) {
            return collaborator;
          }

          const enriched = {
            ...collaborator,
            userName:
              collaborator.userName && collaborator.userName.trim().length > 0
                ? collaborator.userName
                : fallback.full_name ?? collaborator.userName,
            userAvatar:
              collaborator.userAvatar &&
              collaborator.userAvatar.trim().length > 0
                ? collaborator.userAvatar
                : fallback.user_avatar ?? collaborator.userAvatar,
          } satisfies RealtimeCollaborator;

          return enriched;
        })
      : collaborators;
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
