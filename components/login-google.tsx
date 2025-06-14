"use client";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export const LoginGoogle = () => {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <Button onClick={handleLogin} variant="outline" className="w-full">
      <Mail className="mr-2 h-4 w-4" />
      Google
    </Button>
  );
};
