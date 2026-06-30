/**
 * SISTEMA: PET PROTECT
 * MÓDULO: Consulta Integral Veterinaria
 * ARQUITECTURA: Gestión de estado clínico y recetas en tiempo real
 */

import '../../../css/modulo_consulta_integral.css';
import { conexionSupabase, obtenerUsuarioActual } from '../../infraestructura/conexion.js';
import { imprimirRecetaEnNuevaVentana } from './receta_template.js';
import { confirmacionCustom } from '../../utilidades/ui_alertas.js';
import { setHayDatosSinGuardar } from '../principal_v2.js';

// ==========================================================================
// 1. ESTADO GLOBAL DEL MÓDULO (Singleton)
// ==========================================================================
const estadoClinico = {
    perfilMedico: null,
    pacienteActual: null, 
    idCitaVinculada: null,
    intervaloReloj: null,
    intervaloCronometro: null,
    segundosTranscurridos: 0
};

// ==========================================================================
// 2. LÍMITES FISIOLÓGICOS (Advertencia visual, sin bloqueo)
// ==========================================================================
const LIMITES_CLINICOS = {
    canino: { temp: { min: 37.5, max: 39.2, letalMin: 34.0, letalMax: 42.5 }, fc: { min: 60, max: 140, letalMin: 30, letalMax: 250 } },
    felino: { temp: { min: 38.0, max: 39.5, letalMin: 35.0, letalMax: 43.0 }, fc: { min: 140, max: 220, letalMin: 80, letalMax: 300 } }
};

// ==========================================================================
// 3. INICIALIZACIÓN
// ==========================================================================
export async function inicializarConsultaIntegral() {
    console.info("[CLÍNICA] Despertando módulo de Consulta Integral...");
    setHayDatosSinGuardar(true);
    
    await cargarIdentidadMedica();
    
    iniciarRelojActual();
    
    configurarBuscadorPredictivo();
    configurarValidacionConstantes();
    configurarTablaRecetaManual(); 
    configurarSplitViewExpediente(); 
    configurarGuardadoECOP();
    
    configurarPillsAnamnesis();
    configurarAutoGuardadoConsulta();
    
    if(typeof suscribirAAlertasMedicas === 'function') suscribirAAlertasMedicas();

    const iniciarDirecto = sessionStorage.getItem('iniciarConsultaDirecta');
    const idPaciente = sessionStorage.getItem('idPacienteActivo');

    if (iniciarDirecto === 'true' && idPaciente) {
        sessionStorage.removeItem('iniciarConsultaDirecta'); 
        await inyectarPacienteDirecto(idPaciente);
        iniciarCronometro(); 
    } else if (window._agendaDatos) {
        // Soporte para nuevo flujo desde Agenda
        const { pacienteId, citaId } = window._agendaDatos;
        estadoClinico.citaActivaId = citaId;
        window._agendaDatos = null; // Limpiar para que no re-dispare
        await inyectarPacienteDirecto(pacienteId);
        iniciarCronometro();
    }
}

// ==========================================================================
// 3.1 RELOJ Y CRONÓMETRO
// ==========================================================================
function iniciarRelojActual() {
    const txtFechaHora = document.getElementById('txt-fecha-hora-actual');
    if (!txtFechaHora) return;

    estadoClinico.intervaloReloj = setInterval(() => {
        const ahora = new Date();
        const opciones = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        txtFechaHora.textContent = ahora.toLocaleDateString('es-MX', opciones);
    }, 1000);
}

function iniciarCronometro() {
    const contenedor = document.getElementById('contenedor-cronometro');
    const txtCronometro = document.getElementById('txt-cronometro-consulta');
    if (!contenedor || !txtCronometro) return;

    contenedor.hidden = false;
    estadoClinico.segundosTranscurridos = 0;
    clearInterval(estadoClinico.intervaloCronometro);

    estadoClinico.intervaloCronometro = setInterval(() => {
        estadoClinico.segundosTranscurridos++;
        const minutos = Math.floor(estadoClinico.segundosTranscurridos / 60).toString().padStart(2, '0');
        const segundos = (estadoClinico.segundosTranscurridos % 60).toString().padStart(2, '0');
        txtCronometro.textContent = `${minutos}:${segundos}`;
    }, 1000);
}

