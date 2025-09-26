"use client";

// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (typeof window === "undefined") {
    cachedClient = null;
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    cachedClient = null;
    return null;
  }

  cachedClient = createBrowserClient(url, anonKey);
  return cachedClient;
}
