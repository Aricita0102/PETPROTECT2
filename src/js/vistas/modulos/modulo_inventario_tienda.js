/**
 * MODULO: Inventario de Tienda (PET PROTECT)
 * DESCRIPCION: Gestion de productos retail, control de stock predictivo, 
 * modales de registro con carga de imagenes, estandarizacion de fondos y generacion de SKU.
 * ARQUITECTURA: Vite / Supabase
 */

import { conexionSupabase, obtenerUsuarioActual } from '../../infraestructura/conexion.js';

// Cache del perfil del usuario autenticado (organizacion, sucursal, id)
let perfilUsuarioActivo = null;
// 🛡️ Guard: evita registrar el listener de submit más de una vez en document
// (document persiste entre navegaciones SPA — sin este flag se acumulan listeners)
let _submitTiendaRegistrado = false;

export async function inicializarInventarioTienda() {
    console.log("[TIENDA] Inicializando catalogo inteligente de mostrador...");

    // Obtener perfil del usuario para multi-tenancy y trazabilidad
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
        console.log(`[TIENDA] Sesion verificada: org=${perfil.organizacion_id}`);
    } catch (err) {
        console.error('[TIENDA] Error critico de identidad:', err.message);
        return; // No inicializar nada si no hay perfil valido
    }

    inicializarBuscadorYFiltrosTienda();
    configurarModalBentoDinamico(); 
    configurarModalNuevoProductoBento(); 
    inicializarImpresionEtiquetas();
    registrarDelegacionSubmitNuevoProducto(); // ✅ Delegación global: captura el submit aunque el form sea dinámico
    
    // Cargar la tabla al iniciar el modulo
    cargarProductosTienda();

    // 🛡️ Listener global para Notificaciones Interactivas (Solo se registra una vez)
    if (!window._listenerAlertaInventarioTienda) {
        window.addEventListener('petprotect:abrir_inventario_desde_alerta', (e) => {
            const id = e.detail.id;
            console.log("[TIENDA] Abriendo modal desde alerta interactiva:", id);
            configurarModalEditarProductoBento(id);
        });
        window._listenerAlertaInventarioTienda = true;
    }
}

// ==========================================
// 1. RECUPERAR DATOS DE SUPABASE (TABLA)
// ==========================================
async function cargarProductosTienda() {
    const tbody = document.getElementById('cuerpo-tabla-tienda');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="texto-centro" style="padding: 60px;">
                <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
                <lottie-player src="/json/lottiecarga.json" background="transparent" speed="1" style="width: 150px; height: 150px; margin: 0 auto;" loop autoplay></lottie-player>
                <p style="color:var(--cobalto); font-weight:600; margin-top:10px;">Cargando inventario de mostrador...</p>
            </td>
        </tr>
    `;

    try {
        if (!perfilUsuarioActivo?.organizacion_id) {
            tbody.innerHTML = '<tr><td colspan="7" class="texto-centro texto-peligro">Error: No se pudo identificar tu clinica. Recarga la pagina.</td></tr>';
            return;
        }

        const { data: productos, error } = await conexionSupabase
            .from('inventario_productos')
            .select('*')
            .eq('organizacion_id', perfilUsuarioActivo.organizacion_id) // Multi-tenant: solo productos de esta clinica
            .eq('categoria', 'tienda')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!productos || productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="texto-centro" style="color: var(--text-muted);">No hay articulos registrados en mostrador.</td></tr>';
            return;
        }

        tbody.innerHTML = ''; 
        
        const coloresUnicos = new Map();

        productos.forEach(prod => {
            const tr = document.createElement('tr');
            
            const nombre = prod.nombre_comercial || 'Producto sin nombre';
            const precio = prod.precio_venta ? `$${parseFloat(prod.precio_venta).toFixed(2)}` : '$0.00';
            const stock = parseFloat(prod.stock_total) || 0;
            const stockMin = parseFloat(prod.stock_minimo) || 5;
            const sku = prod.codigo_barras || 'SIN-SKU';
            
            // Extraer categoria especifica o talla de los metadatos si existen
            const atributoExtra = prod.metadata?.talla || prod.unidad_medida || 'N/A';

            // Atributos de Color e Imagen
            const colorHex = prod.metadata?.colorHex || '';
            const colorNombre = prod.metadata?.colorNombre || '';
            const categoriaReal = prod.metadata?.subcategoria || '';
            
            tr.setAttribute('data-color', colorHex);
            tr.setAttribute('data-categoria', categoriaReal);
            
            if (colorHex && colorNombre) {
                coloresUnicos.set(colorHex, colorNombre);
            }
            
            const colorHtml = colorHex 
                ? `<div style="width:8px; height:32px; border-radius:4px; background-color:${colorHex};" title="${prod.metadata?.colorNombre || ''}"></div>`
                : `<div style="width:8px; height:32px; border-radius:4px; background-color:transparent;"></div>`;
                
            const imgHtml = prod.imagen_url 
                ? `<img src="${prod.imagen_url}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0; background:#fff;" alt="Img">`
                : `<div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; border:1px solid #e2e8f0; display:flex; justify-content:center; align-items:center;"><span class="material-symbols-rounded" style="font-size:16px; color:#94a3b8;">image</span></div>`;

            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${colorHtml}
                        ${imgHtml}
                        <div class="info-texto">
                            <strong>${nombre}</strong>
                            <br><small style="color:var(--text-secondary)">Tienda Retail</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="etiqueta-estado">${atributoExtra}</span>
                </td>
                <td><span class="code-chip">${sku}</span></td>
                <td class="texto-derecha"><strong>${precio}</strong></td>
                <td class="texto-derecha">
                    <span class="${stock <= stockMin ? 'badge-stock critico' : 'badge-stock optimo'}" style="font-weight:bold; padding:4px 8px; border-radius:4px; ${stock <= stockMin ? 'background:#FEE2E2; color:#EF4444;' : 'background:#D1FAE5; color:#10B981;'}">
                        ${stock} <small>Unids.</small>
                    </span>
                </td>
                <td class="texto-centro">
                    ${stock > 0 
                        ? (stock <= stockMin ? '<span class="indicador-ok" style="color: #F59E0B; font-weight:bold;">Stock Bajo</span>' : '<span class="indicador-ok" style="color: #10B981; font-weight:bold;">Stock Optimo</span>') 
                        : '<span class="indicador-error" style="color: #EF4444; font-weight:bold;">Agotado</span>'}
                </td>
                <td class="texto-centro acciones-celda">
                    <button class="boton-fantasma-icono btn-imprimir-etiqueta" data-sku="${sku}" title="Imprimir Etiqueta" style="background:rgba(137, 194, 217, 0.15); border:none; color:var(--cobalto); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">print</span>
                    </button>
                    <button class="boton-fantasma-icono btn-editar-tienda" data-id="${prod.id}" title="Editar" style="background:rgba(242, 116, 5, 0.15); border:none; color:var(--naranja); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">edit</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Poblar el filtro de colores dinámicamente
        const selectColorFiltro = document.getElementById('filtro-color-tienda');
        if (selectColorFiltro) {
            selectColorFiltro.innerHTML = '<option value="todos">Todos los colores</option>';
            coloresUnicos.forEach((nombre, hex) => {
                const option = document.createElement('option');
                option.value = hex.toLowerCase();
                option.textContent = `■ ${nombre}`;
                option.style.color = hex;
                option.style.fontWeight = 'bold';
                selectColorFiltro.appendChild(option);
            });
        }

        inicializarBuscadorYFiltrosTienda();

    } catch (error) {
        console.error("[ERROR] Fallo al recuperar inventario:", error.message);
        tbody.innerHTML = '<tr><td colspan="7" class="texto-centro texto-peligro">Error de conexion al cargar el inventario.</td></tr>';
    }
}


