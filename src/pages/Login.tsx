import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../state/authStore";

export function Login() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const requestPasswordEstablishment = useAuthStore((state) => state.requestPasswordEstablishment);
  const storeError = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryRequested, setRecoveryRequested] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate("/", { replace: true });
    } catch {
      // The store exposes the provider-safe error in the form.
    } finally {
      setBusy(false);
    }
  }

  async function requestPassword() {
    setBusy(true);
    setRecoveryRequested(false);
    try {
      await requestPasswordEstablishment(email.trim());
      setRecoveryRequested(true);
    } catch {
      // The store exposes the provider-safe error in the form.
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-card" aria-labelledby="login-title">
      <div className="brandmark">FT</div>
      <p className="auth-kicker">Acceso privado</p>
      <h1 id="login-title">Iniciar sesión</h1>
      <p className="auth-copy">Ingresa con la cuenta que recibió acceso al espacio de planeación.</p>
      {storeError && <p className="auth-error" role="alert">{storeError}</p>}
      {recoveryRequested && <p role="status">Revisa tu correo para establecer la contraseña.</p>}
      <form onSubmit={submit} className="auth-form">
        <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</button>
        <button type="button" disabled={busy || !email.trim()} onClick={requestPassword}>Establecer contraseña</button>
      </form>
    </section>
  </main>;
}
