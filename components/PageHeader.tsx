import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/LogoMark";

interface PageHeaderProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  startContent?: React.ReactNode;
  trailing?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  hideLogo?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  leading,
  startContent,
  trailing,
  actions,
  children,
  hideLogo = false,
  className,
}: PageHeaderProps) {
  const showSecondaryRow = Boolean(title || description || actions || children);

  return (
    <header
      className={cn(
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {leading}
          {!hideLogo && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-primary"
            >
              <LogoMark />
              <span className="text-xl font-bold text-primary">CodeJoin</span>
            </Link>
          )}
          {startContent}
        </div>
        <div
          className={cn(
            "flex items-center gap-2",
            !trailing && "min-h-[1.5rem]"
          )}
        >
          {trailing}
        </div>
      </div>
      {showSecondaryRow && (
        <div className="border-t">
          <div className="container py-6 mx-auto text-center">
            <div
              className={cn(
                "flex flex-col gap-4",
                actions && "md:flex-row md:items-center md:justify-between"
              )}
            >
              <div className="space-y-1">
                {typeof title === "string" ? (
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                  </h1>
                ) : (
                  title
                )}
                {typeof description === "string" ? (
                  <p className="text-muted-foreground">{description}</p>
                ) : (
                  description
                )}
              </div>
              {actions}
            </div>
            {children ? <div className="mt-6">{children}</div> : null}
          </div>
        </div>
      )}
    </header>
  );
}
