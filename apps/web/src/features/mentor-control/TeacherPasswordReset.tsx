import { useEffect, useState, type FormEvent } from "react";
import "./mentor-control.css";

const REQUEST_MESSAGE = "Si la dirección corresponde a una cuenta, enviaremos un enlace de recuperación cuando el correo esté disponible.";
const REQUEST_LIMIT_MESSAGE = "Demasiadas solicitudes. Espera un minuto antes de intentarlo de nuevo.";
const INVALID_LINK_MESSAGE = "El enlace venció o ya fue utilizado. Solicita uno nuevo.";

export function TeacherPasswordReset({ navigate }: { navigate: (path: string) => void }) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token"));
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/teacher/reset-password` }),
      });
      setMessage(response.status === 429 ? REQUEST_LIMIT_MESSAGE : REQUEST_MESSAGE);
    } catch {
      setMessage(REQUEST_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!token) { setMessage(INVALID_LINK_MESSAGE); return; }
    const form = new FormData(formElement);
    const password = String(form.get("new-password") ?? "");
    const confirmation = String(form.get("confirm-password") ?? "");
    if (password !== confirmation) { setMessage("Las contraseñas no coinciden."); return; }
    if (password.length < 12) { setMessage("La contraseña debe tener al menos 12 caracteres."); return; }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (response.ok) {
        setComplete(true);
        formElement.reset();
        setMessage("Contraseña actualizada. Las sesiones anteriores se cerraron.");
      } else setMessage(INVALID_LINK_MESSAGE);
    } catch {
      setMessage("No pudimos completar el cambio. Solicita un enlace nuevo e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="mentor-control" aria-labelledby="password-reset-title">
    <a href="/teacher/mentor-control" onClick={(event) => { event.preventDefault(); navigate("/teacher/mentor-control"); }}>← Volver al acceso docente</a>
    <p className="mentor-control__eyebrow">FRAGMENTS · ACCESO DOCENTE</p>
    <h1 id="password-reset-title">{token ? "Establece una contraseña nueva" : "Recupera tu contraseña"}</h1>
    {!token ? <>
      <p>Te enviaremos un enlace si la dirección corresponde a una cuenta.</p>
      <form onSubmit={(event) => void requestReset(event)} className="mentor-control__login">
        <label>Correo<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" maxLength={254} required /></label>
        <button className="button button--primary" disabled={busy}>{busy ? "Solicitando…" : "Enviar enlace"}</button>
      </form>
    </> : complete ? <p role="status">{message}</p> : <>
      <p>Elige una contraseña de al menos 12 caracteres. El enlace solo se puede usar una vez.</p>
      <form onSubmit={(event) => void resetPassword(event)} className="mentor-control__login">
        <label>Nueva contraseña<input type="password" name="new-password" autoComplete="new-password" minLength={12} maxLength={1024} required /></label>
        <label>Repite la contraseña<input type="password" name="confirm-password" autoComplete="new-password" minLength={12} maxLength={1024} required /></label>
        <button className="button button--primary" disabled={busy}>{busy ? "Actualizando…" : "Establecer contraseña"}</button>
      </form>
    </>}
    {message && !complete ? <p role="status">{message}</p> : null}
    {complete ? <a href="/teacher/mentor-control" onClick={(event) => { event.preventDefault(); navigate("/teacher/mentor-control"); }}>Iniciar sesión</a> : null}
  </main>;
}
