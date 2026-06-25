-- =====================================================================
-- VOZ SOLIDARIA - SCRIPT DE ACTUALIZACIÓN DE MODERACIÓN Y ROLES (Supabase)
-- =====================================================================
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase para habilitar
-- el flujo de moderación de audiolibros y las solicitudes de rol.

-- 1. Modificar la tabla 'audiolibros' para añadir 'aprobado'
ALTER TABLE public.audiolibros 
ADD COLUMN IF NOT EXISTS aprobado BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.audiolibros.aprobado IS 'Indica si el audiolibro ha sido aprobado por un administrador (visible en catálogo general).';

-- 2. Modificar la tabla 'perfiles' para añadir 'solicitud_colaborador'
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS solicitud_colaborador BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.perfiles.solicitud_colaborador IS 'Indica si el lector ha solicitado convertirse en colaborador.';

-- 3. Crear función auxiliar con SECURITY DEFINER para verificar si el usuario es Admin.
-- Esto evita recursión infinita en las políticas RLS sobre la propia tabla 'perfiles'.
CREATE OR REPLACE FUNCTION public.es_admin(usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE id = usuario_id AND rol = 'Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Actualizar políticas RLS para la tabla 'perfiles'
-- Primero eliminamos las políticas existentes de lectura y actualización
DROP POLICY IF EXISTS "Los usuarios pueden leer su propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.perfiles;

-- A) SELECT: Un usuario puede leer su propio perfil, y los administradores pueden leer todos los perfiles.
CREATE POLICY "Lectura de perfiles propia y de Admin" ON public.perfiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id OR
        public.es_admin(auth.uid())
    );

-- B) UPDATE: Un usuario puede actualizar su propio perfil, y los administradores pueden actualizar cualquier perfil.
CREATE POLICY "Actualizacion de perfiles propia y de Admin" ON public.perfiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id OR
        public.es_admin(auth.uid())
    )
    WITH CHECK (
        auth.uid() = id OR
        public.es_admin(auth.uid())
    );

-- 5. Actualizar políticas RLS para la tabla 'audiolibros'
-- Queremos restringir la lectura y la eliminación de audiolibros.
DROP POLICY IF EXISTS "Lectores y colaboradores pueden ver catálogo" ON public.audiolibros;
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede leer audiolibros" ON public.audiolibros;

-- A) SELECT: Todos pueden ver audiolibros aprobados. El creador y los administradores pueden ver los no aprobados.
CREATE POLICY "Lectura segura de audiolibros aprobados o propios" ON public.audiolibros
    FOR SELECT TO authenticated
    USING (
        aprobado = true
        OR subido_por = auth.uid()
        OR public.es_admin(auth.uid())
    );

-- B) DELETE: Los admins pueden eliminar todo. Los colaboradores solo sus obras no aprobadas.
DROP POLICY IF EXISTS "Admin y Colaboradores (propios) pueden eliminar audiolibros" ON public.audiolibros;

CREATE POLICY "Admin y Colaboradores pueden eliminar sus obras no aprobadas" ON public.audiolibros
    FOR DELETE TO authenticated
    USING (
        public.es_admin(auth.uid())
        OR (
            subido_por = auth.uid()
            AND aprobado = false
        )
    );
