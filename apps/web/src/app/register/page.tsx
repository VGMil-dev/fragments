"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { AuthOrb } from "@/components/auth-orb";
import { AmbientParticles } from "@/components/ambient-particles";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (signUpError) {
      setError(signUpError.message || "Error al registrarse");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const inputGroupClass =
    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-shadow bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] focus-within:shadow-[inset_0_0_0_1px_rgba(217,70,239,0.25)]";

  const fields = [
    {
      id: "name",
      label: "Nombre",
      type: "text",
      placeholder: "Tu nombre",
      value: name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      Icon: User,
    },
    {
      id: "email",
      label: "Correo",
      type: "email",
      placeholder: "tu@correo.com",
      value: email,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      Icon: Mail,
    },
    {
      id: "password",
      label: "Contraseña",
      type: "password",
      placeholder: "Mínimo 8 caracteres",
      value: password,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      Icon: Lock,
    },
  ] as const;

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden"
      style={{ background: "var(--base)" }}
    >
      {/* Ambient grid overlay */}
      <div className="ambient-grid absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />
      <AmbientParticles />

      {/* Star dots */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "radial-gradient(1px 1px at 22% 32%, rgba(255,255,255,0.20), transparent 50%)",
            "radial-gradient(1px 1px at 76% 54%, rgba(217,70,239,0.28), transparent 50%)",
            "radial-gradient(1px 1px at 42% 82%, rgba(255,255,255,0.12), transparent 50%)",
            "radial-gradient(1px 1px at 88% 16%, rgba(255,255,255,0.16), transparent 50%)",
            "radial-gradient(1px 1px at 12% 68%, rgba(217,70,239,0.20), transparent 50%)",
            "radial-gradient(1px 1px at 58% 10%, rgba(255,255,255,0.10), transparent 50%)",
          ].join(","),
        }}
      />

      <div className="relative z-10 w-full max-w-[440px] flex flex-col gap-8">
        {/* Brand header */}
        <div className="flex items-center gap-3 justify-center">
          <AuthOrb size={40} />
          <div>
            <div className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
              Fragments
            </div>
            <div
              className="text-[10px] uppercase tracking-[0.16em]"
              style={{ fontFamily: "var(--font-geist-mono), monospace", color: "var(--mute)" }}
            >
              Curador digital
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="bento p-8 flex flex-col gap-6">
          {/* Heading */}
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] font-semibold tracking-tight leading-tight" style={{ color: "var(--ink)" }}>
              Crear cuenta
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--mute)" }}>
              Tu camino de aprendizaje comienza aquí
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-2xl text-[13px]"
              style={{
                background: "rgba(251,113,133,0.08)",
                color: "var(--error)",
                boxShadow: "inset 0 0 0 1px rgba(251,113,133,0.2)",
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {fields.map(({ id, label, type, placeholder, value, onChange, Icon }) => (
              <div key={id} className="flex flex-col gap-1.5">
                <label
                  htmlFor={id}
                  className="text-[11px] uppercase tracking-[0.14em]"
                  style={{ fontFamily: "var(--font-geist-mono), monospace", color: "var(--mute2)" }}
                >
                  {label}
                </label>
                <div className={inputGroupClass}>
                  <Icon size={16} strokeWidth={1.75} style={{ color: "var(--mute2)", flexShrink: 0 }} />
                  <input
                    id={id}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required
                    className="bg-transparent flex-1 text-sm outline-none"
                    style={{ color: "var(--ink)" }}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.96] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: "linear-gradient(180deg, #E05BF5 0%, #B33CDA 100%)",
                boxShadow: "0 10px 24px -10px rgba(217,70,239,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Crear cuenta
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-[13px]" style={{ color: "var(--mute)" }}>
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium transition-colors hover:text-[var(--magic)]"
              style={{ color: "var(--ink)" }}
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
