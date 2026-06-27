/**
 * SISTEMA: PET PROTECT
 * MÓDULO: Expediente Clínico (Historial y Estudios)
 * LÓGICA: Navegación local, recuperación de datos, Storage, Edición Dinámica con Auditoría y Transición a Consulta.
 */

import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { alertaCustom, confirmacionCustom } from '../../utilidades/ui_alertas.js';
import StorageService from '../../infraestructura/storage.js';
// 🌟 NUEVA IMPORTACIÓN: Conexión con el orquestador principal SPA
import { cargarModulo } from '../principal_v2.js';
// El modal de estudios ahora se importa de manera dinámica (Lazy Load) para prevenir bloqueos

import { inicializarModuloExpedienteDocumentos } from './modulo_expediente_documentos.js';

let idPacienteActual = null;
let idOrganizacionActual = null;
let idUsuarioActual = null;
let idClienteActual = null; 

// Resguardo de los datos originales para comparar qué editó el médico
let registroPacienteOriginal = {};
let registroTutorOriginal = {};

// ==========================================================================
// 🧠 INICIALIZACIÓN PRINCIPAL DEL MÓDULO
// ==========================================================================
export async function inicializarExpedienteHistorial() {
    console.log("[EXPEDIENTE] Inicializando vista dinámica del expediente...");

    // Buscamos el contenedor padre exclusivo de esta vista
    const contenedorModulo = document.getElementById('modulo-expediente-maestro');
    
    // Safety check: Si el contenedor no existe, abortamos para no romper la SPA
    if (!contenedorModulo) {
        console.error("[EXPEDIENTE] Error: Contenedor '#modulo-expediente-maestro' no encontrado en el DOM.");
        return;
    }

    // 1. Ejecutamos la navegación visual de las pestañas
    configurarNavegacionPestanas(contenedorModulo);

    // 2. Recuperar el ID guardado por la vista de Biblioteca
    idPacienteActual = sessionStorage.getItem('idPacienteActivo');
    
    // 3. ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
    const sesion = await obtenerSesionActiva();
    if (sesion) {
        idUsuarioActual = sesion.user.id;
        idOrganizacionActual = sesion.perfil.organizacion_id;
    }

    // 4. Si tenemos los identificadores, lanzamos todas las consultas en PARALELO
    if (idPacienteActual) {
        // ✅ OPTIMIZACIÓN: Promise.all ejecuta los 3 fetches simultáneamente.
        // El tiempo total pasa de ser la SUMA de cada query a ser el tiempo de la más lenta.
        const [pacienteRes, consultasRes, estudiosRes] = await Promise.all([
            conexionSupabase
                .from('pacientes')
                .select('*, clientes(id, nombre_completo, telefono, correo, direccion, contacto_emergencia)')
                .eq('id', idPacienteActual)
                .single(),

            conexionSupabase
                .from('consultas')
                .select('id, fecha_cierre, motivo_consulta, diagnostico_presuntivo, plan_tratamiento, peso_kg, created_at, anamnesis, perfiles(nombre_completo)')
                .eq('paciente_id', idPacienteActual)
                .order('created_at', { ascending: false }),

            conexionSupabase
                .from('estudios_clinicos')
                .select('*, archivos:estudios_archivos(nombre_archivo, tipo_archivo, url_archivo)')
                .eq('paciente_id', idPacienteActual)
                .order('created_at', { ascending: false })
        ]);

        const pacienteData  = pacienteRes.data;
        const consultasData = consultasRes.data;
        const estudiosData  = estudiosRes.data;

        if (!pacienteData) {
            console.error('[EXPEDIENTE] No se encontró el paciente con ID:', idPacienteActual);
            return;
        }

        // Distribuir los datos pre-cargados a cada módulo de renderizado
        await cargarDatosIdentidadPaciente(pacienteData, consultasData);
        configurarSubidaDeFoto();
        configurarMotorDeEdicion();
        configurarBotonNuevaConsulta();
        configurarModuloEstudios(estudiosData);

        if (idOrganizacionActual) {
            inicializarModuloExpedienteDocumentos(idPacienteActual, idOrganizacionActual);
        }

        // El timeline también usa los datos ya descargados (sin petición de red adicional)
        await renderizarTimelineHistorial(consultasData, estudiosData);
    } else {
        console.error("[EXPEDIENTE] Error de navegación: No se encontró 'idPacienteActivo' en sessionStorage.");
    }
}

// ==========================================================================
// 🚀 TRANSICIÓN A CONSULTA INTEGRAL (ECOP)
// ==========================================================================
function configurarBotonNuevaConsulta() {
    // Buscamos el botón por su ID (Asegúrate de que en tu HTML le hayas puesto este ID al botón "Añadir Consulta")
    const btnNuevaConsulta = document.getElementById('btn-nueva-consulta-expediente');
    
    if (btnNuevaConsulta) {
        btnNuevaConsulta.addEventListener('click', async (e) => {
              e.preventDefault();

              const sesion = await obtenerSesionActiva();
              if (sesion && sesion.perfil) {
                  const organizacionIdActual = sesion.perfil.organizacion_id;
                  const { data: citasActivas } = await conexionSupabase
                      .from('citas')
                      .select('id')
                      .eq('organizacion_id', organizacionIdActual)
                      .eq('estado', 'en_consulta')
                      .limit(1);

                  if (citasActivas && citasActivas.length > 0) {
                      if (typeof alertaCustom === 'function') {
                          alertaCustom('Consulta en curso', 'Ya tienes una consulta activa en este momento. Termínala antes de iniciar otra.', 'warning');
                      } else {
                          alert('Ya tienes una consulta activa en este momento. Termínala antes de iniciar otra.');
                      }
                      return;
                  }
              }

              sessionStorage.setItem('iniciarConsultaDirecta', 'true');
            
            // 2. Asegurarnos de que el ID del paciente sigue guardado y accesible para el siguiente módulo
            sessionStorage.setItem('idPacienteActivo', idPacienteActual);
            
            // 3. Disparar el cambio de vista en la SPA usando tu enrutador principal
            cargarModulo('MODULO_VETERINARIO_CONSULTA');
        });
    }
}

// ==========================================================================
// 🔬 MÓDULO DE ESTUDIOS E IMÁGENES — FLUJO COMPLETO
// ==========================================================================

let _estudioActivoId   = null;  // ID del estudio que está abierto en el panel detalle
let _archivesDrive     = [];    // Archivos seleccionados en el modal Drive

