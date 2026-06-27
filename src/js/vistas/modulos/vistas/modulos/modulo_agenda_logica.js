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
        actualizarMetricas()
    ]);
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
        const { data: citas, error } = await conexionSupabase
            .from('citas')
            .select('id, fecha_hora, motivo_breve, estatus, paciente_id, pacientes(nombre)')
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

            // Clase CSS según estatus
            const clasesEstatus = {
                'completada':   'cita-completada',
                'finalizada':   'cita-completada',
                'en_consulta':  'estado-en-progreso',
                'urgencia':     'estado-urgencia',
                'programada':   '',
                'confirmada':   '',
                'en_espera':    '',
            };
            const claseExtra = clasesEstatus[cita.estatus] ?? '';

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
        // ✅ Sin filtro de estatus en la query — evita el error 400 por mismatch de ENUM.
        // Supabase filtra solo por sucursal y fecha; el filtrado de sala de espera
        // se hace localmente en JS.
        const { data: todasCitasHoy, error } = await conexionSupabase
            .from('citas')
            .select('id, fecha_hora, motivo_breve, estatus, pacientes(nombre)')
            .eq('sucursal_id', sucursalId)
            .gte('fecha_hora', hoyInicio.toISOString())
            .lte('fecha_hora', hoyFin.toISOString())
            .order('fecha_hora', { ascending: true });

        if (error) throw error;

        // 🔍 AUDITORÍA: Inspeccionamos los valores reales del ENUM desde la BD
        console.log('[AGENDA] Citas de HOY recuperadas:', todasCitasHoy);

        // Estatus que indican cita INACTIVA (no aparece en sala de espera)
        const ESTATUS_INACTIVOS = new Set([
            'cancelada', 'cancelado',
            'finalizada', 'finalizado',
            'completada', 'completado',
            'no_asistio', 'no_presentado',
            'programada',   // cita futura aún no activa
        ]);

        // Filtrado local: solo citas que NO son inactivas
        const citasEspera = (todasCitasHoy || []).filter(
            c => !ESTATUS_INACTIVOS.has(c.estatus?.toLowerCase?.() ?? '')
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

            // Clasificación visual basada en el estatus real de la BD
            const estatusLower = cita.estatus?.toLowerCase?.() ?? '';
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

            // Pacientes atendidos hoy (estatus finalizada/completada)
            conexionSupabase
                .from('citas')
                .select('id', { count: 'exact', head: true })
                .eq('sucursal_id', sucursalId)
                .in('estatus', ['finalizada', 'completada'])
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

// ─── 6. LISTENERS DE BOTONES (preservados del código original) ─────────────────
function configurarListenersBotones() {
    const btnGuardarCita = document.getElementById('btnGuardarCita');
    if (btnGuardarCita) {
        btnGuardarCita.addEventListener('click', async (e) => {
            e.preventDefault();
            btnGuardarCita.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Guardado`;
            setTimeout(() => {
                btnGuardarCita.innerHTML = `<span class="material-symbols-rounded">event_available</span> Confirmar Cita`;
                document.getElementById('formularioNuevaCita')?.reset();
            }, 2000);
        });
    }

    // Filtros de especie/tipo (UI reactiva sin red)
    const botonesFiltro = document.querySelectorAll('.btnFiltro');
    const nivelSuscripcionActual = 'basico';

    botonesFiltro.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('bloqueado') && nivelSuscripcionActual === 'basico') {
                alertaCustom('Esta función requiere el plan Protect Pet Pro.');
                return;
            }
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
