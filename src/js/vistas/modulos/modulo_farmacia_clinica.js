/**
 * MÓDULO: Farmacia Clínica (PET PROTECT)
 * DESCRIPCIÓN: Controlador de inventario médico, gestión de lotes, buscador y modal de registro/edición.
 * ARQUITECTURA: Vite / Supabase
 */

export function inicializarFarmacia() {
    console.log("🩺 [FARMACIA] Inicializando sistemas de control de medicamentos...");

    inicializarBuscadorYFiltros();
    configurarModalBentoDinamico(); // Modal de Detalle
    configurarModalNuevoMedicamentoBento(); // Modal de Alta Bento (Reemplaza al tradicional)
}

// ==========================================
// 1. PANEL LATERAL BENTO: NUEVO MEDICAMENTO
// ==========================================
function configurarModalNuevoMedicamentoBento() {
    const btnAbrir = document.getElementById('btn-abrir-modal-medicamento');
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');

    if (!btnAbrir || !contenedorModalDinamico) {
        console.warn("⚠️ [FARMACIA] Botón de nuevo fármaco o contenedor dinámico no encontrado.");
        return;
    }

    btnAbrir.addEventListener('click', () => {
        // Inyectamos el HTML dinámicamente
        contenedorModalDinamico.innerHTML = generarHTMLPanelNuevoMedicamento();

        const modalFondo   = document.getElementById('modal-nuevo-med-bento');
        const btnCerrar    = document.getElementById('btn-cerrar-panel-nuevo-med');
        const formNuevo    = document.getElementById('form-nuevo-med-bento');
        
        // Elementos reactivos
        const inputLote = document.getElementById('med-lote-bento');
        const previewLote = document.getElementById('preview-barcode-med');

        if (!modalFondo) return;

        // --- Lógica de Cierre ---
        const cerrarPanel = () => {
            modalFondo.classList.remove('visible');
            modalFondo.setAttribute('aria-hidden', 'true');
            setTimeout(() => contenedorModalDinamico.innerHTML = '', 350);
        };

        if (btnCerrar) btnCerrar.addEventListener('click', cerrarPanel);
        modalFondo.addEventListener('click', (e) => {
            if (e.target === modalFondo) cerrarPanel();
        });

        // --- Lógica Reactiva (Inteligente) ---
        // Reflejar el número de Lote en el dibujo del código de barras
        if (inputLote && previewLote) {
            inputLote.addEventListener('input', (e) => {
                const valor = e.target.value.trim().toUpperCase();
                previewLote.textContent = valor ? valor : 'L-000000';
            });
        }

        // --- Mostrar el Panel ---
        setTimeout(() => {
            modalFondo.classList.add('visible');
            modalFondo.setAttribute('aria-hidden', 'false');
            setTimeout(() => {
                const primerCampo = document.getElementById('med-nombre-bento');
                if (primerCampo) primerCampo.focus();
            }, 400);
        }, 50);

        // --- Envío del Formulario ---
        if (formNuevo) {
            formNuevo.addEventListener('submit', async (e) => {
                e.preventDefault();

                const inputCaducidad = document.getElementById('med-caducidad-bento').value;
                const fechaCaducidad = new Date(inputCaducidad + 'T00:00:00'); 
                const fechaHoy = new Date();
                fechaHoy.setHours(0, 0, 0, 0); 
                
                // Validación estricta de caducidad médica
                if (fechaCaducidad <= fechaHoy) {
                    alert("⚠️ ALERTA MÉDICA: No puede registrar un lote que ya está caducado o caduca hoy.");
                    document.getElementById('med-caducidad-bento').focus();
                    return;
                }

                const btnGuardar = formNuevo.querySelector('button[type="submit"]');
                const textoOriginal = btnGuardar.innerHTML;

                btnGuardar.disabled = true;
                btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Registrando...`;
                btnGuardar.style.opacity = '0.7';

                const nuevoMedicamento = {
                    nombre: document.getElementById('med-nombre-bento').value.trim(),
                    sustancia: document.getElementById('med-sustancia-bento').value.trim(),
                    via: document.getElementById('med-via-bento').value,
                    presentacion: document.getElementById('med-presentacion-bento').value,
                    lote: document.getElementById('med-lote-bento').value.trim(),
                    caducidad: inputCaducidad,
                    controlado: document.getElementById('med-controlado-bento').checked,
                    unidadMedida: document.getElementById('med-unidad-bento').value,
                    stockInicial: parseFloat(document.getElementById('med-stock-bento').value) || 0,
                    stockMinimo: parseFloat(document.getElementById('med-minimo-bento').value) || 5
                };

                console.log("📦 [FARMACIA] Fármaco listo para guardar:", nuevoMedicamento);

                try {
                    // Simulación de guardado en Supabase
                    await new Promise(resolve => setTimeout(resolve, 1200)); 

                    alert(`✅ ¡Fármaco "${nuevoMedicamento.nombre}" agregado al inventario!`);
                    cerrarPanel();
                } catch (error) {
                    console.error("💥 [ERROR] Fallo al registrar fármaco:", error);
                } finally {
                    btnGuardar.disabled = false;
                    btnGuardar.innerHTML = textoOriginal;
                    btnGuardar.style.opacity = '1';
                }
            });
        }
    });
}

// ==========================================
// 2. GENERADOR HTML BENTO (CLON DE FARMACIA)
// ==========================================
function generarHTMLPanelNuevoMedicamento() {
    return `
    <div class="modal-backdrop-premium modal-lateral-backdrop" id="modal-nuevo-med-bento" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="ventana-modal-bento grande modal-lateral-panel">
            <button class="boton-cerrar-modal-bento btn-cerrar-lateral" id="btn-cerrar-panel-nuevo-med" aria-label="Cerrar formulario">
                <span class="material-symbols-rounded">close</span>
            </button>

            <div class="contenido-interno-modal contenido-scrollable">
                <div class="breadcrumbs">Inventario <span>&gt;</span> Farmacia Clínica <span>&gt;</span> Nuevo Medicamento</div>

                <header class="product-header">
                    <div class="header-title-area">
                        <h1>Registrar Fármaco</h1>
                        <span class="code-chip">Alta Clínica</span>
                    </div>
                </header>

                <form id="form-nuevo-med-bento" novalidate>
                    <div class="dashboard-grid">
                        
                        <div class="grid-column">
                            <div class="card image-gallery-card" style="min-height: 200px;">
                                <div class="image-placeholder" style="background-color: #F0FDF4; height: 100%;">
                                    <span class="material-symbols-rounded" style="font-size: 64px; color: #10B981;">vaccines</span>
                                </div>
                                <p style="font-size:12px; color:var(--text-secondary); margin-top:10px;">Haz clic para subir imagen del producto</p>
                            </div>

                            <div class="card barcode-card">
                                <h3>Código de Lote / Barras</h3>
                                <div class="barcode-svg-container">
                                    <svg width="220" height="80" viewBox="0 0 220 80">
                                        <rect width="220" height="80" fill="#ffffff"/>
                                        <rect x="10" y="5" width="3" height="70" fill="black"/><rect x="15" y="5" width="1" height="70" fill="black"/><rect x="20" y="5" width="4" height="70" fill="black"/><rect x="28" y="5" width="2" height="70" fill="black"/><rect x="34" y="5" width="1" height="70" fill="black"/><rect x="38" y="5" width="5" height="70" fill="black"/><rect x="48" y="5" width="2" height="70" fill="black"/><rect x="58" y="5" width="3" height="70" fill="black"/><rect x="65" y="5" width="4" height="70" fill="black"/><rect x="80" y="5" width="2" height="70" fill="black"/><rect x="92" y="5" width="4" height="70" fill="black"/><rect x="105" y="5" width="3" height="70" fill="black"/><rect x="118" y="5" width="5" height="70" fill="black"/><rect x="130" y="5" width="3" height="70" fill="black"/><rect x="148" y="5" width="2" height="70" fill="black"/><rect x="162" y="5" width="2" height="70" fill="black"/><rect x="172" y="5" width="3" height="70" fill="black"/>
                                    </svg>
                                </div>
                                <div class="barcode-number" id="preview-barcode-med" style="color: var(--text-muted); letter-spacing: 2px;">L-000000</div>
                            </div>
                        </div>

                        <div class="grid-column">
                            
                            <div class="card">
                                <div class="section-header">
                                    <div class="section-title">
                                        <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);">medical_information</span>
                                        Información Farmacológica
                                    </div>
                                </div>
                                
                                <div class="info-grid-2col" style="row-gap: 16px;">
                                    <div style="grid-column: span 2; display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-nombre-bento">Nombre Comercial <span style="color:#ef4444;">*</span></label>
                                        <input id="med-nombre-bento" type="text" placeholder="Ej. Nobivac Múltiple Canina" required style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                                    </div>

                                    <div style="grid-column: span 2; display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-sustancia-bento">Sustancia Activa / Descripción</label>
                                        <input id="med-sustancia-bento" type="text" placeholder="Ej. Virus vivo modificado" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-via-bento">Vía de Administración <span style="color:#ef4444;">*</span></label>
                                        <select id="med-via-bento" required style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                                            <option value="">Seleccionar...</option>
                                            <option value="po">Oral (PO)</option>
                                            <option value="im">Intramuscular (IM)</option>
                                            <option value="iv">Intravenosa (IV)</option>
                                            <option value="sc">Subcutánea (SC)</option>
                                            <option value="topico">Tópico / Oftálmico</option>
                                        </select>
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-presentacion-bento">Presentación</label>
                                        <select id="med-presentacion-bento" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                                            <option value="vial">Vial / Dosis</option>
                                            <option value="frasco_ml">Frasco (Líquido)</option>
                                            <option value="caja_tabs">Caja (Tabletas)</option>
                                        </select>
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-lote-bento">Número de Lote <span style="color:#ef4444;">*</span></label>
                                        <input id="med-lote-bento" type="text" placeholder="Ej. L-89452" required style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; font-family: monospace; font-size: 14px; letter-spacing: 1px;">
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-caducidad-bento">Fecha de Caducidad <span style="color:#ef4444;">*</span></label>
                                        <input id="med-caducidad-bento" type="date" required style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; color:#EF4444; font-weight:600;">
                                    </div>
                                    
                                    <div style="grid-column: span 2; margin-top: 8px;">
                                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: #FEF2F2; border-radius: 8px; border: 1px solid #FCA5A5;">
                                            <input type="checkbox" id="med-controlado-bento" style="width: 20px; height: 20px; accent-color: #EF4444;">
                                            <span style="color: #991B1B; font-weight: 600; font-size: 13px;">⚠️ Medicamento Controlado (Requiere receta retenida)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="section-header">
                                    <div class="section-title">
                                        <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);">inventory_2</span>
                                        Control de Inventario
                                    </div>
                                </div>
                                <div class="info-grid-2col" style="row-gap: 16px;">
                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-unidad-bento">Unidad de Medida (Consumo) <span style="color:#ef4444;">*</span></label>
                                        <select id="med-unidad-bento" required style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                                            <option value="ml">Mililitros (ml)</option>
                                            <option value="mg">Miligramos (mg)</option>
                                            <option value="dosis">Dosis</option>
                                            <option value="tabs">Tabletas</option>
                                        </select>
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;"></div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-stock-bento">Stock Inicial</label>
                                        <input id="med-stock-bento" type="number" step="0.01" placeholder="0.00" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="med-minimo-bento">Alerta de Stock Mínimo</label>
                                        <input id="med-minimo-bento" type="number" placeholder="5" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:4px;">
                                <button type="button" class="btn btn-outline" onclick="document.getElementById('btn-cerrar-panel-nuevo-med').click()">Cancelar</button>
                                <button type="submit" class="btn btn-primary" style="min-width:140px;">
                                    <span class="material-symbols-rounded" style="font-size:16px; vertical-align:middle; margin-right:4px;">save</span> Guardar Fármaco
                                </button>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
}

// ==========================================
// 3. BUSCADOR Y FILTROS EN TIEMPO REAL
// ==========================================
function inicializarBuscadorYFiltros() {
    const inputBusqueda = document.querySelector('.buscador-universal-bento input');
    const selectFiltro = document.querySelector('.filtros-tabla select');
    const filasTabla = document.querySelectorAll('.tabla-saas tbody tr');

    if (!inputBusqueda || !selectFiltro || filasTabla.length === 0) return;

    const aplicarFiltros = () => {
        const terminoBusqueda = inputBusqueda.value.toLowerCase().trim();
        const criterioFiltro = selectFiltro.value;

        filasTabla.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            const cumpleBusqueda = textoFila.includes(terminoBusqueda);

            let cumpleFiltro = true;
            const badgeEstado = fila.querySelector('.badge-estado');
            
            if (criterioFiltro !== 'todos' && badgeEstado) {
                if (criterioFiltro === 'critico' && !badgeEstado.classList.contains('critico')) cumpleFiltro = false;
                if (criterioFiltro === 'caducar' && !badgeEstado.classList.contains('advertencia')) cumpleFiltro = false;
            }

            fila.style.display = (cumpleBusqueda && cumpleFiltro) ? '' : 'none';
        });
    };

    inputBusqueda.addEventListener('input', aplicarFiltros);
    selectFiltro.addEventListener('change', aplicarFiltros);
}

// ==========================================================================
// 4. MODAL BENTO DINÁMICO (DETALLE / EDICIÓN DE PRODUCTO)
// ==========================================================================
function configurarModalBentoDinamico() {
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');
    const contenedorTabla = document.querySelector('.tabla-contenedor');

    if (contenedorTabla && contenedorModalDinamico) {
        contenedorTabla.addEventListener('click', async (e) => {
            const botonEditar = e.target.closest('.boton-fantasma-icono');
            
            if (botonEditar) {
                e.preventDefault();
                console.log("🛠️ [FARMACIA] Solicitando historia clínica del fármaco (Panel Bento)...");
                botonEditar.style.opacity = '0.5';

                try {
                    const basePath = window.location.pathname.includes('/PETPROTECT') ? '/PETPROTECT' : '';
                    const rutaModal = `${basePath}/MODAL_INFORMACIÓN_PRODUCTO.html`;

                    const respuesta = await fetch(rutaModal);
                    if (!respuesta.ok) throw new Error("Fallo al obtener el layout del panel Bento.");
                    
                    const htmlModal = await respuesta.text();
                    contenedorModalDinamico.innerHTML = htmlModal;

                    const overlay = document.getElementById('estudioOverlay');
                    const panel = document.getElementById('panelDetalleProducto');
                    const btnCerrarPanel = document.getElementById('btn-cerrar-panel-detalle');

                    if (overlay && panel) {
                        const cerrarPanelBento = () => {
                            panel.classList.remove('abierto');
                            overlay.classList.remove('abierto');
                            setTimeout(() => {
                                contenedorModalDinamico.innerHTML = '';
                            }, 300);
                        };

                        if (btnCerrarPanel) btnCerrarPanel.addEventListener('click', cerrarPanelBento);
                        
                        overlay.addEventListener('click', (evento) => {
                            if (evento.target === overlay) cerrarPanelBento();
                        });

                        setTimeout(() => {
                            overlay.classList.add('abierto');
                            panel.classList.add('abierto');
                            botonEditar.style.opacity = '1';
                        }, 50);
                    }

                } catch (error) {
                    console.error("💥 [ERROR] No se pudo levantar el panel Bento:", error);
                    alert("Error de conexión al cargar la información médica del producto. Revisa la ruta del archivo.");
                    botonEditar.style.opacity = '1';
                }
            }
        });
    }
}