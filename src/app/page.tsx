"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUIStore } from "@/store/uiStore";
import { User } from "@supabase/supabase-js";

// Tipado de audiolibros reales en la BD
interface Audiobook {
  id: string;
  titulo: string;
  autor: string;
  narrador: string;
  genero: string;
  url_audio: string;
  url_portada: string;
  duracion_segundos: number;
  descripcion_accesible: string;
  subido_por?: string;
  aprobado?: boolean;
  progress?: number; // Calculado uniendo con progreso_lectura
  lastPosition?: number; // Último segundo guardado en la base de datos
}

interface UserProfile {
  id: string;
  nombre: string;
  rol: string;
  avatar_url: string | null;
  solicitud_colaborador?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function Home() {
  const router = useRouter();
  const { activeSection } = useUIStore();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Estados de datos reales
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("todos");

  // Estado de reproducción simulado en cliente
  const [playingBook, setPlayingBook] = useState<Audiobook | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Estados para el reproductor de audio personalizado
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [audioDescriptionsEnabled, setAudioDescriptionsEnabled] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedTimeRef = useRef<number>(-1);

  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        // 1. Obtener usuario autenticado
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);

        // 2. Obtener perfil
        const { data: profileData } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        setProfile(profileData);
        if (profileData) {
          setProfileName(profileData.nombre);
        }

        // 3. Obtener Catálogo de audiolibros (aprobados, con fallback por si no existe la columna aún)
        let booksData: any[] | null = null;
        try {
          const { data, error } = await supabase
            .from("audiolibros")
            .select("*")
            .eq("aprobado", true);
          if (error) throw error;
          booksData = data;
        } catch (err) {
          console.warn("La columna 'aprobado' no existe o falló la consulta. Haciendo fallback a cargar todos los libros:", err);
          const { data, error } = await supabase
            .from("audiolibros")
            .select("*");
          if (error) throw error;
          booksData = data;
        }

        const currentBooks: Audiobook[] = booksData || [];

        // Doble filtro en cliente: ocultar audiolibros no aprobados explícitamente (si la columna existe y es false)
        const approvedBooks = currentBooks.filter(book => book.aprobado !== false);

        // 4. Obtener progreso de lectura del usuario
        const { data: progressData } = await supabase
          .from("progreso_lectura")
          .select("audiolibro_id, progreso_porcentaje, ultima_posicion_segundos")
          .eq("perfil_id", currentUser.id);

        // Mapear el progreso al catálogo
        const booksWithProgress = approvedBooks.map((book) => {
          const progressRecord = progressData?.find(p => p.audiolibro_id === book.id);
          return {
            ...book,
            progress: progressRecord ? progressRecord.progreso_porcentaje : 0,
            lastPosition: progressRecord ? progressRecord.ultima_posicion_segundos : 0
          };
        });

        setAudiobooks(booksWithProgress);

        // 5. Obtener favoritos del usuario
        const { data: favsData } = await supabase
          .from("favoritos")
          .select("audiolibro_id")
          .eq("perfil_id", currentUser.id);

        if (favsData) {
          setFavoritosIds(favsData.map(f => f.audiolibro_id));
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        console.error("Error cargando datos:", errorMessage);
        setStatusMessage("No se pudieron cargar los datos de la base de datos.");
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, [router]);

