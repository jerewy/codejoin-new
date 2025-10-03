"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { LoginGithub } from "@/components/login-github";
import { LoginGoogle } from "@/components/login-google";
import { getSupabaseClient } from "@/lib/supabaseClient"; // adjust the path if needed
import { DEFAULT_AVATAR } from "@/lib/constants";
import { useRouter } from "next/navigation";

export default function SignupCard() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();
  const supabase = getSupabaseClient();
  const authUnavailable = !supabase;

  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (!isPasswordValid()) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    if (!supabase) {
      setError(
        "Authentication is currently unavailable. Please configure Supabase environment variables."
      );
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Check if the profile already exists
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingProfile) {
        setError("This email is already registered. Try logging in instead.");
        setIsLoading(false);
        return;
      }

      if (profileError) {
        setError("Error checking email. Please try again.");
        setIsLoading(false);
        return;
      }

      // Proceed with signup
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            user_avatar: DEFAULT_AVATAR,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user?.id) {
        localStorage.setItem("pendingEmail", formData.email);
        router.push("/verify-email");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate password in real-time
    if (name === "password") {
      validatePassword(value);
    }
  };

  const validatePassword = (password: string) => {
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  };

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(Boolean);
  };

  const ValidationItem = ({
    isValid,
    text,
  }: {
    isValid: boolean;
    text: string;
  }) => (
    <div className="flex items-center gap-2 text-sm">
      {isValid ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <X className="h-3 w-3 text-red-500" />
      )}
      <span className={isValid ? "text-green-600" : "text-red-600"}>
        {text}
      </span>
    </div>
  );

  return (
    <Card className="border border-white/10 bg-background/95 shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold">Create account</CardTitle>
        <CardDescription>Sign up with email or your preferred provider.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <LoginGithub />
          <LoginGoogle />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="rounded-full bg-background px-3 py-1 text-muted-foreground">
              Or sign up with email
            </span>
          </div>
        </div>

        {/* Show error if any */}
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Alex Johnson"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Password Requirements */}
            {formData.password && (
              <div className="space-y-2 rounded-lg border border-white/10 bg-muted/30 p-4 text-sm">
                <p className="font-medium text-slate-200">Password requirements</p>
                <ValidationItem
                  isValid={passwordValidation.minLength}
                  text="At least 8 characters"
                />
                <ValidationItem
                  isValid={passwordValidation.hasUppercase}
                  text="One uppercase letter"
                />
                <ValidationItem
                  isValid={passwordValidation.hasLowercase}
                  text="One lowercase letter"
                />
                <ValidationItem
                  isValid={passwordValidation.hasNumber}
                  text="One number"
                />
                <ValidationItem
                  isValid={passwordValidation.hasSpecialChar}
                  text="One special character"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {formData.confirmPassword &&
              formData.password !== formData.confirmPassword && (
                <p className="text-sm text-red-500">Passwords don't match</p>
              )}
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-white shadow-md transition hover:from-primary/90 hover:to-primary"
            disabled={
              isLoading ||
              authUnavailable ||
              !isPasswordValid() ||
              formData.password !== formData.confirmPassword
            }
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary transition hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
