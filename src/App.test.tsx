import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "./contracts";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  setSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({ supabase: { auth } }));

import App from "./App";
import { useAuthStore } from "./state/authStore";

const userSession = { access_token: "user-access-token", user: { email: "operator@example.com" } };
const workspace: Workspace = {
  workspace_schema_version: 2,
  demo_banner: "REVISIÓN LOCAL · NO ES VERDAD ACTUAL",
  sailing_rail: [
    { sailing_id: "S1", name: "SEABOARD GALAXI", departure: "2026-08-30", timing_state: "normal", decision: "use" },
    { sailing_id: "S2", name: "SEABOARD PIONEER 2", departure: "2026-09-13", timing_state: "normal", decision: "available" },
  ],
  evidence_readiness: [{ source: "warehouse", status: "ready", as_of: "2026-08-03" }],
  attention: [],
  plan: { plan_id: "P1", totals: { total_m2: "201.60", total_pallets: "1.50", containers: 1 }, rows: [] },
  progression: { production_need: [] },
};

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv("VITE_API_URL", "https://api.example.test");
  window.history.replaceState({}, "", "/");
  useAuthStore.setState({ session: null, initialized: false, passwordEstablishmentAllowed: false, error: null });
  for (const mock of Object.values(auth)) mock.mockReset();
  auth.getSession.mockResolvedValue({ data: { session: userSession }, error: null });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.signInWithPassword.mockImplementation(async () => {
    // Supabase persists a successful login before resolving, so the API's
    // required per-request getSession() sees the newly current token.
    auth.getSession.mockResolvedValue({ data: { session: userSession }, error: null });
    return { data: { session: userSession }, error: null };
  });
  auth.updateUser.mockResolvedValue({ data: { user: userSession.user }, error: null });
  auth.signOut.mockResolvedValue({ error: null });
  auth.setSession.mockResolvedValue({ data: { session: userSession }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ data: { session: userSession }, error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
});

