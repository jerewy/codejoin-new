// hooks/useAuthStatus.ts
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function useAuthStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();

    if (!client) {
      setIsLoggedIn(false);
      return;
    }

    let isSubscribed = true;

    client.auth.getSession().then(({ data }) => {
      if (isSubscribed) {
        setIsLoggedIn(!!data.session);
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      isSubscribed = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  return isLoggedIn;
}
