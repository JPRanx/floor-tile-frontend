import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../state/authStore";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const location = useLocation();

  if (!initialized) {
    return <main className="loading-shell"><div className="brandmark">FT</div><p>Comprobando sesión…</p></main>;
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
