/**
 * MÓDULO: Caja Registradora (PET PROTECT)
 * DESCRIPCIÓN: Punto de venta integrado con inventario. Carga productos de tienda
 *              y farmacia desde Supabase, permite agregar ítems al ticket y cobrar.
 * ARQUITECTURA: Vite / Supabase
 */

import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { obtenerPlantillaTicket, obtenerDOMInnerTicket, obtenerCSSPlantillaTicket } from './ticket_template.js';
import { iniciarTourCajaRegistradora, iniciarTourCajaRegistradoraSiEsPrimeraVez } from '../../tour/modulo_caja_registradora_tour.js';
import { alertaCustom } from '../../utilidades/ui_alertas.js';
import { setHayDatosSinGuardar } from '../principal_v2.js';

// ─── Estado del módulo ─────────────────────────────────────────────────────────
let perfilCaja = null;
let todosLosProductos = [];
let carrito = [];
let contadorTransaccion = 1;
let checkoutOpciones = { whatsapp: false, imprimir: false };
let checkoutMetodoPago = 'efectivo';

// ─── Punto de entrada ─────────────────────────────────────────────────────────
export async function inicializarCajaRegistradora() {
    console.log('[CAJA] Iniciando punto de venta...');

    try {
        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) throw new Error('Sin sesión activa');

        perfilCaja = sesion.perfil;
    } catch (err) {
        console.error('[CAJA] Error de identidad:', err.message);
        mostrarErrorCatalogo('No se pudo verificar la sesión. Recarga la página.');
        return;
    }

    await cargarProductos();
    configurarCategorias();
    configurarBuscador();
    configurarFullscreen();
    configurarCobro();
    actualizarNumeroTransaccion();
    _cargarCarritoLocal(); // Restaurar si había uno pendiente
    renderizarCarrito();
    
    const btnTour = document.getElementById('btn-guia-caja');
    if (btnTour) btnTour.addEventListener('click', iniciarTourCajaRegistradora);
    
    iniciarTourCajaRegistradoraSiEsPrimeraVez();

    // Escuchar el evento del Escáner Remoto
    window.removeEventListener('escanerRemotoDetectado', manejarEscanerRemoto);
    window.addEventListener('escanerRemotoDetectado', manejarEscanerRemoto);

    // Si escaneó algo antes de entrar a Caja
    if (window.ultimoCodigoEscaneado) {
        setTimeout(() => {
            manejarEscanerRemoto({ detail: window.ultimoCodigoEscaneado });
            window.ultimoCodigoEscaneado = null;
        }, 500);
    }
}

function manejarEscanerRemoto(e) {
    const codigo = e.detail;
    const producto = todosLosProductos.find(p => p.codigo_barras == codigo || p.codigo_barras === String(codigo));
    if (producto) {
        const aplicaIva = producto.metadata?.aplica_iva !== false;
        agregarAlCarrito(producto.id, producto.nombre_comercial, producto.precio_venta, aplicaIva);
    } else {
        if (typeof alertaCustom === 'function') {
            alertaCustom('Escáner', `Producto no encontrado con el código: ${codigo}`, 'warning');
        } else {
            alert(`Producto no encontrado con el código: ${codigo}`);
        }
    }
}

// ─── Carga de productos desde Supabase ────────────────────────────────────────
async function cargarProductos(categoria = 'todo') {
    const grid = document.getElementById('caja-grid-productos');
    if (!grid) return;

    grid.innerHTML = `
        <div class="caja-estado-grid caja-loading">
            <span class="material-symbols-rounded caja-icon-estado">sync</span>
            <span>Cargando catálogo...</span>
        </div>`;

    try {
        // Campos exactos según el esquema real de la BD
        let query = conexionSupabase
            .from('inventario_productos')
            .select('id, nombre_comercial, precio_venta, imagen_url, categoria, stock_total, stock_minimo, unidad_medida, codigo_barras, presentacion, metadata')
            .eq('organizacion_id', perfilCaja.organizacion_id)
            .in('categoria', ['tienda', 'farmacia', 'dietas'])
            .order('nombre_comercial', { ascending: true });

        if (categoria !== 'todo') {
            query = query.eq('categoria', categoria);
        }

        const { data: productos, error } = await query;
        if (error) throw error;

        todosLosProductos = productos || [];
        renderizarGrid(todosLosProductos);

    } catch (err) {
        console.error('[CAJA] Error al cargar productos:', err);
        mostrarErrorCatalogo(`Error: ${err.message || 'Verifica la conexión.'}`);
    }
}

