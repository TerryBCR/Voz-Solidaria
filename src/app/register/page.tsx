"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre, // Este metadato alimenta el trigger de Supabase que crea el perfil
          },
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(
          "¡Registro exitoso! Por favor verifica tu correo electrónico si es requerido o inicia sesión."
        );
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch {
      setError("Ocurrió un error inesperado al intentar registrarse.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Contenedor con Arquitectura de Doble Bisel */}
      <div className="bg-brand-primary/[0.03] dark:bg-brand-accent/[0.03] border border-brand-primary/10 dark:border-brand-accent/15 p-1.5 rounded-[2.2rem] w-full max-w-md shadow-sm">
        <div className="bg-card-paper border border-border-paper/40 px-6 py-10 sm:px-10 rounded-[2rem] space-y-8">
          
          {/* Encabezado */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-text-paper font-serif tracking-tight">
              Crear Cuenta
            </h2>
            <p className="text-muted-paper text-sm font-medium">
              Únete a Voz Solidaria y guarda tu progreso de lectura
            </p>
          </div>

          {/* Región de Alertas de Error y Éxito Accesibles para NVDA */}
          <div 
            id="auth-status-container" 
            role="status" 
            aria-live="assertive" 
            className="space-y-3"
          >
            {error && (
              <div 
                role="alert" 
                className="text-sm font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/25 px-4 py-3 rounded-xl flex items-start gap-2.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="text-sm font-bold text-brand-forest dark:text-brand-forest-light bg-brand-forest/10 dark:bg-brand-forest/5 border border-brand-forest/20 px-4 py-3 rounded-xl flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                <span>{success}</span>
              </div>
            )}
          </div>

          {/* Formulario */}
          <form className="space-y-6" onSubmit={handleRegister}>
            {/* Nombre Completo */}
            <div className="space-y-2">
              <label 
                htmlFor="nombre" 
                className="block text-sm font-bold text-text-paper font-serif"
              >
                Nombre completo
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Elías K."
                className="w-full px-4 py-3 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper"
              />
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block text-sm font-bold text-text-paper font-serif"
              >
                Dirección de correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-4 py-3 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper"
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <label 
                htmlFor="password" 
                className="block text-sm font-bold text-text-paper font-serif"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper"
              />
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="w-full py-3.5 px-4 bg-brand-primary hover:bg-brand-primary/95 active:scale-[0.98] text-white font-bold text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper transition-all shadow-md shadow-brand-primary/10 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Registrar</span>
              )}
            </button>
          </form>

          {/* Alternar a Login */}
          <div className="text-center pt-4 border-t border-border-paper/40">
            <p className="text-sm text-muted-paper font-semibold">
              ¿Ya tienes una cuenta?{" "}
              <Link 
                href="/login" 
                className="text-brand-primary hover:underline font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper rounded px-1"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
