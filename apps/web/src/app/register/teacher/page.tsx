"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Ticket, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AuthOrb } from "@/components/auth-orb";
import { AmbientParticles } from "@/components/ambient-particles";

export default function TeacherRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Registering teacher to:", process.env.NEXT_PUBLIC_API_URL);
      // 1. Signup via custom endpoint (handles golden ticket and role)
      const signupRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sign-up/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, ticket }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        throw new Error(signupData.message || "Error al registrarse como docente");
      }

      // 2. Sign in via authClient to establish the session cookie in browser
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message || "Error al iniciar sesión tras el registro");
      }

      // Success
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Registration error details:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const inputGroupClass =
    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-shadow bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] focus-within:shadow-[inset_0_0_0_1px_rgba(217,70,239,0.25)]";

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[var(--base)]">
      <AmbientParticles />
      <div className="relative z-10 w-full max-w-[440px] flex flex-col gap-8">
        <div className="flex items-center gap-3 justify-center">
          <AuthOrb size={40} />
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-white">Fragments</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Portal Docente</div>
          </div>
        </div>

        <div className="bento p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Registro de Docente</h1>
            <p className="text-sm text-white/40">Crea tu espacio de enseñanza</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl text-[13px] bg-red-400/10 text-red-400 border border-red-400/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-white/30">Nombre</label>
              <div className={inputGroupClass}>
                <User size={16} className="text-white/30" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="bg-transparent flex-1 text-sm outline-none text-white" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-white/30">Correo</label>
              <div className={inputGroupClass}>
                <Mail size={16} className="text-white/30" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-transparent flex-1 text-sm outline-none text-white" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-white/30">Contraseña</label>
              <div className={inputGroupClass}>
                <Lock size={16} className="text-white/30" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-transparent flex-1 text-sm outline-none text-white" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[#E05BF5]">Código de Acceso (Golden Ticket)</label>
              <div className={inputGroupClass}>
                <Ticket size={16} className="text-[#E05BF5]/50" />
                <input type="text" value={ticket} onChange={e => setTicket(e.target.value)} required placeholder="Introduce el ticket..." className="bg-transparent flex-1 text-sm outline-none text-white" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.96] disabled:opacity-60 disabled:cursor-not-allowed mt-2 bg-gradient-to-tr from-[#E05BF5] to-[#B33CDA]">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Registrarse como Docente <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-[13px] text-white/40">
            ¿No eres docente? <Link href="/register" className="text-white hover:text-[#E05BF5] transition-colors">Volver al registro normal</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