// ✅ OPTIMIZACIÓN: Recibe estudiosData pre-cargado del Promise.all para la carga inicial
function configurarModuloEstudios(estudiosData) {

    // ── Helpers de overlay ────────────────────────────────────────────────
    function mostrarOverlay()  {
        const o = document.getElementById('estudioOverlay');
        if (!o) return;
        o.style.display = 'block';
        requestAnimationFrame(() => o.style.opacity = '1');
    }
    function ocultarOverlay() {
        const o = document.getElementById('estudioOverlay');
        if (!o) return;
        o.style.opacity = '0';
        setTimeout(() => o.style.display = 'none', 300);
    }

    // ── INYECTAR MODALES GLOBALES EN PRINCIPAL ──────────────────────────────
    async function inyectarModalesOrden() {
        if (document.getElementById('panelNuevaOrden')) return true; // Ya se inyectó
        
        try {
            console.log("[EXPEDIENTE] Descargando modales globales de estudios...");
            const resp = await fetch('/MODAL_NUEVA_ORDEN.html');
            if (!resp.ok) throw new Error('No se pudo cargar el modal de nueva orden');
            
            const html = await resp.text();
            const contenedor = document.getElementById('contenedor-modal-dinamico') || document.body;
            contenedor.insertAdjacentHTML('beforeend', html);
            console.log("[EXPEDIENTE] Modales inyectados con éxito en", contenedor.id || 'body');
            return true;
        } catch (error) {
            console.error("[EXPEDIENTE] Error inyectando modales:", error);
            return false;
        }
    }

    // ── FUNCIONES DE ORDEN Y MODAL DRIVE ─────────────────────────────────────────────
    // ── Panel 1: Nueva Orden ─────────────────────────────────────────────
    async function abrirPanelOrden() {
        console.log("[EXPEDIENTE] Ejecutando abrirPanelOrden()...");
        
        // Garantizar que los modales existan
        const inyectado = await inyectarModalesOrden();
        if (!inyectado) {
            alertaCustom("Hubo un error cargando el panel de órdenes. Revisa la consola.");
            return;
        }

        const panel = document.getElementById('panelNuevaOrden');
        const overlay = document.getElementById('estudioOverlay');
        if (!panel || !overlay) {
            console.error("[EXPEDIENTE] No se encontraron 'panelNuevaOrden' o 'estudioOverlay' en el DOM.");
            return;
        }

        const hoy = new Date();
        const inputFecha = document.getElementById('orden_fecha');
        const inputHora = document.getElementById('orden_hora');
        if (inputFecha) inputFecha.value = hoy.toISOString().split('T')[0];
        if (inputHora) inputHora.value = hoy.toTimeString().substring(0, 5);

        document.getElementById('formNuevaOrden')?.reset();
        
        // Restaurar prioridad visual al estado normal
        const lblNormal = document.getElementById('lblNormal');
        const lblUrgente = document.getElementById('lblUrgente');
        if (lblNormal) lblNormal.style.cssText = 'flex:1; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid #032F40; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; color:#032F40; background:#f0f7fa;';
        if (lblUrgente) lblUrgente.style.cssText = 'flex:1; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; color:#64748b;';

        // Autocompletar médico solicitante
        const nombreMedicoUI = document.getElementById('ui-nombre-usuario')?.textContent;
        const inputSolicitante = document.getElementById('orden_solicitante');
        if (inputSolicitante && nombreMedicoUI && nombreMedicoUI !== 'Profesional de la Salud') {
            inputSolicitante.value = nombreMedicoUI;
        }

        overlay.classList.add('abierto');
        panel.classList.add('abierto');
        document.body.style.overflow = 'hidden';
    }

    function cerrarPanelOrden() {
        const panel = document.getElementById('panelNuevaOrden');
        const overlay = document.getElementById('estudioOverlay');
        if (!panel || !overlay) return;

        panel.classList.remove('abierto');
        overlay.classList.remove('abierto');
        document.body.style.overflow = '';
    }

    // ── Vista de Detalle del Estudio — Diseño 2-col (referencia Teams) ────
    async function abrirVistaDetalle(estudioId) {
        _estudioActivoId = estudioId;

        const contenedorTabla = document.getElementById('contenedor-tabla-estudios');
        const topBar = document.querySelector('.history-top-bar');
        if (contenedorTabla) contenedorTabla.style.display = 'none';
        if (topBar) topBar.style.display = 'none';

        // Crear/limpiar el contenedor de detalle
        let vistaDetalle = document.getElementById('vista-detalle-estudio');
        if (!vistaDetalle) {
            vistaDetalle = document.createElement('div');
            vistaDetalle.id = 'vista-detalle-estudio';
            contenedorTabla?.parentNode?.insertBefore(vistaDetalle, contenedorTabla);
        }

        // Loader
        vistaDetalle.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; padding:60px; color:var(--gris-texto-mutado);">
                <span class="material-symbols-rounded" style="font-size:24px; color:var(--cobalto); animation:spin 1.5s linear infinite;">sync</span>
                <span style="font-size:13px; font-weight:600; font-family:'Inter',sans-serif;">Cargando estudio...</span>
            </div>`;
        vistaDetalle.style.display = 'block';

        // Consultar datos
        const { data: estudio, error } = await conexionSupabase
            .from('estudios_clinicos')
            .select('*, archivos:estudios_archivos(*)')
            .eq('id', estudioId)
            .single();

        if (error || !estudio) {
            vistaDetalle.innerHTML = `<p style="color:#ef4444; padding:24px; font-family:'Inter',sans-serif; font-weight:600;">Error al cargar el estudio.</p>`;
            return;
        }

        const fechaFmt = estudio.fecha_estudio
            ? new Date(estudio.fecha_estudio + 'T12:00:00').toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
            : '—';

        // Hora del estudio
        let horaFmt = '';
        if (estudio.hora_estudio) {
            horaFmt = estudio.hora_estudio.slice(0, 5);
        } else if (estudio.created_at) {
            const d = new Date(estudio.created_at);
            horaFmt = d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
        }

        // Archivos existentes de BD → _archivesDrive
        _archivesDrive = (estudio.archivos || []).map(a => ({
            id: a.id,
            nombreMostrado: a.nombre_archivo,
            url: a.url_archivo,
            tipo_archivo: a.tipo_archivo || '',
            esNuevo: false,
            file: null
        }));

        vistaDetalle.innerHTML = `
        <!-- BACK LINK -->
        <a href="#" id="btn-volver-estudios" class="detalle-back-link">&#8592; Volver a Estudios e Imágenes</a>

        <!-- ENCABEZADO -->
        <div class="detalle-heading">
            <div class="detalle-heading-left">
                <span class="study-type-tag-inline">${estudio.modalidad}</span>
                <h1>${estudio.nombre_estudio}</h1>
            </div>
            <span class="detalle-fecha">${fechaFmt}</span>
        </div>

        <!-- GRID PRINCIPAL -->
        <div class="detalle-grid">

            <!-- COL IZQUIERDA -->
            <div class="detalle-col-left">
                <div class="detalle-card">
                    <div class="detalle-card-header">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#032F40" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <h2>Hallazgos Clínicos</h2>
                    </div>
                    <textarea class="detalle-textarea" id="detalle_hallazgos" placeholder="Describa los hallazgos observados en el estudio...">${estudio.hallazgos || ''}</textarea>
                </div>

                <div class="detalle-card">
                    <div class="detalle-card-header">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#032F40" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                        <h2>Interpretación / Diagnóstico</h2>
                    </div>
                    <textarea class="detalle-textarea" id="detalle_interpretacion" placeholder="Conclusión o diagnóstico basado en los hallazgos...">${estudio.interpretacion || ''}</textarea>
                </div>
            </div>

            <!-- COL DERECHA -->
            <div class="detalle-col-right">

                <div class="detalle-card">
                    <div class="detalle-card-header"><h2>Información del Estudio</h2></div>
                    <div class="detalle-info-field">
                        <div class="detalle-info-label">Laboratorio / Centro</div>
                        <div class="detalle-info-value">${estudio.medico_realiza || '—'}</div>
                    </div>
                    <div class="detalle-info-field">
                        <div class="detalle-info-label">Solicitado por</div>
                        <div class="detalle-info-value regular">${estudio.medico_solicitante || '—'}</div>
                    </div>
                    ${horaFmt ? `<div class="detalle-info-field">
                        <div class="detalle-info-label">Hora</div>
                        <div class="detalle-info-value">${horaFmt}</div>
                    </div>` : ''}
                    <div class="detalle-info-field">
                        <div class="detalle-info-label">Estado</div>
                        <span class="detalle-tag-pill">Activo</span>
                    </div>
                </div>

                <!-- Archivos adjuntos -->
                <div class="detalle-card">
                    <div class="detalle-card-header-flex">
                        <div class="detalle-card-header" style="margin-bottom:0;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#032F40" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            <h2 id="detalle-archivos-titulo">Archivos</h2>
                        </div>
                        <button type="button" class="detalle-btn-outline" id="btnAdjuntarDetalle">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            Adjuntar
                        </button>
                        <input type="file" id="detalleFileInput" multiple hidden>
                    </div>

                    <div class="detalle-archivos-lista" id="detalle-lista-archivos"></div>
                </div>

            </div>
        </div>

        <!-- BARRA GUARDAR -->
        <div class="detalle-save-bar">
            <button type="button" class="detalle-btn-secondary" id="btnDetalleVolver">Cancelar</button>
            <button type="button" class="detalle-btn-orange" id="btnGuardarDetalle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Guardar Estudio
            </button>
        </div>

        <!-- TOAST -->
        <div class="detalle-toast" id="detalleToast">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span id="detalleToastText">Estudio guardado correctamente.</span>
        </div>`;

        vistaDetalle.style.display = 'block';

        // Render inicial de archivos
        _renderizarArchivosDetalle();

        // ── Listeners ──────────────────────────────────────────────────────
        document.getElementById('btn-volver-estudios')?.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarVistaDetalle();
        });
        document.getElementById('btnDetalleVolver')?.addEventListener('click', cerrarVistaDetalle);

        // Adjuntar archivos abre el Modal Drive
        document.getElementById('btnAdjuntarDetalle')?.addEventListener('click', async () => {
            if (typeof abrirModalDrive === 'function') {
                await inyectarModalesOrden(); // Asegurar que el modal est inyectado
                abrirModalDrive(estudio);
            }
        });



        // Guardar
        document.getElementById('btnGuardarDetalle')?.addEventListener('click', () => _guardarDetalleEstudio(estudio));
    }

    // ── Render lista archivos (Teams style, con renombrado inline) ────────
    function _renderizarArchivosDetalle() {
        const lista = document.getElementById('detalle-lista-archivos');
        const titulo = document.getElementById('detalle-archivos-titulo');
        if (!lista) return;

        const count = _archivesDrive.length;
        if (titulo) titulo.textContent = count > 0 ? `Archivos (${count})` : 'Archivos';

        lista.innerHTML = '';

        if (count === 0) {
            lista.innerHTML = `<p class="detalle-sin-archivos">Sin archivos adjuntos.</p>`;
            return;
        }

        _archivesDrive.forEach((archivo, idx) => {
            const ext = archivo.nombreMostrado.split('.').pop().toLowerCase();
            const extClase = ext === 'dcm' ? 'dicom' : (ext === 'jpeg' ? 'jpg' : ext);
            const extLabel = ext === 'dcm' ? 'DICOM' : ext.toUpperCase();

            const fila = document.createElement('div');
            fila.className = 'detalle-file-row';
            fila.dataset.idx = idx;

            // Nombre (clickeable para abrir si tiene URL, editable con botón)
            const infoWrap = document.createElement('div');
            infoWrap.className = 'detalle-file-info';

            const badge = document.createElement('span');
            badge.className = `detalle-file-type ${extClase}`;
            badge.textContent = extLabel;

            const nombre = document.createElement('span');
            nombre.className = 'detalle-file-name';
            nombre.textContent = archivo.nombreMostrado;
            if (archivo.url) {
                nombre.style.cursor = 'pointer';
                nombre.addEventListener('click', () => window.open(archivo.url, '_blank'));
            }

            const btnEditar = document.createElement('button');
            btnEditar.type = 'button';
            btnEditar.className = 'detalle-btn-icon-small';
            btnEditar.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px; color:#94a3b8;">edit</span>';
            btnEditar.title = 'Renombrar archivo';
            btnEditar.style.cssText = 'background:transparent; border:none; cursor:pointer; padding:2px; display:inline-flex; align-items:center; margin-left:4px;';

            // Edición inline
            const iniciarEdicion = () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = archivo.nombreMostrado;
                input.className = 'detalle-rename-input';
                nombre.replaceWith(input);
                btnEditar.style.display = 'none';
                input.focus();
                input.select();

                const confirmar = async () => {
                    const nuevo = input.value.trim();
                    if (nuevo && nuevo !== archivo.nombreMostrado) {
                        archivo.nombreMostrado = nuevo;
                        
                        // Si ya está guardado en BD, actualizamos directamente
                        if (!archivo.esNuevo && archivo.id) {
                            try {
                                const { error } = await conexionSupabase.from('estudios_archivos')
                                    .update({ nombre_archivo: nuevo })
                                    .eq('id', archivo.id);
                                if (error) throw error;
                                if (typeof _mostrarToastDetalle === 'function') {
                                    _mostrarToastDetalle('Nombre actualizado.');
                                }
                            } catch (e) {
                                console.error('[RENOMBRAR ARCHIVO]', e);
                            }
                        }
                    }
                    _renderizarArchivosDetalle();
                };
                
                input.addEventListener('blur', confirmar);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') confirmar();
                    if (e.key === 'Escape') _renderizarArchivosDetalle();
                });
            };

            btnEditar.addEventListener('click', iniciarEdicion);
            nombre.addEventListener('dblclick', iniciarEdicion);

            // Badge nuevo (si recién añadido)
            if (archivo.esNuevo) {
                const pill = document.createElement('span');
                pill.className = 'detalle-nuevo-pill';
                pill.textContent = 'Nuevo';
                infoWrap.appendChild(badge);
                infoWrap.appendChild(nombre);
                infoWrap.appendChild(btnEditar);
                infoWrap.appendChild(pill);
            } else {
                infoWrap.appendChild(badge);
                infoWrap.appendChild(nombre);
                infoWrap.appendChild(btnEditar);
            }

            // Botón quitar
            const quitar = document.createElement('button');
            quitar.className = 'detalle-file-remove';
            quitar.type = 'button';
            quitar.innerHTML = '&times;';
            quitar.title = 'Quitar archivo';
            quitar.addEventListener('click', () => {
                _archivesDrive.splice(idx, 1);
                _renderizarArchivosDetalle();
            });

            fila.appendChild(infoWrap);
            fila.appendChild(quitar);
            lista.appendChild(fila);
        });
    }

    // ── Guardar hallazgos + archivos nuevos ───────────────────────────────
    async function _guardarDetalleEstudio(estudio) {
        const btn = document.getElementById('btnGuardarDetalle');
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

        try {
            // 1. Actualizar hallazgos e interpretación
            const hallazgos    = document.getElementById('detalle_hallazgos')?.value || '';
            const interpretacion = document.getElementById('detalle_interpretacion')?.value || '';

            const { error: errUpd } = await conexionSupabase
                .from('estudios_clinicos')
                .update({ hallazgos, interpretacion })
                .eq('id', estudio.id);
            if (errUpd) throw errUpd;

            // 2. Subir archivos nuevos a Storage + insertar en estudios_archivos
            const nuevos = _archivesDrive.filter(a => a.esNuevo && a.file);
            for (const arch of nuevos) {
                const ruta = `${idOrganizacionActual}/${estudio.paciente_id}/${estudio.id}/${Date.now()}_${arch.nombreMostrado}`;
                const { error: errSt } = await conexionSupabase.storage
                    .from('estudios-clinicos')
                    .upload(ruta, arch.file, { upsert: false });
                if (errSt) throw errSt;

                const { data: { publicUrl } } = conexionSupabase.storage
                    .from('estudios-clinicos')
                    .getPublicUrl(ruta);

                await conexionSupabase.from('estudios_archivos').insert({
                    estudio_id: estudio.id,
                    nombre_archivo: arch.nombreMostrado,
                    url_archivo: publicUrl,
                    tipo_archivo: arch.file.type || '',
                });
            }

            // Toast éxito
            _mostrarToastDetalle(`Estudio guardado correctamente (${_archivesDrive.length} archivo${_archivesDrive.length !== 1 ? 's' : ''} adjunto${_archivesDrive.length !== 1 ? 's' : ''}).`);

            // Refrescar archivos desde BD
            const { data: archivosActualizados } = await conexionSupabase
                .from('estudios_archivos').select('*').eq('estudio_id', estudio.id);
            _archivesDrive = (archivosActualizados || []).map(a => ({
                id: a.id, nombreMostrado: a.nombre_archivo, url: a.url_archivo,
                tipo_archivo: a.tipo_archivo || '', esNuevo: false, file: null
            }));
            _renderizarArchivosDetalle();

        } catch(err) {
            console.error('[GUARDAR ESTUDIO]', err);
            _mostrarToastDetalle('Error al guardar: ' + err.message, true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Guardar Estudio`;
            }
        }
    }

    let _archivosModalTemp = [];

    function _mostrarToastDetalle(texto, esError = false) {
        let toast = document.getElementById('detalleToast');
        if (!toast) return;
        document.getElementById('detalleToastText').textContent = texto;
        toast.style.background = esError ? '#dc2626' : 'var(--cobalto)';
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 3500);
    }

    function cerrarVistaDetalle() {
        _estudioActivoId = null;
        const vistaDetalle = document.getElementById('vista-detalle-estudio');
        if (vistaDetalle) vistaDetalle.style.display = 'none';
        const topBar = document.querySelector('.history-top-bar');
        const contenedorTabla = document.getElementById('contenedor-tabla-estudios');
        if (topBar) topBar.style.display = '';
        if (contenedorTabla) contenedorTabla.style.display = '';
    }

    let _estudioModalDrive = null;

    // ── Modal Drive: Subida de Archivos ────────────
    function abrirModalDrive(estudio) {
        _estudioModalDrive = estudio;
        _archivosModalTemp = [];
        const lista = document.getElementById('drive-lista-seleccionados');
        if (lista) lista.innerHTML = '';
        
        const m = document.getElementById('modalSubidaArchivos');
        if (!m) return;
        
        // Popular info del estudio
        if (estudio) {
            document.getElementById('drive-nombre-estudio').textContent = estudio.nombre_estudio || '';
            document.getElementById('drive-info-nombre').textContent = estudio.nombre_estudio || '';
            document.getElementById('drive-info-tipo').textContent = estudio.modalidad || '';
            
            const fechaFmt = estudio.fecha_estudio 
                ? new Date(estudio.fecha_estudio + 'T12:00:00').toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) 
                : '—';
            document.getElementById('drive-info-fecha').textContent = fechaFmt;
            document.getElementById('drive-info-lab').textContent = estudio.medico_realiza || '—';
            document.getElementById('drive-info-medico').textContent = estudio.medico_solicitante || '—';
        }

        m.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function cerrarModalDrive() {
        _estudioModalDrive = null;
        const m = document.getElementById('modalSubidaArchivos');
        if (!m) return;
        m.style.display = 'none';
        document.body.style.overflow = '';
    }

    function renderizarListaModalDrive() {
        const lista = document.getElementById('drive-lista-seleccionados');
        if (!lista) return;
        lista.innerHTML = '';
        _archivosModalTemp.forEach((archivo, idx) => {
            const ext = archivo.nombreMostrado.split('.').pop().toLowerCase();
            const extClase = ext === 'dcm' ? 'dicom' : (ext === 'jpeg' ? 'jpg' : ext);
            const extLabel = ext === 'dcm' ? 'DICOM' : ext.toUpperCase();

            const fila = document.createElement('div');
            fila.className = 'detalle-file-row';
            
            const infoWrap = document.createElement('div');
            infoWrap.className = 'detalle-file-info';

            const badge = document.createElement('span');
            badge.className = `detalle-file-type ${extClase}`;
            badge.textContent = extLabel;

            const nombre = document.createElement('input');
            nombre.type = 'text';
            nombre.value = archivo.nombreMostrado;
            nombre.className = 'detalle-rename-input';
            nombre.style.width = '250px';
            nombre.addEventListener('input', (e) => {
                _archivosModalTemp[idx].nombreMostrado = e.target.value;
            });

            const quitar = document.createElement('button');
            quitar.className = 'detalle-file-remove';
            quitar.type = 'button';
            quitar.innerHTML = '&times;';
            quitar.title = 'Quitar archivo';
            quitar.addEventListener('click', () => {
                _archivosModalTemp.splice(idx, 1);
                renderizarListaModalDrive();
            });

            infoWrap.appendChild(badge);
            infoWrap.appendChild(nombre);
            fila.appendChild(infoWrap);
            fila.appendChild(quitar);
            lista.appendChild(fila);
        });
    }

    async function aceptarArchivosDrive() {
        if (_archivosModalTemp.length === 0 || !_estudioModalDrive) {
            cerrarModalDrive();
            return;
        }

        const btn = document.getElementById('btnSubirArchivos');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-rounded spin">sync</span> Subiendo...`;

        try {
            const estudio = _estudioModalDrive;
            let subidosExito = 0;

            for (const arch of _archivosModalTemp) {
                if (!arch.file) continue;

                const ruta = `${idOrganizacionActual}/${estudio.paciente_id}/${estudio.id}/${Date.now()}_${arch.nombreMostrado}`;
                const { error: errSt } = await conexionSupabase.storage
                    .from('estudios-clinicos')
                    .upload(ruta, arch.file, { upsert: false });
                
                if (errSt) throw errSt;

                const { data: { publicUrl } } = conexionSupabase.storage
                    .from('estudios-clinicos')
                    .getPublicUrl(ruta);

                const { data: insertData, error: errIns } = await conexionSupabase.from('estudios_archivos').insert({
                    estudio_id: estudio.id,
                    nombre_archivo: arch.nombreMostrado,
                    url_archivo: publicUrl,
                    tipo_archivo: arch.file.type || '',
                }).select('*').single();

                if (errIns) throw errIns;

                // Agregar a la lista del detalle como archivo ya guardado (esNuevo: false)
                _archivesDrive.push({
                    id: insertData.id,
                    nombreMostrado: insertData.nombre_archivo,
                    url: insertData.url_archivo,
                    tipo_archivo: insertData.tipo_archivo || '',
                    esNuevo: false,
                    file: null
                });
                subidosExito++;
            }

            _mostrarToastDetalle(`Se subieron ${subidosExito} archivo(s) exitosamente.`);
            
            // Actualizar vista del detalle
            if (typeof _renderizarArchivosDetalle === 'function') {
                _renderizarArchivosDetalle();
            }
            
            _archivosModalTemp = [];
            cerrarModalDrive();

        } catch (err) {
            console.error('[SUBIR MODAL DRIVE]', err);
            alertaCustom('Error al subir archivos: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    // ── Event Delegation: todos los clicks del módulo ────────────────────
    document.addEventListener('click', async (e) => {
        // Abrir panel nueva orden
        if (e.target.closest('#btn-registrar-nuevo-estudio')) { e.preventDefault(); abrirPanelOrden(); return; }
        // Cerrar panel orden
        if (e.target.closest('#btnCerrarOrden') || e.target.closest('#btnCancelarOrden')) { cerrarPanelOrden(); return; }
        // Crear orden
        if (e.target.closest('#btnCrearOrden')) { await crearOrdenEstudio(); return; }
        // Volver a la lista de estudios
        if (e.target.closest('#btn-volver-estudios')) { cerrarVistaDetalle(); return; }
        // Guardar detalle (hallazgos + interpretación)
        if (e.target.closest('#btnGuardarDetalle')) { await guardarDetalleEstudio(); return; }
        // Abrir modal Drive
        if (e.target.closest('#btnAbrirSubidaArchivos')) { abrirModalDrive(); return; }
        // Explorar archivos en Drive
        if (e.target.closest('#btnExplorarArchivos')) { document.getElementById('inputArchivosDrive')?.click(); return; }
        // Cerrar modal Drive
        if (e.target.closest('#btnCerrarDrive') || e.target.closest('#btnCancelarDrive')) { cerrarModalDrive(); return; }
        // Subir archivos Drive
        if (e.target.closest('#btnSubirArchivos')) { await aceptarArchivosDrive(); return; }
        // Click en fila de tabla
        const fila = e.target.closest('[data-estudio-id]');
        if (fila) { await abrirVistaDetalle(fila.getAttribute('data-estudio-id')); return; }
        // Cerrar overlay al hacer clic fuera
        if (e.target.id === 'estudioOverlay') { cerrarPanelOrden(); return; }
    });

    // Drag & Drop en zona Drive
    document.addEventListener('dragover', (e) => {
        const dz = e.target.closest('#dropzoneArchivos');
        if (dz) { e.preventDefault(); dz.style.borderColor = '#F27405'; dz.style.background = '#fff7ed'; }
    });
    document.addEventListener('dragleave', (e) => {
        const dz = e.target.closest('#dropzoneArchivos');
        if (dz) { dz.style.borderColor = '#cbd5e1'; dz.style.background = '#f8fafc'; }
    });


    // ── Delegación Drag & Drop y Select para Modal Drive ──────────────────
    document.addEventListener('change', (e) => {
        if (e.target.id === 'inputArchivosDrive') {
            Array.from(e.target.files).forEach(f => {
                _archivosModalTemp.push({ id: null, nombreMostrado: f.name, url: null, tipo_archivo: f.type || '', esNuevo: true, file: f });
            });
            e.target.value = '';
            renderizarListaModalDrive();
        }
    });
    document.addEventListener('dragover', (e) => {
        const dz = e.target.closest('#dropzoneArchivos');
        if (dz) { e.preventDefault(); dz.style.borderColor = '#F27405'; dz.style.background = '#fff7ed'; }
    });
    document.addEventListener('dragleave', (e) => {
        const dz = e.target.closest('#dropzoneArchivos');
        if (dz) { dz.style.borderColor = '#cbd5e1'; dz.style.background = '#f8fafc'; }
    });
    document.addEventListener('drop', (e) => {
        const dz = e.target.closest('#dropzoneArchivos');
        if (dz) {
            e.preventDefault();
            dz.style.borderColor = '#cbd5e1'; dz.style.background = '#f8fafc';
            Array.from(e.dataTransfer.files).forEach(f => {
                _archivosModalTemp.push({ id: null, nombreMostrado: f.name, url: null, tipo_archivo: f.type || '', esNuevo: true, file: f });
            });
            renderizarListaModalDrive();
        }
    });

    // Radio prioridad — feedback visual
    document.addEventListener('change', (e) => {
        if (e.target.name !== 'orden_prioridad') return;
        const lblN = document.getElementById('lblNormal');
        const lblU = document.getElementById('lblUrgente');
        if (!lblN || !lblU) return;
        if (e.target.value === 'Normal') {
            lblN.style.cssText = 'flex:1; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid #032F40; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; color:#032F40; background:#f0f7fa;';
            lblU.style.cssText = 'flex:1; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; color:#64748b;';
        } else {
            lblU.style.cssText = 'flex:1; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid #ef4444; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; color:#ef4444; background:#fef2f2;';
            lblN.style.cssText = 'flex:1; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; color:#64748b;';
        }
    });

    // Carga inicial — usa datos pre-descargados del Promise.all (sin petición de red)
    cargarEstudiosPaciente(estudiosData);
}



// ── Crear orden de estudio (solo datos básicos) ───────────────────────────
async function crearOrdenEstudio() {
    const nombre     = document.getElementById('orden_nombre')?.value?.trim();
    const modalidad  = document.getElementById('orden_modalidad')?.value;
    const fecha      = document.getElementById('orden_fecha')?.value;
    const hora       = document.getElementById('orden_hora')?.value || '00:00';
    const prioridad  = document.querySelector('input[name="orden_prioridad"]:checked')?.value || 'Normal';
    const solicitante= document.getElementById('orden_solicitante')?.value?.trim();
    const laboratorio= document.getElementById('orden_laboratorio')?.value?.trim();

    if (!nombre || !modalidad || !fecha) {
        alertaCustom('Completa los campos obligatorios: Nombre, Modalidad y Fecha.');
        return;
    }
    if (!idPacienteActual || !idOrganizacionActual) {
        alertaCustom('Error de sesión. Recarga el expediente.');
        return;
    }

    const btn = document.getElementById('btnCrearOrden');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    try {
        const { error } = await conexionSupabase.from('estudios_clinicos').insert({
            paciente_id:        idPacienteActual,
            organizacion_id:    idOrganizacionActual,
            nombre_estudio:     nombre,
            modalidad,
            fecha_estudio:      fecha,
            hora_estudio:       hora,
            prioridad,
            medico_solicitante: solicitante || null,
            medico_realiza:     laboratorio || null,
        });

        if (error) throw error;

        cerrarPanelOrden();
        cargarEstudiosPaciente();

    } catch(err) {
        console.error('[ESTUDIOS] Error al crear orden:', err);
        alertaCustom('Error al guardar la orden: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">task_alt</span> Crear Orden'; }
    }
}

// ── Guardar hallazgos + interpretación ───────────────────────────────────
async function guardarDetalleEstudio() {
    if (!_estudioActivoId) return;
    const hallazgos    = document.getElementById('detalle_hallazgos')?.value?.trim();
    const interpretacion = document.getElementById('detalle_interpretacion')?.value?.trim();

    const btn = document.getElementById('btnGuardarDetalle');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    try {
        const { error } = await conexionSupabase.from('estudios_clinicos').update({
            hallazgos:    hallazgos || null,
            interpretacion: interpretacion || null,
            updated_at:   new Date().toISOString(),
        }).eq('id', _estudioActivoId);

        if (error) throw error;
        cargarEstudiosPaciente();

    } catch(err) {
        alertaCustom('Error al guardar: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">save</span> Guardar Cambios'; }
    }
}

// ── Subir archivos desde el modal Drive ─────────────────────────────────
async function subirArchivosDrive() {
    if (!_estudioActivoId || !_archivesDrive.length) {
        alertaCustom('Selecciona al menos un archivo primero.');
        return;
    }

    const btn = document.getElementById('btnSubirArchivos');
    if (btn) { btn.disabled = true; btn.textContent = 'Subiendo...'; }

    try {
        for (const archivo of _archivesDrive) {
            // Conservar el nombre original tal cual (como Teams/Drive)
            const nombreLimpio = archivo.name;
            const ruta = `${idOrganizacionActual}/pacientes/${idPacienteActual}/estudios_clinicos/${_estudioActivoId}/${nombreLimpio}`;
            const { data: up, error: upErr } = await conexionSupabase.storage
                .from('estudios-clinicos')
                .upload(ruta, archivo, { upsert: true });

            if (!upErr && up) {
                const { data: urlData } = conexionSupabase.storage.from('estudios-clinicos').getPublicUrl(up.path);
                await conexionSupabase.from('estudios_archivos').insert({
                    estudio_id:     _estudioActivoId,
                    nombre_archivo: archivo.name,
                    tipo_archivo:   archivo.type,
                    tamano_archivo: archivo.size,
                    url_archivo:    urlData.publicUrl,
                });
            }
        }

        // Cerrar Drive y refrescar lista de archivos en el detalle
        document.getElementById('modalSubidaArchivos').style.display = 'none';
        _archivesDrive = [];

        // Recargar archivos del panel detalle
        const { data: estudio } = await conexionSupabase
            .from('estudios_clinicos')
            .select('*, archivos:estudios_archivos(*)')
            .eq('id', _estudioActivoId)
            .single();

        if (estudio) {
            const lista = document.getElementById('detalle-lista-archivos');
            if (lista) {
                // Usar la misma función de renderizado
                const archivos = estudio.archivos || [];
                if (!archivos.length) { lista.innerHTML = '<p style="font-size:12px; color:#94a3b8; padding:8px 0;">Sin archivos adjuntos.</p>'; }
                else {
                    lista.innerHTML = '';
                    archivos.forEach(a => {
                        const ext = a.nombre_archivo.split('.').pop().toUpperCase();
                        const iconMap = { PDF:'picture_as_pdf', JPG:'image', JPEG:'image', PNG:'image', DCM:'biotech', MP4:'videocam', AVI:'videocam', MOV:'videocam', DOCX:'description', DOC:'description' };
                        const icon = iconMap[ext] || 'attach_file';
                        const row = document.createElement('a');
                        row.href = a.url_archivo; row.target = '_blank';
                        row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid #e2e8f0; border-radius:8px; text-decoration:none; color:#334155; transition:background 0.2s;';
                        row.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px; color:#032F40;">' + icon + '</span>' +
                                        '<span style="flex:1; font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + a.nombre_archivo + '</span>' +
                                        '<span style="font-size:10px; color:#94a3b8;">' + ext + '</span>' +
                                        '<span class="material-symbols-rounded" style="font-size:16px; color:#94a3b8;">open_in_new</span>';
                        lista.appendChild(row);
                    });
                }
            }
        }

    } catch(err) {
        alertaCustom('Error al subir archivos: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">cloud_upload</span> Subir y Guardar'; }
    }
}

// ── Cargar y renderizar GRID DE TARJETAS de estudios ─────────────────────
// ✅ OPTIMIZACIÓN: Parámetro opcional 'datosPreCargados'.
// • Si se pasa (carga inicial): usa los datos directamente — 0 peticiones de red.
// • Si no se pasa (post-escritura): ejecuta su propia query (refresh tras crear/editar).
async function cargarEstudiosPaciente(datosPreCargados) {
    const contenedor = document.getElementById('contenedor-tabla-estudios');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; padding:40px; color:var(--gris-texto-mutado);">
            <span class="material-symbols-rounded" style="font-size:24px; color:var(--cobalto); animation:spin 1.5s linear infinite;">sync</span>
            <span style="font-size:13px; font-weight:600;">Cargando estudios...</span>
        </div>`;

    try {
        let estudios;

        if (datosPreCargados !== undefined) {
            // Carga inicial: datos ya descargados por el Promise.all — 0 peticiones de red
            estudios = datosPreCargados;
        } else {
            // Refresh post-escritura (crear/editar estudio): consulta fresca a Supabase
            const { data, error } = await conexionSupabase
                .from('estudios_clinicos')
                .select('*, archivos:estudios_archivos( nombre_archivo, tipo_archivo, url_archivo )')
                .eq('paciente_id', idPacienteActual)
                .order('fecha_estudio', { ascending: false });

            if (error) throw error;
            estudios = data;
        }

        if (!estudios || estudios.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:var(--gris-texto-mutado);">
                    <span class="material-symbols-rounded" style="font-size:52px; color:#cbd5e1; display:block; margin-bottom:12px;">radiology</span>
                    <p style="font-size:14px; font-weight:700; margin:0 0 6px; font-family:'Inter',sans-serif; color:var(--cobalto);">Sin estudios registrados</p>
                    <p style="font-size:12px; color:var(--gris-texto-mutado); margin:0;">Registra la primera orden de estudio para este paciente usando el botón superior.</p>
                </div>`;
            return;
        }

        // Tipo de preview (clase CSS) y texto placeholder según modalidad
        const modalidadPreview = {
            'Radiografía':          { clase: 'x-ray', texto: '[Vista Previa Placa]' },
            'Ultrasonido':          { clase: 'x-ray', texto: '[Vista Previa Eco]' },
            'Resonancia Magnética': { clase: 'x-ray', texto: '[Resonancia MRI]' },
            'Tomografía (TAC)':     { clase: 'x-ray', texto: '[Visor 3D]' },
            'Endoscopia':           { clase: 'x-ray', texto: '[Imagen Endoscópica]' },
            'Laboratorio':          { clase: 'lab',   texto: '[Documentos Analíticos]' },
            'Citología':            { clase: 'lab',   texto: '[Microscopía]' },
            'Histopatología':       { clase: 'lab',   texto: '[Biopsia]' },
            'Electrocardiograma':   { clase: 'lab',   texto: '[Trazado ECG]' },
            'Ecocardiograma':       { clase: 'lab',   texto: '[Ecografía Cardíaca]' },
            'Otro':                 { clase: 'lab',   texto: '[Documento]' },
        };

        const tarjetas = estudios.map(e => {
            const preview = modalidadPreview[e.modalidad] || modalidadPreview['Otro'];

            const fechaStr = e.fecha_estudio
                ? new Date(e.fecha_estudio + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';

            const medicoLabel = e.medico_solicitante
                ? `Solicitado por: <strong>${e.medico_solicitante}</strong>`
                : e.medico_realiza
                    ? `Realizado por: <strong>${e.medico_realiza}</strong>`
                    : '&nbsp;';

            const observaciones = e.hallazgos || e.interpretacion || e.motivo_solicitud || 'Sin observaciones registradas.';

            // Archivos adjuntos con clases .file-badge y .file-type
            let archivosHtml = '';
            if (e.archivos && e.archivos.length > 0) {
                archivosHtml = e.archivos.map(a => {
                    const ext = (a.nombre_archivo.split('.').pop() || '').toLowerCase();
                    // Clase CSS según extensión (pdf, jpg, png, dicom, docx)
                    const extClase = ext === 'dcm' ? 'dicom' : (ext === 'jpeg' ? 'jpg' : ext);
                    const extLabel = ext === 'dcm' ? 'DICOM' : ext.toUpperCase();
                    return `<a href="${a.url_archivo}" target="_blank" rel="noopener noreferrer" class="file-badge">
                                <span class="file-type ${extClase}">${extLabel}</span>
                                ${a.nombre_archivo}
                            </a>`;
                }).join('');
            } else {
                archivosHtml = `<span style="font-size:11px; color:#cbd5e1; font-style:italic; font-family:'Inter',sans-serif;">Sin archivos adjuntos</span>`;
            }

            return `
            <div class="study-card" data-estudio-id="${e.id}">
                <div class="study-preview ${preview.clase}">
                    <span class="study-type-tag">${e.modalidad}</span>
                    ${preview.texto}
                </div>
                <div class="study-content">
                    <div class="study-header-flex">
                        <h3 class="study-title">${e.nombre_estudio}</h3>
                        <span class="study-date">${fechaStr}</span>
                    </div>
                    <p class="study-meta">${medicoLabel}</p>
                    <div class="study-obs">${observaciones}</div>
                    <div class="attachments-area">${archivosHtml}</div>
                </div>
            </div>`;
        }).join('');

        contenedor.innerHTML = `<div class="studies-grid">${tarjetas}</div>`;

        // Conectar click a cada tarjeta → abrir panel de detalle
        contenedor.querySelectorAll('.study-card[data-estudio-id]').forEach(card => {
            card.addEventListener('click', async () => {
                const id = card.getAttribute('data-estudio-id');
                if (typeof abrirVistaDetalle === 'function') {
                    await abrirVistaDetalle(id);
                }
            });
        });

    } catch(err) {
        console.error('[ESTUDIOS] Error al cargar grid:', err);
        contenedor.innerHTML = `
            <div style="text-align:center; padding:30px; background:#fef2f2; border-radius:6px; border:1px solid #fecaca;">
                <span class="material-symbols-rounded" style="font-size:32px; color:#ef4444; display:block; margin-bottom:8px;">error</span>
                <p style="font-size:13px; color:#ef4444; font-weight:700; margin:0; font-family:'Inter',sans-serif;">Error al cargar los estudios.</p>
                <p style="font-size:12px; color:#b91c1c; margin:6px 0 0; font-family:'Inter',sans-serif;">${err.message}</p>
            </div>`;
    }
}

// ==========================================================================
// 📡 RECUPERACIÓN DE DATOS (SUPABASE)
// ==========================================================================
// ✅ OPTIMIZACIÓN: Recibe datos pre-cargados del Promise.all, sin petición de red
async function cargarDatosIdentidadPaciente(paciente, consultasData) {
    try {
        if (!paciente) throw new Error('No se recibieron datos del paciente.');

        // Guardamos las copias originales para la auditoría y la edición
        registroPacienteOriginal = { ...paciente };
        if (paciente.clientes) {
            idClienteActual = paciente.clientes.id;
            registroTutorOriginal = { ...paciente.clientes };
        }

        // Función Helper para rellenar campos faltantes con texto predeterminado
        const val = (campo) => (campo && campo !== null && campo.toString().trim() !== '') ? campo : 'Por asignar';
        
        // Función Helper para dar formato a la fecha (añadiendo hora neutra para evitar desfase de zona horaria)
        const formatFecha = (fechaString) => {
            if (!fechaString) return 'No registrada';
            const fecha = new Date(fechaString + 'T12:00:00Z');
            return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // --- INYECCIÓN EN UI: Identidad del Paciente ---
        document.getElementById('ui-nombre-paciente').textContent = val(paciente.nombre);
        document.getElementById('ui-especie-paciente').textContent = val(paciente.especie);
        document.getElementById('ui-raza-paciente').textContent = val(paciente.raza);
        document.getElementById('ui-sexo-paciente').textContent = val(paciente.sexo);
        document.getElementById('ui-color-paciente').textContent = val(paciente.color);
        document.getElementById('ui-nacimiento-paciente').textContent = formatFecha(paciente.fecha_nacimiento);
        document.getElementById('ui-edad-paciente').textContent = calcularEdad(paciente.fecha_nacimiento);
        document.getElementById('ui-microchip-paciente').textContent = val(paciente.chip_id);
        
        document.getElementById('ui-alias-paciente').textContent = val(paciente.alias);
        document.getElementById('ui-reproductivo-paciente').textContent = paciente.esta_esterilizado ? 'Esterilizado' : 'Entero (Por confirmar)';
        document.getElementById('ui-senas-paciente').textContent = val(paciente.senas_particulares);
        document.getElementById('ui-siniiga-paciente').textContent = val(paciente.siniiga_tatuaje);
        document.getElementById('ui-pedigri-paciente').textContent = val(paciente.pedigri_fcm);
        
        // --- INYECCIÓN EN UI: Datos del Tutor ---
        const tutor = paciente.clientes;
        if (tutor) {
            document.getElementById('ui-tutor-nombre').textContent = val(tutor.nombre_completo);
            document.getElementById('ui-tutor-telefono').textContent = val(tutor.telefono);
            document.getElementById('ui-tutor-correo').textContent = val(tutor.correo);
            document.getElementById('ui-tutor-direccion').textContent = val(tutor.direccion);
            document.getElementById('ui-tutor-emergencia').textContent = val(tutor.contacto_emergencia);
        } else {
            document.getElementById('ui-tutor-nombre').textContent = 'Sin tutor vinculado';
        }

        // --- INYECCIÓN EN UI: Alertas Médicas ---
        document.getElementById('ui-alergias-paciente').textContent = val(paciente.alergias);
        document.getElementById('ui-enfermedades-paciente').textContent = val(paciente.enfermedades_cronicas);
        document.getElementById('ui-medicacion-paciente').textContent = val(paciente.medicacion_actual);
        document.getElementById('ui-cirugias-paciente').textContent = val(paciente.cirugias_previas);
        document.getElementById('ui-discapacidades-paciente').textContent = val(paciente.discapacidades);
        
        // --- INYECCIÓN EN UI: Manejo Integral ---
        document.getElementById('ui-temperamento-paciente').textContent = val(paciente.temperamento);
        document.getElementById('ui-ansiedad-paciente').textContent = val(paciente.ansiedad_miedo);
        document.getElementById('ui-agresividad-paciente').textContent = val(paciente.agresividad);
        document.getElementById('ui-manejo-paciente').textContent = val(paciente.notas_comportamiento); 
        document.getElementById('ui-dieta-paciente').textContent = val(paciente.dieta_marca);
        document.getElementById('ui-frecuencia-dieta').textContent = val(paciente.frecuencia_dieta);
        document.getElementById('ui-esterilizacion-paciente').textContent = val(paciente.esta_esterilizado ? 'Sí' : 'No');
        document.getElementById('ui-cruzas-paciente').textContent = val(paciente.cruzas_partos);

        // --- INYECCIÓN EN UI: Fotografía ---
        const imgUI = document.getElementById('ui-foto-paciente');
        if (paciente.foto_url) {
            imgUI.src = paciente.foto_url;
        } else {
            imgUI.src = 'https://placehold.co/400x400/f1f5f9/94a3b8?text=Sin+Foto';
        }

        // --- RENDERIZAR PESTAÑA RESUMEN --- (pasa consultas ya descargadas)
        await renderizarResumen(paciente, consultasData);

    } catch (error) {
        console.error("[EXPEDIENTE] Error al cargar la información del paciente:", error.message);
    }
}

// Función auxiliar para calcular la edad precisa
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return 'Desconocida';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento + 'T12:00:00Z');
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
        edad--;
    }
    
    if (edad <= 0) {
        let meses = hoy.getMonth() - nac.getMonth();
        if (meses < 0) meses += 12;
        return meses === 0 ? 'Menos de 1 mes' : `${meses} meses`;
    }
    return `${edad} años`;
}

