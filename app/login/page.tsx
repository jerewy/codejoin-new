import type React from "react";

import Link from "next/link";

import { AuthPageLayout } from "@/components/auth-page-layout";

import LoginCard from "./login-card";

export default function LoginPage() {
  return (
    <AuthPageLayout
      eyebrow="Welcome back"
      title="Sign in to CodeJoin"
      description="Use your email or a connected provider to continue."
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
