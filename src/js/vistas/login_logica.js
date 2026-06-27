/**
 * PET PROTECT - Controlador de Acceso Médico
 * Objetivo: Gestionar la identidad del personal con validación doble, latencia mínima y auto-login.
 * Especialidades: Seguridad NoSQL y UX de alta velocidad.
 */

// 1. IMPORTACIONES CORREGIDAS
import { conexionSupabase, obtenerUsuarioActual } from '../infraestructura/conexion.js';
import { determinarRutaDestino } from '../seguridad/enrutador.js';

// --- REFERENCIAS A LA UI ---
const formularioAcceso = document.getElementById('formLogin');
const entradaCorreo = document.getElementById('correoLogin');
const entradaClave = document.getElementById('passLogin');
const botonAccion = document.querySelector('button[type="submit"]');
const botonToggleClave = document.getElementById('btnTogglePass');

// ==========================================================================
// INICIALIZACIÓN PROACTIVA (AUTO-LOGIN Y EVENTOS UI)
// ==========================================================================

/**
 * Activa la funcionalidad de mostrar/ocultar contraseña (UX de precisión).
 * Mantenemos el HTML limpio de JS inline por seguridad.
 */
function inicializarTogglePassword() {
    if (botonToggleClave && entradaClave) {
        botonToggleClave.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir cualquier efecto de click default
            const esPassword = entradaClave.type === 'password';
            entradaClave.type = esPassword ? 'text' : 'password';
            
            if (esPassword) {
                // Icono ojo tachado (visible)
                botonToggleClave.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            } else {
                // Icono ojo abierto (oculto)
                botonToggleClave.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        });
    }
}

/**
 * Verifica si el médico o asistente ya tiene una sesión válida en el navegador.
 * Ahorra valiosos segundos en situaciones de Triage.
 */
const verificarSesionActiva = async () => {
    const usuarioActivo = await obtenerUsuarioActual();
    
    if (usuarioActivo) {
        actualizarEstadoUI('cargando');
        try {
            // Revalidamos el perfil y plan antes de dejarlo pasar silenciosamente
            const { data: perfil, error } = await conexionSupabase
                .from('perfiles')
                .select('*, organizaciones(plan_suscripcion, activo)')
                .eq('id', usuarioActivo.id)
                .single();

            if (!error && perfil && perfil.organizaciones?.activo !== false) {
                const planActual = perfil.organizaciones?.plan_suscripcion || 'inicial';
                const destino = determinarRutaDestino(perfil, planActual);
                window.location.assign(destino);
            } else {
                // Si la cuenta fue suspendida o borrada mientras estaba logueado
                await conexionSupabase.auth.signOut();
                actualizarEstadoUI('normal');
            }
        } catch (err) {
            actualizarEstadoUI('normal');
        }
    }
};

// ==========================================================================
// VALIDACIÓN Y ORQUESTACIÓN DE ACCESO
// ==========================================================================

/**
 * VALIDACIÓN PROACTIVA (Front-end)
 * Aplicamos reglas estrictas antes de tocar el servidor para ahorrar recursos.
 */
const validarSeguridadEntradas = (correo, clave) => {
    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio || clave.length < 8) {
        // Mensaje genérico para evitar ataques de enumeración
        notificarUsuario("Credenciales inválidas. Revisa el formato y longitud.");
        return { esValido: false };
    }

    if (!patronCorreo.test(correoLimpio)) {
        notificarUsuario("El formato de correo institucional es incorrecto.");
        return { esValido: false };
    }

    return { esValido: true, correoLimpio };
};

/**
 * ORQUESTADOR DE INICIO DE SESIÓN
 */