// ==========================================================================
// 3.1b AUTO-GUARDADO (RECUPERACIÓN DE PROGRESO)
// ==========================================================================
function configurarAutoGuardadoConsulta() {
    const idCitaActiva = sessionStorage.getItem('idCitaActiva');

    const camposAGuardar = [
        'in-peso', 'in-temp', 'in-fc', 'in-fr', 
        'in-mucosas', 'in-tllc', 'in-dolor', 'in-anamnesis',
        'in-diagnostico', 'in-indicaciones-receta'
    ];
    
    const guardarBorrador = () => {
        setHayDatosSinGuardar(true);
        if (!idCitaActiva) return;
        const borrador = {};
        camposAGuardar.forEach(id => {
            const el = document.getElementById(id);
            if (el) borrador[id] = el.value;
        });
        localStorage.setItem('borrador_consulta_' + idCitaActiva, JSON.stringify(borrador));
    };

    // Escuchar cambios en los inputs vitales
    camposAGuardar.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', guardarBorrador);
            el.addEventListener('change', guardarBorrador);
        }
    });

    if (!idCitaActiva) return;

    // Restaurar si existe borrador guardado en localStorage
    const borradorGuardado = localStorage.getItem('borrador_consulta_' + idCitaActiva);
    if (borradorGuardado) {
        try {
            const datos = JSON.parse(borradorGuardado);
            let recuperado = false;
            camposAGuardar.forEach(id => {
                const el = document.getElementById(id);
                if (el && datos[id] !== undefined && datos[id] !== '') {
                    el.value = datos[id];
                    recuperado = true;
                }
            });
            if (recuperado) {
                console.info("[BORRADOR] Datos recuperados exitosamente para la cita " + idCitaActiva);
            }
        } catch (e) {
            console.warn("[BORRADOR] No se pudo parsear el borrador", e);
        }
    }
}

// ==========================================================================
// 3.2 BUSCADOR PREDICTIVO
// ==========================================================================
function configurarBuscadorPredictivo() {
    const inputBusqueda = document.getElementById('input-busqueda-paciente');
    const dropdown = document.getElementById('dropdownResultadosConsulta');

    if (!inputBusqueda || !dropdown) return;

    let timeoutBusqueda = null;

    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.trim();
        clearTimeout(timeoutBusqueda);

        if (termino.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        timeoutBusqueda = setTimeout(() => realizarBusqueda(termino), 400);
    });

    // Cerrar si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!inputBusqueda.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    inputBusqueda.addEventListener('focus', () => {
        if (inputBusqueda.value.trim().length >= 2) {
            dropdown.style.display = 'block';
        }
    });

    async function realizarBusqueda(termino) {
        if (!estadoClinico.perfilMedico?.organizacionId) return;

        dropdown.innerHTML = '<div class="resultado-pred-empty">Buscando...</div>';
        dropdown.style.display = 'block';

        try {
            // Buscar por nombre de mascota
            const pMascota = conexionSupabase
                .from('pacientes')
                .select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`)
                .eq('organizacion_id', estadoClinico.perfilMedico.organizacionId)
                .ilike('nombre', `%${termino}%`)
                .limit(5);

            // Buscar por nombre de tutor
            const pTutor = conexionSupabase
                .from('pacientes')
                .select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`)
                .eq('organizacion_id', estadoClinico.perfilMedico.organizacionId)
                .ilike('clientes.nombre_completo', `%${termino}%`)
                .limit(5);

            const [resMascota, resTutor] = await Promise.all([pMascota, pTutor]);

            if (resMascota.error) throw resMascota.error;
            if (resTutor.error) throw resTutor.error;

            // Unir y quitar duplicados (por ID)
            const mapaResultados = new Map();
            [...(resMascota.data || []), ...(resTutor.data || [])].forEach(paciente => {
                mapaResultados.set(paciente.id, paciente);
            });

            const resultadosFinales = Array.from(mapaResultados.values()).slice(0, 6);

            renderizarResultadosPredictivos(resultadosFinales);

        } catch (error) {
            console.error('[CONSULTA] Error en buscador:', error);
            dropdown.innerHTML = '<div class="resultado-pred-empty" style="color:red;">Error de búsqueda</div>';
        }
    }

    function renderizarResultadosPredictivos(resultados) {
        if (resultados.length === 0) {
            dropdown.innerHTML = '<div class="resultado-pred-empty">No se encontraron pacientes ni tutores.</div>';
            return;
        }

        dropdown.innerHTML = '';
        resultados.forEach(paciente => {
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

            item.addEventListener('click', async () => {
                dropdown.style.display = 'none';
                inputBusqueda.value = ''; // Limpiar tras seleccionar
                await inyectarPacienteDirecto(paciente.id);
                iniciarCronometro();
            });

            dropdown.appendChild(item);
        });
    }
}

