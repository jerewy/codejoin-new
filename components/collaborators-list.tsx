"use client";
import { Users } from "lucide-react";
import { type Collaborator } from "@/lib/types"; // 1. Import your database-driven type

// 2. Update the props interface to use the imported Collaborator type
interface CollaboratorsListProps {
  collaborators: Collaborator[];
}

export default function CollaboratorsList({
  collaborators,
}: CollaboratorsListProps) {
  // Note: Your 'Collaborator' type doesn't have a 'status' field yet.
  // For now, we'll assume everyone is online. In a real-time app, you'd get this status separately.
  const onlineCount = collaborators.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {collaborators.slice(0, 3).map((collaborator) => (
          // 3. Update the JSX to use the correct property names from your type
          <div key={collaborator.user_id} className="relative">
            <img
              src={collaborator.user_avatar || "/placeholder.svg"} // Use user_avatar
              alt={collaborator.full_name || "Collaborator"} // Use full_name
              className="w-8 h-8 rounded-full border-2 border-background"
            />
            {/* We'll add a green dot for everyone for now */}
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
