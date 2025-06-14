"use client"

interface RecentActivityProps {
  activities: Array<{
    id: number
    user: string
    action: string
    target: string
    time: string
    avatar: string
  }>
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-3">
          <img src={activity.avatar || "/placeholder.svg"} alt={activity.user} className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{activity.user}</span>{" "}
              <span className="text-muted-foreground">{activity.action}</span>{" "}
              <span className="font-medium">{activity.target}</span>
            </p>
            <p className="text-xs text-muted-foreground">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
