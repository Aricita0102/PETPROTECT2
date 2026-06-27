/**
 * SISTEMA: Quetzalia - Gestión Veterinaria (PET PROTECT)
 * DESARROLLADOR: Ariadna Prado | DaAri Studios
 * DESCRIPCIÓN: Orquestador principal (SPA), enrutamiento dinámico, seguridad y eventos globales.
 * ARQUITECTURA: Modular, Mobile-First, Prevención de Memory Leaks, Soporte Vite.
 */

import { obtenerUsuarioActual, cerrarSesionSegura } from '../infraestructura/conexion.js';

const contenedorPrincipal = document.getElementById('contenedor-principal');
let moduloActual = null; 
let funcionLimpiezaAnterior = null; // 🛡️ Prevención de Memory Leaks

async function cargarModulo(nombreModulo) {
    console.info(`🚀 [ORQUESTADOR] Intento de inyectar módulo: ${nombreModulo}`);
    
    if (moduloActual === nombreModulo) {
        console.warn(`⚠️ [ORQUESTADOR] Operación cancelada. El usuario ya se encuentra en ${nombreModulo}`);
        return;
    }
    if (!contenedorPrincipal) return;

    const moduloSeguro = nombreModulo.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // 🛡️ [PROACTIVIDAD ARQUITECTÓNICA] Desmontar módulo anterior
    if (funcionLimpiezaAnterior && typeof funcionLimpiezaAnterior === 'function') {
        console.log(`🧹 [MEMORIA] Ejecutando limpieza del módulo anterior: ${moduloActual}`);
        funcionLimpiezaAnterior(); 
        funcionLimpiezaAnterior = null;
    }

    contenedorPrincipal.innerHTML = `
        <div class="mensaje-carga">
            <span class="material-symbols-rounded" style="animation: spin 2s linear infinite; color: var(--primario, #4F46E5); font-size: 3rem;">sync</span>
            <p style="margin-top: 1rem; font-weight: 500; color: var(--texto-secundario, #64748B);">Sincronizando instrumental médico...</p>
        </div>
    `;

    try {
        // ----------------------------------------------------------------
        // 🚨 ENRUTADOR INTELIGENTE (XAMPP + VITE)
        // ----------------------------------------------------------------
        const basePath = window.location.pathname.includes('/PETPROTECT') ? '/PETPROTECT' : '';
        let rutaFetch = `${basePath}/src/modulos/${moduloSeguro}.html`;
        
        // Excepciones de archivos HTML en raíz u otras rutas
        const modulosEnRaiz = [
            'VENTANA_SELECCION_CATEGORIA',
            'MODULO_INVENTARIO_FARMACIA'
        ];

        if (modulosEnRaiz.includes(moduloSeguro)) {
            rutaFetch = `${basePath}/${moduloSeguro}.html`; 
        }
        
        console.log(`🌐 [RED] Solicitando vista a: ${rutaFetch}`);
        // ----------------------------------------------------------------

        const respuesta = await fetch(rutaFetch); 
        
        if (!respuesta.ok) throw new Error(`El archivo no se encontró en la ruta: ${rutaFetch}`);

        const html = await respuesta.text();

        if (html.toLowerCase().includes('<!doctype html>')) {
            throw new Error("Ruta incorrecta: El servidor devolvió una página completa (404) en lugar del fragmento de módulo.");
        }

        contenedorPrincipal.style.opacity = '0';
        
        setTimeout(() => {
            contenedorPrincipal.innerHTML = html;
            contenedorPrincipal.style.opacity = '1';
            moduloActual = moduloSeguro;
            console.log(`✅ [DOM] ¡Módulo ${moduloSeguro} inyectado exitosamente!`);
            
            // Llamada al orquestador lógico
            inicializarComponentesModulo(moduloSeguro);
        }, 300); // Pequeña transición para evitar parpadeos bruscos (Mejora UX)

    } catch (error) {
        console.error("💥 [ERROR FATAL DE RUTAS]:", error);
        contenedorPrincipal.innerHTML = `
            <div class="mensaje-carga" style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 2rem;">
                <span class="material-symbols-rounded" style="color: #DC2626; font-size: 3rem;">error</span>
                <p style="color: #991B1B; font-weight: bold; margin-top: 1rem;">Falla en el Sistema Quirúrgico (Error 404)</p>
                <p><small style="color: #B91C1C;">${error.message}</small></p>
            </div>
        `;
    }
}

