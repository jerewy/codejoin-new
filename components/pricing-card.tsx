import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

interface PricingCardProps {
  title: string
  price: string
  period?: string
  description: string
  features: string[]
  buttonText: string
  buttonVariant: "default" | "outline"
  highlighted?: boolean
}

export default function PricingCard({
  title,
  price,
  period,
  description,
  features,
  buttonText,
  buttonVariant,
  highlighted = false,
}: PricingCardProps) {
  return (
    <div
      className={`flex flex-col space-y-4 border rounded-lg p-6 ${highlighted ? "border-primary shadow-lg bg-primary/5" : "bg-background"}`}
    >
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-3xl font-bold">{price}</span>
          {period && <span className="ml-1 text-sm text-muted-foreground">{period}</span>}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center">
            <Check className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href="/signup" className="w-full">
        <Button variant={buttonVariant} className="w-full">
          {buttonText}
        </Button>
      </Link>
    </div>
  )
}