// ─── Renderizado del Grid ─────────────────────────────────────────────────────
function renderizarGrid(productos) {
    const grid = document.getElementById('caja-grid-productos');
    if (!grid) return;

    if (!productos || productos.length === 0) {
        grid.innerHTML = `
            <div class="caja-estado-grid">
                <span class="material-symbols-rounded caja-icon-estado">inventory_2</span>
                <span>No hay productos disponibles<br>en esta categoría.</span>
            </div>`;
        return;
    }

    grid.innerHTML = productos.map(prod => {
        const nombre = prod.nombre_comercial || 'Sin nombre';
        const precio = prod.precio_venta ? `$${parseFloat(prod.precio_venta).toFixed(2)}` : '$0.00';
        
        const cantEnCarrito = carrito.find(item => item.id === prod.id)?.cantidad || 0;
        const stockRestante = (parseFloat(prod.stock_total) || 0) - cantEnCarrito;
        const sinStock = stockRestante <= 0;
        
        const icono = obtenerIconoCategoria(prod.categoria, nombre);

        // Si tiene imagen real, mostrarla; si no, ícono temático
        const contenidoImg = prod.imagen_url
            ? `<img src="${prod.imagen_url}" alt="${nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`
            : `<span class="material-symbols-rounded" style="font-size:30px;color:var(--cobalto-suave);">${icono}</span>`;

        const accionClick = sinStock
            ? ''
            : `window.cajaMod.agregarAlCarrito('${prod.id}', \`${nombre.replace(/`/g, '\\`')}\`, ${prod.precio_venta || 0})`;

        const badgeHtml = sinStock 
            ? '<div class="caja-sin-stock-badge"><span class="material-symbols-rounded" style="font-size:12px;">block</span> Sin stock</div>'
            : `<div class="caja-stock-badge" style="position:absolute; top:8px; right:8px; background:var(--cobalto, #032F40); color:white; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.2); pointer-events:none;">${stockRestante} disp.</div>`;

        return `
            <div class="caja-producto${sinStock ? ' sin-stock' : ''}"
                 onclick="${accionClick}"
                 title="${sinStock ? 'Sin existencias' : 'Agregar: ' + nombre}"
                 data-id="${prod.id}"
                 role="button" tabindex="${sinStock ? -1 : 0}"
                 aria-label="${nombre} — ${precio}${sinStock ? ' (Sin stock)' : ''}">
                <div class="caja-producto-img" style="position:relative;">
                    ${contenidoImg}
                    <div class="badge-container-stock">
                        ${badgeHtml}
                    </div>
                </div>
                <div class="caja-producto-nombre">${nombre}</div>
                <div class="caja-producto-precio">${precio}</div>
            </div>`;
    }).join('');
}

// ─── Iconos Material Symbols por categoría ────────────────────────────────────
function obtenerIconoCategoria(categoria, nombre) {
    const n = nombre.toLowerCase();
    if (categoria === 'farmacia') {
        if (n.includes('vacuna'))                          return 'vaccines';
        if (n.includes('suero') || n.includes('solución')) return 'water_drop';
        if (n.includes('antibio') || n.includes('amoxic')) return 'medication';
        if (n.includes('vitamina') || n.includes('suplem')) return 'nutrition';
        return 'medication';
    }
    if (categoria === 'dietas') {
        if (n.includes('gato'))  return 'cruelty_free';
        return 'pet_supplies';
    }
    // tienda
    if (n.includes('collar') || n.includes('arnes'))        return 'link';
    if (n.includes('juguete') || n.includes('pelota'))      return 'sports_tennis';
    if (n.includes('shampoo') || n.includes('baño'))        return 'soap';
    if (n.includes('cama') || n.includes('cojin'))          return 'hotel';
    if (n.includes('alimento') || n.includes('croqueta'))   return 'pet_supplies';
    if (n.includes('correa') || n.includes('trailla'))      return 'hive';
    return 'storefront';
}

