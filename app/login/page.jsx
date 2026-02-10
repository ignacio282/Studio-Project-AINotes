"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data?.session) {
        router.replace("/home");
      }
    };
    checkSession();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message || "Unable to sign in.");
      setLoading(false);
      return;
    }
    router.replace("/home");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-[var(--color-page)] px-6 py-10 text-[var(--color-text-main)]">
      <div className="rounded-2xl bg-[var(--color-surface)] p-6">
        <div className="text-xl font-semibold" style={{ fontFamily: "var(--font-h2)" }}>
          Tester Login
        </div>
        <div className="mt-2 text-sm text-[var(--color-secondary)]">
          Use the email and password provided by the team.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-[var(--color-secondary)]">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/25%] bg-white/80 px-4 py-2 text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-text-accent)]"
              required
            />
          </label>
          <label className="block text-sm text-[var(--color-secondary)]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/25%] bg-white/80 px-4 py-2 text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-text-accent)]"
              required
            />
          </label>

          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-[var(--color-accent)] px-4 py-3 text-sm font-medium text-[var(--color-text-on-accent)]"
            disabled={loading}
            style={{ fontFamily: "var(--font-title)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
