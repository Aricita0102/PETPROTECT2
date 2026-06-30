// ==========================================================================
// CONTROLADOR PANEL NOTIFICACIONES — PET PROTECT
// Archivo: /src/js/vistas/panel_notificaciones.js
// Lee alertas de inventario_productos (tienda + dietas + farmacia)
// Se inicializa desde principal_v2.js al montar el SPA.
// ==========================================================================
import { conexionSupabase } from '../infraestructura/conexion.js';

// ── ESTADO ──────────────────────────────────────────────────────────────────
let _orgId = null;
let _todasLasNotifs = [];          // Cache de todas las alertas cargadas
let _filtroActivo = 'todos';       // Chip activo
let _yaLeidas = new Set();         // IDs de alertas leídas (localStorage)
let _noLeidas = new Set();         // IDs no leídas, recalculado en cada carga
let _canalRealtime = null;

// ── HELPERS DE TIEMPO ────────────────────────────────────────────────────────
function _agruparPorFecha(items) {
    const hoy  = new Date(); hoy.setHours(0,0,0,0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const semana = new Date(hoy); semana.setDate(semana.getDate() - 7);

    const grupos = { 'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Anterior': [] };

    items.forEach(n => {
        const d = new Date(n.created_at); d.setHours(0,0,0,0);
        if (d >= hoy)          grupos['Hoy'].push(n);
        else if (d >= ayer)    grupos['Ayer'].push(n);
        else if (d >= semana)  grupos['Esta semana'].push(n);
        else                   grupos['Anterior'].push(n);
    });

    return grupos;
}

function _tiempoRelativo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const min  = Math.floor(diff / 60000);
    const hr   = Math.floor(diff / 3600000);
    const dia  = Math.floor(diff / 86400000);
    if (min  < 1)   return 'Ahora mismo';
    if (min  < 60)  return `hace ${min} min`;
    if (hr   < 24)  return `hace ${hr} h`;
    if (dia  < 7)   return `hace ${dia} días`;
    return new Date(isoStr).toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
}

// ── MAPEO DE TIPOS ───────────────────────────────────────────────────────────
function _metaTipo(tipo) {
    const mapa = {
        stock:    { icono: 'inventory_2',  claseIco: 'stock',    claseBadge: 'stock',    label: 'Inventario' },
        urgencia: { icono: 'emergency',    claseIco: 'urgencia', claseBadge: 'urgencia', label: 'Urgencia'   },
        sistema:  { icono: 'notifications',claseIco: 'sistema',  claseBadge: 'sistema',  label: 'Sistema'    },
        ok:       { icono: 'check_circle', claseIco: 'ok',       claseBadge: 'sistema',  label: 'Info'       },
        cita:     { icono: 'calendar_month', claseIco: 'ok',       claseBadge: 'sistema',  label: 'Agenda'     },
        lote:     { icono: 'warning',        claseIco: 'urgencia', claseBadge: 'urgencia', label: 'Caducidad'  },
        vacuna:   { icono: 'vaccines',       claseIco: 'stock',    claseBadge: 'stock',    label: 'Preventiva' },
        caja:     { icono: 'point_of_sale',  claseIco: 'urgencia', claseBadge: 'urgencia', label: 'Finanzas'   },
    };
    return mapa[tipo] || mapa.sistema;
}

