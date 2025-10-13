"use client";

import { useEffect, useState } from "react";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

// Helper function to validate URLs
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function UserDropdown() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfileAvatar = async () => {
      if (!supabase) {
        if (isMounted) {
          setAvatarUrl(null);
        }
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (isMounted) {
            setAvatarUrl(null);
          }
          return;
        }

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("user_avatar")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Failed to load profile avatar", profileError);
        }

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        const metadataAvatar = [
          metadata.avatar_url,
          metadata.avatarUrl,
          metadata.picture,
        ].find(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        ) ?? null;

        if (isMounted) {
          const avatar = profileRow?.user_avatar ?? metadataAvatar ?? null;
          // Validate avatar URL to prevent malformed URLs
          if (avatar && avatar.trim() && (avatar.startsWith('/') || isValidUrl(avatar))) {
            setAvatarUrl(avatar);
          } else {
            setAvatarUrl(null);
          }
        }
      } catch (error) {
        console.error("Unexpected error loading avatar", error);
        if (isMounted) {
          setAvatarUrl(null);
        }
      }
    };

    loadProfileAvatar();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.refresh(); // This triggers revalidation and rerenders layout
      router.push("/");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Image
            src={avatarUrl && avatarUrl.trim() ? avatarUrl : "/user.svg"}
            alt="Profile"
            width={24}
            height={24}
            className="rounded-full"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Link href="/settings">
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
