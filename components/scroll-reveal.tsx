"use client"

import type { HTMLAttributes, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

type ScrollDirection = "up" | "down" | "left" | "right"

interface ScrollRevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  delay?: number
  direction?: ScrollDirection
  distance?: number
  once?: boolean
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 24,
  once = true,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    if (mediaQuery.matches) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (once) {
              observer.unobserve(entry.target)
            }
          } else if (!once) {
            setIsVisible(false)
          }
        })
      },
      {
        threshold: 0.2,
      },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [once])

  const transforms: Record<ScrollDirection, string> = {
    up: `translate3d(0, ${distance}px, 0)`,
    down: `translate3d(0, -${distance}px, 0)`,
    left: `translate3d(-${distance}px, 0, 0)`,
    right: `translate3d(${distance}px, 0, 0)`,
  }

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform", 
        className,
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate3d(0, 0, 0)" : transforms[direction],
        transitionDelay: `${delay}ms`,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
