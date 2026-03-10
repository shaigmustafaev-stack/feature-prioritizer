"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "login" | "signup";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = supabaseBrowser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(from);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Аккаунт создан. Проверьте почту для подтверждения, затем войдите.");
        setTab("login");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Что-то пошло не так";
      if (msg.includes("Invalid login credentials")) {
        setError("Неверный email или пароль.");
      } else if (msg.includes("User already registered")) {
        setError("Этот email уже зарегистрирован. Войдите.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`,
      },
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <h1 className="mb-6 text-center text-xl font-bold text-foreground">
            {tab === "login" ? "Вход в ProductHub" : "Регистрация"}
          </h1>

          <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setError(null); setInfo(null); }}>
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="login" className="flex-1">Войти</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Зарегистрироваться</TabsTrigger>
            </TabsList>
          </Tabs>

          {info && (
            <p className="mb-4 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-400">
              {info}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Загрузка..." : tab === "login" ? "Войти" : "Создать аккаунт"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
          >
            Продолжить с Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
