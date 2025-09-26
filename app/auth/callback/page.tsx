"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        router.push("/");
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.push("/dashboard"); // ✅ redirect after confirm/login
      } else {
        router.push("/login"); // ❌ not authenticated
      }
    };

    checkSession();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex justify-center items-center">
      <p className="text-muted-foreground text-sm">Verifying your account...</p>
    </div>
  );
}
