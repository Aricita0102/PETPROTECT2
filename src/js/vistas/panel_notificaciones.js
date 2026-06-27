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
let _noLeidas = new Set();         // IDs de alertas no leídas (localStorage)
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
    };
    return mapa[tipo] || mapa.sistema;
}

// ── PERSISTENCIA DE LEÍDAS ───────────────────────────────────────────────────
function _cargarNoLeidas() {
    try {
        const raw = localStorage.getItem('pp_notif_noleidas');
        _noLeidas = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { _noLeidas = new Set(); }
}

function _guardarNoLeidas() {
    localStorage.setItem('pp_notif_noleidas', JSON.stringify([..._noLeidas]));
}

function _marcarLeida(id) {
    _noLeidas.delete(id);
    _guardarNoLeidas();
    _actualizarContadorBadge();
}

function _marcarTodasLeidas() {
    _noLeidas.clear();
    _guardarNoLeidas();
    _actualizarContadorBadge();
    _renderNotifs(_filtroActual());
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

    const { data: productos, error } = await conexionSupabase
        .from('inventario_productos')
        .select('id, nombre_comercial, stock_total, stock_minimo, categoria, updated_at')
        .eq('organizacion_id', _orgId)
        .in('categoria', ['tienda', 'dietas', 'farmacia', 'insumos'])
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[NOTIF] Error al leer inventario:', error);
        return;
    }

    // Convertir productos en alertas
    _todasLasNotifs = [];

    productos.forEach(p => {
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
                mensaje:    `"${p.nombre_comercial}" llegó a stock mínimo (${stockActual} ${p.unidad_medida || 'unidades'} restantes).`,
                categoria:  p.categoria,
                created_at: p.updated_at || new Date().toISOString(),
                severo:     false,
            });
            _noLeidas.add(`bajo-${p.id}`);
        }
    });

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
                </div>
            </article>`;
        });

        html += `</div>`;
    }

    cuerpo.innerHTML = html;

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
    const contenedor = document.getElementById('contenedor-modal-dinamico') ||
                       document.body;
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
