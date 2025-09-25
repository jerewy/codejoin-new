import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

export default function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-background/70 p-8 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex flex-col gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-medium text-primary/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Learn more →
        </span>
      </div>
    </div>
  )
}
