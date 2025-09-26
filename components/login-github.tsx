"use client";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export const LoginGithub = () => {
  const supabase = getSupabaseClient();
  const handleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "github",
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
      <Github className="mr-2 h-4 w-4" />
      GitHub
    </Button>
  );
};
