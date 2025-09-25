import { cn } from "@/lib/utils"

interface TestimonialProps {
  quote: string
  author: string
  role: string
  className?: string
}

export default function Testimonial({ quote, author, role, className }: TestimonialProps) {
  return (
    <figure
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-background/70 p-8 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <blockquote className="relative flex-1 text-base italic leading-relaxed text-muted-foreground">
        “{quote}”
      </blockquote>
      <figcaption className="relative mt-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/15" />
        <div className="space-y-1">
          <div className="text-sm font-semibold">{author}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
      </figcaption>
    </figure>
  )
}
