interface TestimonialProps {
  quote: string
  author: string
  role: string
}

export default function Testimonial({ quote, author, role }: TestimonialProps) {
  return (
    <div className="flex flex-col space-y-4 border rounded-lg p-6 bg-background">
      <div className="flex-1">
        <p className="text-muted-foreground italic">"{quote}"</p>
      </div>
      <div>
        <p className="font-semibold">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
  )
}
