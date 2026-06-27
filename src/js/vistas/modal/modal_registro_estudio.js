import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import StorageService from '../../infraestructura/storage.js';
import imageCompression from 'browser-image-compression';

import modalRegistroEstudioHTML from '/MODAL_REGISTRO_ESTUDIO.html?raw';

let modalInyectado = false;
let archivosSeleccionados = [];
let pacienteIdActual = null;

// ==========================================================================
// 1. INYECCIÓN DEL MODAL
// ==========================================================================
export async function inyectarYMostrarModalEstudio(pacienteId) {
    console.log("[MODAL ESTUDIOS] Preparando inyección del formulario de estudios...", pacienteId);
    
    if (!pacienteId) {
        alert("Error: No se ha identificado al paciente actual.");
        return;
    }

    pacienteIdActual = pacienteId;
    const contenedorDOM = document.getElementById('contenedor-modal-dinamico');

    if (!contenedorDOM) {
        console.error("❌ ERROR: No existe #contenedor-modal-dinamico en la vista principal.");
        return;
    }

    if (!modalInyectado && !document.getElementById('contenedorRegistroEstudio')) {
        contenedorDOM.insertAdjacentHTML('beforeend', modalRegistroEstudioHTML);
        modalInyectado = true;
        
        await new Promise(resolve => setTimeout(resolve, 0)); // Micro-tick para renderizado
        inicializarEventosModalEstudio();
    }

    abrirModal();
}

// ==========================================================================
// 2. CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================================================
function inicializarEventosModalEstudio() {
    const modal = document.getElementById('contenedorRegistroEstudio');
    const btnCerrar = document.getElementById('btnCerrarRegistroEstudio');
    const form = document.getElementById('formRegistroEstudio');
    const inputFecha = document.getElementById('estudio_fecha');
    const inputHora = document.getElementById('estudio_hora');

    // Fechas por defecto
    const ahora = new Date();
    inputFecha.valueAsDate = ahora;
    inputHora.value = ahora.toTimeString().slice(0, 5);

    // Eventos de cierre
    btnCerrar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });

    // Envío del formulario
    form.addEventListener('submit', manejarGuardadoEstudio);

    // Inicializar sub-módulos
    configurarDragAndDrop();
    configurarEtiquetas();
}

// ==========================================================================
// 3. APERTURA Y CIERRE
// ==========================================================================
function abrirModal() {
    const modal = document.getElementById('contenedorRegistroEstudio');
    if (modal) {
        modal.style.display = 'flex';
        // Forzar reflow para animación
        void modal.offsetWidth; 
        modal.classList.add('abierto');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModal() {
    const modal = document.getElementById('contenedorRegistroEstudio');
    if (modal) {
        modal.classList.remove('abierto');
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            limpiarModal();
        }, 300);
    }
}

function limpiarModal() {
    document.getElementById('formRegistroEstudio').reset();
    
    // Restaurar fechas
    const ahora = new Date();
    document.getElementById('estudio_fecha').valueAsDate = ahora;
    document.getElementById('estudio_hora').value = ahora.toTimeString().slice(0, 5);

    // Limpiar archivos y UI
    archivosSeleccionados = [];
    actualizarVistaArchivos();

    // Limpiar etiquetas
    const contenedor = document.getElementById('contenedor_etiquetas_seleccionadas');
    if (contenedor) contenedor.innerHTML = '';
}

// ==========================================================================
// 4. DRAG & DROP DE ARCHIVOS
// ==========================================================================
function configurarDragAndDrop() {
    const dropzone = document.getElementById('dropzone_estudio');
    const inputArchivos = document.getElementById('input_archivos_estudio');

    if (!dropzone || !inputArchivos) return;

    // Abrir selector nativo al clickear el dropzone
    dropzone.addEventListener('click', () => {
        inputArchivos.click();
    });

    // Eventos Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, previeneComportamiento, false);
    });

    function previeneComportamiento(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.style.borderColor = 'var(--naranja)';
            dropzone.style.backgroundColor = '#fff3e0';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.style.borderColor = '#cbd5e1';
            dropzone.style.backgroundColor = '#f8fafc';
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        manejarArchivos(files);
    });

    inputArchivos.addEventListener('change', (e) => {
        manejarArchivos(e.target.files);
        // Reset para permitir seleccionar el mismo archivo si se elimina
        inputArchivos.value = '';
    });
}

