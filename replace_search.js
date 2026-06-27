const fs = require('fs');
const path = 'c:/xampp/htdocs/PETPROTECT/src/js/vistas/modulos/modulo_agenda_logica.js';
let content = fs.readFileSync(path, 'utf8');

const oldFuncRegex = /function configurarBuscadorHeader\(\) \{[\s\S]*?document\.addEventListener\('click', e => \{[\s\S]*?\}\);\s*\}/;

const newFunc = \unction configurarBuscadorHeader() {
    const input = document.getElementById('agenda-buscador-pacientes');
    const box   = document.getElementById('agenda-resultados-busqueda');
    if (!input || !box) return;

    let timeout = null;
    input.addEventListener('input', e => {
        clearTimeout(timeout);
        const val = e.target.value.trim();
        if (val.length < 2) { box.style.display = 'none'; return; }
        timeout = setTimeout(async () => {
            try {
                // 1. Buscar pacientes y clientes 
                const { data: pacsPorNombre } = await conexionSupabase
                    .from('pacientes')
                    .select('id, nombre, especie, raza, foto_url, clientes(nombre_completo)')
                    .eq('organizacion_id', organizacionId)
                    .ilike('nombre', \%\%\);

                const { data: clientes } = await conexionSupabase
                    .from('clientes')
                    .select('id, nombre_completo')
                    .eq('organizacion_id', organizacionId)
                    .ilike('nombre_completo', \%\%\);
                
                const clienteIds = clientes ? clientes.map(c => c.id) : [];
                
                let pacsPorCliente = [];
                if (clienteIds.length > 0) {
                    const { data: p } = await conexionSupabase
                        .from('pacientes')
                        .select('id, nombre, especie, raza, foto_url, clientes(nombre_completo)')
                        .eq('organizacion_id', organizacionId)
                        .in('cliente_id', clienteIds);
                    if (p) pacsPorCliente = p;
                }

                // Unir sin duplicados
                const allPacientesMap = new Map();
                if (pacsPorNombre) pacsPorNombre.forEach(p => allPacientesMap.set(p.id, p));
                if (pacsPorCliente) pacsPorCliente.forEach(p => allPacientesMap.set(p.id, p));
                const pacientesResultados = Array.from(allPacientesMap.values());

                if (pacientesResultados.length === 0) { 
                    box.innerHTML = '<div style="padding:10px;color:var(--texto-sec);font-size:13px;">No se encontraron pacientes</div>';
                    box.style.display = 'block'; 
                    return; 
                }
                
                box.innerHTML = '';
                pacientesResultados.forEach(paciente => {
                    const fotoUrl = paciente.foto_url || 'https://cdn-icons-png.flaticon.com/512/2809/2809865.png';
                    const nombreMascota = paciente.nombre || 'Desconocido';
                    const especieRaza = \\ \\;
                    const tutorNombre = paciente.clientes?.nombre_completo || 'Sin tutor registrado';

                    const item = document.createElement('div');
                    item.className = 'resultado-pred-item';
                    item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;cursor:pointer;border-bottom:1px solid var(--borde);transition:var(--transicion);';
                    
                    item.innerHTML = \\\
                        <img src="\" alt="Foto" style="width:40px;height:40px;border-radius:10px;object-fit:cover;">
                        <div style="display:flex;flex-direction:column;gap:3px;flex:1;">
                            <strong style="color:var(--texto-fuerte);font-size:14px;">\</strong>
                            <span style="color:var(--texto-sec);font-size:12px;">\</span>
                            <span style="color:var(--cobalto);font-size:11px;font-weight:600;"><span class="material-symbols-rounded" style="font-size:12px;vertical-align:middle;">person</span> \</span>
                        </div>
                    \\\;

                    item.addEventListener('mouseover', () => item.style.backgroundColor = 'var(--fondo)');
                    item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');

                    item.addEventListener('click', async () => {
                        box.style.display = 'none';
                        input.value = '';

                        // Buscar cita de este paciente con los FILTROS ACTUALES
                        let query = conexionSupabase
                            .from('citas')
                            .select('id, fecha_hora, tipo_cita, estado')
                            .eq('paciente_id', paciente.id)
                            .eq('sucursal_id', sucursalId)
                            .order('fecha_hora', { ascending: true }); // Buscar la más próxima/antigua que cumpla
                        
                        // Aplicar filtro de estado activo
                        if (window.filtroEstadoActual && window.filtroEstadoActual !== 'todos') {
                            query = query.eq('estado', window.filtroEstadoActual);
                        }

                        const { data: citasDelPaciente } = await query;

                        if (!citasDelPaciente || citasDelPaciente.length === 0) {
                            if (typeof alertaCustom === 'function') {
                                alertaCustom('Sin citas', \No se encontraron citas para \ con el estado actual (\).\, 'warning');
                            }
                            return;
                        }

                        // Aplicar filtro de tipos (checkboxes laterales)
                        let citaDestino = null;
                        for (const c of citasDelPaciente) {
                            const tipo = (c.tipo_cita || '').toLowerCase().trim();
                            if (!window.filtrosCitaInactivos || !window.filtrosCitaInactivos.has(tipo)) {
                                citaDestino = c; // La primera que cumpla
                                break;
                            }
                        }

                        if (!citaDestino) {
                            if (typeof alertaCustom === 'function') {
                                alertaCustom('Sin citas', \No se encontraron citas para \ con los tipos seleccionados.\, 'warning');
                            }
                            return;
                        }

                        // Navegar a la fecha de la cita y forzar vista día
                        const dateStr = citaDestino.fecha_hora.replace(' ', 'T'); 
                        fechaBase = new Date(dateStr);
                        
                        if (typeof window.cambiarVista === 'function') {
                            await window.cambiarVista('dia');
                        } else {
                            vistaActual = 'dia';
                            actualizarLabelFecha();
                            await cargarCitasEnRango();
                        }

                        // Desplazar a la cita y resaltar
                        setTimeout(() => {
                            const row = document.getElementById(\cita-row-\\);
                            if (row) {
                                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                row.classList.add('resaltado-cita');
                                setTimeout(() => row.classList.remove('resaltado-cita'), 4000);
                            } else {
                                if (typeof alertaCustom === 'function') {
                                    alertaCustom('Aviso', 'Calendario movido al día de la cita.', 'info');
                                }
                            }
                        }, 500); 
                    });
                    box.appendChild(item);
                });
                box.style.display = 'block';
            } catch (e) {
                console.error(e);
                box.innerHTML = '<div style="padding:10px;color:red;">Error de búsqueda</div>';
                box.style.display = 'block';
            }
        }, 400);
    });

    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !box.contains(e.target)) box.style.display = 'none';
    });
}\;

content = content.replace(oldFuncRegex, newFunc);
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced function');