// ==========================================================================
// 3.5 INYECCIÓN DIRECTA DESDE EXPEDIENTE
// ==========================================================================
async function inyectarPacienteDirecto(idMascota) {
    try {
        const uiNombre = document.getElementById('txt-nombre-paciente');
        if(uiNombre) uiNombre.textContent = "Cargando datos...";

        let paciente = null;

        if (window.pacientePreCargado && window.pacientePreCargado.id === idMascota) {
            paciente = window.pacientePreCargado;
            window.pacientePreCargado = null; // Limpiar memoria
            console.log("[MEMORIA] Paciente cargado desde sesión temporal");
        } else {
            const { data, error } = await conexionSupabase
                .from('pacientes')
                .select(`*, clientes ( nombre_completo, telefono )`)
                .eq('id', idMascota)
                .single();

            if (error) throw error;
            paciente = data;
        }

        estadoClinico.pacienteActual = paciente;

        document.getElementById('txt-nombre-paciente').textContent = paciente.nombre || 'Desconocido';
        document.getElementById('txt-especie-raza-paciente').textContent = `${paciente.especie} - ${paciente.raza || 'No especificada'}`;
        
        const inEspecieOculta = document.getElementById('in-especie-oculta');
        if(inEspecieOculta) inEspecieOculta.value = paciente.especie;
        
        document.getElementById('txt-id-oficial').textContent = paciente.chip_id || paciente.siniiga_tatuaje || 'Sin ID Oficial';
        document.getElementById('txt-edad-paciente').textContent = calcularEdadDirecta(paciente.fecha_nacimiento);
        document.getElementById('txt-dueno-paciente').textContent = paciente.clientes?.nombre_completo || 'Sin tutor';
        
        const uiTel = document.getElementById('txt-tel-paciente');
        if (uiTel) uiTel.textContent = paciente.clientes?.telefono || '--';
        
        const uiReprod = document.getElementById('txt-estado-reproductivo');
        if (uiReprod) uiReprod.textContent = paciente.esta_esterilizado ? 'Esterilizado' : 'Entero';
        
        const uiComportamiento = document.getElementById('txtComportamiento');
        if (uiComportamiento) uiComportamiento.textContent = paciente.temperamento || 'No evaluado';

        const imgAvatar = document.getElementById('img-avatar-paciente');
        if(imgAvatar) {
            if (paciente.foto_url) {
                imgAvatar.style.backgroundImage = `url('${paciente.foto_url}')`;
                imgAvatar.style.backgroundSize = 'cover';
                imgAvatar.style.backgroundPosition = 'center';
                imgAvatar.textContent = ''; 
            } else {
                imgAvatar.style.backgroundImage = 'none';
                imgAvatar.style.backgroundColor = 'var(--gris-fondo-sutil)';
                imgAvatar.textContent = paciente.nombre ? paciente.nombre.charAt(0).toUpperCase() : '?';
            }
        }

        const alertaAlergias = document.getElementById('alerta-alergias');
        const txtAlergias = document.getElementById('txt-alergias-paciente');
        
        if (paciente.alergias && paciente.alergias.toLowerCase() !== 'sin alergias conocidas') {
            if (txtAlergias) txtAlergias.textContent = paciente.alergias;
            if (alertaAlergias) alertaAlergias.hidden = false;
        } else {
            if (alertaAlergias) alertaAlergias.hidden = true;
        }

    } catch (err) {
        console.error("[CONSULTA INTEGRAL] Error al recuperar la información del paciente derivado:", err);
        alert("Ocurrió un error al trasladar los datos del paciente a la consulta.");
        const uiNombre = document.getElementById('txt-nombre-paciente');
        if(uiNombre) uiNombre.textContent = "Selecciona Paciente";
    }
}