// ─── Buscador en tiempo real ──────────────────────────────────────────────────
function configurarBuscador() {
    const input = document.getElementById('caja-buscador');
    if (!input) return;

    input.addEventListener('input', () => {
        const termino = input.value.toLowerCase().trim();
        if (!termino) {
            renderizarGrid(todosLosProductos);
            return;
        }
        const filtrados = todosLosProductos.filter(p =>
            (p.nombre_comercial || '').toLowerCase().includes(termino) ||
            (p.codigo_barras    || '').toLowerCase().includes(termino)
        );
        renderizarGrid(filtrados);
    });
}

// ─── Pantalla Completa ────────────────────────────────────────────────────────
function configurarFullscreen() {
    const btn    = document.getElementById('btn-caja-fullscreen');
    const icono  = document.getElementById('icono-fullscreen');
    const wrapper = document.querySelector('.pos-wrapper');
    if (!btn || !wrapper) return;

    const actualizar = () => {
        const esFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (icono) icono.textContent = esFull ? 'fullscreen_exit' : 'fullscreen';
        wrapper.classList.toggle('caja-fullscreen', esFull);
    };

    btn.addEventListener('click', () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // Entrar en fullscreen nativo
            const target = document.documentElement;
            if (target.requestFullscreen)        target.requestFullscreen();
            else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
            else {
                // Navegador sin soporte: toggle CSS class
                wrapper.classList.add('caja-fullscreen');
                if (icono) icono.textContent = 'fullscreen_exit';
            }
        } else {
            // Salir de fullscreen nativo
            if (document.exitFullscreen)           document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange',       actualizar);
    document.addEventListener('webkitfullscreenchange', actualizar);
}

// ─── Filtros de categoría ─────────────────────────────────────────────────────
function configurarCategorias() {
    const botones = document.querySelectorAll('[data-caja-cat]');
    botones.forEach(btn => {
        btn.addEventListener('click', async () => {
            botones.forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            const input = document.getElementById('caja-buscador');
            if (input) input.value = '';
            await cargarProductos(btn.dataset.cajaCat);
        });
    });
}

// ─── Carrito / Ticket ─────────────────────────────────────────────────────────
export function agregarAlCarrito(id, nombre, precio, aplicaIva = true) {
    setHayDatosSinGuardar(true);
    // Buscar el stock disponible del producto en el catálogo cargado
    const productoRef = todosLosProductos.find(p => p.id === id);
    const stockDisponible = productoRef ? (parseFloat(productoRef.stock_total) || 0) : Infinity;

    const existente = carrito.find(item => item.id === id);

    if (existente) {
        // ✅ Validar antes de incrementar
        if (existente.cantidad >= stockDisponible) {
            mostrarAlertaStock(nombre, stockDisponible);
            return;
        }
        existente.cantidad++;
    } else {
        if (stockDisponible <= 0) {
            mostrarAlertaStock(nombre, 0);
            return;
        }
        // Guardar stockDisponible en el item para validarlo desde cambiarCantidad()
        carrito.push({ id, nombre, precio: parseFloat(precio), cantidad: 1, stockMax: stockDisponible, aplicaIva });
    }

    renderizarCarrito();
    // Micro-animación al agregar
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
        card.style.transform = 'scale(0.93)';
        setTimeout(() => card.style.transform = '', 160);
    }
}

