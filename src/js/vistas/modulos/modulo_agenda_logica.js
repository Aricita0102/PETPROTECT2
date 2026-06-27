/**
 * MÓDULO: Agenda Clínica (PET PROTECT)
 * DESCRIPCIÓN: Conecta el maquetado estático de la Agenda a Supabase.
 *   - Calendario semanal con citas reales por día
 *   - Sala de espera en tiempo real (en_espera / en_consulta)
 *   - Métricas: citas semanales, pacientes atendidos hoy, cirugías programadas
 * ARQUITECTURA: Vite / Supabase / ES Modules
 */

import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { alertaCustom, confirmacionCustom } from '../../utilidades/ui_alertas.js';
import { iniciarTourAgenda, iniciarTourAgendaSiEsPrimeraVez } from '../../tour/modulo_agenda_tour.js';

// Alias de compatibilidad con el router SPA (principal_v2.js)
export { inicializarAgenda as inicializarModuloAgenda };

// ─── Estado del módulo ─────────────────────────────────────────────────────────
let sucursalId = null;
let organizacionId = null;

// ─── Punto de entrada exportado (llamado por el router SPA) ───────────────────
export async function inicializarAgenda() {
    console.log('[AGENDA] Inicializando módulo...');

    try {
        const sesion = await obtenerSesionActiva();
        if (!sesion?.perfil?.sucursal_id) throw new Error('Sin sucursal en sesión');
        sucursalId = sesion.perfil.sucursal_id;
        organizacionId = sesion.perfil.organizacion_id;

        // 🚀 Inyectar datos del doctor en tiempo real (Latencia Cero)
        if (sesion.perfil) {
            const elNombre = document.getElementById('agenda-nombre-dr');
            const elAvatar = document.getElementById('agenda-avatar-dr');

            if (elNombre) elNombre.textContent = sesion.perfil.nombre_completo || 'Doctor(a)';
            if (elAvatar && sesion.perfil.avatar_url) {
                elAvatar.src = sesion.perfil.avatar_url;
                elAvatar.style.display = 'block';
            } else if (elAvatar) {
                // Fallback si no hay foto
                elAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sesion.perfil.nombre_completo || 'DR') + '&background=032F40&color=fff';
            }
        }
    } catch (err) {
        console.error('[AGENDA] Error de sesión:', err.message);
        // Continúa en modo degradado sin bloquear la UI
    }

    configurarFechaCabecera();
    configurarControlesVista();
    configurarListenersBotones();
    configurarBuscadorPacientes();

    // Carga en paralelo para máxima velocidad
    await Promise.all([
        cargarCitasSemana(),
        cargarSalaEspera(),
        actualizarMetricas(),
        cargarCitasPorConfirmar()
    ]);

    // Inicializar navegación de fecha (mini-calendario, vista día, contadores)
    _inicializarNavegacion();

    // Lanzar tour si es la primera vez que el usuario abre la Agenda
    iniciarTourAgendaSiEsPrimeraVez();
}

// ─── Fallback: si el router llama al DOMContentLoaded antiguo ────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Solo activa si el módulo se carga de forma standalone (sin SPA router)
    if (document.getElementById('metrica-atendidos')) {
        inicializarAgenda();
    }
});

// ─── 1. CABECERA DE FECHA ─────────────────────────────────────────────────────
function configurarFechaCabecera() {
    const txtFechaActual = document.getElementById('txtFechaActual');
    const txtFechaLargaSeleccionada = document.getElementById('txtFechaLargaSeleccionada');

    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaHoy = new Date().toLocaleDateString('es-MX', opciones);
    const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

    if (txtFechaActual) txtFechaActual.textContent = fechaFormateada;
    if (txtFechaLargaSeleccionada) txtFechaLargaSeleccionada.textContent = 'Hoy, ' + new Date().getDate();
}

// ─── 2. CONTROLES DE VISTA (Día / Semana / Mes) ───────────────────────────────
function configurarControlesVista() {
    const botones = document.querySelectorAll('.btn-vista');
    const vistas  = { dia: 'vista-dia', semana: 'vista-semana', mes: 'vista-mes' };

    botones.forEach(btn => {
        btn.addEventListener('click', () => {
            botones.forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');

            Object.values(vistas).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            const vistaActiva = vistas[btn.dataset.vista];
            const elActivo = document.getElementById(vistaActiva);
            if (elActivo) elActivo.style.display = '';
        });
    });
}

// ─── 3. CALENDARIO SEMANAL DESDE SUPABASE ─────────────────────────────────────
async function cargarCitasSemana() {
    // Calcular lunes y domingo de la semana actual
    const hoy    = new Date();
    const diaSem = hoy.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
    const diffLunes = (diaSem === 0 ? -6 : 1 - diaSem);
    const lunes  = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes);
    lunes.setHours(0, 0, 0, 0);

    const viernes = new Date(lunes);
    viernes.setDate(lunes.getDate() + 4);
    viernes.setHours(23, 59, 59, 999);

    // Actualizar números de día en la cabecera de cada columna
    for (let i = 0; i < 5; i++) {
        const fecha = new Date(lunes);
        fecha.setDate(lunes.getDate() + i);
        const numEl = document.getElementById(`num-dia-${i + 1}`);
        if (numEl) numEl.textContent = fecha.getDate();
    }

    // Marcar la columna del día actual con la clase dia-hoy
    document.querySelectorAll('.columna-dia').forEach(col => col.classList.remove('dia-hoy'));
    const diaCols = [1, 2, 3, 4, 5]; // Lun=1, Mar=2, Mié=3, Jue=4, Vie=5
    const diaHoyISO = (diaSem >= 1 && diaSem <= 5) ? diaSem : null;
    if (diaHoyISO) {
        const colHoy = document.querySelector(`.columna-dia[data-dia="${diaHoyISO}"]`);
        if (colHoy) colHoy.classList.add('dia-hoy');
    }

    // Limpiar columnas antes de inyectar
    diaCols.forEach(d => {
        const lista = document.getElementById(`citas-dia-${d}`);
        if (lista) lista.innerHTML = '';
    });

    if (!sucursalId) {
        // Sin sesión: mostrar placeholder en todas las columnas
        diaCols.forEach(d => {
            const lista = document.getElementById(`citas-dia-${d}`);
            if (lista) lista.innerHTML = '<p style="font-size:11px;color:#94a3b8;text-align:center;padding:8px;">Sin datos</p>';
        });
        return;
    }

    try {
        // Usa solo join de 1 nivel (pacientes desde paciente_id) — sin join profundo
        const { data: citas, error } = await conexionSupabase
            .from('citas')
            .select('id, fecha_hora, motivo_breve, estado, tipo_cita, paciente_id, pacientes(nombre)')
            .eq('sucursal_id', sucursalId)
            .gte('fecha_hora', lunes.toISOString())
            .lte('fecha_hora', viernes.toISOString())
            .order('fecha_hora', { ascending: true });

        if (error) throw error;

        if (!citas || citas.length === 0) {
            diaCols.forEach(d => {
                const lista = document.getElementById(`citas-dia-${d}`);
                if (lista) lista.innerHTML = '<p style="font-size:11px;color:#94a3b8;text-align:center;padding:8px;">Sin citas</p>';
            });
            return;
        }

        // Distribuir citas en su columna correspondiente
        citas.forEach(cita => {
            const fechaCita = new Date(cita.fecha_hora);
            const diaSemCita = fechaCita.getDay(); // 0=Dom, 1=Lun ... 6=Sab
            // Solo Lun-Vie (1-5)
            if (diaSemCita < 1 || diaSemCita > 5) return;

            const lista = document.getElementById(`citas-dia-${diaSemCita}`);
            if (!lista) return;

            const hora = fechaCita.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            const pacienteRaw = cita.pacientes;
            const nombrePaciente = Array.isArray(pacienteRaw) ? (pacienteRaw[0]?.nombre || 'Paciente') : (pacienteRaw?.nombre || 'Paciente');
            const motivo = cita.motivo_breve || '';

            // Clase CSS según estado
            const clasesEstado = {
                'completada':   'cita-completada',
                'finalizada':   'cita-completada',
                'en_consulta':  'estado-en-progreso',
                'urgencia':     'estado-urgencia',
                'programada':   '',
                'confirmada':   '',
                'en_espera':    '',
            };
            const claseExtra = clasesEstado[cita.estado] ?? '';

            lista.innerHTML += `
                <div class="cita-minimalista ${claseExtra}" data-id="${cita.id}" title="${motivo}">
                    <div class="cita-titulo">
                        <i class="ph ph-paw-print"></i> ${nombrePaciente}
                    </div>
                    <div class="cita-hora">${hora}${motivo ? ' – ' + motivo : ''}</div>
                </div>`;
        });

    } catch (err) {
        console.error('[AGENDA] Error exacto Supabase (cargarCitasSemana):', JSON.stringify(err, null, 2));
    }
}

