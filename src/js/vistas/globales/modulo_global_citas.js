import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { alertaCustom, confirmacionCustomPeligro, promptCustomPeligro } from '../../utilidades/ui_alertas.js?v=1782238072306';

let sucursalId = null;
let organizacionId = null;
let medicoId = null;
let mensajeCancelacionMasiva = "";

export async function inicializarModuloCitasGlobal() {
    try {
        const sesion = await obtenerSesionActiva();
        if (sesion?.perfil) {
            sucursalId = sesion.perfil.sucursal_id;
            organizacionId = sesion.perfil.organizacion_id;
            medicoId = sesion.user.id;
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

    // Lógica para Tipo de Duración (Todo el día y Otro)
    const duracionSelect = document.getElementById('cita-duracion');
    const duracionPersonalizadaContainer = document.getElementById('contenedor-duracion-personalizada');
    const duracionPersonalizadaInput = document.getElementById('cita-duracion-personalizada');
    
    let duracionPrevia = '30';

    if (duracionSelect) {
        duracionSelect.addEventListener('change', async (e) => {
            const val = e.target.value;
            
            // Mostrar/ocultar input "Otro"
            if (val === 'otro') {
                duracionPersonalizadaContainer.style.display = 'block';
                duracionPersonalizadaInput.setAttribute('required', 'true');
            } else {
                duracionPersonalizadaContainer.style.display = 'none';
                duracionPersonalizadaInput.removeAttribute('required');
            }

            const hintTodoDia = document.getElementById('hint-duracion-dinamico');

            // Mostrar/ocultar hint "Todo el día"
            if (hintTodoDia) {
                if (val === 'todo_el_dia') {
                    hintTodoDia.style.display = 'block';
                } else {
                    hintTodoDia.style.display = 'none';
                }
            }

            duracionPrevia = duracionSelect.value;
        });
    }

    // Submit del formulario
    const form = document.getElementById('form-nueva-cita');
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const pacienteId = document.getElementById('cita-paciente-id').value;
            const fecha    = document.getElementById('cita-fecha').value;
            const horaIni  = document.getElementById('cita-hora').value;
            let duracionStr = document.getElementById('cita-duracion').value;
            let esTodoElDia = (duracionStr === 'todo_el_dia');

            if (!pacienteId && !esTodoElDia) {
                if (typeof alertaCustom === 'function') alertaCustom('Falta paciente', 'Selecciona un paciente de la lista.', 'warning');
                return;
            }

            const tipo     = document.getElementById('cita-tipo').value;
            const motivo   = document.getElementById('cita-motivo').value;
            const notas    = document.getElementById('cita-notas').value;

            const [year, month, day]     = fecha.split('-');
            const [hour, minute]         = horaIni.split(':');
            const fechaHoraLocal         = new Date(year, month - 1, day, hour, minute, 0);
            let finDiaLocal              = new Date(year, month - 1, day, 23, 59, 59);

            let duracion = 30;
            let citasAfectadas = [];
            let fechaHoraFinLocal = null;

            try {
                // 1. Validar horarios de atención del médico
                const { data: perfilData, error: errPerfil } = await conexionSupabase
                    .from('perfiles')
                    .select('horario_atencion')
                    .eq('id', medicoId)
                    .single();

                if (errPerfil) throw errPerfil;

                let diaConfig = null;
                let diaLargo = '';

                if (perfilData && perfilData.horario_atencion) {
                    const horarioData = perfilData.horario_atencion;
                    const mapDias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
                    diaLargo = mapDias[fechaHoraLocal.getDay()];
                    
                    if (Array.isArray(horarioData)) {
                        diaConfig = horarioData.find(d => d.dia.toLowerCase() === diaLargo.toLowerCase());
                    } else if (horarioData.dias) {
                        const mapAntiguo = { 'Domingo':'dom', 'Lunes':'lun', 'Martes':'mar', 'Miercoles':'mie', 'Jueves':'jue', 'Viernes':'vie', 'Sabado':'sab', 'dom':'dom', 'lun':'lun', 'mar':'mar', 'mie':'mie', 'jue':'jue', 'vie':'vie', 'sab':'sab' };
                        const diaCorto = mapAntiguo[diaLargo];
                        if (horarioData.dias.includes(diaCorto) || horarioData.dias.includes(diaLargo.substring(0,3).toLowerCase())) {
                            diaConfig = { abierto: true, apertura: horarioData.apertura, cierre: horarioData.cierre };
                        } else {
                            diaConfig = { abierto: false };
                        }
                    } else if (horarioData[diaLargo.toLowerCase()]) {
                        const dConf = horarioData[diaLargo.toLowerCase()];
                        diaConfig = { abierto: dConf.abierto, apertura: dConf.inicio, cierre: dConf.fin };
                    }

                    if (!diaConfig || !diaConfig.abierto) {
                        if (typeof alertaCustom === 'function') alertaCustom('Clínica cerrada', `El médico no atiende los días ${diaLargo}.`, 'warning');
                        return;
                    }
                    
                    if (diaConfig.cierre) {
                        const [cH, cM] = diaConfig.cierre.split(':').map(Number);
                        finDiaLocal = new Date(year, month - 1, day, cH, cM, 0);
                    }
                }

                if (esTodoElDia) {
                    const msgDefault = "Lamentamos informarle que el médico tuvo una emergencia y no podrá atender su cita. Nos comunicaremos pronto para reprogramar.";
                    const respuesta = await promptCustomPeligro("Bloquear agenda", "Esta opción cancelará tus citas desde la hora seleccionada hasta el final del día. Por favor escribe el mensaje que se enviará a los dueños afectados:", msgDefault);
                    
                    if (!respuesta.confirmado) {
                        return; // Abortar guardado
                    }
                    mensajeCancelacionMasiva = respuesta.texto;
                    
                    duracion = Math.round((finDiaLocal.getTime() - fechaHoraLocal.getTime()) / 60000);
                    if (duracion < 0) duracion = 0;
                } else if (duracionStr === 'otro') {
                    const duracionPersonalizadaInput = document.getElementById('cita-duracion-personalizada');
                    duracion = Math.round((parseFloat(duracionPersonalizadaInput.value) || 0.5) * 60);
                } else {
                    duracion = parseInt(duracionStr) || 30;
                }

                fechaHoraFinLocal = new Date(fechaHoraLocal.getTime() + duracion * 60000);

                if (diaConfig && !esTodoElDia) {
                    const [aperturaH, aperturaM] = (diaConfig.apertura || "00:00").split(':').map(Number);
                    const [cierreH, cierreM] = (diaConfig.cierre || "23:59").split(':').map(Number);
                    const [inicioH, inicioM] = horaIni.split(':').map(Number);
                    
                    const minApertura = aperturaH * 60 + aperturaM;
                    const minCierre = cierreH * 60 + cierreM;
                    const minInicio = inicioH * 60 + inicioM;
                    const minFin = minInicio + duracion;

                    if (minInicio < minApertura || minFin > minCierre) {
                        if (typeof alertaCustom === 'function') alertaCustom('Fuera de horario', `El horario para el ${diaLargo} es de ${diaConfig.apertura} a ${diaConfig.cierre}.`, 'warning');
                        return;
                    }
                }

                if (esTodoElDia) {
                    const inicioBloqueo = fechaHoraLocal.toISOString();
                    const finDia = finDiaLocal.toISOString();
                    
                    // 1. Obtener las citas afectadas
                    const { data: afectadas } = await conexionSupabase
                        .from('citas')
                        .select('id, paciente_id, fecha_hora, pacientes(nombre, clientes(nombre_completo, telefono))')
                        .eq('medico_id', medicoId)
                        .gte('fecha_hora', inicioBloqueo)
                        .lte('fecha_hora', finDia)
                        .neq('estado', 'cancelada')
                        .neq('estado', 'no_asistio');
                    
                    if (afectadas) citasAfectadas = afectadas;
                    
                    // 2. Cancelar
                    const { error: errCancelacion } = await conexionSupabase
                        .from('citas')
                        .update({ estado: 'cancelada' })
                        .eq('medico_id', medicoId)
                        .gte('fecha_hora', inicioBloqueo)
                        .lte('fecha_hora', finDia)
                        .neq('estado', 'cancelada')
                        .neq('estado', 'no_asistio');
                        
                    if (errCancelacion) throw errCancelacion;
                } else {
                    const { data: colisiones, error: errCol } = await conexionSupabase
                        .from('citas')
                        .select('id')
                        .eq('medico_id', medicoId)
                        .neq('estado', 'cancelada')
                        .neq('estado', 'no_asistio')
                        .gte('fecha_hora', fechaHoraLocal.toISOString())
                        .lt('fecha_hora', fechaHoraFinLocal.toISOString())
                        .limit(1);

                    if (errCol) throw errCol;
                    if (colisiones && colisiones.length > 0) {
                        if (typeof alertaCustom === 'function') alertaCustom('Horario ocupado', 'Este horario ya está ocupado por otra cita.', 'warning');
                        return;
                    }
                }

                const { error } = await conexionSupabase.from('citas').insert([{
                    organizacion_id:  organizacionId,
                    sucursal_id:      sucursalId,
                    medico_id:        medicoId,
                    paciente_id:      pacienteId || null,
                    fecha_hora:       fechaHoraLocal.toISOString(),
                    duracion_minutos: duracion,
                    tipo_cita:        tipo,
                    estado:           'agendada',
                    motivo:           motivo,
                    notas_clinicas_preparacion: notas || null
                }]);
                if (error) throw error;
                
                window.cerrarModalCita();
                
                if (esTodoElDia) {
                    mostrarAsistenteCancelacion(citasAfectadas, mensajeCancelacionMasiva);
                } else {
                    if (typeof alertaCustom === 'function') alertaCustom('Cita agendada', 'La cita se registró correctamente.', 'success');
                }
                
                // Refrescar calendarios
                if (typeof window.cargarCitasEnRango === 'function') window.cargarCitasEnRango();
                if (typeof window.cargarCitasPorConfirmar === 'function') window.cargarCitasPorConfirmar();
                if (typeof window.cargarConsultasHoyDashboard === 'function') window.cargarConsultasHoyDashboard();
                
            } catch (e) {
                console.error(e);
                const msg = e.message || e.details || e.hint || '';
                if (typeof alertaCustom === 'function') alertaCustom('Error', `No se pudo guardar la cita. ${msg}`, 'error');
            }
        });
    }
}

