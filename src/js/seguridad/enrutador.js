/**
 * PET PROTECT - Servicio de Enrutamiento Inteligente (RBAC)
 * Arquitectura: Basada en diccionarios para escalabilidad modular.
 * Seguridad: Validación de integridad de grado médico y estado de suscripción.
 */

// Diccionario centralizado de rutas para facilitar el mantenimiento (DRY)
const RUTAS = {
    ACCESO: '/LOGIN.html',
    REGISTRO_CLINICA: '/ONBOARDING.html',
    PAGO_PENDIENTE: '/SELECCION_PLAN.html',
    TABLERO_OPERATIVO: '/PRINCIPAL.html', // Bento Grid para Médicos y Asistentes
    TABLERO_ADMIN: '/PRINCIPAL.html', // Redirigido a SPA shell — el router interno gestiona el módulo admin
    CUENTA_SUSPENDIDA: '/AVISO_SUSPENSION.html'
};

/**
 * Determina la ruta autorizada evaluando la tríada: Perfil + Suscripción + Estado Operativo.
 * @param {Object} perfil - Datos del usuario desde la base de datos centralizada.
 * @param {Object} organizacion - Datos de la clínica (plan y estado de cuenta).
 * @returns {String} URL absoluta de destino optimizada para el flujo de trabajo.
 */
export const determinarRutaDestino = (perfil, organizacion = {}) => {
    const urlBase = window.location.origin;
    
    // 1. NORMALIZACIÓN Y SEGURIDAD INICIAL
    const rol = perfil.rol?.toLowerCase() || 'nuevo';
    const plan = organizacion.plan_suscripcion?.toLowerCase() || 'inicial';
    const estaActiva = organizacion.activo ?? true; // Validación de grado médico

    console.info(`[PET PROTECT SEGURIDAD] Evaluando acceso para: ${rol} | Plan: ${plan}`);

    // =========================================================
    // BLOQUE 1: VALIDACIONES CRÍTICAS DE NEGOCIO (BLOQUEANTES)
    // =========================================================

    // CASO: Clínica suspendida (Falta de pago o violación de términos)
    if (!estaActiva && rol !== 'superadmin') {
        return `${urlBase}${RUTAS.ACCESO}?error=clinica_suspendida`;
    }

    // CASO: Usuario sin vinculación (Flujo de registro interrumpido)
    if (rol === 'nuevo' || !perfil.organizacion_id) {
        return `${urlBase}${RUTAS.REGISTRO_CLINICA}`;
    }

    // CASO: Dueño con configuración de plan pendiente
    if (rol === 'superadmin' && perfil.onboarding_listo === false) {
        return `${urlBase}${RUTAS.PAGO_PENDIENTE}`;
    }

    // =========================================================
    // BLOQUE 2: REGLAS DE FLUJO OPERATIVO (REDUCCIÓN DE CLICS)
    // =========================================================

    /**
     * MANDATO DE PROACTIVIDAD:
     * Redirigimos a PRINCIPAL.html (Vista Operativa) si:
     * - El plan es INICIAL (El dueño hace todo: Triage, Consulta, Caja).
     * - El usuario es VETERINARIO o ASISTENTE (Su mundo es la operación).
     * - El OWNER tiene activado el "Sombrero" de Médico o Asistente.
     */
    
    const esPersonalOperativo = (rol === 'veterinario' || rol === 'asistente');
    const esPlanInicial = (plan === 'inicial');
    const esSuperadminMultitarea = (rol === 'superadmin' && (perfil.funge_como_medico || perfil.funge_como_asistente));

    if (esPlanInicial || esPersonalOperativo || esSuperadminMultitarea) {
        // En PRINCIPAL.html, el script de UI debe usar etiquetas semánticas y ARIA 
        // para ocultar/mostrar widgets del Bento Grid según el permiso.
        return `${urlBase}${RUTAS.TABLERO_OPERATIVO}`;
    }

    // =========================================================
    // BLOQUE 3: ENRUTAMIENTO GERENCIAL (PLANES PRO/HOSPITAL)
    // =========================================================
    
    if (rol === 'superadmin' || rol === 'administrador') {
        // El dueño en modo "Gerente" o el Administrador de RRHH/Finanzas
        return `${urlBase}${RUTAS.TABLERO_ADMIN}`;
    }

    // =========================================================
    // BLOQUE 4: PROTECCIÓN "CONFIDENCIALIDAD CERO" (FALLBACK)
    // =========================================================
    
    console.error("[FALLO DE SEGURIDAD] Intento de acceso no mapeado. Perfil:", perfil);
    return `${urlBase}${RUTAS.ACCESO}`;
};