/**
 * SISTEMA: PET PROTECT (Ecosistema Quetzalia) - Gestión Veterinaria SaaS
 * DESARROLLADOR: Ariadna Prado | DaAri Studios
 * ARQUITECTURA: Orquestador Principal (SPA), RBAC, Prevención de Fugas de Memoria y Delegación Global.
 * UBICACIÓN: /src/js/vistas/principal.js
 */

import { conexionSupabase, cerrarSesionSegura } from '../infraestructura/conexion.js';
import { obtenerSesionActiva, limpiarSesion } from '../infraestructura/sesion_store.js';
import { inicializarPanelNotificaciones } from './panel_notificaciones.js';

// ==========================================
// 1. REFERENCIAS AL DOM (BENTO UI)
// ==========================================
const contenedorPrincipal = document.getElementById('contenedor-principal');
const botonMovil = document.getElementById('boton-movil');
const menuNavegacion = document.getElementById('menu-navegacion');
const panelPerfil = document.getElementById('panel-perfil');
const uiNombre = document.getElementById('ui-nombre-usuario');
const uiCorreo = document.getElementById('ui-correo-usuario');
const uiRol = document.getElementById('ui-rol-usuario');

// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN (Single Source of Truth)
// ==========================================
let moduloActual = null;
let hayDatosSinGuardar = false;
let funcionLimpiezaAnterior = null; // 🛡️ Prevención de Memory Leaks

// 🗺️ Diccionario de Estilos: Mapea el nombre del módulo con su ruta CSS en Vite
const mapaCSSModulos = {
    'MODULO_VETERINARIO_CONSULTA':   '/src/css/modulo_consulta_integral.css',
    'MODULO_BIBLIOTECA_EXPEDIENTES': '/src/css/modulo_biblioteca_expedientes.css',
    'MODULO_AGENDA':                 '/src/css/modulo_agenda.css',
    'MODULO_VETERINARIO_DASHBOARD':  '/src/css/modulo_veteri_dashboard.css',
    'VENTANA_SELECCION_CATEGORIA':   '/src/css/ventana_seleccion_categoria.css',
    'MODULO_INVENTARIO_FARMACIA':    '/src/css/modulo_inventario.css',
    'MODULO_INVENTARIO_TIENDA':      '/src/css/informacion_producto.css',
    'MODULO_INVENTARIO_INSUMOS':     '/src/css/informacion_producto.css',
    'MODULO_INVENTARIO_DIETAS':      '/src/css/informacion_producto.css',  // ✅ NUEVO: Dietas de Prescripción
    'MODULO_EXPEDIENTES_HISTORIAL':  '/src/css/modulo_expediente.css',
    'VETERINARIO_CONFIGURACION':     '/src/css/veteri_ajustes.css',
    'CHECKOUT_FINAL_COBRO':          '/src/css/modulo_checkout.css',
    'MODULO_CENTRO_IMPRESION':       '/src/css/centro_impresion.css',
};

// ==========================================================================
// 2. SEGURIDAD ZERO-TRUST Y VALIDACIÓN DE IDENTIDAD
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Firebase aquí globalmente si es necesario (Cuello de Botella #3)
    await verificarAccesoMedico();
    inicializarEventosUI();
});

async function verificarAccesoMedico() {
    // ✅ OPTIMIZACIÓN: Una sola petición de red via Singleton (caché en memoria)
    const sesion = await obtenerSesionActiva();

    if (!sesion) {
        console.warn("[SEGURIDAD] Intento de acceso sin token. Redirigiendo al portal de acceso...");
        // window.location.assign('/LOGIN.html');
        return;
    }

    try {
        const { user, perfil } = sesion;

        if (uiNombre) uiNombre.textContent = perfil.nombre_completo || 'Profesional de la Salud';
        if (uiCorreo) uiCorreo.textContent = user.email;
        if (uiRol)    uiRol.textContent = perfil.rol === 'superadmin' ? 'Propietario/Médico' : perfil.rol;

        // Mostrar foto de perfil en el nav (si existe)
        const btnPerfil = document.getElementById('btn-perfil');
        if (btnPerfil && perfil.avatar_url) {
            btnPerfil.style.backgroundImage = `url('${perfil.avatar_url}')`;
            btnPerfil.style.backgroundSize = 'cover';
            btnPerfil.style.backgroundPosition = 'center';
            btnPerfil.innerHTML = ''; // Quita el icono default
        }

        console.log(`[PET PROTECT] Conexión establecida con éxito: ${user.email}`);

        // Inicializar panel de notificaciones con el org_id ya disponible en el perfil cacheado
        if (perfil.organizacion_id) {
            inicializarPanelNotificaciones(perfil.organizacion_id);
        }

        // Carga inicial transparente con soporte para Deep Linking (Hash)
        const hashTarget = window.location.hash ? window.location.hash.substring(1) : 'MODULO_VETERINARIO_DASHBOARD';
        cargarModulo(hashTarget);

    } catch (error) {
        console.error("[FALLO CLÍNICO] Error de integridad en perfil:", error);
        // window.location.assign('/LOGIN.html');
    }
}

