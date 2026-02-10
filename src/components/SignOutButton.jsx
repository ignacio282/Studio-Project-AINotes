"use client";

import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function SignOutButton({ className }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className}
    >
      Sign out
    </button>
  );
}