function calcularEdadDirecta(fecha) {
    if (!fecha) return '--';
    const hoy = new Date();
    const nacimiento = new Date(fecha + 'T12:00:00Z');
    let edadAnios = hoy.getFullYear() - nacimiento.getFullYear();
    const meses = hoy.getMonth() - nacimiento.getMonth();
    
    if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) {
        edadAnios--;
    }
    return edadAnios > 0 ? `${edadAnios} años` : 'Meses';
}

// ==========================================================================
// 4. SEGURIDAD Y PERFIL DEL MÉDICO
// ==========================================================================
async function cargarIdentidadMedica() {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return window.location.assign('/LOGIN.html');

    try {
        const { data: perfil, error } = await conexionSupabase
            .from('perfiles')
            .select(`
                id, organizacion_id, sucursal_id, nombre_completo, cedula_profesional, firma_url, 
                organizaciones (nombre_legal, rfc_fiscal, logo_url),
                sucursales (nombre_sucursal, direccion, telefono_recepcion)
            `)
            .eq('id', usuario.id)
            .single();

        if (error) throw error;

        estadoClinico.perfilMedico = {
            id: perfil.id,
            organizacionId: perfil.organizacion_id,
            sucursalId: perfil.sucursal_id,
            nombre: perfil.nombre_completo || 'Dr. Sin Nombre',
            cedula: perfil.cedula_profesional,
            firma_url: perfil.firma_url,
            clinica: perfil.organizaciones || {},
            sucursal: perfil.sucursales || {}
        };
    } catch (error) {
        console.error("[SEGURIDAD] Fallo de integridad en identidad:", error);
        window.location.assign('/LOGIN.html');
    }
}

// ==========================================================================
// 5. VALIDACIÓN FISIOLÓGICA ACTIVA (SOLO ADVERTENCIA VISUAL)
// ==========================================================================
function configurarValidacionConstantes() {
    const inputsVitales = ['in-temp', 'in-fc'];
    
    inputsVitales.forEach(id => {
        const input = document.getElementById(id);
        if(!input) return;

        input.addEventListener('blur', (e) => {
            if(!estadoClinico.pacienteActual) return;
            
            const valor = parseFloat(e.target.value);
            const especie = estadoClinico.pacienteActual.especie.toLowerCase();
            const tipo = id === 'in-temp' ? 'temp' : 'fc';
            const limites = LIMITES_CLINICOS[especie]?.[tipo];

            if(!limites || isNaN(valor)) return;

            const errorSpan = document.getElementById(`error-${tipo}`);
            
            if (valor <= limites.letalMin || valor >= limites.letalMax || valor < limites.min || valor > limites.max) {
                e.target.classList.add('error-active');
                e.target.style.borderColor = '#F27405'; 
                errorSpan.textContent = "Fuera de rango normal.";
                errorSpan.style.color = '#F27405';
                errorSpan.style.display = 'block';
            } else {
                e.target.classList.remove('error-active');
                e.target.style.borderColor = '';
                errorSpan.style.display = 'none';
            }
        });
    });
}

// ==========================================================================
// 6. CONTROLADORES UI: PILLS ANAMNESIS
// ==========================================================================
function configurarPillsAnamnesis() {
    const gruposPills = document.querySelectorAll('.control-pills-naranja');
    
    gruposPills.forEach(grupo => {
        const botones = grupo.querySelectorAll('.pill-btn-naranja');
        
        botones.forEach(btn => {
            btn.addEventListener('click', (e) => {
                botones.forEach(b => {
                    b.classList.remove('activo');
                    b.setAttribute('aria-checked', 'false');
                });
                const clicked = e.currentTarget;
                clicked.classList.add('activo');
                clicked.setAttribute('aria-checked', 'true');
            });
        });
    });
}