// ==========================================================================
// 📝 MOTOR DE EDICIÓN DINÁMICA CON AUDITORÍA
// ==========================================================================

const configuracionEdicion = {
    identidad: {
        titulo: "Editar Identidad del Paciente",
        tabla: "pacientes",
        campos: [
            { id: "nombre", label: "Nombre", tipo: "text" },
            { id: "alias", label: "Alias", tipo: "text" },
            { id: "especie", label: "Especie", tipo: "text" },
            { id: "raza", label: "Raza", tipo: "text" },
            { id: "sexo", label: "Sexo", tipo: "select", opciones: ["Macho", "Hembra", "Desconocido"] },
            { id: "esta_esterilizado", label: "¿Está Esterilizado?", tipo: "select", opciones: [{val: true, text: "Sí"}, {val: false, text: "No"}] },
            { id: "fecha_nacimiento", label: "Fecha Nacimiento", tipo: "date" },
            { id: "color", label: "Color", tipo: "text" },
            { id: "chip_id", label: "Microchip", tipo: "text" },
            { id: "siniiga_tatuaje", label: "SINIIGA / Tatuaje", tipo: "text" },
            { id: "pedigri_fcm", label: "Pedigrí (FCM)", tipo: "text" },
            { id: "senas_particulares", label: "Señas Particulares", tipo: "textarea" }
        ]
    },
    tutor: {
        titulo: "Editar Datos del Tutor",
        tabla: "clientes",
        campos: [
            { id: "nombre_completo", label: "Nombre Completo", tipo: "text" },
            { id: "telefono", label: "Teléfono", tipo: "text" },
            { id: "correo", label: "Correo Electrónico", tipo: "text" },
            { id: "contacto_emergencia", label: "Contacto de Emergencia", tipo: "text" },
            { id: "direccion", label: "Dirección", tipo: "textarea" }
        ]
    },
    alertas: {
        titulo: "Editar Alertas Médicas",
        tabla: "pacientes",
        campos: [
            { id: "alergias", label: "Alergias Conocidas", tipo: "textarea" },
            { id: "enfermedades_cronicas", label: "Enfermedades Crónicas", tipo: "textarea" },
            { id: "medicacion_actual", label: "Medicación Actual", tipo: "textarea" },
            { id: "cirugias_previas", label: "Cirugías y Hospitalizaciones", tipo: "textarea" },
            { id: "discapacidades", label: "Discapacidades", tipo: "textarea" }
        ]
    },
    manejo: {
        titulo: "Editar Manejo Integral",
        tabla: "pacientes",
        campos: [
            { id: "temperamento", label: "Temperamento", tipo: "text" },
            { id: "ansiedad_miedo", label: "Ansiedad / Miedos", tipo: "text" },
            { id: "agresividad", label: "Agresividad", tipo: "text" },
            { id: "dieta_marca", label: "Dieta y Marca", tipo: "text" },
            { id: "frecuencia_dieta", label: "Frecuencia / Restricciones", tipo: "text" },
            { id: "cruzas_partos", label: "Historial de Cruzas / Partos", tipo: "text" },
            { id: "notas_comportamiento", label: "Observaciones de Manejo", tipo: "textarea" }
        ]
    }
};

