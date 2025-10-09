// hooks/useAuthStatus.ts
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function useAuthStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    const initializeAuth = async () => {
      try {
        const client = getSupabaseClient();

        if (!client) {
          if (isSubscribed) {
            setIsLoggedIn(false);
            setIsInitialized(true);
          }
          return;
        }

        // Get initial session
        const { data, error } = await client.auth.getSession();

        if (isSubscribed) {
          if (error) {
            console.error("Error getting auth session:", error);
            setIsLoggedIn(false);
          } else {
            setIsLoggedIn(!!data.session);
          }
          setIsInitialized(true);
        }

        // Set up auth state listener
        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
          if (isSubscribed) {
            setIsLoggedIn(!!session);
          }
        });

        return () => {
          listener?.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth status:", error);
        if (isSubscribed) {
          setIsLoggedIn(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return { isLoggedIn, isInitialized };
}