// ==========================================
// 2. PANEL LATERAL BENTO: NUEVO PRODUCTO (TIENDA)
// ==========================================
function configurarModalNuevoProductoBento() {
    const btnAbrir = document.getElementById('btn-abrir-modal-tienda');
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');

    if (!btnAbrir || !contenedorModalDinamico) {
        console.warn("[TIENDA] Boton de nuevo articulo o contenedor dinamico no encontrado.");
        return;
    }

    btnAbrir.addEventListener('click', () => {
        contenedorModalDinamico.innerHTML = generarHTMLPanelNuevoProductoTienda();

        const overlay = document.getElementById('nuevoTiendaOverlay');
        const modalFondo = document.getElementById('modal-nuevo-tienda-bento');
        const btnCerrar = document.getElementById('btn-cerrar-panel-nuevo-tienda');
        const formNuevo = document.getElementById('form-nuevo-tienda-bento');
        
        const inputColorHex = document.getElementById('tienda-color-hex-bento');
        const inputColorNombre = document.getElementById('tienda-color-nombre-bento');

        if (!modalFondo || !overlay) return;

        // --- Logica de Cierre ---
        const cerrarPanel = () => {
            modalFondo.classList.remove('abierto');
            overlay.classList.remove('abierto');
            setTimeout(() => contenedorModalDinamico.innerHTML = '', 350);
        };

        if (btnCerrar) btnCerrar.addEventListener('click', cerrarPanel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrarPanel();
        });

        // --- Logica de Subida, Lienzo Blanco y Previsualizacion de Imagen ---
        const contenedorImagen = document.getElementById('contenedor-imagen-bento');
        const inputImagen = document.getElementById('input-imagen-tienda');
        const placeholderImagen = document.getElementById('placeholder-imagen');
        const previewImagen = document.getElementById('preview-imagen-tienda');
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

        // --- Logica Reactiva de Colores ---
        if (inputColorHex && inputColorNombre) {
            inputColorHex.addEventListener('input', (e) => {
                if(inputColorNombre.value.trim() === '') {
                    inputColorNombre.value = e.target.value.toUpperCase(); 
                }
            });
        }

        // --- Logica Dinamica de Categorias ---
        const selectCategoria = document.getElementById('tienda-categoria-bento');
        const contenedorTalla = document.getElementById('contenedor-talla-dinamico');

        if (selectCategoria && contenedorTalla) {
            selectCategoria.addEventListener('change', (e) => {
                const cat = e.target.value;
                contenedorTalla.style.display = 'flex';

                if (cat === '') {
                    contenedorTalla.style.gridColumn = '';
                    contenedorTalla.style.display = 'none';
                    contenedorTalla.innerHTML = `<input type="hidden" id="tienda-talla-bento" value="">`;
                
                } else if (cat === 'alimento') {
                    contenedorTalla.style.gridColumn = '1 / -1';
                    contenedorTalla.innerHTML = `
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; width:100%; align-items:end;">
                            <div style="min-width:0;">
                                <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;" for="tienda-especie-temp">Especie <span style="color:#F27405;">*</span></label>
                                <select id="tienda-especie-temp" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                                    <option value="">Seleccionar...</option>
                                    <option value="Perro">Perro</option>
                                    <option value="Gato">Gato</option>
                                    <option value="Aves">Aves</option>
                                    <option value="Roedores">Roedores</option>
                                </select>
                            </div>
                            <div style="min-width:0;">
                                <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" for="tienda-tamano-temp">Tamaño / Etapa</label>
                                <select id="tienda-tamano-temp" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                                    <option value="">Todas / No aplica</option>
                                    <option value="Cachorro / Kitten">Cachorro / Kitten</option>
                                    <option value="Adulto Raza Pequeña">Adulto Raza Pequeña</option>
                                    <option value="Adulto Raza Mediana">Adulto Raza Mediana</option>
                                    <option value="Adulto Raza Grande">Adulto Raza Grande</option>
                                    <option value="Senior">Senior</option>
                                </select>
                            </div>
                            <div style="min-width:0;">
                                <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Peso Neto <span style="color:#F27405;">*</span></label>
                                <div style="display:flex; gap:8px;">
                                    <input id="tienda-peso-numero" type="number" step="0.01" min="0.01" placeholder="Ej. 2.5" required style="flex:2; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; min-width:0;">
                                    <select id="tienda-peso-unidad" required style="flex:1; padding:11px 8px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff; min-width:0;">
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="lb">lb</option>
                                        <option value="oz">oz</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <input type="hidden" id="tienda-talla-bento" value="">
                    `;

                    const actualizarTallaOculta = () => {
                        const esp = document.getElementById('tienda-especie-temp').value;
                        const tam = document.getElementById('tienda-tamano-temp').value;
                        const peso = document.getElementById('tienda-peso-numero').value;
                        const unidad = document.getElementById('tienda-peso-unidad').value;
                        
                        let stringFinal = esp ? (tam ? `${esp} - ${tam}` : esp) : '';
                        if (peso) {
                            stringFinal += stringFinal ? ` (${peso}${unidad})` : `${peso}${unidad}`;
                        }
                        document.getElementById('tienda-talla-bento').value = stringFinal;
                    };

                    document.getElementById('tienda-especie-temp').addEventListener('change', actualizarTallaOculta);
                    document.getElementById('tienda-tamano-temp').addEventListener('change', actualizarTallaOculta);
                    document.getElementById('tienda-peso-numero').addEventListener('input', actualizarTallaOculta);
                    document.getElementById('tienda-peso-unidad').addEventListener('change', actualizarTallaOculta);

                } else if (cat === 'juguetes') {
                    contenedorTalla.innerHTML = `
                        <label class="info-label" for="tienda-talla-bento">Tamaño</label>
                        <select id="tienda-talla-bento" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="Pequeño">Pequeño</option>
                            <option value="Mediano">Mediano</option>
                            <option value="Grande">Grande</option>
                            <option value="Gigante">Gigante</option>
                        </select>
                    `;
                
                } else if (cat === 'accesorios') {
                    contenedorTalla.innerHTML = `
                        <label class="info-label" for="tienda-talla-bento">Talla (Mexico)</label>
                        <select id="tienda-talla-bento" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="CH">Chica (CH)</option>
                            <option value="M">Mediana (M)</option>
                            <option value="G">Grande (G)</option>
                            <option value="EG">Extra Grande (EG)</option>
                        </select>
                    `;
                
                } else if (cat === 'higiene') {
                    contenedorTalla.innerHTML = `
                        <label class="info-label" for="tienda-talla-bento">Presentacion</label>
                        <select id="tienda-talla-bento" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="100ml">100 ml</option>
                            <option value="250ml">250 ml</option>
                            <option value="500ml">500 ml</option>
                            <option value="1L">1 Litro</option>
                            <option value="Paquete">Paquete / Toallitas</option>
                        </select>
                    `;
                }
            });
            selectCategoria.dispatchEvent(new Event('change'));
        }

        // --- Logica de Sugerencia de Precios (Economia PyME Mexico) ---
        const costoInput = document.getElementById('tienda-costo-bento');
        const precioInput = document.getElementById('tienda-precio-bento');
        const precioBaseInput = document.getElementById('tienda-precio-base-bento');
        
        // Sincronización de precios Base <-> Final con IVA dinámico
        const ivaToggle = document.getElementById('tienda-aplica-iva-bento');
        const ivaLabel = document.getElementById('tienda-label-iva-bento');

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
                // Mantener el P. Final estático y ajustar el P. Base hacia atrás para evitar cambios bruscos al usuario en el ticket.
                // O mantener el P. Base y recalcular el final. Lo más lógico en retail es mantener el P. Base y sumar el impuesto.
                const base = parseFloat(precioBaseInput.value) || 0;
                if(precioInput.dataset.modificado === 'true' && precioBaseInput.dataset.modificado !== 'true') {
                     // Si el usuario metió final directo
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
                if (e.isTrusted) {
                    precioBaseInput.dataset.modificado = 'true';
                }
                recalcularPrecios('base');
            });
            precioInput.addEventListener('input', (e) => {
                if (e.isTrusted) {
                    precioInput.dataset.modificado = 'true';
                }
                recalcularPrecios('final');
            });
        }
        
        const sugerenciaSpan = document.createElement('div');
        sugerenciaSpan.style = "font-size: 11px; color: #6b7280; margin-top: 4px;";
        precioInput.parentNode.appendChild(sugerenciaSpan);

        const calcularSugerenciaPrecio = () => {
            const costo = parseFloat(costoInput.value);
            const categoria = selectCategoria.value;

            if (isNaN(costo) || costo <= 0) {
                sugerenciaSpan.innerHTML = "";
                return;
            }

            let margenEsperado = 0.30; 
            if (categoria === 'alimento') margenEsperado = 0.20;
            else if (categoria === 'accesorios') margenEsperado = 0.50;
            else if (categoria === 'juguetes') margenEsperado = 0.45;
            else if (categoria === 'higiene') margenEsperado = 0.35;

            const precioSinIvaIdeal = costo / (1 - margenEsperado);
            const precioSugeridoConIva = Math.round(precioSinIvaIdeal * 1.16);
            
            const precioSinIvaReal = precioSugeridoConIva / 1.16;
            const gananciaBruta = precioSinIvaReal - costo;
            const roi = (gananciaBruta / costo) * 100;

            sugerenciaSpan.innerHTML = `Sugerido: <strong>$${precioSugeridoConIva.toFixed(2)} MXN</strong> (Margen: ${margenEsperado*100}%, ROI: ${roi.toFixed(1)}%, IVA 16% inc.) 
            <span class="info-margen-tooltip-alta" style="display:inline-block; margin-left:4px; width:16px; height:16px; background:#e2e8f0; color:#64748b; border-radius:50%; text-align:center; line-height:16px; font-size:10px; cursor:help; position:relative;">
                ?
                <div class="tooltip-content" style="display:none; position:absolute; bottom:130%; right:-10px; width:260px; background:#1e293b; color:#fff; padding:12px; border-radius:8px; font-size:11px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; font-family:'Montserrat',sans-serif; font-weight:normal;">
                    <strong style="color:#38bdf8; display:block; margin-bottom:6px;">Calculadora de Rentabilidad</strong>
                    <strong>Precio Base:</strong> Costo / (1 - Margen)<br>
                    <strong>P. Final:</strong> Precio Base + 16% IVA<br><br>
                    <strong style="color:#fff;">Márgenes esperados:</strong><br>
                    • Accesorios: 50%<br>
                    • Juguetes: 45%<br>
                    • Higiene: 35%<br>
                    • Alimento: 20%<br>
                    • Otros: 30%<br><br>
                    <span style="color:#94a3b8; font-size:10px;">Garantiza tu ganancia sobre el precio de venta, no solo sobre el costo.</span>
                    <div style="position:absolute; bottom:-5px; right:13px; border-width:5px 5px 0; border-style:solid; border-color:#1e293b transparent transparent transparent;"></div>
                </div>
            </span>
            <button type="button" id="btn-aplicar-sugerido-alta" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;

            const tooltipIconAlta = sugerenciaSpan.querySelector('.info-margen-tooltip-alta');
            const tooltipContentAlta = sugerenciaSpan.querySelector('.tooltip-content');
            if (tooltipIconAlta && tooltipContentAlta) {
                tooltipIconAlta.addEventListener('mouseenter', () => tooltipContentAlta.style.display = 'block');
                tooltipIconAlta.addEventListener('mouseleave', () => tooltipContentAlta.style.display = 'none');
            }

            const btnAplicar = document.getElementById('btn-aplicar-sugerido-alta');
            if (btnAplicar) {
                btnAplicar.addEventListener('click', (eventoBtn) => {
                    eventoBtn.preventDefault();
                    precioInput.dataset.modificado = 'true';
                    precioBaseInput.dataset.modificado = 'true';
                    precioInput.value = precioSugeridoConIva.toFixed(2);
                    precioInput.dispatchEvent(new Event('input')); // Dispara la sincronización
                });
            }

            if (precioInput.dataset.modificado !== 'true') {
                precioInput.value = precioSugeridoConIva.toFixed(2);
                precioInput.dispatchEvent(new Event('input')); // Dispara la sincronización
            }
        };

        costoInput.addEventListener('input', calcularSugerenciaPrecio);
        selectCategoria.addEventListener('change', calcularSugerenciaPrecio);

        // --- Mostrar el Panel ---
        setTimeout(() => {
            overlay.classList.add('abierto');
            modalFondo.classList.add('abierto');
            setTimeout(() => {
                const pName = document.getElementById('tienda-nombre-bento');
                if (pName) pName.focus();
            }, 400);
        }, 50);

        // --- El submit se maneja via delegación global (ver registrarDelegacionSubmitNuevoProducto) ---
        // El panel ya está listo; el listener de submit vive en document y detecta el form dinámico.
    });
}

// ==========================================================================
// 2.5 DELEGACIÓN GLOBAL DE SUBMIT — FORMULARIO DINÁMICO (TIENDA)
// Se registra UNA SOLA VEZ al iniciar el módulo. Detecta el submit del
// formulario aunque este se haya inyectado en el DOM después del registro.
// ==========================================================================
function registrarDelegacionSubmitNuevoProducto() {
    // Si ya está registrado (el usuario navegó al módulo más de una vez),
    // no volvemos a añadir otro listener al document.
    if (_submitTiendaRegistrado) return;
    _submitTiendaRegistrado = true;
    document.addEventListener('submit', async (e) => {
        if (!e.target || e.target.id !== 'form-nuevo-tienda-bento') return;
        e.preventDefault();

        const form = e.target;

        // ── 1. Leer y validar campos obligatorios ──────────────────────────
        const nombreInput    = document.getElementById('tienda-nombre-bento')?.value.trim() ?? '';
        const categoriaInput = document.getElementById('tienda-categoria-bento')?.value ?? '';
        const precioInputVal = parseFloat(document.getElementById('tienda-precio-bento')?.value);

        if (!nombreInput) {
            alert('Por favor, ingresa el nombre del producto.');
            document.getElementById('tienda-nombre-bento')?.focus();
            return;
        }
        if (!categoriaInput) {
            alert('Por favor, selecciona una categoría.');
            document.getElementById('tienda-categoria-bento')?.focus();
            return;
        }
        if (isNaN(precioInputVal) || precioInputVal <= 0) {
            alert('Por favor, ingresa un precio público válido mayor a $0.');
            document.getElementById('tienda-precio-bento')?.focus();
            return;
        }

        if (categoriaInput === 'alimento') {
            const especieVal = document.getElementById('tienda-especie-temp')?.value ?? '';
            const pesoVal    = parseFloat(document.getElementById('tienda-peso-numero')?.value);
            if (!especieVal) {
                alert('Por favor, selecciona la especie para el alimento.');
                document.getElementById('tienda-especie-temp')?.focus();
                return;
            }
            if (isNaN(pesoVal) || pesoVal <= 0) {
                alert('Por favor, ingresa un peso numérico válido mayor a 0.');
                document.getElementById('tienda-peso-numero')?.focus();
                return;
            }
        }

        // ── 2. Validar sesión activa antes de escribir en BD ───────────────
        if (!perfilUsuarioActivo?.organizacion_id || !perfilUsuarioActivo?.sucursal_id) {
            alert('Error de sesión: No se pudo identificar tu clínica o sucursal. Recarga la página.');
            return;
        }

        // ── 3. Estado visual del botón ─────────────────────────────────────
        const btnGuardar    = document.querySelector('button[form="form-nuevo-tienda-bento"]');
        const textoOriginal = btnGuardar?.innerHTML ?? 'Guardar';
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation:spin 1s linear infinite;vertical-align:middle;">sync</span> Guardando...`;
            btnGuardar.style.opacity = '0.7';
        }

        // ── 4. Construir payload ───────────────────────────────────────────
        const skuFinal     = 'VP-TIE-' + Date.now().toString().slice(-6);
        const stockInicial = parseInt(document.getElementById('tienda-stock-bento')?.value) || 0;

        const nodoTalla  = document.getElementById('tienda-talla-bento');
        const valorTalla = nodoTalla ? nodoTalla.value.trim() : '';

        const pesoNumGuardar = categoriaInput === 'alimento'
            ? parseFloat(document.getElementById('tienda-peso-numero')?.value) : null;
        const pesoUniGuardar = categoriaInput === 'alimento'
            ? (document.getElementById('tienda-peso-unidad')?.value ?? null) : null;

        // ✅ FIX: Leer stock_minimo desde el ID correcto 'tienda-reorden-bento'
        const stockMinimo = parseInt(document.getElementById('tienda-reorden-bento')?.value) || 5;

        // ✅ FIX: imagen_url seguro — null si no se subió foto, sin crash de variable indefinida
        const previewImg    = document.getElementById('preview-imagen-tienda');
        const imagenBase64  = (previewImg && previewImg.src && !previewImg.src.startsWith('data:image') === false)
            ? previewImg.src : null;

        const insertSQL = {
            organizacion_id: perfilUsuarioActivo.organizacion_id,
            sucursal_id:     perfilUsuarioActivo.sucursal_id,
            created_by:      perfilUsuarioActivo.id,
            categoria:       'tienda',
            nombre_comercial: nombreInput,
            unidad_medida:   valorTalla || 'PZA',
            precio_venta:    precioInputVal,
            codigo_barras:   skuFinal,
            stock_total:     stockInicial,
            stock_minimo:    stockMinimo,                         // ✅ ID corregido
            imagen_url:      imagenBase64 ?? null,               // ✅ null-safe
            metadata: {
                subcategoria:    categoriaInput,
                marca:           document.getElementById('tienda-marca-bento')?.value.trim() ?? '',
                valor_peso:      pesoNumGuardar,
                unidad_peso:     pesoUniGuardar,
                colorHex:        document.getElementById('tienda-color-hex-bento')?.value ?? '',
                colorNombre:     document.getElementById('tienda-color-nombre-bento')?.value.trim() ?? '',
                costoProveedor:  parseFloat(document.getElementById('tienda-costo-bento')?.value) || 0,
                precioBase:      parseFloat(document.getElementById('tienda-precio-base-bento')?.value) || 0,
                aplica_iva:      document.getElementById('tienda-aplica-iva-bento') ? document.getElementById('tienda-aplica-iva-bento').checked : true
            }
        };

        // ── 5. INSERT a Supabase ───────────────────────────────────────────
        try {
            const { data: prodInsertado, error: errInsert } = await conexionSupabase
                .from('inventario_productos')
                .insert([insertSQL])
                .select('id')
                .single();

            if (errInsert) throw errInsert;

            // ── 6. Registrar movimiento de entrada si hay stock inicial ────
            if (stockInicial > 0) {
                await conexionSupabase.from('inventario_movimientos').insert([{
                    organizacion_id: perfilUsuarioActivo.organizacion_id,
                    sucursal_id:     perfilUsuarioActivo.sucursal_id,
                    producto_id:     prodInsertado.id,
                    tipo_movimiento: 'entrada_compra',
                    cantidad:        stockInicial,
                    created_by:      perfilUsuarioActivo.id
                }]);
                console.log(`[LEDGER] Entrada de inventario registrada: +${stockInicial} uds.`);
            }

            // ── 7. Cerrar panel y refrescar tabla ─────────────────────────
            const modalFondo = document.getElementById('modal-nuevo-tienda-bento');
            const overlay    = document.getElementById('nuevoTiendaOverlay');
            const contenedor = document.getElementById('contenedor-modal-dinamico');
            if (modalFondo) modalFondo.classList.remove('abierto');
            if (overlay)    overlay.classList.remove('abierto');
            if (contenedor) setTimeout(() => contenedor.innerHTML = '', 350);

            console.log(`[TIENDA] Artículo "${nombreInput}" guardado. SKU: ${skuFinal}`);
            cargarProductosTienda();

        } catch (error) {
            console.error('[TIENDA] Error al registrar producto en Supabase:', error);
            alert('Ocurrió un error al guardar el producto. Revisa la consola para detalles.');
        } finally {
            if (btnGuardar) {
                btnGuardar.disabled  = false;
                btnGuardar.innerHTML = textoOriginal;
                btnGuardar.style.opacity = '1';
            }
        }
    });
}

