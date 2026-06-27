/**
 * SISTEMA: PET PROTECT (Ecosistema Quetzalia)
 * MÓDULO: Store de Sesión — Patrón Singleton
 * RUTA: /src/js/infraestructura/sesion_store.js
 *
 * PROPÓSITO: Centraliza la identidad del usuario activo en memoria.
 * Elimina la cascada de peticiones redundantes a auth.getUser() y
 * a la tabla 'perfiles' que antes se repetía en cada módulo del SPA.
 *
 * CONTRATO DE USO:
 *   - Primera llamada: realiza 1 petición de red a auth + 1 query a perfiles.
 *   - Llamadas subsiguientes: retorna el objeto en memoria (latencia ~0ms).
 *   - Al cerrar sesión, llamar a limpiarSesion() para invalidar el caché.
 */
import { conexionSupabase } from './conexion.js';

// ─── Estado interno (no exportado) ───────────────────────────────────────────
let _sesion = null;

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Obtiene la sesión activa del usuario. Ejecuta la petición de red
 * solo en la primera llamada; el resto son hits de caché en memoria.
 * @returns {Promise<{user: object, perfil: object}|null>}
 */
export async function obtenerSesionActiva() {
    // Cache hit — retorna inmediatamente sin tráfico de red
    if (_sesion) {
        return _sesion;
    }

    try {
        // Petición de red #1: Validar JWT con el servidor de Supabase
        const { data: { user }, error: authError } = await conexionSupabase.auth.getUser();

        if (authError || !user) {
            console.warn('[SESIÓN] No hay usuario autenticado o el token expiró.');
            return null;
        }

        // Petición de red #2: Un único SELECT con todos los campos que los módulos necesitan
        const { data: perfil, error: perfilError } = await conexionSupabase
            .from('perfiles')
            .select('id, nombre_completo, rol, avatar_url, organizacion_id, sucursal_id, horario_atencion')
            .eq('id', user.id)
            .single();

        if (perfilError) {
            console.error('[SESIÓN] Error al obtener el perfil del usuario:', perfilError);
            return null;
        }

        // Sanitización estructural: Asegurar que horario_atencion siempre sea un objeto vivo en memoria
        if (perfil.horario_atencion && typeof perfil.horario_atencion === 'string') {
            try {
                perfil.horario_atencion = JSON.parse(perfil.horario_atencion);
            } catch (e) {
                console.warn("[SESIÓN] No se pudo parsear horario_atencion desde la BD:", e);
            }
        }

        // Guardar en memoria — todas las llamadas futuras serán O(1)
        _sesion = { user, perfil };
        console.info(`[SESIÓN] Identidad resuelta y almacenada en caché para: ${user.email}`);
        return _sesion;

    } catch (error) {
        console.error('[SESIÓN] Excepción crítica al inicializar la sesión:', error);
        return null;
    }
}

/**
 * Invalida el caché de sesión. Debe llamarse al ejecutar cerrarSesionSegura().
 */
export function limpiarSesion() {
    console.log('[SESIÓN] Caché de identidad limpiado.');
    _sesion = null;
}

/**
 * Permite mutar la caché local en memoria tras un guardado en BD.
 * Evita la necesidad de recargar la página o hacer un nuevo fetch.
 * @param {object} nuevosDatos - Los datos a fusionar en el perfil cacheado.
 */
export const actualizarDatosPerfil = (nuevosDatos) => {
    if (_sesion && _sesion.perfil) {
        // Fusiona los datos nuevos con los existentes en el estado central
        _sesion.perfil = { ..._sesion.perfil, ...nuevosDatos };
        console.log("Caché central actualizada:", _sesion.perfil);
    }
};
