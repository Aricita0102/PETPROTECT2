function e(){console.log(`🩺 [FARMACIA] Inicializando sistemas de control de medicamentos...`),r(),i(),t()}function t(){let e=document.getElementById(`btn-abrir-modal-medicamento`),t=document.getElementById(`contenedor-modal-dinamico`);if(!e||!t){console.warn(`⚠️ [FARMACIA] Botón de nuevo fármaco o contenedor dinámico no encontrado.`);return}e.addEventListener(`click`,()=>{t.innerHTML=n();let e=document.getElementById(`modal-nuevo-med-bento`),r=document.getElementById(`btn-cerrar-panel-nuevo-med`),i=document.getElementById(`form-nuevo-med-bento`),a=document.getElementById(`med-lote-bento`),o=document.getElementById(`preview-barcode-med`);if(!e)return;let s=()=>{e.classList.remove(`visible`),e.setAttribute(`aria-hidden`,`true`),setTimeout(()=>t.innerHTML=``,350)};r&&r.addEventListener(`click`,s),e.addEventListener(`click`,t=>{t.target===e&&s()}),a&&o&&a.addEventListener(`input`,e=>{o.textContent=e.target.value.trim().toUpperCase()||`L-000000`}),setTimeout(()=>{e.classList.add(`visible`),e.setAttribute(`aria-hidden`,`false`),setTimeout(()=>{let e=document.getElementById(`med-nombre-bento`);e&&e.focus()},400)},50),i&&i.addEventListener(`submit`,async e=>{e.preventDefault();let t=document.getElementById(`med-caducidad-bento`).value,n=new Date(t+`T00:00:00`),r=new Date;if(r.setHours(0,0,0,0),n<=r){alert(`⚠️ ALERTA MÉDICA: No puede registrar un lote que ya está caducado o caduca hoy.`),document.getElementById(`med-caducidad-bento`).focus();return}let a=i.querySelector(`button[type="submit"]`),o=a.innerHTML;a.disabled=!0,a.innerHTML=`<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Registrando...`,a.style.opacity=`0.7`;let c={nombre:document.getElementById(`med-nombre-bento`).value.trim(),sustancia:document.getElementById(`med-sustancia-bento`).value.trim(),via:document.getElementById(`med-via-bento`).value,presentacion:document.getElementById(`med-presentacion-bento`).value,lote:document.getElementById(`med-lote-bento`).value.trim(),caducidad:t,controlado:document.getElementById(`med-controlado-bento`).checked,unidadMedida:document.getElementById(`med-unidad-bento`).value,stockInicial:parseFloat(document.getElementById(`med-stock-bento`).value)||0,stockMinimo:parseFloat(document.getElementById(`med-minimo-bento`).value)||5};console.log(`📦 [FARMACIA] Fármaco listo para guardar:`,c);try{await new Promise(e=>setTimeout(e,1200)),alert(`✅ ¡Fármaco "${c.nombre}" agregado al inventario!`),s()}catch(e){console.error(`💥 [ERROR] Fallo al registrar fármaco:`,e)}finally{a.disabled=!1,a.innerHTML=o,a.style.opacity=`1`}})})}function n(){return`
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
    `}function r(){let e=document.querySelector(`.buscador-universal-bento input`),t=document.querySelector(`.filtros-tabla select`),n=document.querySelectorAll(`.tabla-saas tbody tr`);if(!e||!t||n.length===0)return;let r=()=>{let r=e.value.toLowerCase().trim(),i=t.value;n.forEach(e=>{let t=e.textContent.toLowerCase().includes(r),n=!0,a=e.querySelector(`.badge-estado`);i!==`todos`&&a&&(i===`critico`&&!a.classList.contains(`critico`)&&(n=!1),i===`caducar`&&!a.classList.contains(`advertencia`)&&(n=!1)),e.style.display=t&&n?``:`none`})};e.addEventListener(`input`,r),t.addEventListener(`change`,r)}function i(){let e=document.getElementById(`contenedor-modal-dinamico`),t=document.querySelector(`.tabla-contenedor`);t&&e&&t.addEventListener(`click`,async t=>{let n=t.target.closest(`.boton-fantasma-icono`);if(n){t.preventDefault(),console.log(`🛠️ [FARMACIA] Solicitando historia clínica del fármaco (Panel Bento)...`),n.style.opacity=`0.5`;try{let t=`${window.location.pathname.includes(`/PETPROTECT`)?`/PETPROTECT`:``}/MODAL_INFORMACIÓN_PRODUCTO.html`,r=await fetch(t);if(!r.ok)throw Error(`Fallo al obtener el layout del panel Bento.`);e.innerHTML=await r.text();let i=document.getElementById(`estudioOverlay`),a=document.getElementById(`panelDetalleProducto`),o=document.getElementById(`btn-cerrar-panel-detalle`);if(i&&a){let t=()=>{a.classList.remove(`abierto`),i.classList.remove(`abierto`),setTimeout(()=>{e.innerHTML=``},300)};o&&o.addEventListener(`click`,t),i.addEventListener(`click`,e=>{e.target===i&&t()}),setTimeout(()=>{i.classList.add(`abierto`),a.classList.add(`abierto`),n.style.opacity=`1`},50)}}catch(e){console.error(`💥 [ERROR] No se pudo levantar el panel Bento:`,e),alert(`Error de conexión al cargar la información médica del producto. Revisa la ruta del archivo.`),n.style.opacity=`1`}}})}export{e as inicializarFarmacia};