// ==========================================================================
// 2.5 INYECTOR DE ESTILOS DINÁMICOS (OPTIMIZADO CERO-PARPADEO)
// ==========================================================================
function gestionarCSSModulo(nombreModulo) {
    const rutaCSS = mapaCSSModulos[nombreModulo];
    if (!rutaCSS) return;

    // Buscar si ya existe el nodo dinámico
    let linkCSSDinamico = document.getElementById('css-modulo-dinamico');

    if (linkCSSDinamico) {
        // Reciclar el nodo: evita Layout Thrashing y bloqueos de render
        linkCSSDinamico.href = rutaCSS;
    } else {
        // Crearlo solo la primera vez
        linkCSSDinamico = document.createElement('link');
        linkCSSDinamico.rel  = 'stylesheet';
        linkCSSDinamico.href = rutaCSS;
        linkCSSDinamico.id   = 'css-modulo-dinamico';
        document.head.appendChild(linkCSSDinamico);
    }
    
    console.log(`🎨 [UI] CSS inyectado y reciclado para: ${nombreModulo}`);
}

// ==========================================================================
// 3. MOTOR DE INYECCIÓN MODULAR (SPA CORE) - ULTRA RÁPIDO SIN TIMEOUTS
// ==========================================================================
async function cargarModulo(nombreModulo) {
    if (moduloActual === nombreModulo) return;
    if (!contenedorPrincipal) return;

    if (hayDatosSinGuardar) {
        const confirmar = confirm("⚠️ Hay cambios médicos sin guardar en el folio actual. ¿Deseas descartarlos y salir?");
        if (!confirmar) return;
    }

    const moduloSeguro = nombreModulo.replace(/[^a-zA-Z0-9_-]/g, '');

    if (funcionLimpiezaAnterior && typeof funcionLimpiezaAnterior === 'function') {
        try {
            funcionLimpiezaAnterior();
        } catch (e) {
            console.warn("[LIMPIEZA] Falló la destrucción del módulo saliente:", e);
        }
        funcionLimpiezaAnterior = null;
    }

    // Iniciar transición CSS nativa de salida
    contenedorPrincipal.classList.remove('modulo-entrando');
    contenedorPrincipal.classList.add('modulo-saliendo');

    try {
        const rutaFetch = `./${moduloSeguro}.html`;
        const respuesta = await fetch(rutaFetch);
        if (!respuesta.ok) throw new Error(`El módulo [${moduloSeguro}] no existe en el servidor (Error 404).`);

        const htmlOriginal = await respuesta.text();
        let htmlInyectable = htmlOriginal;

        if (htmlOriginal.toLowerCase().includes('<!doctype html>') || htmlOriginal.toLowerCase().includes('<html')) {
            const analizadorDOM   = new DOMParser();
            const documentoLimpio = analizadorDOM.parseFromString(htmlOriginal, 'text/html');
            htmlInyectable = documentoLimpio.body.innerHTML;
        }

        // Remueve clase de salida, inyecta el HTML y activa la animación de entrada
        contenedorPrincipal.classList.remove('modulo-saliendo');
        contenedorPrincipal.innerHTML = htmlInyectable;
        contenedorPrincipal.classList.add('modulo-entrando');
        
        moduloActual         = moduloSeguro;
        hayDatosSinGuardar   = false;

        // Ejecutar lógica y CSS al instante
        gestionarCSSModulo(moduloSeguro);
        inicializarComponentesModulo(moduloSeguro);

    } catch (error) {
        console.error("[SISTEMA] Error crítico en inyección modular:", error);
        contenedorPrincipal.classList.remove('modulo-saliendo');
        contenedorPrincipal.innerHTML = `
            <div class="mensaje-carga" style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 2rem;">
                <span class="material-symbols-rounded" style="color: var(--rojo-error, #D32F2F); font-size: 3rem;">report</span>
                <p style="color: #991B1B; font-weight: bold; margin-top: 1rem;">Módulo No Disponible</p>
                <p><small style="color: #B91C1C;">${error.message}</small></p>
            </div>
        `;
        contenedorPrincipal.classList.add('modulo-entrando');
    }
}

