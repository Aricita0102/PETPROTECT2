import { conexionSupabase } from '../../infraestructura/conexion.js';
import { generarPlantillaAvanzada } from './modulo_generador_pdfs.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

let _idPacienteActDoc = null;
let _idOrganizacionActDoc = null;
let _documentosExpediente = [];

export async function inicializarModuloExpedienteDocumentos(idPaciente, idOrganizacion) {
    _idPacienteActDoc = idPaciente;
    _idOrganizacionActDoc = idOrganizacion;
    
    // Extraer el modal al body para que superponga el navbar correctamente
    const modal = document.getElementById('modalNuevoDocumento');
    if (modal && modal.parentNode !== document.body) {
        document.body.appendChild(modal);
    }
    
    // Configurar event listeners
    _configurarEventosDoc();
    
    // Cargar documentos
    await cargarDocumentosPaciente();
}

function _configurarEventosDoc() {
    // Abrir Modal
    const btnAbrir = document.getElementById('btnAbrirModalNuevoDoc');
    if (btnAbrir) {
        btnAbrir.addEventListener('click', () => {
            document.getElementById('modalNuevoDocumento').style.display = 'flex';
            document.getElementById('nuevoDocFecha').value = new Date().toISOString().split('T')[0];
        });
    }

    // Descargar ZIP
    const btnZip = document.getElementById('btnDescargarZipDocs');
    if (btnZip) {
        // Hacemos visible el botón
        btnZip.style.display = 'flex';
        btnZip.addEventListener('click', _descargarZIPDocumentos);
    }

    // Cerrar Modal
    const btnCerrar = document.getElementById('btnCerrarModalNuevoDoc');
    const btnCancelar = document.getElementById('btnCancelarNuevoDoc');
    [btnCerrar, btnCancelar].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            document.getElementById('modalNuevoDocumento').style.display = 'none';
        });
    });

    // Pestañas internas del Modal
    const tabs = document.querySelectorAll('.doc-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottom = '3px solid transparent';
                t.style.color = '#64748b';
            });
            tab.classList.add('active');
            tab.style.borderBottom = '3px solid #F27405';
            tab.style.color = '#032F40';

            document.querySelectorAll('.doc-tab-content').forEach(c => c.style.display = 'none');
            const target = tab.getAttribute('data-doctab');
            document.getElementById(`docTab-${target}`).style.display = 'flex';
        });
    });

    // Drag & Drop
    const dropzone = document.getElementById('dropzoneDocumento');
    const inputFile = document.getElementById('inputNuevoDocFile');
    const preview = document.getElementById('previewNuevoDoc');
    const previewNombre = document.getElementById('previewNuevoDocNombre');
    const btnQuitar = document.getElementById('btnQuitarNuevoDoc');

    if (dropzone) {
        document.addEventListener('dragover', (e) => {
            if (e.target.closest('#dropzoneDocumento')) {
                e.preventDefault();
                dropzone.style.borderColor = '#F27405';
                dropzone.style.background = '#fff7ed';
            }
        });
        document.addEventListener('dragleave', (e) => {
            if (e.target.closest('#dropzoneDocumento')) {
                dropzone.style.borderColor = '#cbd5e1';
                dropzone.style.background = '#f8fafc';
            }
        });
        document.addEventListener('drop', (e) => {
            if (e.target.closest('#dropzoneDocumento')) {
                e.preventDefault();
                dropzone.style.borderColor = '#cbd5e1';
                dropzone.style.background = '#f8fafc';
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    _manejarArchivoSeleccionado(e.dataTransfer.files[0]);
                }
            }
        });
    }

    if (inputFile) {
        inputFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                _manejarArchivoSeleccionado(e.target.files[0]);
            }
        });
    }

    if (btnQuitar) {
        btnQuitar.addEventListener('click', () => {
            window._docFileActual = null;
            inputFile.value = '';
            preview.style.display = 'none';
            dropzone.style.display = 'flex';
        });
    }

    // Filtros
    document.querySelectorAll('input[name="filtroCatDoc"]').forEach(chk => {
        chk.addEventListener('change', _renderizarListaDocs);
    });
    const filtroBuscar = document.getElementById('filtroBuscarDoc');
    if (filtroBuscar) filtroBuscar.addEventListener('input', _renderizarListaDocs);
    const filtroFecha = document.getElementById('filtroFechaDoc');
    if (filtroFecha) filtroFecha.addEventListener('change', _renderizarListaDocs);

    // Guardar (Subir o Generar)
    const btnGuardar = document.getElementById('btnGuardarNuevoDoc');
    if (btnGuardar) btnGuardar.addEventListener('click', _guardarNuevoDocumento);
    
    // Configurar el generador
    _configurarEventosGenerador();
}