// ─── 4. SALA DE ESPERA DESDE SUPABASE ─────────────────────────────────────────
async function cargarSalaEspera() {
    const contenedor = document.getElementById('sala-espera-lista');
    if (!contenedor) return;

    if (!sucursalId) {
        contenedor.innerHTML = '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:16px;">Inicia sesión para ver la sala de espera.</p>';
        return;
    }

    const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin    = new Date(); hoyFin.setHours(23, 59, 59, 999);

    try {
        // ✅ Sin filtro de estado en la query — evita el error 400 por mismatch de ENUM.
        // Supabase filtra solo por sucursal y fecha; el filtrado de sala de espera
        // se hace localmente en JS.
        const { data: todasCitasHoy, error } = await conexionSupabase
            .from('citas')
            .select('id, fecha_hora, motivo_breve, estado, tipo_cita, pacientes(nombre)')
            .eq('sucursal_id', sucursalId)
            .gte('fecha_hora', hoyInicio.toISOString())
            .lte('fecha_hora', hoyFin.toISOString())
            .order('fecha_hora', { ascending: true });

        if (error) throw error;

        // 🔍 AUDITORÍA: Inspeccionamos los valores reales del ENUM desde la BD
        console.log('[AGENDA] Citas de HOY recuperadas:', todasCitasHoy);

        // Estatus que indican cita INACTIVA (no aparece en sala de espera)
        const ESTADO_INACTIVOS = new Set([
            'cancelada', 'cancelado',
            'finalizada', 'finalizado',
            'completada', 'completado',
            'no_asistio', 'no_presentado',
            'programada',   // cita futura aún no activa
        ]);

        // Filtrado local: solo citas que NO son inactivas
        const citasEspera = (todasCitasHoy || []).filter(
            c => !ESTADO_INACTIVOS.has(c.estado?.toLowerCase?.() ?? '')
        );

        if (citasEspera.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align:center;color:#94a3b8;font-size:13px;padding:32px 0;">
                    <span class="material-symbols-rounded" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.5;">event_seat</span>
                    La sala de espera está vacía.
                </div>`;
            return;
        }

        contenedor.innerHTML = citasEspera.map(cita => {
            // ✅ Join seguro: Supabase puede devolver objeto o array según la FK
            const pacienteRaw = cita.pacientes;
            const nombre = Array.isArray(pacienteRaw)
                ? (pacienteRaw[0]?.nombre || 'Paciente Desconocido')
                : (pacienteRaw?.nombre   || 'Paciente Desconocido');

            // Clasificación visual basada en el estado real de la BD
            const estatusLower = cita.estado?.toLowerCase?.() ?? '';
            const enConsulta = estatusLower.includes('consul');
            const claseItem  = enConsulta ? 'consulta' : 'llegada';
            const textoDesc  = enConsulta
                ? 'Pasó al <strong>Consultorio</strong>.'
                : 'El tutor ha registrado la <strong>llegada</strong>.';
            const badgeTexto = enConsulta ? 'EN CONSULTA' : 'EN SALA DE ESPERA';
            const badgeClase = enConsulta ? 'badge-estado azul' : 'badge-estado';

            // Tiempo relativo desde la hora de la cita
            const minutos = Math.round((Date.now() - new Date(cita.fecha_hora).getTime()) / 60000);
            const tiempoTexto = minutos <= 0 ? 'Ahora'
                : minutos < 60 ? `Hace ${minutos} min`
                : `Hace ${Math.round(minutos / 60)}h`;

            return `
                <div class="item-consulta ${claseItem}">
                    <div class="feed-header-info">
                        <span class="feed-nombre"><i class="ph ph-paw-print"></i> ${nombre}</span>
                        <span class="feed-tiempo">${tiempoTexto}</span>
                    </div>
                    <p class="feed-texto">${textoDesc}</p>
                    <span class="${badgeClase}">${badgeTexto}</span>
                </div>`;
        }).join('');

    } catch (err) {
        console.error('[AGENDA] Error exacto Supabase (cargarSalaEspera):', JSON.stringify(err, null, 2));
        contenedor.innerHTML = `
            <div style="padding:16px;">
                <p style="font-size:12px;color:#ef4444;font-weight:600;">Error al cargar sala de espera.</p>
                <p style="font-size:11px;color:#94a3b8;margin-top:4px;">${err?.message ?? 'Revisa la consola (F12) para detalles.'}</p>
            </div>`;
    }
}

// ─── 5. MÉTRICAS RÁPIDAS ──────────────────────────────────────────────────────
async function actualizarMetricas() {
    if (!sucursalId) return;

    const hoy       = new Date();
    const hoyInicio = new Date(hoy); hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin    = new Date(hoy); hoyFin.setHours(23, 59, 59, 999);

    // Semana actual
    const diaSem    = hoy.getDay();
    const diffLunes = (diaSem === 0 ? -6 : 1 - diaSem);
    const lunes     = new Date(hoy); lunes.setDate(hoy.getDate() + diffLunes); lunes.setHours(0, 0, 0, 0);
    const viernes   = new Date(lunes); viernes.setDate(lunes.getDate() + 4); viernes.setHours(23, 59, 59, 999);

    try {
        const [resSemana, resToday, resCirugias] = await Promise.all([
            // Citas de la semana
            conexionSupabase
                .from('citas')
                .select('id', { count: 'exact', head: true })
                .eq('sucursal_id', sucursalId)
                .gte('fecha_hora', lunes.toISOString())
                .lte('fecha_hora', viernes.toISOString()),

            // Pacientes atendidos hoy (estado finalizada/completada)
            conexionSupabase
                .from('citas')
                .select('id', { count: 'exact', head: true })
                .eq('sucursal_id', sucursalId)
                .in('estado', ['finalizada', 'completada'])
                .gte('fecha_hora', hoyInicio.toISOString())
                .lte('fecha_hora', hoyFin.toISOString()),

            // Cirugías programadas esta semana
            conexionSupabase
                .from('citas')
                .select('id', { count: 'exact', head: true })
                .eq('sucursal_id', sucursalId)
                .ilike('motivo_breve', '%cirug%')
                .gte('fecha_hora', lunes.toISOString())
                .lte('fecha_hora', viernes.toISOString()),
        ]);

        const elAtendidos = document.getElementById('metrica-atendidos');
        const elSemana    = document.getElementById('metrica-citas-semana');
        const elCirugias  = document.getElementById('metrica-cirugias');

        if (elAtendidos) elAtendidos.textContent = resToday.count ?? 0;
        if (elSemana)    elSemana.textContent    = resSemana.count ?? 0;
        if (elCirugias)  elCirugias.textContent  = resCirugias.count ?? 0;

    } catch (err) {
        console.warn('[AGENDA] Error al actualizar métricas:', err.message);
    }
}

// ─── 6. LISTENERS DE BOTONES ─────────────────────────────────────────────────
function configurarListenersBotones() {
    // Botón Guía de uso → lanza el tour guiado
    const btnGuia = document.getElementById('btn-guia-agenda');
    if (btnGuia) {
        btnGuia.addEventListener('click', () => iniciarTourAgenda());
    }

    // Filtros de tipo de cita (UI reactiva sin red)
    const botonesFiltro = document.querySelectorAll('.btnFiltro');
    botonesFiltro.forEach(btn => {
        btn.addEventListener('click', () => {
            botonesFiltro.forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
        });
    });
}

// ─── 8. BUSCADOR AUTOCOMPLETADO (DEBOUNCE) ────────────────────────────────────
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function configurarBuscadorPacientes() {
    const inputBuscador = document.getElementById('agenda-buscador-pacientes');
    const contenedorResultados = document.getElementById('agenda-resultados-busqueda');

    if (!inputBuscador || !contenedorResultados) return;

    // ESTRATEGIA DE PORTAL: Mover el contenedor al body para escapar de context stacking / overflow hidden
    if (contenedorResultados.parentNode !== document.body) {
        document.body.appendChild(contenedorResultados);
    }

    const posicionarContenedor = () => {
        const rect = inputBuscador.getBoundingClientRect();
        contenedorResultados.style.position = 'fixed';
        contenedorResultados.style.top = `${rect.bottom + 5}px`;
        contenedorResultados.style.left = `${rect.left}px`;
        contenedorResultados.style.width = `${rect.width}px`;
        contenedorResultados.style.zIndex = '999999';
        contenedorResultados.style.backgroundColor = 'white';
        contenedorResultados.style.borderRadius = '8px';
        contenedorResultados.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
        contenedorResultados.style.maxHeight = '400px';
        contenedorResultados.style.overflowY = 'auto';
        contenedorResultados.style.border = '1px solid rgba(0,0,0,0.05)';
        contenedorResultados.style.display = 'block';
    };

    // Actualizar posición en scroll/resize para mantenerlo anclado visualmente al input
    window.addEventListener('scroll', () => {
        if (contenedorResultados.style.display === 'block') posicionarContenedor();
    }, true);
    window.addEventListener('resize', () => {
        if (contenedorResultados.style.display === 'block') posicionarContenedor();
    });

    // Cierra el contenedor si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!inputBuscador.contains(e.target) && !contenedorResultados.contains(e.target)) {
            contenedorResultados.style.display = 'none';
        }
    });

    const realizarBusqueda = async (e) => {
        const termino = e.target.value.trim();

        if (termino.length < 2) {
            contenedorResultados.style.display = 'none';
            return;
        }

        try {
            const { data, error } = await conexionSupabase
                .from('pacientes')
                .select('id, nombre, especie, raza, foto_url, clientes(nombre_completo)')
                .ilike('nombre', `%${termino}%`)
                .eq('organizacion_id', organizacionId)
                .limit(6);

            if (error) throw error;

            contenedorResultados.innerHTML = '';
            posicionarContenedor(); // Llama la función en vez de style.display = 'block'

            if (!data || data.length === 0) {
                contenedorResultados.innerHTML = `<div class="resultado-pred-empty">No se encontraron pacientes.</div>`;
                return;
            }

            data.forEach(paciente => {
                const fotoUrl = paciente.foto_url || 'https://cdn-icons-png.flaticon.com/512/2809/2809865.png';
                const nombreMascota = paciente.nombre || 'Desconocido';
                const especieRaza = `${paciente.especie || 'Mascota'} ${paciente.raza ? '· ' + paciente.raza : ''}`;
                const tutorNombre = paciente.clientes?.nombre_completo || 'Sin tutor registrado';

                const item = document.createElement('div');
                item.className = 'resultado-pred-item';
                
                item.innerHTML = `
                    <img src="${fotoUrl}" alt="Foto" class="resultado-pred-foto">
                    <div class="resultado-pred-info">
                        <p class="resultado-pred-nombre">${nombreMascota}</p>
                        <p class="resultado-pred-detalles">${especieRaza}</p>
                        <p class="resultado-pred-tutor"><span class="material-symbols-rounded" style="font-size:12px; vertical-align:middle;">person</span> ${tutorNombre}</p>
                    </div>
                `;

                // Al hacer clic, se llena el input
                item.addEventListener('click', () => {
                    inputBuscador.value = paciente.nombre;
                    contenedorResultados.style.display = 'none';
                    console.log('Paciente seleccionado:', paciente);
                });

                contenedorResultados.appendChild(item);
            });

        } catch (err) {
            console.error('[AGENDA] Error en autocompletado:', err);
        }
    };

    inputBuscador.addEventListener('input', debounce(realizarBusqueda, 300));
}


// ─── CARGAR CITAS POR CONFIRMAR (Panel lateral) ─────────────────────────────
async function cargarCitasPorConfirmar() {
    const contenedor = document.getElementById('lista-por-confirmar');
    if (!contenedor || !sucursalId) return;

    contenedor.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;">Cargando...</div>';

    try {
        const ahora = new Date().toISOString();

        const { data: citas, error } = await conexionSupabase
            .from('citas')
            .select('id, fecha_hora, tipo_cita, estado, paciente_id, pacientes(nombre, cliente_id)')
            .eq('sucursal_id', sucursalId)
            .in('estado', ['agendada', 'programada'])
            .gte('fecha_hora', ahora)
            .order('fecha_hora', { ascending: true })
            .limit(10);

        if (error) throw error;

        if (!citas || citas.length === 0) {
            contenedor.innerHTML = '<div style="font-size:12px; color:var(--texto-sec); text-align:center; padding:12px;">Sin citas pendientes de confirmar.</div>';
            return;
        }

        // Obtener los clientes de las citas en un segundo paso
        const clienteIds = [...new Set(citas.map(c => {
            const p = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes;
            return p?.cliente_id;
        }).filter(Boolean))];

        let clientesMap = {};
        if (clienteIds.length > 0) {
            const { data: clientes } = await conexionSupabase
                .from('clientes')
                .select('id, nombre_completo, telefono')
                .in('id', clienteIds);
            if (clientes) clientes.forEach(cl => clientesMap[cl.id] = cl);
        }

        contenedor.innerHTML = '';

        citas.forEach(cita => {
            const fechaObj = new Date(cita.fecha_hora);
            const fechaStr = fechaObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
            const horaStr  = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

            const pacienteRaw = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes;
            const clienteId   = pacienteRaw?.cliente_id;
            const cliente     = clientesMap[clienteId] || {};

            const pacienteNombre = pacienteRaw?.nombre || 'Paciente';
            const clienteNombre  = cliente?.nombre_completo || 'Tutor';
            let telefono = (cliente?.telefono || '').replace(/\D/g, '');
            if (telefono && !telefono.startsWith('52')) telefono = '52' + telefono;

            const tipoText = (cita.tipo_cita || 'consulta').charAt(0).toUpperCase() + (cita.tipo_cita || 'consulta').slice(1);
            const msgTexto = `Hola ${clienteNombre}, te escribimos de PET PROTECT. Te recordamos la cita para ${pacienteNombre} el ${fechaStr} a las ${horaStr}. ¿Nos confirmas tu asistencia?`;
            const waLink   = telefono ? `https://wa.me/${telefono}?text=${encodeURIComponent(msgTexto)}` : null;

            const card = document.createElement('div');
            card.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; font-size:13px; color:#032F40; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pacienteNombre}</div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${tipoText} · ${fechaStr} a las ${horaStr}</div>
                    </div>
                </div>
                ${waLink ? 
                `<a href="${waLink}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#25D366; color:white; text-decoration:none; padding:8px; border-radius:6px; font-size:12px; font-weight:700; transition:background 0.2s;" onmouseover="this.style.background='#1da851'" onmouseout="this.style.background='#25D366'">
                    <i class="ph ph-whatsapp-logo" style="font-size:16px;"></i> Enviar WhatsApp
                </a>` 
                : `<div style="font-size:11px; color:#ef4444; background:#fef2f2; padding:6px; border-radius:6px; text-align:center; font-weight:600;">Sin teléfono registrado</div>`}
            `;
            
            contenedor.appendChild(card);
        });

    } catch(e) {
        console.error('[AGENDA] Error al cargar citas por confirmar:', e);
        contenedor.innerHTML = '<div style="font-size:12px; color:#ef4444; text-align:center;">Error al cargar.</div>';
    }
}

// ─── Vista Día (Timeline Absoluto) ─────────────────────────────────────────────
function _renderizarVistaDiaAbsoluto(citas, inicioDia, horariosClinica) {
    const cont = document.getElementById('lista-citas-dia');
    if (!cont) return;

    // Calcular día de la semana para los horarios
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaClave = diasSemana[inicioDia.getDay()];
    
    let HORA_INICIO = 8;
    let HORA_FIN = 20;
    let estaCerrado = false;

    const norm = (s) => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (Array.isArray(horariosClinica)) {
        const diaConfig = horariosClinica.find(d => norm(d.dia) === norm(diaClave));
        if (diaConfig) {
            if (!diaConfig.abierto) {
                estaCerrado = true;
            } else if (diaConfig.apertura && diaConfig.cierre) {
                HORA_INICIO = parseInt(diaConfig.apertura.split(':')[0], 10);
                HORA_FIN = parseInt(diaConfig.cierre.split(':')[0], 10);
                if (HORA_FIN < HORA_INICIO) HORA_FIN = HORA_INICIO + 1;
            }
        }
    } else if (horariosClinica && horariosClinica[diaClave]) {
        const hData = horariosClinica[diaClave];
        if (!hData.abierto) {
            estaCerrado = true;
        } else if (hData.inicio && hData.fin) {
            HORA_INICIO = parseInt(hData.inicio.split(':')[0], 10);
            HORA_FIN = parseInt(hData.fin.split(':')[0], 10);
            if (HORA_FIN < HORA_INICIO) HORA_FIN = HORA_INICIO + 1;
        }
    }

    // Expandir cuadrícula dinámicamente si hay citas fuera del horario (ej. casos especiales)
    citas.forEach(cita => {
        const h = new Date(cita.fecha_hora).getHours();
        if (h < HORA_INICIO) HORA_INICIO = h;
        if (h > HORA_FIN) HORA_FIN = h;
    });

    const TOTAL_HORAS = HORA_FIN - HORA_INICIO + 1;
    const PIXELS_POR_HORA = 90; // Suficiente espacio para las tarjetas
    const ALTURA_TOTAL = TOTAL_HORAS * PIXELS_POR_HORA;

    // Contenedor principal sin overflow lateral
    cont.style.position = 'relative';
    cont.style.overflowX = 'hidden';
    
    let html = `<div id="timeline-absoluta" style="position: relative; height: ${ALTURA_TOTAL}px; margin-left: 10px; margin-right: 10px; margin-top: 10px;">`;
    
    // Eje vertical principal (timeline line)
    html += `<div style="position: absolute; left: 60px; top: 0; bottom: 0; width: 2px; background: #e2e8f0; z-index: 1;"></div>`;

    if (estaCerrado) {
        html += `<div style="position: absolute; left: 60px; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 0; pointer-events: none; overflow: hidden;">
            <div style="transform: rotate(-30deg); font-size: 64px; font-weight: 900; color: rgba(242, 116, 5, 0.08); text-transform: uppercase; letter-spacing: 4px; user-select: none;">Día Cerrado</div>
        </div>`;
    }

    // Renderizar Cuadrícula Horaria
    for (let h = HORA_INICIO; h <= HORA_FIN; h++) {
        const topPx = (h - HORA_INICIO) * PIXELS_POR_HORA;
        const horaStr = String(h).padStart(2, '0') + ':00';
        
        // Etiqueta de la hora
        html += `<div style="position: absolute; left: 0; top: ${topPx - 8}px; width: 45px; text-align: right; font-size: 12px; font-weight: 700; color: #94a3b8; font-family: 'Inter', sans-serif;">${horaStr}</div>`;
        // Línea divisoria horizontal tenue
        html += `<div style="position: absolute; left: 60px; right: 0; top: ${topPx}px; height: 1px; background: #f1f5f9; z-index: 0;"></div>`;
    }

    // Renderizar Tarjetas de Citas
    citas.forEach(cita => {
        const hCita = new Date(cita.fecha_hora);
        const hour = hCita.getHours();
        const min = hCita.getMinutes();

        const duracionMin = cita.duracion_minutos || 30;
        
        // Calcular top y height
        const topPx = (hour - HORA_INICIO) * PIXELS_POR_HORA + (min / 60) * PIXELS_POR_HORA;
        const heightPx = (duracionMin / 60) * PIXELS_POR_HORA;
        
        const paciente = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes;
        const nombre = paciente?.nombre || 'Paciente';
        const motivo = cita.motivo_breve || 'Consulta General';
        
        const COLORES = { agendada:'#3b82f6', confirmada:'#10b981', cancelada:'#ef4444', no_asistio:'#f59e0b', en_espera:'#8b5cf6', en_consulta:'#0ea5e9', finalizada:'#64748b', completada:'#64748b' };
        const colorEstado = COLORES[cita.estado] || '#94a3b8';

        // Nodo circular sobre la línea
        html += `<div style="position: absolute; left: 56px; top: ${topPx + 6}px; width: 10px; height: 10px; border-radius: 50%; background: #fff; border: 2px solid ${colorEstado}; z-index: 3;"></div>`;

        // Tarjeta
        html += `
        <div class="cita-timeline-card" onclick="window.abrirDetalleCita('${cita.id}',event)"
             style="position: absolute; left: 80px; right: 0; top: ${topPx}px; height: ${Math.max(40, heightPx - 4)}px; 
                    background: #fff; border-radius: 8px; border-left: 4px solid ${colorEstado}; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.04); padding: 8px 12px; cursor: pointer; z-index: 2; overflow: hidden;
                    display: flex; flex-direction: column; justify-content: center; transition: all 0.2s; font-family: 'Inter', sans-serif;"
             onmouseenter="this.style.boxShadow='0 6px 16px rgba(0,0,0,0.08)'; this.style.transform='translateX(4px)';" 
             onmouseleave="this.style.boxShadow='0 2px 6px rgba(0,0,0,0.04)'; this.style.transform='none';">
             
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="font-weight: 700; font-size: 13px; color: #032F40; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">
                    ${nombre}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: ${colorEstado}; background: ${colorEstado}15; padding: 2px 6px; border-radius: 12px; text-transform: uppercase;">
                    ${cita.estado || '—'}
                </div>
            </div>
            <div style="font-size: 11.5px; color: #64748B; margin-top: 3px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${hCita.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })} · ${motivo}
            </div>
        </div>`;
    });

    // Renderizar Minutero
    const hoy = new Date();
    if (hoy.toDateString() === inicioDia.toDateString()) {
        const nH = hoy.getHours();
        const nM = hoy.getMinutes();
        if (nH >= HORA_INICIO && nH <= HORA_FIN) {
            const currentPx = (nH - HORA_INICIO) * PIXELS_POR_HORA + (nM / 60) * PIXELS_POR_HORA;
            html += `
            <div id="minutero-dia" style="position: absolute; left: 50px; right: 0; top: ${currentPx}px; height: 2px; background: #ea580c; z-index: 10; pointer-events: none; transition: top 1s linear;">
                <div style="position: absolute; left: 4px; top: -4px; width: 10px; height: 10px; border-radius: 50%; background: #ea580c; box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.2);"></div>
            </div>`;
        }
    }

    html += `</div>`;
    cont.innerHTML = html;

    // Configurar el intervalo para actualizar el minutero automáticamente
    if (window._intervaloMinutero) clearInterval(window._intervaloMinutero);
    window._intervaloMinutero = setInterval(() => {
        const minutero = document.getElementById('minutero-dia');
        if (minutero) {
            const now = new Date();
            const pxHora = PIXELS_POR_HORA;
            if (now.getHours() >= HORA_INICIO && now.getHours() <= HORA_FIN) {
                const currentTop = (now.getHours() - HORA_INICIO) * pxHora + (now.getMinutes() / 60) * pxHora;
                minutero.style.top = currentTop + 'px';
            }
        }
    }, 60000);

    // Auto-scroll al minutero
    setTimeout(() => {
        const minutero = document.getElementById('minutero-dia');
        if (minutero) {
            const scrollContainer = document.querySelector('.vista-contenido') || document.getElementById('vista-dia') || document.querySelector('.main-content-scroll') || window;
            if (scrollContainer && scrollContainer.scrollTo) {
                scrollContainer.scrollTo({ top: Math.max(0, minutero.offsetTop - 100), behavior: 'smooth' });
            }
        }
    }, 300);
}

// ─── Vista Semana ─────────────────────────────────────────────────────────────
function _renderizarVistaSemana(citas, inicioSemana) {
    const cont = document.getElementById('contenedor-semana');
    if (!cont) return;

    const diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const hoyStr     = new Date().toDateString();

    let html = '<div class="week-grid"><div class="corner"></div>';
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana); d.setDate(d.getDate() + i);
        const isActive = d.toDateString() === hoyStr ? 'active' : '';
        html += `<div class="day-head ${isActive}"><div class="dow">${diasSemana[i]}</div><div class="num">${d.getDate()}</div></div>`;
    }
    html += '</div><div class="grid-body"><div class="time-col">';
    for (let h = 8; h <= 20; h++) html += `<div class="time-slot">${String(h).padStart(2,'0')}:00</div>`;
    html += '</div>';

    for (let i = 0; i < 7; i++) {
        const d    = new Date(inicioSemana); d.setDate(d.getDate() + i);
        const dStr = d.toDateString();
        const citasDia = citas.filter(c => new Date(c.fecha_hora).toDateString() === dStr);

        html += '<div class="day-col">';
        for (let h = 8; h <= 20; h++) html += '<div class="hour-line"></div>';

        citasDia.forEach(cita => {
            const hCita  = new Date(cita.fecha_hora);
            const hour   = hCita.getHours(), min = hCita.getMinutes();
            if (hour < 8 || hour > 20) return;
            const top    = ((hour - 8) * 64) + ((min / 60) * 64);
            const height = ((cita.duracion_minutos || 30) / 60) * 64;
            
            const paciente = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes;
            const nombre = paciente?.nombre || 'Paciente';
            
            const cl = cita.tipo_cita === 'urgencia' ? 'rojo' : (cita.tipo_cita === 'cirugia' ? 'naranja' : 'cobalto');
            html += `
            <div class="event ${cl}" style="top:${top}px;height:${Math.max(28, height - 2)}px;" data-id="${cita.id}">
                <div class="ev-title">${nombre} · ${cita.tipo_cita || 'Consulta'}</div>
                <div class="ev-time">${hCita.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}</div>
            </div>`;
        });

        if (dStr === hoyStr) {
            const now = new Date(), nH = now.getHours();
            if (nH >= 8 && nH <= 20) {
                const nowTop = ((nH - 8) * 64) + ((now.getMinutes() / 60) * 64);
                html += `<div class="now-line" style="top:${nowTop}px;"></div>`;
            }
        }
        html += '</div>';
    }
    html += '</div>';
    cont.innerHTML = html;

    cont.querySelectorAll('.event').forEach(el => {
        el.addEventListener('click', () => {
            window.abrirDetalleCita(el.getAttribute('data-id'));
        });
    });
}

// ─── Vista Mes ───────────────────────────────────────────────────────────────
function _renderizarVistaMes(citas, inicioMes) {
    const cont = document.getElementById('contenedor-mes');
    if (!cont) return;

    const year = inicioMes.getFullYear(), month = inicioMes.getMonth();
    const primerDia        = new Date(year, month, 1).getDay();
    const diasMes          = new Date(year, month + 1, 0).getDate();
    const diasMesAnterior  = new Date(year, month, 0).getDate();
    const hoyStr           = new Date().toDateString();

    let html = '<div class="month-grid">';
    ['D','L','M','M','J','V','S'].forEach(d => html += `<div class="month-dow">${d}</div>`);

    for (let i = primerDia - 1; i >= 0; i--)
        html += `<div class="month-cell"><div class="month-num muted">${diasMesAnterior - i}</div></div>`;

    for (let i = 1; i <= diasMes; i++) {
        const d     = new Date(year, month, i);
        const isHoy = d.toDateString() === hoyStr;
        const numStyle = isHoy ? ' style="background:var(--cobalto);color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;"' : '';
        const citasDia = citas.filter(c => new Date(c.fecha_hora).toDateString() === d.toDateString());

        html += `<div class="month-cell"><div class="month-num"><span${numStyle}>${i}</span></div>`;
        citasDia.slice(0, 3).forEach(cita => {
            const paciente = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes;
            const nombre = paciente?.nombre || 'Paciente';
            const cl = cita.tipo_cita === 'urgencia' ? 'rojo' : (cita.tipo_cita === 'cirugia' ? 'naranja' : 'cobalto');
            html += `<div class="month-evento ${cl}" data-id="${cita.id}">${nombre}</div>`;
        });
        if (citasDia.length > 3)
            html += `<div class="month-evento" style="background:transparent;color:var(--texto-sec);">+${citasDia.length - 3} más</div>`;
        html += '</div>';
    }

    const celdasUsadas = primerDia + diasMes;
    const resto        = celdasUsadas > 35 ? 42 - celdasUsadas : 35 - celdasUsadas;
    for (let i = 1; i <= resto; i++)
        html += `<div class="month-cell"><div class="month-num muted">${i}</div></div>`;

    html += '</div>';
    cont.innerHTML = html;

    cont.querySelectorAll('.month-evento').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (el.getAttribute('data-id')) window.abrirDetalleCita(el.getAttribute('data-id'));
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// PUENTE WINDOW → MÓDULO ES
// El módulo es de tipo "module" (scope cerrado). Para que el HTML pueda llamar
// onclick="window.moverFecha()" estas funciones deben asignarse a window.
// ══════════════════════════════════════════════════════════════════════════════

// Estado de navegación
let _fechaPivote = new Date();
let _vistaActual = 'dia';
let _filtroActual = 'todos';
let _citaSeleccionadaId = null;
let _mesActualMini = new Date();

// ─── Mini-Calendario ──────────────────────────────────────────────────────────
function _renderMiniCalendario() {
    const titulo = document.getElementById('mini-calendar-title');
    const grid   = document.getElementById('mini-calendar-grid');
    if (!titulo || !grid) return;
    const year  = _mesActualMini.getFullYear();
    const month = _mesActualMini.getMonth();
    titulo.textContent = new Date(year, month, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    const diasSemana = ['L','M','M','J','V','S','D'];
    let html = diasSemana.map(d => `<span style="font-size:10px;font-weight:700;color:#94a3b8;text-align:center;">${d}</span>`).join('');
    const primerDia = new Date(year, month, 1).getDay();
    const offset = primerDia === 0 ? 6 : primerDia - 1;
    const diasMes = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < offset; i++) html += '<span></span>';
    const hoy = new Date();
    for (let d = 1; d <= diasMes; d++) {
        const esHoy = (d === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear());
        const esSel = (d === _fechaPivote.getDate() && month === _fechaPivote.getMonth() && year === _fechaPivote.getFullYear());
        const st = esHoy ? 'background:#F27405;color:#fff;border-radius:50%;font-weight:800;'
                 : esSel ? 'background:#032F40;color:#fff;border-radius:50%;font-weight:700;' : '';
        html += `<span onclick="window.seleccionarDiaMini(${year},${month},${d})" style="text-align:center;font-size:12px;cursor:pointer;padding:3px;border-radius:50%;${st}">${d}</span>`;
    }
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    grid.style.gap = '2px';
    grid.innerHTML = html;
}

window.seleccionarDiaMini = function(year, month, day) {
    _fechaPivote = new Date(year, month, day);
    _renderMiniCalendario();
    _cargarCitasEnRango();
};

window.moverMiniCalendario = function(dir) {
    _mesActualMini = new Date(_mesActualMini.getFullYear(), _mesActualMini.getMonth() + dir, 1);
    _renderMiniCalendario();
};

// ─── Navegación de fechas ────────────────────────────────────────────────────
window.moverFecha = function(dir) {
    if (_vistaActual === 'dia') {
        _fechaPivote.setDate(_fechaPivote.getDate() + dir);
    } else if (_vistaActual === 'semana') {
        _fechaPivote.setDate(_fechaPivote.getDate() + (dir * 7));
    } else {
        _fechaPivote.setMonth(_fechaPivote.getMonth() + dir);
    }
    _actualizarTituloFecha();
    _cargarCitasEnRango();
};

function _actualizarTituloFecha() {
    const el = document.getElementById('label-rango-fechas');
    if (!el) return;
    if (_vistaActual === 'dia') {
        el.textContent = _fechaPivote.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (_vistaActual === 'semana') {
        const lunes = new Date(_fechaPivote);
        lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
        const viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4);
        el.textContent = `${lunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${viernes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
        el.textContent = _fechaPivote.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    }
}

// ─── Cambio de vista Día/Semana/Mes ──────────────────────────────────────────
window.cambiarVista = function(vista) {
    _vistaActual = vista;
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    const el = document.getElementById(`vista-${vista}`);
    if (el) el.classList.add('activa');
    const label = document.getElementById('vistaLabel');
    if (label) label.textContent = vista.charAt(0).toUpperCase() + vista.slice(1);
    _actualizarTituloFecha();
    _cargarCitasEnRango();
    const dd = document.getElementById('dropdownVistas');
    if (dd) dd.style.position = 'relative'; // Asegurar el posicionamiento
    if (dd) dd.style.display = 'none';
};

window.toggleDropdown = function() {
    const dd = document.getElementById('dropdownVistas');
    if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
};

window.cambiarFiltroEstado = function(valor) {
    _filtroActual = valor;
    _cargarCitasEnRango();
};

window.toggleFiltroCita = function(el) {
    el.classList.toggle('activo');
};

// ─── Cargador unificado ───────────────────────────────────────────────────────
async function _cargarCitasEnRango() {
    const listaDia = document.getElementById('lista-citas-dia');
    if (listaDia) listaDia.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;">Cargando citas...</div>';
    if (!sucursalId) return;

    let inicio, fin;
    const p = new Date(_fechaPivote);
    if (_vistaActual === 'dia') {
        inicio = new Date(p); inicio.setHours(0,0,0,0);
        fin    = new Date(p); fin.setHours(23,59,59,999);
    } else if (_vistaActual === 'semana') {
        const offset = p.getDay() === 0 ? -6 : 1 - p.getDay();
        inicio = new Date(p); inicio.setDate(p.getDate() + offset); inicio.setHours(0,0,0,0);
        fin    = new Date(inicio); fin.setDate(inicio.getDate() + 6); fin.setHours(23,59,59,999);
    } else {
        inicio = new Date(p.getFullYear(), p.getMonth(), 1);
        fin    = new Date(p.getFullYear(), p.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    try {
        const sesionData = await obtenerSesionActiva();
        const horariosClinica = sesionData?.perfil?.horario_atencion || null;

        // ─ PASO 1: Obtener citas sin join profundo ─────────────────────────────
        let query = conexionSupabase
            .from('citas')
            .select('id, fecha_hora, motivo_breve, duracion_minutos, estado, tipo_cita, paciente_id, pacientes(nombre, foto_url)')
            .eq('sucursal_id', sucursalId)
            .gte('fecha_hora', inicio.toISOString())
            .lte('fecha_hora', fin.toISOString())
            .order('fecha_hora', { ascending: true });

        if (_filtroActual && _filtroActual !== 'todos') query = query.eq('estado', _filtroActual);

        const { data: citas, error } = await query;
        if (error) throw error;

        _actualizarContadoresSuperior(citas || []);
        if (!listaDia) return;

        if (!citas || citas.length === 0) {
            if (_vistaActual === 'dia') {
                _renderizarVistaDiaAbsoluto([], inicio, horariosClinica);
            } else if (_vistaActual === 'semana') {
                const cS = document.getElementById('contenedor-semana');
                if (cS) cS.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><span class="material-symbols-rounded" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;">event_busy</span>No hay citas en esta semana.</div>';
            } else {
                const cM = document.getElementById('contenedor-mes');
                if (cM) cM.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><span class="material-symbols-rounded" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;">event_busy</span>No hay citas en este mes.</div>';
            }
            return;
        }

        if (_vistaActual === 'dia') {
            _renderizarVistaDiaAbsoluto(citas, inicio, horariosClinica);
        } else if (_vistaActual === 'semana') {
            _renderizarVistaSemana(citas, inicio);
        } else if (_vistaActual === 'mes') {
            _renderizarVistaMes(citas, inicio);
        }

    } catch(err) {
        console.error('[AGENDA] Error en _cargarCitasEnRango:', err);
        if (listaDia) listaDia.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;font-size:13px;">Error al cargar las citas.</div>';
    }
}

function _actualizarContadoresSuperior(citas) {
    const hoy = new Date();
    let citasHoy = 0, confirmadas = 0, agendadas = 0, canceladas = 0, finalizadas = 0;
    citas.forEach(c => {
        if (new Date(c.fecha_hora).toDateString() === hoy.toDateString()) citasHoy++;
        if (c.estado === 'confirmada') confirmadas++;
        if (['agendada','programada'].includes(c.estado)) agendadas++;
        if (c.estado === 'cancelada') canceladas++;
        if (['finalizada','completada'].includes(c.estado)) finalizadas++;
    });
    [['res-citas-hoy', citasHoy],['res-confirmadas', confirmadas],['res-agendadas', agendadas],['res-canceladas', canceladas],['res-finalizadas', finalizadas]]
        .forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
}

// ─── Modal de Detalle ────────────────────────────────────────────────────────
window.abrirDetalleCita = async function(citaId, event) {
    _citaSeleccionadaId = citaId;
    const modal = document.getElementById('modal-detalle-cita');
    const contenido = document.getElementById('modal-content-cita');
    if (!modal || !contenido) return;
    modal.style.display = 'flex';
    if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const espacioDer = window.innerWidth - rect.right;
        contenido.style.top = `${rect.top}px`;
        contenido.style.left = espacioDer > 340 ? `${rect.right + 10}px` : `${rect.left - 330}px`;
    }
    try {
        // Usa paciente_id de citas (1 nivel) -> y de ahí obtenemos cliente_id para el segundo paso
        const { data: c, error } = await conexionSupabase
            .from('citas')
            .select('*, pacientes(id, nombre, especie, raza, fecha_nacimiento, peso_actual, foto_url, cliente_id)')
            .eq('id', citaId)
            .single();

        if (error || !c) { console.error('[AGENDA] Error al cargar detalle de cita:', error); return; }

        const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes;
        let cliente = {};
        
        // Segundo paso: Obtener datos del cliente usando el cliente_id del paciente
        if (paciente?.cliente_id) {
            const { data: cl, error: errCl } = await conexionSupabase
                .from('clientes')
                .select('nombre_completo, telefono')
                .eq('id', paciente.cliente_id)
                .single();
            if (!errCl && cl) cliente = cl;
        }

        const hora = new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };

        setEl('det-nombre', paciente?.nombre);
        setEl('det-sub', `${paciente?.especie || ''} ${paciente?.raza ? '· ' + paciente.raza : ''}`.trim());
        setEl('det-motivo', c.motivo_breve || c.motivo);
        setEl('det-tipo', c.tipo_cita || 'Consulta');
        setEl('det-hora', hora);
        setEl('det-notas', c.notas_clinicas_preparacion || '(Sin notas)');
        setEl('det-propietario', cliente?.nombre_completo);
        setEl('det-telefono', cliente?.telefono);
        setEl('det-edad', paciente?.fecha_nacimiento
            ? `${Math.floor((Date.now() - new Date(paciente.fecha_nacimiento)) / (365.25 * 24 * 3600 * 1000))} años`
            : '—');
        setEl('det-peso', paciente?.peso_actual ? `${paciente.peso_actual} kg` : '—');

        const avatar = document.getElementById('det-avatar');
        if (avatar) {
            avatar.textContent = '';
            avatar.innerHTML = paciente?.foto_url
                ? `<img src="${paciente.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : (paciente?.nombre || 'P').charAt(0).toUpperCase();
        }

        const selector = document.getElementById('det-selector-estado');
        if (selector) selector.value = c.estado || 'programada';

        const banner = document.getElementById('banner-cita-cancelada');
        if (banner) banner.style.display = c.estado === 'cancelada' ? 'block' : 'none';

    } catch(e) { console.error('[AGENDA] Error al abrir detalle:', e); }
};

window.cerrarDetalleCita = function() {
    const modal = document.getElementById('modal-detalle-cita');
    if (modal) modal.style.display = 'none';
    _citaSeleccionadaId = null;
};

window.cambiarEstadoDesdeDetalle = async function(nuevoEstado) {
    if (!_citaSeleccionadaId) return;
    try {
        const { error } = await conexionSupabase.from('citas').update({ estado: nuevoEstado }).eq('id', _citaSeleccionadaId);
        if (!error) { _cargarCitasEnRango(); cargarSalaEspera(); cargarCitasPorConfirmar(); }
    } catch(e) { console.error('[AGENDA] Error al cambiar estado:', e); }
};

window.iniciarConsultaDesdeCita = function() {
    window.cerrarDetalleCita();
    document.querySelector('[data-target="MODULO_VETERINARIO_CONSULTA"]')?.click();
};

window.abrirExpedientePaciente = function() {
    window.cerrarDetalleCita();
    document.querySelector('[data-target="MODULO_EXPEDIENTES_HISTORIAL"]')?.click();
};

window.cancelarCitaSeleccionada = async function() {
    if (!_citaSeleccionadaId) return;
    const confirmado = await confirmacionCustom('¿Cancelar cita?', 'Esta acción marcará la cita como cancelada.', 'warning');
    if (!confirmado) return;
    await window.cambiarEstadoDesdeDetalle('cancelada');
    window.cerrarDetalleCita();
};

window.reprogramarCita = function() {
    if (typeof alertaCustom === 'function') alertaCustom('Reprogramar', 'Usa el formulario de "Nueva Cita" para agendar una nueva fecha.', 'info');
};

// ─── Modal Finalizar ─────────────────────────────────────────────────────────
window.cerrarModalFinalizar = function() {
    const m = document.getElementById('modal-finalizar-cita');
    if (m) m.style.display = 'none';
};

window.ejecutarFinalizarCita = async function() {
    if (!_citaSeleccionadaId) return;
    const notas = document.getElementById('finalizar-notas')?.value || '';
    try {
        const { error } = await conexionSupabase.from('citas').update({ estado: 'finalizada', notas }).eq('id', _citaSeleccionadaId);
        if (!error) { window.cerrarModalFinalizar(); window.cerrarDetalleCita(); _cargarCitasEnRango(); cargarSalaEspera(); }
    } catch(e) { console.error('[AGENDA] Error al finalizar cita:', e); }
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
window.ejecutarEnvioWhatsAppIndividual = function() {
    const num = (document.getElementById('wa-numero-celular')?.value || '').replace(/\D/g, '');
    if (!num) { if(typeof alertaCustom==='function') alertaCustom('Teléfono requerido', 'Ingresa el número de celular.', 'warning'); return; }
    const tel = num.startsWith('52') ? num : '52' + num;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent('Hola, tu cita en PETPROTECT ha sido confirmada. ¡Nos vemos pronto!')}`, '_blank');
    const mwa = document.getElementById('modal-whatsapp-cita');
    if (mwa) mwa.style.display = 'none';
};

window.ejecutarGuardadoCita = function() {
    const m = document.getElementById('modal-conflicto-cita');
    if (m) m.style.display = 'none';
};

// ─── Inicialización de navegación (se llama al final de inicializarAgenda) ───
function _inicializarNavegacion() {
    _mesActualMini = new Date(_fechaPivote);
    _renderMiniCalendario();
    _actualizarTituloFecha();
    _cargarCitasEnRango();
}

// ─── Modal Nueva Cita ─────────────────────────────────────────────────────────
window.abrirModalNuevaCita = function() {
    // Verificar si existe un modal en el HTML
    const modalExistente = document.getElementById('modal-nueva-cita') || document.getElementById('modal-agendar');
    if (modalExistente) {
        modalExistente.style.display = 'flex';
        return;
    }

    // Si no hay modal, crear uno dinámico inline con el esquema real
    const overlay = document.createElement('div');
    overlay.id = 'modal-nueva-cita-dinamico';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(3,47,64,0.5);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:32px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.15);font-family:'Montserrat',sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2 style="font-size:18px;font-weight:800;color:#032F40;margin:0;">Nueva Cita</h2>
            <button onclick="document.getElementById('modal-nueva-cita-dinamico')?.remove()" style="background:transparent;border:none;font-size:20px;cursor:pointer;color:#94a3b8;font-weight:700;">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="position: relative;">
                <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Nombre de la mascota *</label>
                <input id="nc-paciente-busqueda" type="text" placeholder="Escribe el nombre del paciente..." autocomplete="off"
                    style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:'Montserrat',sans-serif;outline:none;box-sizing:border-box;">
                <div id="nc-resultados-pacientes" style="display:none;position:absolute;top:100%;left:0;right:0;margin-top:4px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:9999;max-height:160px;overflow-y:auto;min-width:300px;"></div>
                <input id="nc-paciente-id" type="hidden">
                <input id="nc-cliente-id" type="hidden">
            </div>

            <div>
                <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Fecha y Hora *</label>
                <input id="nc-fecha-hora" type="datetime-local"
                    style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:'Montserrat',sans-serif;outline:none;box-sizing:border-box;">
            </div>

            <div>
                <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Tipo de cita</label>
                <select id="nc-tipo-cita" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:'Montserrat',sans-serif;outline:none;box-sizing:border-box;background:#fff;">
                    <option value="">Sin especificar</option>
                    <option value="Consulta general">Consulta general</option>
                    <option value="Vacunación">Vacunación</option>
                    <option value="Desparasitación">Desparasitación</option>
                    <option value="Cirugía">Cirugía</option>
                    <option value="Seguimiento">Seguimiento</option>
                    <option value="Urgencia">Urgencia</option>
                </select>
            </div>

            <div>
                <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Motivo breve</label>
                <input id="nc-motivo" type="text" placeholder="Ej. Revisión anual, vacuna antirrábica..."
                    style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:'Montserrat',sans-serif;outline:none;box-sizing:border-box;">
            </div>

            <div>
                <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Duración estimada</label>
                <select id="nc-duracion" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:'Montserrat',sans-serif;outline:none;box-sizing:border-box;background:#fff;">
                    <option value="20">20 minutos</option>
                    <option value="30" selected>30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1 hora 30 min</option>
                </select>
            </div>
        </div>

        <div id="nc-error" style="display:none;color:#ef4444;font-size:12px;font-weight:600;padding:8px 12px;background:#fef2f2;border-radius:8px;margin-top:12px;"></div>

        <div style="display:flex;gap:10px;margin-top:24px;">
            <button onclick="document.getElementById('modal-nueva-cita-dinamico')?.remove()"
                style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;color:#64748b;font-weight:700;font-size:13px;cursor:pointer;font-family:'Montserrat',sans-serif;">
                Cancelar
            </button>
            <button onclick="window.guardarNuevaCita(this)"
                style="flex:2;padding:12px;border:none;border-radius:10px;background:#032F40;color:#fff;font-weight:800;font-size:13px;cursor:pointer;font-family:'Montserrat',sans-serif;">
                Agendar Cita
            </button>
        </div>
    </div>`;

    document.body.appendChild(overlay);

    // Fecha/hora por defecto: ahora + 30 min redondeado
    const ahora = new Date();
    ahora.setMinutes(Math.ceil(ahora.getMinutes() / 30) * 30, 0, 0);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('nc-fecha-hora').value =
        `${ahora.getFullYear()}-${pad(ahora.getMonth()+1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

    // Autocompletado de pacientes
    const inputBusq = document.getElementById('nc-paciente-busqueda');
    const resDiv    = document.getElementById('nc-resultados-pacientes');
    let debTimer;
    inputBusq.addEventListener('input', () => {
        clearTimeout(debTimer);
        const q = inputBusq.value.trim();
        if (q.length < 2) { resDiv.style.display = 'none'; return; }
        debTimer = setTimeout(async () => {
            const { data } = await conexionSupabase
                .from('pacientes')
                .select('id, nombre, especie, cliente_id, clientes(nombre_completo)')
                .ilike('nombre', `%${q}%`)
                .eq('organizacion_id', organizacionId)
                .limit(8);
            if (!data || data.length === 0) { resDiv.style.display = 'none'; return; }
            resDiv.style.display = 'block';
            resDiv.innerHTML = data.map(p => {
                const tutor = Array.isArray(p.clientes) ? p.clientes[0]?.nombre_completo : p.clientes?.nombre_completo;
                return `<div onclick="window._seleccionarPacienteNuevaCita('${p.id}','${p.cliente_id}','${p.nombre.replace(/'/g,"\\'")}',this.parentNode)"
                    style="padding:10px 14px;cursor:pointer;font-size:12px;border-bottom:1px solid #f1f5f9;"
                    onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background='#fff'">
                    <div style="font-weight:700;color:#032F40;">${p.nombre}</div>
                    <div style="color:#94a3b8;font-size:11px;">${p.especie} · Tutor: ${tutor || 'Desconocido'}</div>
                </div>`;
            }).join('');
        }, 250);
    });
};

window._seleccionarPacienteNuevaCita = function(pacienteId, clienteId, nombre, container) {
    document.getElementById('nc-paciente-id').value = pacienteId;
    document.getElementById('nc-cliente-id').value = clienteId;
    document.getElementById('nc-paciente-busqueda').value = nombre;
    if (container) container.style.display = 'none';
};

let isGuardandoCitaAgenda = false;
window.guardarNuevaCita = async function(btn) {
    if (isGuardandoCitaAgenda) return;
    const pacienteId = document.getElementById('nc-paciente-id')?.value;
    const clienteId  = document.getElementById('nc-cliente-id')?.value;
    const fechaHora  = document.getElementById('nc-fecha-hora')?.value;
    const tipoCita   = document.getElementById('nc-tipo-cita')?.value  || null;
    const motivo     = document.getElementById('nc-motivo')?.value     || null;
    const duracion   = parseInt(document.getElementById('nc-duracion')?.value || '30');
    const errDiv     = document.getElementById('nc-error');

    if (!pacienteId) { errDiv.textContent = 'Selecciona una mascota de la lista.'; errDiv.style.display = 'block'; return; }
    if (!fechaHora)  { errDiv.textContent = 'Elige una fecha y hora.'; errDiv.style.display = 'block'; return; }
    errDiv.style.display = 'none';

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Guardando...";
    }
    isGuardandoCitaAgenda = true;

    try {
        const sesion = await obtenerSesionActiva();
        
        // Validación de Horario (Caso Especial)
        const horariosClinica = sesion?.perfil?.horario_atencion || null;
        if (horariosClinica && fechaHora) {
            const fhLocal = new Date(fechaHora);
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const diaClave = diasSemana[fhLocal.getDay()];
            
            const norm = (s) => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            let estaCerrado = false;
            
            if (Array.isArray(horariosClinica)) {
                const diaConfig = horariosClinica.find(d => norm(d.dia) === norm(diaClave));
                if (!diaConfig || (diaConfig.abierto !== true && diaConfig.abierto !== 'true' && diaConfig.abierto !== 1)) {
                    estaCerrado = true;
                }
            } else if (horariosClinica[diaClave]) {
                const hData = horariosClinica[diaClave];
                if (hData.abierto !== true && hData.abierto !== 'true' && hData.abierto !== 1) {
                    estaCerrado = true;
                }
            }

            if (estaCerrado) {
                const confirmar = await confirmacionCustom('Clínica Cerrada', `El médico no atiende los días ${diaClave}.\n¿Deseas registrar esta cita como un CASO ESPECIAL?`, 'warning');
                if (!confirmar) {
                    isGuardandoCitaAgenda = false;
                    if (btn) { btn.disabled = false; btn.textContent = "Agendar Cita"; }
                    return;
                }
            }
        }

        const nuevaCita = {
        organizacion_id: organizacionId,
        sucursal_id:     sucursalId,
        paciente_id:     pacienteId,
        cliente_id:      clienteId  || null,
        medico_id:       sesion?.perfil?.id || null,
        created_by:      sesion?.user?.id   || null,
        fecha_hora:      new Date(fechaHora).toISOString(),
        tipo_cita:       tipoCita,
        motivo_breve:    motivo,
        duracion_minutos: duracion,
        estado:         'programada',
    };

        const { error } = await conexionSupabase.from('citas').insert([nuevaCita]);
        if (error) {
            errDiv.textContent = `Error: ${error.message}`;
            errDiv.style.display = 'block';
            return;
        }

        document.getElementById('modal-nueva-cita-dinamico')?.remove();
        _cargarCitasEnRango();
        cargarCitasPorConfirmar();
        cargarSalaEspera();
        actualizarMetricas();
        if (typeof alertaCustom === 'function') alertaCustom('Cita agendada', 'La cita fue registrada exitosamente.', 'success');
    } catch (err) {
        console.error(err);
        errDiv.textContent = 'Hubo un error al guardar la cita. Intenta de nuevo.';
        errDiv.style.display = 'block';
    } finally {
        isGuardandoCitaAgenda = false;
        if (btn) { btn.disabled = false; btn.textContent = "Agendar Cita"; }
    }
};