function manejarArchivos(files) {
    [...files].forEach(file => {
        // Evitar duplicados por nombre y tamaño
        const existe = archivosSeleccionados.find(f => f.name === file.name && f.size === file.size);
        if (!existe) {
            // Límite básico global (50MB por archivo como ejemplo de seguridad del lado cliente)
            if (file.size > 50 * 1024 * 1024) {
                alert(`El archivo ${file.name} supera los 50MB y no puede procesarse en el cliente.`);
                return;
            }
            archivosSeleccionados.push(file);
        }
    });
    actualizarVistaArchivos();
}

function eliminarArchivo(index) {
    archivosSeleccionados.splice(index, 1);
    actualizarVistaArchivos();
}

// Hacer la función accesible globalmente para los botones de eliminación generados dinámicamente
window.eliminarArchivoEstudio = eliminarArchivo;

function actualizarVistaArchivos() {
    const listaUI = document.getElementById('lista_archivos_preview');
    if (!listaUI) return;

    listaUI.innerHTML = '';

    archivosSeleccionados.forEach((file, index) => {
        const div = document.createElement('div');
        div.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; background: #fff; border: 1px solid var(--border-color); border-radius: 8px;";
        
        let icono = 'description';
        let color = 'var(--texto-gris)';

        // Iconos por extensión
        if (file.type.startsWith('image/')) { icono = 'image'; color = 'var(--naranja)'; }
        else if (file.type === 'application/pdf') { icono = 'picture_as_pdf'; color = '#dc2626'; }
        else if (file.name.toLowerCase().endsWith('.dcm')) { icono = 'medical_services'; color = 'var(--cobalto)'; }
        else if (file.type.startsWith('video/')) { icono = 'movie'; color = '#8b5cf6'; }

        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                <span class="material-symbols-rounded" style="color: ${color};">${icono}</span>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-size: 13px; font-weight: 600; color: var(--cobalto); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${file.name}</span>
                    <span style="font-size: 11px; color: var(--texto-gris);">${sizeMB} MB</span>
                </div>
            </div>
            <button type="button" onclick="window.eliminarArchivoEstudio(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:5px; display:flex; align-items:center; justify-content:center; border-radius:50%;">
                <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
            </button>
        `;
        listaUI.appendChild(div);
    });
}

// ==========================================================================
// 5. SISTEMA DE ETIQUETAS
// ==========================================================================
function configurarEtiquetas() {
    const inputEtiqueta = document.getElementById('input_nueva_etiqueta');
    const contenedorSeleccionadas = document.getElementById('contenedor_etiquetas_seleccionadas');
    const sugerencias = document.querySelectorAll('.badge-sugerencia');

    if (!inputEtiqueta || !contenedorSeleccionadas) return;

    // Función para añadir
    const agregarEtiqueta = (texto) => {
        texto = texto.trim();
        if (!texto) return;
        
        // Evitar duplicados visuales
        const existentes = Array.from(contenedorSeleccionadas.querySelectorAll('span')).map(s => s.textContent.replace('close', '').trim());
        if (existentes.includes(texto)) return;

        const tag = document.createElement('div');
        tag.className = 'etiqueta-clinica-badge';
        tag.style.cssText = "display:flex; align-items:center; gap:5px; background:var(--cobalto); color:white; padding:4px 10px; border-radius:12px; font-size:12px;";
        
        tag.innerHTML = `
            <span>${texto}</span>
            <span class="material-symbols-rounded" style="font-size:14px; cursor:pointer;" onclick="this.parentElement.remove()">close</span>
        `;
        
        contenedorSeleccionadas.appendChild(tag);
    };

    // Evento Input (Enter)
    inputEtiqueta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            agregarEtiqueta(inputEtiqueta.value);
            inputEtiqueta.value = '';
        }
    });

    // Evento Sugerencias
    sugerencias.forEach(sug => {
        sug.addEventListener('click', () => {
            agregarEtiqueta(sug.textContent);
        });
    });
}

// ==========================================================================
// 6. GUARDADO EN BASE DE DATOS Y STORAGE (COMPRESIÓN)
// ==========================================================================
async function manejarGuardadoEstudio(e) {
    e.preventDefault();
    
    if (!pacienteIdActual) {
        alert("Contexto de paciente perdido.");
        return;
    }

    const form = e.target;
    const btnGuardar = document.getElementById('btnGuardarEstudio');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Recolectar datos
    const modalidad = document.getElementById('estudio_modalidad').value;
    const nombreEstudio = document.getElementById('estudio_nombre').value.trim();
    const prioridad = document.getElementById('estudio_prioridad').value;
    const fecha = document.getElementById('estudio_fecha').value;
    const hora = document.getElementById('estudio_hora').value;
    const solicitante = document.getElementById('estudio_solicitante').value.trim();
    const realiza = document.getElementById('estudio_realiza').value.trim();
    const motivo = document.getElementById('estudio_motivo').value.trim();
    const hallazgos = document.getElementById('estudio_hallazgos').value.trim();
    const interpretacion = document.getElementById('estudio_interpretacion').value.trim();
    
    // Obtener etiquetas
    const etiquetasNodos = document.getElementById('contenedor_etiquetas_seleccionadas').querySelectorAll('span:first-child');
    const etiquetas = Array.from(etiquetasNodos).map(n => n.textContent);

    btnGuardar.disabled = true;
    const contenidoOriginalBtn = btnGuardar.innerHTML;
    btnGuardar.innerHTML = `<span class="material-symbols-rounded animar-giro">sync</span> Subiendo...`;

    try {
        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) throw new Error("Sesión inválida.");

        const organizacionId = sesion.perfil.organizacion_id;

        // 1. Insertar el Estudio Principal
        const { data: estudioInsertado, error: insertError } = await conexionSupabase
            .from('estudios_clinicos')
            .insert({
                paciente_id: pacienteIdActual,
                organizacion_id: organizacionId,
                sucursal_id: sesion.perfil.sucursal_id,
                modalidad: modalidad,
                nombre_estudio: nombreEstudio,
                fecha_estudio: fecha,
                hora_estudio: hora,
                prioridad: prioridad,
                motivo_solicitud: motivo,
                hallazgos: hallazgos,
                interpretacion: interpretacion,
                medico_solicitante: solicitante,
                medico_realiza: realiza,
                etiquetas: etiquetas
            })
            .select('id')
            .single();

        if (insertError) throw insertError;
        const estudioId = estudioInsertado.id;

        // 2. Procesar Archivos (Subida y Compresión de imágenes)
        for (let i = 0; i < archivosSeleccionados.length; i++) {
            let archivo = archivosSeleccionados[i];
            const esImagen = archivo.type.startsWith('image/');
            const esDicom = archivo.name.toLowerCase().endsWith('.dcm');
            
            // Si es imagen (JPG/PNG) y NO es DICOM, aplicamos compresión en cliente
            if (esImagen && !esDicom) {
                const opcionesCompresion = {
                    maxSizeMB: 1.5, // 1.5MB máximo (calidad excelente para clínicas)
                    maxWidthOrHeight: 2048,
                    useWebWorker: true,
                    initialQuality: 0.8
                };
                
                try {
                    console.log(`Comprimiendo imagen ${archivo.name}...`);
                    archivo = await imageCompression(archivo, opcionesCompresion);
                } catch (cError) {
                    console.warn("Fallo compresión en cliente, se subirá original:", cError);
                }
            }

            // Subir usando StorageService (que genera la ruta correcta y la URL pública)
            const uploadResult = await StorageService.uploadToProtectPet(conexionSupabase, {
                file: archivo,
                orgId: organizacionId,
                entity: 'estudios',  // Modificación arquitectónica, usamos 'estudios' o 'pacientes'
                entityId: pacienteIdActual, 
                subFolder: `estudios_clinicos/${estudioId}`,
                bucketName: 'estudios-clinicos'
            });

            if (uploadResult.error) {
                console.error("Error al subir archivo:", archivo.name, uploadResult.error);
                continue; // Saltar archivo y seguir con el resto
            }

            // Insertar en tabla de archivos (estudios_archivos)
            await conexionSupabase.from('estudios_archivos').insert({
                estudio_id: estudioId,
                nombre_archivo: archivo.name,
                tipo_archivo: archivo.type || 'application/octet-stream',
                tamano_archivo: archivo.size,
                url_archivo: uploadResult.fullUrl,
                es_principal: (i === 0) // El primero es el principal por defecto
            });
        }

        // Éxito Total
        cerrarModal();
        
        // Disparar evento personalizado para que modulo_expediente_historial.js recargue las tarjetas
        const eventoActualizacion = new CustomEvent('PETPROTECT_ESTUDIO_CREADO', { detail: { pacienteId: pacienteIdActual } });
        document.dispatchEvent(eventoActualizacion);

        // Feedback al usuario (idealmente usar Toast, aquí fallback simple)
        console.log("✅ Estudio clínico registrado exitosamente.");

    } catch (error) {
        console.error("Error al guardar estudio:", error);
        alert("Ocurrió un error al procesar la solicitud: " + error.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = contenidoOriginalBtn;
    }
}