// ==========================================
// DELEGACIÓN GLOBAL DE EVENTOS (CLICS)
// ==========================================
document.addEventListener('click', (e) => {
    
    // 1. Menú Desplegable (Submenús laterales)
    const botonDesplegable = e.target.closest('.boton-desplegable');
    if (botonDesplegable) {
        e.preventDefault();
        const contenedor = botonDesplegable.closest('.contenedor-desplegable');
        const estabaActivo = contenedor.classList.contains('activo');
        
        // Cierra los demás menús desplegables
        document.querySelectorAll('.contenedor-desplegable').forEach(c => {
            c.classList.remove('activo');
            const btn = c.querySelector('.boton-desplegable');
            const submenu = c.querySelector('.submenu-flotante');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            if (submenu) submenu.setAttribute('aria-hidden', 'true');
        });

        // Alterna el actual
        if (!estabaActivo) {
            contenedor.classList.add('activo');
            botonDesplegable.setAttribute('aria-expanded', 'true');
            const submenuActual = contenedor.querySelector('.submenu-flotante');
            if (submenuActual) submenuActual.setAttribute('aria-hidden', 'false');
        }
        return; 
    }

    // Cierra menús desplegables si se hace clic fuera de ellos
    if (!e.target.closest('.contenedor-desplegable') && !e.target.closest('.submenu-flotante')) {
        document.querySelectorAll('.contenedor-desplegable').forEach(c => {
            c.classList.remove('activo');
            const btn = c.querySelector('.boton-desplegable');
            const submenu = c.querySelector('.submenu-flotante');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            if (submenu) submenu.setAttribute('aria-hidden', 'true');
        });
    }

    // 2. Navegación (Enlaces directos a módulos)
    const enlaceNav = e.target.closest('.enlace-nav');
    if (enlaceNav) {
        const destino = enlaceNav.getAttribute('data-target');
        if (destino) {
            e.preventDefault();
            
            // Gestión de estado visual de "activo"
            document.querySelectorAll('.enlace-nav').forEach(el => el.classList.remove('activo'));
            enlaceNav.classList.add('activo');

            document.querySelectorAll('.contenedor-desplegable').forEach(c => {
                c.classList.remove('activo');
            });

            // Dispara la inyección del HTML
            cargarModulo(destino);

            // Cierra el menú móvil si está abierto (Mobile First UX)
            if (window.innerWidth <= 768) {
                const navMovil = document.getElementById('menu-navegacion');
                const btnMovil = document.getElementById('boton-movil');
                if (navMovil) navMovil.classList.remove('visible');
                if (btnMovil) btnMovil.querySelector('span').textContent = 'menu';
            }
        }
    }

    // 3. Botón de Menú Móvil (Hamburguesa)
    const btnMovil = e.target.closest('#boton-movil');
    if (btnMovil) {
        const navMovil = document.getElementById('menu-navegacion');
        if (navMovil) {
            navMovil.classList.toggle('visible');
            const icono = btnMovil.querySelector('span');
            if (icono) icono.textContent = navMovil.classList.contains('visible') ? 'close' : 'menu';
        }
    }

    // 4. Cierre del Panel Lateral Bento (Información de Producto/Modales Dinámicos)
    const btnCerrarLateral = e.target.closest('.btn-cerrar-lateral');
    const clicEnFondoBackdrop = e.target.matches('.modal-lateral-backdrop');

    if (btnCerrarLateral || clicEnFondoBackdrop) {
        const modalActivo = document.getElementById('modal-detalle-producto') || document.querySelector('.modal-lateral-backdrop.visible');
        
        if (modalActivo && modalActivo.classList.contains('visible')) {
            e.preventDefault();
            
            // Iniciamos la animación de salida retirando la clase
            modalActivo.classList.remove('visible');
            modalActivo.setAttribute('aria-hidden', 'true');
            
            // Limpiamos el DOM asegurando que la transición CSS haya terminado (400ms)
            setTimeout(() => {
                const contenedorModal = document.getElementById('contenedor-modal-dinamico');
                if (contenedorModal) {
                    contenedorModal.innerHTML = '';
                }
            }, 400);
        }
    }
});