let seccionActivaEdicion = null;

function configurarMotorDeEdicion() {
    const modal = document.getElementById('modal-edicion-expediente');
    const btnCerrarInferior = document.getElementById('btn-cancelar-edicion');
    const btnCerrarSuperior = document.getElementById('btn-cerrar-edicion-arriba'); // Puede no existir si se usa el modal antiguo
    const btnGuardar = document.getElementById('btn-guardar-edicion');
    const contenedorCampos = document.getElementById('contenedor-campos-dinamicos');
    const tituloModal = document.getElementById('titulo-modal-edicion');
    const breadcrumb = document.getElementById('breadcrumb-seccion');

    if (!modal) return; 

    // SE ELIMINÓ: Mover el modal al body para evitar romper el encapsulamiento SPA

    // Mapeo de clics en los botones de "Editar"
    document.getElementById('btn-editar-identidad')?.addEventListener('click', (e) => { e.preventDefault(); abrirModal('identidad'); });
    document.getElementById('btn-editar-tutor')?.addEventListener('click', (e) => { e.preventDefault(); abrirModal('tutor'); });
    document.getElementById('btn-editar-alertas')?.addEventListener('click', (e) => { e.preventDefault(); abrirModal('alertas'); });
    document.getElementById('btn-editar-manejo')?.addEventListener('click', (e) => { e.preventDefault(); abrirModal('manejo'); });

    // ── Función de cierre: espera la transición CSS antes de ocultar el backdrop ──
    const cerrarModal = () => {
        modal.classList.remove('visible');
        // Restaurar scroll del body (por si acaso se bloqueó en alguna ruta)
        document.body.style.overflow = '';
        // Esperar a que la transición de 0.3s termine antes de ocultar el nodo
        // Esto evita que el backdrop quede bloquendo la UI con display:flex invisible
        setTimeout(() => {
            modal.style.display = 'none';
        }, 320);
    };

    // Cerrar al hacer clic directamente sobre el backdrop (fuera del panel)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });

    if (btnCerrarInferior) btnCerrarInferior.addEventListener('click', cerrarModal);
    if (btnCerrarSuperior) btnCerrarSuperior.addEventListener('click', cerrarModal);

    window.abrirModalGlobal = function(llave) { abrirModal(llave); };

    function abrirModal(llaveSeccion) {
        seccionActivaEdicion = llaveSeccion;
        const conf = configuracionEdicion[llaveSeccion];
        const datosBase = conf.tabla === 'pacientes' ? registroPacienteOriginal : registroTutorOriginal;
        
        if (tituloModal) tituloModal.textContent = conf.titulo;
        if (breadcrumb) breadcrumb.textContent = conf.titulo;
        contenedorCampos.innerHTML = '';

        // Construcción dinámica del formulario
        conf.campos.forEach(c => {
            const div = document.createElement('div');
            div.className = 'grupo-campo-edicion';
            
            // Si usamos el panel Bento lateral, las textareas ocupan ambas columnas
            if (c.tipo === 'textarea' && contenedorCampos.classList.contains('info-grid-2col')) {
                div.style.gridColumn = '1 / -1';
            }

            const label = document.createElement('label');
            label.textContent = c.label;
            div.appendChild(label);

            let input;
            const valorActual = datosBase[c.id] !== null && datosBase[c.id] !== undefined ? datosBase[c.id] : '';

            if (c.tipo === 'textarea') {
                input = document.createElement('textarea');
                input.rows = 3;
                input.value = valorActual;
            } else if (c.tipo === 'select') {
                input = document.createElement('select');
                c.opciones.forEach(opt => {
                    const option = document.createElement('option');
                    if (typeof opt === 'object') {
                        option.value = opt.val;
                        option.textContent = opt.text;
                        if (valorActual === opt.val) option.selected = true;
                    } else {
                        option.value = opt;
                        option.textContent = opt;
                        if (valorActual === opt) option.selected = true;
                    }
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = c.tipo;
                input.value = valorActual;
            }
            
            input.id = `input-dinamico-${c.id}`;
            input.dataset.columna = c.id; 
            div.appendChild(input);
            contenedorCampos.appendChild(div);
        });

        // Lógica híbrida para mostrar el modal
        modal.style.display = 'flex';
        if (modal.classList.contains('modal-lateral-backdrop')) {
            // Dar un pequeñísimo respiro para que el display flex se aplique antes de la opacidad (transición CSS)
            setTimeout(() => {
                modal.classList.add('visible');
            }, 10);
        }
    }

    // Acción de Guardado
    btnGuardar.addEventListener('click', async () => {
        const conf = configuracionEdicion[seccionActivaEdicion];
        const datosBase = conf.tabla === 'pacientes' ? registroPacienteOriginal : registroTutorOriginal;
        const idAfectado = conf.tabla === 'pacientes' ? idPacienteActual : idClienteActual;

        const inputs = contenedorCampos.querySelectorAll('[data-columna]');
        const datosNuevosGenerados = {};
        const datosAntiguosAudit = {};
        const datosNuevosAudit = {};
        let hayCambios = false;

        // Analizar qué datos cambiaron
        inputs.forEach(input => {
            const columna = input.dataset.columna;
            let valorInput = input.value;
            
            // Corrección de tipos lógicos
            if (valorInput === "true") valorInput = true;
            if (valorInput === "false") valorInput = false;
            
            // Normalizar string vacío a null para la BD
            if (valorInput === '') valorInput = null;

            if (valorInput !== datosBase[columna]) {
                datosNuevosGenerados[columna] = valorInput;
                datosAntiguosAudit[columna] = datosBase[columna];
                datosNuevosAudit[columna] = valorInput;
                hayCambios = true;
            }
        });

        // Si el usuario no modificó nada, simplemente cerramos el modal
        if (!hayCambios) {
            cerrarModal();
            return;
        }

        btnGuardar.textContent = 'Guardando...';
        btnGuardar.disabled = true;

        try {
            // 1. Actualizar la tabla principal en Supabase
            const { error: errUpdate } = await conexionSupabase
                .from(conf.tabla)
                .update(datosNuevosGenerados)
                .eq('id', idAfectado);

            if (errUpdate) throw errUpdate;

            // 2. Registrar el movimiento en la bitácora de auditoría
            await registrarAuditoria(conf.tabla, idAfectado, datosAntiguosAudit, datosNuevosAudit);

            // 3. ✅ OPTIMIZACIÓN: Actualizar en memoria y DOM directamente, sin re-fetch de red
            if (conf.tabla === 'pacientes') {
                Object.assign(registroPacienteOriginal, datosNuevosGenerados);
            } else {
                Object.assign(registroTutorOriginal, datosNuevosGenerados);
            }
            // Volver a pintar la UI con los datos actualizados en memoria
            await cargarDatosIdentidadPaciente(registroPacienteOriginal, null);

            cerrarModal();
            mostrarToastExito('¡Cambios guardados correctamente!');

        } catch (error) {
            console.error("Error al guardar edición:", error);
            alertaCustom("Ocurrió un error al guardar los cambios.");
        } finally {
            btnGuardar.textContent = 'Guardar Cambios';
            btnGuardar.disabled = false;
        }
    });
}

// Función compartida para asentar acciones en la tabla `auditoria_actividad`
async function registrarAuditoria(tabla, registroId, antiguos, nuevos) {
    if (!idOrganizacionActual || !idUsuarioActual) return;
    
    const payload = {
        organizacion_id: idOrganizacionActual,
        usuario_id: idUsuarioActual,
        tabla_afectada: tabla,
        registro_id: registroId,
        accion: 'UPDATE',
        datos_anteriores: antiguos,
        datos_nuevos: nuevos
    };

    const { error } = await conexionSupabase.from('auditoria_actividad').insert(payload);
    if (error) console.error("[AUDITORÍA] Falla al registrar la actividad:", error);
}

// ==========================================================================
// 🍞 NOTIFICACIÓN TOAST (FEEDBACK NO-BLOQUEANTE)
// ==========================================================================
function mostrarToastExito(mensaje) {
    // Evitar duplicados
    document.getElementById('toast-expediente-exito')?.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-expediente-exito';
    toast.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:18px; color:#4ade80;">check_circle</span>
        <span style="font-size:13px; font-weight:600; color:#1e293b;">${mensaje}</span>
    `;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#ffffff',
        border: '1.5px solid #86efac',
        borderRadius: '12px',
        padding: '14px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        zIndex: '99999',
        opacity: '0',
        transform: 'translateY(12px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        fontFamily: "'Inter', sans-serif"
    });

    document.body.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Auto-destruir después de 3.5 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}


// ==========================================================================
// 📸 GESTIÓN DE STORAGE (SUBIDA DE AVATAR)
// ==========================================================================
function configurarSubidaDeFoto() {
    const btnCambiarFoto = document.getElementById('btn-cambiar-foto');
    const inputFoto = document.getElementById('input-foto-paciente');
    const imgUI = document.getElementById('ui-foto-paciente');

    if (!btnCambiarFoto || !inputFoto) return;

    btnCambiarFoto.addEventListener('click', () => inputFoto.click());

    inputFoto.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alertaCustom('Solo se permiten archivos de imagen (JPG, PNG).');
            return;
        }

        const srcOriginal = imgUI.src;
        imgUI.src = 'https://placehold.co/400x400/f1f5f9/94a3b8?text=Subiendo...';

        try {
            const extension = file.name.split('.').pop();
            const nuevoNombre = `avatar_${idPacienteActual}_${Date.now()}.${extension}`;
            const archivoRenombrado = new File([file], nuevoNombre, { type: file.type });

            const resultadoUpload = await StorageService.uploadToProtectPet(conexionSupabase, {
                file: archivoRenombrado,
                orgId: idOrganizacionActual,
                entity: 'pacientes',
                entityId: idPacienteActual,
                subFolder: 'fotos_perfil'
            });

            if (resultadoUpload.error) throw new Error(resultadoUpload.error);

            // Registro de auditoría visual para el cambio de fotografía
            await registrarAuditoria('pacientes', idPacienteActual, { foto_url: srcOriginal }, { foto_url: resultadoUpload.fullUrl });

            const { error: updateError } = await conexionSupabase
                .from('pacientes')
                .update({ foto_url: resultadoUpload.fullUrl })
                .eq('id', idPacienteActual);

            if (updateError) throw updateError;

            imgUI.src = resultadoUpload.fullUrl;

        } catch (error) {
            console.error("[STORAGE] Falla al actualizar la imagen:", error);
            alertaCustom('Hubo un error al subir la fotografía.');
            imgUI.src = srcOriginal; 
        } finally {
            inputFoto.value = ''; 
        }
    });
}

// ==========================================================================
// 🗂️ CONTROL DE NAVEGACIÓN DE PESTAÑAS
// ==========================================================================
function configurarNavegacionPestanas(contenedor) {
    const tabs = contenedor.querySelectorAll('.tab');
    const secciones = contenedor.querySelectorAll('.vista-dinamica');

    if (tabs.length === 0 || secciones.length === 0) {
        console.warn("[EXPEDIENTE] No se encontraron pestañas o secciones para inicializar.");
        return;
    }

    // 1. Asegurar el estado inicial al cargar el módulo
    const tabActivaInicial = contenedor.querySelector('.tab.active') || tabs[0];
    const targetInicial = tabActivaInicial.getAttribute('data-target');

    secciones.forEach(sec => {
        sec.style.display = (sec.id === targetInicial) ? 'block' : 'none';
    });

    // 2. Asignar el evento de cambio a cada pestaña
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault(); // Evita que la página brinque hacia arriba

            const targetId = tab.getAttribute('data-target');
            const targetSection = contenedor.querySelector(`#${targetId}`);

            if (!targetSection) {
                console.warn(`[EXPEDIENTE] La sección con ID '${targetId}' no existe.`);
                return;
            }

            // A) Apagar todas las pestañas y ocultar todas las secciones
            tabs.forEach(t => t.classList.remove('active'));
            secciones.forEach(sec => sec.style.display = 'none');

            // B) Encender la pestaña clickeada y mostrar su sección correspondiente
            tab.classList.add('active');
            targetSection.style.display = 'block';
        });
    });
}

