// hooks/useAuthStatus.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAuthStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return isLoggedIn;
}
