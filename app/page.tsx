import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code, Users, Zap, Video, Github } from "lucide-react"
import FeatureCard from "@/components/feature-card"
import CodeDemo from "@/components/code-demo"
import Testimonial from "@/components/testimonial"
import PricingCard from "@/components/pricing-card"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2"
              >
                <path
                  d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
                  fill="#FF5722"
                />
                <path d="M14 10L18 14M18 10L14 14" stroke="#0D47A1" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 18L18 22M18 18L14 22" stroke="#0D47A1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-xl font-bold text-primary">CodeJoin</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth">
              Pricing
            </Link>
            <Link href="#testimonials" className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth">
              Testimonials
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up Free</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-background to-muted/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Now in Public Beta
                  </Badge>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Code Together in Real-Time
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    CodeJoin is a collaborative coding platform that lets developers code together, preview results
                    instantly, and get AI-powered suggestions.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/signup">
                    <Button size="lg" className="gap-1.5">
                      Start Coding <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#demo">
                    <Button size="lg" variant="outline">
                      See Demo
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Github className="h-4 w-4" />
                  <span>Over 2,000+ developers already using CodeJoin</span>
                </div>
              </div>
              <div className="mx-auto lg:mx-0 rounded-lg border bg-background shadow-lg p-1">
                <CodeDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Everything You Need to Code Collaboratively
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  CodeJoin combines the best tools for real-time collaboration, live previews, and AI assistance.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <FeatureCard
                icon={<Code className="h-10 w-10 text-primary" />}
                title="Real-Time Collaboration"
                description="Code together with your team in real-time, just like Google Docs for coding."
              />
              <FeatureCard
                icon={<Zap className="h-10 w-10 text-primary" />}
                title="Live Preview"
                description="See your HTML, CSS, and JavaScript changes instantly with our live preview feature."
              />
              <FeatureCard
                icon={<Users className="h-10 w-10 text-primary" />}
                title="AI-Powered Suggestions"
                description="Get intelligent code suggestions, autocomplete, and error fixes powered by AI."
              />
              <FeatureCard
                icon={<Video className="h-10 w-10 text-primary" />}
                title="Integrated Video Calls"
                description="Pair program effectively with built-in chat and video calling capabilities."
              />
              <FeatureCard
                icon={<Github className="h-10 w-10 text-primary" />}
                title="GitHub Integration"
                description="Connect your repositories and collaborate on real projects with ease."
              />
              <FeatureCard
                icon={<ArrowRight className="h-10 w-10 text-primary" />}
                title="Multiple Language Support"
                description="Support for JavaScript, TypeScript, Python, Ruby, and many more languages."
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 md:py-20 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">How It Works</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Start Collaborating in Minutes</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform is designed to be intuitive and easy to use, so you can focus on coding.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 mt-12">
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-background">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  1
                </div>
                <h3 className="text-xl font-bold">Create a Document</h3>
                <p className="text-center text-muted-foreground">
                  Sign up and create a new coding document in seconds.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-background">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  2
                </div>
                <h3 className="text-xl font-bold">Invite Collaborators</h3>
                <p className="text-center text-muted-foreground">
                  Share a link with your team members to start coding together.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-background">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  3
                </div>
                <h3 className="text-xl font-bold">Code & Preview</h3>
                <p className="text-center text-muted-foreground">
                  Write code together and see changes in real-time with live preview.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Pricing</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Simple, Transparent Pricing</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Choose the plan that's right for you or your team.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-8">
              <PricingCard
                title="Free"
                price="$0"
                description="Perfect for individuals and small projects."
                features={[
                  "Up to 3 documents",
                  "2 collaborators per document",
                  "Basic AI suggestions",
                  "7-day history",
                ]}
                buttonText="Get Started"
                buttonVariant="outline"
              />
              <PricingCard
                title="Pro"
                price="$12"
                period="per month"
                description="Ideal for professionals and small teams."
                features={[
                  "Unlimited documents",
                  "10 collaborators per document",
                  "Advanced AI suggestions",
                  "30-day history",
                  "Video calls",
                ]}
                buttonText="Subscribe Now"
                buttonVariant="default"
                highlighted={true}
              />
              <PricingCard
                title="Team"
                price="$49"
                period="per month"
                description="Best for larger teams and organizations."
                features={[
                  "Unlimited documents",
                  "Unlimited collaborators",
                  "Premium AI suggestions",
                  "Unlimited history",
                  "Video calls",
                  "Admin controls",
                  "Priority support",
                ]}
                buttonText="Contact Sales"
                buttonVariant="outline"
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-16 md:py-20 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Testimonials</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Loved by Developers</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  See what our users have to say about CodeJoin.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <Testimonial
                quote="CodeJoin has completely transformed how our remote team collaborates on code. The real-time editing and AI suggestions have boosted our productivity by at least 30%."
                author="Sarah Chen"
                role="Lead Developer at TechFlow"
              />
              <Testimonial
                quote="Teaching coding has never been easier. I can watch my students code in real-time and provide immediate feedback. The live preview feature is a game-changer for learning."
                author="Michael Rodriguez"
                role="Computer Science Professor"
              />
              <Testimonial
                quote="The AI suggestions are surprisingly accurate and have helped me learn better coding practices. It's like having a senior developer looking over your shoulder."
                author="Jamie Wilson"
                role="Junior Developer"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Ready to Start Coding Together?</h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                  Join thousands of developers who are already using CodeJoin to collaborate more effectively.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="gap-1.5">
                    Sign Up Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 CodeJoin. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Privacy
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
