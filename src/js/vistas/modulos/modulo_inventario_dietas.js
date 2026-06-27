/**
 * MODULO: Inventario de Dietas (PET PROTECT)
 * DESCRIPCION: Gestion de dietas de prescripcion.
 * ARQUITECTURA: Vite / Supabase
 */

import { conexionSupabase, obtenerUsuarioActual } from '../../infraestructura/conexion.js';

// Cache del perfil del usuario autenticado (organizacion, sucursal, id)
let perfilUsuarioActivo = null;

export async function inicializarInventarioDietas() {
    console.log("[DIETAS] Inicializando catalogo de dietas de prescripcion...");

    try {
        const usuario = await obtenerUsuarioActual();
        if (!usuario) throw new Error('Sin sesion activa');

        const { data: perfil, error } = await conexionSupabase
            .from('perfiles')
            .select('id, organizacion_id, sucursal_id, rol')
            .eq('id', usuario.id)
            .single();

        if (error || !perfil) throw new Error('Perfil no encontrado');
        perfilUsuarioActivo = perfil;
    } catch (err) {
        console.error('[DIETAS] Error critico de identidad:', err.message);
        return; 
    }

    inicializarBuscadorYFiltrosDietas();
    configurarModalBentoDinamicoDietas(); 
    configurarModalNuevoProductoDietas(); 
    inicializarImpresionEtiquetasDietas();
    
    // Cargar la tabla al iniciar el modulo
    cargarProductosDietas();

    // 🛡️ Listener global para Notificaciones Interactivas (Solo se registra una vez)
    if (!window._listenerAlertaInventarioDietas) {
        window.addEventListener('petprotect:abrir_inventario_desde_alerta', (e) => {
            const id = e.detail.id;
            console.log("[DIETAS] Abriendo modal desde alerta interactiva:", id);
            configurarModalEditarDieta(id);
        });
        window._listenerAlertaInventarioDietas = true;
    }
}

