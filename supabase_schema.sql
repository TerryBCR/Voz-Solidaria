-- =====================================================================
-- VOZ SOLIDARIA - ESQUEMA DE BASE DE DATOS INICIAL (Supabase / PostgreSQL)
-- =====================================================================
-- Este script define la estructura relacional básica, automatizaciones y
-- políticas de seguridad RLS adaptadas al frontend accesible para NVDA.

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. TABLA: perfiles
-- =====================================================================
-- PROPÓSITO ACCESIBLE: Almacena los metadatos personalizados del usuario
-- y sus opciones de visualización/lectura. Se enlaza automáticamente
-- mediante trigger con la cuenta del usuario en auth.users.

CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'Lector Activo',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.perfiles IS 'Almacena perfiles de usuarios de Voz Solidaria vinculados a la autenticación de Supabase.';
COMMENT ON COLUMN public.perfiles.nombre IS 'Nombre del lector. Se anuncia mediante NVDA en el saludo de bienvenida de la pantalla de inicio.';

-- =====================================================================
-- 2. TABLA: audiolibros
-- =====================================================================
-- PROPÓSITO ACCESIBLE: Catálogo de audiolibros. El campo 'descripcion_accesible'
-- provee un resumen contextual y descriptivo de la obra y su portada,
-- permitiendo al lector de pantalla texturizar el contenido antes de oír el audio.

CREATE TABLE public.audiolibros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    autor TEXT NOT NULL,
    narrador TEXT NOT NULL,
    genero TEXT NOT NULL,
    url_audio TEXT NOT NULL,
    url_portada TEXT NOT NULL,
    duracion_segundos INTEGER NOT NULL CHECK (duracion_segundos > 0),
    descripcion_accesible TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.audiolibros IS 'Catálogo de obras del repositorio de Voz Solidaria.';
COMMENT ON COLUMN public.audiolibros.url_audio IS 'Enlace público o firmado al archivo .mp3 alojado en el Supabase Storage.';
COMMENT ON COLUMN public.audiolibros.duracion_segundos IS 'Duración total en segundos. Permite al reproductor accesible del frontend calcular progresos finos.';
COMMENT ON COLUMN public.audiolibros.descripcion_accesible IS 'VITAL PARA NVDA. Texto descriptivo detallado del diseño de la portada, colores, y sinopsis extendida del libro.';

-- =====================================================================
-- 3. TABLA: favoritos
-- =====================================================================
-- PROPÓSITO ACCESIBLE: Conecta las cuentas de los lectores con las obras
-- que añaden a su biblioteca privada para lectura o escucha prioritaria.

CREATE TABLE public.favoritos (
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL,
    audiolibro_id UUID REFERENCES public.audiolibros(id) ON DELETE CASCADE NOT NULL,
    guardado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (perfil_id, audiolibro_id)
);

COMMENT ON TABLE public.favoritos IS 'Tabla intermedia para relacionar usuarios con sus audiolibros favoritos.';

-- =====================================================================
-- 4. TABLA: progreso_lectura
-- =====================================================================
-- PROPÓSITO ACCESIBLE: Permite persistir el estado de la reproducción en curso.
-- Esto alimenta las barras de progreso del frontend y la sección "Sigue Escuchando",
-- permitiendo que NVDA anuncie el porcentaje de avance restante al usuario.

CREATE TABLE public.progreso_lectura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL,
    audiolibro_id UUID REFERENCES public.audiolibros(id) ON DELETE CASCADE NOT NULL,
    progreso_porcentaje INTEGER NOT NULL DEFAULT 0 CHECK (progreso_porcentaje >= 0 AND progreso_porcentaje <= 100),
    ultima_posicion_segundos INTEGER NOT NULL DEFAULT 0 CHECK (ultima_posicion_segundos >= 0),
    actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (perfil_id, audiolibro_id)
);

COMMENT ON TABLE public.progreso_lectura IS 'Registra el avance exacto de reproducción de cada audiolibro por usuario.';

-- =====================================================================
-- AUTOMATIZACIÓN: Creación de Perfil Automática
-- =====================================================================
-- Función y trigger para insertar un perfil en public.perfiles
-- tan pronto como un nuevo usuario se registra a través de Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre, rol, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Nuevo Lector'),
        'Lector Activo',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- SEGURIDAD: Políticas de Nivel de Fila (RLS)
-- =====================================================================
-- Habilitar RLS en todas las tablas para proteger la integridad
-- de la información y asegurar privacidad de lectura.

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiolibros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progreso_lectura ENABLE ROW LEVEL SECURITY;

-- Políticas para 'perfiles'
CREATE POLICY "Los usuarios pueden leer su propio perfil" ON public.perfiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" ON public.perfiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para 'audiolibros' (Lectura libre para usuarios registrados)
CREATE POLICY "Cualquier usuario autenticado puede leer audiolibros" ON public.audiolibros
    FOR SELECT TO authenticated USING (true);

-- Políticas para 'favoritos' (Privacidad completa por usuario)
CREATE POLICY "Los usuarios pueden ver sus favoritos" ON public.favoritos
    FOR SELECT USING (auth.uid() = perfil_id);

CREATE POLICY "Los usuarios pueden añadir favoritos" ON public.favoritos
    FOR INSERT WITH CHECK (auth.uid() = perfil_id);

CREATE POLICY "Los usuarios pueden quitar favoritos" ON public.favoritos
    FOR DELETE USING (auth.uid() = perfil_id);

-- Políticas para 'progreso_lectura' (Privacidad completa del avance)
CREATE POLICY "Los usuarios pueden ver su progreso" ON public.progreso_lectura
    FOR SELECT USING (auth.uid() = perfil_id);

CREATE POLICY "Los usuarios pueden insertar su progreso" ON public.progreso_lectura
    FOR INSERT WITH CHECK (auth.uid() = perfil_id);

CREATE POLICY "Los usuarios pueden actualizar su progreso" ON public.progreso_lectura
    FOR UPDATE USING (auth.uid() = perfil_id);
