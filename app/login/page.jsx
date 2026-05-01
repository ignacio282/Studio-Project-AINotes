"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/errors/user-facing";

function getSafeNextPath(value) {
  if (typeof value !== "string") return "/home";
  if (!value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}

function readNextPath() {
  if (typeof window === "undefined") return "/home";
  const params = new URLSearchParams(window.location.search);
  return getSafeNextPath(params.get("next"));
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("/home");

  useEffect(() => {
    let active = true;
    setNextPath(readNextPath());
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data?.session) {
        router.replace(readNextPath());
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
      setError(getFriendlyErrorMessage(signInError, "Unable to sign in. Check the email and password and try again."));
      setLoading(false);
      return;
    }
    router.replace(nextPath);
  };

  return (
    <main className="flex min-h-screen justify-center bg-[var(--color-accent)] px-6 py-10 text-[var(--color-text-on-accent)]">
      <section className="flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col">
        <div className="mb-12 flex justify-center">
          <Image
            src="/scriba-logo-white.svg"
            alt="Scriba"
            width={136}
            height={142}
            priority
            className="h-32 w-auto"
          />
        </div>

        <div>
          <h1 className="type-h1 text-[var(--color-text-on-accent)]">Sign in</h1>
          <p className="type-body mt-2 max-w-xs text-[rgba(255,255,255,0.78)]">
            Use your Scriba email and password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-1 flex-col">
          <div className="space-y-4">
            <label className="type-body block text-[rgba(255,255,255,0.82)]">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="type-body mt-2 h-[54px] w-full rounded-lg bg-[rgba(250,249,245,0.94)] px-4 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)] transition focus:bg-[var(--rc-color-page)] focus:ring-2 focus:ring-[rgba(250,249,245,0.42)]"
                autoComplete="email"
                required
              />
            </label>
            <label className="type-body block text-[rgba(255,255,255,0.82)]">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="type-body mt-2 h-[54px] w-full rounded-lg bg-[rgba(250,249,245,0.94)] px-4 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)] transition focus:bg-[var(--rc-color-page)] focus:ring-2 focus:ring-[rgba(250,249,245,0.42)]"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <div className="type-body rounded-lg bg-[rgba(250,249,245,0.92)] px-4 py-3 text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            className="type-button mt-auto h-12 w-full rounded-lg bg-[var(--rc-color-page)] px-4 text-[var(--color-text-accent)] transition hover:bg-[rgba(250,249,245,0.92)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
