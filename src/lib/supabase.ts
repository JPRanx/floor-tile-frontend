import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment"
  );
}

// If the URL hash carries an invite or recovery token, clear any existing
// Supabase session from localStorage BEFORE createClient runs. This prevents
// the race where the in-tab session briefly swaps between the logged-in
// user and the invitee — which caused password-updates to land on the wrong
// account. Must happen before createClient (detectSessionInUrl is synchronous).
if (typeof window !== "undefined" && window.location.hash) {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const type = params.get("type");
  if (type === "invite" || type === "recovery") {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("sb-") && k.includes("-auth-token")) {
        localStorage.removeItem(k);
      }
    }
  }
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
