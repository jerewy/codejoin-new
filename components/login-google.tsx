"use client";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export const LoginGoogle = () => {
  const supabase = getSupabaseClient();
  const handleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/dashboard",
      },
    });
  };

  return (
    <Button
      onClick={handleLogin}
      variant="outline"
      className="w-full"
      disabled={!supabase}
    >
      <Mail className="mr-2 h-4 w-4" />
      Google
    </Button>
  );
};