async function inicializarComponentesModulo(nombre) {
    console.info(`🧠 [CEREBRO] Orquestando asignación de scripts dinámicos para: ${nombre}`);

    try {
        let moduloImportado = null;

        switch (nombre) {

            case 'MODULO_AGENDA':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_agenda_logica.js');
                if (moduloImportado.inicializarModuloAgenda) await moduloImportado.inicializarModuloAgenda();
                break;

            case 'VENTANA_SELECCION_CATEGORIA':
                moduloImportado = await import('/src/js/modulo_seleccion_categoria.js');
                if (moduloImportado.inicializarMenuInventario) moduloImportado.inicializarMenuInventario();
                break;

            case 'MODULO_INVENTARIO_FARMACIA':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_farmacia_clinica.js');
                if (moduloImportado.inicializarFarmacia) moduloImportado.inicializarFarmacia();
                break;

            case 'MODULO_INVENTARIO_TIENDA':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_inventario_tienda.js');
                if (moduloImportado.inicializarInventarioTienda) moduloImportado.inicializarInventarioTienda();
                break;

            case 'MODULO_INVENTARIO_INSUMOS':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_inventario_insumos.js');
                if (moduloImportado.inicializarInventarioInsumos) moduloImportado.inicializarInventarioInsumos();
                break;

            case 'MODULO_INVENTARIO_DIETAS':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_inventario_dietas.js');
                if (moduloImportado.inicializarInventarioDietas) moduloImportado.inicializarInventarioDietas();
                break;

            case 'MODULO_CAJA_REGISTRADORA':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_caja_registradora.js');
                if (moduloImportado.inicializarCajaRegistradora) await moduloImportado.inicializarCajaRegistradora();
                break;
                
            case 'MODULO_CENTRO_IMPRESION':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_centro_impresion.js');
                if (moduloImportado.inicializarCentroImpresion) moduloImportado.inicializarCentroImpresion();
                break;

            case 'MODULO_VETERINARIO_DASHBOARD':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_veterinario_dashboard.js');
                if (moduloImportado.inicializarModuloDashboard) await moduloImportado.inicializarModuloDashboard();
                break;

            case 'MODULO_BIBLIOTECA_EXPEDIENTES':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_biblioteca_expedientes.js');
                if (moduloImportado.inicializarModuloPacientes) await moduloImportado.inicializarModuloPacientes();
                break;

            case 'MODULO_VETERINARIO_CONSULTA':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_consulta_integral_logica.js');
                if (moduloImportado.inicializarConsultaIntegral) await moduloImportado.inicializarConsultaIntegral();
                break;

            case 'CHECKOUT_FINAL_COBRO':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_checkout_logica.js');
                if (moduloImportado.inicializarCheckout) await moduloImportado.inicializarCheckout();
                break;

            case 'MODULO_EXPEDIENTES_HISTORIAL':
                moduloImportado = await import('/src/js/vistas/modulos/modulo_expediente_historial.js');
                if (moduloImportado.inicializarExpedienteHistorial) await moduloImportado.inicializarExpedienteHistorial();
                break;

            case 'VETERINARIO_CONFIGURACION':
                try {
                    moduloImportado = await import('/src/js/config_perfil.js');
                    if (moduloImportado && moduloImportado.iniciarModuloConfiguracion) {
                        await moduloImportado.iniciarModuloConfiguracion();
                    }
                } catch (errorJs) {
                    console.error(`[ERROR ASYNC] No se pudo cargar '/src/js/config_perfil.js'. Revisa la ruta en Vite.`, errorJs);
                }
                break;
        }

        if (moduloImportado && moduloImportado.destruirModulo) {
            funcionLimpiezaAnterior = moduloImportado.destruirModulo;
        }

    } catch (err) {
        console.error(`[ERROR LÓGICO] Falla crítica al inicializar el script del módulo ${nombre}:`, err);
    }
}

