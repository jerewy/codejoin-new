import type React from "react";

import Link from "next/link";

import { AuthPageLayout } from "@/components/auth-page-layout";

import SignupCard from "./signup-card";

export default function RegisterPage() {
  return (
    <AuthPageLayout
      eyebrow="Create your account"
      badge="Designed for high-performing teams"
      title="Launch collaborative coding sessions in seconds"
      description="Bring your entire product team together. CodeJoin orchestrates reproducible environments, real-time collaboration, and intelligent tooling so you can ship with confidence."
      highlights={[
        {
          title: "Smart onboarding",
          description: "Invite teammates with magic links and automatically provision the right permissions.",
        },
        {
          title: "AI copilots",
          description: "Automate code reviews and documentation with built-in assistants tailored to your stack.",
        },
        {
          title: "Launch-ready infrastructure",
          description: "Preview deployments, run tests in the cloud, and sync with your Git provider instantly.",
        },
        {
          title: "Global reach",
          description: "Latency-optimized regions keep collaboration fast for distributed teams across the world.",
        },
      ]}
      footer={
        <>
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="font-medium text-slate-100 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-slate-100 hover:underline">
            Privacy Policy
          </Link>
        </>
      }
    >
      <SignupCard />
    </AuthPageLayout>
  );
}