// ── PERSISTENCIA DE LEÍDAS ───────────────────────────────────────────────────
function _cargarNoLeidas() {
    try {
        const raw = localStorage.getItem('pp_notif_leidas');
        _yaLeidas = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { _yaLeidas = new Set(); }
}

function _guardarNoLeidas() {
    // Limpiar huérfanos para no saturar localStorage
    const idsActivos = _todasLasNotifs.map(n => n.id);
    _yaLeidas = new Set([..._yaLeidas].filter(id => idsActivos.includes(id)));
    localStorage.setItem('pp_notif_leidas', JSON.stringify([..._yaLeidas]));
}

function _marcarLeida(id) {
    _yaLeidas.add(id);
    _noLeidas.delete(id);
    _guardarNoLeidas();
    _actualizarContadorBadge();
}

function _marcarTodasLeidas() {
    _todasLasNotifs.forEach(n => _yaLeidas.add(n.id));
    _noLeidas.clear();
    _guardarNoLeidas();
    _actualizarContadorBadge();
    _renderNotifs(_filtroActivo);
}

function _actualizarContadorBadge() {
    const badge = document.getElementById('contador-alertas');
    const count = _noLeidas.size;
    if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// ── CARGA DESDE SUPABASE ─────────────────────────────────────────────────────
async function _cargarNotificaciones() {
    if (!_orgId) return;

    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const hoyFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();
    
    const fechaMas30Dias = new Date();
    fechaMas30Dias.setDate(fechaMas30Dias.getDate() + 30);
    const limiteCaducidad = fechaMas30Dias.toISOString();

    const fechaMas7Dias = new Date();
    fechaMas7Dias.setDate(fechaMas7Dias.getDate() + 7);
    const limitePreventivo = fechaMas7Dias.toISOString();

    // Promesas Concurrentes para máxima velocidad
    const pProductos = conexionSupabase
        .from('inventario_productos')
        .select('id, nombre_comercial, stock_total, stock_minimo, categoria, updated_at')
        .eq('organizacion_id', _orgId)
        .in('categoria', ['tienda', 'dietas', 'farmacia', 'insumos']);
        
    const pCitas = conexionSupabase
        .from('citas')
        .select('id, fecha_hora, paciente_id, pacientes(nombre), estatus, created_at')
        .eq('organizacion_id', _orgId)
        .eq('estatus', 'programada')
        .gte('fecha_hora', hoyInicio)
        .lte('fecha_hora', hoyFin);
        
    const pLotes = conexionSupabase
        .from('inventario_lotes')
        .select('id, numero_lote, fecha_caducidad, producto_id, inventario_productos!inner(nombre_comercial, categoria, organizacion_id)')
        .eq('inventario_productos.organizacion_id', _orgId)
        .eq('estado', 'activo')
        .lte('fecha_caducidad', limiteCaducidad);
        
    const pPreventiva = conexionSupabase
        .from('pacientes_preventiva')
        .select('id, paciente_id, nombre_procedimiento, proxima_aplicacion, pacientes(nombre, cliente_id)')
        .eq('organizacion_id', _orgId)
        .lte('proxima_aplicacion', limitePreventivo);
        
    const pCaja = conexionSupabase
        .from('caja_transacciones')
        .select('id, total, created_at, clientes(nombre_completo)')
        .eq('organizacion_id', _orgId)
        .eq('estatus', 'pendiente');

    const [resProd, resCitas, resLotes, resPrev, resCaja] = await Promise.all([
        pProductos, pCitas, pLotes, pPreventiva, pCaja
    ]);

    _todasLasNotifs = [];

    // 1. Stock / Productos
    if (resProd.data) {
        resProd.data.forEach(p => {
            const stockActual = parseFloat(p.stock_total || 0);
            const stockMin    = parseFloat(p.stock_minimo || 0);

            if (stockActual <= 0) {
                _todasLasNotifs.push({
                    id:         `agotado-${p.id}`,
                    tipo:       'stock',
                    titulo:     'Producto Agotado',
                    mensaje:    `"${p.nombre_comercial}" está completamente agotado. Requiere reabastecimiento urgente.`,
                    categoria:  p.categoria,
                    created_at: p.updated_at || new Date().toISOString(),
                    severo:     true,
                });
                _noLeidas.add(`agotado-${p.id}`);
            } else if (stockActual <= stockMin) {
                _todasLasNotifs.push({
                    id:         `bajo-${p.id}`,
                    tipo:       'stock',
                    titulo:     'Inventario Bajo',
                    mensaje:    `"${p.nombre_comercial}" llegó a stock mínimo (${stockActual} unidades).`,
                    categoria:  p.categoria,
                    created_at: p.updated_at || new Date().toISOString(),
                    severo:     false,
                });
                _noLeidas.add(`bajo-${p.id}`);
            }
        });
    }

    // 2. Citas Inminentes (Día de hoy)
    if (resCitas.data) {
        resCitas.data.forEach(c => {
            const fechaCita = new Date(c.fecha_hora);
            const diffMinutos = (fechaCita - new Date()) / 60000;
            // Solo alertar si la cita es en las proximas 2 horas o si ya pasó la hora y sigue programada
            if (diffMinutos <= 120) {
                const nombrePac = c.pacientes?.nombre || 'Paciente';
                _todasLasNotifs.push({
                    id:         `cita-${c.id}`,
                    tipo:       'cita',
                    titulo:     'Cita Inminente',
                    mensaje:    `Cita programada para ${nombrePac} a las ${fechaCita.toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}.`,
                    categoria:  'agenda',
                    created_at: c.created_at || new Date().toISOString(),
                    severo:     diffMinutos <= 15, // rojo si falta poco
                    ref_id:     c.paciente_id
                });
                _noLeidas.add(`cita-${c.id}`);
            }
        });
    }

    // 3. Lotes por Caducar
    if (resLotes.data) {
        resLotes.data.forEach(l => {
            const productoNombre = l.inventario_productos?.nombre_comercial || 'Medicamento';
            const cat = l.inventario_productos?.categoria || 'farmacia';
            _todasLasNotifs.push({
                id:         `lote-${l.id}`,
                tipo:       'lote',
                titulo:     'Lote por Caducar',
                mensaje:    `El lote ${l.numero_lote} de "${productoNombre}" caduca el ${new Date(l.fecha_caducidad).toLocaleDateString('es-MX')}.`,
                categoria:  cat,
                created_at: new Date().toISOString(),
                severo:     true,
                ref_id:     l.producto_id
            });
            _noLeidas.add(`lote-${l.id}`);
        });
    }

    // 4. Vacunas / Preventiva
    if (resPrev.data) {
        resPrev.data.forEach(v => {
            if (!v.proxima_aplicacion) return;
            const nombrePac = v.pacientes?.nombre || 'Mascota';
            const idCliente = v.pacientes?.cliente_id;
            _todasLasNotifs.push({
                id:         `vacuna-${v.id}`,
                tipo:       'vacuna',
                titulo:     'Recordatorio Preventivo',
                mensaje:    `${nombrePac} requiere ${v.nombre_procedimiento} (Fecha sugerida: ${new Date(v.proxima_aplicacion).toLocaleDateString('es-MX')}).`,
                categoria:  'preventiva',
                created_at: new Date().toISOString(),
                severo:     false,
                ref_id:     `${v.paciente_id}|${idCliente}`
            });
            _noLeidas.add(`vacuna-${v.id}`);
        });
    }

    // 5. Caja Transacciones Pendientes
    if (resCaja.data) {
        resCaja.data.forEach(t => {
            const cliente = t.clientes?.nombre_completo || 'Cliente General';
            _todasLasNotifs.push({
                id:         `caja-${t.id}`,
                tipo:       'caja',
                titulo:     'Cobro Pendiente',
                mensaje:    `Hay un cobro pendiente en caja por $${parseFloat(t.total).toFixed(2)} de ${cliente}.`,
                categoria:  'finanzas',
                created_at: t.created_at || new Date().toISOString(),
                severo:     true,
                ref_id:     t.id
            });
            _noLeidas.add(`caja-${t.id}`);
        });
    }

    // Ordenar todas las notifs por created_at descendente simulado
    _todasLasNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Recalcular _noLeidas real
    _noLeidas.clear();
    _todasLasNotifs.forEach(n => {
        if (!_yaLeidas.has(n.id)) {
            _noLeidas.add(n.id);
        }
    });

    // ── EXPONER AL SISTEMA GLOBAL (Dashboard) ──
    window._petprotect_notifs = _todasLasNotifs;
    window.dispatchEvent(new Event('petprotect:notifs_actualizadas'));

    _guardarNoLeidas();
    _actualizarContadorBadge();
    _actualizarResumen();
    _renderNotifs(_filtroActual());
}

// ── RENDER PRINCIPAL ─────────────────────────────────────────────────────────
function _renderNotifs(filtradas) {
    const cuerpo = document.getElementById('notifCuerpo');
    if (!cuerpo) return;

    if (filtradas.length === 0) {
        cuerpo.innerHTML = `
        <div class="notif-vacio" role="status">
            <span class="material-symbols-rounded" aria-hidden="true">notifications_off</span>
            <p>Sin alertas en esta categoría</p>
        </div>`;
        return;
    }

    const grupos  = _agruparPorFecha(filtradas);
    let html = '';

    for (const [label, items] of Object.entries(grupos)) {
        if (!items.length) continue;
        html += `<div class="notif-grupo" role="group" aria-label="Notificaciones: ${label}">
                     <p class="notif-grupo-titulo">${label}</p>`;

        items.forEach(n => {
            const meta      = _metaTipo(n.tipo);
            const noLeido   = _noLeidas.has(n.id);
            const claseItem = `notif-item ${noLeido ? 'no-leido' : ''}`;

            let accionStr = '';
            let labelBoton = '';
            
            if (n.tipo === 'stock') {
                accionStr = `accion: 'REABASTECER', id: '${n.id.replace('agotado-', '').replace('bajo-', '')}', categoria: '${n.categoria}'`;
                labelBoton = 'Reabastecer';
            } else if (n.tipo === 'cita') {
                accionStr = `accion: 'INICIAR_CONSULTA', ref_id: '${n.ref_id}'`;
                labelBoton = 'Iniciar Consulta';
            } else if (n.tipo === 'lote') {
                accionStr = `accion: 'GESTIONAR_LOTE', ref_id: '${n.ref_id}', categoria: '${n.categoria}'`;
                labelBoton = 'Gestionar Lote';
            } else if (n.tipo === 'vacuna') {
                accionStr = `accion: 'AGENDAR_CITA', ref_id: '${n.ref_id}'`;
                labelBoton = 'Agendar Cita';
            } else if (n.tipo === 'caja') {
                accionStr = `accion: 'IR_A_CAJA', ref_id: '${n.ref_id}'`;
                labelBoton = 'Ir a Cobrar';
            }

            const accionesHTML = accionStr ? `
            <div class="notif-acciones" style="margin-top: 8px;">
                <button class="notif-btn-accion-interactiva" 
                        onclick="window.dispatchEvent(new CustomEvent('petprotect:accion_notif', { detail: { ${accionStr} } })); window._marcarLeidaProxy && window._marcarLeidaProxy('${n.id}'); event.stopPropagation(); this.closest('.notif-item').classList.add('oculto');"
                        style="background: transparent; border: 1px solid var(--naranja); color: var(--naranja); border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                    ${labelBoton}
                </button>
            </div>` : '';

            html += `
            <article class="${claseItem}" 
                     role="listitem"
                     data-id="${n.id}"
                     tabindex="0"
                     aria-label="${n.titulo}">
                ${noLeido ? `<span class="notif-dot-noLeido" aria-hidden="true"></span>` : ''}
                <div class="notif-icono-wrap ${meta.claseIco}" aria-hidden="true">
                    <span class="material-symbols-rounded">${meta.icono}</span>
                </div>
                <div class="notif-texto">
                    <p class="notif-texto-titulo">${n.titulo}</p>
                    <p class="notif-texto-desc">${n.mensaje}</p>
                    <div class="notif-meta">
                        <span class="notif-tiempo">${_tiempoRelativo(n.created_at)}</span>
                        <span class="notif-categoria-badge ${meta.claseBadge}">${n.categoria || meta.label}</span>
                    </div>
                    ${accionesHTML}
                </div>
            </article>`;
        });

        html += `</div>`;
    }

    cuerpo.innerHTML = html;

    // Exponer _marcarLeida globalmente de forma temporal solo para el onclick en linea
    window._marcarLeidaProxy = (id) => _marcarLeida(id);

    // Marcar como leída al hacer clic
    cuerpo.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.id;
            _marcarLeida(id);
            el.classList.remove('no-leido');
            el.querySelector('.notif-dot-noLeido')?.remove();
        });
    });
}

