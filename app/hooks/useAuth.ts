"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "../lib/supabase-browser";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabaseBrowser().auth.signOut();
  };

  return { user, loading, logout };
}
