import{i as e,n as t}from"./conexion-DiH-JvMT.js";var n=null;async function r(){console.log(`[DIETAS] Inicializando catalogo de dietas de prescripcion...`);try{let r=await e();if(!r)throw Error(`Sin sesion activa`);let{data:i,error:a}=await t.from(`perfiles`).select(`id, organizacion_id, sucursal_id, rol`).eq(`id`,r.id).single();if(a||!i)throw Error(`Perfil no encontrado`);n=i}catch(e){console.error(`[DIETAS] Error critico de identidad:`,e.message);return}o(),l(),s(),f(),i(),window._listenerAlertaInventarioDietas||(window.addEventListener(`petprotect:abrir_inventario_desde_alerta`,e=>{let t=e.detail.id;console.log(`[DIETAS] Abriendo modal desde alerta interactiva:`,t),u(t)}),window._listenerAlertaInventarioDietas=!0)}async function i(){let e=document.getElementById(`tbody-dietas`);if(e){e.innerHTML=`<tr><td colspan="7" class="texto-centro">Cargando dietas...</td></tr>`;try{if(!n?.organizacion_id){e.innerHTML=`<tr><td colspan="7" class="texto-centro texto-peligro">Error: No se pudo identificar tu clinica. Recarga la pagina.</td></tr>`;return}let{data:r,error:i}=await t.from(`inventario_productos`).select(`*`).eq(`organizacion_id`,n.organizacion_id).eq(`categoria`,`dietas`).order(`created_at`,{ascending:!1});if(i)throw i;if(!r||r.length===0){e.innerHTML=`<tr><td colspan="7" class="texto-centro" style="color: var(--text-muted);">No hay dietas registradas.</td></tr>`;return}e.innerHTML=``,r.forEach(t=>{let n=document.createElement(`tr`),r=t.nombre_comercial||`Dieta sin nombre`;t.precio_venta&&`${parseFloat(t.precio_venta).toFixed(2)}`;let i=parseFloat(t.stock_total)||0,o=parseFloat(t.stock_minimo)||5,s=t.codigo_barras||`SIN-SKU`,c=t.metadata?.marca||`N/A`,l=t.metadata?.subcategoria||`otra`,u=a(l),d=t.metadata?.especie||`N/A`,f=t.metadata?.peso&&t.metadata?.unidad_peso?`${t.unidad_medida||`Bolsa`} ${t.metadata.peso} ${t.metadata.unidad_peso}`:t.unidad_medida||`N/A`,p=``;p=i>o?`<span class="badge-stock optimo" style="font-weight:bold; padding:4px 8px; border-radius:4px; background:#D1FAE5; color:#10B981;">Óptimo</span>`:i>0?`<span class="badge-stock critico" style="font-weight:bold; padding:4px 8px; border-radius:4px; background:#FEF3C7; color:#F59E0B;">Agotándose</span>`:`<span class="badge-stock agotado" style="font-weight:bold; padding:4px 8px; border-radius:4px; background:#FEE2E2; color:#EF4444;">Agotado</span>`,n.innerHTML=`
                <td>
                    <div class="celda-producto">
                        <span class="icono-producto material-symbols-rounded">nutrition</span>
                        <div class="info-texto">
                            <strong>${r}</strong>
                            <small>${c}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="etiqueta-categoria ${l}">${u}</span>
                </td>
                <td>
                    <span style="display:flex; align-items:center; gap:4px; font-size:13px;">
                        <span class="material-symbols-rounded" style="font-size:16px; color:#6b7280;">pets</span> ${d}
                    </span>
                </td>
                <td>${f}</td>
                <td class="texto-derecha ${i<=o?`texto-peligro`:``}"><strong>${i}</strong> <small>Unids.</small></td>
                <td class="texto-centro">${p}</td>
                <td class="texto-centro acciones-celda">
                    <button class="boton-fantasma-icono btn-imprimir-etiqueta" data-sku="${s}" title="Imprimir Etiqueta" style="background:rgba(137, 194, 217, 0.15); border:none; color:var(--cobalto); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">print</span>
                    </button>
                    <button class="boton-fantasma-icono btn-editar-dieta" data-id="${t.id}" title="Editar" style="background:rgba(242, 116, 5, 0.15); border:none; color:var(--naranja); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">edit</span>
                    </button>
                </td>
            `,e.appendChild(n)}),o()}catch(t){console.error(`[ERROR] Fallo al recuperar dietas:`,t.message),e.innerHTML=`<tr><td colspan="7" class="texto-centro texto-peligro">Error de conexion al cargar las dietas.</td></tr>`}}}function a(e){return{renal:`Soporte Renal`,hepatica:`Soporte Hepático`,digestiva:`Digestivo Sensible`,cardiaca:`Soporte Cardíaco`,obesidad:`Control de Peso`,dermatologica:`Dermatológica`,urinaria:`Urinaria`,articular:`Articular / Movilidad`}[e]||`Otra Indicación`}function o(){let e=document.getElementById(`input-busqueda-dieta`),t=document.getElementById(`select-filtro-dieta`),n=document.querySelectorAll(`#tabla-productos-dietas tbody tr`),r=document.getElementById(`estado-vacio-dietas`);if(!e||!t||n.length===0)return;let i=()=>{let i=e.value.toLowerCase().trim(),a=t.value.toLowerCase(),o=0;n.forEach(e=>{let t=e.textContent.toLowerCase().includes(i),n=!0;if(a!==`todos`){let t=e.querySelector(`.etiqueta-categoria`);t&&(n=t.classList.contains(a))}t&&n?(e.style.display=``,o++):e.style.display=`none`}),r&&(r.style.display=o===0?`block`:`none`)};e.addEventListener(`input`,i),t.addEventListener(`change`,i)}function s(){let e=document.getElementById(`btn-abrir-modal-dieta`),r=document.getElementById(`contenedor-modal-dinamico`);!e||!r||e.addEventListener(`click`,()=>{r.innerHTML=c();let e=document.getElementById(`nuevaDietaOverlay`),a=document.getElementById(`modal-nueva-dieta-bento`),o=document.getElementById(`btn-cerrar-panel-nueva-dieta`),s=document.getElementById(`form-nueva-dieta-bento`);if(!a||!e)return;let l=()=>{a.classList.remove(`abierto`),e.classList.remove(`abierto`),setTimeout(()=>r.innerHTML=``,350)};o&&o.addEventListener(`click`,l),e.addEventListener(`click`,t=>{t.target===e&&l()});let u=document.getElementById(`contenedor-imagen-bento`),d=document.getElementById(`input-imagen-dieta`),f=document.getElementById(`placeholder-imagen`),p=document.getElementById(`preview-imagen-dieta`),m=document.getElementById(`btn-remover-imagen`),h=null;u&&d&&(u.addEventListener(`click`,e=>{e.target!==m&&!m.contains(e.target)&&d.click()}),d.addEventListener(`change`,e=>{let t=e.target.files[0];if(t){let e=new FileReader;e.onload=function(e){let t=new Image;t.onload=function(){let e=document.createElement(`canvas`),n=e.getContext(`2d`);e.width=t.width,e.height=t.height,n.fillStyle=`#FFFFFF`,n.fillRect(0,0,e.width,e.height),n.drawImage(t,0,0),h=e.toDataURL(`image/jpeg`,.95),p.src=h,p.style.display=`block`,f.style.display=`none`,m.style.display=`flex`},t.src=e.target.result},e.readAsDataURL(t)}}),m.addEventListener(`click`,e=>{e.stopPropagation(),d.value=``,h=null,p.src=``,p.style.display=`none`,f.style.display=`flex`,m.style.display=`none`}));let g=document.getElementById(`dieta-costo-bento`),_=document.getElementById(`dieta-precio-bento`),v=document.getElementById(`dieta-precio-base-bento`);v&&_&&(v.addEventListener(`input`,()=>{_.value=((parseFloat(v.value)||0)*1.16).toFixed(2)}),_.addEventListener(`input`,()=>{v.value=((parseFloat(_.value)||0)/1.16).toFixed(2)}));let y=document.createElement(`div`);y.style=`font-size: 11px; color: #6b7280; margin-top: 4px;`,_.parentNode.appendChild(y),g.addEventListener(`input`,()=>{let e=parseFloat(g.value);if(isNaN(e)||e<=0){y.innerHTML=``;return}let t=.25,n=e/(1-t),r=n*1.16,i=(n-e)/e*100;y.innerHTML=`Sugerido: <strong>$${r.toFixed(2)} MXN</strong> (Margen: ${t*100}%, ROI: ${i.toFixed(1)}%, IVA 16% inc.) <button type="button" id="btn-aplicar-sugerido-alta" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;let a=document.getElementById(`btn-aplicar-sugerido-alta`);a&&a.addEventListener(`click`,e=>{e.preventDefault(),_.value=r.toFixed(2),_.dispatchEvent(new Event(`input`))}),_.value||=r.toFixed(2)}),setTimeout(()=>{e.classList.add(`abierto`),a.classList.add(`abierto`),setTimeout(()=>{let e=document.getElementById(`dieta-nombre-bento`);e&&e.focus()},400)},50),s&&s.addEventListener(`submit`,async e=>{e.preventDefault();let r=document.getElementById(`dieta-nombre-bento`).value.trim(),a=document.getElementById(`dieta-indicacion-bento`).value,o=document.getElementById(`dieta-especie-bento`).value,c=document.getElementById(`dieta-presentacion-bento`).value,u=parseFloat(_.value);if(!r||!a||!o||isNaN(u)||u<=0){alert(`Por favor, completa todos los campos obligatorios correctamente.`);return}let d=s.querySelector(`button[type="submit"]`),f=d.innerHTML;d.disabled=!0,d.innerHTML=`<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Guardando...`;let p=document.getElementById(`dieta-sku-bento`).value.trim()||`VP-DIE-`+Date.now().toString().slice(-6),m=parseInt(document.getElementById(`dieta-stock-bento`).value)||0;try{if(!n?.organizacion_id)throw Error(`Sin clínica`);let e={organizacion_id:n.organizacion_id,sucursal_id:n.sucursal_id,created_by:n.id,categoria:`dietas`,nombre_comercial:r,unidad_medida:c,precio_venta:u,codigo_barras:p,stock_total:m,stock_minimo:parseInt(document.getElementById(`dieta-reorden-bento`).value)||5,imagen_url:h,metadata:{indicacion:a,marca:document.getElementById(`dieta-marca-bento`).value.trim(),especie:o,tipo:document.getElementById(`dieta-tipo-bento`).value,etapa:document.getElementById(`dieta-etapa-bento`).value,costoProveedor:parseFloat(g.value)||0,precioBase:parseFloat(v.value)||0,aplica_iva:!0}},{data:s,error:d}=await t.from(`inventario_productos`).insert([e]).select(`id`).single();if(d)throw d;m>0&&await t.from(`inventario_movimientos`).insert([{organizacion_id:n.organizacion_id,sucursal_id:n.sucursal_id,producto_id:s.id,tipo_movimiento:`entrada_compra`,cantidad:m,created_by:n.id}]),alert(`Dieta "${r}" agregada exitosamente.\nSKU: ${p}`),l(),i()}catch(e){console.error(`[ERROR] Fallo al registrar en BD:`,e),alert(`Ocurrio un error al guardar la dieta.`)}finally{d.disabled=!1,d.innerHTML=f}})})}function c(){return`
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
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">P. Final (IVA inc.) <span style="color:#F27405;">*</span></label>
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
    `}function l(){let e=document.getElementById(`tabla-productos-dietas`);e&&e.addEventListener(`click`,async e=>{let t=e.target.closest(`.btn-editar-dieta`);if(t){e.preventDefault();let n=t.getAttribute(`data-id`);if(!n)return;t.style.opacity=`0.5`,await u(n),t.style.opacity=`1`}})}async function u(e){let r=document.getElementById(`contenedor-modal-dinamico`);if(r)try{let{data:a,error:o}=await t.from(`inventario_productos`).select(`*`).eq(`id`,e).single();if(o||!a)throw o||Error(`Dieta no encontrada.`);r.innerHTML=d(a);let s=document.getElementById(`editarDietaOverlay`),c=document.getElementById(`modal-editar-dieta-bento`),l=document.getElementById(`btn-cerrar-panel-editar-dieta`),u=document.getElementById(`form-editar-dieta-bento`);if(!c||!s)return;let f=()=>{c.classList.remove(`abierto`),s.classList.remove(`abierto`),setTimeout(()=>r.innerHTML=``,350)};l&&l.addEventListener(`click`,f),s.addEventListener(`click`,e=>{e.target===s&&f()});let p=document.getElementById(`contenedor-imagen-bento-edit`),m=document.getElementById(`input-imagen-dieta-edit`),h=document.getElementById(`placeholder-imagen-edit`),g=document.getElementById(`preview-imagen-dieta-edit`),_=document.getElementById(`btn-remover-imagen-edit`),v=a.imagen_url||null;p&&m&&(p.addEventListener(`click`,e=>{e.target!==_&&!_.contains(e.target)&&m.click()}),m.addEventListener(`change`,e=>{let t=e.target.files[0];if(t){let e=new FileReader;e.onload=function(e){let t=new Image;t.onload=function(){let e=document.createElement(`canvas`),n=e.getContext(`2d`);e.width=t.width,e.height=t.height,n.fillStyle=`#FFFFFF`,n.fillRect(0,0,e.width,e.height),n.drawImage(t,0,0),v=e.toDataURL(`image/jpeg`,.95),g.src=v,g.style.display=`block`,h.style.display=`none`,_.style.display=`flex`},t.src=e.target.result},e.readAsDataURL(t)}}),_.addEventListener(`click`,e=>{e.stopPropagation(),m.value=``,v=null,g.src=``,g.style.display=`none`,h.style.display=`flex`,_.style.display=`none`}));let y=document.getElementById(`dieta-costo-bento-edit`),b=document.getElementById(`dieta-precio-bento-edit`),x=document.getElementById(`dieta-precio-base-bento-edit`);x&&b&&(x.addEventListener(`input`,()=>{b.value=((parseFloat(x.value)||0)*1.16).toFixed(2)}),b.addEventListener(`input`,()=>{x.value=((parseFloat(b.value)||0)/1.16).toFixed(2)}));let S=document.createElement(`div`);if(S.style=`font-size: 11px; color: #6b7280; margin-top: 4px;`,b){b.parentNode.appendChild(S);let e=()=>{let e=parseFloat(y.value);if(isNaN(e)||e<=0){S.innerHTML=``;return}let t=.25,n=e/(1-t),r=n*1.16,i=(n-e)/e*100;S.innerHTML=`Sugerido: <strong>$${r.toFixed(2)} MXN</strong> (Margen: ${t*100}%, ROI: ${i.toFixed(1)}%, IVA 16% inc.) <button type="button" id="btn-aplicar-sugerido-edit" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;let a=document.getElementById(`btn-aplicar-sugerido-edit`);a&&a.addEventListener(`click`,e=>{e.preventDefault(),b.value=r.toFixed(2),b.dispatchEvent(new Event(`input`))})};y.addEventListener(`input`,e),e()}setTimeout(()=>{s.classList.add(`abierto`),c.classList.add(`abierto`)},50),u&&u.addEventListener(`submit`,async e=>{e.preventDefault();let r=document.getElementById(`dieta-nombre-bento-edit`).value.trim(),o=document.getElementById(`dieta-indicacion-bento-edit`).value,s=document.getElementById(`dieta-especie-bento-edit`).value,c=document.getElementById(`dieta-presentacion-bento-edit`).value,l=parseFloat(document.getElementById(`dieta-precio-bento-edit`).value);if(!r||!o||!s||isNaN(l)||l<=0){alert(`Por favor, completa todos los campos obligatorios correctamente.`);return}let d=u.querySelector(`button[type="submit"]`),p=d.innerHTML;d.disabled=!0,d.innerHTML=`<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Guardando...`;try{if(!n?.organizacion_id)throw Error(`Sin clinica`);let e=parseInt(document.getElementById(`dieta-nuevo-stock-bento`).value)||0,u={nombre_comercial:r,unidad_medida:c,precio_venta:l,stock_total:parseInt(a.stock_total||0)+e,stock_minimo:parseInt(document.getElementById(`dieta-minimo-bento-edit`).value)||5,imagen_url:v,metadata:{indicacion:o,marca:document.getElementById(`dieta-marca-bento-edit`).value.trim(),especie:s,tipo:document.getElementById(`dieta-tipo-bento-edit`).value,etapa:document.getElementById(`dieta-etapa-bento-edit`).value,costoProveedor:parseFloat(document.getElementById(`dieta-costo-bento-edit`).value)||0,precioBase:parseFloat(document.getElementById(`dieta-precio-base-bento-edit`).value)||0,aplica_iva:!0}},{error:d}=await t.from(`inventario_productos`).update(u).eq(`id`,a.id).eq(`organizacion_id`,n.organizacion_id);if(d)throw d;e>0&&await t.from(`inventario_movimientos`).insert({organizacion_id:n.organizacion_id,sucursal_id:n.sucursal_id,producto_id:a.id,tipo_movimiento:`entrada_compra`,cantidad:e,motivo_referencia:`Ingreso manual desde edición`,created_by:n.id}),alert(`Dieta "${r}" actualizada exitosamente.`),f(),i()}catch(e){console.error(`[ERROR] Fallo al actualizar en BD:`,e),alert(`Ocurrio un error al guardar la dieta.`)}finally{d.disabled=!1,d.innerHTML=p}})}catch(e){console.error(`[ERROR] Fallo al configurar panel de edicion:`,e),alert(`No se pudo cargar la informacion para editar.`)}}function d(e){return`
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
            <p class="notif-resumen">SKU: <strong>${e.codigo_barras||`SIN SKU`}</strong></p>
        </div>

        <div class="notif-cuerpo" style="padding:24px;">
            <form id="form-editar-dieta-bento" data-id="${e.id}" style="display:flex; flex-direction:column; gap:16px;" novalidate>
                
                <!-- Subida de Imagen -->
                <div id="contenedor-imagen-bento-edit" style="width:100%; min-height:160px; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border:1.5px dashed #c2d4df; border-radius:12px; background:#f4f7fe; transition:all 0.3s ease;">
                    <input type="file" id="input-imagen-dieta-edit" accept="image/png, image/jpeg, image/webp" style="display:none;">
                    
                    <div id="placeholder-imagen-edit" style="${e.imagen_url?`display:none;`:`display:flex;`} padding:20px; flex-direction:column; align-items:center;">
                        <div style="background:#FEF2F2; width:50px; height:50px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin-bottom:10px;">
                            <span class="material-symbols-rounded" style="font-size:24px; color:#EF4444;">add_photo_alternate</span>
                        </div>
                        <p style="font-size:13px; font-weight:700; color:#032F40; margin-bottom:4px;">Haz clic para cambiar imagen</p>
                    </div>
                    
                    <img id="preview-imagen-dieta-edit" src="${e.imagen_url||``}" alt="Vista previa" style="${e.imagen_url?`display:block;`:`display:none;`} width:100%; height:100%; object-fit:contain; background-color:white; position:absolute; top:0; left:0; border-radius:10px;">
                    
                    <div id="btn-remover-imagen-edit" style="${e.imagen_url?`display:flex;`:`display:none;`} position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:28px; height:28px; justify-content:center; align-items:center; cursor:pointer; backdrop-filter:blur(4px);">
                        <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                    </div>
                </div>

                <!-- Detalles Clínicos -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Nombre de la Dieta <span style="color:#F27405;">*</span></label>
                    <input id="dieta-nombre-bento-edit" type="text" value="${e.nombre_comercial}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Marca <span style="color:#F27405;">*</span></label>
                        <input id="dieta-marca-bento-edit" type="text" value="${e.metadata?.marca||``}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Indicación Médica <span style="color:#F27405;">*</span></label>
                        <select id="dieta-indicacion-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="renal" ${e.metadata?.indicacion===`renal`?`selected`:``}>Soporte Renal</option>
                            <option value="hepatica" ${e.metadata?.indicacion===`hepatica`?`selected`:``}>Soporte Hepático</option>
                            <option value="digestiva" ${e.metadata?.indicacion===`digestiva`?`selected`:``}>Digestivo Sensible</option>
                            <option value="cardiaca" ${e.metadata?.indicacion===`cardiaca`?`selected`:``}>Soporte Cardíaco</option>
                            <option value="obesidad" ${e.metadata?.indicacion===`obesidad`?`selected`:``}>Control de Peso</option>
                            <option value="dermatologica" ${e.metadata?.indicacion===`dermatologica`?`selected`:``}>Dermatológica</option>
                            <option value="urinaria" ${e.metadata?.indicacion===`urinaria`?`selected`:``}>Urinaria / Cristales</option>
                            <option value="articular" ${e.metadata?.indicacion===`articular`?`selected`:``}>Movilidad / Articular</option>
                            <option value="recuperacion" ${e.metadata?.indicacion===`recuperacion`?`selected`:``}>Recuperación / Convalecencia</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Tipo <span style="color:#F27405;">*</span></label>
                        <select id="dieta-tipo-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="seco" ${e.metadata?.tipo===`seco`?`selected`:``}>Alimento Seco</option>
                            <option value="humedo" ${e.metadata?.tipo===`humedo`?`selected`:``}>Alimento Húmedo</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Presentación (KG/GR) <span style="color:#F27405;">*</span></label>
                        <input id="dieta-presentacion-bento-edit" type="text" value="${e.unidad_medida}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Especie Objetivo</label>
                        <select id="dieta-especie-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="Perro" ${e.metadata?.especie===`Perro`?`selected`:``}>Perro</option>
                            <option value="Gato" ${e.metadata?.especie===`Gato`?`selected`:``}>Gato</option>
                            <option value="Ambos" ${e.metadata?.especie===`Ambos`?`selected`:``}>Ambos</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Etapa de Vida</label>
                        <select id="dieta-etapa-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="Todas" ${e.metadata?.etapa===`Todas`?`selected`:``}>Todas las etapas</option>
                            <option value="Cachorro" ${e.metadata?.etapa===`Cachorro`?`selected`:``}>Cachorro / Kitten</option>
                            <option value="Adulto" ${e.metadata?.etapa===`Adulto`?`selected`:``}>Adulto</option>
                            <option value="Senior" ${e.metadata?.etapa===`Senior`?`selected`:``}>Senior</option>
                        </select>
                    </div>
                </div>

                <!-- Financiero & Stock -->
                <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Costo Proveedor ($) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-costo-bento-edit" type="number" step="0.01" min="0" value="${e.metadata?.costoProveedor||``}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">P. Base ($) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-precio-base-bento-edit" type="number" step="0.01" min="0" value="${e.metadata?.precioBase||``}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">P. Final (IVA inc.) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="dieta-precio-bento-edit" type="number" step="0.01" min="0" value="${e.precio_venta}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; color:#10B981; font-weight:bold;">
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Stock Actual <span style="color:#F27405;">*</span></label>
                        <input id="dieta-stock-bento-edit" type="number" value="${e.stock_total}" disabled style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background-color: #f1f5f9; cursor: not-allowed; font-weight:bold;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Añadir Nuevo Ingreso (+)</label>
                        <input id="dieta-nuevo-stock-bento" type="number" min="0" placeholder="Ej. 10" style="width:100%; padding:11px 14px; border:2px solid #10B981; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Punto Reorden <span style="color:#F27405;">*</span></label>
                        <input id="dieta-minimo-bento-edit" type="number" min="1" value="${e.stock_minimo}" required placeholder="5" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Código de Barras / SKU <span style="color:#F27405;">*</span></label>
                        <input id="dieta-sku-bento-edit" type="text" value="${e.codigo_barras||``}" required placeholder="Ej. RX-RC-REN-01" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
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
    `}function f(){let e=document.getElementById(`tabla-productos-dietas`);e&&e.addEventListener(`click`,e=>{let t=e.target.closest(`.btn-imprimir-etiqueta`);if(!t)return;e.preventDefault(),e.stopPropagation();let n=t.getAttribute(`data-sku`),r=t.closest(`tr`);p(n,r.querySelector(`.info-texto strong`)?r.querySelector(`.info-texto strong`).textContent:`Dieta`,r.querySelector(`td:nth-child(5) strong`)?r.querySelector(`td:nth-child(5) strong`).textContent:`$0.00`)})}function p(e,t,n){let r=window.open(``,`PRINT`,`height=400,width=600`);r.document.write(`
        <html>
            <head>
                <title>Etiqueta ${e}</title>
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
                <div class="titulo">${t}</div>
                <div class="precio">${n}</div>
                <svg id="codigo-impresion"></svg>
            </body>
        </html>
    `);let i=r.document.createElement(`script`);i.src=`https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js`,i.onload=()=>{r.JsBarcode(`#codigo-impresion`,e,{format:`CODE128`,displayValue:!0,fontSize:10,margin:0,height:40,textMargin:2}),r.document.close(),setTimeout(()=>{r.focus(),r.print(),r.close()},350)},r.document.body.appendChild(i)}export{r as inicializarInventarioDietas};