// ==========================================
// 3. GENERADOR HTML BENTO (CLON DE TIENDA)
// ==========================================
function generarHTMLPanelNuevoProductoTienda() {
    return `
    <div class="notif-overlay" id="nuevoTiendaOverlay" aria-hidden="true"></div>

    <aside class="panel-notificaciones" id="modal-nuevo-tienda-bento" role="dialog" aria-modal="true" aria-label="Nuevo Artículo" style="z-index: 1210;">
        <div class="notif-header">
            <div class="notif-header-top">
                <div>
                    <p style="font-size:0.72rem; color:#89C2D9; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 6px;">Inventario › Tienda</p>
                    <h2 class="notif-titulo">Registrar Artículo</h2>
                </div>
                <div class="notif-header-acciones">
                    <button type="button" class="notif-btn-icono" id="btn-cerrar-panel-nuevo-tienda" title="Cerrar panel">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
            </div>
            <p class="notif-resumen">Alta de Producto</p>
        </div>

        <div class="notif-cuerpo" style="padding:24px;">
            <form id="form-nuevo-tienda-bento" style="display:flex; flex-direction:column; gap:16px;" novalidate>
                
                <!-- Subida de Imagen -->
                <div id="contenedor-imagen-bento" style="width:100%; min-height:160px; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border:1.5px dashed #c2d4df; border-radius:12px; background:#f4f7fe; transition:all 0.3s ease;">
                    <input type="file" id="input-imagen-tienda" accept="image/png, image/jpeg, image/webp" style="display:none;">
                    
                    <div id="placeholder-imagen" style="padding:20px; display:flex; flex-direction:column; align-items:center;">
                        <div style="background:#f8fafc; width:50px; height:50px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin-bottom:10px; border:1px solid #e2e8f0;">
                            <span class="material-symbols-rounded" style="font-size:24px; color:#64748b;">cloud_upload</span>
                        </div>
                        <p style="font-size:13px; font-weight:700; color:#032F40; margin-bottom:4px;">Haz clic para subir imagen</p>
                        <p style="font-size:11px; color:#8da5b5;">El fondo se procesará en blanco</p>
                    </div>
                    
                    <img id="preview-imagen-tienda" src="" alt="Vista previa" style="display:none; width:100%; height:100%; object-fit:contain; background-color:white; position:absolute; top:0; left:0; border-radius:10px;">
                    
                    <div id="btn-remover-imagen" style="display:none; position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:28px; height:28px; justify-content:center; align-items:center; cursor:pointer; backdrop-filter:blur(4px);">
                        <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                    </div>
                </div>

                <!-- Atributos Comerciales -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Nombre del Producto <span style="color:#F27405;">*</span></label>
                    <input id="tienda-nombre-bento" type="text" placeholder="Ej. Kong Classic" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Marca</label>
                        <input id="tienda-marca-bento" type="text" placeholder="Ej. Kong Company" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Categoría <span style="color:#F27405;">*</span></label>
                        <select id="tienda-categoria-bento" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="alimento">Alimento / Premios</option>
                            <option value="accesorios">Accesorios</option>
                            <option value="higiene">Higiene / Estética</option>
                            <option value="farmacia">Farmacia Comercial</option>
                            <option value="juguetes">Juguetes</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div id="contenedor-talla-dinamico">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Talla</label>
                        <input id="tienda-talla-bento" type="text" placeholder="Ej. L, M, Chico" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; overflow:visible;">Color (Opcional)
                            <span onmouseenter="this.querySelector('.tooltip-content').style.display='block'" onmouseleave="this.querySelector('.tooltip-content').style.display='none'" style="display:inline-block; margin-left:4px; width:16px; height:16px; background:#e2e8f0; color:#64748b; border-radius:50%; text-align:center; line-height:16px; font-size:10px; cursor:help; position:relative;">
                                ?
                                <div class="tooltip-content" style="display:none; position:absolute; bottom:130%; left:50%; transform:translateX(-50%); width:220px; background:#1e293b; color:#fff; padding:12px; border-radius:8px; font-size:11px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; font-family:'Montserrat',sans-serif; font-weight:normal; text-transform:none; letter-spacing:normal; white-space:normal;">
                                    <strong style="color:#38bdf8; display:block; margin-bottom:4px;">Etiqueta Inteligente</strong>
                                    Localiza el color que predomina en el empaque y selecciónalo. Servirá como etiqueta visual para identificarlo rápido en la caja.
                                    <div style="position:absolute; bottom:-5px; left:50%; transform:translateX(-50%); border-width:5px 5px 0; border-style:solid; border-color:#1e293b transparent transparent transparent;"></div>
                                </div>
                            </span>
                        </label>
                        <div style="display:flex; gap:8px;">
                            <input id="tienda-color-hex-bento" type="color" value="#000000" style="width:40px; height:42px; border:1.5px solid #e2e8f0; border-radius:8px; padding:2px; cursor:pointer;">
                            <input id="tienda-color-nombre-bento" type="text" placeholder="Ej. Rojo" style="flex:1; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                </div>

                <!-- Financiero & Stock -->
                <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>
                
                <div style="display:flex; justify-content:flex-end; margin-bottom: 10px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Aplica IVA (16%)</span>
                        <input type="checkbox" id="tienda-aplica-iva-bento" checked style="accent-color: #032F40; width: 16px; height: 16px;">
                    </label>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:end;">
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Costo Prov. <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-costo-bento" type="number" step="0.01" min="0" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">P. Base <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-precio-base-bento" type="number" step="0.01" min="0" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div style="grid-column: 1 / -1; min-width:0;">
                        <label id="tienda-label-iva-bento" style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">P. Final (16% IVA inc.) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-precio-bento" type="number" step="0.01" min="0" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; color:#10B981; font-weight:bold;">
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:end;">
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Stock Inicial <span style="color:#F27405;">*</span></label>
                        <input id="tienda-stock-bento" type="number" min="0" required placeholder="0" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:visible;">Punto Reorden <span style="color:#F27405;">*</span> 
                            <span onmouseenter="this.querySelector('.tooltip-content').style.display='block'" onmouseleave="this.querySelector('.tooltip-content').style.display='none'" style="display:inline-block; margin-left:4px; width:16px; height:16px; background:#e2e8f0; color:#64748b; border-radius:50%; text-align:center; line-height:16px; font-size:10px; cursor:help; position:relative;">
                                ?
                                <div class="tooltip-content" style="display:none; position:absolute; bottom:130%; right:-10px; width:220px; background:#1e293b; color:#fff; padding:12px; border-radius:8px; font-size:11px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; font-family:'Montserrat',sans-serif; font-weight:normal; text-transform:none; letter-spacing:normal; white-space:normal;">
                                    <strong style="color:#38bdf8; display:block; margin-bottom:4px;">Stock de Seguridad</strong>
                                    Cantidad mínima sugerida. El sistema te alertará automáticamente para resurtir antes de que se agote.
                                    <div style="position:absolute; bottom:-5px; right:13px; border-width:5px 5px 0; border-style:solid; border-color:#1e293b transparent transparent transparent;"></div>
                                </div>
                            </span>
                        </label>
                        <input id="tienda-reorden-bento" type="number" min="1" required placeholder="5" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>
            </form>
        </div>

        <div class="notif-footer">
            <div></div>
            <button type="submit" form="form-nuevo-tienda-bento" class="notif-footer-btn primario" style="background:#F27405; display:flex; align-items:center; gap:6px; padding:10px 22px;">
                <span class="material-symbols-rounded" style="font-size:18px;">save</span> Guardar
            </button>
        </div>
    </aside>`;
}

