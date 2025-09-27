import { LogoMark } from "@/components/LogoMark";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  description?: string;
  showSkeleton?: boolean;
  className?: string;
}

export function LoadingScreen({
  message = "Setting things up…",
  description = "We’re preparing your project workspace and syncing the latest data.",
  showSkeleton = true,
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-background px-6",
        className
      )}
      aria-label={message}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-[ping_1.8s_ease-in-out_infinite] rounded-full bg-primary/20" />
            <LogoMark className="h-12 w-12 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">{message}</p>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        {showSkeleton ? (
          <div className="w-full space-y-3">
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-4 shadow-sm">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