/** Muestra una alerta visual no bloqueante cuando se alcanza el límite de stock */
function mostrarAlertaStock(nombre, stock) {
    // Evitar duplicados
    document.getElementById('toast-stock-caja')?.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-stock-caja';
    toast.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:17px;color:#f59e0b;">warning</span>
        <span><strong>${nombre}</strong>: stock máximo alcanzado (${stock} uds.)</span>
    `;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '28px', right: '28px',
        display: 'flex', alignItems: 'center', gap: '10px',
        background: '#ffffff', border: '1.5px solid #fcd34d',
        borderRadius: '12px', padding: '13px 18px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.11)',
        zIndex: '99999', opacity: '0',
        transform: 'translateY(10px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        fontFamily: "'Montserrat', sans-serif", fontSize: '13px', fontWeight: '600'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderizarCarrito() {
    _guardarCarritoLocal(); // Persistencia automática
    
    const lista     = document.getElementById('caja-lista-items');
    const resumenEl = document.getElementById('caja-resumen');
    const btnCobrar = document.getElementById('caja-btn-cobrar');
    if (!lista) return;

    if (carrito.length === 0) {
        lista.innerHTML = `
            <div class="caja-ticket-vacio">
                <span class="material-symbols-rounded" style="font-size:2.2rem;color:var(--cobalto-suave);opacity:0.4;">receipt_long</span>
                <span>El ticket está vacío.<br>Selecciona productos del catálogo.</span>
            </div>`;
    } else {
        lista.innerHTML = carrito.map((item, idx) => `
            <div class="item" data-idx="${idx}">
                <div class="cant num">${item.cantidad}</div>
                <div class="info">
                    <div class="nombre">${item.nombre}</div>
                    <div class="nota caja-ctrl-fila">
                        <button class="caja-ctrl" onclick="window.cajaMod.cambiarCantidad(${idx}, -1)" title="Quitar uno">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <button class="caja-ctrl" onclick="window.cajaMod.cambiarCantidad(${idx}, 1)" title="Agregar uno">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                        <button class="caja-ctrl eliminar" onclick="window.cajaMod.eliminarDelCarrito(${idx})" title="Eliminar">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>
                <div class="precio num">$${(item.precio * item.cantidad).toFixed(2)}</div>
            </div>`).join('');
    }

    // Cálculo de totales (IVA Aditivo)
    // El precio de la BD se asume como Precio Base. Si aplica IVA, se le suma 16%.
    let subtotalReal = 0;
    let ivaReal = 0;
    let totalGeneral = 0;
    const totalItems = carrito.reduce((a, i) => a + i.cantidad, 0);

    carrito.forEach(item => {
        const precioBaseItem = item.precio * item.cantidad;
        subtotalReal += precioBaseItem;

        if (item.aplicaIva) {
            // El IVA se SUMA al precio base
            const ivaDelItem = precioBaseItem * 0.16;
            ivaReal += ivaDelItem;
            totalGeneral += (precioBaseItem + ivaDelItem);
        } else {
            // No aplica IVA
            totalGeneral += precioBaseItem;
        }
    });

    if (resumenEl) {
        resumenEl.innerHTML = `
            <span>Subtotal: <b class="num">$${subtotalReal.toFixed(2)}</b></span>
            <span>IVA 16%: <b class="num">$${ivaReal.toFixed(2)}</b></span>
            <span>Total: <b class="num">$${totalGeneral.toFixed(2)}</b></span>
            <span>Artículos: <b class="num">${totalItems}</b></span>`;
    }

    if (btnCobrar) {
        btnCobrar.innerHTML = `
            <span>Cobrar</span>
            <span class="num">$${totalGeneral.toFixed(2)}</span>`;
        btnCobrar.disabled = carrito.length === 0;
    }
    
    sincronizarGridStock();
}

function sincronizarGridStock() {
    todosLosProductos.forEach(prod => {
        const cant = carrito.find(item => item.id === prod.id)?.cantidad || 0;
        const stockRestante = (parseFloat(prod.stock_total) || 0) - cant;
        const sinStock = stockRestante <= 0;
        
        const card = document.querySelector(`.caja-producto[data-id="${prod.id}"]`);
        if (card) {
            const nombre = prod.nombre_comercial || 'Sin nombre';
            const precio = prod.precio_venta ? `$${parseFloat(prod.precio_venta).toFixed(2)}` : '$0.00';
            
            // Actualizar clases y atributos
            if (sinStock) {
                card.classList.add('sin-stock');
                card.setAttribute('onclick', '');
                card.setAttribute('tabindex', '-1');
                card.setAttribute('title', 'Sin existencias');
                card.setAttribute('aria-label', `${nombre} — ${precio} (Sin stock)`);
            } else {
                card.classList.remove('sin-stock');
                const aplicaIva = prod.metadata?.aplica_iva !== false;
                card.setAttribute('onclick', `window.cajaMod.agregarAlCarrito('${prod.id}', \`${nombre.replace(/`/g, '\\`')}\`, ${prod.precio_venta || 0}, ${aplicaIva})`);
                card.setAttribute('tabindex', '0');
                card.setAttribute('title', 'Agregar: ' + nombre);
                card.setAttribute('aria-label', `${nombre} — ${precio}`);
            }
            
            // Actualizar el badge visual
            const badgeCont = card.querySelector('.badge-container-stock');
            if (badgeCont) {
                if (sinStock) {
                    badgeCont.innerHTML = '<div class="caja-sin-stock-badge"><span class="material-symbols-rounded" style="font-size:12px;">block</span> Sin stock</div>';
                } else {
                    badgeCont.innerHTML = `<div class="caja-stock-badge" style="position:absolute; top:8px; right:8px; background:var(--cobalto, #032F40); color:white; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.2); pointer-events:none;">${stockRestante} disp.</div>`;
                }
            }
        }
    });
}

