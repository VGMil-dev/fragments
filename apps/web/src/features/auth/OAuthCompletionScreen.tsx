import { useEffect, useState } from "react";

type CompletionState = "checking" | "session_error" | "unavailable" | "student_unconfirmed" | "github_unlinked" | "invalid_identity" | "wrong_role";

export function OAuthCompletionScreen({ navigate }: { navigate: (path: string) => void }) {
  const [state, setState] = useState<CompletionState>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState("checking");
    void (async () => {
      try {
        const sessionResponse = await fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" });
        if (!sessionResponse.ok) { if (active) setState("unavailable"); return; }
        const session = await sessionResponse.json() as { user?: { role?: unknown; isTeacher?: unknown } };
        if (!active) return;
        if (!session.user) { setState("session_error"); return; }
        const roles = typeof session.user.role === "string" ? session.user.role.split(",") : [];
        if (session.user.isTeacher === true || roles.includes("admin")) {
          navigate("/teacher/mentor-control");
          return;
        }

        const meResponse = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
        if (!active) return;
        if (!meResponse.ok) { setState("unavailable"); return; }
        const me = await meResponse.json() as { data?: { authenticated?: unknown; reason?: unknown } };
        if (me.data?.authenticated === true) navigate("/student/gallery");
        else if (me.data?.authenticated === false) {
          const reason = me.data.reason;
          setState(reason === "github_account_not_linked" ? "github_unlinked"
            : reason === "invalid_github_identity" ? "invalid_identity"
              : reason === "role_not_student" ? "wrong_role"
                : reason === "session_required" ? "session_error" : "student_unconfirmed");
        }
        else setState("unavailable");
      } catch {
        if (active) setState("unavailable");
      }
    })();
    return () => { active = false; };
  }, [navigate, attempt]);

  const messages: Record<CompletionState, string> = {
    checking: "Comprobando la cuenta de GitHub…",
    session_error: "No encontramos una sesión activa. Vuelve a iniciar sesión con GitHub.",
    unavailable: "No pudimos comprobar tu acceso en este momento.",
    student_unconfirmed: "La sesión existe, pero Fragments no pudo confirmar una cuenta estudiantil de GitHub vinculada. No necesitas correo institucional. Si ya usas otra cuenta de Fragments, entra con el método que ya tienes; no unimos cuentas solo por coincidencia de correo.",
    github_unlinked: "Esta sesión de Fragments no tiene una cuenta GitHub vinculada. Entra con el método que ya usas; si necesitas asociar identidades, solicita una revisión segura. No unimos cuentas solo por coincidencia de correo.",
    invalid_identity: "No pudimos validar la identidad estable de GitHub. Intenta de nuevo; si persiste, solicita ayuda.",
    wrong_role: "Esta cuenta no tiene acceso de estudiante. Si eres docente, entra desde el área docente.",
  };
  const message = messages[state];

  return <main className="identity-screen" aria-labelledby="oauth-completion-title">
    <section className="identity-card" aria-live="polite">
      <h1 id="oauth-completion-title">Acceso con GitHub</h1>
      <p role={state === "checking" ? "status" : "alert"}>{message}</p>
      {state === "unavailable" ? <button className="button button--primary" type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button> : null}
      {state !== "checking" && state !== "unavailable" ? <button className="button button--primary" type="button" onClick={() => navigate("/student/login")}>Volver al acceso</button> : null}
    </section>
  </main>;
}
