import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../state/authStore";

export function SetPassword() {
  const navigate = useNavigate();
  const setPassword = useAuthStore((state) => state.setPassword);
  const storeError = useAuthStore((state) => state.error);
  const [password, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setLocalError("Las contraseñas no coinciden.");
      return;
    }
    setLocalError(null);
    setBusy(true);
    try {
      await setPassword(password);
      navigate("/", { replace: true });
    } catch {
      // The store exposes the provider-safe error in the form.
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-card" aria-labelledby="password-title">
      <div className="brandmark">FT</div>
      <p className="auth-kicker">Cuenta invitada</p>
      <h1 id="password-title">Establecer contraseña</h1>
      <p className="auth-copy">Define una contraseña para completar el acceso privado.</p>
      {(localError || storeError) && <p className="auth-error" role="alert">{localError || storeError}</p>}
      <form onSubmit={submit} className="auth-form">
        <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setNextPassword(event.target.value)} /></label>
        <label>Confirmar contraseña<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
      </form>
    </section>
  </main>;
}
