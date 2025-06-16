"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import UserDropdown from "@/components/user-dropdown";

export default function AuthButtons() {
  const isLoggedIn = useAuthStatus();

  return (
    <div className="flex items-center gap-4">
      {isLoggedIn ? (
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
