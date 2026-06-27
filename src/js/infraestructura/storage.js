/**
 * PETPROTECT - Storage Utility Module
 * Manejo de rutas dinámicas para arquitectura Multi-Tenant
 * Modificado para: Bucket 'recursos_clinica' (Vite Compatible)
 */

const StorageService = {
  
  /**
   * Limpia el nombre del archivo para evitar errores en URLs y sistemas de archivos.
   * Elimina caracteres especiales y sustituye espacios por guiones bajos.
   */
  sanitizeFileName: (fileName) => {
    return fileName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
      .replace(/[^a-z0-9.\-_]/g, "_") // Cambia caracteres especiales por _
      .replace(/\s+/g, "_");          // Cambia espacios por _
  },

  /**
   * Genera la ruta (path) consistente para Supabase Storage / S3.
   * Estructura: [organizacion_id]/[entidad]/[id_entidad]/[subcarpeta]/[archivo]
   */
  getStoragePath: (orgId, entity, entityId, subFolder = '', fileName) => {
    if (!orgId || !entity || !fileName) {
      throw new Error("Faltan parámetros obligatorios para generar la ruta de almacenamiento.");
    }

    const cleanName = StorageService.sanitizeFileName(fileName);
    const base = orgId; // El Multi-Tenant manda: todo empieza por el ID de la organización

    switch (entity) {
      case 'branding':
        // Ejemplo: org-123/branding/logo_principal.png
        return `${base}/branding/${cleanName}`;

      case 'personal':
        // Ejemplo: org-123/personal/user-456/avatar/foto.jpg
        return `${base}/personal/${entityId}/${subFolder}/${cleanName}`;

      case 'clientes':
        // Ejemplo: org-123/clientes/cli-789/identificacion/rfc.pdf
        return `${base}/clientes/${entityId}/identificacion/${cleanName}`;

      case 'pacientes':
        // Ejemplo: org-123/pacientes/pac-001/estudios_medicos/radiografia.png
        // Subcarpetas recomendadas: 'fotos_perfil', 'estudios_medicos', 'consentimientos'
        return `${base}/pacientes/${entityId}/${subFolder}/${cleanName}`;

      case 'consultas':
        // Ejemplo: org-123/consultas/con-999/recetas_pdf/receta_folio_1.pdf
        // Subcarpetas recomendadas: 'recetas_pdf'
        return `${base}/consultas/${entityId}/${subFolder}/${cleanName}`;
case 'tienda':
    // Ejemplo: org-123/tienda/prod-888/fotos/imagen.png
    return `${base}/tienda/${entityId}/${subFolder}/${cleanName}`;
      case 'estudios':
        // Ejemplo: org-123/pacientes/pac-001/estudios_clinicos/est-555/archivo.jpg
        return `${base}/pacientes/${entityId}/${subFolder}/${cleanName}`;

      default:
        throw new Error(`La entidad "${entity}" no está definida en la arquitectura de Storage.`);
    }
  },

  /**
   * Función centralizada para subir archivos.
   * Optimizada para Vite y Supabase v2.
   */
  uploadToProtectPet: async (supabase, { file, orgId, entity, entityId, subFolder, bucketName = 'recursos_clinica' }) => {
    try {
      const path = StorageService.getStoragePath(orgId, entity, entityId, subFolder, file.name);
      
      // 1. Subir el archivo al bucket
      const { data, error } = await supabase.storage
        .from(bucketName) 
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true, // 'true' permite sobrescribir si se sube un archivo con el mismo nombre exacto
          contentType: file.type // 🛡️ [CORRECCIÓN DE GRADO MÉDICO]: Fuerza el reconocimiento como imagen (PNG/JPG)
        });

      if (error) throw error;
      
      // 2. FORMA NATIVA (A prueba de Vite): Obtener la URL pública directamente de Supabase
      // Esto elimina por completo la dependencia de process.env o import.meta.env
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);
      
      return {
        path: data.path,
        fullUrl: publicUrlData.publicUrl
      };
      
    } catch (err) {
      console.error("Error Crítico en StorageService (Grado Médico):", err.message);
      // Retornamos el error formateado para que el frontend pueda mostrar un Toast o Alerta
      return { error: err.message }; 
    }
  }
};

export default StorageService;