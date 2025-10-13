"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import UserDropdown from "@/components/user-dropdown";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthButtons() {
  const { isLoggedIn } = useAuthStatus();
  const supabaseClient = useMemo(() => getSupabaseClient(), []);

  return (
    <div className="flex items-center gap-4">
      {isLoggedIn && supabaseClient ? (
        <UserDropdown />
      ) : (
        <>
          <Link href="/login">
            <Button variant="outline">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button>Sign Up Free</Button>
          </Link>
        </>
      )}
    </div>
  );
}
