"use client";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export const LoginGithub = () => {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: "http://localhost:3000/dashboard",
      },
    });
  };

  return (
    <Button onClick={handleLogin} variant="outline" className="w-full">
      <Github className="mr-2 h-4 w-4" />
      GitHub
    </Button>
  );
};