// ==========================================================================
// 7. MOTOR FARMACOLÓGICO MANUAL (INLINE EN LA TABLA)
// ==========================================================================
function configurarTablaRecetaManual() {
    const btnAgregarFarmaco = document.getElementById('btn-abrir-modal-farmaco');
    const tbody = document.getElementById('tbody-receta-farmacos');
    
    if (!btnAgregarFarmaco || !tbody) return;
    
    btnAgregarFarmaco.textContent = "+ Añadir Fila a Receta";

    btnAgregarFarmaco.addEventListener('click', () => {
        const fila = document.createElement('tr');
        fila.className = 'fila-receta-manual';
        fila.innerHTML = `
            <td><input type="text" class="input-base-limpio farmaco-nombre" placeholder="Ej. Meloxicam 1.5mg"></td>
            <td><input type="text" class="input-base-limpio farmaco-dosis" placeholder="Ej. 1 ml / SC"></td>
            <td><input type="text" class="input-base-limpio farmaco-frecuencia" placeholder="Ej. Cada 24 hrs x 3 días"></td>
            <td>
                <select class="input-base-limpio farmaco-tipo">
                    <option value="3">G III (Libre)</option>
                    <option value="2">G II (Retenida)</option>
                    <option value="1">G I (Controlado)</option>
                </select>
            </td>
            <td>
                <button type="button" class="btn-cerrar-sutil" onclick="this.closest('tr').remove()" title="Eliminar fila" style="position:static;">×</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// ==========================================================================
// 8. SPLIT-VIEW: EXPEDIENTE CLÍNICO
// ==========================================================================
function configurarSplitViewExpediente() {
    const btnVerExpediente = document.getElementById("btn-ver-expediente");
    const contenedorPrincipal = document.querySelector(".rejilla-bento-consulta");
    const panelExpediente = document.getElementById("panel-expediente");
    const btnCerrarExpediente = document.getElementById("btn-cerrar-expediente");
    
    btnVerExpediente?.addEventListener('click', async () => {
        if (!estadoClinico.pacienteActual) {
            return alert("⚠️ SAFETY FIRST: Seleccione un paciente para ver su expediente.");
        }

        const isClosed = !contenedorPrincipal.classList.contains("expediente-abierto");
        
        if (isClosed) {
            contenedorPrincipal.classList.add("expediente-abierto");
            if(panelExpediente) panelExpediente.setAttribute("aria-hidden", "false");
            await cargarResumenExpediente(estadoClinico.pacienteActual.id);
        } else {
            contenedorPrincipal.classList.remove("expediente-abierto");
            if(panelExpediente) panelExpediente.setAttribute("aria-hidden", "true");
        }
    });

    btnCerrarExpediente?.addEventListener('click', () => {
        contenedorPrincipal.classList.remove("expediente-abierto");
        if(panelExpediente) panelExpediente.setAttribute("aria-hidden", "true");
    });

    const btnLimpiarPaciente = document.getElementById('btn-limpiar-paciente');
    if (btnLimpiarPaciente) {
        btnLimpiarPaciente.addEventListener('click', () => {
            estadoClinico.pacienteActual = null;
            
            // UI Reset
            document.getElementById('txt-nombre-paciente').textContent = 'Selecciona Paciente';
            document.getElementById('txt-especie-raza-paciente').textContent = '---';
            const inEspecieOculta = document.getElementById('in-especie-oculta');
            if(inEspecieOculta) inEspecieOculta.value = '';
            
            document.getElementById('txt-id-oficial').textContent = '---';
            document.getElementById('txt-edad-paciente').textContent = '---';
            document.getElementById('txt-dueno-paciente').textContent = '---';
            
            const uiTel = document.getElementById('txt-tel-paciente');
            if (uiTel) uiTel.textContent = '---';
            
            const uiReprod = document.getElementById('txt-estado-reproductivo');
            if (uiReprod) uiReprod.textContent = '---';
            
            const uiComportamiento = document.getElementById('txtComportamiento');
            if (uiComportamiento) uiComportamiento.textContent = '---';

            const imgAvatar = document.getElementById('img-avatar-paciente');
            if(imgAvatar) {
                imgAvatar.style.backgroundImage = 'none';
                imgAvatar.textContent = '?';
            }

            // Ocultar expediente si estaba abierto
            contenedorPrincipal.classList.remove("expediente-abierto");
            if(panelExpediente) panelExpediente.setAttribute("aria-hidden", "true");
            
            // Mostrar de nuevo el buscador
            const buscadorContainer = document.getElementById('contenedor-buscador-consulta');
            if (buscadorContainer) buscadorContainer.style.display = 'block';
            
            // Limpiar formulario y cronómetro
            document.getElementById('form-consulta-medica')?.reset();
            const tbody = document.getElementById('tbody-receta-farmacos');
            if(tbody) tbody.innerHTML = '';
            
            clearInterval(estadoClinico.intervaloCronometro);
            const contenedorCrono = document.getElementById('contenedor-cronometro');
            if(contenedorCrono) contenedorCrono.hidden = true;
        });
    }
}

async function cargarResumenExpediente(pacienteId) {
    const listaHistorial = document.getElementById("lista-historial-paciente");
    if (!listaHistorial) return;
    
    listaHistorial.innerHTML = "<p>Cargando datos inmutables...</p>";

    try {
        const { data: historial, error } = await conexionSupabase
            .from('consultas')
            .select('id, created_at, diagnostico_presuntivo, frecuencia_cardiaca, temperatura, motivo_consulta')
            .eq('paciente_id', pacienteId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (historial.length === 0) {
            listaHistorial.innerHTML = `<p class="texto-secundario text-center">No hay registros previos para este paciente.</p>`;
            return;
        }

        listaHistorial.innerHTML = historial.map(h => `
            <div class="item-sistema" style="margin-bottom: 12px; border-left: 4px solid var(--cielo);">
                <span class="texto-secundario" style="font-size: 0.8rem;">${new Date(h.created_at).toLocaleDateString()}</span>
                <strong style="color: var(--cobalto); display: block;">${h.diagnostico_presuntivo || 'Sin diagnóstico'}</strong>
                <p style="font-size: 0.85rem; margin: 4px 0;"><strong>Motivo:</strong> ${h.motivo_consulta}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error("Error al cargar expediente:", error);
        listaHistorial.innerHTML = "<p class='error-msg'>Error al recuperar historial.</p>";
    }
}

// ==========================================================================
// 9. TRANSACCIÓN ECOP (Guardado Relacional y Checkout)
// ==========================================================================
function configurarGuardadoECOP() {
    const formConsulta = document.getElementById('form-consulta-medica');

    formConsulta?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!estadoClinico.pacienteActual) {
            return alert("⚠️ Seleccione un paciente antes de generar la consulta.");
        }

        // --- Recolectar datos de la receta manual ---
        const listaFarmacosManuales = [];
        let errorNom064 = false;
        
        document.querySelectorAll('.fila-receta-manual').forEach(fila => {
            const nombre = fila.querySelector('.farmaco-nombre').value.trim();
            const dosis = fila.querySelector('.farmaco-dosis').value.trim();
            const frecuencia = fila.querySelector('.farmaco-frecuencia').value.trim();
            const tipo = parseInt(fila.querySelector('.farmaco-tipo').value);
            
            if (nombre) {
                if ((tipo === 1 || tipo === 2) && !estadoClinico.perfilMedico.cedula) {
                    errorNom064 = true;
                }
                
                // Estructura exacta para la tabla 'recetas_items' actualizada
                listaFarmacosManuales.push({
                    farmaco_id: null,
                    nombre_manual: nombre, 
                    dosis_mg_kg: 0, 
                    dosis_total_ml_tabletas: 0, 
                    via_admin: dosis,
                    frecuencia: frecuencia,
                    requiere_cuantificada: (tipo === 1 || tipo === 2)
                });
            }
        });

        if (errorNom064) {
            return alert("🛑 SEGURIDAD LEGAL: No cuenta con Cédula Profesional registrada para prescribir medicamentos controlados (Grupos I y II).");
        }

        // --- Parseo seguro de constantes vitales para cumplir con la BD ---
        const pesoParsed = parseFloat(document.getElementById('in-peso').value);
        const tempParsed = parseFloat(document.getElementById('in-temp').value);
        const fcParsed = parseInt(document.getElementById('in-fc').value);
        const frParsed = parseInt(document.getElementById('in-fr').value);
        const dolorParsed = parseInt(document.getElementById('in-dolor').value) || 0;

        if (isNaN(pesoParsed) || isNaN(tempParsed) || isNaN(fcParsed) || isNaN(frParsed)) {
            return alert("⚠️ Por favor, rellena todas las constantes vitales con valores numéricos válidos.");
        }

        if (pesoParsed <= 0 || tempParsed <= 0 || fcParsed <= 0 || frParsed <= 0) {
            return alert("⚠️ Todas las constantes vitales (Peso, Temp, FC, FR) deben ser mayores a 0.");
        }

        const btnFinalizar = document.getElementById('btn-finalizar-consulta');
        if (btnFinalizar) {
            btnFinalizar.disabled = true;
            btnFinalizar.innerHTML = '<span class="material-symbols-rounded spin">sync</span> Guardando...';
        }

        try {
            // 1. Insertar la Consulta Base
            const { data: consultaInsertada, error: errConsulta } = await conexionSupabase
                .from('consultas')
                .insert([{
                    organizacion_id: estadoClinico.perfilMedico.organizacionId,
                    sucursal_id: estadoClinico.perfilMedico.sucursalId,
                    paciente_id: estadoClinico.pacienteActual.id,
                    medico_id: estadoClinico.perfilMedico.id,
                    finalizada: true,
                    fecha_cierre: new Date().toISOString(),
                    peso_kg: pesoParsed,
                    temperatura: tempParsed,
                    frecuencia_cardiaca: fcParsed,
                    frecuencia_respiratoria: frParsed,
                    estado_mucosas: document.getElementById('in-mucosas').value,
                    tiempo_llenado_capilar: document.getElementById('in-tllc').value,
                    escala_dolor: dolorParsed,
                    motivo_consulta: document.getElementById('in-anamnesis').value,
                    anamnesis: document.getElementById('in-anamnesis').value,
                    diagnostico_presuntivo: document.getElementById('in-diagnostico').value,
                    plan_tratamiento: document.getElementById('in-indicaciones-receta')?.value || 'Sin indicaciones extras.'
                }])
                .select('id')
                .single();

            if (errConsulta) throw errConsulta;

            // 2. 🌟 Insertar TODOS los fármacos de forma estructurada en la BD
            if (listaFarmacosManuales.length > 0) {
                const itemsAInsertar = listaFarmacosManuales.map(f => ({
                    consulta_id: consultaInsertada.id,
                    ...f
                }));
                const { error: errReceta } = await conexionSupabase.from('recetas_items').insert(itemsAInsertar);
                if (errReceta) console.warn("Aviso: No se pudo guardar el detalle de la receta en DB", errReceta);
            }

            // 3. Preparar Checkout (Iniciamos el carrito limpio sin precios hardcodeados)
            const cargosParaCheckout = [];
            sessionStorage.setItem('cargosConsultaPendiente', JSON.stringify(cargosParaCheckout));
            sessionStorage.setItem('pacienteCheckout', JSON.stringify({
                nombre: estadoClinico.pacienteActual?.nombre || 'Desconocido',
                tutor: document.getElementById('txt-dueno-paciente')?.textContent || estadoClinico.pacienteActual?.clientes?.nombre_completo || 'Sin Tutor asignado',
                cliente_id: estadoClinico.pacienteActual?.cliente_id || null
            }));

            // 4. PREGUNTAR SI DESEA IMPRIMIR RECETA MÉDICA
            if (listaFarmacosManuales.length > 0 || document.getElementById('in-indicaciones-receta')?.value) {
                const imprimir = await confirmacionCustom("Consulta Guardada", "Consulta guardada exitosamente.\n\n¿Desea imprimir la receta médica ahora?", "check_circle", "#10B981");
                if (imprimir) {
                    // Construir el objeto de datos para la plantilla
                    const org = estadoClinico.perfilMedico.clinica;
                    const suc = estadoClinico.perfilMedico.sucursal;
                    const pac = estadoClinico.pacienteActual;
                    
                    // Función local segura para edad
                    const getEdadStr = (fn) => {
                        if(!fn) return 'Desconocida';
                        const hoy = new Date();
                        const nac = new Date(fn);
                        let edad = hoy.getFullYear() - nac.getFullYear();
                        const m = hoy.getMonth() - nac.getMonth();
                        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
                        return edad > 0 ? `${edad} años` : 'Menor de 1 año';
                    };

                    const dataParaReceta = {
                        logo_url: org.logo_url || "", 
                        nombre_clinica: suc.nombre_sucursal || org.nombre_legal || "Clínica Veterinaria",
                        direccion: suc.direccion || "", 
                        telefono: suc.telefono_recepcion || "",
                        correo: "", // No tenemos correo general en la BD actualmente
                        rfc: org.rfc_fiscal || "",
                        
                        folio_receta: `RX-${consultaInsertada.id.toString().slice(0,6).toUpperCase()}`,
                        fecha_emision: new Date().toLocaleDateString('es-MX'),
                        
                        nombre_veterinario: estadoClinico.perfilMedico?.nombre || 'Desconocido',
                        cedula_profesional: estadoClinico.perfilMedico?.cedula || 'En trámite',
                        especialidad: "Medicina Veterinaria General", // Por defecto
                        firma_url: estadoClinico.perfilMedico.firma_url || "", // Inyección de firma_url
                        
                        propietario_nombre: document.getElementById('txt-dueno-paciente')?.textContent || pac.clientes?.nombre_completo || 'Sin nombre',
                        propietario_telefono: pac.clientes?.telefono || "",
                        propietario_email: pac?.clientes?.email || "",
                        
                        paciente_nombre: pac?.nombre || 'Desconocido',
                        expediente_id: `EXP-${pac?.id?.toString().slice(0,6).toUpperCase() || 'XXX'}`,
                        especie: pac.especie,
                        raza: pac.raza,
                        sexo: pac.sexo,
                        edad: getEdadStr(pac.fecha_nacimiento),
                        peso: `${pesoParsed} kg`,
                        senas_particulares: "", // No traemos color en este query
                        
                        motivo_consulta: document.getElementById('in-anamnesis').value,
                        diagnostico: document.getElementById('in-diagnostico').value,
                        
                        medicamentos: listaFarmacosManuales.map(f => ({
                            nombre: f.nombre_manual,
                            concentracion: "-", // Este dato no se pide por separado actualmente
                            dosis: f.via_admin, // Reusamos via_admin para Dosis/Via
                            via: "-",
                            frecuencia: f.frecuencia,
                            duracion: "-",
                            cantidad: "-"
                        })),
                        
                        observaciones: document.getElementById('in-indicaciones-receta')?.value 
                                        ? document.getElementById('in-indicaciones-receta').value.split('\\n').filter(l => l.trim()) 
                                        : [],
                                        
                        fecha_revision: "",
                        hora_revision: "",
                        motivo_revision: ""
                    };
                    
                    imprimirRecetaEnNuevaVentana(dataParaReceta);
                }
            }

            // 4.5 Actualizar estado de la Cita y limpiar borrador
            const idCitaActiva = sessionStorage.getItem('idCitaActiva');
            if (idCitaActiva) {
                const { error: errUpd } = await conexionSupabase.from('citas').update({ estado: 'finalizada' }).eq('id', idCitaActiva);
                if (errUpd) console.warn("No se pudo actualizar el estado de la cita a finalizada", errUpd);
                
                localStorage.removeItem('borrador_consulta_' + idCitaActiva);
                sessionStorage.removeItem('idCitaActiva');
            }

            // 5. Limpieza final
            setHayDatosSinGuardar(false);
            clearInterval(estadoClinico.intervaloCronometro);
            const contenedorCrono = document.getElementById('contenedor-cronometro');
            if (contenedorCrono) contenedorCrono.hidden = true;
            
            document.getElementById('btn-limpiar-paciente')?.click();
            formConsulta.reset();
            const tbody = document.getElementById('tbody-receta-farmacos');
            if(tbody) tbody.innerHTML = ''; 
            estadoClinico.pacienteActual = null;

            // 6. Redirección Automática a Caja
            if (window.cargarModulo) {
                window.cargarModulo('CHECKOUT_FINAL_COBRO'); 
            } else {
                alert("✅ Consulta guardada correctamente. Proceda a la caja.");
            }

        } catch (error) {
            console.error("[TRANSACTION ERROR] Fallo al guardar ECOP:", error);
            alert(`Error al guardar en base de datos: ${error.message || 'Verifica tu conexión y los datos ingresados.'}`);
        } finally {
            if (btnFinalizar) {
                btnFinalizar.disabled = false;
                btnFinalizar.textContent = "Firmar y Finalizar Consulta";
            }
        }
    });
}