function _manejarArchivoSeleccionado(file) {
    window._docFileActual = file;
    document.getElementById('dropzoneDocumento').style.display = 'none';
    const preview = document.getElementById('previewNuevoDoc');
    preview.style.display = 'flex';
    document.getElementById('previewNuevoDocNombre').textContent = file.name;
    
    // Autocompletar nombre si está vacío
    const nombreInput = document.getElementById('nuevoDocNombre');
    if (nombreInput && !nombreInput.value) {
        nombreInput.value = file.name.replace(/\.[^/.]+$/, "");
    }
}

async function cargarDocumentosPaciente() {
    if (!_idPacienteActDoc) return;
    try {
        const loader = document.getElementById('loaderDocumentos');
        if(loader) loader.style.display = 'block';
        
        const { data, error } = await conexionSupabase
            .from('pacientes_documentos')
            .select('*')
            .eq('paciente_id', _idPacienteActDoc)
            .order('fecha_documento', { ascending: false });
            
        if (error) {
            // Podría no existir la tabla aún
            if (error.code === '42P01') {
                console.warn('[DOCS] La tabla pacientes_documentos no existe aún.');
                _documentosExpediente = [];
            } else {
                throw error;
            }
        } else {
            _documentosExpediente = data || [];
        }
    } catch (e) {
        console.error('Error al cargar documentos:', e);
    } finally {
        const loader = document.getElementById('loaderDocumentos');
        if (loader) loader.style.display = 'none';
        _renderizarListaDocs();
    }
}