// ==========================================================================
// 📊 RENDERIZADO DE LA PESTAÑA RESUMEN
// ==========================================================================
// ✅ OPTIMIZACIÓN: Recibe consultasData pre-cargado del Promise.all
async function renderizarResumen(paciente, consultasData) {
    console.log("[EXPEDIENTE] Renderizando pestaña resumen...");
    
    const val = (campo) => (campo && campo.toString().trim() !== '') ? campo : '-';

    // 1. Identidad básica
    document.getElementById('res-nombre').textContent = val(paciente.nombre);
    document.getElementById('res-edad').textContent = calcularEdad(paciente.fecha_nacimiento);
    document.getElementById('res-sexo').textContent = val(paciente.sexo);
    document.getElementById('res-microchip').textContent = val(paciente.chip_id);

    // Tutor
    if (paciente.clientes) {
        document.getElementById('res-tutor').textContent = val(paciente.clientes.nombre_completo);
    }

    // Avatar
    const avatarImg = document.getElementById('res-avatar');
    const avatarIcon = document.getElementById('res-avatar-icon');
    if (paciente.foto_url) {
        avatarImg.src = paciente.foto_url;
        avatarImg.style.display = 'block';
        avatarIcon.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarIcon.style.display = 'block';
    }

    // Tags
    const tagsContainer = document.getElementById('res-tags');
    tagsContainer.innerHTML = '';
    if (paciente.especie) tagsContainer.innerHTML += `<span class="tag">${paciente.especie}</span>`;
    if (paciente.raza) tagsContainer.innerHTML += `<span class="tag">${paciente.raza}</span>`;
    if (paciente.alergias && paciente.alergias.toLowerCase() !== 'sin alergias conocidas') {
        tagsContainer.innerHTML += `<span class="tag alert">Alergia Registrada</span>`;
    }

    // 2. Condiciones y Alertas
    const condContainer = document.getElementById('res-condiciones-container');
    condContainer.innerHTML = '';
    let tieneCondiciones = false;

    if (paciente.alergias && paciente.alergias.toLowerCase() !== 'sin alergias conocidas') {
        tieneCondiciones = true;
        condContainer.innerHTML += `
            <div class="list-item">
                <div class="item-main">
                    <span class="item-title" style="color: var(--naranja);">Alergias</span>
                    <span class="item-subtitle">${paciente.alergias}</span>
                </div>
            </div>`;
    }
    if (paciente.enfermedades_cronicas) {
        tieneCondiciones = true;
        condContainer.innerHTML += `
            <div class="list-item">
                <div class="item-main">
                    <span class="item-title">Enfermedades Crónicas</span>
                    <span class="item-subtitle">${paciente.enfermedades_cronicas}</span>
                </div>
            </div>`;
    }
    if (paciente.temperamento || paciente.ansiedad_miedo || paciente.agresividad) {
        tieneCondiciones = true;
        let comp = [paciente.temperamento, paciente.ansiedad_miedo, paciente.agresividad].filter(Boolean).join('. ');
        condContainer.innerHTML += `
            <div class="list-item">
                <div class="item-main">
                    <span class="item-title">Temperamento / Precauciones</span>
                    <span class="item-subtitle">${comp}</span>
                </div>
            </div>`;
    }

    if (!tieneCondiciones) {
        condContainer.innerHTML = '<div style="text-align: center; color: var(--gris-texto-mutado); padding: 20px;">Sin condiciones registradas</div>';
    }

    // 3. Dieta y Nutrición
    const dietaContainer = document.getElementById('res-dieta-container');
    dietaContainer.innerHTML = '';
    if (paciente.dieta_marca || paciente.frecuencia_dieta) {
        if (paciente.dieta_marca) {
            dietaContainer.innerHTML += `
                <div class="list-item">
                    <div class="item-main">
                        <span class="item-title">Alimento Base</span>
                        <span class="item-subtitle">${paciente.dieta_marca}</span>
                    </div>
                </div>`;
        }
        if (paciente.frecuencia_dieta) {
            dietaContainer.innerHTML += `
                <div class="list-item">
                    <div class="item-main">
                        <span class="item-title">Frecuencia / Porción</span>
                        <span class="item-subtitle">${paciente.frecuencia_dieta}</span>
                    </div>
                </div>`;
        }
    } else {
        dietaContainer.innerHTML = '<div style="text-align: center; color: var(--gris-texto-mutado); padding: 20px;">Sin información de dieta registrada</div>';
    }

    // 4. Última Visita y Evolución de Peso (usa datos pre-cargados, sin query adicional)
    await cargarDatosDeConsultas(consultasData);
}