window.abrirModalNuevaCita = function(tipo) {
    let panel = document.getElementById('panelNuevaCita');
    let overlay = document.getElementById('citaOverlay');
    
    // Crear modal dinámicamente si no existe
    if (!panel || !overlay) {
        // Crear overlay
        overlay = document.createElement('div');
        overlay.id = 'citaOverlay';
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(3,47,64,0.6); backdrop-filter:blur(4px); z-index:999999; display:none; align-items:center; justify-content:center;';
        document.body.appendChild(overlay);
        
        // Crear panel
        panel = document.createElement('aside');
        panel.id = 'panelNuevaCita';
        panel.style.cssText = 'background:#fff; border-radius:16px; padding:24px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 60px rgba(0,0,0,0.15); display:none; font-family:"Montserrat",sans-serif;';
        
        panel.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
                <h2 style="margin:0; font-size:18px; font-weight:800; color:#032F40;">Nueva Cita</h2>
                <button id="btn-cerrar-modal-cita" style="background:none; border:none; cursor:pointer; color:#94a3b8;">
                    <span class="material-symbols-rounded" style="font-size:24px;">close</span>
                </button>
            </div>
            <form id="form-nueva-cita">
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#032F40; margin-bottom:6px;">Paciente</label>
                    <input type="text" id="input-buscar-paciente-cita" placeholder="Buscar paciente..." style="width:100%; padding:10px; border:1px solid #E7EBEE; border-radius:8px; font-size:14px;">
                    <input type="hidden" id="cita-paciente-id">
                    <div id="resultados-paciente-cita" style="display:none; position:absolute; background:#fff; border:1px solid #E7EBEE; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); max-height:200px; overflow-y:auto; z-index:10;"></div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#032F40; margin-bottom:6px;">Fecha</label>
                    <input type="date" id="cita-fecha" required style="width:100%; padding:10px; border:1px solid #E7EBEE; border-radius:8px; font-size:14px;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#032F40; margin-bottom:6px;">Hora</label>
                    <input type="time" id="cita-hora" required style="width:100%; padding:10px; border:1px solid #E7EBEE; border-radius:8px; font-size:14px;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#032F40; margin-bottom:6px;">Tipo</label>
                    <select id="cita-tipo" style="width:100%; padding:10px; border:1px solid #E7EBEE; border-radius:8px; font-size:14px;">
                        <option value="consulta">Consulta General</option>
                        <option value="vacunacion">Vacunación</option>
                        <option value="desparasitacion">Desparasitación</option>
                        <option value="cirugia">Cirugía</option>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="urgencia">Urgencia</option>
                    </select>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#032F40; margin-bottom:6px;">Motivo</label>
                    <input type="text" id="cita-motivo" placeholder="Motivo de la cita" style="width:100%; padding:10px; border:1px solid #E7EBEE; border-radius:8px; font-size:14px;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#032F40; margin-bottom:6px;">Duración</label>
                    <select id="cita-duracion" style="width:100%; padding:10px; border:1px solid #E7EBEE; border-radius:8px; font-size:14px;">
                        <option value="30">30 minutos</option>
                        <option value="45">45 minutos</option>
                        <option value="60">1 hora</option>
                        <option value="90">1.5 horas</option>
                        <option value="120">2 horas</option>
                    </select>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#032F40; margin-bottom:6px;">Notas</label>
                    <textarea id="cita-notas" placeholder="Notas adicionales" rows="3" style="width:100%; padding:10px; border:1px solid #E7EBEE; border-radius:8px; font-size:14px; resize:vertical;"></textarea>
                </div>
                <div style="display:flex; gap:12px; margin-top:24px;">
                    <button type="submit" style="flex:1; background:#F27405; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">Agendar Cita</button>
                    <button type="button" id="btn-cancelar-modal-cita-alt" style="flex:1; background:#E7EBEE; color:#032F40; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">Cancelar</button>
                </div>
            </form>
        `;
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        // Reconfigurar eventos después de crear el modal
        configurarModalGlobal();
    }
    
    panel.classList.add('abierto');
    panel.style.display = 'block';
    overlay.classList.add('abierto');
    overlay.style.display = 'flex';

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
    
    // Pre-llenar paciente si viene desde expediente
    if (window._pacienteParaCita) {
        const inputBuscar = document.getElementById('input-buscar-paciente-cita');
        const pacienteId = document.getElementById('cita-paciente-id');
        if (inputBuscar && pacienteId) {
            inputBuscar.value = window._pacienteParaCita.nombre;
            pacienteId.value = window._pacienteParaCita.id;
        }
        window._pacienteParaCita = null;
    }
};

window.abrirModalCita = window.abrirModalNuevaCita;

window.cerrarModalCita = function() {
    const panel = document.getElementById('panelNuevaCita');
    const overlay = document.getElementById('citaOverlay');
    if (panel) {
        panel.classList.remove('abierto');
        panel.style.display = 'none';
    }
    if (overlay) {
        overlay.classList.remove('abierto');
        overlay.style.display = 'none';
    }
};

async function buscarPacientesModal(termino) {
    const box = document.getElementById('resultados-paciente-cita');
    if (!box) return;
    box.innerHTML = '<div style="padding:10px;text-align:center;">Buscando...</div>';
    box.style.display = 'block';

    try {
        // Buscar clientes coincidentes primero
        const { data: clientesData } = await conexionSupabase
            .from('clientes')
            .select('id')
            .eq('organizacion_id', organizacionId)
            .ilike('nombre_completo', `%${termino}%`)
            .limit(10);
            
        let orQuery = `nombre.ilike.%${termino}%`;
        if (clientesData && clientesData.length > 0) {
            const ids = clientesData.map(c => c.id).join(',');
            orQuery += `,cliente_id.in.(${ids})`;
        }

        const { data, error } = await conexionSupabase
            .from('pacientes')
            .select('id, nombre, especie, clientes(nombre_completo)')
            .eq('organizacion_id', organizacionId)
            .or(orQuery)
            .limit(10);
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


function mostrarAsistenteCancelacion(citasAfectadas, mensajeBase) {
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0'; backdrop.style.left = '0';
    backdrop.style.width = '100vw'; backdrop.style.height = '100vh';
    backdrop.style.backgroundColor = 'rgba(3, 47, 64, 0.4)';
    backdrop.style.backdropFilter = 'blur(5px)';
    backdrop.style.zIndex = '999999';
    backdrop.style.display = 'flex';
    backdrop.style.justifyContent = 'center'; backdrop.style.alignItems = 'center';
    
    const modal = document.createElement('div');
    modal.style.background = '#fff';
    modal.style.borderRadius = '16px';
    modal.style.padding = '32px';
    modal.style.width = '90%'; modal.style.maxWidth = '500px';
    modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
    modal.style.fontFamily = "'Montserrat', sans-serif";

    let html = `
        <div style="text-align: center; margin-bottom: 24px;">
            <span class="material-symbols-rounded" style="font-size: 48px; color: #10b981;">check_circle</span>
            <h3 style="margin: 8px 0; color: #032F40;">Día Bloqueado</h3>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Se cancelaron ${citasAfectadas.length} citas. Envía el aviso a los dueños:</p>
        </div>
        <div style="max-height: 300px; overflow-y: auto; padding-right: 8px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
    `;

    citasAfectadas.forEach(c => {
        const paciente = c.pacientes?.nombre || 'Paciente';
        const cliente = c.pacientes?.clientes?.nombre_completo || 'Cliente';
        let telefono = c.pacientes?.clientes?.telefono || '';
        
        // Limpiar teléfono
        telefono = telefono.replace(/\D/g, '');
        
        const fechaObj = new Date(c.fecha_hora);
        const horaStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        const texto = `Hola ${cliente}, le informamos sobre la cita de ${paciente} a las ${horaStr}: ${mensajeBase}`;
        const link = telefono.length >= 10 ? `https://api.whatsapp.com/send?phone=52${telefono}&text=${encodeURIComponent(texto)}` : '#';
        
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div>
                    <div style="font-weight: 600; color: #0f172a; font-size: 14px;">${cliente}</div>
                    <div style="color: #64748b; font-size: 12px;">${paciente} (${horaStr})</div>
                </div>
                ${telefono.length >= 10 ? 
                    `<a href="${link}" target="_blank" style="background: #25D366; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        <span class="material-symbols-rounded" style="font-size: 16px;">chat</span> Enviar
                    </a>` :
                    `<span style="color: #ef4444; font-size: 12px; font-weight: 500;">Sin teléfono</span>`
                }
            </div>
        `;
    });

    html += `
        </div>
        <button id="btn-cerrar-asistente" style="width: 100%; background: #032F40; color: white; border: none; border-radius: 8px; padding: 12px; font-size: 15px; font-weight: 600; cursor: pointer;">Finalizar</button>
    `;

    modal.innerHTML = html;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    backdrop.querySelector('#btn-cerrar-asistente').addEventListener('click', () => {
        document.body.removeChild(backdrop);
        if (typeof window.cargarCitasEnRango === 'function') window.cargarCitasEnRango();
    });
}
