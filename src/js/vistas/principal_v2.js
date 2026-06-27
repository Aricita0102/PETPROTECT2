/**
 * SISTEMA: PET PROTECT (Ecosistema Quetzalia) - Gestión Veterinaria SaaS
 * DESARROLLADOR: Ariadna Prado | DaAri Studios
 * ARQUITECTURA: Orquestador Principal (SPA), RBAC, Prevención de Fugas de Memoria y Delegación Global.
 * UBICACIÓN: /src/js/vistas/principal.js
 */

import { conexionSupabase, cerrarSesionSegura } from '../infraestructura/conexion.js';
import { obtenerSesionActiva, limpiarSesion } from '../infraestructura/sesion_store.js';
import { inicializarPanelNotificaciones } from './panel_notificaciones.js';
import { inicializarModuloCitasGlobal } from './globales/modulo_global_citas.js?v=1782241029008';
import { confirmacionCustom } from '../utilidades/ui_alertas.js';

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
export function setHayDatosSinGuardar(estado) { hayDatosSinGuardar = estado; }
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
    'MODULO_FINANZAS':               '/src/css/modulo_finanzas.css',
};

// ==========================================================================
// 2. SEGURIDAD ZERO-TRUST Y VALIDACIÓN DE IDENTIDAD
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Firebase aquí globalmente si es necesario (Cuello de Botella #3)
    await verificarAccesoMedico();
    inicializarEventosUI();
    if (window.actualizarWidgetHorarioGlobal) window.actualizarWidgetHorarioGlobal();

    // Listener global para Notificaciones Interactivas
    window.addEventListener('petprotect:accion_notif', (e) => {
        const data = e.detail;
        // Cerrar el panel
        document.getElementById('notifBtnCerrar')?.click();

        if (data.accion === 'REABASTECER') {
            let moduloKey = 'MODULO_INVENTARIO_FARMACIA';
            if (data.categoria === 'tienda') moduloKey = 'MODULO_INVENTARIO_TIENDA';
            if (data.categoria === 'dietas') moduloKey = 'MODULO_INVENTARIO_DIETAS';
            if (data.categoria === 'insumos') moduloKey = 'MODULO_INVENTARIO_INSUMOS';
            window.cargarModulo(moduloKey);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('petprotect:abrir_inventario_desde_alerta', { detail: { id: data.id } }));
            }, 600);

        } else if (data.accion === 'INICIAR_CONSULTA') {
            window.cargarModulo('MODULO_VETERINARIO_CONSULTA');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('petprotect:iniciar_consulta_alerta', { detail: { id: data.ref_id } }));
            }, 600);

        } else if (data.accion === 'GESTIONAR_LOTE') {
            let moduloKey = 'MODULO_INVENTARIO_FARMACIA';
            if (data.categoria === 'tienda') moduloKey = 'MODULO_INVENTARIO_TIENDA';
            if (data.categoria === 'dietas') moduloKey = 'MODULO_INVENTARIO_DIETAS';
            if (data.categoria === 'insumos') moduloKey = 'MODULO_INVENTARIO_INSUMOS';
            window.cargarModulo(moduloKey);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('petprotect:gestionar_lote_alerta', { detail: { id: data.ref_id } }));
            }, 600);

        } else if (data.accion === 'AGENDAR_CITA') {
            window.cargarModulo('MODULO_AGENDA');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('petprotect:agendar_cita_alerta', { detail: { ids: data.ref_id } })); // Formato: pacienteId|clienteId
            }, 600);

        } else if (data.accion === 'IR_A_CAJA') {
            window.cargarModulo('MODULO_CAJA_REGISTRADORA');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('petprotect:cobrar_caja_alerta', { detail: { id: data.ref_id } }));
            }, 600);
        }
    });
});