export function cambiarCantidad(idx, delta) {
    const item = carrito[idx];
    if (!item) return;

    if (delta > 0) {
        // ✅ Validar límite de stock antes de incrementar
        const stockMax = item.stockMax ?? Infinity;
        if (item.cantidad >= stockMax) {
            mostrarAlertaStock(item.nombre, stockMax);
            return;
        }
    }

    item.cantidad += delta;
    if (item.cantidad <= 0) carrito.splice(idx, 1);
    renderizarCarrito();
}

export function eliminarDelCarrito(idx) {
    carrito.splice(idx, 1);
    renderizarCarrito();
}

export function limpiarCarrito() {
    setHayDatosSinGuardar(false);
    carrito = [];
    contadorTransaccion++;
    actualizarNumeroTransaccion();
    renderizarCarrito();
}

function _guardarCarritoLocal() {
    localStorage.setItem('petprotect_caja_carrito', JSON.stringify(carrito));
}

function _cargarCarritoLocal() {
    const guardado = localStorage.getItem('petprotect_caja_carrito');
    if (guardado) {
        try {
            carrito = JSON.parse(guardado);
        } catch(e) {
            carrito = [];
        }
    }
}

// ─── Proceso de Cobro (Backend Supabase) ──────────────────────────────────────
function configurarCobro() {
    const btnCobrar = document.getElementById('caja-btn-cobrar');
    if (!btnCobrar) return;

    btnCobrar.addEventListener('click', async () => {
        if (carrito.length === 0) return;

        const subtotal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
        const iva      = subtotal * 0.16;
        const total    = subtotal + iva;

        abrirModalCheckout(total);
    });
}

function abrirModalCheckout(total) {
    const modal = document.getElementById('modal-checkout-caja');
    const txtTotal = document.getElementById('caja-checkout-total');
    const txtItems = document.getElementById('caja-checkout-items');
    
    if (!modal) return;

    // Asegurar superposición sobre TODA la interfaz (moviendo a document.body)
    if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }

    checkoutOpciones = { whatsapp: false, imprimir: true }; // Por defecto imprimir seleccionado
    actualizarUiOpciones();

    txtTotal.textContent = `$${total.toFixed(2)}`;
    txtItems.textContent = carrito.reduce((a, i) => a + i.cantidad, 0);
    document.getElementById('in-caja-whatsapp').value = '';
    document.getElementById('caja-input-monto-recibido').value = '';
    document.getElementById('caja-display-cambio').textContent = '$0.00';

    avanzarPasoCaja(1); // Siempre empezar en paso 1
    setMetodoPagoCaja('efectivo'); // Resetear a efectivo

    modal.style.display = 'flex';
}

export function cerrarModalCheckout() {
    const modal = document.getElementById('modal-checkout-caja');
    if (modal) modal.style.display = 'none';
}

