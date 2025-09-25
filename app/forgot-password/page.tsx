import type React from "react";

import { AuthPageLayout } from "@/components/auth-page-layout";

import { ForgotPasswordCard } from "./forgot-password-card";

export default function ForgotPasswordPage(): React.ReactElement {
  return (
    <AuthPageLayout
      eyebrow="Reset your access"
      badge="Account security"
      title="We'll help you get back into your workspace"
      description="Request a secure reset link and regain access to your CodeJoin projects. Your environments and repositories stay exactly as you left them."
      highlights={[
        {
          title: "Secure emails",
          description: "We send one-time recovery links that expire after a short period for enhanced safety.",
        },
        {
          title: "24/7 support",
          description: "Need a hand? Our support engineers are available to help with urgent account issues.",
        },
        {
          title: "No downtime",
          description: "Your running workspaces stay active while you reset your credentials.",
        },
        {
          title: "Granular controls",
          description: "Update passwords, manage MFA, and review sessions right from your dashboard.",
        },
      ]}
    >
      <ForgotPasswordCard />
    </AuthPageLayout>
  );
}
