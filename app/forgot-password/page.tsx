import type React from "react";

import { AuthPageLayout } from "@/components/auth-page-layout";

import { ForgotPasswordCard } from "./forgot-password-card";

export default function ForgotPasswordPage(): React.ReactElement {
  return (
    <AuthPageLayout
      eyebrow="Reset access"
      title="Forgot your password?"
      description="Send yourself a reset link and pick a new password."
    >
      <ForgotPasswordCard />
    </AuthPageLayout>
  );
}
