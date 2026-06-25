"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SkipLink from "@/components/SkipLink";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const loggedIn = !!user;
        setIsAuthenticated(loggedIn);

        if (loggedIn && isAuthPage) {
          // Si ya está logueado e intenta ir a login/registro, redirigir al inicio
          router.push("/");
        } else if (!loggedIn && !isAuthPage) {
          // Si no está logueado e intenta ir a página protegida, redirigir a login
          router.push("/login");
        }
      } catch (err) {
        console.error("Error verificando sesión en el LayoutWrapper:", err);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, [pathname, isAuthPage, router]);

  // Si es página de autenticación, renderizar inmediatamente sin Sidebar ni Header
  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center bg-bg-paper text-text-paper">
        <main id="main-content" className="w-full flex justify-center items-center focus:outline-none" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  // Mientras verifica sesión en páginas protegidas
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg-paper text-text-paper" role="status" aria-live="polite">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-paper font-serif font-bold text-sm">Verificando sesión en la biblioteca...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado y se está redirigiendo
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg-paper text-text-paper" role="status" aria-live="polite">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-paper font-serif font-bold text-sm">Redirigiendo a inicio de sesión...</p>
        </div>
      </div>
    );
  }

  // Layout normal para la aplicación (usuario autenticado)
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-bg-paper text-text-paper">
      <SkipLink />
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main
          id="main-content"
          className="flex-1 p-6 md:p-8 focus:outline-none"
          tabIndex={-1}
        >
          {children}
        </main>
        <footer className="border-t border-border-paper/40 py-6 px-6 text-center text-xs text-muted-paper bg-card-paper/30 mt-auto">
          <p>© {new Date().getFullYear()} Voz Solidaria. Desarrollado con accesibilidad estricta para NVDA.</p>
        </footer>
      </div>
    </div>
  );
}