// ==========================================================================
// 4. CONTROLADORES DE INTERFAZ (UI/UX) - DELEGACIÓN GLOBAL ROBUSTA
// ==========================================================================
function inicializarEventosUI() {
    document.addEventListener('click', async (e) => {

        const enlaceNav = e.target.closest('.enlace-nav');
        if (enlaceNav) {
            const destino = enlaceNav.getAttribute('data-target');
            if (destino) {
                e.preventDefault();
                document.querySelectorAll('.enlace-nav').forEach(el => el.classList.remove('activo'));
                enlaceNav.classList.add('activo');
                cargarModulo(destino);
                if (window.innerWidth <= 768 && menuNavegacion) {
                    menuNavegacion.classList.remove('visible');
                    if (botonMovil) botonMovil.querySelector('span').textContent = 'menu';
                }
            }
            return;
        }

        const btnConfigTarget = e.target.closest('#btn-nav-configuracion')
            || e.target.closest('[title="Configuración del Sistema"]')
            || e.target.closest('[aria-label="Configuración"]');
        if (btnConfigTarget) {
            e.preventDefault();
            document.querySelectorAll('.enlace-nav').forEach(el => el.classList.remove('activo'));
            cargarModulo('VETERINARIO_CONFIGURACION');
            if (window.innerWidth <= 768 && menuNavegacion) {
                menuNavegacion.classList.remove('visible');
                if (botonMovil) botonMovil.querySelector('span').textContent = 'menu';
            }
            return;
        }

        const botonDesplegable = e.target.closest('.boton-desplegable');
        if (botonDesplegable) {
            e.preventDefault();
            const contenedor   = botonDesplegable.closest('.contenedor-desplegable');
            const estabaActivo = contenedor.classList.contains('activo');

            document.querySelectorAll('.contenedor-desplegable').forEach(c => {
                c.classList.remove('activo');
                const btn    = c.querySelector('.boton-desplegable');
                const submenu = c.querySelector('.submenu-flotante');
                if (btn)    btn.setAttribute('aria-expanded', 'false');
                if (submenu) submenu.setAttribute('aria-hidden', 'true');
            });

            if (!estabaActivo) {
                contenedor.classList.add('activo');
                botonDesplegable.setAttribute('aria-expanded', 'true');
                const submenuActual = contenedor.querySelector('.submenu-flotante');
                if (submenuActual) submenuActual.setAttribute('aria-hidden', 'false');
            }
            return;
        }

        if (!e.target.closest('.contenedor-desplegable') && !e.target.closest('.submenu-flotante')) {
            document.querySelectorAll('.contenedor-desplegable').forEach(c => {
                c.classList.remove('activo');
                const btn    = c.querySelector('.boton-desplegable');
                const submenu = c.querySelector('.submenu-flotante');
                if (btn)    btn.setAttribute('aria-expanded', 'false');
                if (submenu) submenu.setAttribute('aria-hidden', 'true');
            });
        }

        const btnMovilTarget = e.target.closest('#boton-movil');
        if (btnMovilTarget && menuNavegacion) {
            const estaVisible = menuNavegacion.classList.toggle('visible');
            btnMovilTarget.querySelector('span').textContent = estaVisible ? 'close' : 'menu';
            return;
        }

        const btnPerfilTarget = e.target.closest('#btn-perfil');
        if (btnPerfilTarget && panelPerfil) {
            e.stopPropagation();
            const estaActivo = panelPerfil.classList.toggle('activo');
            btnPerfilTarget.setAttribute('aria-expanded', estaActivo);
            return;
        }

        if (panelPerfil && !panelPerfil.contains(e.target) && !e.target.closest('#btn-perfil')) {
            panelPerfil.classList.remove('activo');
            const btnP = document.getElementById('btn-perfil');
            if (btnP) btnP.setAttribute('aria-expanded', 'false');
        }

        const btnCerrarSesionTarget = e.target.closest('#btn-cerrar-sesion');
        if (btnCerrarSesionTarget) {
            e.preventDefault();
            if (confirm("¿Estás seguro de que deseas cerrar la sesión clínica actual?")) {
                btnCerrarSesionTarget.innerHTML  = '<span class="material-symbols-rounded">cached</span> Saliendo...';
                btnCerrarSesionTarget.disabled   = true;
                await cerrarSesionSegura();
            }
        }
    });
}

window.cargarModulo = cargarModulo;
export { cargarModulo };