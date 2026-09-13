import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({ supabase: { auth } }));

import { getWorkspace, runCommand, SessionExpiredError } from "./api";

const context = {
  plan_id: "PLAN-7",
  production_anchor_sailing_id: "SAIL-ANCHOR",
  factory_order_date: "2026-09-11",
};

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv("VITE_API_URL", "https://api.example.test/");
  auth.getSession.mockReset();
  auth.signOut.mockReset().mockResolvedValue({ error: null });
  window.history.replaceState({}, "", "/");
});

function session(token: string) {
  return { data: { session: { access_token: token } }, error: null };
}

describe("authenticated API transport", () => {
  it("gets the current Supabase access token for every request and uses VITE_API_URL", async () => {
    auth.getSession
      .mockResolvedValueOnce(session("fresh-token-1"))
      .mockResolvedValueOnce(session("fresh-token-2"));
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ workspace_schema_version: 2 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await getWorkspace();
    await getWorkspace(context);

    expect(auth.getSession).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.example.test/api/workspace", {
      headers: { Authorization: "Bearer fresh-token-1" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/workspace?plan_id=PLAN-7&production_anchor_sailing_id=SAIL-ANCHOR&factory_order_date=2026-09-11",
      { headers: { Authorization: "Bearer fresh-token-2" } },
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/session"))).toBe(false);
  });

  it("preserves command body, expected head, and UUIDv4 idempotency headers", async () => {
    auth.getSession.mockResolvedValue(session("current-token"));
    const receipt = { ok: true, result: { production_order_id: "PO-9" }, workspace_schema_version: 2, head_seq: 42, workspace: {} };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(receipt), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(runCommand("OpenProductionOrder", {
      plan_id: "PLAN-7",
      candidate_fingerprint: "a".repeat(64),
    }, 41)).resolves.toEqual(receipt);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/command");
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(init?.body))).toEqual({
      command: "OpenProductionOrder",
      params: { plan_id: "PLAN-7", candidate_fingerprint: "a".repeat(64) },
    });
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer current-token",
      "Content-Type": "application/json",
      "X-Expected-Head": "41",
      "Idempotency-Key": expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
    });
  });

  it("signs out, redirects, and raises session-expired on a 401 without retrying the mutation", async () => {
    auth.getSession.mockResolvedValue(session("expired-token"));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ detail: "expired" }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(runCommand("FinalizeSailingPlan", { plan_id: "PLAN-7" }, 40))
      .rejects.toBeInstanceOf(SessionExpiredError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/login");
  });

  it("surfaces backend copy and marks ambiguous network completion without retrying", async () => {
    auth.getSession.mockResolvedValue(session("current-token"));
    const backendFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ detail: { operator_message: "El estado cambió. Actualiza la vista antes de continuar." } }), { status: 409 }));
    vi.stubGlobal("fetch", backendFetch);
    await expect(runCommand("FinalizeSailingPlan", { plan_id: "PLAN-7" }, 40)).rejects.toThrow("El estado cambió. Actualiza la vista antes de continuar.");

    const ambiguousFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", ambiguousFetch);
    await expect(runCommand("FinalizeSailingPlan", { plan_id: "PLAN-7" }, 40)).rejects.toThrow(/No repitas la acción.*actualiza/i);
    expect(ambiguousFetch).toHaveBeenCalledTimes(1);
  });
});