// ── FILTROS ──────────────────────────────────────────────────────────────────
function _filtroActual() {
    const busqueda = (document.getElementById('notifInputBuscar')?.value || '').toLowerCase().trim();
    let resultado  = _todasLasNotifs;

    if (_filtroActivo !== 'todos') {
        resultado = resultado.filter(n => n.tipo === _filtroActivo);
    }

    if (busqueda) {
        resultado = resultado.filter(n =>
            n.titulo.toLowerCase().includes(busqueda) ||
            n.mensaje.toLowerCase().includes(busqueda) ||
            (n.categoria || '').toLowerCase().includes(busqueda)
        );
    }

    return resultado;
}

function _actualizarResumen() {
    const resumen   = document.getElementById('notifResumen');
    const total     = _todasLasNotifs.length;
    const noLeid    = _noLeidas.size;

    if (!resumen) return;
    if (total === 0) {
        resumen.innerHTML = 'Sin alertas activas. ¡Todo bajo control! 🐾';
    } else {
        resumen.innerHTML = `Tienes <strong>${noLeid}</strong> alerta${noLeid !== 1 ? 's' : ''} sin leer de ${total} en total.`;
    }
}

// ── ABRIR / CERRAR ───────────────────────────────────────────────────────────
function _abrirPanel() {
    const panel   = document.getElementById('panelNotificaciones');
    const overlay = document.getElementById('notifOverlay');
    panel?.classList.add('abierto');
    overlay?.classList.add('abierto');
    document.body.style.overflow = 'hidden';
    _cargarNotificaciones();
}

