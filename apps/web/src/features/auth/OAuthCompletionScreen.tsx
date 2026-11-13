import { useEffect, useState } from "react";

export function OAuthCompletionScreen({ navigate }: { navigate: (path: string) => void }) {
  const [message, setMessage] = useState("Comprobando la cuenta de GitHub…");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const sessionResponse = await fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" });
        const session = await sessionResponse.json() as { user?: { role?: unknown; isTeacher?: unknown } };
        if (!active) return;
        if (!sessionResponse.ok || !session.user) {
          setMessage("No pudimos validar la sesión. Vuelve a iniciar sesión.");
          return;
        }
        const roles = typeof session.user.role === "string" ? session.user.role.split(",") : [];
        if (session.user.isTeacher === true || roles.includes("admin")) {
          navigate("/teacher/mentor-control");
          return;
        }

        const meResponse = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
        const me = await meResponse.json() as { data?: { authenticated?: unknown } };
        if (!active) return;
        if (meResponse.ok && me.data?.authenticated === true) navigate("/student/gallery");
        else setMessage("Esta cuenta no tiene un perfil estudiantil GitHub habilitado en Fragments.");
      } catch {
        if (active) setMessage("No pudimos validar la sesión. Vuelve a iniciar sesión.");
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  return <main className="identity-screen" aria-live="polite"><section className="identity-card"><h1>Acceso con GitHub</h1><p>{message}</p></section></main>;
}
