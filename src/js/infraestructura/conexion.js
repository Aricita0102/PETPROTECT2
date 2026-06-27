// Archivo: /src/js/conexion.js
import { createClient } from '@supabase/supabase-js';

// ====================================================================================
// 1. CONFIGURACIÓN Y VALIDACIÓN DE ENTORNO
// ====================================================================================
// Validamos proactivamente que las llaves existan para evitar errores crípticos.
const urlProyecto = import.meta.env.VITE_SUPABASE_URL; 
const llaveAnonima = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!urlProyecto || !llaveAnonima) {
    console.error('[PET PROTECT ERROR]: Faltan las credenciales de base de datos en el archivo .env');
}

// ====================================================================================
// 2. INICIALIZACIÓN DEL CLIENTE (SINGLETON)
// ====================================================================================
export const conexionSupabase = createClient(urlProyecto, llaveAnonima, {
    auth: {
        autoRefreshToken: true,   // Esencial para que el veterinario no pierda la sesión en cirugías largas
        persistSession: true,      // Mantiene al asistente logueado tras refrescar la página
        detectSessionInUrl: true   // Soporte para autenticación externa
    }
});

// ====================================================================================
// 3. UTILIDADES DE ACCESO SEGURO (ZERO-FOOTPRINT PERSONALIZATION)
// ====================================================================================

/**
 * Obtiene la sesión activa de forma segura.
 * @returns {Promise<Object|null>} El usuario autenticado o null.
 */
export async function obtenerUsuarioActual() {
    try {
        const { data: { user }, error } = await conexionSupabase.auth.getUser(); // getUser es más seguro que getSession (valida el token con el server)
        if (error) throw error;
        return user;
    } catch (error) {
        console.warn('[ACCESO]: No se detectó una sesión válida.');
        return null;
    }
}

/**
 * Limpia la sesión y redirige al personal al punto de entrada.
 */
export async function cerrarSesionSegura() {
    console.log('[SISTEMA]: Cerrando sesión de grado médico...');
    const { error } = await conexionSupabase.auth.signOut();
    if (!error) {
        // En Vite, se prefiere la ruta absoluta para evitar colisiones de navegación
        window.location.assign('/LOGIN.html'); 
    }
}