// Control del Stepper
export function avanzarPasoCaja(paso) {
    document.querySelectorAll('.view-step').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.step-item').forEach(el => {
        el.classList.remove('active');
        const circle = el.querySelector('.step-circle');
        const text = el.querySelector('.step-text');
        if (circle) {
            circle.style.backgroundColor = 'var(--checkout-border)';
            circle.style.color = 'var(--checkout-texto)';
        }
        if (text) text.style.color = 'var(--checkout-texto)';
    });

    const vStep = document.getElementById(`caja-view-step-${paso}`);
    const navStep = document.getElementById(`caja-step-nav-${paso}`);
    
    if (vStep) vStep.style.display = 'block';
    
    if (navStep) {
        navStep.classList.add('active');
        const circle = navStep.querySelector('.step-circle');
        const text = navStep.querySelector('.step-text');
        if (circle) {
            circle.style.backgroundColor = 'var(--checkout-naranja)';
            circle.style.color = 'white';
        }
        if (text) text.style.color = 'var(--checkout-naranja)';
    }

    // Colorear lineas
    const line = document.getElementById('caja-line-nav-1');
    if (line) {
        line.style.backgroundColor = paso > 1 ? 'var(--checkout-naranja)' : 'var(--checkout-border)';
    }
}

// Control del Método de Pago
export function setMetodoPagoCaja(metodo) {
    checkoutMetodoPago = metodo;
    document.querySelectorAll('#caja-view-step-2 .metodo').forEach(el => {
        el.classList.remove('selected');
        el.style.borderColor = 'transparent';
        el.style.backgroundColor = 'white';
        const icon = el.querySelector('.material-symbols-rounded');
        const title = el.querySelector('.font-titulos');
        if (icon) icon.style.color = 'var(--checkout-texto)';
        if (title) title.style.color = 'var(--checkout-texto)';
    });

    const btn = document.getElementById(`caja-metodo-${metodo}`);
    if (btn) {
        btn.classList.add('selected');
        btn.style.borderColor = 'var(--checkout-naranja)';
        btn.style.backgroundColor = 'var(--checkout-naranja-claro)';
        const icon = btn.querySelector('.material-symbols-rounded');
        const title = btn.querySelector('.font-titulos');
        if (icon) icon.style.color = 'var(--checkout-naranja)';
        if (title) title.style.color = 'var(--checkout-naranja)';
    }

    const panelEfectivo = document.getElementById('caja-panel-efectivo');
    if (panelEfectivo) {
        panelEfectivo.style.display = metodo === 'efectivo' ? 'block' : 'none';
        if (metodo === 'efectivo') {
            document.getElementById('caja-input-monto-recibido').focus();
        }
    }
}

export function calcularCambioCaja() {
    const subtotal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
    const iva      = subtotal * 0.16;
    const total    = subtotal + iva;
    
    const inputMonto = document.getElementById('caja-input-monto-recibido');
    const displayCambio = document.getElementById('caja-display-cambio');
    
    if (!inputMonto || !displayCambio) return;

    const montoRecibido = parseFloat(inputMonto.value) || 0;
    const cambio = montoRecibido - total;

    if (cambio >= 0) {
        displayCambio.textContent = `$${cambio.toFixed(2)}`;
        displayCambio.style.color = 'var(--checkout-verde)'; // Verde si está cubierto
    } else {
        displayCambio.textContent = `Faltan $${Math.abs(cambio).toFixed(2)}`;
        displayCambio.style.color = 'var(--checkout-rojo)'; // Rojo si falta dinero
    }
}

export function toggleCheckoutOpcion(opcion) {
    if (opcion === 'whatsapp') {
        checkoutOpciones.whatsapp = true;
        checkoutOpciones.imprimir = false;
    } else if (opcion === 'imprimir') {
        checkoutOpciones.whatsapp = false;
        checkoutOpciones.imprimir = true;
    }
    actualizarUiOpciones();
}

function actualizarUiOpciones() {
    const cardWa = document.getElementById('card-caja-whatsapp');
    const cardImp = document.getElementById('card-caja-imprimir');
    const inputWa = document.getElementById('caja-checkout-wa-input');

    if (checkoutOpciones.whatsapp) {
        cardWa.style.borderColor = '#25D366';
        cardWa.style.backgroundColor = 'rgba(37, 211, 102, 0.05)';
        inputWa.style.display = 'block';
    } else {
        cardWa.style.borderColor = 'transparent';
        cardWa.style.backgroundColor = 'white';
        inputWa.style.display = 'none';
    }

    if (checkoutOpciones.imprimir) {
        cardImp.style.borderColor = 'var(--cobalto)';
        cardImp.style.backgroundColor = 'rgba(3, 47, 64, 0.05)';
    } else {
        cardImp.style.borderColor = 'transparent';
        cardImp.style.backgroundColor = 'white';
    }
}

