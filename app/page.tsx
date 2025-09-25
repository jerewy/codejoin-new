import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Code,
  Users,
  Zap,
  Video,
  Github,
  PlayCircle,
  Sparkles,
  ShieldCheck,
  Globe,
} from "lucide-react";
import FeatureCard from "@/components/feature-card";
import CodeDemo from "@/components/code-demo";
import Testimonial from "@/components/testimonial";
import PricingCard from "@/components/pricing-card";
import { Badge } from "@/components/ui/badge";
import AuthButtons from "@/components/auth-buttons";

export default function LandingPage() {
  const heroStats = [
    { value: "8k+", label: "Live coding sessions every day" },
    { value: "120k", label: "Lines synchronized each minute" },
    { value: "4.9/5", label: "Average team satisfaction" },
    { value: "60+", label: "Languages & frameworks supported" },
  ];

  const heroHighlights = [
    {
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      text: "AI pair programmer included",
    },
    {
      icon: <ShieldCheck className="h-4 w-4 text-primary" />,
      text: "Enterprise-grade encryption",
    },
    {
      icon: <Globe className="h-4 w-4 text-primary" />,
      text: "Works right in the browser",
    },
  ];

  const howItWorksSteps = [
    {
      title: "Create a workspace",
      description: "Sign up and launch a new collaborative environment in seconds.",
    },
    {
      title: "Invite collaborators",
      description: "Share a secure link with teammates, clients, or students instantly.",
    },
    {
      title: "Code, preview & ship",
      description: "Build together with synced editors, live previews, and AI assistance.",
    },
  ];

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
                <path
                  d="M14 10L18 14M18 10L14 14"
                  stroke="#0D47A1"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M14 18L18 22M18 18L14 22"
                  stroke="#0D47A1"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-xl font-bold text-primary">CodeJoin</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth"
            >
              Pricing
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium hover:underline underline-offset-4 scroll-smooth"
            >
              Testimonials
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <AuthButtons />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/40" />
          <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-blob" />
          <div className="pointer-events-none absolute right-0 top-40 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl animate-blob-delayed" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,87,34,0.18),_transparent_60%)]" />
          <div className="container relative px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16 xl:grid-cols-[1fr_560px]">
              <div className="flex flex-col justify-center space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant="outline"
                    className="animate-float border-primary/30 bg-primary/10 text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Now in Public Beta
                    </span>
                  </Badge>
                  <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground shadow-sm">
                    Collaboration reimagined
                  </span>
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-5xl xl:text-6xl/none">
                    Ship better code together in real-time.
                  </h1>
                  <p className="max-w-[620px] text-base text-muted-foreground md:text-lg">
                    Build alongside your team with synchronized editors, contextual chat, and instant previews. CodeJoin keeps
                    every participant in flow with AI pair programming and buttery smooth collaboration.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
                  <Link href="/dashboard" className="w-full min-[420px]:w-auto">
                    <Button size="lg" className="w-full gap-1.5">
                      Start Coding <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#demo" className="w-full min-[420px]:w-auto">
                    <Button size="lg" variant="outline" className="w-full gap-1.5">
                      <PlayCircle className="h-5 w-5" />
                      Watch a demo
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                  {heroHighlights.map((highlight, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 backdrop-blur"
                    >
                      {highlight.icon}
                      <span>{highlight.text}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
                  {heroStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Github className="h-4 w-4" />
                  <span>Over 2,000+ developers already using CodeJoin</span>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[420px] lg:mx-0 xl:max-w-[560px]">
                <div className="absolute -left-10 top-12 hidden h-24 w-24 rounded-3xl border border-primary/40 bg-primary/10 backdrop-blur-sm lg:block animate-blob" />
                <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-primary/30 via-orange-500/20 to-purple-500/20 blur-2xl" />
                <div className="relative rounded-[28px] border border-border/60 bg-background/90 p-2 shadow-2xl backdrop-blur-sm">
                  <CodeDemo />
                </div>
                <div className="animate-float absolute -bottom-12 left-1/2 hidden w-max -translate-x-1/2 translate-y-1/2 items-center gap-3 rounded-full border border-border/70 bg-background/90 px-6 py-3 shadow-lg backdrop-blur lg:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="text-left text-sm leading-tight">
                    <p className="font-semibold text-foreground">Interactive sandbox</p>
                    <p className="text-muted-foreground">Share sessions in a single click</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative py-16 md:py-20">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/40 via-transparent to-background" />
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col items-center text-center">
              <Badge
                variant="secondary"
                className="mb-4 border border-primary/20 bg-primary/5 text-primary"
              >
                Why teams choose CodeJoin
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need to collaborate without friction
              </h2>
              <p className="mt-4 max-w-3xl text-balance text-muted-foreground md:text-lg">
                Spin up pair-programming sessions, sync knowledge, and deliver production-ready code faster with a toolkit that
                brings your workflow into one canvas.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Code className="h-5 w-5" />}
                title="Real-time collaboration"
                description="Invite teammates and co-edit the same file with presence indicators, comments, and roles."
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="Live preview"
                description="Render UI instantly with hot reload so everyone sees changes as they happen."
              />
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="AI-powered suggestions"
                description="Lean on CodeJoin Copilot for autocomplete, refactors, and contextual code reviews."
              />
              <FeatureCard
                icon={<Video className="h-5 w-5" />}
                title="Integrated video calls"
                description="Stay in sync with built-in huddles, whiteboards, and screen handoffs."
              />
              <FeatureCard
                icon={<Github className="h-5 w-5" />}
                title="GitHub-native"
                description="Connect repositories, sync branches, and open PRs without leaving the workspace."
              />
              <FeatureCard
                icon={<ArrowRight className="h-5 w-5" />}
                title="Polyglot support"
                description="Pair program across JavaScript, Python, Go, Rust, and dozens more languages."
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="relative py-16 md:py-20 bg-muted/50">
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col items-center text-center">
              <Badge variant="secondary" className="mb-4 border border-border/70 bg-background/80 text-muted-foreground">
                How it works
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Start collaborating in minutes
              </h2>
              <p className="mt-4 max-w-2xl text-balance text-muted-foreground md:text-lg">
                Launch a workspace, invite your team, and let CodeJoin orchestrate the rest—from synchronized cursors to shared
                previews.
              </p>
            </div>
            <div className="relative mx-auto mt-12 max-w-5xl">
              <div className="pointer-events-none absolute inset-x-10 top-[60px] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {howItWorksSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="group relative overflow-hidden rounded-2xl border bg-background p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase tracking-widest text-primary">
                      0{index + 1}
                    </span>
                    <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-20 translate-x-10 translate-y-10 rounded-full bg-primary/5 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="relative py-16 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,87,34,0.15),_transparent_60%)]" />
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col items-center text-center">
              <Badge variant="secondary" className="mb-4 border border-primary/20 bg-primary/10 text-primary">
                Pricing
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 max-w-2xl text-balance text-muted-foreground md:text-lg">
                Get started for free, then scale with flexible seats and billing that grows with your team.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
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
        <section id="testimonials" className="relative overflow-hidden py-16 md:py-20 bg-muted/50">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(255,87,34,0.12),_transparent_55%)]" />
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col items-center text-center">
              <Badge variant="secondary" className="mb-4 border border-border/70 bg-background/80 text-muted-foreground">
                Testimonials
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Loved by distributed product teams
              </h2>
              <p className="mt-4 max-w-3xl text-balance text-muted-foreground md:text-lg">
                Engineers, educators, and startups rely on CodeJoin to stay aligned, deliver faster, and keep collaboration fun.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        <section className="relative overflow-hidden py-16 md:py-20">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/15 via-transparent to-purple-500/10" />
          <div className="container relative px-4 md:px-6">
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-background/80 p-10 text-center shadow-lg backdrop-blur">
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
                Ready to build together?
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Ready to start coding together?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground md:text-lg">
                Join thousands of developers already pairing in CodeJoin. Spin up a session in seconds and keep your team in the
                same flow state.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 min-[420px]:flex-row">
                <Link href="/signup" className="w-full min-[420px]:w-auto">
                  <Button size="lg" className="w-full gap-1.5">
                    Sign up free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact" className="w-full min-[420px]:w-auto">
                  <Button size="lg" variant="outline" className="w-full">
                    Contact sales
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
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:underline underline-offset-4"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:underline underline-offset-4"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:underline underline-offset-4"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