const ejecutarInicioSesion = async (evento) => {
    evento.preventDefault();
    
    const { esValido, correoLimpio } = validarSeguridadEntradas(entradaCorreo.value, entradaClave.value);
    if (!esValido) return;

    try {
        actualizarEstadoUI('cargando');

        // 1. AUTENTICACIÓN (Capa 1: Supabase Auth)
        const { data: sesionAuth, error: errorAuth } = await conexionSupabase.auth.signInWithPassword({
            email: correoLimpio,
            password: entradaClave.value
        });

        // REGLA DE ORO: Si falla el Auth, no damos pistas de qué falló (correo o clave)
        if (errorAuth) throw new Error("Correo o contraseña incorrectos");

        // 2. CONSULTA RELACIONAL (Capa 2: Autorización y Perfil)
        const { data: perfil, error: errorPerfil } = await conexionSupabase
            .from('perfiles')
            .select(`
                *,
                organizaciones (
                    plan_suscripcion,
                    activo
                )
            `)
            .eq('id', sesionAuth.user.id)
            .single();

        // Validación de Integridad de Datos Médicos
        if (errorPerfil || !perfil) {
            await conexionSupabase.auth.signOut();
            throw new Error("Perfil médico no localizado. Contacte al Administrador.");
        }

        // Validación de Estado de la Clínica (Business Logic)
        if (perfil.organizaciones?.activo === false) {
            await conexionSupabase.auth.signOut();
            throw new Error("Suscripción suspendida. Contacte a Soporte PET PROTECT.");
        }

        // 3. ÉXITO VISUAL (Micro-interacción UX)
        actualizarEstadoUI('exito', perfil.nombre_completo);

        // 4. REDIRECCIÓN INTELIGENTE
        setTimeout(() => {
            const planActual = perfil.organizaciones?.plan_suscripcion || 'inicial';
            const destino = determinarRutaDestino(perfil, planActual);
            window.location.assign(destino);
        }, 800);

    } catch (error) {
        console.error(`[SEGURIDAD LOG]: Fallo de acceso -> ${error.message}`);
        actualizarEstadoUI('error');
        notificarUsuario(error.message);
        
        // Limpiamos clave por seguridad post-fallo
        if(entradaClave) entradaClave.value = "";
    }
};

// ==========================================================================
// GESTIÓN DE ESTADOS VISUALES (DRY & UX)
// ==========================================================================

function actualizarEstadoUI(estado, datos = "") {
    switch (estado) {
        case 'cargando':
            botonAccion.disabled = true;
            botonAccion.innerHTML = `<span class="animacion-latido"></span> Verificando...`;
            botonAccion.style.opacity = "0.7";
            break;
            
        case 'exito':
            botonAccion.style.backgroundColor = "var(--verde-clinico, #28a745)";
            botonAccion.textContent = `¡Bienvenido Dr/a. ${datos.split(' ')[0]}!`;
            botonAccion.style.opacity = "1";
            break;

        case 'error':
            botonAccion.disabled = false;
            botonAccion.textContent = "Reintentar Acceso";
            botonAccion.style.backgroundColor = "var(--naranja-urgencia, #F27405)";
            botonAccion.style.opacity = "1";
            break;

        case 'normal':
            botonAccion.disabled = false;
            botonAccion.textContent = "Entrar al Sistema";
            botonAccion.style.opacity = "1";
            break;
    }
}

function notificarUsuario(mensaje) {
    const contenedorErrores = document.getElementById('contenedorErrores');
    if (contenedorErrores) {
        contenedorErrores.textContent = mensaje;
        contenedorErrores.style.display = 'block';
        contenedorErrores.style.opacity = '0';
        
        // Animación de entrada
        setTimeout(() => {
            contenedorErrores.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            contenedorErrores.style.opacity = '0';
            setTimeout(() => {
                contenedorErrores.style.display = 'none';
            }, 300);
        }, 4500);
    } else {
        console.error(`[UI ERROR] No se encontró #contenedorErrores para mostrar: ${mensaje}`);
    }
}

// --- ASIGNACIÓN DE EVENTOS ---
if (formularioAcceso) {
    formularioAcceso.addEventListener('submit', ejecutarInicioSesion);
}

// ==========================================================================
// START UP (Ejecución tras cargar dependencias y declarar funciones)
// ==========================================================================
inicializarTogglePassword();
verificarSesionActiva();