// ==========================================
// WIDGET HORARIO (GLOBAL PARA TODA LA APP)
// ==========================================
window.actualizarWidgetHorarioGlobal = async () => {
    try {
        console.log("⏳ [WIDGET] Iniciando cálculo de horario...");
        const contenedor = document.getElementById('caja-horario-smart');
        if (!contenedor) return;

        const sesion = await obtenerSesionActiva();
        if (!sesion || !sesion.perfil) return;
        
        let horario = sesion.perfil.horario_atencion;
        if (typeof horario === 'string') horario = JSON.parse(horario);
        
        const mapaDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const ahora = new Date();
        const hoy = mapaDias[ahora.getDay()];
        
        let configHoy = null;
        if (Array.isArray(horario)) {
            configHoy = horario.find(h => h.dia && String(h.dia).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === hoy.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        } else if (typeof horario === 'object' && horario !== null) {
            const key = Object.keys(horario).find(k => k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === hoy.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            if (key) configHoy = horario[key];
        }

        const estaAbierto = configHoy && (configHoy.abierto === true || String(configHoy.abierto).toLowerCase() === 'true');
        console.log(`[WIDGET] Día: ${hoy} | Abierto: ${estaAbierto}`, configHoy);

        // Función helper para formato AM/PM
        const formatAMPM = (time24) => {
            if(!time24) return '--:--';
            let [h, m] = time24.split(':');
            h = parseInt(h);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${m} ${ampm}`;
        };

        if (estaAbierto && configHoy.apertura && configHoy.cierre) {
            const minActuales = ahora.getHours() * 60 + ahora.getMinutes();
            const [hA, mA] = configHoy.apertura.split(':').map(Number);
            const minApertura = hA * 60 + mA;
            const [hC, mC] = configHoy.cierre.split(':').map(Number);
            const minCierre = hC * 60 + mC;
            
            if (minActuales >= minApertura && minActuales < minCierre) {
                // Matemáticas para la posición del punto
                const porcentaje = ((minActuales - minApertura) / (minCierre - minApertura)) * 100;
                const horaActualStr = formatAMPM(`${ahora.getHours()}:${ahora.getMinutes().toString().padStart(2, '0')}`);

                // Inyección del Slider Reconstruido (UI Premium)
                contenedor.innerHTML = `
                    <div style="display: flex; align-items: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 30px; padding: 6px 16px; gap: 12px; width: max-content; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <span style="font-weight: 600; color: #475569; font-size: 14px; white-space: nowrap;">Tu Horario</span>
                        
                        <span style="font-size: 12px; color: #64748b; font-weight: 500;">${formatAMPM(configHoy.apertura)}</span>
                        
                        <div style="flex-grow: 1; width: 160px; position: relative; height: 4px; background: #e2e8f0; border-radius: 2px;">
                            <div style="position: absolute; left: ${porcentaje}%; top: 50%; transform: translate(-50%, -50%); z-index: 10;">
                                <div style="position: absolute; top: -32px; left: 50%; transform: translateX(-50%); background: #0f172a; color: white; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    ${horaActualStr}
                                    <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); border-width: 4px 4px 0; border-style: solid; border-color: #0f172a transparent transparent transparent;"></div>
                                </div>
                                <div style="width: 14px; height: 14px; background: #f97316; border-radius: 50%; box-shadow: 0 0 0 3px #ffedd5;"></div>
                            </div>
                        </div>
                        
                        <span style="font-size: 12px; color: #64748b; font-weight: 500;">${formatAMPM(configHoy.cierre)}</span>
                    </div>
                `;
            } else {
                // Estado Cerrado Elegante por Turno Finalizado o No Iniciado
                const esNoIniciado = minActuales < minApertura;
                const mensajeCierre = esNoIniciado ? 'Turno no iniciado' : 'Turno finalizado';
                const colorFondo = esNoIniciado ? '#032F40' : '#F27405';
                
                contenedor.innerHTML = `
                    <div style="display: flex; align-items: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 30px; padding: 6px 16px; gap: 12px; width: max-content; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <span style="font-weight: 600; color: #475569; font-size: 14px;">Tu Horario</span>
                        <span style="font-size: 12px; font-weight: 600; color: #ffffff; padding: 3px 10px; background: ${colorFondo}; border-radius: 12px;">${mensajeCierre}</span>
                    </div>
                `;
            }
        } else {
            // Estado Cerrado Elegante
            contenedor.innerHTML = `
                <div style="display: flex; align-items: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 30px; padding: 6px 16px; gap: 12px; width: max-content; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <span style="font-weight: 600; color: #475569; font-size: 14px;">Tu Horario</span>
                    <span style="font-size: 12px; font-weight: 600; color: #ef4444; padding: 3px 10px; background: #fee2e2; border-radius: 12px;">Hoy: Cerrado</span>
                </div>
            `;
        }
    } catch (error) {
        console.error("Fallo al inyectar el widget slider de horario:", error);
    }
};

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
            inicializarModuloCitasGlobal();
        }

        // Carga inicial obligatoria al Dashboard por solicitud de negocio
        // Se ignora el hash previo para asegurar que siempre sea la pantalla de entrada
        window.location.hash = 'MODULO_VETERINARIO_DASHBOARD';
        cargarModulo('MODULO_VETERINARIO_DASHBOARD');

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
        const confirmar = await confirmacionCustom(
            "Datos médicos sin guardar",
            "Hay cambios en el folio actual que se perderán.\n¿Deseas descartarlos y salir de la consulta?",
            "warning",
            "var(--naranja, #F27405)"
        );
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
                moduloImportado = await import('./modulos/modulo_agenda_logica.js');
                if (moduloImportado.inicializarModuloAgenda) await moduloImportado.inicializarModuloAgenda();
                // Registrar función de limpieza (cancela canal Realtime)
                if (moduloImportado.limpiarModuloAgenda) {
                    moduloImportado.destruirModulo = moduloImportado.limpiarModuloAgenda;
                }
                break;

            case 'VENTANA_SELECCION_CATEGORIA':
                moduloImportado = await import('../modulo_seleccion_categoria.js');
                if (moduloImportado.inicializarMenuInventario) moduloImportado.inicializarMenuInventario();
                break;

            case 'MODULO_INVENTARIO_FARMACIA':
                moduloImportado = await import('./modulos/modulo_farmacia_clinica.js');
                if (moduloImportado.inicializarFarmacia) moduloImportado.inicializarFarmacia();
                break;

            case 'MODULO_INVENTARIO_TIENDA':
                moduloImportado = await import('./modulos/modulo_inventario_tienda.js');
                if (moduloImportado.inicializarInventarioTienda) moduloImportado.inicializarInventarioTienda();
                break;

            case 'MODULO_INVENTARIO_INSUMOS':
                moduloImportado = await import('./modulos/modulo_inventario_insumos.js');
                if (moduloImportado.inicializarInventarioInsumos) moduloImportado.inicializarInventarioInsumos();
                break;

            case 'MODULO_INVENTARIO_DIETAS':
                moduloImportado = await import('./modulos/modulo_inventario_dietas.js');
                if (moduloImportado.inicializarInventarioDietas) moduloImportado.inicializarInventarioDietas();
                break;

            case 'MODULO_CAJA_REGISTRADORA':
                moduloImportado = await import('./modulos/modulo_caja_registradora.js');
                if (moduloImportado.inicializarCajaRegistradora) await moduloImportado.inicializarCajaRegistradora();
                break;
                
            case 'MODULO_CENTRO_IMPRESION':
                moduloImportado = await import('./modulos/modulo_centro_impresion.js');
                if (moduloImportado.inicializarCentroImpresion) moduloImportado.inicializarCentroImpresion();
                break;

            case 'MODULO_FINANZAS':
                moduloImportado = await import('./modulos/modulo_finanzas.js');
                if (moduloImportado.inicializarFinanzas) moduloImportado.inicializarFinanzas();
                break;

            case 'MODULO_VETERINARIO_DASHBOARD':
                moduloImportado = await import('./modulos/modulo_veterinario_dashboard.js');
                if (moduloImportado.inicializarModuloDashboard) await moduloImportado.inicializarModuloDashboard();
                break;

            case 'MODULO_BIBLIOTECA_EXPEDIENTES':
                moduloImportado = await import('./modulos/modulo_biblioteca_expedientes.js');
                if (moduloImportado.inicializarModuloPacientes) await moduloImportado.inicializarModuloPacientes();
                break;

            case 'MODULO_VETERINARIO_CONSULTA':
                moduloImportado = await import('./modulos/modulo_consulta_integral_logica.js');
                if (moduloImportado.inicializarConsultaIntegral) await moduloImportado.inicializarConsultaIntegral();
                break;

            case 'CHECKOUT_FINAL_COBRO':
                moduloImportado = await import('./modulos/modulo_checkout_logica.js');
                if (moduloImportado.inicializarCheckout) await moduloImportado.inicializarCheckout();
                break;

            case 'MODULO_EXPEDIENTES_HISTORIAL':
                moduloImportado = await import('./modulos/modulo_expediente_historial.js');
                if (moduloImportado.inicializarExpedienteHistorial) await moduloImportado.inicializarExpedienteHistorial();
                break;

            case 'VETERINARIO_CONFIGURACION':
                try {
                    moduloImportado = await import('../config_perfil.js');
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

// ==========================================================================
// SPA ROUTER HOOKS: REACTIVIDAD GLOBAL DEL WIDGET DE HORARIO
// ==========================================================================
// Rastreador global de cambios de vista (SPA Router Hook via hashchange)
window.addEventListener('hashchange', () => {
    // Le damos 150ms al sistema para que destruya la vista vieja e inyecte el HTML nuevo
    setTimeout(() => {
        if (typeof window.actualizarWidgetHorarioGlobal === 'function') {
            window.actualizarWidgetHorarioGlobal();
        }
    }, 150);
});

// Amarrar los clics del menú por si el hash no cambia pero la vista sí (Navegación Modular)
document.addEventListener('click', (e) => {
    const navLink = e.target.closest('a.nav-link, .menu-item, .enlace-nav, .item-navegacion');
    if (navLink) {
        setTimeout(() => {
            if (typeof window.actualizarWidgetHorarioGlobal === 'function') {
                window.actualizarWidgetHorarioGlobal();
            }
        }, 150);
    }
});

// Auto-arranque del widget al recargar la página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof window.actualizarWidgetHorarioGlobal === 'function') {
            window.actualizarWidgetHorarioGlobal();
        }
    }, 500); // 500ms de gracia para asegurar que el Singleton ya resolvió la sesión
});

// Si el entorno es SPA y la vista de inicio se renderiza dinámicamente, amarrarlo también al load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof window.actualizarWidgetHorarioGlobal === 'function') {
            window.actualizarWidgetHorarioGlobal();
        }
    }, 500);
});