// ==========================================
// 4. BUSCADOR Y FILTROS EN TIEMPO REAL
// ==========================================
function inicializarBuscadorYFiltrosTienda() {
    const inputBusqueda = document.getElementById('input-busqueda-tienda');
    const selectFiltro = document.getElementById('select-filtro-tienda');
    const inputColorFiltro = document.getElementById('filtro-color-tienda');
    const indicadorColorFiltro = document.getElementById('indicador-color-filtro');
    const filasTabla = document.querySelectorAll('#tabla-productos-tienda tbody tr');

    if (!inputBusqueda || !selectFiltro || filasTabla.length === 0) return;

    let filtroColorActivo = null;

    const aplicarFiltros = () => {
        const terminoBusqueda = inputBusqueda.value.toLowerCase().trim();
        const criterioCategoria = selectFiltro.value.toLowerCase();

        filasTabla.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            const cumpleBusqueda = textoFila.includes(terminoBusqueda);
            
            let cumpleFiltro = true;
            if (criterioCategoria !== 'todos') {
                const celdaCategoria = fila.getAttribute('data-categoria') || '';
                cumpleFiltro = (celdaCategoria === criterioCategoria);
            }

            let cumpleColor = true;
            if (filtroColorActivo && filtroColorActivo !== 'todos') {
                const filaColor = fila.getAttribute('data-color') ? fila.getAttribute('data-color').toLowerCase() : '';
                cumpleColor = (filaColor === filtroColorActivo);
            }

            fila.style.display = (cumpleBusqueda && cumpleFiltro && cumpleColor) ? '' : 'none';
        });
    };

    inputBusqueda.addEventListener('input', aplicarFiltros);
    selectFiltro.addEventListener('change', aplicarFiltros);
    
    if (inputColorFiltro) {
        inputColorFiltro.addEventListener('change', (e) => {
            filtroColorActivo = e.target.value.toLowerCase();
            if (indicadorColorFiltro) {
                if (filtroColorActivo !== 'todos' && filtroColorActivo) {
                    indicadorColorFiltro.style.backgroundColor = filtroColorActivo;
                    indicadorColorFiltro.style.display = 'block';
                } else {
                    indicadorColorFiltro.style.display = 'none';
                }
            }
            aplicarFiltros();
        });
    }
}

