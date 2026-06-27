import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';

let sucursalId = null;
let organizacionId = null;

export async function inicializarModuloCitasGlobal() {
    try {
        const sesion = await obtenerSesionActiva();
        if (sesion?.perfil) {
            sucursalId = sesion.perfil.sucursal_id;
            organizacionId = sesion.perfil.organizacion_id;
        }

        configurarModalGlobal();
    } catch (e) {
        console.error('[CITAS GLOBAL] Error de inicialización', e);
    }
}

function configurarModalGlobal() {
    const btnCerrar   = document.getElementById('btn-cerrar-modal-cita');
    const btnCancelar = document.getElementById('btn-cancelar-modal-cita-alt');
    const overlay     = document.getElementById('citaOverlay');

    if (btnCerrar)   btnCerrar.addEventListener('click', window.cerrarModalCita);
    if (btnCancelar) btnCancelar.addEventListener('click', window.cerrarModalCita);
    if (overlay)     overlay.addEventListener('click', window.cerrarModalCita);

    // Búsqueda de paciente con debounce
    const inputBuscar = document.getElementById('input-buscar-paciente-cita');
    if (inputBuscar) {
        let timeout = null;
        inputBuscar.addEventListener('input', e => {
            clearTimeout(timeout);
            const val = e.target.value.trim();
            const box = document.getElementById('resultados-paciente-cita');
            if (val.length < 2) { if(box) box.style.display = 'none'; return; }
            timeout = setTimeout(() => buscarPacientesModal(val), 400);
        });
    }

    // Submit del formulario
    const form = document.getElementById('form-nueva-cita');
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const pacienteId = document.getElementById('cita-paciente-id').value;
            if (!pacienteId) {
                if (typeof alertaCustom === 'function') alertaCustom('Falta paciente', 'Selecciona un paciente de la lista.', 'warning');
                return;
            }
            const fecha    = document.getElementById('cita-fecha').value;
            const horaIni  = document.getElementById('cita-hora').value;
            const duracion = parseInt(document.getElementById('cita-duracion').value) || 30;
            const tipo     = document.getElementById('cita-tipo').value;
            const motivo   = document.getElementById('cita-motivo').value;
            const notas    = document.getElementById('cita-notas').value;

            const [year, month, day]     = fecha.split('-');
            const [hour, minute]         = horaIni.split(':');
            const fechaHoraLocal         = new Date(year, month - 1, day, hour, minute, 0);
            const fechaHoraFinLocal      = new Date(fechaHoraLocal.getTime() + duracion * 60000);

            try {
                // Validación de colisión en Supabase
                const { data: colisiones, error: errCol } = await conexionSupabase
                    .from('citas')
                    .select('id')
                    .eq('sucursal_id', sucursalId)
                    .neq('estado', 'cancelada')
                    .gte('fecha_hora', fechaHoraLocal.toISOString())
                    .lt('fecha_hora', fechaHoraFinLocal.toISOString())
                    .limit(1);

                if (errCol) throw errCol;
                if (colisiones && colisiones.length > 0) {
                    if (typeof alertaCustom === 'function') alertaCustom('Horario ocupado', 'Este horario ya está ocupado por otra cita.', 'warning');
                    return;
                }

                const { error } = await conexionSupabase.from('citas').insert([{
                    organizacion_id:  organizacionId,
                    sucursal_id:      sucursalId,
                    paciente_id:      pacienteId,
                    fecha_hora:       fechaHoraLocal.toISOString(),
                    duracion_minutos: duracion,
                    tipo_cita:        tipo,
                    estado:           'agendada',
                    motivo:           motivo,
                    notas_clinicas_preparacion: notas || null
                }]);
                if (error) throw error;
                
                if (typeof alertaCustom === 'function') alertaCustom('Cita agendada', 'La cita se registró correctamente.', 'success');
                window.cerrarModalCita();
                
                // Refrescar calendario solo si estamos en la vista de Agenda
                if (typeof window.cargarCitasEnRango === 'function') {
                    window.cargarCitasEnRango();
                }
                if (typeof window.cargarCitasPorConfirmar === 'function') {
                    window.cargarCitasPorConfirmar();
                }
            } catch (e) {
                console.error(e);
                if (typeof alertaCustom === 'function') alertaCustom('Error', 'No se pudo guardar la cita.', 'error');
            }
        });
    }
}

window.abrirModalNuevaCita = function(tipo) {
    const panel = document.getElementById('panelNuevaCita');
    const overlay = document.getElementById('citaOverlay');
    if (!panel || !overlay) return;
    
    panel.classList.add('abierto');
    overlay.classList.add('abierto');

    const form = document.getElementById('form-nueva-cita');
    if (form) form.reset();

    // Limpiar campos ocultos
    const pid = document.getElementById('cita-paciente-id');
    if (pid) pid.value = '';
    const box = document.getElementById('resultados-paciente-cita');
    if (box) box.style.display = 'none';

    // Prellenar fecha con la fecha actual o la vista en agenda
    const campoFecha = document.getElementById('cita-fecha');
    if (campoFecha) {
        if (typeof fechaBase !== 'undefined') {
            campoFecha.value = fechaBase.toISOString().split('T')[0];
        } else {
            campoFecha.value = new Date().toISOString().split('T')[0];
        }
    }

    // Prellenar tipo si viene de un contexto específico
    if (tipo) {
        const campoTipo = document.getElementById('cita-tipo');
        if (campoTipo) campoTipo.value = tipo;
    }
};

window.abrirModalCita = window.abrirModalNuevaCita;

window.cerrarModalCita = function() {
    const panel = document.getElementById('panelNuevaCita');
    const overlay = document.getElementById('citaOverlay');
    if (panel) panel.classList.remove('abierto');
    if (overlay) overlay.classList.remove('abierto');
};

async function buscarPacientesModal(termino) {
    const box = document.getElementById('resultados-paciente-cita');
    if (!box) return;
    box.innerHTML = '<div style="padding:10px;text-align:center;">Buscando...</div>';
    box.style.display = 'block';

    try {
        const { data, error } = await conexionSupabase
            .from('pacientes')
            .select('id, nombre, especie, clientes(nombre_completo)')
            .eq('organizacion_id', organizacionId)
            .ilike('nombre', `%${termino}%`)
            .limit(8);
        if (error) throw error;

        if (!data || data.length === 0) {
            box.innerHTML = '<div style="padding:10px;text-align:center;color:var(--texto-sec);">No se encontró paciente.</div>';
            return;
        }
        box.innerHTML = '';
        data.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px;cursor:pointer;border-bottom:1px solid var(--borde);font-size:13px;';
            const nombreCliente = p.clientes?.nombre_completo || 'Sin tutor';
            div.innerHTML = `<strong>${p.nombre}</strong> <span style="color:var(--texto-sec);">(${p.especie || 'Mascota'}) - ${nombreCliente}</span>`;
            div.addEventListener('click', () => {
                document.getElementById('input-buscar-paciente-cita').value = `${p.nombre} - ${nombreCliente}`;
                document.getElementById('cita-paciente-id').value = p.id;
                box.style.display = 'none';
            });
            box.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        box.innerHTML = '<div style="padding:10px;color:red;">Error de búsqueda</div>';
    }
}


document.addEventListener('DOMContentLoaded', () => { inicializarModuloCitasGlobal(); });
if (document.readyState === 'complete' || document.readyState === 'interactive') { inicializarModuloCitasGlobal(); }
