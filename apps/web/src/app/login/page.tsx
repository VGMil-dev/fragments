"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message || "Error al iniciar sesión");
    } else {
      router.push("/dashboard");
    }
  };

  const loginWithSocial = async (provider: "google" | "github") => {
    await authClient.signIn.social({
      provider,
      callbackURL: "http://localhost:3000/dashboard",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-80">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Iniciar sesión
        </button>
      </form>
      <div className="flex flex-col gap-2 w-80">
        <button
          onClick={() => loginWithSocial("google")}
          className="bg-red-500 text-white p-2 rounded"
        >
          Login con Google
        </button>
        <button
          onClick={() => loginWithSocial("github")}
          className="bg-gray-800 text-white p-2 rounded"
        >
          Login con GitHub
        </button>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <Link href="/register" className="text-blue-500 underline">
        No tienes cuenta? Registrarse
      </Link>
    </div>
  );
}