// ==========================================
// 5. PANEL LATERAL (DETALLE DE TIENDA)
// ==========================================
function configurarModalBentoDinamico() {
    const tablaProductos = document.getElementById('tabla-productos-tienda');

    if (tablaProductos) {
        tablaProductos.addEventListener('click', async (e) => {
            const botonEditar = e.target.closest('.btn-editar-tienda');
            
            if (botonEditar) {
                e.preventDefault();
                const productoId = botonEditar.getAttribute('data-id');
                if (!productoId) return;

                botonEditar.style.opacity = '0.5';
                await configurarModalEditarProductoBento(productoId);
                botonEditar.style.opacity = '1';
            }
        });
    }
}

// ==========================================
// 5.1 CONFIGURAR MODAL DE EDICIÓN (BENTO)
// ==========================================
async function configurarModalEditarProductoBento(productoId) {
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');
    if (!contenedorModalDinamico) {
        console.warn("[TIENDA] Contenedor dinamico de modales no encontrado.");
        return;
    }

    try {
        // Recuperar información en tiempo real desde Supabase para garantizar exactitud médica
        const { data: prod, error } = await conexionSupabase
            .from('inventario_productos')
            .select('*')
            .eq('id', productoId)
            .single();

        if (error || !prod) throw error || new Error("Producto no encontrado.");

        contenedorModalDinamico.innerHTML = generarHTMLPanelEditarProductoTienda(prod);

        const overlay = document.getElementById('editarTiendaOverlay');
        const modalFondo   = document.getElementById('modal-editar-tienda-bento');
        const btnCerrar    = document.getElementById('btn-cerrar-panel-editar-tienda');
        const formEditar    = document.getElementById('form-editar-tienda-bento');
        
        const inputColorHex = document.getElementById('tienda-color-hex-bento-edit');
        const inputColorNombre = document.getElementById('tienda-color-nombre-bento-edit');

        // Fix submit trigger for outside button in injected HTML
        const btnGuardarOutside = document.querySelector('button[form="form-editar-tienda-bento"]');
        if (btnGuardarOutside && formEditar) {
            btnGuardarOutside.addEventListener('click', (e) => {
                e.preventDefault();
                if (formEditar.reportValidity()) {
                    formEditar.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            });
        }

        if (!modalFondo || !overlay) return;

        // --- Logica de Cierre ---
        const cerrarPanel = () => {
            modalFondo.classList.remove('abierto');
            overlay.classList.remove('abierto');
            setTimeout(() => contenedorModalDinamico.innerHTML = '', 350);
        };

        if (btnCerrar) btnCerrar.addEventListener('click', cerrarPanel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrarPanel();
        });

        // --- Logica de Subida, Lienzo Blanco y Previsualizacion de Imagen ---
        const contenedorImagen = document.getElementById('contenedor-imagen-bento-edit');
        const inputImagen = document.getElementById('input-imagen-tienda-edit');
        const placeholderImagen = document.getElementById('placeholder-imagen-edit');
        const previewImagen = document.getElementById('preview-imagen-tienda-edit');
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

        // --- Logica Reactiva de Colores ---
        if (inputColorHex && inputColorNombre) {
            inputColorHex.addEventListener('input', (e) => {
                if(inputColorNombre.value.trim() === '') {
                    inputColorNombre.value = e.target.value.toUpperCase(); 
                }
            });
        }

        // --- Logica Dinamica de Categorias ---
        const selectCategoria = document.getElementById('tienda-categoria-bento-edit');
        const contenedorTalla = document.getElementById('contenedor-talla-dinamico-edit');

        if (selectCategoria && contenedorTalla) {
            selectCategoria.addEventListener('change', (e) => {
                const cat = e.target.value;
                contenedorTalla.style.display = 'flex';

                if (cat === '') {
                    contenedorTalla.style.gridColumn = '';
                    contenedorTalla.innerHTML = `<input type="hidden" id="tienda-talla-bento-edit" value="">`;
                
                } else if (cat === 'alimento') {
                    contenedorTalla.style.gridColumn = '1 / -1';
                    contenedorTalla.innerHTML = `
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; width:100%;">
                            <div>
                                <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;" for="tienda-especie-temp-edit">Especie <span style="color:#F27405;">*</span></label>
                                <select id="tienda-especie-temp-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                                    <option value="">Seleccionar...</option>
                                    <option value="Perro">Perro</option>
                                    <option value="Gato">Gato</option>
                                    <option value="Aves">Aves</option>
                                    <option value="Roedores">Roedores</option>
                                </select>
                            </div>
                            <div style="min-width:0;">
                                <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" for="tienda-tamano-temp-edit">Tamaño / Etapa</label>
                                <select id="tienda-tamano-temp-edit" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                                    <option value="">Todas / No aplica</option>
                                    <option value="Cachorro / Kitten">Cachorro / Kitten</option>
                                    <option value="Adulto Raza Pequeña">Adulto Raza Pequeña</option>
                                    <option value="Adulto Raza Mediana">Adulto Raza Mediana</option>
                                    <option value="Adulto Raza Grande">Adulto Raza Grande</option>
                                    <option value="Senior">Senior</option>
                                </select>
                            </div>
                            <div style="min-width:0;">
                                <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Peso Neto <span style="color:#F27405;">*</span></label>
                                <div style="display:flex; gap:8px;">
                                    <input id="tienda-peso-numero-edit" type="number" step="0.01" min="0.01" placeholder="Ej. 2.5" required style="flex:2; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; min-width:0;">
                                    <select id="tienda-peso-unidad-edit" required style="flex:1; padding:11px 8px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff; min-width:0;">
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="lb">lb</option>
                                        <option value="oz">oz</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <input type="hidden" id="tienda-talla-bento-edit" value="">
                    `;

                    const actualizarTallaOculta = () => {
                        const esp = document.getElementById('tienda-especie-temp-edit').value;
                        const tam = document.getElementById('tienda-tamano-temp-edit').value;
                        const peso = document.getElementById('tienda-peso-numero-edit').value;
                        const unidad = document.getElementById('tienda-peso-unidad-edit').value;
                        
                        let stringFinal = esp ? (tam ? `${esp} - ${tam}` : esp) : '';
                        if (peso) {
                            stringFinal += stringFinal ? ` (${peso}${unidad})` : `${peso}${unidad}`;
                        }
                        document.getElementById('tienda-talla-bento-edit').value = stringFinal;
                    };

                    document.getElementById('tienda-especie-temp-edit').addEventListener('change', actualizarTallaOculta);
                    document.getElementById('tienda-tamano-temp-edit').addEventListener('change', actualizarTallaOculta);
                    document.getElementById('tienda-peso-numero-edit').addEventListener('input', actualizarTallaOculta);
                    document.getElementById('tienda-peso-unidad-edit').addEventListener('change', actualizarTallaOculta);

                    // Inicializar los valores del alimento si ya existían
                    if (prod.metadata?.valor_peso) {
                        document.getElementById('tienda-peso-numero-edit').value = prod.metadata.valor_peso;
                    }
                    if (prod.metadata?.unidad_peso) {
                        document.getElementById('tienda-peso-unidad-edit').value = prod.metadata.unidad_peso;
                    }
                    
                    const tallaString = prod.unidad_medida || ''; 
                    const especieMatch = tallaString.match(/^(Perro|Gato|Aves|Roedores)/);
                    if (especieMatch) {
                        document.getElementById('tienda-especie-temp-edit').value = especieMatch[1];
                    }
                    if (tallaString.includes("Cachorro / Kitten")) {
                        document.getElementById('tienda-tamano-temp-edit').value = "Cachorro / Kitten";
                    } else if (tallaString.includes("Adulto Raza Pequeña")) {
                        document.getElementById('tienda-tamano-temp-edit').value = "Adulto Raza Pequeña";
                    } else if (tallaString.includes("Adulto Raza Mediana")) {
                        document.getElementById('tienda-tamano-temp-edit').value = "Adulto Raza Mediana";
                    } else if (tallaString.includes("Adulto Raza Grande")) {
                        document.getElementById('tienda-tamano-temp-edit').value = "Adulto Raza Grande";
                    } else if (tallaString.includes("Senior")) {
                        document.getElementById('tienda-tamano-temp-edit').value = "Senior";
                    }
                    
                    actualizarTallaOculta();

                } else if (cat === 'juguetes') {
                    contenedorTalla.innerHTML = `
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;" for="tienda-talla-bento-edit">Tamaño</label>
                        <select id="tienda-talla-bento-edit" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="Pequeño" ${prod.unidad_medida === 'Pequeño' ? 'selected' : ''}>Pequeño</option>
                            <option value="Mediano" ${prod.unidad_medida === 'Mediano' ? 'selected' : ''}>Mediano</option>
                            <option value="Grande" ${prod.unidad_medida === 'Grande' ? 'selected' : ''}>Grande</option>
                            <option value="Gigante" ${prod.unidad_medida === 'Gigante' ? 'selected' : ''}>Gigante</option>
                        </select>
                    `;
                
                } else if (cat === 'accesorios') {
                    contenedorTalla.innerHTML = `
                        <label class="info-label" for="tienda-talla-bento-edit">Talla (Mexico)</label>
                        <select id="tienda-talla-bento-edit" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="CH" ${prod.unidad_medida === 'CH' ? 'selected' : ''}>Chica (CH)</option>
                            <option value="M" ${prod.unidad_medida === 'M' ? 'selected' : ''}>Mediana (M)</option>
                            <option value="G" ${prod.unidad_medida === 'G' ? 'selected' : ''}>Grande (G)</option>
                            <option value="EG" ${prod.unidad_medida === 'EG' ? 'selected' : ''}>Extra Grande (EG)</option>
                        </select>
                    `;
                
                } else if (cat === 'higiene') {
                    contenedorTalla.innerHTML = `
                        <label class="info-label" for="tienda-talla-bento-edit">Presentacion</label>
                        <select id="tienda-talla-bento-edit" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="100ml" ${prod.unidad_medida === '100ml' ? 'selected' : ''}>100 ml</option>
                            <option value="250ml" ${prod.unidad_medida === '250ml' ? 'selected' : ''}>250 ml</option>
                            <option value="500ml" ${prod.unidad_medida === '500ml' ? 'selected' : ''}>500 ml</option>
                            <option value="1L" ${prod.unidad_medida === '1L' ? 'selected' : ''}>1 Litro</option>
                            <option value="Paquete" ${prod.unidad_medida === 'Paquete' ? 'selected' : ''}>Paquete / Toallitas</option>
                        </select>
                    `;
                }
            });
            selectCategoria.dispatchEvent(new Event('change'));
        }

        // --- Logica de Sugerencia de Precios (Edición) ---
        const costoInput = document.getElementById('tienda-costo-bento-edit');
        const precioInput = document.getElementById('tienda-precio-bento-edit');
        const precioBaseInput = document.getElementById('tienda-precio-base-bento-edit');

        // Sincronización de precios Base <-> Final (Edición) con IVA dinámico
        const ivaToggleEdit = document.getElementById('tienda-aplica-iva-bento-edit');
        const ivaLabelEdit = document.getElementById('tienda-label-iva-bento-edit');

        const recalcularPreciosEdit = (origen) => {
            const aplica = ivaToggleEdit ? ivaToggleEdit.checked : true;
            const factor = aplica ? 1.16 : 1.0;
            
            if (ivaLabelEdit) {
                ivaLabelEdit.innerHTML = aplica ? 'P. Final (16% IVA inc.) <span style="color:#F27405;">*</span>' : 'P. Final (Sin IVA) <span style="color:#F27405;">*</span>';
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

        if (ivaToggleEdit) {
            ivaToggleEdit.addEventListener('change', () => recalcularPreciosEdit('toggle'));
        }

        if(precioBaseInput && precioInput) {
            if (precioInput.value) {
                precioInput.dataset.modificado = 'true';
            }
            precioBaseInput.addEventListener('input', (e) => {
                if (e.isTrusted) precioBaseInput.dataset.modificado = 'true';
                recalcularPreciosEdit('base');
            });
            precioInput.addEventListener('input', (e) => {
                if (e.isTrusted) precioInput.dataset.modificado = 'true';
                recalcularPreciosEdit('final');
            });
        }
        
        const sugerenciaSpan = document.createElement('div');
        sugerenciaSpan.style = "font-size: 11px; color: #6b7280; margin-top: 4px;";
        precioInput.parentNode.appendChild(sugerenciaSpan);

        const calcularSugerenciaPrecio = () => {
            const costo = parseFloat(costoInput.value);
            const categoria = selectCategoria.value;

            if (isNaN(costo) || costo <= 0) {
                sugerenciaSpan.innerHTML = "";
                return;
            }

            let margenEsperado = 0.30; 
            if (categoria === 'alimento') margenEsperado = 0.20;
            else if (categoria === 'accesorios') margenEsperado = 0.50;
            else if (categoria === 'juguetes') margenEsperado = 0.45;
            else if (categoria === 'higiene') margenEsperado = 0.35;

            const precioSinIvaIdeal = costo / (1 - margenEsperado);
            const precioSugeridoConIva = Math.round(precioSinIvaIdeal * 1.16);
            
            const precioSinIvaReal = precioSugeridoConIva / 1.16;
            const gananciaBruta = precioSinIvaReal - costo;
            const roi = (gananciaBruta / costo) * 100;

            sugerenciaSpan.innerHTML = `Sugerido: <strong>$${precioSugeridoConIva.toFixed(2)} MXN</strong> (Margen: ${margenEsperado*100}%, ROI: ${roi.toFixed(1)}%, IVA 16% inc.) 
            <span class="info-margen-tooltip-edit" style="display:inline-block; margin-left:4px; width:16px; height:16px; background:#e2e8f0; color:#64748b; border-radius:50%; text-align:center; line-height:16px; font-size:10px; cursor:help; position:relative;">
                ?
                <div class="tooltip-content" style="display:none; position:absolute; bottom:130%; right:-10px; width:260px; background:#1e293b; color:#fff; padding:12px; border-radius:8px; font-size:11px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; font-family:'Montserrat',sans-serif; font-weight:normal;">
                    <strong style="color:#38bdf8; display:block; margin-bottom:6px;">Calculadora de Rentabilidad</strong>
                    <strong>Precio Base:</strong> Costo / (1 - Margen)<br>
                    <strong>P. Final:</strong> Precio Base + 16% IVA<br><br>
                    <strong style="color:#fff;">Márgenes esperados:</strong><br>
                    • Accesorios: 50%<br>
                    • Juguetes: 45%<br>
                    • Higiene: 35%<br>
                    • Alimento: 20%<br>
                    • Otros: 30%<br><br>
                    <span style="color:#94a3b8; font-size:10px;">Garantiza tu ganancia sobre el precio de venta, no solo sobre el costo.</span>
                    <div style="position:absolute; bottom:-5px; right:13px; border-width:5px 5px 0; border-style:solid; border-color:#1e293b transparent transparent transparent;"></div>
                </div>
            </span>
            <button type="button" id="btn-aplicar-sugerido-edit" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;

            const tooltipIconEdit = sugerenciaSpan.querySelector('.info-margen-tooltip-edit');
            const tooltipContentEdit = sugerenciaSpan.querySelector('.tooltip-content');
            if (tooltipIconEdit && tooltipContentEdit) {
                tooltipIconEdit.addEventListener('mouseenter', () => tooltipContentEdit.style.display = 'block');
                tooltipIconEdit.addEventListener('mouseleave', () => tooltipContentEdit.style.display = 'none');
            }

            const btnAplicar = document.getElementById('btn-aplicar-sugerido-edit');
            if (btnAplicar) {
                btnAplicar.addEventListener('click', (eventoBtn) => {
                    eventoBtn.preventDefault();
                    precioInput.value = precioSugeridoConIva.toFixed(2);
                    precioInput.dispatchEvent(new Event('input')); // Dispara la sincronización
                });
            }
        };

        costoInput.addEventListener('input', calcularSugerenciaPrecio);
        selectCategoria.addEventListener('change', calcularSugerenciaPrecio);
        
        // Ejecutar cálculo inicial para que se muestre la sugerencia de inmediato si ya tiene costo
        calcularSugerenciaPrecio();

        // --- Mostrar el Panel ---
        setTimeout(() => {
            overlay.classList.add('abierto');
            modalFondo.classList.add('abierto');
            setTimeout(() => {
                const pName = document.getElementById('tienda-nombre-bento-edit');
                if (pName) pName.focus();
            }, 400);
        }, 50);

        // --- Envio del Formulario (Guardar en Supabase) ---
        if (formEditar) {
            formEditar.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Validaciones estrictas
                const nombreInput = document.getElementById('tienda-nombre-bento-edit').value.trim();
                const categoriaInput = document.getElementById('tienda-categoria-bento-edit').value;
                const precioInputVal = parseFloat(document.getElementById('tienda-precio-bento-edit').value);

                if (!nombreInput) {
                    alert("Por favor, ingresa el nombre del producto.");
                    document.getElementById('tienda-nombre-bento-edit').focus();
                    return;
                }
                if (!categoriaInput) {
                    alert("Por favor, selecciona una categoria.");
                    document.getElementById('tienda-categoria-bento-edit').focus();
                    return;
                }
                if (isNaN(precioInputVal) || precioInputVal <= 0) {
                    alert("Por favor, ingresa un precio publico valido mayor a $0.");
                    document.getElementById('tienda-precio-bento-edit').focus();
                    return;
                }

                if (categoriaInput === 'alimento') {
                    const especieInput = document.getElementById('tienda-especie-temp-edit').value;
                    const pesoInput = parseFloat(document.getElementById('tienda-peso-numero-edit').value);

                    if (!especieInput) {
                        alert("Por favor, selecciona la especie para el alimento.");
                        document.getElementById('tienda-especie-temp-edit').focus();
                        return;
                    }
                    if (isNaN(pesoInput) || pesoInput <= 0) {
                        alert("Por favor, ingresa un peso numerico valido mayor a 0.");
                        document.getElementById('tienda-peso-numero-edit').focus();
                        return;
                    }
                }

                const btnGuardar = document.querySelector('button[form="form-editar-tienda-bento"]');
                const textoOriginal = btnGuardar ? btnGuardar.innerHTML : 'Actualizar Ficha';

                if (btnGuardar) {
                    btnGuardar.disabled = true;
                    btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Guardando...`;
                    btnGuardar.style.opacity = '0.7';
                }

                const nodoTalla = document.getElementById('tienda-talla-bento-edit');
                const valorTalla = nodoTalla ? nodoTalla.value.trim() : '';

                const pesoNumGuardar = categoriaInput === 'alimento' ? parseFloat(document.getElementById('tienda-peso-numero-edit').value) : null;
                const pesoUniGuardar = categoriaInput === 'alimento' ? document.getElementById('tienda-peso-unidad-edit').value : null;

                const ingresoStockNuevo = parseInt(document.getElementById('tienda-nuevo-stock-bento').value) || 0;
                const stockFinal = parseInt(prod.stock_total || 0) + ingresoStockNuevo;

                try {
                    // Validar multi-tenancy
                    if (!perfilUsuarioActivo?.organizacion_id) {
                        alert('Error de sesion: No se pudo identificar tu clinica. Recarga la pagina.');
                        return;
                    }

                    const updateSQL = {
                        nombre_comercial: nombreInput,
                        unidad_medida: valorTalla || 'PZA', 
                        precio_venta: precioInputVal,
                        stock_total: stockFinal,
                        stock_minimo: parseInt(document.getElementById('tienda-minimo-bento-edit').value) || 5,
                        imagen_url: imagenBase64,
                        metadata: {
                            subcategoria: categoriaInput,
                            marca: document.getElementById('tienda-marca-bento-edit').value.trim(),
                            valor_peso: pesoNumGuardar,
                            unidad_peso: pesoUniGuardar,
                            colorHex: document.getElementById('tienda-color-hex-bento-edit').value,
                            colorNombre: document.getElementById('tienda-color-nombre-bento-edit').value.trim(),
                            costoProveedor: parseFloat(costoInput.value) || 0,
                            precioBase: parseFloat(precioBaseInput.value) || 0,
                            aplica_iva: true
                        }
                    };

                    const { error: errUpdate } = await conexionSupabase
                        .from('inventario_productos')
                        .update(updateSQL)
                        .eq('id', prod.id)
                        .eq('organizacion_id', perfilUsuarioActivo.organizacion_id); // Garantizar seguridad

                    if (errUpdate) throw errUpdate;

                    if (ingresoStockNuevo > 0) {
                        const { error: errMov } = await conexionSupabase
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
                        if (errMov) console.error("Error al registrar movimiento:", errMov);
                    }

                    alert(`Articulo "${nombreInput}" actualizado exitosamente.`);
                    cerrarPanel();
                    
                    // Recargar la tabla para mostrar los cambios
                    cargarProductosTienda();

                } catch (error) {
                    console.error("[ERROR] Fallo al registrar en BD unificada:", error);
                    alert("Ocurrio un error al guardar el producto. Revisa la consola para detalles.");
                } finally {
                    if (btnGuardar) {
                        btnGuardar.disabled = false;
                        btnGuardar.innerHTML = textoOriginal;
                        btnGuardar.style.opacity = '1';
                    }
                }
            });
        }

    } catch (err) {
        console.error("[ERROR] Fallo al configurar panel de edicion:", err);
        alert("No se pudo cargar la informacion para editar.");
    }
}

