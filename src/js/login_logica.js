/**
 * PET PROTECT - Controlador de Acceso Médico
 * Objetivo: Gestionar la identidad del personal, validación proactiva y UX sin fricciones.
 */

// Corregimos la importación al nombre exacto de la función exportada en el enrutador
import { conexionSupabase, obtenerUsuarioActual } from '../infraestructura/conexion.js';
import { determinarRutaDestino } from '../seguridad/enrutador.js';

// --- REFERENCIAS A LA UI ---
const formularioAcceso = document.getElementById('formLogin');
const entradaCorreo = document.getElementById('correoLogin');
const entradaClave = document.getElementById('passLogin');
const botonAccion = document.querySelector('button[type="submit"]');
const botonToggleClave = document.getElementById('btnTogglePass');

// ==========================================================================
// 1. INICIALIZACIÓN PROACTIVA (AUTO-LOGIN Y EVENTOS)
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    inicializarTogglePassword();
    await verificarSesionActiva();
});

/**
 * Verifica si el médico o asistente ya tiene una sesión válida en el navegador.
 * Evita que tengan que loguearse de nuevo si recargan la página.
 */
const verificarSesionActiva = async () => {
    const usuarioActivo = await obtenerUsuarioActual();
    
    if (usuarioActivo) {
        actualizarEstadoUI('cargando');
        try {
            // Revalidamos el perfil y plan antes de dejarlo pasar
            const { data: perfil, error } = await conexionSupabase
                .from('perfiles')
                .select('*, organizaciones(plan_suscripcion, activo)')
                .eq('id', usuarioActivo.id)
                .single();

            if (!error && perfil && perfil.organizaciones?.activo !== false) {
                const destino = determinarRutaDestino(perfil, perfil.organizaciones.plan_suscripcion);
                window.location.assign(destino);
            } else {
                await conexionSupabase.auth.signOut();
                actualizarEstadoUI('normal');
            }
        } catch (err) {
            actualizarEstadoUI('normal');
        }
    }
};

/**
 * Activa la funcionalidad de mostrar/ocultar contraseña (UX de precisión).
 */
const inicializarTogglePassword = () => {
    if (botonToggleClave && entradaClave) {
        botonToggleClave.addEventListener('click', () => {
            const esPassword = entradaClave.type === 'password';
            entradaClave.type = esPassword ? 'text' : 'password';
            // Feedback visual sutil (Glassmorphism UI)
            botonToggleClave.style.opacity = esPassword ? '1' : '0.5';
        });
    }
};

// ==========================================================================
// 2. VALIDACIÓN Y ORQUESTACIÓN DE ACCESO
// ==========================================================================

/**
 * VALIDACIÓN PROACTIVA (Front-end)
 * Bloquea intentos maliciosos antes de gastar ancho de banda de la clínica.
 */
const validarSeguridadEntradas = (correo, clave) => {
    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio || clave.length < 8) {
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
 * Función principal ejecutada al enviar el formulario.
 */
const ejecutarInicioSesion = async (evento) => {
    evento.preventDefault();
    
    const { esValido, correoLimpio } = validarSeguridadEntradas(entradaCorreo.value, entradaClave.value);
    if (!esValido) return;

    try {
        actualizarEstadoUI('cargando');

        // Autenticación primaria
        const { data: sesionAuth, error: errorAuth } = await conexionSupabase.auth.signInWithPassword({
            email: correoLimpio,
            password: entradaClave.value
        });

        if (errorAuth) throw new Error("Credenciales Incorrectas");

        // Consulta Relacional (Obtenemos Perfil y Organización en un solo viaje)
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

        if (errorPerfil || !perfil) {
            await conexionSupabase.auth.signOut();
            throw new Error("Perfil médico no vinculado. Contacte al Administrador.");
        }

        if (perfil.organizaciones?.activo === false) {
            await conexionSupabase.auth.signOut();
            throw new Error("La suscripción de la clínica está suspendida.");
        }

        // Éxito
        estilizarExito(perfil.nombre_completo);

        // Redirección Inteligente
        setTimeout(() => {
            const planActual = perfil.organizaciones?.plan_suscripcion || 'inicial';
            const destino = determinarRutaDestino(perfil, planActual);
            window.location.assign(destino);
        }, 800);

    } catch (error) {
        console.error(`[SEGURIDAD LOG]: Fallo de acceso -> ${error.message}`);
        actualizarEstadoUI('error', error.message);
        entradaClave.value = ""; // Limpieza de seguridad
    }
};

// ==========================================================================
// 3. GESTIÓN DE ESTADOS VISUALES (DRY & UX)
// ==========================================================================

function actualizarEstadoUI(estado, datos = "") {
    switch (estado) {
        case 'cargando':
            botonAccion.disabled = true;
            botonAccion.innerHTML = `<span class="spinner"></span> Verificando...`;
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
            notificarUsuario(datos);
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
        
        // Efecto de entrada sutil
        contenedorErrores.animate([
            { opacity: 0, transform: 'translateY(-10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 300, fill: 'forwards' });

        setTimeout(() => {
            contenedorErrores.style.display = 'none';
        }, 4500);
    } else {
        alert(`PET PROTECT (Sistema): ${mensaje}`);
    }
}

// Asignación principal
formularioAcceso.addEventListener('submit', ejecutarInicioSesion);