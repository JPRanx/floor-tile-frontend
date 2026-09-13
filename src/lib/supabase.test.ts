import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({ auth: {} })));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { supabase } from "./supabase";

describe("Supabase browser client", () => {
  beforeEach(() => {
    createClient.mockClear();
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  });

  it("uses PKCE for browser-initiated password recovery", () => {
    void supabase.auth;

    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-key",
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
          persistSession: true,
        },
      },
    );
  });
});