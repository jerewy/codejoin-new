"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MailCheck, RefreshCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const saved = localStorage.getItem("pendingEmail");
    if (saved) setEmail(saved);
  }, []);

  const resendConfirmationEmail = async () => {
    if (!email) return;
    if (!supabase) {
      toast({
        title: "Authentication unavailable",
        description:
          "Supabase is not configured. Please set the environment variables to resend verification emails.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      toast({
        title: "Resend failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Confirmation email sent",
        description: "Check your inbox to verify your account.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted">
      <Card className="w-full max-w-md shadow-lg p-6">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <MailCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-primary">
            Verify Your Email
          </CardTitle>
          <CardDescription>
            Check your inbox to activate your account
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            We’ve sent a confirmation link to your email address.
            <br />
            Please click it to complete your sign-up.
          </p>
          <p className="text-muted-foreground text-xs">
            Didn’t get the email? Try checking your spam folder or request a new
            one.
          </p>
          <Button
            onClick={resendConfirmationEmail}
            disabled={isResending || !supabase}
            variant="secondary"
            className="w-full flex gap-2 justify-center"
          >
            {isResending && <RefreshCcw className="h-4 w-4 animate-spin" />}
            {isResending ? "Resending..." : "Resend Email"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
