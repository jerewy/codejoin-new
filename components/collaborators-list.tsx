"use client"
import { Users } from "lucide-react"

interface CollaboratorsListProps {
  collaborators: Array<{
    id: number
    name: string
    avatar: string
    status: string
  }>
}

export default function CollaboratorsList({ collaborators }: CollaboratorsListProps) {
  const onlineCount = collaborators.filter((c) => c.status === "online").length

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {collaborators.slice(0, 3).map((collaborator) => (
          <div key={collaborator.id} className="relative">
            <img
              src={collaborator.avatar || "/placeholder.svg"}
              alt={collaborator.name}
              className="w-8 h-8 rounded-full border-2 border-background"
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                collaborator.status === "online" ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{onlineCount} online</span>
      </div>
    </div>
  )
}