function stubWorkspace() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/workspace")) return new Response(JSON.stringify(workspace), { status: 200 });
    if (url.endsWith("/api/sources")) return new Response(JSON.stringify({ sources: [] }), { status: 200 });
    if (url.endsWith("/api/assistant/chat") && init?.method === "POST") return new Response(JSON.stringify({
      answer: "La cantidad usa velocidad histórica, inventario y buffer.",
      grounded_head_seq: 12,
      grounding_as_of: "2026-09-15",
      mutated: false,
    }), { status: 200 });
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("authentication routes", () => {
  it("keeps /login public while authentication initializes", () => {
    auth.getSession.mockReturnValue(new Promise(() => undefined));
    window.history.replaceState({}, "", "/login");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  });

  it("does not expose /set-password while callback authority is unresolved", () => {
    auth.getSession.mockReturnValue(new Promise(() => undefined));
    window.history.replaceState({}, "", "/set-password");
    render(<App />);
    expect(screen.getByText("Comprobando sesión…")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Establecer contraseña" })).toBeNull();
  });

  it("waits for auth initialization before rendering Composer and redirects an unauthenticated user", async () => {
    let finish!: (value: unknown) => void;
    auth.getSession.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    stubWorkspace();
    render(<App />);

    expect(screen.getByText("Comprobando sesión…")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Planeación de pedidos" })).toBeNull();
    finish({ data: { session: null }, error: null });

    await screen.findByRole("heading", { name: "Iniciar sesión" });
    expect(window.location.pathname).toBe("/login");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("protects unknown routes too", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    window.history.replaceState({}, "", "/not-public");
    render(<App />);
    await screen.findByRole("heading", { name: "Iniciar sesión" });
    expect(window.location.pathname).toBe("/login");
  });

  it("logs in without exposing signup UI or calling signup", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    window.history.replaceState({}, "", "/login");
    stubWorkspace();
    render(<App />);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "operator@example.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secret-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "operator@example.com",
      password: "secret-password",
    }));
    expect(screen.queryByText(/crear cuenta|registrarse/i)).toBeNull();
    await screen.findByRole("heading", { name: "Planeación de pedidos" });
    expect(window.location.pathname).toBe("/");
  });

  it("offers password establishment from the private login without exposing signup", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    window.history.replaceState({}, "", "/login");
    render(<App />);

    expect(screen.getByRole("button", { name: "Establecer contraseña" })).toBeTruthy();
    expect(screen.queryByText(/crear cuenta|registrarse/i)).toBeNull();
  });

  it("requests password establishment with the exact typed PKCE recovery redirect", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    window.history.replaceState({}, "", "/login");
    render(<App />);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: " operator@example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Establecer contraseña" }));

    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "operator@example.com",
      { redirectTo: `${window.location.origin}/?type=recovery` },
    ));
  });

  it("rejects implicit bearer tokens in callback URLs", async () => {
    window.history.replaceState({}, "", "/#access_token=callback-token&refresh_token=callback-refresh&type=recovery");
    render(<App />);

    await screen.findByRole("heading", { name: "Iniciar sesión" });
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("preserves the PKCE verifier while exchanging a recovery callback and grants one password establishment", async () => {
    window.history.replaceState({}, "", "/?code=pkce-code&type=recovery");
    render(<App />);

    await screen.findByRole("heading", { name: "Establecer contraseña" });
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");

    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "new-secret-password" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "new-secret-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-secret-password" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
  });

  it("does not expose password establishment to an ordinary persisted session", async () => {
    window.history.replaceState({}, "", "/set-password");
    stubWorkspace();
    render(<App />);

    await screen.findByRole("heading", { name: "Planeación de pedidos" });
    expect(screen.queryByRole("heading", { name: "Establecer contraseña" })).toBeNull();
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/");
  });

  it("does not consume an untyped authorization code as an invite or recovery callback", async () => {
    window.history.replaceState({}, "", "/?code=untyped-code");
    stubWorkspace();
    render(<App />);

    await screen.findByRole("heading", { name: "Planeación de pedidos" });
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("does not consume an invite callback because it has no browser-local PKCE verifier", async () => {
    window.history.replaceState({}, "", "/?code=admin-invite-code&type=invite");
    stubWorkspace();
    render(<App />);

    await screen.findByRole("heading", { name: "Planeación de pedidos" });
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Establecer contraseña" })).toBeNull();
  });
});

describe("protected Composer shell", () => {
  it("renders the accepted server workspace with a per-request Supabase bearer token", async () => {
    const fetchMock = stubWorkspace();
    render(<App />);

    await screen.findByRole("heading", { name: "Planeación de pedidos" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/workspace", {
      headers: { Authorization: "Bearer user-access-token" },
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/session"))).toBe(false);
  });

  it("lets Ashley ask a grounded question without changing the planning workspace", async () => {
    const fetchMock = stubWorkspace();
    render(<App />);
    await screen.findByRole("heading", { name: "Planeación de pedidos" });

    fireEvent.click(screen.getByRole("button", { name: "Consultar al asistente" }));
    fireEvent.change(screen.getByLabelText("Pregunta para el asistente"), {
      target: { value: "¿Por qué recomienda esta cantidad?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pregunta" }));

    expect(await screen.findByText("La cantidad usa velocidad histórica, inventario y buffer.")).toBeTruthy();
    expect(screen.getByText("Base: 2026-09-15 · revisión 12")).toBeTruthy();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/api/assistant/chat"));
    expect(call?.[1]).toMatchObject({
      method: "POST",
      headers: { Authorization: "Bearer user-access-token", "Content-Type": "application/json" },
    });
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      question: "¿Por qué recomienda esta cantidad?",
      plan_id: "P1",
    });
    expect(screen.getByRole("heading", { name: "Planeación de pedidos" })).toBeTruthy();
  });

  it("signs out from the protected shell", async () => {
    stubWorkspace();
    render(<App />);
    await screen.findByRole("heading", { name: "Planeación de pedidos" });

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    await screen.findByRole("heading", { name: "Iniciar sesión" });
    expect(window.location.pathname).toBe("/login");
  });
});