// ==========================================
// ACCESIBILIDAD Y ATAJOS DE TECLADO
// ==========================================
document.addEventListener('keydown', (e) => {
    // Permite cerrar modales laterales rápidamente con la tecla 'Escape'
    if (e.key === 'Escape') {
        const modalActivo = document.getElementById('modal-detalle-producto') || document.querySelector('.modal-lateral-backdrop.visible');
        
        if (modalActivo && modalActivo.classList.contains('visible')) {
            modalActivo.classList.remove('visible');
            modalActivo.setAttribute('aria-hidden', 'true');
            
            setTimeout(() => {
                const contenedorModal = document.getElementById('contenedor-modal-dinamico');
                if (contenedorModal) contenedorModal.innerHTML = '';
            }, 400);
        }
    }
});

// ==========================================
// SEGURIDAD Y ESTADO
// ==========================================
async function verificarAcceso() {
    try {
        const usuario = await obtenerUsuarioActual();
        if (!usuario) {
            console.warn("🔒 [SEGURIDAD] Acceso denegado. Redirigiendo al portal...");
            window.location.replace('/LOGIN.html'); 
        } else {
            console.log("🔓 [SEGURIDAD] Sesión activa en PET PROTECT:", usuario.email);
            // Módulo por defecto al iniciar sesión exitosamente
            cargarModulo('MODULO_VETERINARIO_DASHBOARD');
        }
    } catch (error) {
        console.error("💥 [ERROR DE SEGURIDAD] Fallo al verificar sesión:", error);
    }
}

// ==========================================
// ORQUESTADOR LÓGICO (El "Cerebro" de JS)
// ==========================================
async function inicializarComponentesModulo(nombre) {
    console.log(`🧠 [CEREBRO] Despertando sinapsis lógica (JS) para el módulo: ${nombre}`);
    
    try {
        let moduloImportado = null;

        // 🚨 IMPORTANTE: Uso de cadenas de texto ESTATICAS para que Vite pueda empaquetar los módulos
        switch (nombre) {
            case 'VENTANA_SELECCION_CATEGORIA':
                moduloImportado = await import('./modulos/modulo_seleccion_categoria.js');
                if (moduloImportado.inicializarMenuInventario) moduloImportado.inicializarMenuInventario();
                break;

            case 'MODULO_INVENTARIO_FARMACIA':
                moduloImportado = await import('./modulos/modulo_farmacia_clinica.js');
                if (moduloImportado.inicializarFarmacia) moduloImportado.inicializarFarmacia();
                break;

            case 'MODULO_VETERINARIO_DASHBOARD': 
                moduloImportado = await import('./modulos/modulo_veterinario_dashboard.js');
                if (moduloImportado.inicializarModuloDashboard) moduloImportado.inicializarModuloDashboard();
                break;

            case 'MODULO_BIBLIOTECA_EXPEDIENTES':
                moduloImportado = await import('./modulos/modulo_biblioteca_expedientes.js');
                if (moduloImportado.inicializarModuloPacientes) moduloImportado.inicializarModuloPacientes();
                break;

            case 'MODULO_VETERINARIO_CONSULTA': 
                moduloImportado = await import('./modulos/modulo_consulta_integral_logica.js');
                if (moduloImportado.inicializarConsultaIntegral) moduloImportado.inicializarConsultaIntegral();
                break;

            default:
                console.log(`ℹ️ [CEREBRO] El módulo '${nombre}' es puramente visual, no requiere inicialización JS extra.`);
                break;
        }

        // 🛡️ Registrar función de limpieza si el módulo recién cargado la provee
        if (moduloImportado && moduloImportado.destruirModulo) {
            funcionLimpiezaAnterior = moduloImportado.destruirModulo;
        }

    } catch (error) {
        console.error(`💥 [ERROR LÓGICO] Falla al importar/inicializar JS para el módulo ${nombre}:`, error);
        // Alerta visual para detectar fallos de carga en desarrollo
        alert(`Error arquitectónico: No se pudo inyectar el código de ${nombre}. Verifica la consola y las rutas.`);
    }
}

// Arranque inicial al cargar el DOM
document.addEventListener('DOMContentLoaded', verificarAcceso);

// Exportar funciones globales (UNA SOLA VEZ)
export { cargarModulo };