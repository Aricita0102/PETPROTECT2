/**
 * MÓDULO: Centro de Impresión (PET PROTECT)
 * DESCRIPCIÓN: Gestión de cola de impresión masiva.
 * SOPORTA: Impresoras Láser/Inyección (A4/Carta) e Impresoras Térmicas (Rollos).
 * CONVENCIÓN: IDs y clases actualizados al sistema BEM "ci-*".
 */

import '../../../css/centro_impresion.css';
import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';

let perfilUsuarioActivo = null;
let catalogoProductos = [];

export async function inicializarCentroImpresion() {
    console.log('[IMPRESIÓN] Inicializando Centro Universal de Etiquetas...');

    try {
        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) throw new Error('Sin sesion activa');

        perfilUsuarioActivo = sesion.perfil;
    } catch (error) {
        console.error('[IMPRESIÓN] Error de auth:', error);
        return;
    }

    const btnLimpiar  = document.getElementById('btn-limpiar-cola');
    const botonesAgregar = document.querySelectorAll('.btn-agregar-cola');

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarCola);
    }

    configurarBuscadorFiltros();
    configurarEventosCola();

    await cargarCatalogoProductos();
}

async function cargarCatalogoProductos() {
    const tbody = document.getElementById('ci-tabla-body');
    if (!tbody) return;

    try {
        const { data: productos, error } = await conexionSupabase
            .from('inventario_productos')
            .select('*')
            .eq('organizacion_id', perfilUsuarioActivo.organizacion_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        catalogoProductos = productos;

        if (!productos || productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 32px; color: var(--ci-text-muted);">
                        <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;">inventory_2</span>
                        <div style="font-weight: 500;">No hay productos en el inventario.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        productos.forEach(prod => {
            const tr = document.createElement('tr');
            
            // Usar codigo_barras. Si no tiene, generar un temporal seguro.
            const sku = prod.codigo_barras || `TEMP-${prod.id.split('-')[0]}`;
            const nombre = prod.nombre_comercial || 'Producto sin nombre';
            const categoria = prod.categoria || 'insumos';
            const areaLabel = categoria.charAt(0).toUpperCase() + categoria.slice(1);
            
            // Determinar ícono de fallback
            let iconoFallback = 'inventory_2';
            if (categoria === 'farmacia') iconoFallback = 'vaccines';
            if (categoria === 'tienda') iconoFallback = 'shopping_bag';
            if (categoria === 'dietas') iconoFallback = 'set_meal';

            let mediaHTML = '';
            if (prod.imagen_url && prod.imagen_url.trim() !== '') {
                mediaHTML = `<img src="${prod.imagen_url}" alt="${nombre}" class="ci-product-cell__img" loading="lazy">`;
            } else {
                mediaHTML = `
                    <div class="ci-product-cell__icon ci-product-cell__icon--${categoria}">
                        <span class="material-symbols-rounded" aria-hidden="true">${iconoFallback}</span>
                    </div>
                `;
            }

            tr.setAttribute('data-sku', sku);
            tr.setAttribute('data-nombre', nombre);
            tr.setAttribute('data-area', categoria);

            tr.innerHTML = `
                <td>
                    <div class="ci-product-cell">
                        ${mediaHTML}
                        <div class="ci-product-cell__info">
                            <strong>${nombre}</strong>
                            <code class="ci-sku">${sku}</code>
                        </div>
                    </div>
                </td>
                <td class="ci-table__col--area">
                    <span class="ci-badge ci-badge--${categoria}">${areaLabel}</span>
                </td>
                <td class="ci-table__col--action">
                    <button class="ci-btn ci-btn--add btn-agregar-cola" aria-label="Agregar ${nombre} a la cola" style="background:rgba(137, 194, 217, 0.15); color:var(--cobalto); border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:4px; transition:all 0.2s;">
                        <span class="material-symbols-rounded" aria-hidden="true" style="font-size:18px;">add</span>
                        <span class="ci-btn__label">Agregar</span>
                    </button>
                </td>
            `;

            // Vincular evento
            const btn = tr.querySelector('.btn-agregar-cola');
            btn.addEventListener('click', (e) => {
                const fila = e.target.closest('tr');
                const skuFila = fila.getAttribute('data-sku');
                const nombreFila = fila.getAttribute('data-nombre');
                agregarItemACola(skuFila, nombreFila);
            });

            tbody.appendChild(tr);
        });
        
        // Disparar filtrado por si había algo escrito
        const input = document.getElementById('input-busqueda-global');
        if (input) input.dispatchEvent(new Event('input'));

    } catch (err) {
        console.error('[IMPRESIÓN] Error cargando catálogo:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 32px; color: #EF4444;">
                    <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;">error</span>
                    <div style="font-weight: 500;">Error al cargar el catálogo.</div>
                </td>
            </tr>
        `;
    }
}

// ==========================================================================
// COLA: Agregar, Eliminar, Actualizar
// ==========================================================================

function agregarItemACola(sku, nombre) {
    const listaCola   = document.getElementById('lista-cola-impresion');
    const estadoVacio = document.getElementById('estado-vacio-impresion');
    const btnGenerar  = document.getElementById('btn-generar-planilla');

    if (!listaCola) return;

    // Si el SKU ya existe, solo incrementa la cantidad
    const itemExistente = listaCola.querySelector(`.ci-item[data-sku="${sku}"]`);
    if (itemExistente) {
        const inputCant = itemExistente.querySelector('.input-cant');
        inputCant.value = parseInt(inputCant.value) + 1;
        actualizarContador();
        // Micro-feedback: resaltar el item existente
        itemExistente.style.transition = 'box-shadow 0.15s';
        itemExistente.style.boxShadow  = '0 0 0 2px #89C2D9';
        setTimeout(() => { itemExistente.style.boxShadow = ''; }, 700);
        return;
    }

    // Mostrar lista y habilitar botón
    if (estadoVacio) estadoVacio.style.display = 'none';
    if (listaCola)   listaCola.style.display   = 'flex';
    if (btnGenerar)  btnGenerar.disabled        = false;

    // Crear item con estructura BEM ci-item
    const item = document.createElement('div');
    item.className = 'ci-item';
    item.setAttribute('data-sku', sku);
    item.innerHTML = `
        <div class="ci-item__info" style="display:flex; flex-direction:column; gap:2px; flex:1; min-width:0;">
            <span class="ci-item__name" title="${nombre}" style="font-size:13px; font-weight:600; color:var(--cobalto); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${nombre}</span>
            <span class="ci-item__sku" style="font-size:11px; color:var(--texto-mut);">SKU: ${sku}</span>
        </div>
        <div class="ci-item__controls" style="display:flex; align-items:center; gap:8px;">
            <div class="ci-stepper" aria-label="Cantidad de etiquetas" style="display:flex; align-items:center; border:1px solid var(--borde); border-radius:8px; overflow:hidden; background:white;">
                <button class="btn-restar-cant" aria-label="Disminuir cantidad" style="background:transparent; border:none; padding:4px 8px; cursor:pointer; color:var(--texto-mut); transition:background 0.2s;">
                    <span class="material-symbols-rounded" aria-hidden="true" style="font-size:16px;">remove</span>
                </button>
                <input type="number" class="input-cant" value="1" min="1" max="999" aria-label="Cantidad" style="width:40px; text-align:center; border:none; border-left:1px solid var(--borde); border-right:1px solid var(--borde); font-size:13px; font-weight:600; color:var(--cobalto); outline:none; padding:4px 0;">
                <button class="btn-sumar-cant" aria-label="Aumentar cantidad" style="background:transparent; border:none; padding:4px 8px; cursor:pointer; color:var(--texto-mut); transition:background 0.2s;">
                    <span class="material-symbols-rounded" aria-hidden="true" style="font-size:16px;">add</span>
                </button>
            </div>
            <button class="ci-item__remove btn-eliminar-item" aria-label="Eliminar ${nombre} de la cola" style="background:rgba(239, 68, 68, 0.1); border:none; color:#EF4444; padding:6px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; transition:background 0.2s;">
                <span class="material-symbols-rounded" aria-hidden="true" style="font-size:18px;">close</span>
            </button>
        </div>
    `;

    listaCola.appendChild(item);
    actualizarContador();
}

function configurarEventosCola() {
    const listaCola  = document.getElementById('lista-cola-impresion');
    const btnGenerar = document.getElementById('btn-generar-planilla');

    if (!listaCola) return;

    // Delegación de eventos para la cola completa
    listaCola.addEventListener('click', (e) => {
        const btnEliminar = e.target.closest('.btn-eliminar-item');
        const btnSumar    = e.target.closest('.btn-sumar-cant');
        const btnRestar   = e.target.closest('.btn-restar-cant');

        if (btnEliminar) {
            const item = btnEliminar.closest('.ci-item');
            // Animación de salida
            item.style.transition  = 'opacity 150ms, transform 150ms';
            item.style.opacity     = '0';
            item.style.transform   = 'scale(0.95)';
            setTimeout(() => {
                item.remove();
                verificarEstadoCola();
            }, 150);

        } else if (btnSumar) {
            const input = btnSumar.closest('.ci-stepper').querySelector('.input-cant');
            const max   = parseInt(input.max) || 999;
            if (parseInt(input.value) < max) {
                input.value = parseInt(input.value) + 1;
            }

        } else if (btnRestar) {
            const input = btnRestar.closest('.ci-stepper').querySelector('.input-cant');
            if (parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
            }
        }

        actualizarContador();
    });

    // Input directo de cantidad
    listaCola.addEventListener('input', (e) => {
        if (e.target.classList.contains('input-cant')) {
            const val = parseInt(e.target.value);
            if (isNaN(val) || val < 1)   e.target.value = 1;
            if (val > 999)                e.target.value = 999;
            actualizarContador();
        }
    });

    if (btnGenerar) {
        btnGenerar.addEventListener('click', dispararImpresion);
    }
}

// ==========================================================================
// MOTORES DE IMPRESIÓN DUALES
// ==========================================================================

function dispararImpresion() {
    const items = document.querySelectorAll('.ci-item');
    const tipoImpresora = document.querySelector('input[name="tipo_impresora"]:checked')?.value || 'a4';

    if (!items.length) return;

    const listaEtiquetas = [];
    items.forEach(item => {
        listaEtiquetas.push({
            sku:      item.getAttribute('data-sku'),
            nombre:   item.querySelector('.ci-item__name').textContent.trim(),
            cantidad: parseInt(item.querySelector('.input-cant').value) || 1
        });
    });

    if (tipoImpresora === 'a4') {
        generarImpresionNormalLaser(listaEtiquetas);
    } else {
        generarImpresionTermicaMasiva(listaEtiquetas);
    }
}

/**
 * MOTOR 1: IMPRESORA NORMAL / LÁSER (Planilla en cuadrícula A4/Carta)
 */
function generarImpresionNormalLaser(listaEtiquetas) {
    const ventana = window.open('', 'PRINT', 'height=800,width=800');
    let htmlEtiquetas = '';
    const arrayJSBarcode = [];
    let idCounter = 0;

    listaEtiquetas.forEach(item => {
        for (let i = 0; i < item.cantidad; i++) {
            const barcodeId = `barcode-${idCounter}`;
            htmlEtiquetas += `
                <div class="etiqueta-box">
                    <div class="titulo">${item.nombre}</div>
                    <svg id="${barcodeId}"></svg>
                    <div class="sku-text">${item.sku}</div>
                </div>
            `;
            arrayJSBarcode.push({ id: barcodeId, sku: item.sku });
            idCounter++;
        }
    });

    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Planilla A4 — PET PROTECT</title>
            <style>
                @page { margin: 8mm; size: letter; }
                * { box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
                .planilla-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 3mm;
                }
                .etiqueta-box {
                    border: 1px dashed #CBD5E1;
                    padding: 3mm;
                    text-align: center;
                    height: 36mm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1mm;
                    page-break-inside: avoid;
                }
                .titulo {
                    font-size: 9px;
                    font-weight: 700;
                    line-height: 1.3;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    width: 100%;
                }
                .sku-text {
                    font-size: 7px;
                    color: #64748B;
                    font-family: 'Courier New', monospace;
                }
                svg { width: 100%; height: 14mm; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head>
        <body><div class="planilla-grid">${htmlEtiquetas}</div></body>
        </html>
    `);

    inyectarJsBarcodeYImprimir(ventana, arrayJSBarcode, {
        format: 'CODE128',
        displayValue: false,
        height: 42,
        margin: 0
    });
}

/**
 * MOTOR 2: IMPRESORA TÉRMICA (Rollo continuo 50×30mm)
 */
function generarImpresionTermicaMasiva(listaEtiquetas) {
    const ventana = window.open('', 'PRINT', 'height=400,width=600');
    let htmlEtiquetas = '';
    const arrayJSBarcode = [];
    let idCounter = 0;

    listaEtiquetas.forEach(item => {
        for (let i = 0; i < item.cantidad; i++) {
            const barcodeId = `barcode-${idCounter}`;
            htmlEtiquetas += `
                <div class="etiqueta-termica">
                    <div class="titulo">${item.nombre}</div>
                    <svg id="${barcodeId}"></svg>
                </div>
            `;
            arrayJSBarcode.push({ id: barcodeId, sku: item.sku });
            idCounter++;
        }
    });

    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Rollo Térmico — PET PROTECT</title>
            <style>
                @page { margin: 0; size: 50mm 30mm; }
                * { box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
                .etiqueta-termica {
                    width: 48mm;
                    height: 28mm;
                    margin: 0 auto;
                    padding-top: 1.5mm;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    page-break-after: always;
                    overflow: hidden;
                }
                .titulo { font-size: 8px; font-weight: 700; margin-bottom: 1mm; width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                svg { width: 100%; height: 13mm; }
            </style>
        </head>
        <body>${htmlEtiquetas}</body>
        </html>
    `);

    inyectarJsBarcodeYImprimir(ventana, arrayJSBarcode, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 10,
        height: 32,
        margin: 0
    });
}

// ==========================================================================
// UTILIDADES COMUNES
// ==========================================================================

function inyectarJsBarcodeYImprimir(ventanaDestino, arrayElementos, configuracion) {
    const script = ventanaDestino.document.createElement('script');
    script.src   = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js';

    script.onload = () => {
        arrayElementos.forEach(item => {
            try {
                ventanaDestino.JsBarcode(`#${item.id}`, item.sku, configuracion);
            } catch (err) {
                console.warn(`[BARCODE] No se pudo generar código para SKU: ${item.sku}`, err);
            }
        });

        ventanaDestino.document.close();

        setTimeout(() => {
            ventanaDestino.focus();
            ventanaDestino.print();
            ventanaDestino.close();
        }, 600);
    };

    script.onerror = () => {
        console.error('[BARCODE] No se pudo cargar JsBarcode desde CDN.');
        ventanaDestino.document.close();
        ventanaDestino.print();
        ventanaDestino.close();
    };

    ventanaDestino.document.body.appendChild(script);
}

function limpiarCola() {
    const listaCola = document.getElementById('lista-cola-impresion');
    if (listaCola) listaCola.innerHTML = '';
    verificarEstadoCola();
}

function verificarEstadoCola() {
    const listaCola   = document.getElementById('lista-cola-impresion');
    const estadoVacio = document.getElementById('estado-vacio-impresion');
    const btnGenerar  = document.getElementById('btn-generar-planilla');

    if (!listaCola) return;

    const hayItems = listaCola.querySelector('.ci-item');

    if (!hayItems) {
        listaCola.style.display   = 'none';
        if (estadoVacio) estadoVacio.style.display = 'flex';
        if (btnGenerar)  btnGenerar.disabled        = true;
    }
    actualizarContador();
}

function actualizarContador() {
    const items    = document.querySelectorAll('.ci-item');
    const contador = document.getElementById('contador-etiquetas');
    let total = 0;

    items.forEach(item => {
        total += parseInt(item.querySelector('.input-cant')?.value) || 0;
    });

    if (contador) {
        contador.textContent = total === 0
            ? '0 etiquetas'
            : `${total} ${total === 1 ? 'etiqueta' : 'etiquetas'}`;
    }
}

function configurarBuscadorFiltros() {
    const input    = document.getElementById('input-busqueda-global');
    const select   = document.getElementById('select-area-inventario');
    const filas    = document.querySelectorAll('#tabla-catalogo-impresion tbody tr');
    const emptyMsg = document.getElementById('ci-empty-search');

    const filtrar = () => {
        const texto = (input?.value || '').toLowerCase().trim();
        const area  = select?.value || 'todos';
        let visibles = 0;

        filas.forEach(fila => {
            const coincideTexto = fila.textContent.toLowerCase().includes(texto);
            const coincideArea  = area === 'todos' || fila.getAttribute('data-area') === area;
            const visible       = coincideTexto && coincideArea;
            fila.style.display  = visible ? '' : 'none';
            if (visible) visibles++;
        });

        if (emptyMsg) {
            emptyMsg.style.display = visibles === 0 ? 'flex' : 'none';
        }
    };

    if (input)  input.addEventListener('input', filtrar);
    if (select) select.addEventListener('change', filtrar);
}