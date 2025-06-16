"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.push("/dashboard"); // ✅ redirect after confirm/login
      } else {
        router.push("/login"); // ❌ not authenticated
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex justify-center items-center">
      <p className="text-muted-foreground text-sm">Verifying your account...</p>
    </div>
  );
}
