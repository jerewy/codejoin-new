import type React from "react";

import { AuthPageLayout } from "@/components/auth-page-layout";

import { ResetPasswordCard } from "./reset-password-card";

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <AuthPageLayout
      eyebrow="Secure your account"
      badge="Recovery flow"
      title="Set a fresh password and continue building"
      description="Update your credentials in just a few clicks. We'll sign out sessions on other devices and keep your project secrets protected."
      highlights={[
        {
          title: "Session cleanup",
          description: "Active sessions are revoked instantly so only you retain access to your workspaces.",
        },
        {
          title: "Multi-factor ready",
          description: "Re-enable MFA and recovery codes from the dashboard once your new password is in place.",
        },
        {
          title: "Strong defaults",
          description: "We enforce modern password policies and monitor suspicious login activity for you.",
        },
        {
          title: "Guided assistance",
          description: "Step-by-step instructions help you complete the reset without losing progress.",
        },
      ]}
    >
      <ResetPasswordCard />
    </AuthPageLayout>
  );
}
