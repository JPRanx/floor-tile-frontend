import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../state/authStore";

export function SetPassword() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const init = useAuthStore((s) => s.init);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initialized) void init();
  }, [initialized, init]);

  // If no session and we've finished initializing, the invite link is bad/expired
  const noSession = initialized && !session;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate("/", { replace: true });
  };

  const inputStyle = {
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-bg-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: "var(--color-text-primary)" }}
          >
            cm tarragona
          </h1>
          <p
            className="text-xs mt-2 tracking-widest uppercase"
            style={{ color: "var(--color-text-muted)" }}
          >
            crear contraseña
          </p>
        </div>

        {noSession ? (
          <div
            className="p-6 text-sm text-center"
            style={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-subtle)",
              backgroundColor: "var(--color-bg-surface)",
              color: "var(--color-text-secondary)",
            }}
          >
            Tu invitación expiró o ya fue usada. Pídele al administrador que te
            envíe una nueva.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block text-xs mb-2 tracking-wide uppercase"
                style={{ color: "var(--color-text-muted)" }}
              >
                Contraseña
              </label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                className="block text-xs mb-2 tracking-wide uppercase"
                style={{ color: "var(--color-text-muted)" }}
              >
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full min-h-[44px] px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !initialized}
              className="w-full min-h-[44px] text-white text-sm font-medium px-4 py-3 cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-accent)",
              }}
            >
              {submitting ? "Guardando..." : "Crear contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
