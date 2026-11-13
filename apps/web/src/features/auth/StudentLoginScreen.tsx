import { useEffect, useState } from "react";
import { BrandMark } from "../../components/brand/BrandMark";
import { createApiClient } from "../../lib/api/api-client";
import { createStudentApi } from "../../lib/api/student-api";
import "./identity-screen.css";

const api = createStudentApi(createApiClient());

export function StudentLoginScreen({ navigate }: { navigate: (path: string) => void }) {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "account_not_linked") {
      setMessage("Esta cuenta de GitHub coincide con una cuenta Fragments existente y no se vinculará automáticamente por correo. Entra con el método que ya usas. Si necesitas asociar identidades, solicita un proceso de vinculación verificado.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api.getMe().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      setUnavailable(false);
      if (result.ok) {
        if (result.data.authenticated) navigate("/student/gallery");
        else {
          if (result.data.reason === "role_not_student") { navigate("/teacher/mentor-control"); return; }
          setConfigured(result.data.githubOAuthConfigured);
          if (result.data.reason === "github_account_not_linked") {
            setMessage("Esta sesión de Fragments no tiene GitHub vinculado. Usa la cuenta GitHub personal correcta. No unimos cuentas solo por coincidencia de correo.");
          }
        }
      }
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setUnavailable(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [navigate, attempt]);

  async function signIn() {
    setMessage("");
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "github", callbackURL: "/auth/complete", errorCallbackURL: "/student/login" }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { url?: unknown };
      if (typeof payload.url !== "string") throw new Error();
      const target = new URL(payload.url);
      if (target.origin !== "https://github.com" || target.pathname !== "/login/oauth/authorize") throw new Error();
      window.location.assign(target.toString());
    } catch { setMessage("No se pudo iniciar el acceso con GitHub. Inténtalo de nuevo más tarde."); }
  }

  return <main className="identity-screen" aria-labelledby="student-login-title">
    <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }} aria-label="Fragments, inicio"><BrandMark className="brand__icon" /><span className="brand__name">fragments<span className="brand__period">.</span></span></a>
    <section className="identity-card">
      <p className="student-screen__eyebrow">ESPACIO DE ESTUDIANTES</p>
      <h1 id="student-login-title">Continúa con GitHub</h1>
      <p>Usa tu cuenta de GitHub para guardar tus propuestas y consultar proyectos académicos compartidos.</p>
      <button className="button button--primary" type="button" disabled={loading || !configured} onClick={() => void signIn()}>
        {loading ? "Comprobando acceso…" : "Iniciar sesión con GitHub"}
      </button>
      {unavailable ? <div role="alert"><p>No pudimos comprobar tu acceso en este momento.</p><button type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Reintentar</button></div> : null}
      {!loading && !configured && !unavailable ? <p role="status">El acceso con GitHub estará disponible cuando se configure la aplicación OAuth.</p> : null}
      {message ? <p role="alert">{message}</p> : null}
      <p className="identity-card__privacy">Fragments solicita acceso básico a tu perfil y correo de GitHub. No solicita acceso a tus repositorios.</p>
      <a href="/teacher/mentor-control" onClick={(event) => { event.preventDefault(); navigate("/teacher/mentor-control"); }}>¿Eres docente? Accede aquí</a>
    </section>
  </main>;
}