// ✅ OPTIMIZACIÓN: Recibe consultasData pre-cargado, sin petición de red
function cargarDatosDeConsultas(consultas) {
    try {

        // Render Última Visita
        const visitaBox = document.getElementById('res-ultima-visita-box');
        if (consultas && consultas.length > 0) {
            const ultima = consultas[0];
            const fecha = new Date(ultima.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
            const medico = ultima.perfiles ? ultima.perfiles.nombre_completo : 'Médico';
            
            let resolucion = 'En proceso';
            if (ultima.diagnostico_presuntivo || ultima.plan_tratamiento) {
                resolucion = [ultima.diagnostico_presuntivo, ultima.plan_tratamiento].filter(Boolean).join('. ');
            }

            visitaBox.innerHTML = `
                <div class="last-visit-header">
                  <span class="visit-doctor">${medico}</span>
                  <span class="visit-date">${fecha}</span>
                </div>
                <div class="visit-reason" style="margin-bottom: 12px;">
                  <strong>Motivo:</strong> ${ultima.motivo_consulta || '-'}<br><br>
                  <strong>Resolución:</strong> ${resolucion}
                </div>
            `;
        } else {
            visitaBox.innerHTML = '<div style="text-align: center; color: var(--gris-texto-mutado); padding: 20px;">Sin visitas previas registradas</div>';
        }

        // Render Gráfica de Peso
        renderizarGraficaPeso(consultas);

    } catch(e) {
        console.error("Error al procesar consultas para el resumen:", e);
    }
}

function renderizarGraficaPeso(consultas) {
    const canvas = document.getElementById('grafica-peso-resumen');
    const labelActual = document.getElementById('res-peso-actual');
    const msgVacio = document.getElementById('res-peso-vacio');

    if (!canvas) return;

    // Filtrar consultas que tienen peso_kg válido (> 0)
    const registrosConPeso = (consultas || []).filter(c => c.peso_kg && c.peso_kg > 0).reverse(); // Oldest to newest for graph

    if (registrosConPeso.length === 0) {
        canvas.style.display = 'none';
        msgVacio.style.display = 'block';
        labelActual.style.display = 'none';
        return;
    }

    canvas.style.display = 'block';
    msgVacio.style.display = 'none';
    labelActual.style.display = 'block';

    const pesoMasReciente = registrosConPeso[registrosConPeso.length - 1].peso_kg;
    labelActual.innerHTML = `${pesoMasReciente} <span>kg (Actual)</span>`;

    const labels = registrosConPeso.map(c => new Date(c.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }));
    const data = registrosConPeso.map(c => c.peso_kg);

    // Si Chart js ya dibujó una antes, destruirla
    if (window.resumenPesoChart) {
        window.resumenPesoChart.destroy();
    }

    if (typeof Chart !== 'undefined') {
        const ctx = canvas.getContext('2d');
        window.resumenPesoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Peso (kg)',
                    data: data,
                    borderColor: '#032F40', // var(--cobalto)
                    backgroundColor: 'rgba(3, 47, 64, 0.05)',
                    borderWidth: 3,
                    pointBackgroundColor: '#F27405', // var(--naranja)
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    fill: true,
                    tension: 0.4 // Curva suave
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#032F40',
                        titleFont: { family: 'Inter', size: 13 },
                        bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                        displayColors: false,
                        callbacks: {
                            label: function(context) { return context.parsed.y + ' kg'; }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b', maxTicksLimit: 5 }
                    },
                    y: {
                        display: false, // Hide Y axis for a cleaner sparkline look
                        min: Math.min(...data) - 1, // Add some padding below
                        max: Math.max(...data) + 2  // Add some padding above
                    }
                },
                layout: {
                    padding: { left: 10, right: 10, top: 20, bottom: 0 }
                }
            }
        });
    }
}

