import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Add them to .env.local",
    );
  }

  if (serviceClient) return serviceClient;

  serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return serviceClient;
}

