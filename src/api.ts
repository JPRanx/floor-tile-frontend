import type { CommandReceipt, InputPreview, PlanningContext, SourceHub, Workspace } from "./contracts";
import { supabase } from "./lib/supabase";

export class SessionExpiredError extends Error {
  constructor() {
    super("Tu sesión expiró. Inicia sesión nuevamente.");
    this.name = "SessionExpiredError";
  }
}

async function json(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function message(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "operator_message" in detail) {
      const operatorMessage = (detail as { operator_message: unknown }).operator_message;
      if (typeof operatorMessage === "string") return operatorMessage;
    }
  }
  return fallback;
}

function endpoint(path: string): string {
  const base = import.meta.env.VITE_API_URL;
  if (!base) throw new Error("VITE_API_URL no está configurada.");
  return `${base.replace(/\/$/, "")}${path}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new SessionExpiredError();
  return { Authorization: `Bearer ${accessToken}` };
}

async function expireSession(): Promise<never> {
  try { await supabase.auth.signOut(); } catch { /* Redirect even if local cleanup fails. */ }
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  throw new SessionExpiredError();
}

async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = { ...(await authHeaders()), ...(init.headers as Record<string, string> | undefined) };
  const response = await fetch(endpoint(path), { ...init, headers });
  if (response.status === 401) return expireSession();
  return response;
}

/** Retained as a compatibility seam; it performs no network request or token caching. */
export async function openSession(): Promise<void> {
  await authHeaders();
}

export async function getWorkspace(
  focusOrContext?: string | PlanningContext,
  productionAnchorSailingId?: string,
  factoryOrderDate?: string,
): Promise<Workspace> {
  const params = new URLSearchParams();
  if (typeof focusOrContext === "object") {
    params.set("plan_id", focusOrContext.plan_id);
    params.set("production_anchor_sailing_id", focusOrContext.production_anchor_sailing_id);
    params.set("factory_order_date", focusOrContext.factory_order_date);
  } else {
    if (focusOrContext) params.set("focus_sailing_id", focusOrContext);
    if (productionAnchorSailingId) params.set("production_anchor_sailing_id", productionAnchorSailingId);
    if (factoryOrderDate) params.set("factory_order_date", factoryOrderDate);
  }
  const query = params.size ? `?${params.toString()}` : "";
  const response = await authenticatedFetch(`/api/workspace${query}`);
  const body = await json(response);
  if (!response.ok) throw new Error(message(body, `No fue posible cargar la planeación (${response.status}).`));
  return body as Workspace;
}

export async function getSources(): Promise<SourceHub> {
  const response = await authenticatedFetch("/api/sources");
  const body = await json(response);
  if (!response.ok) throw new Error(message(body, `No fue posible cargar las fuentes (${response.status}).`));
  return body as SourceHub;
}

function idempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function runCommand(command: string, params: Record<string, unknown>, expectedHead: number): Promise<CommandReceipt> {
  let response: Response;
  try {
    response = await authenticatedFetch("/api/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Expected-Head": String(expectedHead),
        "Idempotency-Key": idempotencyKey(),
      },
      body: JSON.stringify({ command, params }),
    });
  } catch (error) {
    if (error instanceof SessionExpiredError) throw error;
    throw new Error("No pudimos confirmar si la acción terminó. No repitas la acción; actualiza la vista para reconciliar el estado.");
  }
  const body = await json(response);
  if (!response.ok) throw new Error(message(body, "No pudimos completar la acción."));
  return body as CommandReceipt;
}

async function postPreview(payload: Record<string, unknown>): Promise<InputPreview> {
  const response = await authenticatedFetch("/api/input/preview", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const body = await json(response);
  if (!response.ok) throw new Error(message(body, "No pudimos leer esa actualización."));
  return body as InputPreview;
}

export async function previewRows(feed: string, rows: Array<Record<string, unknown>>, asOf: string): Promise<InputPreview> {
  return postPreview({ feed, input_mode: "direct", rows, as_of: asOf });
}

export async function previewFile(feed: string, file: File, asOf: string): Promise<InputPreview> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return postPreview({ feed, input_mode: "upload", as_of: asOf, file_name: file.name, file_content_b64: btoa(binary) });
}

export async function applyPreview(applyToken: string): Promise<void> {
  const response = await authenticatedFetch("/api/input/apply", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apply_token: applyToken }),
  });
  const body = await json(response);
  if (!response.ok) throw new Error(message(body, "No pudimos aplicar la actualización."));
}
