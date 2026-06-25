import { supabase } from "./supabaseClient";

/**
 * Sube un archivo al bucket 'audiolibros' de Supabase Storage.
 * @param file Archivo a subir (Audio MP3 o Imagen de Portada).
 * @param folder Carpeta de destino ('audio' o 'portadas').
 * @param onProgress Callback para notificar el porcentaje de progreso de subida.
 * @returns La URL pública del archivo subido o lanza un error.
 */
export async function uploadFileToStorage(
  file: File,
  folder: "audio" | "portadas",
  onProgress?: (progress: number) => void
): Promise<string> {
  // Generar un nombre único para evitar colisiones
  const fileExtension = file.name.split(".").pop();
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

  // Supabase JS SDK v2 soporte nativo de progreso de subida (en navegadores modernos)
  const { error } = await supabase.storage
    .from("audiolibros")
    .upload(uniqueName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Error en la subida a Storage: ${error.message}`);
  }

  // Notificar al 100% una vez completado
  if (onProgress) {
    onProgress(100);
  }

  // Obtener la URL pública
  const { data: publicUrlData } = supabase.storage
    .from("audiolibros")
    .getPublicUrl(uniqueName);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("No se pudo generar la URL pública del archivo subido.");
  }

  return publicUrlData.publicUrl;
}
