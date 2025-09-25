import type React from "react";

import Link from "next/link";

import { AuthPageLayout } from "@/components/auth-page-layout";

import SignupCard from "./signup-card";

export default function RegisterPage() {
  return (
    <AuthPageLayout
      eyebrow="Create your account"
      title="Join CodeJoin"
      description="Set up your workspace credentials to get started."
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
