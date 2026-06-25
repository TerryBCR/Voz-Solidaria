"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Audiobook {
  id: string;
  titulo: string;
  autor: string;
  narrador: string;
  genero: string;
  duracion_segundos: number;
  aprobado?: boolean;
}

interface UserProfile {
  id: string;
  nombre: string;
  rol: string;
  avatar_url?: string | null;
  solicitud_colaborador?: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [collabRequests, setCollabRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [activeTab, setActiveTab] = useState<"pendientes" | "catalogo">("pendientes");

  useEffect(() => {
    async function checkAdminAndFetch() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          setIsError(true);
          setStatusMessage("No se pudo cargar tu perfil de usuario.");
          setLoading(false);
          return;
        }

        setProfile(profileData as UserProfile);

        if (profileData.rol === "Admin") {
          // 1. Cargar audiolibros (con fallback si la columna aprobado no existe)
          let booksData: any[] | null = null;
          try {
            const { data, error } = await supabase
              .from("audiolibros")
              .select("id, titulo, autor, narrador, genero, duracion_segundos, aprobado");
            if (error) throw error;
            booksData = data;
          } catch (err) {
            console.warn("La columna 'aprobado' no existe aún. Cargando todo como aprobado:", err);
            const { data, error } = await supabase
              .from("audiolibros")
              .select("id, titulo, autor, narrador, genero, duracion_segundos");
            if (error) throw error;
            booksData = data;
          }

          const initializedBooks = (booksData || []).map(b => ({
            ...b,
            aprobado: b.aprobado !== undefined ? b.aprobado : true
          }));
          setBooks(initializedBooks);

          // 2. Cargar solicitudes de colaborador (con fallback si la columna solicitud_colaborador no existe)
          let requestsData: any[] | null = null;
          try {
            const { data, error } = await supabase
              .from("perfiles")
              .select("id, nombre, rol, avatar_url, solicitud_colaborador")
              .eq("solicitud_colaborador", true);
            if (error) throw error;
            requestsData = data;
          } catch (err) {
            console.warn("La columna 'solicitud_colaborador' no existe aún en perfiles:", err);
          }
          setCollabRequests(requestsData || []);
        }
      } catch (err) {
        console.error(err);
        setIsError(true);
        setStatusMessage("Error de conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    }

    checkAdminAndFetch();
  }, [router]);

  const handleApproveBook = async (bookId: string, bookTitle: string) => {
    setActionLoading(true);
    setStatusMessage("");
    setIsError(false);

    try {
      const { error } = await supabase
        .from("audiolibros")
        .update({ aprobado: true })
        .eq("id", bookId);

      if (error) {
        setIsError(true);
        setStatusMessage(`Error al aprobar: ${error.message}`);
      } else {
        setBooks(books.map(b => b.id === bookId ? { ...b, aprobado: true } : b));
        setIsError(false);
        setStatusMessage(`El audiolibro "${bookTitle}" ha sido aprobado y publicado en el catálogo público.`);
      }
    } catch {
      setIsError(true);
      setStatusMessage("Error al procesar la aprobación.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBook = async (bookId: string, bookTitle: string) => {
    const confirmReject = window.confirm(`¿Estás seguro de que deseas rechazar y eliminar "${bookTitle}"?`);
    if (!confirmReject) return;

    setActionLoading(true);
    setStatusMessage("");
    setIsError(false);

    try {
      const { error } = await supabase
        .from("audiolibros")
        .delete()
        .eq("id", bookId);

      if (error) {
        setIsError(true);
        setStatusMessage(`Error al rechazar: ${error.message}`);
      } else {
        setBooks(books.filter(b => b.id !== bookId));
        setIsError(false);
        setStatusMessage(`El audiolibro "${bookTitle}" ha sido rechazado y eliminado.`);
      }
    } catch {
      setIsError(true);
      setStatusMessage("Error al procesar el rechazo.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar "${bookTitle}" del catálogo?`);
    if (!confirmDelete) return;

    setActionLoading(true);
    setStatusMessage("");
    setIsError(false);

    try {
      const { error } = await supabase
        .from("audiolibros")
        .delete()
        .eq("id", bookId);

      if (error) {
        setIsError(true);
        setStatusMessage(`Error al eliminar: ${error.message}`);
      } else {
        setBooks(books.filter((b) => b.id !== bookId));
        setIsError(false);
        setStatusMessage(`El audiolibro "${bookTitle}" ha sido eliminado con éxito.`);
      }
    } catch {
      setIsError(true);
      setStatusMessage("Error al procesar la solicitud de eliminación.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptCollaborator = async (reqProfile: UserProfile) => {
    setActionLoading(true);
    setStatusMessage("");
    setIsError(false);

    try {
      const { error } = await supabase
        .from("perfiles")
        .update({ rol: "Colaborador", solicitud_colaborador: false })
        .eq("id", reqProfile.id);

      if (error) {
        setIsError(true);
        setStatusMessage(`Error al aceptar la solicitud: ${error.message}`);
      } else {
        setCollabRequests(collabRequests.filter(r => r.id !== reqProfile.id));
        setIsError(false);
        setStatusMessage(`El usuario "${reqProfile.nombre}" ha sido ascendido al rol de Colaborador.`);
      }
    } catch {
      setIsError(true);
      setStatusMessage("Error al procesar la solicitud.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCollaborator = async (reqProfile: UserProfile) => {
    setActionLoading(true);
    setStatusMessage("");
    setIsError(false);

    try {
      const { error } = await supabase
        .from("perfiles")
        .update({ solicitud_colaborador: false })
        .eq("id", reqProfile.id);

      if (error) {
        setIsError(true);
        setStatusMessage(`Error al rechazar la solicitud: ${error.message}`);
      } else {
        setCollabRequests(collabRequests.filter(r => r.id !== reqProfile.id));
        setIsError(false);
        setStatusMessage(`La solicitud del usuario "${reqProfile.nombre}" ha sido rechazada.`);
      }
    } catch {
      setIsError(true);
      setStatusMessage("Error al procesar la solicitud.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-paper font-serif font-bold">Verificando credenciales de Administrador...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.rol !== "Admin") {
    return (
      <div className="flex h-[50vh] items-center justify-center" role="alert" aria-live="assertive">
        <div className="bg-brand-primary/[0.03] border border-brand-primary/15 p-1.5 rounded-[2.2rem] max-w-md w-full shadow-sm">
          <div className="bg-card-paper p-8 border border-border-paper/40 rounded-[2rem] text-center space-y-4">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold font-serif text-brand-primary">Acceso Denegado</h2>
            <p className="text-muted-paper text-sm leading-relaxed">
              Esta sección está reservada de forma exclusiva para administradores del sistema. Tu rol actual es: <strong className="text-text-paper">{profile?.rol || "Ninguno"}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingBooks = books.filter(b => b.aprobado === false);
  const approvedBooks = books.filter(b => b.aprobado === true);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 animate-fadeIn py-6">

      {/* Encabezado */}
      <div className="space-y-2">
        <span className="rounded-full bg-brand-primary/10 text-brand-primary px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold">
          ADMINISTRACIÓN
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-text-paper font-serif tracking-tight">
          Panel de Control y Moderación
        </h2>
        <p className="text-muted-paper">
          Gestiona los audiolibros pendientes de aprobación y revisa las solicitudes de rol de colaborador.
        </p>
      </div>

      {/* Región de anuncios de NVDA en segundo plano */}
      <div className="sr-only" role="status" aria-live="assertive">
        {statusMessage}
      </div>

      {/* Alertas de error/éxito visibles */}
      {statusMessage && (
        <div className={`text-sm font-bold px-4 py-3 rounded-xl flex items-start gap-2.5 ${isError
            ? "text-brand-primary bg-brand-primary/10 border border-brand-primary/25"
            : "text-brand-forest dark:text-brand-forest-light bg-brand-forest/10 border border-brand-forest/20"
          }`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Panel de Moderación de Obras */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-paper pb-4">
          <h3 className="text-xl font-bold font-serif text-text-paper">
            Moderación de Audiolibros
          </h3>

          {/* Pestañas de Navegación */}
          <div className="flex bg-active-paper/30 p-1 rounded-xl border border-border-paper/40">
            <button
              onClick={() => setActiveTab("pendientes")}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === "pendientes"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-muted-paper hover:text-text-paper"
              }`}
              aria-current={activeTab === "pendientes" ? "page" : undefined}
            >
              Pendientes ({pendingBooks.length})
            </button>
            <button
              onClick={() => setActiveTab("catalogo")}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === "catalogo"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-muted-paper hover:text-text-paper"
              }`}
              aria-current={activeTab === "catalogo" ? "page" : undefined}
            >
              Catálogo Activo ({approvedBooks.length})
            </button>
          </div>
        </div>

        {/* Listados */}
        <div className="bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2.2rem] shadow-sm">
          <div className="bg-card-paper border border-border-paper/40 rounded-[2rem] overflow-hidden">
            {activeTab === "pendientes" ? (
              pendingBooks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" aria-label="Audiolibros pendientes de aprobación">
                    <thead>
                      <tr className="border-b border-border-paper bg-bg-paper text-xs font-bold text-muted-paper uppercase tracking-wider">
                        <th scope="col" className="px-6 py-4 font-serif">Título</th>
                        <th scope="col" className="px-6 py-4 font-serif">Autor</th>
                        <th scope="col" className="px-6 py-4 font-serif">Narrador</th>
                        <th scope="col" className="px-6 py-4 font-serif">Género</th>
                        <th scope="col" className="px-6 py-4 font-serif">Duración</th>
                        <th scope="col" className="px-6 py-4 font-serif text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-paper/30 text-sm text-text-paper">
                      {pendingBooks.map((book) => (
                        <tr key={book.id} className="hover:bg-active-paper/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-text-paper font-serif">{book.titulo}</td>
                          <td className="px-6 py-4 font-medium">{book.autor}</td>
                          <td className="px-6 py-4 font-medium">{book.narrador}</td>
                          <td className="px-6 py-4 font-medium">{book.genero}</td>
                          <td className="px-6 py-4 font-medium">{formatDuration(book.duracion_segundos)}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleApproveBook(book.id, book.titulo)}
                              disabled={actionLoading}
                              className="px-3.5 py-1.5 bg-brand-forest hover:bg-brand-forest/90 text-white font-bold text-xs rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                              aria-label={`Aprobar audiolibro "${book.titulo}"`}
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectBook(book.id, book.titulo)}
                              disabled={actionLoading}
                              className="px-3.5 py-1.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white font-bold text-xs rounded-lg border border-brand-primary/20 hover:border-transparent transition-all cursor-pointer inline-flex items-center gap-1.5"
                              aria-label={`Rechazar audiolibro "${book.titulo}"`}
                            >
                              Rechazar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-muted-paper text-sm font-semibold font-serif" role="status">
                  No hay audiolibros pendientes de moderación. 🎉
                </div>
              )
            ) : (
              approvedBooks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" aria-label="Catálogo activo de audiolibros aprobados">
                    <thead>
                      <tr className="border-b border-border-paper bg-bg-paper text-xs font-bold text-muted-paper uppercase tracking-wider">
                        <th scope="col" className="px-6 py-4 font-serif">Título</th>
                        <th scope="col" className="px-6 py-4 font-serif">Autor</th>
                        <th scope="col" className="px-6 py-4 font-serif">Narrador</th>
                        <th scope="col" className="px-6 py-4 font-serif">Género</th>
                        <th scope="col" className="px-6 py-4 font-serif">Duración</th>
                        <th scope="col" className="px-6 py-4 font-serif text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-paper/30 text-sm text-text-paper">
                      {approvedBooks.map((book) => (
                        <tr key={book.id} className="hover:bg-active-paper/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-text-paper font-serif">{book.titulo}</td>
                          <td className="px-6 py-4 font-medium">{book.autor}</td>
                          <td className="px-6 py-4 font-medium">{book.narrador}</td>
                          <td className="px-6 py-4 font-medium">{book.genero}</td>
                          <td className="px-6 py-4 font-medium">{formatDuration(book.duracion_segundos)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteBook(book.id, book.titulo)}
                              disabled={actionLoading}
                              className="px-3.5 py-1.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white font-bold text-xs rounded-lg border border-brand-primary/20 hover:border-transparent transition-all cursor-pointer inline-flex items-center gap-1.5"
                              aria-label={`Eliminar audiolibro "${book.titulo}"`}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-muted-paper text-sm font-semibold font-serif" role="status">
                  No hay audiolibros aprobados en el catálogo aún.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Sección: Gestión de Solicitudes de Colaborador */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold font-serif text-text-paper border-b border-border-paper pb-4">
          Solicitudes de Rol de Colaborador ({collabRequests.length})
        </h3>

        <div className="bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2.2rem] shadow-sm">
          <div className="bg-card-paper p-6 sm:p-8 border border-border-paper/40 rounded-[2rem] space-y-4">
            {collabRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {collabRequests.map((req) => (
                  <div key={req.id} className="p-5 bg-bg-paper border border-border-paper/60 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-text-paper font-serif">{req.nombre}</h4>
                      <p className="text-xs text-muted-paper">Rol actual: {req.rol}</p>
                      <p className="text-xs text-brand-primary font-bold">Solicita ascenso a Colaborador</p>
                    </div>

                    <div className="flex gap-3 border-t border-border-paper/30 pt-3">
                      <button
                        type="button"
                        onClick={() => handleAcceptCollaborator(req)}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-brand-forest hover:bg-brand-forest/90 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        aria-label={`Aceptar solicitud de ascenso de "${req.nombre}"`}
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectCollaborator(req)}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white font-bold text-xs rounded-xl border border-brand-primary/20 hover:border-transparent cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        aria-label={`Rechazar solicitud de ascenso de "${req.nombre}"`}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-paper text-sm font-semibold font-serif" role="status">
                No hay solicitudes pendientes de colaboradores en este momento.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