function _cerrarPanel() {
    const panel   = document.getElementById('panelNotificaciones');
    const overlay = document.getElementById('notifOverlay');
    panel?.classList.remove('abierto');
    overlay?.classList.remove('abierto');
    document.body.style.overflow = '';
}

// ── REALTIME (WebSocket Supabase) ─────────────────────────────────────────────
function _suscribirRealtime() {
    if (_canalRealtime) return; // ya suscrito
    _canalRealtime = conexionSupabase
        .channel('notif-panel-inventario')
        .on('postgres_changes', {
            event:  'UPDATE',
            schema: 'public',
            table:  'inventario_productos',
            filter: `organizacion_id=eq.${_orgId}`,
        }, () => {
            // Recarga silenciosa al detectar cambio de stock
            _cargarNotificaciones();
        })
        .subscribe();
}

// ── INYECTAR PANEL EN EL DOM ──────────────────────────────────────────────────
async function _inyectarPanel() {
    if (document.getElementById('panelNotificaciones')) return; // ya existe

    const resp = await fetch('/PANEL_NOTIFICACIONES.html');
    const html = await resp.text();
    const contenedor = document.body;
    contenedor.insertAdjacentHTML('beforeend', html);
}

// ── INICIALIZACIÓN PÚBLICA ────────────────────────────────────────────────────
export async function inicializarPanelNotificaciones(organizacionId) {
    _orgId = organizacionId;
    _cargarNoLeidas();

    // 1. Inyectar HTML si no está en el DOM
    await _inyectarPanel();

    // 2. Conectar eventos del panel
    const btnNotif    = document.getElementById('btn-notificaciones');
    const btnCerrar   = document.getElementById('notifBtnCerrar');
    const overlay     = document.getElementById('notifOverlay');
    const btnMarcar   = document.getElementById('notifBtnMarcarTodas');
    const btnActualiz = document.getElementById('notifBtnActualizar');
    const btnVerInv   = document.getElementById('notifBtnVerInventario');
    const filtros     = document.getElementById('notifFiltros');
    const buscador    = document.getElementById('notifInputBuscar');

    btnNotif?.addEventListener('click', _abrirPanel);
    btnCerrar?.addEventListener('click', _cerrarPanel);
    overlay?.addEventListener('click', _cerrarPanel);
    btnMarcar?.addEventListener('click', _marcarTodasLeidas);
    btnActualiz?.addEventListener('click', _cargarNotificaciones);

    // Navegar a Inventario al hacer clic en "Ver Inventario"
    btnVerInv?.addEventListener('click', () => {
        _cerrarPanel();
        // Dispara el sistema de navegación del SPA
        document.querySelector('[data-target="VENTANA_SELECCION_CATEGORIA"]')?.click();
    });

    // Chips de filtro (sección)
    filtros?.addEventListener('click', e => {
        const chip = e.target.closest('.notif-chip');
        if (!chip) return;
        filtros.querySelectorAll('.notif-chip').forEach(c => c.classList.remove('activo'));
        chip.classList.add('activo');
        _filtroActivo = chip.dataset.filtro;
        _renderNotifs(_filtroActual());
    });

    // Búsqueda en tiempo real
    buscador?.addEventListener('input', () => {
        _renderNotifs(_filtroActual());
    });

    // Cerrar con ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') _cerrarPanel();
    });

    // 3. Suscribir a cambios en tiempo real
    _suscribirRealtime();

    // 4. Carga inicial del badge (sin abrir el panel)
    await _cargarNotificaciones();
}
