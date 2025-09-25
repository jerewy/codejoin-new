import type React from "react";

import Link from "next/link";

import { AuthPageLayout } from "@/components/auth-page-layout";

import LoginCard from "./login-card";

export default function LoginPage() {
  return (
    <AuthPageLayout
      eyebrow="Welcome back"
      badge="Collaborative Cloud Workspaces"
      title="Build together in a shared developer environment"
      description="Pick up right where you left off with your team. Instantly spin up secure, collaborative workspaces and push features live faster than ever."
      highlights={[
        {
          title: "Live pair programming",
          description: "Share terminals, editors, and whiteboards in real time without switching tools.",
        },
        {
          title: "Prebuilt templates",
          description: "Start projects from 90+ curated stacks configured for your favorite frameworks.",
        },
        {
          title: "Team spaces",
          description: "Organize work with role-based access and instant project invites for collaborators.",
        },
        {
          title: "Secure by default",
          description: "Enterprise-grade authentication, audit logs, and encrypted secrets out of the box.",
        },
      ]}
      footer={
        <>
          By signing in, you agree to our{" "}
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
      <LoginCard />
    </AuthPageLayout>
  );
}