  // Cargar preferencias desde localStorage en el montaje del cliente
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSpeed = localStorage.getItem("voz_solidaria_speed");
      if (savedSpeed) {
        const parsedSpeed = parseFloat(savedSpeed);
        setPlaybackRate(parsedSpeed);
      }
      const savedDescriptions = localStorage.getItem("voz_solidaria_descriptions");
      if (savedDescriptions !== null) {
        setAudioDescriptionsEnabled(savedDescriptions === "true");
      }
    }
  }, []);

  // Manejar alternancia de favoritos
  const handleToggleFavorite = async (bookId: string, bookTitle: string) => {
    if (!user) return;
    const isFav = favoritosIds.includes(bookId);

    try {
      if (isFav) {
        // Eliminar de favoritos
        const { error } = await supabase
          .from("favoritos")
          .delete()
          .eq("perfil_id", user.id)
          .eq("audiolibro_id", bookId);

        if (error) throw error;
        setFavoritosIds(favoritosIds.filter(id => id !== bookId));
        setStatusMessage(`"${bookTitle}" ha sido eliminado de tu biblioteca.`);
      } else {
        // Insertar en favoritos
        const { error } = await supabase
          .from("favoritos")
          .insert({
            perfil_id: user.id,
            audiolibro_id: bookId
          });

        if (error) throw error;
        setFavoritosIds([...favoritosIds, bookId]);
        setStatusMessage(`"${bookTitle}" ha sido guardado en tu biblioteca.`);
      }
    } catch {
      setStatusMessage("Error al actualizar favoritos.");
    }
  };

  // Manejar cambio de libro en reproducción
  useEffect(() => {
    if (playingBook) {
      // El audio cargará su nueva fuente. El inicio efectivo se maneja en handleLoadedMetadata
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.playbackRate = playbackRate;
      }
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [playingBook?.id]);

  const handlePlayAudio = (book: Audiobook) => {
    setPlayingBook(book);
  };

  const saveProgressToDb = async (pos: number, dur: number) => {
    if (!user || !playingBook || dur <= 0) return;
    const pct = Math.min(100, Math.max(0, Math.round((pos / dur) * 100)));
    const bookId = playingBook.id;

    // Actualizar estado local al instante
    setAudiobooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          return { ...b, progress: pct, lastPosition: Math.round(pos) };
        }
        return b;
      })
    );

    try {
      await supabase
        .from("progreso_lectura")
        .upsert(
          {
            perfil_id: user.id,
            audiolibro_id: bookId,
            progreso_porcentaje: pct,
            ultima_posicion_segundos: Math.round(pos),
            actualizado_at: new Date().toISOString(),
          },
          { onConflict: "perfil_id,audiolibro_id" }
        );
    } catch (err) {
      console.error("Error guardando progreso en DB:", err);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || isSeeking) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);

    // Guardar cada 10 segundos
    const roundedTime = Math.floor(current);
    if (roundedTime > 0 && roundedTime % 10 === 0 && roundedTime !== lastSavedTimeRef.current) {
      lastSavedTimeRef.current = roundedTime;
      saveProgressToDb(current, audioRef.current.duration || duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const totalDur = audioRef.current.duration || playingBook?.duracion_segundos || 0;
      setDuration(totalDur);

      // Restaurar la última posición si existe
      if (playingBook && playingBook.lastPosition && playingBook.lastPosition > 0) {
        audioRef.current.currentTime = playingBook.lastPosition;
        setCurrentTime(playingBook.lastPosition);
        // Anunciar posición retomada para NVDA
        const min = Math.floor(playingBook.lastPosition / 60);
        const sec = Math.round(playingBook.lastPosition % 60);
        setStatusMessage(`Reanudando reproducción desde el minuto ${min} con ${sec} segundos.`);
      } else {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      // Reproducir automáticamente al cargar
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.log("Reproducción automática prevenida o pausada:", err);
        setIsPlaying(false);
      });
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      saveProgressToDb(audioRef.current.currentTime, audioRef.current.duration || duration);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      saveProgressToDb(audioRef.current.duration || duration, audioRef.current.duration || duration);
      setStatusMessage(`Has terminado de escuchar el audiolibro: ${playingBook?.titulo}. ¡Felicitaciones!`);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      const nextTime = Math.min(audioRef.current.currentTime + 10, duration);
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
      setStatusMessage("Adelantado 10 segundos");
    }
  };

  const handleSkipBackward = () => {
    if (audioRef.current) {
      const nextTime = Math.max(audioRef.current.currentTime - 10, 0);
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
      setStatusMessage("Retrocedido 10 segundos");
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.muted = nextMute;
    }
    setStatusMessage(nextMute ? "Audio silenciado" : `Audio activado. Volumen al ${Math.round(volume * 100)} por ciento.`);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackRate(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("voz_solidaria_speed", newSpeed.toString());
    }
    setStatusMessage(`Velocidad de reproducción cambiada a ${newSpeed} equis.`);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      // 1. Guardar nombre en Supabase
      const { error } = await supabase
        .from("perfiles")
        .update({ nombre: profileName, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      // Actualizar estado del perfil local
      if (profile) {
        setProfile({ ...profile, nombre: profileName });
      }

      // 2. Guardar en localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("voz_solidaria_speed", playbackRate.toString());
        localStorage.setItem("voz_solidaria_descriptions", audioDescriptionsEnabled.toString());
      }

      setStatusMessage("Ajustes guardados correctamente.");
    } catch (err) {
      console.error("Error al guardar ajustes:", err);
      setStatusMessage("Error al guardar los ajustes en el servidor.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestCollaborator = async () => {
    if (!user || !profile) return;
    try {
      const { error } = await supabase
        .from("perfiles")
        .update({ solicitud_colaborador: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      setProfile({ ...profile, solicitud_colaborador: true });
      setStatusMessage("Tu solicitud para ser colaborador ha sido enviada con éxito. Un administrador la revisará pronto.");
    } catch (err) {
      console.error("Error al solicitar ser colaborador:", err);
      setStatusMessage("No se pudo enviar la solicitud. Inténtalo de nuevo más tarde.");
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatTimeAccessibility = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return "0 segundos";
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    let text = "";
    if (m > 0) {
      text += `${m} minuto${m > 1 ? "s" : ""}`;
    }
    if (s > 0) {
      text += `${m > 0 ? " con " : ""}${s} segundo${s > 1 ? "s" : ""}`;
    }
    if (m === 0 && s === 0) {
      text = "0 segundos";
    }
    return text;
  };

  // Filtrado de audiolibros
  const filteredAudiobooks = audiobooks.filter((book) => {
    const matchesSearch =
      book.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.autor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === "todos" || book.genero === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const genres = ["todos", ...Array.from(new Set(audiobooks.map(b => b.genero)))];

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
          <p className="text-muted-paper font-serif font-bold">Conectando al estante de Voz Solidaria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-8 animate-fadeIn ${playingBook ? "pb-[480px] md:pb-[420px]" : ""}`}>

      {/* Región de estados NVDA */}
      <div id="page-status" role="status" aria-live="assertive" className="sr-only">
        {statusMessage}
      </div>

      {/* Nuevo Reproductor flotante en Tarjeta GRANDE de Alta Gama */}
      {playingBook && (
        <div
          className="fixed bottom-6 right-6 z-40 w-[calc(100%-3rem)] max-w-sm md:max-w-[420px] bg-card-paper border-2 border-brand-primary/20 p-6 md:p-8 rounded-[2.5rem] shadow-[0_15px_50px_rgba(0,0,0,0.15)] flex flex-col gap-6 animate-slideUp"
          role="region"
          aria-label="Reproductor de audio activo en tarjeta"
        >
          {/* Elemento de audio oculto */}
          <audio
            ref={audioRef}
            src={playingBook.url_audio}
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="sr-only"
          />

          {/* Cabecera del reproductor */}
          <div className="flex items-center justify-between pb-3 border-b border-border-paper/40">
            <span className="text-xs font-bold text-brand-primary uppercase tracking-widest font-serif">
              Reproduciendo
            </span>
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  saveProgressToDb(audioRef.current.currentTime, audioRef.current.duration || duration);
                }
                setPlayingBook(null);
              }}
              className="w-10 h-10 rounded-full border border-border-paper flex items-center justify-center text-muted-paper hover:text-brand-primary hover:bg-active-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-95 transition-all cursor-pointer"
              aria-label="Cerrar reproductor de audiolibro"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Cerrar reproductor de audiolibro</span>
            </button>
          </div>

          {/* Bloque: Portada e Información del Libro (Grande) */}
          <div className="flex gap-5 items-start">
            <div className="w-24 h-32 rounded-xl bg-stone-900 border-l-4 border-black/30 shrink-0 overflow-hidden shadow-lg" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={playingBook.url_portada}
                alt=""
                className="object-cover w-full h-full"
              />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <span className="inline-block text-[10px] font-bold text-brand-primary uppercase tracking-wider mb-1 px-2 py-0.5 rounded-md bg-brand-primary/10 font-serif">
                {playingBook.genero}
              </span>
              <h4 className="font-bold text-lg md:text-xl text-text-paper font-serif leading-snug line-clamp-2">
                {playingBook.titulo}
              </h4>
              <p className="text-sm text-muted-paper font-semibold mt-1 truncate">
                Autor: {playingBook.autor}
              </p>
              <p className="text-xs text-brand-accent font-bold mt-1.5 truncate">
                Narrador: {playingBook.narrador}
              </p>
            </div>
          </div>

          {/* Barra de Progreso Deslizable y Tiempos */}
          <div className="space-y-2">
            <div className="relative flex items-center">
              <label htmlFor="timeline-slider" className="sr-only">Barra de progreso. Utiliza las flechas izquierda y derecha para retroceder o adelantar la reproducción.</label>
              <input
                type="range"
                id="timeline-slider"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-brand-primary h-2 bg-active-paper rounded-lg cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand-primary"
                aria-label={`Deslizador de progreso del audiolibro. Tiempo actual: ${formatTimeAccessibility(currentTime)} de un total de ${formatTimeAccessibility(duration)}`}
                aria-valuenow={Math.round(currentTime)}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration || 100)}
                aria-valuetext={`${formatTimeAccessibility(currentTime)} de ${formatTimeAccessibility(duration)}`}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-mono text-muted-paper font-bold px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controles de Playback (Botones Grandes) */}
          <div className="flex items-center justify-center gap-6">
            {/* Botón Retroceder 10s */}
            <button
              type="button"
              onClick={handleSkipBackward}
              className="w-12 h-12 rounded-full border border-border-paper flex items-center justify-center text-muted-paper hover:text-text-paper hover:bg-active-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-95 transition-all cursor-pointer"
              aria-label="Retroceder 10 segundos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <span className="sr-only">Retroceder 10 segundos</span>
            </button>

            {/* Botón Play / Pause EXTRA Grande */}
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  if (isPlaying) {
                    audioRef.current.pause();
                  } else {
                    audioRef.current.play().catch(err => console.log("Play failed:", err));
                  }
                }
              }}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-brand-primary hover:bg-brand-primary/95 text-white shadow-lg shadow-brand-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper active:scale-90 transition-all cursor-pointer"
              aria-label={isPlaying ? `Pausar reproducción de ${playingBook.titulo}` : `Reproducir ${playingBook.titulo}`}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" aria-hidden="true">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              )}
              <span className="sr-only">{isPlaying ? "Pausar reproducción" : "Iniciar reproducción"}</span>
            </button>

            {/* Botón Adelantar 10s */}
            <button
              type="button"
              onClick={handleSkipForward}
              className="w-12 h-12 rounded-full border border-border-paper flex items-center justify-center text-muted-paper hover:text-text-paper hover:bg-active-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-95 transition-all cursor-pointer"
              aria-label="Adelantar 10 segundos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              <span className="sr-only">Adelantar 10 segundos</span>
            </button>
          </div>

          {/* Ajustes de Volumen y Velocidad */}
          <div className="grid grid-cols-2 gap-4 border-t border-border-paper/40 pt-4">
            {/* Velocidad */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="player-speed" className="text-xs font-bold text-muted-paper uppercase tracking-wider">Velocidad</label>
              <select
                id="player-speed"
                value={playbackRate.toString()}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-bg-paper border border-border-paper rounded-xl text-xs font-bold text-text-paper focus:outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value="0.75">0.75x</option>
                <option value="1">1.0x (Normal)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
            </div>

            {/* Volumen */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-muted-paper uppercase tracking-wider">Volumen</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-1.5 text-muted-paper hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer"
                  aria-label={isMuted ? "Activar sonido" : "Silenciar sonido"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                  ) : volume > 0.5 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                  )}
                  <span className="sr-only">{isMuted ? "Activar sonido" : "Silenciar sonido"}</span>
                </button>
                <label htmlFor="player-volume" className="sr-only">Volumen de reproducción</label>
                <input
                  type="range"
                  id="player-volume"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 accent-brand-primary h-1.5 bg-active-paper rounded-lg cursor-pointer"
                  aria-label={`Nivel de volumen. Ajusta con flechas del teclado.`}
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SECCIÓN: INICIO */}
      {activeSection === "inicio" && (
        <section className="space-y-8" aria-labelledby="inicio-title">
          <div className="bg-brand-primary/[0.03] dark:bg-brand-accent/[0.03] border border-brand-primary/10 dark:border-brand-accent/15 p-1.5 rounded-[2.2rem] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card-paper border border-border-paper/40 p-6 md:p-8 rounded-[2rem]">
              <div className="space-y-2">
                <h2 id="inicio-title" className="text-2xl md:text-3xl font-extrabold text-text-paper font-serif tracking-tight">
                  ¡Hola, {profile?.nombre || "Lector"}! 👋
                </h2>
                <p className="text-muted-paper text-sm md:text-base">
                  Bienvenido a tu biblioteca accesible de audiolibros en producción.
                </p>
              </div>
              <div className="bg-bg-paper border border-border-paper/70 px-5 py-3 rounded-2xl text-center min-w-[110px] shadow-sm">
                <span className="block text-2xl font-black text-brand-primary">{audiobooks.length}</span>
                <span className="text-[10px] text-muted-paper font-bold uppercase tracking-wider block mt-1">Obras Totales</span>
              </div>
            </div>
          </div>

          {/* Sigue Escuchando (Libros con progreso activo) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-text-paper font-serif flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" aria-hidden="true" />
              Sigue Escuchando
            </h3>

            {audiobooks.filter(b => b.progress && b.progress > 0 && b.progress < 100).length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {audiobooks.filter(b => b.progress && b.progress > 0 && b.progress < 100).map(book => (
                  <div key={book.id} className="bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2rem] shadow-sm group">
                    <article className="flex flex-col sm:flex-row gap-5 p-5 bg-card-paper border border-border-paper/40 rounded-[calc(2rem-0.375rem)] h-full" aria-labelledby={`recent-title-${book.id}`}>

                      {/* Portada clásica o remota */}
                      <div className="w-full sm:w-28 h-36 rounded-xl bg-stone-900 border-l-4 border-black/30 shrink-0 relative overflow-hidden shadow-sm" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={book.url_portada}
                          alt={`Portada de ${book.titulo}: ${book.descripcion_accesible}`}
                          className="object-cover w-full h-full"
                        />
                      </div>

                      {/* Detalles y controles */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary mb-2">
                            {book.genero}
                          </span>
                          <h4 id={`recent-title-${book.id}`} className="text-base font-bold text-text-paper font-serif line-clamp-1 group-hover:text-brand-primary transition-colors">
                            {book.titulo}
                          </h4>
                          <p className="text-muted-paper text-sm font-semibold">{book.autor}</p>
                        </div>

                        {/* Progreso accesible */}
                        <div className="space-y-2 mt-4 sm:mt-0">
                          <div className="flex justify-between text-xs text-muted-paper font-bold">
                            <span>Progreso: {book.progress}%</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuenow={book.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Progreso de reproducción de ${book.titulo}`}
                            className="w-full bg-active-paper rounded-full h-2 overflow-hidden border border-border-paper/40"
                          >
                            <div className="bg-brand-primary h-2 rounded-full transition-all duration-500" style={{ width: `${book.progress}%` }} />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePlayAudio(book)}
                          className="mt-4 flex items-center justify-center gap-2 px-5 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-paper transition-all shadow-md cursor-pointer"
                          aria-label={`Reanudar reproducción de ${book.titulo}`}
                        >
                          Reanudar
                        </button>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card-paper p-6 border border-border-paper/60 rounded-2xl text-center text-sm text-muted-paper">
                No tienes audiolibros en curso. Explora la biblioteca para comenzar alguno.
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECCIÓN: BIBLIOTECA (Consumiendo datos reales con favoritos funcionales) */}
      {activeSection === "biblioteca" && (
        <section className="space-y-8" aria-labelledby="biblioteca-title">
          <div className="space-y-4">
            <h2 id="biblioteca-title" className="text-2xl font-extrabold text-text-paper font-serif tracking-tight">
              Biblioteca del Lector
            </h2>
            <p className="text-muted-paper">Busca audiolibros reales en la base de datos y guárdalos en tus favoritos.</p>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 bg-card-paper border border-border-paper/60 p-4 rounded-2xl shadow-sm">
            <div className="flex-1">
              <label htmlFor="search-input" className="sr-only">Buscar por título o autor</label>
              <input
                type="search"
                id="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título o autor..."
                className="w-full pl-4 pr-4 py-3 bg-bg-paper border border-border-paper/80 rounded-xl text-sm text-text-paper placeholder-muted-paper focus:outline-none focus:border-brand-primary"
              />
            </div>
            <div className="w-full md:w-64">
              <label htmlFor="genre-select" className="sr-only">Filtrar por género</label>
              <select
                id="genre-select"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-4 py-3 bg-bg-paper border border-border-paper/80 rounded-xl text-sm text-text-paper focus:outline-none focus:border-brand-primary"
              >
                {genres.map(g => (
                  <option key={g} value={g}>
                    {g === "todos" ? "Todos los géneros" : g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Listado */}
          {filteredAudiobooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAudiobooks.map((book) => {
                const isFavorite = favoritosIds.includes(book.id);
                return (
                  <div key={book.id} className="bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2rem] transition-all duration-300 hover:border-brand-primary/20 shadow-sm hover:shadow-md group">
                    <article className="flex flex-col h-full bg-card-paper border border-border-paper/40 rounded-[calc(2rem-0.375rem)] overflow-hidden">

                      {/* Portada con Alt Text Accesible para NVDA */}
                      <div className="h-48 w-full bg-stone-900 border-b border-border-paper/50 border-l-4 border-black/30 relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={book.url_portada}
                          alt={`Portada de ${book.titulo}: ${book.descripcion_accesible}`}
                          className="object-cover w-full h-full"
                        />
                        <span className="absolute bottom-3 right-3 text-xs font-bold px-2 py-1 rounded-md bg-stone-900/60 text-stone-100 backdrop-blur-sm">
                          {formatDuration(book.duracion_segundos)}
                        </span>

                        {/* Botón de Favorito Funcional */}
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(book.id, book.titulo)}
                          className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isFavorite
                              ? "bg-brand-primary text-white border-transparent shadow-md"
                              : "bg-stone-900/40 text-stone-200 border-stone-200/20 hover:bg-stone-900/60"
                            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer`}
                          aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                            <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.08 22.08 0 0 1-3.743 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.006l-.002-.001Z" />
                          </svg>
                          <span className="sr-only">{isFavorite ? `Quitar "${book.titulo}" de tus favoritos` : `Guardar "${book.titulo}" en tus favoritos`}</span>
                        </button>
                      </div>

                      {/* Info */}
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <span className="inline-block text-xs font-bold text-brand-primary uppercase tracking-wider mb-1 font-serif">
                            {book.genero}
                          </span>
                          <h3 className="text-base font-bold text-text-paper font-serif line-clamp-1 group-hover:text-brand-primary transition-colors">
                            {book.titulo}
                          </h3>
                          <p className="text-muted-paper text-sm font-semibold">{book.autor}</p>
                          <p className="text-[10px] text-muted-paper mt-1">Narrado por: {book.narrador}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePlayAudio(book)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-bg-paper hover:bg-brand-primary hover:text-white text-text-paper font-bold text-sm rounded-xl transition-all duration-200 border border-border-paper hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer"
                          aria-label={`Comenzar a escuchar "${book.titulo}"`}
                        >
                          Comenzar
                        </button>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card-paper/30 border border-dashed border-border-paper/60 rounded-3xl" role="status">
              No hay audiolibros disponibles en los estantes con los filtros seleccionados.
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN: PROGRESO */}
      {activeSection === "progreso" && (
        <section className="space-y-8" aria-labelledby="progreso-title">
          <div className="space-y-4">
            <h2 id="progreso-title" className="text-2xl font-extrabold text-text-paper font-serif tracking-tight">
              Tu Progreso e Historial
            </h2>
            <p className="text-muted-paper">Estadísticas de tus audiolibros activos.</p>
          </div>

          <div className="bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2.2rem] shadow-sm">
            <div className="bg-card-paper border border-border-paper/40 rounded-[2rem] overflow-hidden">
              <table className="w-full text-left border-collapse" aria-label="Tabla de progreso de lectura">
                <thead>
                  <tr className="border-b border-border-paper bg-bg-paper text-xs font-bold text-muted-paper uppercase tracking-wider">
                    <th scope="col" className="px-6 py-4 font-serif">Audiolibro</th>
                    <th scope="col" className="px-6 py-4 font-serif">Género</th>
                    <th scope="col" className="px-6 py-4 font-serif">Duración</th>
                    <th scope="col" className="px-6 py-4 font-serif text-right">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-paper/30 text-sm text-text-paper">
                  {audiobooks.map((book) => (
                    <tr key={book.id} className="hover:bg-active-paper/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-text-paper font-serif">{book.titulo}</td>
                      <td className="px-6 py-4 font-medium">{book.genero}</td>
                      <td className="px-6 py-4 font-medium">{formatDuration(book.duracion_segundos)}</td>
                      <td className="px-6 py-4 text-right font-bold">
                        {book.progress && book.progress > 0 ? (
                          book.progress === 100 ? (
                            <span className="text-brand-forest">Completado ✨</span>
                          ) : (
                            <span className="text-brand-primary">{book.progress}% en curso</span>
                          )
                        ) : (
                          <span className="text-muted-paper font-medium">Sin iniciar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN: AJUSTES */}
      {activeSection === "ajustes" && (
        <section className="space-y-8" aria-labelledby="ajustes-title">
          <div className="space-y-4">
            <h2 id="ajustes-title" className="text-2xl font-extrabold text-text-paper font-serif tracking-tight">
              Ajustes de Preferencia
            </h2>
            <p className="text-muted-paper">Configura tus preferencias de audio.</p>
          </div>

          <div className="bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2.2rem] max-w-xl shadow-sm">
            <form className="space-y-6 bg-card-paper p-6 md:p-8 border border-border-paper/40 rounded-[2rem]" onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }}>
              <div className="space-y-2">
                <label htmlFor="profile-name-input" className="block text-sm font-bold text-text-paper font-serif">
                  Nombre del lector
                </label>
                <input
                  type="text"
                  id="profile-name-input"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper focus:outline-none focus:border-brand-primary"
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="playback-speed" className="block text-sm font-bold text-text-paper font-serif">
                  Velocidad de reproducción
                </label>
                <select
                  id="playback-speed"
                  value={playbackRate.toString()}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-bg-paper border border-border-paper/85 rounded-xl text-sm text-text-paper cursor-pointer"
                >
                  <option value="0.75">0.75x</option>
                  <option value="1">1.0x (Normal)</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x</option>
                </select>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl hover:bg-active-paper/30">
                <input
                  id="audio-descriptions"
                  type="checkbox"
                  checked={audioDescriptionsEnabled}
                  onChange={(e) => setAudioDescriptionsEnabled(e.target.checked)}
                  className="w-4.5 h-4.5 border-border-paper text-brand-primary cursor-pointer"
                />
                <label htmlFor="audio-descriptions" className="font-bold text-sm text-text-paper font-serif cursor-pointer select-none">Activar descripciones narradas</label>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-brand-primary/60 text-white font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {savingSettings ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Guardando Ajustes...</span>
                  </>
                ) : (
                  "Guardar Ajustes"
                )}
              </button>
            </form>
          </div>

          {/* Tarjeta para solicitar rol de Colaborador */}
          {profile?.rol === "Lector Activo" && (
            <div className="bg-brand-primary/[0.03] border border-brand-primary/10 p-1.5 rounded-[2.2rem] max-w-xl shadow-sm mt-8">
              <div className="bg-card-paper p-6 md:p-8 border border-border-paper/40 rounded-[2rem] space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-text-paper font-serif">
                    ¿Quieres contribuir con tus propias lecturas?
                  </h3>
                  <p className="text-sm text-muted-paper leading-relaxed">
                    Solicita convertirte en Colaborador para poder subir tus propios audiolibros, narraciones y descripciones accesibles al catálogo general de Voz Solidaria.
                  </p>
                </div>

                {profile?.solicitud_colaborador ? (
                  <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-3">
                    <svg className="h-5 w-5 text-brand-primary shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-brand-primary">
                      Solicitud enviada (Pendiente de aprobación por el administrador)
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestCollaborator}
                    className="w-full py-3.5 bg-bg-paper hover:bg-brand-primary text-text-paper hover:text-white font-bold text-sm rounded-xl transition-all duration-200 border border-border-paper hover:border-brand-primary cursor-pointer flex items-center justify-center gap-2"
                  >
                    Solicitar ser Colaborador
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
