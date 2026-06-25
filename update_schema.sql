-- =====================================================================
-- VOZ SOLIDARIA - SCRIPT DE ACTUALIZACIÓN DE BASE DE DATOS (Supabase / PostgreSQL)
-- =====================================================================
-- Ejecuta este script en el SQL Editor para habilitar la jerarquía de roles
-- y configurar los accesos de Supabase Storage para audiolibros.

-- 1. Modificar la tabla 'audiolibros' para añadir 'subido_por'
ALTER TABLE public.audiolibros 
ADD COLUMN IF NOT EXISTS subido_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.audiolibros.subido_por IS 'ID del perfil (Colaborador o Admin) que subió el audiolibro.';

-- 2. Limpiar políticas RLS antiguas de la tabla audiolibros
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer audiolibros" ON public.audiolibros;
DROP POLICY IF EXISTS "Lectores y colaboradores pueden ver catálogo" ON public.audiolibros;
DROP POLICY IF EXISTS "Admin y Colaboradores pueden insertar audiolibros" ON public.audiolibros;
DROP POLICY IF EXISTS "Admin y Colaboradores (propios) pueden actualizar audiolibros" ON public.audiolibros;
DROP POLICY IF EXISTS "Admin y Colaboradores (propios) pueden eliminar audiolibros" ON public.audiolibros;

-- 3. Definir nuevas políticas de seguridad RLS basadas en Roles de Perfil

-- A) SELECT: Lectores Activos, Colaboradores y Admins pueden ver todo el catálogo.
CREATE POLICY "Lectores y colaboradores pueden ver catálogo" ON public.audiolibros
    FOR SELECT TO authenticated USING (true);

-- B) INSERT: Solo Administradores y Colaboradores pueden registrar nuevos audiolibros.
-- El colaborador debe marcarse a sí mismo como el dueño de la subida.
CREATE POLICY "Admin y Colaboradores pueden insertar audiolibros" ON public.audiolibros
    FOR INSERT TO authenticated 
    WITH CHECK (
        (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Admin'
        OR 
        (
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Colaborador' 
            AND subido_por = auth.uid()
        )
    );

-- C) UPDATE: Los Admins pueden editar todo. Los Colaboradores solo pueden editar sus propios audiolibros.
CREATE POLICY "Admin y Colaboradores (propios) pueden actualizar audiolibros" ON public.audiolibros
    FOR UPDATE TO authenticated
    USING (
        (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Admin'
        OR
        (
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Colaborador' 
            AND subido_por = auth.uid()
        )
    )
    WITH CHECK (
        (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Admin'
        OR
        (
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Colaborador' 
            AND subido_por = auth.uid()
        )
    );

-- D) DELETE: Los Admins pueden eliminar todo. Los Colaboradores solo pueden eliminar sus propios audiolibros.
CREATE POLICY "Admin y Colaboradores (propios) pueden eliminar audiolibros" ON public.audiolibros
    FOR DELETE TO authenticated
    USING (
        (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Admin'
        OR
        (
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Colaborador' 
            AND subido_por = auth.uid()
        )
    );

-- =====================================================================
-- 4. CONFIGURACIÓN DE SUPABASE STORAGE (Bucket: audiolibros)
-- =====================================================================
-- Crear el bucket de almacenamiento para alojar los audios MP3 y carátulas de portada.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('audiolibros', 'audiolibros', true)
ON CONFLICT (id) DO NOTHING;

-- Limpiar políticas anteriores en storage.objects
DROP POLICY IF EXISTS "Acceso de lectura a audiolibros público" ON storage.objects;
DROP POLICY IF EXISTS "Admin y Colaboradores pueden subir audiolibros" ON storage.objects;
DROP POLICY IF EXISTS "Admin y Colaboradores pueden eliminar archivos de audiolibros" ON storage.objects;

-- A) SELECT: Permitir lectura pública de audios y portadas en el bucket.
CREATE POLICY "Acceso de lectura a audiolibros público" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'audiolibros');

-- B) INSERT: Solo Colaboradores y Admins pueden subir archivos a este bucket.
CREATE POLICY "Admin y Colaboradores pueden subir audiolibros" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'audiolibros' AND (
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Admin'
            OR
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Colaborador'
        )
    );

-- C) DELETE: Solo Colaboradores y Admins pueden eliminar archivos de este bucket.
CREATE POLICY "Admin y Colaboradores pueden eliminar archivos de audiolibros" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'audiolibros' AND (
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Admin'
            OR
            (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'Colaborador'
        )
    );
