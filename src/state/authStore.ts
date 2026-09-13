import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "../lib/supabase";

type AuthState = {
  session: Session | null;
  initialized: boolean;
  passwordEstablishmentAllowed: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  requestPasswordEstablishment: (email: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

function authError(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible completar la autenticación.";
}

function callbackParameters(): URLSearchParams | null {
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (fragment.has("access_token") || fragment.has("refresh_token")) {
    window.history.replaceState({}, "", "/login");
    throw new Error("El enlace para establecer la contraseña no es válido.");
  }
  const type = query.get("type");
  if (type === "recovery" && query.has("code")) return query;
  return null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  initialized: false,
  passwordEstablishmentAllowed: false,
  error: null,

  initialize: async () => {
    set({ initialized: false, passwordEstablishmentAllowed: false, error: null });
    try {
      const callback = callbackParameters();
      let session: Session | null;

      if (callback) {
        // A persisted browser session never authorizes a password callback.
        const code = callback.get("code");
        if (!code) throw new Error("El enlace para establecer la contraseña no es válido.");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        session = data.session;
        window.history.replaceState({}, "", "/set-password");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } else {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        session = data.session;
      }

      set({ session, initialized: true, passwordEstablishmentAllowed: Boolean(callback), error: null });
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        set({ session: nextSession, initialized: true });
      });
    } catch (error) {
      set({ session: null, initialized: true, passwordEstablishmentAllowed: false, error: authError(error) });
    }
  },

  signIn: async (email, password) => {
    set({ error: null, passwordEstablishmentAllowed: false });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      throw error;
    }
    set({ session: data.session, initialized: true });
  },

  requestPasswordEstablishment: async (email) => {
    set({ error: null, passwordEstablishmentAllowed: false });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?type=recovery`,
    });
    if (error) {
      set({ error: error.message });
      throw error;
    }
  },

  setPassword: async (password) => {
    set({ error: null });
    if (!get().passwordEstablishmentAllowed) {
      const error = new Error("El enlace para establecer la contraseña no es válido.");
      set({ error: error.message });
      throw error;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      set({ error: error.message });
      throw error;
    }
    set({ passwordEstablishmentAllowed: false });
  },

  signOut: async () => {
    set({ error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error: error.message });
      throw error;
    }
    set({ session: null, initialized: true, passwordEstablishmentAllowed: false });
  },
}));
