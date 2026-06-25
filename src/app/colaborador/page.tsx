"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadFileToStorage } from "@/lib/storageHelpers";

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
  avatar_url: string | null;
}

export default function ColaboradorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de formulario
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [narrador, setNarrador] = useState("");
  const [genero, setGenero] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("");
  const [descripcionAccesible, setDescripcionAccesible] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Estados de acción y accesibilidad para NVDA
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    async function checkRoleAndFetch() {
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

        setProfile(profileData);

        // Permitir a Colaboradores y Admins acceder al panel de subidas
        if (profileData.rol === "Colaborador" || profileData.rol === "Admin") {
          let booksData: any[] | null = null;
          let queryError = null;

          try {
            const { data, error } = await supabase
              .from("audiolibros")
              .select("id, titulo, autor, narrador, genero, duracion_segundos, aprobado")
              .eq("subido_por", user.id);
            if (error) throw error;
            booksData = data;
          } catch (err) {
            console.warn("La columna 'aprobado' no existe o falló la consulta. Haciendo fallback:", err);
            const { data, error } = await supabase
              .from("audiolibros")
              .select("id, titulo, autor, narrador, genero, duracion_segundos")
              .eq("subido_por", user.id);
            if (error) {
              queryError = error;
            } else {
              booksData = data;
            }
          }

          if (queryError) {
            setIsError(true);
            setStatusMessage("Error al cargar tus audiolibros subidos.");
          } else {
            const initializedBooks = (booksData || []).map(b => ({
              ...b,
              aprobado: b.aprobado !== undefined ? b.aprobado : false
            }));
            setBooks(initializedBooks);
          }
        }
      } catch (err) {
        console.error(err);
        setIsError(true);
        setStatusMessage("Error de conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    }

    checkRoleAndFetch();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !coverFile) {
      setIsError(true);
      setStatusMessage("Por favor selecciona tanto el archivo de audio MP3 como la imagen de portada.");
      return;
    }

    setActionLoading(true);
    setUploadProgress(0);
    setStatusMessage("");
    setIsError(false);

    setAnnouncement("Subiendo audiolibro, por favor espere...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión de usuario no encontrada.");

      // 1. Subir Audio MP3
      setAnnouncement("Subiendo archivo de audio, por favor espere...");
      const audioUrl = await uploadFileToStorage(audioFile, "audio", (progress) => {
        setUploadProgress(Math.round(progress * 0.7));
      });

      // 2. Subir Imagen de Portada
      setAnnouncement("Subiendo imagen de portada...");
      const coverUrl = await uploadFileToStorage(coverFile, "portadas", (progress) => {
        setUploadProgress(70 + Math.round(progress * 0.3));
      });

      setAnnouncement("Archivos subidos. Registrando metadatos en la base de datos...");

      // 3. Registrar en Base de Datos
      const duracionSegundos = parseInt(duracionMinutos, 10) * 60;
      const { data: insertedData, error: insertError } = await supabase
        .from("audiolibros")
        .insert({
          titulo,
          autor,
          narrador,
          genero,
          url_audio: audioUrl,
          url_portada: coverUrl,
          duracion_segundos: duracionSegundos,
          descripcion_accesible: descripcionAccesible,
          subido_por: user.id,
          aprobado: false // todo audiolibro subido por colaborador empieza desaprobado
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setBooks([...books, {
        id: insertedData.id,
        titulo,
        autor,
        narrador,
        genero,
        duracion_segundos: duracionSegundos,
        aprobado: false
      }]);

      setIsError(false);
      setStatusMessage(`¡Audiolibro "${titulo}" subido con éxito! Quedará visible en la biblioteca una vez aprobado por un administrador.`);
      setAnnouncement("Subida completada. Pendiente de aprobación por un administrador.");

      // Limpiar formulario
      setTitulo("");
      setAutor("");
      setNarrador("");
      setGenero("");
      setDuracionMinutos("");
      setDescripcionAccesible("");
      setAudioFile(null);
      setCoverFile(null);

      const audioInput = document.getElementById("audio-file") as HTMLInputElement;
      const coverInput = document.getElementById("cover-file") as HTMLInputElement;
      if (audioInput) audioInput.value = "";
      if (coverInput) coverInput.value = "";

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al intentar subir el audiolibro.";
      setIsError(true);
      setStatusMessage(errorMessage);
      setAnnouncement("La subida falló.");
    } finally {
      setActionLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar tu audiolibro "${bookTitle}"?`);
    if (!confirmDelete) return;

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
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-paper font-serif font-bold">Verificando credenciales de Colaborador...</p>
        </div>
      </div>
    );
  }

  if (!profile || (profile.rol !== "Colaborador" && profile.rol !== "Admin")) {
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
              Esta sección está reservada para colaboradores registrados. Tu rol actual es: <strong className="text-text-paper">{profile?.rol || "Ninguno"}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 animate-fadeIn py-6">

      {/* Encabezado */}
      <div className="space-y-2">
        <span className="rounded-full bg-brand-primary/10 text-brand-primary px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold">
          COLABORADOR
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-text-paper font-serif tracking-tight">
          Sube tus Propios Audiolibros
        </h2>
        <p className="text-muted-paper">
          Publica tus narraciones y graba la información de manera accesible para todos nuestros lectores.
        </p>
      </div>

      {/* Anuncios en segundo plano para NVDA */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Alertas visibles */}
      <div id="colab-status-container" role="status" aria-live="assertive">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Formulario de Carga */}
        <div className="lg:col-span-7 bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2.2rem] shadow-sm">
          <form className="bg-card-paper p-6 sm:p-8 border border-border-paper/40 rounded-[2rem] space-y-5" onSubmit={handleSubmit}>
            <div className="border-b border-border-paper/30 pb-3 space-y-2">
              <h3 className="text-xl font-bold font-serif text-text-paper">
                Nuevo Audiolibro
              </h3>
              <p className="text-xs text-muted-paper italic">
                Nota: Todo audiolibro subido quedará en estado pendiente de moderación y requerirá la aprobación de un administrador antes de ser visible en la biblioteca pública.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="titulo" className="text-xs font-bold text-text-paper uppercase tracking-wider">Título del libro</label>
                <input
                  id="titulo"
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. El ingenioso hidalgo..."
                  className="w-full px-4 py-2.5 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="autor" className="text-xs font-bold text-text-paper uppercase tracking-wider">Autor del libro</label>
                <input
                  id="autor"
                  type="text"
                  required
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Ej. Miguel de Cervantes"
                  className="w-full px-4 py-2.5 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="narrador" className="text-xs font-bold text-text-paper uppercase tracking-wider">Voz del narrador</label>
                <input
                  id="narrador"
                  type="text"
                  required
                  value={narrador}
                  onChange={(e) => setNarrador(e.target.value)}
                  placeholder="Ej. Alberto M."
                  className="w-full px-4 py-2.5 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="genero" className="text-xs font-bold text-text-paper uppercase tracking-wider">Género literario</label>
                <input
                  id="genero"
                  type="text"
                  required
                  value={genero}
                  onChange={(e) => setGenero(e.target.value)}
                  placeholder="Ej. Clásico, Fantasía"
                  className="w-full px-4 py-2.5 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="duracion" className="text-xs font-bold text-text-paper uppercase tracking-wider">Duración aproximada (en minutos)</label>
              <input
                id="duracion"
                type="number"
                required
                min="1"
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(e.target.value)}
                placeholder="Ej. 120"
                className="w-full px-4 py-2.5 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-paper/20 pt-4">
              <div className="space-y-2">
                <label htmlFor="audio-file" className="block text-xs font-bold text-text-paper uppercase tracking-wider">
                  Archivo de audio (.mp3)
                </label>
                <input
                  id="audio-file"
                  type="file"
                  accept="audio/mpeg"
                  required
                  aria-describedby="audio-format-info"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-paper file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer"
                />
                <span id="audio-format-info" className="sr-only">Solo se permiten archivos en formato MP3</span>
              </div>

              <div className="space-y-2">
                <label htmlFor="cover-file" className="block text-xs font-bold text-text-paper uppercase tracking-wider">
                  Carátula / Portada (Imagen)
                </label>
                <input
                  id="cover-file"
                  type="file"
                  accept="image/*"
                  required
                  aria-describedby="cover-format-info"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-paper file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer"
                />
                <span id="cover-format-info" className="sr-only">Solo imágenes JPG, PNG o WebP</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border-paper/20 pt-4">
              <label htmlFor="desc-accesible" className="text-xs font-bold text-text-paper uppercase tracking-wider block">
                Descripción accesible del audiolibro (para lectores de pantalla)
              </label>
              <textarea
                id="desc-accesible"
                required
                rows={4}
                value={descripcionAccesible}
                onChange={(e) => setDescripcionAccesible(e.target.value)}
                placeholder="Ej. Don Quijote de la Mancha. Portada de cuero café antiguo con detalles grabados en oro que muestran un caballero con lanza sobre un caballo flaco. El libro narra las aventuras de un hidalgo loco por la lectura..."
                className="w-full px-4 py-2.5 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary resize-none leading-relaxed"
                aria-describedby="desc-helper"
              />
              <p id="desc-helper" className="text-[10px] text-muted-paper">
                Esta descripción será leída por NVDA antes del audio, describiendo la portada y el contexto visual de la obra.
              </p>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              aria-disabled={actionLoading}
              className="w-full py-3.5 px-4 bg-brand-primary hover:bg-brand-primary/95 active:scale-[0.98] text-white font-bold text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper transition-all shadow-md shadow-brand-primary/10 cursor-pointer flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Subiendo ({uploadProgress}%)...</span>
                </>
              ) : (
                <span>Publicar Audiolibro</span>
              )}
            </button>
          </form>
        </div>

        {/* Tabla de Subidas Propias */}
        <div className="lg:col-span-5 bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2.2rem] shadow-sm h-fit">
          <div className="bg-card-paper p-6 border border-border-paper/40 rounded-[2rem] space-y-4">
            <h3 className="text-lg font-bold font-serif text-text-paper border-b border-border-paper/30 pb-2">
              Mis Subidas ({books.length})
            </h3>

            {books.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {books.map((book) => (
                  <div key={book.id} className="p-4 bg-bg-paper border border-border-paper/60 rounded-xl flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h4 className="font-bold text-sm text-text-paper font-serif truncate">{book.titulo}</h4>
                      <p className="text-xs text-muted-paper truncate">{book.autor}</p>
                      <div className="inline-flex">
                        {book.aprobado ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-forest/15 text-brand-forest">
                            Aprobado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary">
                            Pendiente de Moderación
                          </span>
                        )}
                      </div>
                    </div>
                    {!book.aprobado && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBook(book.id, book.titulo)}
                        className="p-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg border border-brand-primary/20 hover:border-transparent transition-all cursor-pointer shrink-0"
                        aria-label={`Eliminar tu audiolibro "${book.titulo}"`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0.23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.006.307l-.742 1.484a.75.75 0 1 0 1.343.667l.742-1.484a.75.75 0 0 0-.337-.974Zm4.25 1.791a.75.75 0 1 0 1.342-.667l-.742-1.484a.75.75 0 1 0-1.343.667l.742 1.484Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-paper py-4 text-center">
                Aún no has subido ningún audiolibro.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
