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
    console.log('DEBUG: getSupabaseClient called server-side, returning null');
    cachedClient = null;
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('DEBUG: Supabase environment variables:', {
    hasUrl: !!url,
    hasAnonKey: !!anonKey,
    urlPrefix: url ? url.substring(0, 20) + '...' : 'null',
    anonKeyPrefix: anonKey ? anonKey.substring(0, 20) + '...' : 'null'
  });

  if (!url || !anonKey) {
    console.error('DEBUG: Missing Supabase environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: !!url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey
    });
    cachedClient = null;
    return null;
  }

  try {
    console.log('DEBUG: Creating Supabase browser client...');
    cachedClient = createBrowserClient(url, anonKey);
    console.log('DEBUG: Supabase client created successfully');
    return cachedClient;
  } catch (error) {
    console.error('DEBUG: Error creating Supabase client:', {
      error: error,
      errorType: typeof error,
      errorString: String(error),
      errorJson: JSON.stringify(error, null, 2)
    });
    cachedClient = null;
    return null;
  }
}
