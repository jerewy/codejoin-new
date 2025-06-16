import type React from "react";
import Link from "next/link";
import SignupCard from "./signup-card";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
                fill="#FF5722"
              />
              <path
                d="M14 10L18 14M18 10L14 14"
                stroke="#0D47A1"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M14 18L18 22M18 18L14 22"
                stroke="#0D47A1"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-2xl font-bold text-primary">CodeJoin</span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground">
            Join thousands of developers coding together
          </p>
        </div>

        <SignupCard />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
