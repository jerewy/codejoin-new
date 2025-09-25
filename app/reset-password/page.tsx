import type React from "react";

import { AuthPageLayout } from "@/components/auth-page-layout";

import { ResetPasswordCard } from "./reset-password-card";

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <AuthPageLayout
      eyebrow="Secure your account"
      title="Set a new password"
      description="Choose a strong password to finish the reset."
    >
      <ResetPasswordCard />
    </AuthPageLayout>
  );
}