function _renderizarListaDocs() {
    const contenedor = document.getElementById('listaDocumentosExpediente');
    if (!contenedor) return;
    
    // Limpiar excepto el loader
    Array.from(contenedor.children).forEach(c => {
        if (c.id !== 'loaderDocumentos') c.remove();
    });

    // Filtros
    const categoriasActivas = Array.from(document.querySelectorAll('input[name="filtroCatDoc"]:checked')).map(cb => cb.value);
    const busqueda = (document.getElementById('filtroBuscarDoc')?.value || '').toLowerCase();
    const periodo = document.getElementById('filtroFechaDoc')?.value || 'todos';

    // Actualizar contadores totales
    let contadores = { 'Documentación Clínica': 0, 'Consentimientos': 0, 'Certificados': 0, 'Identificación y Legal': 0, 'Administrativos': 0 };

    _documentosExpediente.forEach(d => {
        if (contadores[d.categoria] !== undefined) contadores[d.categoria]++;
    });
    
    const setContador = (id, cat) => {
        const el = document.getElementById(`contadorCat-${id}`);
        if (el) el.textContent = contadores[cat];
    };
    setContador('clinica', 'Documentación Clínica');
    setContador('consentimientos', 'Consentimientos');
    setContador('certificados', 'Certificados');
    setContador('legales', 'Identificación y Legal');

    // Filtrar la lista
    const ahora = new Date();
    const filtrados = _documentosExpediente.filter(d => {
        const cat = d.categoria || 'Documentación Clínica';
        if (!categoriasActivas.includes(cat)) return false;
        
        if (busqueda) {
            const nombre = d.nombre_documento || '';
            if (!nombre.toLowerCase().includes(busqueda)) return false;
        }
        
        if (periodo !== 'todos') {
            const fechaDoc = d.fecha_documento ? new Date(d.fecha_documento) : new Date();
            const diffDias = (ahora - fechaDoc) / (1000 * 60 * 60 * 24);
            if (periodo === 'mes' && diffDias > 30) return false;
            if (periodo === 'seis' && diffDias > 180) return false;
            if (periodo === 'anio' && diffDias > 365) return false;
        }
        
        return true;
    });

    if (filtrados.length === 0) {
        const vacio = document.createElement('div');
        vacio.style.textAlign = 'center';
        vacio.style.color = '#64748b';
        vacio.style.padding = '40px 20px';
        vacio.innerHTML = 'No se encontraron documentos con los filtros actuales.';
        contenedor.appendChild(vacio);
        return;
    }

    filtrados.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'document-item';
        
        let fileClass = 'pdf';
        let fileExt = 'PDF';
        if (doc.tipo_archivo) {
            const t = doc.tipo_archivo.toLowerCase();
            if (t.includes('jpg') || t.includes('png') || t.includes('jpeg')) { fileClass = 'jpg'; fileExt = 'IMG'; }
            else if (t.includes('doc')) { fileClass = 'docx'; fileExt = 'DOC'; }
            else if (t === 'generado') { fileClass = 'pdf'; fileExt = 'GEN'; }
        }

        const sizeStr = doc.tamano_bytes ? (doc.tamano_bytes / 1024).toFixed(0) + ' KB' : 'N/A';
        const vetStr = doc.veterinario_responsable || 'Sistema';

        item.innerHTML = `
          <div class="doc-main-info">
            <div class="file-type ${fileClass}">${fileExt}</div>
            <div class="doc-details">
              <span class="doc-title">${doc.nombre_documento}</span>
              <span class="doc-meta">Agregado el <strong style="color: var(--cobalto); font-weight: 600;">${doc.fecha_documento}</strong> por ${vetStr} • ${sizeStr}</span>
            </div>
          </div>
          <div class="doc-actions-group">
            <span class="tag">${doc.categoria.split(' ')[0]}</span>
            <button class="btn-outline btn-renombrar-doc" style="padding:5px 10px;" data-id="${doc.id}" data-nombre="${doc.nombre_documento}"><span class="material-symbols-rounded" style="font-size:18px;">edit</span></button>
            <a href="${doc.url_archivo || '#'}" target="_blank" class="btn-outline">Ver / Descargar</a>
            <button class="btn-outline btn-eliminar-doc" style="color:#ef4444; border-color:#ef4444; padding:5px 10px;" data-id="${doc.id}"><span class="material-symbols-rounded" style="font-size:18px;">delete</span></button>
          </div>
        `;
        contenedor.appendChild(item);
    });

    // Eventos renombrar
    contenedor.querySelectorAll('.btn-renombrar-doc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const nombreActual = e.currentTarget.getAttribute('data-nombre');
            const nuevoNombre = prompt('Ingrese el nuevo nombre para el documento:', nombreActual);
            
            if (nuevoNombre && nuevoNombre.trim() !== '' && nuevoNombre !== nombreActual) {
                await _renombrarDocumento(id, nuevoNombre.trim());
            }
        });
    });

    // Eventos eliminar
    contenedor.querySelectorAll('.btn-eliminar-doc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if(confirm('¿Estás seguro de eliminar este documento permanentemente?')) {
                await _eliminarDocumento(id);
            }
        });
    });
}

async function _renombrarDocumento(id, nuevoNombre) {
    try {
        const { error } = await conexionSupabase
            .from('pacientes_documentos')
            .update({ nombre_documento: nuevoNombre })
            .eq('id', id);

        if (error) throw error;
        
        await cargarDocumentosPaciente();
    } catch (error) {
        console.error(error);
        alert("Error al renombrar el documento: " + error.message);
    }
}

