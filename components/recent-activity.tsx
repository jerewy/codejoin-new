"use client";

import { Activity } from "@/lib/types";

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-3">
          <img
            src={activity.user_avatar || "/placeholder.svg"}
            alt={activity.user_name}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">
              {activity.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(activity.timestamp).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
