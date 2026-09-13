import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function configuredClient(): SupabaseClient {
  if (client) return client;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase Auth requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  client = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, flowType: "pkce" },
  });
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const value = Reflect.get(configuredClient(), property);
    return typeof value === "function" ? value.bind(configuredClient()) : value;
  },
});
