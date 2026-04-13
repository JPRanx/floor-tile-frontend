import { useEffect, useState } from "react";
import { usersApi, type AppUser } from "../requests/users";
import { useAuthStore } from "../state/authStore";

export function Users() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(data);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al cargar usuarios";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const created = await usersApi.create(email, password);
      setFormSuccess(`Usuario creado: ${created.email}`);
      setEmail("");
      setPassword("");
      await load();
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Error al crear usuario";
      setFormError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: AppUser) => {
    if (user.id === currentUser?.id) return;
    if (!confirm(`¿Eliminar a ${user.email}?`)) return;
    try {
      await usersApi.remove(user.id);
      await load();
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Error al eliminar";
      alert(detail);
    }
  };

  const inputStyle = {
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-bg-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
  };

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--color-bg-base)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1
            className="text-lg font-medium tracking-[0.15em] uppercase"
            style={{ color: "var(--color-text-primary)" }}
          >
            usuarios
          </h1>
          <p
            className="text-xs mt-2 tracking-widest uppercase"
            style={{ color: "var(--color-text-muted)" }}
          >
            gestión de acceso
          </p>
        </div>

        {/* Add user form */}
        <div
          className="p-6 mb-8"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
            backgroundColor: "var(--color-bg-surface)",
          }}
        >
          <h2
            className="text-xs mb-4 tracking-wide uppercase font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Nuevo usuario
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-xs mb-2 tracking-wide uppercase"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-xs mb-2 tracking-wide uppercase"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Contraseña (mín. 8)
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                  style={inputStyle}
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm" style={{ color: "var(--color-error)" }}>
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className="text-sm" style={{ color: "#22c55e" }}>
                {formSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] text-white text-sm font-medium px-6 py-3 cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-accent)",
              }}
            >
              {submitting ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        </div>

        {/* Users list */}
        <div
          className="overflow-hidden"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
            backgroundColor: "var(--color-bg-surface)",
          }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <h2
              className="text-xs tracking-wide uppercase font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {users.length} usuario{users.length === 1 ? "" : "s"}
            </h2>
          </div>

          {loading && (
            <div className="px-6 py-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Cargando...
            </div>
          )}
          {error && (
            <div className="px-6 py-8 text-sm" style={{ color: "var(--color-error)" }}>
              {error}
            </div>
          )}
          {!loading && !error && users.length === 0 && (
            <div className="px-6 py-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
              No hay usuarios registrados
            </div>
          )}
          {!loading &&
            users.map((u) => (
              <div
                key={u.id}
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--color-border-subtle)" }}
              >
                <div>
                  <div className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {u.email}
                    {u.id === currentUser?.id && (
                      <span
                        className="ml-2 text-xs uppercase tracking-wide"
                        style={{ color: "var(--color-accent)" }}
                      >
                        tú
                      </span>
                    )}
                  </div>
                  <div
                    className="text-xs mt-1 tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Última sesión:{" "}
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleString("es-CO")
                      : "nunca"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(u)}
                  disabled={u.id === currentUser?.id}
                  className="text-xs px-3 py-2 cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wide"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-error)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