export async function procesarPagoCheckout() {
    if (carrito.length === 0) return;

    if (checkoutOpciones.whatsapp) {
        const telefono = document.getElementById('in-caja-whatsapp').value.trim();
        if (telefono.length !== 10) {
            alert('Por favor, ingresa un número de celular válido de 10 dígitos.');
            return;
        }
    }

    const btnCobrar = document.getElementById('btn-caja-confirmar-pago');
    btnCobrar.disabled = true;
    btnCobrar.innerHTML = '<span class="material-symbols-rounded spin">sync</span> Registrando...';

    // Volver a calcular para la transacción a insertar
    let subtotalTrans = 0;
    let ivaTrans = 0;
    let totalTrans = 0;

    carrito.forEach(item => {
        const pTotal = item.precio * item.cantidad;
        totalTrans += pTotal;
        if (item.aplicaIva) {
            const base = pTotal / 1.16;
            subtotalTrans += base;
            ivaTrans += (pTotal - base);
        } else {
            subtotalTrans += pTotal;
        }
    });

    try {
        // 1. Insertar Transacción Principal
        const { data: transaccion, error: errTrans } = await conexionSupabase
            .from('caja_transacciones')
            .insert([{
                organizacion_id: perfilCaja.organizacion_id,
                sucursal_id: perfilCaja.sucursal_id,
                cajero_id: perfilCaja.id,
                tipo: 'ingreso',
                metodo_pago: checkoutMetodoPago, // Tomamos de la variable
                subtotal: subtotalTrans,
                descuento: 0,
                impuestos: ivaTrans,
                total: totalTrans,
                estatus: 'completada',
                notas: 'Cobro desde POS (Caja Registradora)'
            }])
            .select('id')
            .single();

        if (errTrans) throw errTrans;

        // 2. Insertar Detalles (Items del Ticket)
        const items = carrito.map(item => ({
            transaccion_id: transaccion.id,
            referencia_tipo: 'producto',
            referencia_id: item.id,
            nombre_item: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.cantidad * item.precio,
            tasa_iva: item.aplicaIva ? 16.00 : 0.00
        }));

        const { error: errItems } = await conexionSupabase
            .from('caja_transacciones_items')
            .insert(items);

        if (errItems) throw errItems;

        // 3. Generar Datos del Ticket
        const dataJsonTicket = generarDataTicketJSON(transaccion.id, totalTrans, subtotalTrans, ivaTrans);
        const htmlTicket = obtenerPlantillaTicket(dataJsonTicket);
        
        // 4. Si pide WhatsApp, enviar mensaje de texto con el total gastado
        if (checkoutOpciones.whatsapp) {
            const telefono = document.getElementById('in-caja-whatsapp').value.trim();
            const org = perfilCaja?.organizaciones || {};
            const nombreClinica = org.nombre_comercial || org.nombre_legal || "la clínica veterinaria";
            
            // Formatear el total
            const totalMxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalTrans);
            
            const mensajeWa = `¡Hola! 👋 Gracias por tu visita a *${nombreClinica}*.\n\nEl total de tu compra/servicio fue de *${totalMxn}*.\n\n¡Que tengas un excelente día! 🐾`;
            
            // Si el teléfono tiene menos de 10 digitos asume que está mal, pero igual intentamos
            const linkWa = `https://api.whatsapp.com/send?phone=52${telefono}&text=${encodeURIComponent(mensajeWa)}`;
            window.open(linkWa, '_blank');
        }

        // 5. Descontar stock de la memoria local
        carrito.forEach(item => {
            const idx = todosLosProductos.findIndex(p => p.id === item.id);
            if (idx > -1) {
                todosLosProductos[idx].stock_total = Math.max(0, (parseFloat(todosLosProductos[idx].stock_total) || 0) - item.cantidad);
            }
        });

        // 6. Si pide Imprimir, usar impresión local
        if (checkoutOpciones.imprimir) {
            imprimirTicketLocal(htmlTicket);
        }

        cerrarModalCheckout();
        limpiarCarrito();

        // Pequeño retardo para restaurar el botón y no bloquear si imprimió
        setTimeout(() => {
            btnCobrar.disabled = false;
            btnCobrar.innerHTML = 'Registrar Pago <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>';
        }, 1500);

    } catch (error) {
        console.error('[CAJA] Error al registrar cobro:', error);
        alert('❌ Error al procesar el pago: ' + error.message);
        btnCobrar.disabled = false;
        btnCobrar.innerHTML = 'Registrar Pago <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>';
    }
}

