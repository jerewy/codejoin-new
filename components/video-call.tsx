"use client"

interface VideoCallProps {
  collaborators: Array<{
    id: number
    name: string
    avatar: string
    status: string
  }>
  isCameraOn: boolean
  isMicOn: boolean
}

export default function VideoCall({ collaborators, isCameraOn, isMicOn }: VideoCallProps) {
  const onlineCollaborators = collaborators.filter((c) => c.status === "online")

  return (
    <div className="h-full bg-zinc-900 p-2">
      <div className="grid grid-cols-2 gap-2 h-full">
        {/* Your video */}
        <div className="relative bg-zinc-800 rounded-lg overflow-hidden">
          {isCameraOn ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <div className="text-white text-2xl font-bold">You</div>
            </div>
          ) : (
            <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
              <div className="text-zinc-400 text-sm">Camera Off</div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${isMicOn ? "bg-green-500" : "bg-red-500"}`}
            >
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 text-white text-xs bg-black/50 px-1 rounded">You</div>
        </div>

        {/* Other participants */}
        {onlineCollaborators.slice(0, 3).map((collaborator, index) => (
          <div key={collaborator.id} className="relative bg-zinc-800 rounded-lg overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
              <img
                src={collaborator.avatar || "/placeholder.svg"}
                alt={collaborator.name}
                className="w-12 h-12 rounded-full"
              />
            </div>
            <div className="absolute bottom-2 left-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 text-white text-xs bg-black/50 px-1 rounded">
              {collaborator.name.split(" ")[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
