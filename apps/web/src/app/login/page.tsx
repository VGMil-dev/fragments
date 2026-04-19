"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { AuthOrb } from "@/components/auth-orb";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({ email, password });

    if (signInError) {
      setError(signInError.message || "Error al iniciar sesión");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const loginWithSocial = async (provider: "google" | "github") => {
    await authClient.signIn.social({
      provider,
      callbackURL: `${window.location.origin}/dashboard`,
    });
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden"
      style={{ background: "var(--base)" }}
    >
      {/* Ambient grid overlay */}
      <div className="ambient-grid absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />

      {/* Star dots — decorative */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "radial-gradient(1px 1px at 18% 28%, rgba(255,255,255,0.22), transparent 50%)",
            "radial-gradient(1px 1px at 72% 58%, rgba(217,70,239,0.30), transparent 50%)",
            "radial-gradient(1px 1px at 44% 78%, rgba(255,255,255,0.14), transparent 50%)",
            "radial-gradient(1px 1px at 86% 18%, rgba(255,255,255,0.18), transparent 50%)",
            "radial-gradient(1px 1px at 9% 72%, rgba(217,70,239,0.22), transparent 50%)",
            "radial-gradient(1px 1px at 56% 12%, rgba(255,255,255,0.10), transparent 50%)",
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
              Bienvenido
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--mute)" }}>
              Ingresa para continuar tu camino
            </p>
          </div>

          {/* Error message */}
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
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[11px] uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-geist-mono), monospace", color: "var(--mute2)" }}
              >
                Correo
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-shadow bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] focus-within:shadow-[inset_0_0_0_1px_rgba(217,70,239,0.25)]">
                <Mail size={16} strokeWidth={1.75} style={{ color: "var(--mute2)", flexShrink: 0 }} />
                <input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-transparent flex-1 text-sm outline-none"
                  style={{ color: "var(--ink)" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[11px] uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-geist-mono), monospace", color: "var(--mute2)" }}
              >
                Contraseña
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-shadow bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] focus-within:shadow-[inset_0_0_0_1px_rgba(217,70,239,0.25)]">
                <Lock size={16} strokeWidth={1.75} style={{ color: "var(--mute2)", flexShrink: 0 }} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-transparent flex-1 text-sm outline-none"
                  style={{ color: "var(--ink)" }}
                />
              </div>
            </div>

            {/* Submit */}
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
                  Iniciar sesión
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span
              className="text-[11px] uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-geist-mono), monospace", color: "var(--mute2)" }}
            >
              o continúa con
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => loginWithSocial("google")}
              className="inline-flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-2xl text-sm font-medium transition-all bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.96] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
              style={{ color: "var(--ink)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>

            <button
              type="button"
              onClick={() => loginWithSocial("github")}
              className="inline-flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-2xl text-sm font-medium transition-all bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.96] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
              style={{ color: "var(--ink)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Continuar con GitHub
            </button>
          </div>

          {/* Footer link */}
          <p className="text-center text-[13px]" style={{ color: "var(--mute)" }}>
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium transition-colors hover:text-[var(--magic)]"
              style={{ color: "var(--ink)" }}
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