function generarDataTicketJSON(transaccionId, total, subtotal, iva) {
    const ahora = new Date();
    const org = perfilCaja?.organizaciones || {};
    const suc = perfilCaja?.sucursales || {};
    
    // Agrupar items del carrito
    const itemsTicket = carrito.map(item => ({
        descripcion: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        tasaIVA: item.aplicaIva ? 16 : 0 // IVA real del producto según config
    }));

    const ticketData = {
        clinica: {
            nombreComercial: org.nombre_legal || "Clínica Veterinaria",
            nombreLegal: org.nombre_legal || "Razón Social",
            logoUrl: org.logo_url || null,
            logoIniciales: org.nombre_legal ? org.nombre_legal.substring(0, 2).toUpperCase() : "CV",
            direccion: suc.direccion || "Dirección no registrada",
            telefono: suc.telefono || "",
            whatsapp: "", // Si existe en la BD
            correo: org.correo_contacto || "",
            sitioWeb: org.sitio_web || "",
            rfc: ""
        },
        ticket: {
            folio: transaccionId.substring(0,8).toUpperCase(),
            fecha: ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' }),
            hora: ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }),
            cajero: (perfilCaja?.nombre || "Cajero") + " " + (perfilCaja?.apellidos || ""),
            caja: "Caja Principal",
            sucursal: suc.nombre || "Matriz"
        },
        categorias: [
            {
                id: "productos",
                titulo: "Productos",
                icono: "package",
                items: itemsTicket
            }
        ],
        pago: {
            metodo: checkoutMetodoPago,
            efectivoRecibido: checkoutMetodoPago === 'efectivo' ? parseFloat(document.getElementById('caja-input-monto-recibido').value) || 0 : 0,
            cambio: checkoutMetodoPago === 'efectivo' ? (parseFloat(document.getElementById('caja-input-monto-recibido').value) - total) : 0,
            referencia: ""
        }
    };

    return JSON.stringify(ticketData);
}

function imprimirTicketLocal(htmlTicketString) {
    // Abrir una ventana nueva invisible o un iframe temporal para imprimir limpio
    const ventanaImpresion = window.open('', '_blank', 'width=400,height=600');
    if (ventanaImpresion) {
        ventanaImpresion.document.write(htmlTicketString);
        ventanaImpresion.document.close();
        ventanaImpresion.focus();
        // Esperamos a que el navegador procese el render antes de llamar print
        setTimeout(() => {
            ventanaImpresion.print();
            ventanaImpresion.close();
        }, 250);
    } else {
        alert('Por favor, permite las ventanas emergentes (pop-ups) para imprimir el ticket.');
    }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function actualizarNumeroTransaccion() {
    const el = document.getElementById('caja-num-transaccion');
    if (el) el.textContent = `#${String(contadorTransaccion).padStart(7, '0')}`;
}

function mostrarErrorCatalogo(msg) {
    const grid = document.getElementById('caja-grid-productos');
    if (grid) {
        grid.innerHTML = `
            <div class="caja-estado-grid" style="color:#EF4444;">
                <span class="material-symbols-rounded caja-icon-estado">error_outline</span>
                <span style="font-size:12.5px;">${msg}</span>
            </div>`;
    }
}

// ─── Exposición global (requerida por onclick en HTML dinámico) ───────────────
window.cajaMod = {
    agregarAlCarrito,
    cambiarCantidad,
    eliminarDelCarrito,
    limpiarCarrito,
    cerrarModalCheckout,
    toggleCheckoutOpcion,
    procesarPagoCheckout,
    avanzarPasoCaja,
    setMetodoPagoCaja,
    calcularCambioCaja
};
