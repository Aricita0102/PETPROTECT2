function e(){console.log(`🩹 [INSUMOS] Inicializando catálogo de material clínico...`),t(),n(),r()}function t(){let e=document.getElementById(`input-busqueda-insumo`),t=document.getElementById(`select-filtro-insumo`),n=document.querySelectorAll(`#tabla-productos-insumos tbody tr`);if(!e||!t||n.length===0)return;let r=()=>{let r=e.value.toLowerCase().trim(),i=t.value.toLowerCase();n.forEach(e=>{let t=e.textContent.toLowerCase().includes(r),n=!0;i!==`todos`&&(n=e.querySelector(`td:nth-child(2)`).textContent.toLowerCase().includes(i)),e.style.display=t&&n?``:`none`})};e.addEventListener(`input`,r),t.addEventListener(`change`,r)}function n(){let e=document.getElementById(`contenedor-modal-dinamico`),t=document.getElementById(`tabla-productos-insumos`);if(!t||!e){console.warn(`⚠️ [INSUMOS] Tabla o contenedor de modal dinámico no encontrado.`);return}t.addEventListener(`click`,async t=>{let n=t.target.closest(`.btn-editar-insumo`)||t.target.closest(`.boton-fantasma-icono`);if(n){t.preventDefault(),n.style.opacity=`0.5`;try{let t=`${window.location.pathname.includes(`/PETPROTECT`)?`/PETPROTECT`:``}/MODAL_INFORMACION_PRODUCTO_INSUMO.html`,r=await fetch(t);if(!r.ok)throw Error(`Fallo al obtener el layout del panel Bento de Insumos.`);e.innerHTML=await r.text();let i=document.getElementById(`estudioOverlay`),a=document.getElementById(`panelDetalleInsumo`),o=document.getElementById(`btn-cerrar-panel-insumo`);if(i&&a){let t=()=>{a.classList.remove(`abierto`),i.classList.remove(`abierto`),setTimeout(()=>e.innerHTML=``,300)};o&&o.addEventListener(`click`,t),i.addEventListener(`click`,e=>{e.target===i&&t()}),setTimeout(()=>{i.classList.add(`abierto`),a.classList.add(`abierto`),n.style.opacity=`1`},50)}}catch(e){console.error(`💥 [ERROR DE INYECCIÓN] No se pudo levantar el panel Bento:`,e),alert(`Error al cargar la ficha del insumo.`),n.style.opacity=`1`}}})}function r(){let e=document.getElementById(`btn-abrir-modal-insumo`),t=document.getElementById(`contenedor-modal-dinamico`);if(!e||!t){console.warn(`⚠️ [INSUMOS] Botón de nuevo insumo o contenedor dinámico no encontrado.`);return}e.addEventListener(`click`,()=>{t.innerHTML=i();let e=document.getElementById(`nuevoInsumoOverlay`),n=document.getElementById(`panelNuevoInsumo`),r=document.getElementById(`btn-cerrar-panel-nuevo-insumo`),a=document.getElementById(`form-nuevo-insumo-bento`);if(!e||!n)return;let o=()=>{n.classList.remove(`abierto`),e.classList.remove(`abierto`),setTimeout(()=>t.innerHTML=``,350)};r&&r.addEventListener(`click`,o),e.addEventListener(`click`,t=>{t.target===e&&o()}),setTimeout(()=>{e.classList.add(`abierto`),n.classList.add(`abierto`),setTimeout(()=>{let e=document.getElementById(`ins-nombre-bento`);e&&e.focus()},400)},50),a&&a.addEventListener(`submit`,async e=>{e.preventDefault();let t=a.querySelector(`button[type="submit"]`),n=t.innerHTML;t.disabled=!0,t.innerHTML=`<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Guardando...`,t.style.opacity=`0.7`,t.style.cursor=`not-allowed`;let r={nombre_comercial:document.getElementById(`ins-nombre-bento`).value.trim(),sustancia_activa:document.getElementById(`ins-marca-bento`).value.trim(),categoria:document.getElementById(`ins-categoria-bento`).value,unidad_medida:document.getElementById(`ins-unidad-bento`).value,presentacion:document.getElementById(`ins-codigo-bento`).value.trim(),stock_total:parseFloat(document.getElementById(`ins-stock-bento`).value)||0,stock_minimo:parseFloat(document.getElementById(`ins-minimo-bento`).value)||5,es_controlado:document.getElementById(`ins-esteril-bento`).checked};console.log(`📦 [INSUMOS] Paquete listo para BD:`,r);try{await new Promise(e=>setTimeout(e,1200)),alert(`✅ ¡Insumo "${r.nombre_comercial}" registrado correctamente!`),o()}catch(e){console.error(`💥 [ERROR BD] Fallo al registrar insumo:`,e),alert(`Error al conectar con el servidor.`)}finally{t.disabled=!1,t.innerHTML=n,t.style.opacity=`1`,t.style.cursor=`pointer`}})})}function i(){return`
    <div class="notif-overlay" id="nuevoInsumoOverlay" aria-hidden="true"></div>

    <aside class="panel-notificaciones" id="panelNuevoInsumo" role="dialog" aria-modal="true" aria-label="Nuevo Insumo Clínico" style="z-index: 1210;">
        <div class="notif-header">
            <div class="notif-header-top">
                <div>
                    <p style="font-size:0.72rem; color:#89C2D9; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 6px;">Inventario › Insumos Clínicos</p>
                    <h2 class="notif-titulo">Nuevo Material</h2>
                </div>
                <div class="notif-header-acciones">
                    <button type="button" class="notif-btn-icono" id="btn-cerrar-panel-nuevo-insumo" title="Cerrar panel">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
            </div>
            <p class="notif-resumen">Registra un nuevo material de uso interno</p>
        </div>

        <div class="notif-cuerpo" style="padding:24px;">
            <form id="form-nuevo-insumo-bento" style="display:flex; flex-direction:column; gap:16px;" novalidate>
                
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Nombre del Material / Comercial <span style="color:#F27405;">*</span></label>
                    <input type="text" id="ins-nombre-bento" required placeholder="Ej. Gasa Estéril 10x10" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#032F40'" onblur="this.style.borderColor='#e2e8f0'">
                </div>

                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Marca (Opcional)</label>
                    <input type="text" id="ins-marca-bento" placeholder="Ej. Leukoplast" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#032F40'" onblur="this.style.borderColor='#e2e8f0'">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Categoría <span style="color:#F27405;">*</span></label>
                        <select id="ins-categoria-bento" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="" disabled selected>Seleccionar...</option>
                            <option value="Curación">Material de Curación</option>
                            <option value="Quirúrgico">Quirúrgico</option>
                            <option value="Laboratorio">Laboratorio</option>
                            <option value="Limpieza">Higiene / Limpieza</option>
                            <option value="Diagnóstico">Diagnóstico</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Unidad / Pqte <span style="color:#F27405;">*</span></label>
                        <select id="ins-unidad-bento" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="Paquete">Paquete</option>
                            <option value="Caja">Caja</option>
                            <option value="Pieza">Pieza (Unidad)</option>
                            <option value="Litro">Litro</option>
                            <option value="Galón">Galón</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Código Interno / SKU <span style="color:#F27405;">*</span></label>
                    <input type="text" id="ins-codigo-bento" required placeholder="Ej. INS-GAS-01" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Stock Inicial <span style="color:#F27405;">*</span></label>
                        <input type="number" id="ins-stock-bento" min="0" required placeholder="0" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Reserva Mínima <span style="color:#F27405;">*</span></label>
                        <input type="number" id="ins-minimo-bento" min="1" required placeholder="5" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div style="margin-top:8px;">
                    <label style="display:flex; align-items:center; gap:10px; padding:14px; border:1.5px solid #e2e8f0; border-radius:10px; background:#f8fafc; cursor:pointer;">
                        <input type="checkbox" id="ins-esteril-bento" style="width:18px; height:18px; accent-color:#032F40;">
                        <div>
                            <div style="font-size:13px; font-weight:700; color:#032F40;">Es Material Estéril</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">Requerirá control de fecha de caducidad</div>
                        </div>
                    </label>
                </div>
            </form>
        </div>

        <div class="notif-footer">
            <div></div>
            <button type="submit" form="form-nuevo-insumo-bento" class="notif-footer-btn primario" style="background:#F27405; display:flex; align-items:center; gap:6px; padding:10px 22px;">
                <span class="material-symbols-rounded" style="font-size:18px;">save</span> Guardar
            </button>
                    <div class="dashboard-grid">

                        <!-- COLUMNA IZQUIERDA -->
                        <div class="grid-column">

                            <!-- Imagen / Icono representativo -->
                            <div class="card image-gallery-card" style="min-height: 220px;">
                                <div class="image-placeholder" style="background-color: #F0FDF4; height: 100%;">
                                    <span class="material-symbols-rounded" style="font-size: 64px; color: #10B981;">add_box</span>
                                </div>
                            </div>

                            <!-- Tarjeta: Datos de Stock -->
                            <div class="card">
                                <div class="section-header">
                                    <div class="section-title">
                                        <span class="material-symbols-rounded" style="font-size:18px; color:var(--text-secondary);">inventory_2</span>
                                        Control de Existencias
                                    </div>
                                </div>
                                <div class="info-grid-2col" style="row-gap: 16px;">

                                    <div class="info-item" style="flex-direction: column; align-items: flex-start; gap: 6px;">
                                        <label class="info-label" for="ins-stock-bento">Stock Inicial</label>
                                        <input id="ins-stock-bento"
                                               type="number"
                                               min="0"
                                               placeholder="0"
                                               style="width:100%; padding:8px 10px; border:1px solid var(--border-color); border-radius:6px; font-size:14px; font-family:var(--font-family); color:var(--text-primary); background:var(--bg-main);">
                                    </div>

                                    <div class="info-item" style="flex-direction: column; align-items: flex-start; gap: 6px;">
                                        <label class="info-label" for="ins-minimo-bento">Reserva Mínima</label>
                                        <input id="ins-minimo-bento"
                                               type="number"
                                               min="0"
                                               placeholder="5"
                                               style="width:100%; padding:8px 10px; border:1px solid var(--border-color); border-radius:6px; font-size:14px; font-family:var(--font-family); color:var(--text-primary); background:var(--bg-main);">
                                    </div>

                                </div>

                                <!-- Toggle: Material estéril / controlado -->
                                <div style="display:flex; align-items:center; gap:10px; margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color);">
                                    <input id="ins-esteril-bento"
                                           type="checkbox"
                                           style="width:16px; height:16px; cursor:pointer; accent-color: #10B981;">
                                    <label for="ins-esteril-bento"
                                           style="font-size:13px; color:var(--text-secondary); cursor:pointer; font-family:var(--font-family);">
                                        Marcar como material estéril / controlado
                                    </label>
                                </div>
                            </div>

                        </div>

                        <!-- COLUMNA DERECHA -->
                        <div class="grid-column">

                            <!-- Tarjeta: Identificación del producto -->
                            <div class="card">
                                <div class="section-header">
                                    <div class="section-title">
                                        <span class="material-symbols-rounded" style="font-size:18px; color:var(--text-secondary);">label</span>
                                        Identificación del Material
                                    </div>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:14px;">

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="ins-nombre-bento">Nombre comercial <span style="color:#ef4444;">*</span></label>
                                        <input id="ins-nombre-bento"
                                               type="text"
                                               placeholder="Ej. Gasa Estéril 10x10cm"
                                               required
                                               style="width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:6px; font-size:14px; font-family:var(--font-family); color:var(--text-primary); background:var(--bg-main); box-sizing:border-box;">
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="ins-marca-bento">Marca / Fabricante</label>
                                        <input id="ins-marca-bento"
                                               type="text"
                                               placeholder="Ej. Leukoplast"
                                               style="width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:6px; font-size:14px; font-family:var(--font-family); color:var(--text-primary); background:var(--bg-main); box-sizing:border-box;">
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="ins-codigo-bento">Código / Presentación</label>
                                        <input id="ins-codigo-bento"
                                               type="text"
                                               placeholder="Ej. INS-GAS-10X10 o Paquete 100 pz"
                                               style="width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:6px; font-size:14px; font-family:var(--font-family); color:var(--text-primary); background:var(--bg-main); box-sizing:border-box;">
                                    </div>

                                </div>
                            </div>

                            <!-- Tarjeta: Clasificación -->
                            <div class="card">
                                <div class="section-header">
                                    <div class="section-title">
                                        <span class="material-symbols-rounded" style="font-size:18px; color:var(--text-secondary);">category</span>
                                        Clasificación
                                    </div>
                                </div>
                                <div class="info-grid-2col" style="row-gap: 16px;">

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="ins-categoria-bento">Categoría <span style="color:#ef4444;">*</span></label>
                                        <select id="ins-categoria-bento"
                                                required
                                                style="width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:6px; font-size:14px; font-family:var(--font-family); color:var(--text-primary); background:var(--bg-card); cursor:pointer;">
                                            <option value="">Seleccionar...</option>
                                            <option value="insumos">Insumos</option>
                                            <option value="farmacia">Farmacia</option>
                                            <option value="tienda">Tienda</option>
                                            <option value="dietas">Dietas</option>
                                        </select>
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label class="info-label" for="ins-unidad-bento">Unidad de Medida <span style="color:#ef4444;">*</span></label>
                                        <select id="ins-unidad-bento"
                                                required
                                                style="width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:6px; font-size:14px; font-family:var(--font-family); color:var(--text-primary); background:var(--bg-card); cursor:pointer;">
                                            <option value="">Seleccionar...</option>
                                            <option value="Pieza">Pieza</option>
                                            <option value="Paquete">Paquete</option>
                                            <option value="Caja">Caja</option>
                                            <option value="Frasco">Frasco</option>
                                            <option value="Rollo">Rollo</option>
                                            <option value="Kit">Kit</option>
                                            <option value="ml">ml</option>
                                            <option value="g">g</option>
                                        </select>
                                    </div>

                                </div>
                            </div>

                            <!-- Botones de acción -->
                            <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:4px;">
                                <button type="button"
                                        id="btn-cancelar-nuevo-insumo"
                                        class="btn btn-outline"
                                        onclick="document.getElementById('btn-cerrar-panel-nuevo-insumo').click()">
                                    Cancelar
                                </button>
                                <button type="submit"
                                        class="btn btn-primary"
                                        style="min-width:140px;">
                                    <span class="material-symbols-rounded" style="font-size:16px; vertical-align:middle; margin-right:4px;">save</span>
                                    Guardar Insumo
                                </button>
                            </div>

                        </div>

                    </div>
                </form>

            </div><!-- /contenido-scrollable -->
        </div><!-- /ventana-modal-bento -->
    </div><!-- /modal-backdrop-premium -->
    `}export{e as inicializarInventarioInsumos};