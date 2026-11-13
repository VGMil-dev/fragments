import { useEffect, useState } from "react";
import { BrandMark } from "../../components/brand/BrandMark";
import { createApiClient } from "../../lib/api/api-client";
import { createStudentApi } from "../../lib/api/student-api";
import "./identity-screen.css";

const api = createStudentApi(createApiClient());

export function StudentLoginScreen({ navigate }: { navigate: (path: string) => void }) {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "account_not_linked") {
      setMessage("Esta cuenta coincide con una cuenta existente que no tiene GitHub vinculado. Si eres docente, entra con tus credenciales y vincula GitHub desde Cuenta y acceso.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api.getMe().then((result) => {
      if (!active) return;
      if (result.ok) {
        if (result.data.authenticated) navigate("/student/gallery");
        else setConfigured(result.data.githubOAuthConfigured);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

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
      {!loading && !configured ? <p role="status">El acceso con GitHub estará disponible cuando se configure la aplicación OAuth.</p> : null}
      {message ? <p role="alert">{message}</p> : null}
      <p className="identity-card__privacy">Fragments solicita acceso básico a tu perfil y correo de GitHub. No solicita acceso a tus repositorios.</p>
      <a href="/teacher/mentor-control" onClick={(event) => { event.preventDefault(); navigate("/teacher/mentor-control"); }}>¿Eres docente? Accede aquí</a>
    </section>
  </main>;
}
