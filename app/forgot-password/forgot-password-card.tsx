"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Password reset request for:", email);
    setIsLoading(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <Card className="border border-white/10 bg-background/95 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription>
            We just sent a secure link to <span className="font-medium text-slate-100">{email}</span>. Follow the instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Didn't receive anything yet? Double-check your spam folder or try sending the reset email again.
          </p>
          <p>
            Need help? <a href="/support" className="font-medium text-primary hover:text-primary/80">Contact support</a>
            {" "}for direct assistance.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="w-full"
            asChild
          >
            <Link href="/login" className="inline-flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </Button>
          <Button
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-white hover:from-primary/90 hover:to-primary"
            onClick={() => setIsSubmitted(false)}
          >
            Resend email
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border border-white/10 bg-background/95 shadow-lg">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Forgot your password?</CardTitle>
        <CardDescription>
          Enter the email associated with your CodeJoin account and we'll send you a secure link to create a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-white shadow-md transition hover:from-primary/90 hover:to-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending reset link
              </span>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80">
            Go back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default ForgotPasswordCard;
