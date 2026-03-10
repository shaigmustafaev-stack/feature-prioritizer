"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "../lib/supabase-browser";

// Минимальный тип — не импортируем весь @supabase/supabase-js
type AuthUser = { id: string; email?: string | null };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();

    // onAuthStateChange fires INITIAL_SESSION on mount — handles initial state
    // and all subsequent changes without a separate getUser() call
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