async function _descargarZIPDocumentos() {
    if (!_documentosExpediente || _documentosExpediente.length === 0) {
        alert("No hay documentos para descargar.");
        return;
    }

    const btn = document.getElementById('btnDescargarZipDocs');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-rounded">hourglass_empty</span> Generando ZIP...`;
    btn.disabled = true;

    try {
        const zip = new JSZip();
        const pacNombre = document.querySelector('.patient-header-info h1')?.textContent || 'Paciente';
        const folder = zip.folder(`Documentos_${pacNombre}`);

        // Las categorías activas actualmente
        const categoriasActivas = Array.from(document.querySelectorAll('input[name="filtroCatDoc"]:checked')).map(cb => cb.value);
        const docsA_descargar = _documentosExpediente.filter(d => categoriasActivas.includes(d.categoria));

        if (docsA_descargar.length === 0) {
            alert("Seleccione al menos una categoría con documentos para descargar.");
            return;
        }

        const promesasDescarga = docsA_descargar.map(async (doc) => {
            if (!doc.url_archivo) return;
            try {
                const response = await fetch(doc.url_archivo);
                const blob = await response.blob();
                
                let ext = 'pdf'; // por defecto para generados
                if (doc.tipo_archivo && doc.tipo_archivo !== 'generado') {
                    ext = doc.tipo_archivo.split('/').pop() || doc.tipo_archivo.split('.').pop() || 'pdf';
                }
                const filename = `${doc.nombre_documento.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
                folder.file(filename, blob);
            } catch (err) {
                console.error("Error descargando archivo para ZIP", doc, err);
            }
        });

        await Promise.all(promesasDescarga);

        const contenidoZip = await zip.generateAsync({ type: 'blob' });
        saveAs(contenidoZip, `Expediente_Docs_${pacNombre}.zip`);

    } catch (error) {
        console.error(error);
        alert("Error al generar el ZIP: " + error.message);
    } finally {
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
    }
}

async function _guardarNuevoDocumento() {
    const btn = document.getElementById('btnGuardarNuevoDoc');
    const tabActiva = document.querySelector('.doc-tab-btn.active').getAttribute('data-doctab');
    
    if (tabActiva === 'subir') {
        const file = window._docFileActual;
        const nombre = document.getElementById('nuevoDocNombre').value.trim();
        const categoria = document.getElementById('nuevoDocCategoria').value;
        const fecha = document.getElementById('nuevoDocFecha').value;
        const observaciones = document.getElementById('nuevoDocObservaciones').value;
        
        if (!file || !nombre || !categoria || !fecha) {
            alert("Por favor complete todos los campos requeridos y seleccione un archivo.");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = "Subiendo...";

        try {
            const ext = file.name.split('.').pop();
            const ruta = `${_idOrganizacionActDoc}/pacientes/${_idPacienteActDoc}/documentos/${Date.now()}_${nombre.replace(/[^a-zA-Z0-9]/g,'_')}.${ext}`;
            
            // Subir a Storage
            const { error: errSt } = await conexionSupabase.storage
                .from('documentos-pacientes')
                .upload(ruta, file, { upsert: false });
            
            if (errSt) {
                // If bucket doesn't exist or RLS blocks it
                console.error("Storage upload error:", errSt);
                throw new Error("No se pudo subir el archivo. Verifica que el bucket 'documentos-pacientes' exista y permita la subida.");
            }

            const { data: urlData } = conexionSupabase.storage
                .from('documentos-pacientes')
                .getPublicUrl(ruta);

            // Insertar en BD
            const { error: errDB } = await conexionSupabase.from('pacientes_documentos').insert({
                paciente_id: _idPacienteActDoc,
                organizacion_id: _idOrganizacionActDoc,
                nombre_documento: nombre,
                categoria: categoria,
                tipo_archivo: ext,
                tamano_bytes: file.size,
                fecha_documento: fecha,
                observaciones: observaciones,
                url_archivo: urlData.publicUrl
            });

            if (errDB) throw errDB;

            document.getElementById('modalNuevoDocumento').style.display = 'none';
            // Limpiar formulario
            document.getElementById('nuevoDocNombre').value = '';
            document.getElementById('nuevoDocObservaciones').value = '';
            document.getElementById('btnQuitarNuevoDoc').click();
            
            alert("Documento subido con éxito");
            await cargarDocumentosPaciente();

        } catch (error) {
            console.error(error);
            alert("Error al subir documento: " + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = "Guardar Documento";
        }
    }
}

// ==========================================
// GENERACIÓN DE PDF Y GUARDADO AVANZADO
// ==========================================

function _configurarEventosGenerador() {
    const selector = document.getElementById('selectPlantillaGenerar');
    const panel = document.getElementById('panelGeneradorContenido');
    
    if (selector) {
        selector.addEventListener('change', async (e) => {
            const val = e.target.value;
            if (!val) return;

            try {
                // Recuperar información de la BD en vez de hardcodear
                // 1. Paciente y Tutor
                const { data: pacData } = await conexionSupabase
                    .from('pacientes')
                    .select('nombre, especie, raza, sexo, fecha_nacimiento, peso_actual, senas_particulares, clientes(nombre_completo, telefono, correo, direccion)')
                    .eq('id', _idPacienteActDoc)
                    .single();

                // 2. Organización (Clínica)
                const { data: orgData } = await conexionSupabase
                    .from('organizaciones')
                    .select('nombre_legal, rfc_fiscal, logo_url, correo_contacto, sitio_web')
                    .eq('id', _idOrganizacionActDoc)
                    .single();

                // 3. Veterinario actual (perfil logueado)
                const { data: { user } } = await conexionSupabase.auth.getUser();
                let vetNombre = "MVZ Titular";
                let vetCedula = "Pendiente";
                let vetFirma = "";
                if (user) {
                    const { data: perfilData } = await conexionSupabase
                        .from('perfiles')
                        .select('nombre_completo, cedula_profesional, firma_url')
                        .eq('id', user.id)
                        .single();
                    if (perfilData) {
                        vetNombre = perfilData.nombre_completo || vetNombre;
                        if(perfilData.cedula_profesional) vetCedula = perfilData.cedula_profesional;
                        if(perfilData.firma_url) vetFirma = perfilData.firma_url;
                    }
                }

                // Calcular edad si hay fecha de nacimiento
                let edadCalc = "";
                if (pacData?.fecha_nacimiento) {
                    const diffMs = Date.now() - new Date(pacData.fecha_nacimiento).getTime();
                    const ageDt = new Date(diffMs);
                    edadCalc = Math.abs(ageDt.getUTCFullYear() - 1970) + " años";
                }

                // Datos dinámicos a inyectar en la plantilla
                const datosPDF = {
                    tipo_documento: val,
                    nombre_clinica: orgData?.nombre_legal || "Pet Protect Veterinaria",
                    direccion: pacData?.clientes?.direccion || "", // Si la clínica no tiene dirección en la tabla, usamos algo temporal o vacío
                    telefono: pacData?.clientes?.telefono || "",
                    correo: orgData?.correo_contacto || "",
                    rfc: orgData?.rfc_fiscal || "",
                    logo_url: orgData?.logo_url || "",
                    folio_documento: "GEN-" + Math.floor(Math.random() * 10000),
                    fecha_emision: new Date().toLocaleDateString(),
                    nombre_veterinario: vetNombre,
                    cedula_profesional: vetCedula,
                    firma_url: vetFirma,
                    especialidad: "General",
                    propietario_nombre: pacData?.clientes?.nombre_completo || 'Desconocido',
                    propietario_telefono: pacData?.clientes?.telefono || '',
                    propietario_email: pacData?.clientes?.correo || '',
                    paciente_nombre: pacData?.nombre || 'Desconocido',
                    expediente_id: "EXP-" + (_idPacienteActDoc?.slice(0,6).toUpperCase() || "0000"),
                    especie: pacData?.especie || '',
                    raza: pacData?.raza || '',
                    sexo: pacData?.sexo || '',
                    edad: edadCalc,
                    peso: pacData?.peso_actual ? pacData.peso_actual + " kg" : "",
                    senas_particulares: pacData?.senas_particulares || "",
                    motivo_consulta: "Clic para editar...",
                    diagnostico: "Clic para editar...",
                    medicamentos: [
                        { nombre:"Clic para editar", concentracion:"", dosis:"", via:"", frecuencia:"", duracion:"", cantidad:"" }
                    ],
                    observaciones: ["Clic para editar..."],
                    fecha_revision: "", hora_revision: "", motivo_revision: "",
                    motivo_certificado: "salud general",
                    hallazgos_clinicos: "Clínicamente sano al momento de la evaluación.",
                    temperatura: "", frecuencia_cardiaca: "", frecuencia_respiratoria: "",
                    condicion_corporal: "", vigencia: "",
                    procedimiento: "Clic para editar el procedimiento...",
                    riesgos: ["Riesgo anestésico general", "Sangrado"],
                    declaracion: "He sido debidamente informado de los riesgos y alternativas."
                };

                const htmlStr = generarPlantillaAvanzada(val, datosPDF);

                panel.innerHTML = `
                    <div id="documentoGenerableContenedor" style="flex:1; background:#cbd5e1; padding:20px; overflow-y:auto; display:flex; justify-content:center;">
                        ${htmlStr}
                    </div>
                    <div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0;">
                        <input type="text" id="nombreGenerarDoc" placeholder="Nombre para guardar este documento (Ej: Receta_Parvovirus)" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:10px;">
                        <button type="button" class="btn-orange" id="btnProcesarPDFGenerado" style="width:100%;">Generar PDF Inmutable y Guardar</button>
                    </div>
                `;

                document.getElementById('btnProcesarPDFGenerado').addEventListener('click', _procesarYSubirPDF);
            } catch(e) {
                console.error("Error al generar vista:", e);
                alert("Error al cargar datos de la BD: " + e.message);
            }
        });
    }
}

async function _procesarYSubirPDF() {
    const contenedor = document.getElementById('documentoGenerableContenedor');
    const inputNombre = document.getElementById('nombreGenerarDoc');
    let nombreFinal = inputNombre?.value.trim() || 'Documento_Generado';
    const btn = document.getElementById('btnProcesarPDFGenerado');
    const select = document.getElementById('selectPlantillaGenerar');

    if (!contenedor) return;

    btn.disabled = true;
    btn.textContent = "Generando PDF...";

    try {
        // Bloquear edición en todos los elementos antes de generar PDF
        const editables = contenedor.querySelectorAll('[contenteditable="true"]');
        editables.forEach(el => el.setAttribute('contenteditable', 'false'));

        const opt = {
            margin:       0,
            filename:     `${nombreFinal}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Generar Blob PDF en lugar de descargar
        const pdfBlob = await html2pdf().set(opt).from(contenedor).output('blob');

        // Subir a Storage
        btn.textContent = "Subiendo a la nube...";
        const file = new File([pdfBlob], `${nombreFinal}.pdf`, { type: 'application/pdf' });
        
        const ext = 'pdf';
        const ruta = `${_idOrganizacionActDoc}/pacientes/${_idPacienteActDoc}/documentos/${Date.now()}_${nombreFinal.replace(/[^a-zA-Z0-9]/g,'_')}.${ext}`;
        
        const { error: errSt } = await conexionSupabase.storage
            .from('documentos-pacientes')
            .upload(ruta, file, { upsert: false });
        
        if (errSt) throw new Error("No se pudo subir a Storage: " + errSt.message);

        const { data: urlData } = conexionSupabase.storage
            .from('documentos-pacientes')
            .getPublicUrl(ruta);

        // Mapear categoría
        let cat = 'Documentación Clínica';
        if (select.value === 'consentimiento_quirurgico') cat = 'Consentimientos';
        if (select.value === 'certificado_salud') cat = 'Certificados';

        // Guardar BD
        const { error: errDB } = await conexionSupabase.from('pacientes_documentos').insert({
            paciente_id: _idPacienteActDoc,
            organizacion_id: _idOrganizacionActDoc,
            nombre_documento: nombreFinal,
            categoria: cat,
            tipo_archivo: 'pdf',
            tamano_bytes: file.size,
            fecha_documento: new Date().toISOString().split('T')[0],
            observaciones: 'Generado desde el sistema.',
            url_archivo: urlData.publicUrl
        });

        if (errDB) throw errDB;

        alert("Documento generado y guardado exitosamente como PDF inmutable.");
        document.getElementById('modalNuevoDocumento').style.display = 'none';
        
        // Limpiar
        select.value = "";
        document.getElementById('panelGeneradorContenido').innerHTML = '<p style="color:#64748b; text-align:center; margin-top:20px;">Selecciona una plantilla para comenzar a generar.</p>';

        await cargarDocumentosPaciente();

    } catch(e) {
        console.error(e);
        alert("Error: " + e.message);
        const editable = contenedor.querySelector('#tplContenidoEditable');
        if (editable) editable.setAttribute('contenteditable', 'true');
    } finally {
        btn.disabled = false;
        btn.textContent = "Generar PDF Inmutable y Guardar";
    }
}

async function _eliminarDocumento(id) {
    try {
        const { error } = await conexionSupabase.from('pacientes_documentos').delete().eq('id', id);
        if (error) throw error;
        await cargarDocumentosPaciente();
    } catch (e) {
        console.error("Error al eliminar documento:", e);
        alert("No se pudo eliminar el documento.");
    }
}