// ==========================================
// 1. RECUPERAR DATOS DE SUPABASE (TABLA)
// ==========================================
async function cargarProductosDietas() {
    const tbody = document.getElementById('tbody-dietas');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="texto-centro">Cargando dietas...</td></tr>';

    try {
        if (!perfilUsuarioActivo?.organizacion_id) {
            tbody.innerHTML = '<tr><td colspan="7" class="texto-centro texto-peligro">Error: No se pudo identificar tu clinica. Recarga la pagina.</td></tr>';
            return;
        }

        const { data: productos, error } = await conexionSupabase
            .from('inventario_productos')
            .select('*')
            .eq('organizacion_id', perfilUsuarioActivo.organizacion_id)
            .eq('categoria', 'dietas')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!productos || productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="texto-centro" style="color: var(--text-muted);">No hay dietas registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = ''; 

        productos.forEach(prod => {
            const tr = document.createElement('tr');
            
            const nombre = prod.nombre_comercial || 'Dieta sin nombre';
            const precio = prod.precio_venta ? `$${parseFloat(prod.precio_venta).toFixed(2)}` : '$0.00';
            const stock = parseFloat(prod.stock_total) || 0;
            const stockMin = parseFloat(prod.stock_minimo) || 5;
            const sku = prod.codigo_barras || 'SIN-SKU';
            
            const marca = prod.metadata?.marca || 'N/A';
            const indicacion = prod.metadata?.subcategoria || 'otra';
            const indicacionTexto = formatIndicacion(indicacion);
            const especie = prod.metadata?.especie || 'N/A';
            const presentacion = (prod.metadata?.peso && prod.metadata?.unidad_peso) 
                                 ? `${prod.unidad_medida || 'Bolsa'} ${prod.metadata.peso} ${prod.metadata.unidad_peso}` 
                                 : (prod.unidad_medida || 'N/A');

            let badgeEstado = '';
            if (stock > stockMin) badgeEstado = '<span class="badge-stock optimo" style="font-weight:bold; padding:4px 8px; border-radius:4px; background:#D1FAE5; color:#10B981;">Óptimo</span>';
            else if (stock > 0) badgeEstado = '<span class="badge-stock critico" style="font-weight:bold; padding:4px 8px; border-radius:4px; background:#FEF3C7; color:#F59E0B;">Agotándose</span>';
            else badgeEstado = '<span class="badge-stock agotado" style="font-weight:bold; padding:4px 8px; border-radius:4px; background:#FEE2E2; color:#EF4444;">Agotado</span>';

            tr.innerHTML = `
                <td>
                    <div class="celda-producto">
                        <span class="icono-producto material-symbols-rounded">nutrition</span>
                        <div class="info-texto">
                            <strong>${nombre}</strong>
                            <small>${marca}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="etiqueta-categoria ${indicacion}">${indicacionTexto}</span>
                </td>
                <td>
                    <span style="display:flex; align-items:center; gap:4px; font-size:13px;">
                        <span class="material-symbols-rounded" style="font-size:16px; color:#6b7280;">pets</span> ${especie}
                    </span>
                </td>
                <td>${presentacion}</td>
                <td class="texto-derecha ${stock <= stockMin ? 'texto-peligro' : ''}"><strong>${stock}</strong> <small>Unids.</small></td>
                <td class="texto-centro">${badgeEstado}</td>
                <td class="texto-centro acciones-celda">
                    <button class="boton-fantasma-icono btn-imprimir-etiqueta" data-sku="${sku}" title="Imprimir Etiqueta" style="background:rgba(137, 194, 217, 0.15); border:none; color:var(--cobalto); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">print</span>
                    </button>
                    <button class="boton-fantasma-icono btn-editar-dieta" data-id="${prod.id}" title="Editar" style="background:rgba(242, 116, 5, 0.15); border:none; color:var(--naranja); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">edit</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        inicializarBuscadorYFiltrosDietas();

    } catch (error) {
        console.error("[ERROR] Fallo al recuperar dietas:", error.message);
        tbody.innerHTML = '<tr><td colspan="7" class="texto-centro texto-peligro">Error de conexion al cargar las dietas.</td></tr>';
    }
}

function formatIndicacion(val) {
    const dict = {
        'renal': 'Soporte Renal',
        'hepatica': 'Soporte Hepático',
        'digestiva': 'Digestivo Sensible',
        'cardiaca': 'Soporte Cardíaco',
        'obesidad': 'Control de Peso',
        'dermatologica': 'Dermatológica',
        'urinaria': 'Urinaria',
        'articular': 'Articular / Movilidad'
    };
    return dict[val] || 'Otra Indicación';
}

// ==========================================
// 2. BUSCADOR Y FILTROS EN TIEMPO REAL
// ==========================================
function inicializarBuscadorYFiltrosDietas() {
    const inputBusqueda = document.getElementById('input-busqueda-dieta');
    const selectFiltro = document.getElementById('select-filtro-dieta');
    const filasTabla = document.querySelectorAll('#tabla-productos-dietas tbody tr');
    const divVacio = document.getElementById('estado-vacio-dietas');

    if (!inputBusqueda || !selectFiltro || filasTabla.length === 0) return;

    const aplicarFiltros = () => {
        const terminoBusqueda = inputBusqueda.value.toLowerCase().trim();
        const criterioCategoria = selectFiltro.value.toLowerCase();
        let visibles = 0;

        filasTabla.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            const cumpleBusqueda = textoFila.includes(terminoBusqueda);
            
            let cumpleFiltro = true;
            if (criterioCategoria !== 'todos') {
                const celdaIndicacion = fila.querySelector('.etiqueta-categoria');
                if (celdaIndicacion) {
                    cumpleFiltro = celdaIndicacion.classList.contains(criterioCategoria);
                }
            }
            if (cumpleBusqueda && cumpleFiltro) {
                fila.style.display = '';
                visibles++;
            } else {
                fila.style.display = 'none';
            }
        });
        
        if (divVacio) {
            divVacio.style.display = visibles === 0 ? 'block' : 'none';
        }
    };

    inputBusqueda.addEventListener('input', aplicarFiltros);
    selectFiltro.addEventListener('change', aplicarFiltros);
}

// ==========================================
// 3. PANEL LATERAL BENTO: NUEVA DIETA
// ==========================================
function configurarModalNuevoProductoDietas() {
    const btnAbrir = document.getElementById('btn-abrir-modal-dieta');
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');

    if (!btnAbrir || !contenedorModalDinamico) return;

    btnAbrir.addEventListener('click', () => {
        contenedorModalDinamico.innerHTML = generarHTMLPanelNuevaDieta();

        const overlay = document.getElementById('nuevaDietaOverlay');
        const modalFondo = document.getElementById('modal-nueva-dieta-bento');
        const btnCerrar = document.getElementById('btn-cerrar-panel-nueva-dieta');
        const formNuevo = document.getElementById('form-nueva-dieta-bento');

        if (!modalFondo || !overlay) return;

        const cerrarPanel = () => {
            modalFondo.classList.remove('abierto');
            overlay.classList.remove('abierto');
            setTimeout(() => contenedorModalDinamico.innerHTML = '', 350);
        };

        if (btnCerrar) btnCerrar.addEventListener('click', cerrarPanel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrarPanel();
        });

        // Lógica de Imagen
        const contenedorImagen = document.getElementById('contenedor-imagen-bento');
        const inputImagen = document.getElementById('input-imagen-dieta');
        const placeholderImagen = document.getElementById('placeholder-imagen');
        const previewImagen = document.getElementById('preview-imagen-dieta');
        const btnRemoverImagen = document.getElementById('btn-remover-imagen');
        
        let imagenBase64 = null;

        if (contenedorImagen && inputImagen) {
            contenedorImagen.addEventListener('click', (e) => {
                if (e.target !== btnRemoverImagen && !btnRemoverImagen.contains(e.target)) {
                    inputImagen.click();
                }
            });

            inputImagen.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(eventoLectura) {
                        const img = new Image();
                        img.onload = function() {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                            imagenBase64 = canvas.toDataURL('image/jpeg', 0.95);
                            previewImagen.src = imagenBase64;
                            previewImagen.style.display = 'block';
                            placeholderImagen.style.display = 'none';
                            btnRemoverImagen.style.display = 'flex';
                        };
                        img.src = eventoLectura.target.result;
                    }
                    reader.readAsDataURL(file);
                }
            });

            btnRemoverImagen.addEventListener('click', (e) => {
                e.stopPropagation(); 
                inputImagen.value = '';
                imagenBase64 = null;
                previewImagen.src = '';
                previewImagen.style.display = 'none';
                placeholderImagen.style.display = 'flex';
                btnRemoverImagen.style.display = 'none';
            });
        }

        // Lógica Precio Sugerido
        const costoInput = document.getElementById('dieta-costo-bento');
        const precioInput = document.getElementById('dieta-precio-bento');
        const precioBaseInput = document.getElementById('dieta-precio-base-bento');

        // Sincronización Base <-> Final con IVA dinámico
        const ivaToggle = document.getElementById('dieta-aplica-iva-bento');
        const ivaLabel = document.getElementById('dieta-label-iva-bento');

        const recalcularPrecios = (origen) => {
            const aplica = ivaToggle ? ivaToggle.checked : true;
            const factor = aplica ? 1.16 : 1.0;
            
            if (ivaLabel) {
                ivaLabel.innerHTML = aplica ? 'P. Final (16% IVA inc.) <span style="color:#F27405;">*</span>' : 'P. Final (Sin IVA) <span style="color:#F27405;">*</span>';
            }

            if (origen === 'base') {
                const base = parseFloat(precioBaseInput.value) || 0;
                precioInput.value = (base * factor).toFixed(2);
            } else if (origen === 'final') {
                const final = parseFloat(precioInput.value) || 0;
                precioBaseInput.value = (final / factor).toFixed(2);
            } else if (origen === 'toggle') {
                const base = parseFloat(precioBaseInput.value) || 0;
                if(precioInput.dataset.modificado === 'true' && precioBaseInput.dataset.modificado !== 'true') {
                     const final = parseFloat(precioInput.value) || 0;
                     precioBaseInput.value = (final / factor).toFixed(2);
                } else {
                     precioInput.value = (base * factor).toFixed(2);
                }
            }
        };

        if (ivaToggle) {
            ivaToggle.addEventListener('change', () => recalcularPrecios('toggle'));
        }

        if(precioBaseInput && precioInput) {
            precioBaseInput.addEventListener('input', (e) => {
                if (e.isTrusted) precioBaseInput.dataset.modificado = 'true';
                recalcularPrecios('base');
            });
            precioInput.addEventListener('input', (e) => {
                if (e.isTrusted) precioInput.dataset.modificado = 'true';
                recalcularPrecios('final');
            });
        }

        const sugerenciaSpan = document.createElement('div');
        sugerenciaSpan.style = "font-size: 11px; color: #6b7280; margin-top: 4px;";
        precioInput.parentNode.appendChild(sugerenciaSpan);

        const calcularSugerenciaPrecio = () => {
            const costo = parseFloat(costoInput.value);
            if (isNaN(costo) || costo <= 0) {
                sugerenciaSpan.innerHTML = "";
                return;
            }
            const margenEsperado = 0.25; 
            const precioSinIva = costo / (1 - margenEsperado);
            const precioSugeridoConIva = precioSinIva * 1.16;
            const gananciaBruta = precioSinIva - costo;
            const roi = (gananciaBruta / costo) * 100;

            sugerenciaSpan.innerHTML = `Sugerido: <strong>$${precioSugeridoConIva.toFixed(2)} MXN</strong> (Margen: ${margenEsperado*100}%, ROI: ${roi.toFixed(1)}%, IVA 16% inc.) <button type="button" id="btn-aplicar-sugerido-alta" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;

            const btnAplicar = document.getElementById('btn-aplicar-sugerido-alta');
            if (btnAplicar) {
                btnAplicar.addEventListener('click', (eventoBtn) => {
                    eventoBtn.preventDefault();
                    precioInput.value = precioSugeridoConIva.toFixed(2);
                    precioInput.dispatchEvent(new Event('input')); // Dispara la sincronización
                });
            }

            if (!precioInput.value) {
                precioInput.value = precioSugeridoConIva.toFixed(2);
            }
        };

        costoInput.addEventListener('input', calcularSugerenciaPrecio);

        // Mostrar panel
        setTimeout(() => {
            overlay.classList.add('abierto');
            modalFondo.classList.add('abierto');
            setTimeout(() => {
                const primerCampo = document.getElementById('dieta-nombre-bento');
                if (primerCampo) primerCampo.focus();
            }, 400);
        }, 50);

        // Envío Formulario
        if (formNuevo) {
            formNuevo.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nombreInput = document.getElementById('dieta-nombre-bento').value.trim();
                const indicacionInput = document.getElementById('dieta-indicacion-bento').value;
                const especieInput = document.getElementById('dieta-especie-bento').value;
                const presentacionInput = document.getElementById('dieta-presentacion-bento').value;
                const precioInputVal = parseFloat(precioInput.value);

                if (!nombreInput || !indicacionInput || !especieInput || isNaN(precioInputVal) || precioInputVal <= 0) {
                    alert("Por favor, completa todos los campos obligatorios correctamente.");
                    return;
                }

                const btnGuardar = formNuevo.querySelector('button[type="submit"]');
                const textoOriginal = btnGuardar.innerHTML;
                btnGuardar.disabled = true;
                btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Guardando...`;

                const skuFinal = document.getElementById('dieta-sku-bento').value.trim() || "VP-DIE-" + Date.now().toString().slice(-6);
                const stockInicial = parseInt(document.getElementById('dieta-stock-bento').value) || 0;
                
                try {
                    if (!perfilUsuarioActivo?.organizacion_id) throw new Error('Sin clínica');

                    const insertSQL = {
                        organizacion_id: perfilUsuarioActivo.organizacion_id,
                        sucursal_id: perfilUsuarioActivo.sucursal_id,
                        created_by: perfilUsuarioActivo.id,
                        categoria: 'dietas',
                        nombre_comercial: nombreInput,
                        unidad_medida: presentacionInput, 
                        precio_venta: precioInputVal,
                        codigo_barras: skuFinal,
                        stock_total: stockInicial,
                        stock_minimo: parseInt(document.getElementById('dieta-reorden-bento').value) || 5,
                        imagen_url: imagenBase64,
                        metadata: {
                            indicacion: indicacionInput,
                            marca: document.getElementById('dieta-marca-bento').value.trim(),
                            especie: especieInput,
                            tipo: document.getElementById('dieta-tipo-bento').value,
                            etapa: document.getElementById('dieta-etapa-bento').value,
                            costoProveedor: parseFloat(costoInput.value) || 0,
                            precioBase: parseFloat(precioBaseInput.value) || 0,
                            aplica_iva: true
                        }
                    };

                    const { data: prodInsertado, error: errCat } = await conexionSupabase
                        .from('inventario_productos')
                        .insert([insertSQL])
                        .select('id').single();

                    if (errCat) throw errCat;

                    if (stockInicial > 0) {
                        await conexionSupabase.from('inventario_movimientos').insert([{
                            organizacion_id: perfilUsuarioActivo.organizacion_id,
                            sucursal_id: perfilUsuarioActivo.sucursal_id,
                            producto_id: prodInsertado.id,
                            tipo_movimiento: 'entrada_compra',
                            cantidad: stockInicial,
                            created_by: perfilUsuarioActivo.id
                        }]);
                    }

                    alert(`Dieta "${nombreInput}" agregada exitosamente.\nSKU: ${skuFinal}`);
                    cerrarPanel();
                    cargarProductosDietas();

                } catch (error) {
                    console.error("[ERROR] Fallo al registrar en BD:", error);
                    alert("Ocurrio un error al guardar la dieta.");
                } finally {
                    btnGuardar.disabled = false;
                    btnGuardar.innerHTML = textoOriginal;
                }
            });
        }
    });
}

// ==========================================
// 4. GENERADOR HTML BENTO - NUEVA DIETA
// ==========================================
function generarHTMLPanelNuevaDieta() {
    return `
    <div class="notif-overlay" id="nuevaDietaOverlay" aria-hidden="true"></div>

    <aside class="panel-notificaciones" id="modal-nueva-dieta-bento" role="dialog" aria-modal="true" aria-label="Nueva Dieta" style="z-index: 1210;">
        <div class="notif-header">
            <div class="notif-header-top">
                <div>
                    <p style="font-size:0.72rem; color:#89C2D9; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 6px;">Inventario › Dietas Rx</p>
                    <h2 class="notif-titulo">Nueva Dieta Médica</h2>
                </div>
                <div class="notif-header-acciones">
                    <button type="button" class="notif-btn-icono" id="btn-cerrar-panel-nueva-dieta" title="Cerrar panel">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
            </div>
            <p class="notif-resumen">Registrar alimento de prescripción</p>
        </div>

        <div class="notif-cuerpo" style="padding:24px;">
            <form id="form-nueva-dieta-bento" style="display:flex; flex-direction:column; gap:16px;" novalidate>
                
                <!-- Subida de Imagen -->
                <div id="contenedor-imagen-bento" style="width:100%; min-height:160px; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border:1.5px dashed #c2d4df; border-radius:12px; background:#f4f7fe; transition:all 0.3s ease;">
                    <input type="file" id="input-imagen-dieta" accept="image/png, image/jpeg, image/webp" style="display:none;">
                    
                    <div id="placeholder-imagen" style="padding:20px; display:flex; flex-direction:column; align-items:center;">
                        <div style="background:#FEF2F2; width:50px; height:50px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin-bottom:10px;">
                            <span class="material-symbols-rounded" style="font-size:24px; color:#EF4444;">add_photo_alternate</span>
                        </div>
                        <p style="font-size:13px; font-weight:700; color:#032F40; margin-bottom:4px;">Haz clic para subir imagen</p>
                        <p style="font-size:11px; color:#8da5b5;">Fondo blanco transparente recomendado</p>
                    </div>
                    
                    <img id="preview-imagen-dieta" src="" alt="Vista previa" style="display:none; width:100%; height:100%; object-fit:contain; background-color:white; position:absolute; top:0; left:0; border-radius:10px;">
                    
                    <div id="btn-remover-imagen" style="display:none; position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:28px; height:28px; justify-content:center; align-items:center; cursor:pointer; backdrop-filter:blur(4px);">
                        <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                    </div>
                </div>

                <!-- Detalles Clínicos -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Nombre de la Dieta <span style="color:#F27405;">*</span></label>
                    <input id="dieta-nombre-bento" type="text" placeholder="Ej. Royal Canin Renal Feline" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Marca <span style="color:#F27405;">*</span></label>
                        <input id="dieta-marca-bento" type="text" placeholder="Ej. Royal Canin" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Indicación Médica <span style="color:#F27405;">*</span></label>
                        <select id="dieta-indicacion-bento" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="renal">Soporte Renal</option>
                            <option value="hepatica">Soporte Hepático</option>
                            <option value="digestiva">Digestivo Sensible</option>
                            <option value="cardiaca">Soporte Cardíaco</option>
                            <option value="obesidad">Control de Peso</option>
                            <option value="dermatologica">Dermatológica</option>
                            <option value="urinaria">Urinaria / Cristales</option>
                            <option value="articular">Movilidad / Articular</option>
                            <option value="recuperacion">Recuperación / Convalecencia</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Tipo <span style="color:#F27405;">*</span></label>
                        <select id="dieta-tipo-bento" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="seco">Alimento Seco (Croqueta)</option>
                            <option value="humedo">Alimento Húmedo (Lata/Sobre)</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Presentación (KG/GR) <span style="color:#F27405;">*</span></label>
                        <input id="dieta-presentacion-bento" type="text" placeholder="Ej. 1.5 KG" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Especie Objetivo</label>
                        <select id="dieta-especie-bento" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="Perro">Perro</option>
                            <option value="Gato">Gato</option>
                            <option value="Ambos">Ambos</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Etapa de Vida</label>
                        <select id="dieta-etapa-bento" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="Todas">Todas las etapas</option>
                            <option value="Cachorro">Cachorro / Kitten</option>
                            <option value="Adulto">Adulto</option>
                            <option value="Senior">Senior</option>
                        </select>
                    </div>
                </div>

                <!-- Financiero & Stock -->
                <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>

                <div style="display:flex; justify-content:flex-end; margin-bottom: 10px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Aplica IVA (16%)</span>
                        <input type="checkbox" id="dieta-aplica-iva-bento" checked style="accent-color: #032F40; width: 16px; height: 16px;">
                    </label>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Costo Proveedor ($) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-costo-bento" type="number" step="0.01" min="0" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">P. Base ($) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-precio-base-bento" type="number" step="0.01" min="0" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div>
                        <label id="dieta-label-iva-bento" style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">P. Final (16% IVA inc.) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-precio-bento" type="number" step="0.01" min="0" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; color:#10B981; font-weight:bold;">
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Stock Inicial <span style="color:#F27405;">*</span></label>
                        <input id="dieta-stock-bento" type="number" min="0" required placeholder="0" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Punto Reorden <span style="color:#F27405;">*</span></label>
                        <input id="dieta-reorden-bento" type="number" min="1" required placeholder="5" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Código de Barras / SKU <span style="color:#F27405;">*</span></label>
                    <input id="dieta-sku-bento" type="text" required placeholder="Ej. RX-RC-REN-01" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>
            </form>
        </div>

        <div class="notif-footer">
            <div></div>
            <button type="submit" form="form-nueva-dieta-bento" class="notif-footer-btn primario" style="background:#F27405; display:flex; align-items:center; gap:6px; padding:10px 22px;">
                <span class="material-symbols-rounded" style="font-size:18px;">save</span> Guardar
            </button>
        </div>
    </aside>
    `;
}

// ==========================================
// 4. PANEL LATERAL (EDICIÓN)
// ==========================================
function configurarModalBentoDinamicoDietas() {
    const tablaProductos = document.getElementById('tabla-productos-dietas');
    if (tablaProductos) {
        tablaProductos.addEventListener('click', async (e) => {
            const botonEditar = e.target.closest('.btn-editar-dieta');
            if (botonEditar) {
                e.preventDefault();
                const productoId = botonEditar.getAttribute('data-id');
                if (!productoId) return;

                botonEditar.style.opacity = '0.5';
                await configurarModalEditarDieta(productoId);
                botonEditar.style.opacity = '1';
            }
        });
    }
}

async function configurarModalEditarDieta(productoId) {
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');
    if (!contenedorModalDinamico) return;

    try {
        const { data: prod, error } = await conexionSupabase
            .from('inventario_productos')
            .select('*')
            .eq('id', productoId)
            .single();

        if (error || !prod) throw error || new Error("Dieta no encontrada.");

        contenedorModalDinamico.innerHTML = generarHTMLPanelEditarDieta(prod);

        const overlay = document.getElementById('editarDietaOverlay');
        const modalFondo = document.getElementById('modal-editar-dieta-bento');
        const btnCerrar = document.getElementById('btn-cerrar-panel-editar-dieta');
        const formEditar = document.getElementById('form-editar-dieta-bento');

        if (!modalFondo || !overlay) return;

        const cerrarPanel = () => {
            modalFondo.classList.remove('abierto');
            overlay.classList.remove('abierto');
            setTimeout(() => contenedorModalDinamico.innerHTML = '', 350);
        };

        if (btnCerrar) btnCerrar.addEventListener('click', cerrarPanel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrarPanel();
        });

        // Imagen
        const contenedorImagen = document.getElementById('contenedor-imagen-bento-edit');
        const inputImagen = document.getElementById('input-imagen-dieta-edit');
        const placeholderImagen = document.getElementById('placeholder-imagen-edit');
        const previewImagen = document.getElementById('preview-imagen-dieta-edit');
        const btnRemoverImagen = document.getElementById('btn-remover-imagen-edit');
        
        let imagenBase64 = prod.imagen_url || null;

        if (contenedorImagen && inputImagen) {
            contenedorImagen.addEventListener('click', (e) => {
                if (e.target !== btnRemoverImagen && !btnRemoverImagen.contains(e.target)) {
                    inputImagen.click();
                }
            });

            inputImagen.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(eventoLectura) {
                        const img = new Image();
                        img.onload = function() {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                            imagenBase64 = canvas.toDataURL('image/jpeg', 0.95);
                            previewImagen.src = imagenBase64;
                            previewImagen.style.display = 'block';
                            placeholderImagen.style.display = 'none';
                            btnRemoverImagen.style.display = 'flex';
                        };
                        img.src = eventoLectura.target.result;
                    }
                    reader.readAsDataURL(file);
                }
            });

            btnRemoverImagen.addEventListener('click', (e) => {
                e.stopPropagation(); 
                inputImagen.value = '';
                imagenBase64 = null;
                previewImagen.src = '';
                previewImagen.style.display = 'none';
                placeholderImagen.style.display = 'flex';
                btnRemoverImagen.style.display = 'none';
            });
        }

        const costoInputEdit = document.getElementById('dieta-costo-bento-edit');
        const precioInputEdit = document.getElementById('dieta-precio-bento-edit');
        const precioBaseInputEdit = document.getElementById('dieta-precio-base-bento-edit');

        if(precioBaseInputEdit && precioInputEdit) {
            precioBaseInputEdit.addEventListener('input', () => {
                const base = parseFloat(precioBaseInputEdit.value) || 0;
                precioInputEdit.value = (base * 1.16).toFixed(2);
            });
            precioInputEdit.addEventListener('input', () => {
                const final = parseFloat(precioInputEdit.value) || 0;
                precioBaseInputEdit.value = (final / 1.16).toFixed(2);
            });
        }
        
        const sugerenciaSpanEdit = document.createElement('div');
        sugerenciaSpanEdit.style = "font-size: 11px; color: #6b7280; margin-top: 4px;";
        if (precioInputEdit) {
            precioInputEdit.parentNode.appendChild(sugerenciaSpanEdit);
            const calcularSugerenciaPrecioEdit = () => {
                const costo = parseFloat(costoInputEdit.value);
                if (isNaN(costo) || costo <= 0) {
                    sugerenciaSpanEdit.innerHTML = "";
                    return;
                }
                const margenEsperado = 0.25; 
                const precioSinIva = costo / (1 - margenEsperado);
                const precioSugeridoConIva = precioSinIva * 1.16;
                const gananciaBruta = precioSinIva - costo;
                const roi = (gananciaBruta / costo) * 100;
    
                sugerenciaSpanEdit.innerHTML = `Sugerido: <strong>$${precioSugeridoConIva.toFixed(2)} MXN</strong> (Margen: ${margenEsperado*100}%, ROI: ${roi.toFixed(1)}%, IVA 16% inc.) <button type="button" id="btn-aplicar-sugerido-edit" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;
    
                const btnAplicar = document.getElementById('btn-aplicar-sugerido-edit');
                if (btnAplicar) {
                    btnAplicar.addEventListener('click', (eventoBtn) => {
                        eventoBtn.preventDefault();
                        precioInputEdit.value = precioSugeridoConIva.toFixed(2);
                        precioInputEdit.dispatchEvent(new Event('input')); // Dispara la sincronización
                    });
                }
            };
            costoInputEdit.addEventListener('input', calcularSugerenciaPrecioEdit);
            calcularSugerenciaPrecioEdit(); // Ejecución inicial
        }

        setTimeout(() => {
            overlay.classList.add('abierto');
            modalFondo.classList.add('abierto');
        }, 50);

        if (formEditar) {
            formEditar.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nombreInput = document.getElementById('dieta-nombre-bento-edit').value.trim();
                const indicacionInput = document.getElementById('dieta-indicacion-bento-edit').value;
                const especieInput = document.getElementById('dieta-especie-bento-edit').value;
                const presentacionInput = document.getElementById('dieta-presentacion-bento-edit').value;
                const precioInputVal = parseFloat(document.getElementById('dieta-precio-bento-edit').value);

                if (!nombreInput || !indicacionInput || !especieInput || isNaN(precioInputVal) || precioInputVal <= 0) {
                    alert("Por favor, completa todos los campos obligatorios correctamente.");
                    return;
                }

                const btnGuardar = formEditar.querySelector('button[type="submit"]');
                const textoOriginal = btnGuardar.innerHTML;
                btnGuardar.disabled = true;
                btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Guardando...`;

                try {
                    if (!perfilUsuarioActivo?.organizacion_id) throw new Error("Sin clinica");

                    const ingresoStockNuevo = parseInt(document.getElementById('dieta-nuevo-stock-bento').value) || 0;
                    const stockFinal = parseInt(prod.stock_total || 0) + ingresoStockNuevo;

                    const updateSQL = {
                        nombre_comercial: nombreInput,
                        unidad_medida: presentacionInput, 
                        precio_venta: precioInputVal,
                        stock_total: stockFinal,
                        stock_minimo: parseInt(document.getElementById('dieta-minimo-bento-edit').value) || 5,
                        imagen_url: imagenBase64,
                        metadata: {
                            indicacion: indicacionInput,
                            marca: document.getElementById('dieta-marca-bento-edit').value.trim(),
                            especie: especieInput,
                            tipo: document.getElementById('dieta-tipo-bento-edit').value,
                            etapa: document.getElementById('dieta-etapa-bento-edit').value,
                            costoProveedor: parseFloat(document.getElementById('dieta-costo-bento-edit').value) || 0,
                            precioBase: parseFloat(document.getElementById('dieta-precio-base-bento-edit').value) || 0,
                            aplica_iva: document.getElementById('dieta-aplica-iva-bento-edit')?.checked || false
                        }
                    };

                    const { error: errUpdate } = await conexionSupabase
                        .from('inventario_productos')
                        .update(updateSQL)
                        .eq('id', prod.id)
                        .eq('organizacion_id', perfilUsuarioActivo.organizacion_id);

                    if (errUpdate) throw errUpdate;

                    if (ingresoStockNuevo > 0) {
                        await conexionSupabase
                            .from('inventario_movimientos')
                            .insert({
                                organizacion_id: perfilUsuarioActivo.organizacion_id,
                                sucursal_id: perfilUsuarioActivo.sucursal_id,
                                producto_id: prod.id,
                                tipo_movimiento: 'entrada_compra',
                                cantidad: ingresoStockNuevo,
                                motivo_referencia: 'Ingreso manual desde edición',
                                created_by: perfilUsuarioActivo.id
                            });
                    }

                    alert(`Dieta "${nombreInput}" actualizada exitosamente.`);
                    cerrarPanel();
                    cargarProductosDietas();

                } catch (error) {
                    console.error("[ERROR] Fallo al actualizar en BD:", error);
                    alert("Ocurrio un error al guardar la dieta.");
                } finally {
                    btnGuardar.disabled = false;
                    btnGuardar.innerHTML = textoOriginal;
                }
            });
        }

    } catch (err) {
        console.error("[ERROR] Fallo al configurar panel de edicion:", err);
        alert("No se pudo cargar la informacion para editar.");
    }
}

// ==========================================
// 6. GENERADOR HTML BENTO - EDITAR DIETA
// ==========================================
function generarHTMLPanelEditarDieta(prod) {
    return `
    <div class="notif-overlay" id="editarDietaOverlay" aria-hidden="true"></div>

    <aside class="panel-notificaciones" id="modal-editar-dieta-bento" role="dialog" aria-modal="true" aria-label="Editar Dieta Médica" style="z-index: 1210;">
        <div class="notif-header">
            <div class="notif-header-top">
                <div>
                    <p style="font-size:0.72rem; color:#89C2D9; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 6px;">Inventario › Dietas Rx</p>
                    <h2 class="notif-titulo">Editar Dieta Médica</h2>
                </div>
                <div class="notif-header-acciones">
                    <button type="button" class="notif-btn-icono" id="btn-cerrar-panel-editar-dieta" title="Cerrar panel">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
            </div>
            <p class="notif-resumen">SKU: <strong>${prod.codigo_barras || 'SIN SKU'}</strong></p>
        </div>

        <div class="notif-cuerpo" style="padding:24px;">
            <form id="form-editar-dieta-bento" data-id="${prod.id}" style="display:flex; flex-direction:column; gap:16px;" novalidate>
                
                <!-- Subida de Imagen -->
                <div id="contenedor-imagen-bento-edit" style="width:100%; min-height:160px; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border:1.5px dashed #c2d4df; border-radius:12px; background:#f4f7fe; transition:all 0.3s ease;">
                    <input type="file" id="input-imagen-dieta-edit" accept="image/png, image/jpeg, image/webp" style="display:none;">
                    
                    <div id="placeholder-imagen-edit" style="${prod.imagen_url ? 'display:none;' : 'display:flex;'} padding:20px; flex-direction:column; align-items:center;">
                        <div style="background:#FEF2F2; width:50px; height:50px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin-bottom:10px;">
                            <span class="material-symbols-rounded" style="font-size:24px; color:#EF4444;">add_photo_alternate</span>
                        </div>
                        <p style="font-size:13px; font-weight:700; color:#032F40; margin-bottom:4px;">Haz clic para cambiar imagen</p>
                    </div>
                    
                    <img id="preview-imagen-dieta-edit" src="${prod.imagen_url || ''}" alt="Vista previa" style="${prod.imagen_url ? 'display:block;' : 'display:none;'} width:100%; height:100%; object-fit:contain; background-color:white; position:absolute; top:0; left:0; border-radius:10px;">
                    
                    <div id="btn-remover-imagen-edit" style="${prod.imagen_url ? 'display:flex;' : 'display:none;'} position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:28px; height:28px; justify-content:center; align-items:center; cursor:pointer; backdrop-filter:blur(4px);">
                        <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                    </div>
                </div>

                <!-- Detalles Clínicos -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Nombre de la Dieta <span style="color:#F27405;">*</span></label>
                    <input id="dieta-nombre-bento-edit" type="text" value="${prod.nombre_comercial}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Marca <span style="color:#F27405;">*</span></label>
                        <input id="dieta-marca-bento-edit" type="text" value="${prod.metadata?.marca || ''}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Indicación Médica <span style="color:#F27405;">*</span></label>
                        <select id="dieta-indicacion-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="renal" ${prod.metadata?.indicacion === 'renal' ? 'selected' : ''}>Soporte Renal</option>
                            <option value="hepatica" ${prod.metadata?.indicacion === 'hepatica' ? 'selected' : ''}>Soporte Hepático</option>
                            <option value="digestiva" ${prod.metadata?.indicacion === 'digestiva' ? 'selected' : ''}>Digestivo Sensible</option>
                            <option value="cardiaca" ${prod.metadata?.indicacion === 'cardiaca' ? 'selected' : ''}>Soporte Cardíaco</option>
                            <option value="obesidad" ${prod.metadata?.indicacion === 'obesidad' ? 'selected' : ''}>Control de Peso</option>
                            <option value="dermatologica" ${prod.metadata?.indicacion === 'dermatologica' ? 'selected' : ''}>Dermatológica</option>
                            <option value="urinaria" ${prod.metadata?.indicacion === 'urinaria' ? 'selected' : ''}>Urinaria / Cristales</option>
                            <option value="articular" ${prod.metadata?.indicacion === 'articular' ? 'selected' : ''}>Movilidad / Articular</option>
                            <option value="recuperacion" ${prod.metadata?.indicacion === 'recuperacion' ? 'selected' : ''}>Recuperación / Convalecencia</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Tipo <span style="color:#F27405;">*</span></label>
                        <select id="dieta-tipo-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="seco" ${prod.metadata?.tipo === 'seco' ? 'selected' : ''}>Alimento Seco</option>
                            <option value="humedo" ${prod.metadata?.tipo === 'humedo' ? 'selected' : ''}>Alimento Húmedo</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Presentación (KG/GR) <span style="color:#F27405;">*</span></label>
                        <input id="dieta-presentacion-bento-edit" type="text" value="${prod.unidad_medida}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Especie Objetivo</label>
                        <select id="dieta-especie-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="Perro" ${prod.metadata?.especie === 'Perro' ? 'selected' : ''}>Perro</option>
                            <option value="Gato" ${prod.metadata?.especie === 'Gato' ? 'selected' : ''}>Gato</option>
                            <option value="Ambos" ${prod.metadata?.especie === 'Ambos' ? 'selected' : ''}>Ambos</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Etapa de Vida</label>
                        <select id="dieta-etapa-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="Todas" ${prod.metadata?.etapa === 'Todas' ? 'selected' : ''}>Todas las etapas</option>
                            <option value="Cachorro" ${prod.metadata?.etapa === 'Cachorro' ? 'selected' : ''}>Cachorro / Kitten</option>
                            <option value="Adulto" ${prod.metadata?.etapa === 'Adulto' ? 'selected' : ''}>Adulto</option>
                            <option value="Senior" ${prod.metadata?.etapa === 'Senior' ? 'selected' : ''}>Senior</option>
                        </select>
                    </div>
                </div>

                <!-- Financiero & Stock -->
                <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>

                <div style="display:flex; justify-content:flex-end; margin-bottom: 10px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Aplica IVA (16%)</span>
                        <input type="checkbox" id="dieta-aplica-iva-bento-edit" ${prod.metadata?.aplica_iva !== false ? 'checked' : ''} style="accent-color: #032F40; width: 16px; height: 16px;">
                    </label>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Costo Proveedor ($) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-costo-bento-edit" type="number" step="0.01" min="0" value="${prod.metadata?.costoProveedor || ''}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">P. Base ($) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-precio-base-bento-edit" type="number" step="0.01" min="0" value="${prod.metadata?.precioBase || ''}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div>
                        <label id="dieta-label-iva-bento-edit" style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">${prod.metadata?.aplica_iva !== false ? 'P. Final (16% IVA inc.)' : 'P. Final (Sin IVA)'} <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-precio-bento-edit" type="number" step="0.01" min="0" value="${prod.precio_venta}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; color:#10B981; font-weight:bold;">
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Stock Actual <span style="color:#F27405;">*</span></label>
                        <input id="dieta-stock-bento-edit" type="number" value="${prod.stock_total}" disabled style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background-color: #f1f5f9; cursor: not-allowed; font-weight:bold;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Añadir Nuevo Ingreso (+)</label>
                        <input id="dieta-nuevo-stock-bento" type="number" min="0" placeholder="Ej. 10" style="width:100%; padding:11px 14px; border:2px solid #10B981; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Punto Reorden <span style="color:#F27405;">*</span></label>
                        <input id="dieta-minimo-bento-edit" type="number" min="1" value="${prod.stock_minimo}" required placeholder="5" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Código de Barras / SKU <span style="color:#F27405;">*</span></label>
                        <input id="dieta-sku-bento-edit" type="text" value="${prod.codigo_barras || ''}" required placeholder="Ej. RX-RC-REN-01" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>
            </form>
        </div>

        <div class="notif-footer">
            <div></div>
            <button type="submit" form="form-editar-dieta-bento" class="notif-footer-btn primario" style="background:#10B981; display:flex; align-items:center; gap:6px; padding:10px 22px;">
                <span class="material-symbols-rounded" style="font-size:18px;">save</span> Actualizar Dieta
            </button>
        </div>
    </aside>
    `;
}

// ==========================================
// 5. SISTEMA DE IMPRESION DE ETIQUETAS
// ==========================================
function inicializarImpresionEtiquetasDietas() {
    const tablaProductos = document.getElementById('tabla-productos-dietas');
    if (!tablaProductos) return;

    tablaProductos.addEventListener('click', (e) => {
        const btnImprimir = e.target.closest('.btn-imprimir-etiqueta');
        if (!btnImprimir) return;

        e.preventDefault();
        e.stopPropagation(); 

        const sku = btnImprimir.getAttribute('data-sku');
        const fila = btnImprimir.closest('tr');
        
        const nombre = fila.querySelector('.info-texto strong') ? fila.querySelector('.info-texto strong').textContent : 'Dieta';
        const precio = fila.querySelector('td:nth-child(5) strong') ? fila.querySelector('td:nth-child(5) strong').textContent : '$0.00';

        imprimirEtiquetaTermicaDietas(sku, nombre, precio);
    });
}

function imprimirEtiquetaTermicaDietas(sku, nombreProducto, precioStr) {
    const ventanaImpresion = window.open('', 'PRINT', 'height=400,width=600');
    
    ventanaImpresion.document.write(`
        <html>
            <head>
                <title>Etiqueta ${sku}</title>
                <style>
                    @page { margin: 0; size: 50mm 30mm; }
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        margin: 0; 
                        padding: 2mm; 
                        text-align: center;
                        width: 46mm; 
                    }
                    .titulo { 
                        font-size: 11px; 
                        font-weight: bold; 
                        overflow: hidden; 
                        white-space: nowrap; 
                        text-overflow: ellipsis; 
                    }
                    .precio { 
                        font-size: 16px; 
                        font-weight: 900; 
                        margin: 4px 0; 
                    }
                    svg { 
                        width: 100%; 
                        height: 12mm; 
                    }
                </style>
            </head>
            <body>
                <div class="titulo">${nombreProducto}</div>
                <div class="precio">${precioStr}</div>
                <svg id="codigo-impresion"></svg>
            </body>
        </html>
    `);

    const script = ventanaImpresion.document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js";
    
    script.onload = () => {
        ventanaImpresion.JsBarcode("#codigo-impresion", sku, {
            format: "CODE128",
            displayValue: true,
            fontSize: 10,
            margin: 0,
            height: 40,
            textMargin: 2
        });
        
        ventanaImpresion.document.close();
        
        setTimeout(() => {
            ventanaImpresion.focus();
            ventanaImpresion.print();
            ventanaImpresion.close();
        }, 350);
    };
    
    ventanaImpresion.document.body.appendChild(script);
}