// ==========================================
// 5.2 GENERADOR HTML BENTO PARA EDICIÓN
// ==========================================
function generarHTMLPanelEditarProductoTienda(prod) {
    const colorVal = prod.metadata?.colorHex || '#000000';
    const colorName = prod.metadata?.colorNombre || '';

    return `
    <div class="notif-overlay" id="editarTiendaOverlay" aria-hidden="true"></div>

    <aside class="panel-notificaciones" id="modal-editar-tienda-bento" role="dialog" aria-modal="true" aria-label="Editar Artículo" style="z-index: 1210;">
        <div class="notif-header">
            <div class="notif-header-top">
                <div>
                    <p style="font-size:0.72rem; color:#89C2D9; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 6px;">Inventario › Tienda</p>
                    <h2 class="notif-titulo">Editar Artículo</h2>
                </div>
                <div class="notif-header-acciones">
                    <button type="button" class="notif-btn-icono" id="btn-cerrar-panel-editar-tienda" title="Cerrar panel">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
            </div>
            <p class="notif-resumen">SKU: <strong>${prod.codigo_barras || 'SIN SKU'}</strong></p>
        </div>

        <div class="notif-cuerpo" style="padding:24px;">
            <form id="form-editar-tienda-bento" data-id="${prod.id}" style="display:flex; flex-direction:column; gap:16px;" novalidate>
                
                <!-- Subida de Imagen -->
                <div id="contenedor-imagen-bento-edit" style="width:100%; min-height:160px; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border:1.5px dashed #c2d4df; border-radius:12px; background:#f4f7fe; transition:all 0.3s ease;">
                    <input type="file" id="input-imagen-tienda-edit" accept="image/png, image/jpeg, image/webp" style="display:none;">
                    
                    <div id="placeholder-imagen-edit" style="${prod.imagen_url ? 'display:none;' : 'display:flex;'} padding:20px; flex-direction:column; align-items:center;">
                        <div style="background:#f8fafc; width:50px; height:50px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin-bottom:10px; border:1px solid #e2e8f0;">
                            <span class="material-symbols-rounded" style="font-size:24px; color:#64748b;">cloud_upload</span>
                        </div>
                        <p style="font-size:13px; font-weight:700; color:#032F40; margin-bottom:4px;">Haz clic para cambiar imagen</p>
                    </div>
                    
                    <img id="preview-imagen-tienda-edit" src="${prod.imagen_url || ''}" alt="Vista previa" style="${prod.imagen_url ? 'display:block;' : 'display:none;'} width:100%; height:100%; object-fit:contain; background-color:white; position:absolute; top:0; left:0; border-radius:10px;">
                    
                    <div id="btn-remover-imagen-edit" style="${prod.imagen_url ? 'display:flex;' : 'display:none;'} position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:28px; height:28px; justify-content:center; align-items:center; cursor:pointer; backdrop-filter:blur(4px);">
                        <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                    </div>
                </div>

                <!-- Atributos Comerciales -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Nombre del Producto <span style="color:#F27405;">*</span></label>
                    <input id="tienda-nombre-bento-edit" type="text" value="${prod.nombre_comercial || ''}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Marca</label>
                        <input id="tienda-marca-bento-edit" type="text" value="${prod.metadata?.marca || ''}" placeholder="Ej. Kong Company" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Categoría <span style="color:#F27405;">*</span></label>
                        <select id="tienda-categoria-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="alimento" ${prod.metadata?.subcategoria === 'alimento' ? 'selected' : ''}>Alimento / Premios</option>
                            <option value="accesorios" ${prod.metadata?.subcategoria === 'accesorios' ? 'selected' : ''}>Accesorios</option>
                            <option value="juguetes" ${prod.metadata?.subcategoria === 'juguetes' ? 'selected' : ''}>Juguetes</option>
                            <option value="higiene" ${prod.metadata?.subcategoria === 'higiene' ? 'selected' : ''}>Higiene</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div id="contenedor-talla-dinamico-edit">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Talla</label>
                        <input id="tienda-talla-bento-edit" type="text" value="${prod.unidad_medida || ''}" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; overflow:visible;">Color (Opcional)
                            <span onmouseenter="this.querySelector('.tooltip-content').style.display='block'" onmouseleave="this.querySelector('.tooltip-content').style.display='none'" style="display:inline-block; margin-left:4px; width:16px; height:16px; background:#e2e8f0; color:#64748b; border-radius:50%; text-align:center; line-height:16px; font-size:10px; cursor:help; position:relative;">
                                ?
                                <div class="tooltip-content" style="display:none; position:absolute; bottom:130%; left:50%; transform:translateX(-50%); width:220px; background:#1e293b; color:#fff; padding:12px; border-radius:8px; font-size:11px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; font-family:'Montserrat',sans-serif; font-weight:normal; text-transform:none; letter-spacing:normal; white-space:normal;">
                                    <strong style="color:#38bdf8; display:block; margin-bottom:4px;">Etiqueta Inteligente</strong>
                                    Localiza el color que predomina en el empaque y selecciónalo. Servirá como etiqueta visual para identificarlo rápido en la caja.
                                    <div style="position:absolute; bottom:-5px; left:50%; transform:translateX(-50%); border-width:5px 5px 0; border-style:solid; border-color:#1e293b transparent transparent transparent;"></div>
                                </div>
                            </span>
                        </label>
                        <div style="display:flex; gap:8px;">
                            <input id="tienda-color-hex-bento-edit" type="color" value="${colorVal}" style="width:40px; height:42px; border:1.5px solid #e2e8f0; border-radius:8px; padding:2px; cursor:pointer;">
                            <input id="tienda-color-nombre-bento-edit" type="text" value="${colorName}" placeholder="Nombre (Ej. Rojo)" style="flex:1; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                </div>

                <!-- Financiero & Stock -->
                <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>
                
                <div style="display:flex; justify-content:flex-end; margin-bottom: 10px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Aplica IVA (16%)</span>
                        <input type="checkbox" id="tienda-aplica-iva-bento-edit" ${prod.metadata?.aplica_iva !== false ? 'checked' : ''} style="accent-color: #032F40; width: 16px; height: 16px;">
                    </label>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:end;">
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Costo Prov. <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-costo-bento-edit" type="number" step="0.01" min="0" value="${prod.metadata?.costoProveedor || ''}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">P. Base <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-precio-base-bento-edit" type="number" step="0.01" min="0" value="${prod.metadata?.precioBase || ''}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div style="grid-column: 1 / -1; min-width:0;">
                        <label id="tienda-label-iva-bento-edit" style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${prod.metadata?.aplica_iva !== false ? 'P. Final (16% IVA inc.)' : 'P. Final (Sin IVA)'} <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-precio-bento-edit" type="number" step="0.01" min="0" value="${prod.precio_venta || ''}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; color:#10B981; font-weight:bold;">
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:end;">
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Stock Actual <span style="color:#F27405;">*</span></label>
                        <input id="tienda-stock-bento-edit" type="number" value="${prod.stock_total || 0}" disabled style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background-color: #f1f5f9; cursor: not-allowed; font-weight:bold;">
                    </div>
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Añadir Nuevo Ingreso (+)</label>
                        <input id="tienda-nuevo-stock-bento" type="number" min="0" placeholder="Ej. 10" style="width:100%; padding:11px 14px; border:2px solid #10B981; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:visible;">Punto Reorden <span style="color:#F27405;">*</span> 
                        <span onmouseenter="this.querySelector('.tooltip-content').style.display='block'" onmouseleave="this.querySelector('.tooltip-content').style.display='none'" style="display:inline-block; margin-left:4px; width:16px; height:16px; background:#e2e8f0; color:#64748b; border-radius:50%; text-align:center; line-height:16px; font-size:10px; cursor:help; position:relative;">
                            ?
                            <div class="tooltip-content" style="display:none; position:absolute; bottom:130%; right:-10px; width:220px; background:#1e293b; color:#fff; padding:12px; border-radius:8px; font-size:11px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; font-family:'Montserrat',sans-serif; font-weight:normal; text-transform:none; letter-spacing:normal; white-space:normal;">
                                <strong style="color:#38bdf8; display:block; margin-bottom:4px;">Stock de Seguridad</strong>
                                Cantidad mínima sugerida. El sistema te alertará automáticamente para resurtir antes de que se agote.
                                <div style="position:absolute; bottom:-5px; right:13px; border-width:5px 5px 0; border-style:solid; border-color:#1e293b transparent transparent transparent;"></div>
                            </div>
                        </span>
                    </label>
                    <input id="tienda-minimo-bento-edit" type="number" min="1" value="${prod.stock_minimo || 5}" required placeholder="5" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>
            </form>
        </div>

        <div class="notif-footer">
            <div></div>
            <button type="submit" form="form-editar-tienda-bento" class="notif-footer-btn primario" style="background:#10B981; display:flex; align-items:center; gap:6px; padding:10px 22px;">
                <span class="material-symbols-rounded" style="font-size:18px;">save</span> Actualizar Ficha
            </button>
        </div>
    </aside>
    `;
}

// ==========================================
// 6. SISTEMA DE IMPRESION DE ETIQUETAS
// ==========================================
function inicializarImpresionEtiquetas() {
    const tablaProductos = document.getElementById('tabla-productos-tienda');
    if (!tablaProductos) return;

    tablaProductos.addEventListener('click', (e) => {
        const btnImprimir = e.target.closest('.btn-imprimir-etiqueta');
        if (!btnImprimir) return;

        e.preventDefault();
        e.stopPropagation(); 

        const sku = btnImprimir.getAttribute('data-sku');
        const fila = btnImprimir.closest('tr');
        
        const nombre = fila.querySelector('.info-texto strong') ? fila.querySelector('.info-texto strong').textContent : 'Producto';
        const precio = fila.querySelector('td:nth-child(4) strong') ? fila.querySelector('td:nth-child(4) strong').textContent : '$0.00';

        imprimirEtiquetaTermica(sku, nombre, precio);
    });
}

function imprimirEtiquetaTermica(sku, nombreProducto, precioStr) {
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