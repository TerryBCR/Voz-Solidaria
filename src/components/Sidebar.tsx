"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUIStore } from "@/store/uiStore";
import { supabase } from "@/lib/supabaseClient";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string; // Si se navega a otra ruta
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, activeSection, setActiveSection } = useUIStore();
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || null);
          const { data: profile } = await supabase
            .from("perfiles")
            .select("rol")
            .eq("id", user.id)
            .single();
          if (profile) {
            setRole(profile.rol);
          }
        }
      } catch (err) {
        console.error("Error al obtener rol del sidebar:", err);
      }
    }

    fetchUserProfile();

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setEmail(session.user.email || null);
        const { data: profile } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setRole(profile.rol);
        }
      } else {
        setRole(null);
        setEmail(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems: NavItem[] = [
    {
      id: "inicio",
      label: "Inicio",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.75h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21.75h7.5" />
        </svg>
      ),
    },
    {
      id: "biblioteca",
      label: "Biblioteca",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-16.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-16.25v14.25" />
        </svg>
      ),
    },
    {
      id: "progreso",
      label: "Mi Progreso",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      ),
    },
    {
      id: "ajustes",
      label: "Ajustes",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
  ];

  // Añadir condicionalmente accesos administrativos/colaborativos
  if (role === "Admin") {
    navItems.push(
      {
        id: "admin",
        label: "Panel Admin",
        href: "/admin",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
        ),
      },
      {
        id: "colaborador",
        label: "Subir Libros",
        href: "/colaborador",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
      }
    );
  } else if (role === "Colaborador") {
    navItems.push({
      id: "colaborador",
      label: "Subir Libros",
      href: "/colaborador",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    });
  }

  const handleNavigation = (item: NavItem) => {
    setSidebarOpen(false);

    if (item.href) {
      router.push(item.href);
    } else {
      if (pathname !== "/") {
        router.push("/");
      }
      setActiveSection(item.id);
    }
  };

  return (
    <>
      {/* Backdrop para móviles con cierre accesible */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Contenedor de la barra lateral */}
      <aside
        id="sidebar-nav"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card-paper border-r border-border-paper/70 p-6 transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación principal y secciones del sitio"
      >
        {/* Cabecera de la Barra Lateral */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent text-white shadow-md shadow-brand-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-text-paper font-serif block">
                Voz Solidaria
              </span>
              <span className="block text-xs font-bold text-brand-primary uppercase tracking-widest leading-none mt-0.5">
                Audiolibros
              </span>
            </div>
          </div>

          {/* Botón para cerrar en móviles */}
          <button
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border-paper text-muted-paper hover:text-text-paper hover:bg-active-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar barra de navegación"
            aria-expanded={sidebarOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menú de Navegación principal */}
        <nav className="flex-1" aria-label="Menú del sitio">
          <ul className="space-y-2">
            {navItems.map((item) => {
              // Validar si el ítem actual está activo
              const isRouteActive = item.href ? pathname === item.href : (pathname === "/" && activeSection === item.id);
              
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavigation(item)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all duration-200 group text-left ${
                      isRouteActive
                        ? "bg-brand-primary text-white shadow-md shadow-brand-primary/10"
                        : "text-muted-paper hover:text-text-paper hover:bg-active-paper/60"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper`}
                    aria-current={isRouteActive ? "page" : undefined}
                  >
                    <span
                      className={`transition-colors duration-200 ${
                        isRouteActive ? "text-white" : "text-muted-paper group-hover:text-text-paper"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 font-serif">{item.label}</span>
                    {isRouteActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sección de perfil / Botón de cerrar sesión */}
        <div className="border-t border-border-paper/70 pt-4 mt-auto space-y-3">
          {email && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-bg-paper/60 border border-border-paper/85 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs shrink-0">
                {role ? role.substring(0, 2).toUpperCase() : "LE"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-paper truncate">{email}</p>
                <p className="text-[10px] text-muted-paper truncate">{role || "Lector Activo"}</p>
              </div>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 bg-active-paper hover:bg-brand-primary hover:text-white text-text-paper font-bold text-xs rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper transition-all cursor-pointer text-center"
            aria-label="Cerrar sesión de la cuenta"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
