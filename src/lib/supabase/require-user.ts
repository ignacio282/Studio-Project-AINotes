import { getServerSupabase } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { supabase, user: null };
  }
  return { supabase, user: data.user };
}
