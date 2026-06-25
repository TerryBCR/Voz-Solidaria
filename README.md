# Voz Solidaria 📚🎙️

**Voz Solidaria** es una plataforma accesible de audiolibros construida con **Next.js**, **TypeScript**, **Tailwind CSS**, **Zustand** y **Supabase**. El objetivo principal de este repositorio es lograr una accesibilidad estricta bajo las directrices **WCAG 2.2**, optimizada especialmente para usuarios del lector de pantalla **NVDA**.

---

## 🤖 Sistema de Sub-Agentes de Desarrollo

Para garantizar la calidad técnica y el cumplimiento de las normativas de accesibilidad en cada fase del desarrollo, operamos bajo un esquema de tres sub-agentes coordinados:

1. **Agente de Accesibilidad (Experto en WCAG y NVDA):**
   - **Misión:** Validar que todo el código HTML, marcado JSX, componentes de interfaz y dinámicas de interacción sean 100% compatibles con el lector de pantalla NVDA.
   - **Reglas:**
     - Exigir marcado semántico estricto.
     - Auditar el orden de tabulación y asegurar que no haya "trampas de foco" (focus traps) no deseadas.
     - Garantizar que las etiquetas dinámicas y estados se anuncien correctamente mediante áreas `aria-live` o cambios de atributos como `aria-expanded`.
     - Validar que todo elemento interactivo responda a la tecla `Enter` y `Espacio`.

2. **Agente Frontend (Experto en React, Tailwind CSS y Zustand):**
   - **Misión:** Desarrollar interfaces modernas, responsivas y de alto rendimiento.
   - **Reglas:**
     - Asegurar un diseño visual premium y pulido.
     - Configurar y aplicar estilos focales dinámicos (`focus-visible`).
     - Gestionar el estado global de la aplicación de manera eficiente con **Zustand**.
     - Evitar componentes sobredimensionados y reutilizar componentes semánticos y modulares.

3. **Agente Backend (Experto en Supabase y Bases de Datos):**
   - **Misión:** Diseñar e integrar la capa de datos y lógica del servidor de manera óptima y segura.
   - **Reglas:**
     - Definir esquemas de base de datos relacionales robustos en Supabase.
     - Asegurar políticas de seguridad de nivel de fila (RLS) estrictas.
     - Diseñar APIs y consultas de base de datos eficientes para el almacenamiento de audiolibros e historial de reproducción.

---

## ♿ Directrices de Accesibilidad Estrictas (Foco en NVDA)

Para que la experiencia con **NVDA** sea sobresaliente, todo desarrollador y agente debe seguir estas reglas:

### 1. Marcado Semántico vs. Genérico
- **Prohibido:** Usar `div` o `span` con eventos `onClick` sin proveer soporte de accesibilidad completo.
- **Permitido:** Utilizar elementos HTML5 nativos (`button`, `a`, `input`, `select`, `header`, `nav`, `main`, `aside`, `section`, `footer`).
- Si se requiere crear un componente interactivo a partir de un elemento no nativo, se **debe** incluir:
  - `role="button"` (o el rol ARIA correspondiente).
  - `tabIndex={0}` para que sea enfocable.
  - Eventos de teclado (`onKeyDown` o `onKeyPress`) que escuchen las teclas `Enter` (código 13) y `Space` (código 32).

### 2. Navegación por Teclado y Enfoque Visible
- Toda la aplicación debe ser completamente navegable usando únicamente el teclado (`Tab`, `Shift + Tab`, `Enter`, `Space`, y flechas de dirección cuando corresponda).
- El foco del teclado no debe ocultarse nunca. Se deben usar estilos claros en Tailwind:
  - Ejemplo: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20`
- Se debe implementar un enlace de **"Saltar al contenido principal"** (`Skip to main content`) justo al principio del documento (primer elemento enfocable) para permitir a los usuarios saltar la navegación repetitiva del header/sidebar.

### 3. Roles y Atributos ARIA
- **Estructura de Navegación:** El Header y Sidebar de navegación deben usar etiquetas `<nav>` con roles descriptivos o nombres accesibles (p. ej., `aria-label="Navegación principal"`).
- **Controles Desplegables:** Cualquier menú, acordeón o sidebar colapsable debe indicar su estado dinámico con `aria-expanded="true|false"` y asociar su control con el panel mediante `aria-controls`.
- **Elementos Ocultos:** Si un elemento solo debe ser visual pero oculto para NVDA, usar `aria-hidden="true"`. Si solo debe ser leído por NVDA pero oculto visualmente, usar la clase de Tailwind `sr-only`.

### 4. Anuncios Dinámicos (`aria-live`)
- Al cargar audiolibros, reproducir pistas o cambiar el volumen, se deben utilizar regiones `aria-live="polite"` para anunciar los cambios de estado a NVDA sin interrumpir la lectura actual del usuario.

---

## 🛠️ Instalación y Desarrollo

1. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```
2. Ejecutar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Ejecutar el validador de código y accesibilidad:
   ```bash
   npm run lint
   ```