// ==========================================================================
// ⏳ RENDERIZADO DEL TIMELINE (HISTORIAL CLÍNICO)
// ==========================================================================
// ✅ OPTIMIZACIÓN: Recibe consultas y estudios pre-cargados del Promise.all, sin peticiones de red
async function renderizarTimelineHistorial(consultas, estudios) {
    const container = document.getElementById('timeline-historial-container');
    if (!container) return;

    // LIMPIEZA OBLIGATORIA DEL CONTENEDOR PARA EVITAR DUPLICADOS
    container.innerHTML = '';

    try {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--gris-texto-mutado);"><span class="material-symbols-rounded" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block; animation: rotate 2s linear infinite;">sync</span> Cargando registro clínico...</div>';

        // 3. Unir y ordenar cronológicamente (sin petición de red — datos ya disponibles)
        let eventos = [];
        if (consultas) {
            consultas.forEach(c => {
                eventos.push({
                    tipo: 'consulta',
                    fecha: new Date(c.created_at),
                    data: c
                });
            });
        }
        if (estudios) {
            estudios.forEach(e => {
                eventos.push({
                    tipo: 'estudio',
                    fecha: new Date(e.created_at),
                    data: e
                });
            });
        }

        eventos.sort((a, b) => b.fecha - a.fecha);

        if (eventos.length === 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--gris-texto-mutado);"><span class="material-symbols-rounded" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;">history</span> No hay registros clínicos en el historial.</div>';
            return;
        }

        // 4. Renderizar HTML
        let html = '';
        let anioActual = null;
        const anioEnCurso = new Date().getFullYear();

        eventos.forEach((evento) => {
            const anio = evento.fecha.getFullYear();
            const diaMes = evento.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', ''); // Ej: 12 Jun
            
            // Añadir banner si cambiamos de año
            if (anio !== anioActual) {
                const bannerTexto = (anio === anioEnCurso) ? 'Registros del año en curso' : `Registros del ${anio}`;
                html += `
                <div class="timeline-row">
                  <div class="timeline-date-label">${anio}</div>
                  <div class="timeline-node" style="width: 18px; height: 18px; background: #cbd5e1; border: 4px solid var(--blanco-puro); box-shadow: 0 0 0 2px var(--gris-lineas);"></div>
                  <div class="timeline-banner">${bannerTexto}</div>
                </div>
                `;
                anioActual = anio;
            }

            html += `<div class="timeline-row">`;
            
            // Etiqueta de fecha
            const strAnio = (anio !== anioEnCurso) ? `<br><span style="font-size:10px; font-weight:normal">${anio}</span>` : '';
            html += `<div class="timeline-date-label" style="text-transform: capitalize;">${diaMes}${strAnio}</div>`;
            html += `<div class="timeline-node"></div>`;
            
            if (evento.tipo === 'consulta') {
                const c = evento.data;
                const medico = c.perfiles ? c.perfiles.nombre_completo : 'Profesional de Salud';
                const anamnesis = c.anamnesis || 'Sin detalles de exploración.';
                const diagnostico = c.diagnostico_presuntivo ? `<br><br><strong>Diagnóstico presuntivo:</strong> ${c.diagnostico_presuntivo}` : '';
                const receta = c.plan_tratamiento ? `<br><strong>Tratamiento Médico (Receta):</strong> ${c.plan_tratamiento}` : '';
                const motivo = c.motivo_consulta || 'Revisión General';
                
                html += `
                  <div class="timeline-card">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h3>Consulta por ${motivo} <span class="tag tag-consulta">Consulta</span></h3>
                        <button onclick="window.eliminarConsultaHistorial('${c.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px;" title="Eliminar Registro">
                            <span class="material-symbols-rounded" style="font-size:16px;">delete</span> Eliminar
                        </button>
                    </div>
                    <p class="card-meta">Atendido por: <strong>${medico}</strong> | Motivo: <strong>${motivo}</strong></p>
                    <div class="card-notes" style="overflow-wrap: anywhere; word-break: break-word;">
                      <strong>Anamnesis y Exploración:</strong> ${anamnesis}
                      ${diagnostico}
                      ${receta}
                    </div>
                  </div>
                `;
            } else if (evento.tipo === 'estudio') {
                const e = evento.data;
                const medico = e.medico_realiza || e.medico_solicitante || 'Gabinete';
                const observaciones = e.hallazgos || e.interpretacion || 'Estudio registrado. Esperando interpretación.';
                
                let attachmentsHtml = '';
                if (e.archivos && e.archivos.length > 0) {
                    attachmentsHtml = '<div class="attachments-area">';
                    e.archivos.forEach(a => {
                        const ext = (a.nombre_archivo.split('.').pop() || '').toLowerCase();
                        let docType = ext.toUpperCase();
                        let typeClass = ext;
                        if (['pdf', 'jpg', 'jpeg', 'png', 'dicom', 'dcm', 'docx'].includes(ext)) {
                            if(ext === 'dcm') { typeClass = 'dicom'; docType = 'DICOM'; }
                        } else {
                            typeClass = 'pdf'; 
                            docType = 'ARCHIVO';
                        }
                        attachmentsHtml += `<a href="${a.url_archivo}" target="_blank" class="file-badge"><span class="file-type ${typeClass}">${docType}</span> ${a.nombre_archivo}</a>`;
                    });
                    attachmentsHtml += '</div>';
                }

                html += `
                  <div class="timeline-card">
                    <h3>${e.nombre_estudio || 'Estudio Clínico'} <span class="tag tag-estudio">Estudio</span></h3>
                    <p class="card-meta">Atendido por: <strong>${medico}</strong> | Tipo: <strong>${e.modalidad}</strong></p>
                    <div class="card-notes" style="overflow-wrap: anywhere; word-break: break-word;">
                      <strong>Observaciones:</strong> ${observaciones}
                    </div>
                    ${attachmentsHtml}
                  </div>
                `;
            }

            html += `</div>`; // cierra timeline-row
        });

        container.innerHTML = html;

    } catch(err) {
        console.error("[EXPEDIENTE] Error al cargar timeline historial:", err);
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--naranja); font-weight: 600;">Error al cargar el historial. Intente nuevamente.</div>';
    }
}

// Lógica para Eliminar Registro Clínico
window.eliminarConsultaHistorial = async function(consultaId) {
    if (!await confirmacionCustom('¿Estás seguro de eliminar este registro clínico? Esta acción no se puede deshacer.')) {
        return;
    }
    try {
        const { error } = await conexionSupabase.from('consultas').delete().eq('id', consultaId);
        if (error) throw error;
        // Recargar la vista para refrescar el historial
        inicializarExpedienteHistorial();
    } catch (err) {
        console.error('[EXPEDIENTE] Error al eliminar consulta:', err);
        alertaCustom('Hubo un error al intentar eliminar el registro.');
    }
};
