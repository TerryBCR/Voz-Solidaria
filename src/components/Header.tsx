"use client";

import React from "react";
import { useUIStore } from "@/store/uiStore";

export default function Header() {
  const { sidebarOpen, toggleSidebar, activeSection } = useUIStore();

  // Mapeo de identificadores de sección a títulos legibles
  const getSectionTitle = (id: string) => {
    switch (id) {
      case "inicio":
        return "Inicio";
      case "biblioteca":
        return "Biblioteca de Audiolibros";
      case "progreso":
        return "Mi Progreso de Lectura";
      case "ajustes":
        return "Ajustes de la Cuenta";
      default:
        return "Voz Solidaria";
    }
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border-paper/70 bg-card-paper/85 px-6 backdrop-blur-md"
    >
      <div className="flex items-center gap-4">
        {/* Botón de alternancia de la barra lateral en móviles */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-paper text-muted-paper hover:text-text-paper hover:bg-active-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper md:hidden"
          aria-label={sidebarOpen ? "Cerrar menú lateral de navegación" : "Abrir menú lateral de navegación"}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-nav"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Título de la sección activa - anuncia dinámicamente el cambio al lector de pantalla */}
        <h1
          id="page-header-title"
          className="text-lg font-bold text-text-paper font-serif md:text-xl"
          aria-live="polite"
        >
          {getSectionTitle(activeSection)}
        </h1>
      </div>

      {/* Navegación del Header */}
      <nav role="navigation" aria-label="Navegación de herramientas" className="flex items-center gap-4">
        <ul className="flex items-center gap-2">
          {/* Opción de ayuda accesible */}
          <li>
            <button
              type="button"
              className="flex h-10 px-4 items-center gap-2 rounded-xl border border-border-paper text-sm font-medium text-text-paper hover:bg-active-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper transition-colors"
              aria-label="Centro de ayuda y accesibilidad"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 text-brand-primary"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              </svg>
              <span className="hidden sm:inline">Ayuda</span>
            </button>
          </li>
          
          {/* Centro de notificaciones */}
          <li>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-paper text-muted-paper hover:text-text-paper hover:bg-active-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper transition-colors"
              aria-label="Ver notificaciones (0 nuevas)"
            >
              <span className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-muted-paper hover:text-text-paper"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a9.04 9.04 0 0 1-2.857 1.18 9.04 9.04 0 0 1-2.857-1.18m9.474-1.161c-.301-.18-1.022-.53-1.022-2.133V10.05c0-2.475-1.353-4.54-3.799-5.132v-.19a2.5 2.5 0 0 0-5 0v.19C4.54 5.51 3.187 7.575 3.187 10.05v3.742c0 1.602-.721 1.952-1.022 2.133a1.002 1.002 0 0 0-.422.808c0 .452.37.818.82.818h16.204c.45 0 .82-.366.82-.818a1.002 1.002 0 0 0-.422-.808Z"
                  />
                </svg>
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
