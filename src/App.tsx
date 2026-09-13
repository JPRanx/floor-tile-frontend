import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Composer } from "./Composer";
import { getSources, getWorkspace, runCommand } from "./api";
import { ProtectedRoute } from "./components/ProtectedRoute";
import type { PlanningContext, SourceHub, Workspace } from "./contracts";
import { Login } from "./pages/Login";
import { SetPassword } from "./pages/SetPassword";
import { useAuthStore } from "./state/authStore";

function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void initialize();
  }, [initialize]);
  return null;
}

function PasswordEstablishmentRoute() {
  const initialized = useAuthStore((state) => state.initialized);
  const allowed = useAuthStore((state) => state.passwordEstablishmentAllowed);
  const session = useAuthStore((state) => state.session);
  if (!initialized) return <main className="loading-shell"><p>Comprobando sesión…</p></main>;
  if (!allowed) return <Navigate to={session ? "/" : "/login"} replace />;
  return <SetPassword />;
}

function ComposerApp() {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sourceHub, setSourceHub] = useState<SourceHub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [planningContext, setPlanningContext] = useState<PlanningContext | null>(null);

  const load = useCallback(async (focusSailingId?: string) => {
    setBusy(true);
    setError(null);
    try {
      const [nextWorkspace, nextSources] = await Promise.all([getWorkspace(focusSailingId), getSources()]);
      setWorkspace(nextWorkspace); setSourceHub(nextSources);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  }, []);

  const calculate = useCallback(async ({ focusSailingId, productionAnchorSailingId, factoryOrderDate }: {
    focusSailingId: string; productionAnchorSailingId: string; factoryOrderDate: string;
  }) => {
    setBusy(true); setError(null);
    try {
      const nextWorkspace = await getWorkspace(focusSailingId, productionAnchorSailingId, factoryOrderDate);
      const serverPlanning = nextWorkspace.factory_planning;
      const serverPlanId = serverPlanning?.plan_id ?? nextWorkspace.plan?.plan_id;
      if (!serverPlanning || !serverPlanId) throw new Error("El servidor no devolvió un contexto de planeación completo.");
      setPlanningContext({
        plan_id: serverPlanId,
        production_anchor_sailing_id: serverPlanning.production_anchor_sailing_id,
        factory_order_date: serverPlanning.factory_order_date,
      });
      setWorkspace(nextWorkspace);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message); throw caught;
    } finally { setBusy(false); }
  }, []);

  const orderAction = useCallback(async (command: string, params: Record<string, unknown>) => {
    if (!workspace || workspace.head_seq === undefined || !planningContext) {
      throw new Error("Actualiza la planeación antes de continuar.");
    }
    setBusy(true); setError(null);
    try {
      await runCommand(command, params, workspace.head_seq);
      const authoritative = await getWorkspace(planningContext);
      setWorkspace(authoritative);
    } catch (caught) {
      const nextError = caught instanceof Error ? caught.message : String(caught);
      setError(nextError);
      throw caught;
    } finally { setBusy(false); }
  }, [planningContext, workspace]);

  useEffect(() => { void load(); }, [load]);

  async function leave() {
    try { await signOut(); } finally { navigate("/login", { replace: true }); }
  }

  if (!workspace) return <main className="loading-shell">
    <div className="brandmark">FT</div>
    {error ? <p role="alert">{error}</p> : <p>Cargando planeación…</p>}
  </main>;

  return <div className="app-shell">
    <div className="truth-banner">
      <span>{workspace.demo_banner}</span>
      <span className="session-actions">{busy ? "Actualizando contexto…" : "Contexto del servidor listo"}<button type="button" onClick={() => void leave()}>Cerrar sesión</button></span>
    </div>
    {error && <div className="error-bar" role="alert">{error}</div>}
    <Composer
      workspace={workspace}
      sourceHub={sourceHub ?? { sources: [] }}
      onFocusChange={(id) => { setPlanningContext(null); void load(id); }}
      onCalculate={calculate}
      onSourcesApplied={() => { setPlanningContext(null); void load(); }}
      onOrderAction={orderAction}
      onResolve={async (command, params) => {
        if (workspace.head_seq === undefined) throw new Error("Actualiza la vista antes de continuar.");
        await runCommand(command, params, workspace.head_seq);
        await load();
      }}
    />
  </div>;
}

export default function App() {
  return <BrowserRouter>
    <AuthInitializer />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<PasswordEstablishmentRoute />} />
      <Route path="*" element={<ProtectedRoute><ComposerApp /></ProtectedRoute>} />
    </Routes>
  </BrowserRouter>;
}
