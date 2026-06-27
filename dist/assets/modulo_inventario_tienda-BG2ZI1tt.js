import{i as e,n as t}from"./conexion-DiH-JvMT.js";var n=null,r=!1;async function i(){console.log(`[TIENDA] Inicializando catalogo inteligente de mostrador...`);try{let r=await e();if(!r)throw Error(`Sin sesion activa`);let{data:i,error:a}=await t.from(`perfiles`).select(`id, organizacion_id, sucursal_id, rol`).eq(`id`,r.id).single();if(a||!i)throw Error(`Perfil no encontrado`);n=i,console.log(`[TIENDA] Sesion verificada: org=${i.organizacion_id}`)}catch(e){console.error(`[TIENDA] Error critico de identidad:`,e.message);return}l(),u(),o(),p(),s(),a(),window._listenerAlertaInventarioTienda||(window.addEventListener(`petprotect:abrir_inventario_desde_alerta`,e=>{let t=e.detail.id;console.log(`[TIENDA] Abriendo modal desde alerta interactiva:`,t),d(t)}),window._listenerAlertaInventarioTienda=!0)}async function a(){let e=document.getElementById(`cuerpo-tabla-tienda`);if(e){e.innerHTML=`
        <tr>
            <td colspan="7" class="texto-centro" style="padding: 60px;">
                <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"><\/script>
                <lottie-player src="/json/lottiecarga.json" background="transparent" speed="1" style="width: 150px; height: 150px; margin: 0 auto;" loop autoplay></lottie-player>
                <p style="color:var(--cobalto); font-weight:600; margin-top:10px;">Cargando inventario de mostrador...</p>
            </td>
        </tr>
    `;try{if(!n?.organizacion_id){e.innerHTML=`<tr><td colspan="7" class="texto-centro texto-peligro">Error: No se pudo identificar tu clinica. Recarga la pagina.</td></tr>`;return}let{data:r,error:i}=await t.from(`inventario_productos`).select(`*`).eq(`organizacion_id`,n.organizacion_id).eq(`categoria`,`tienda`).order(`created_at`,{ascending:!1});if(i)throw i;if(!r||r.length===0){e.innerHTML=`<tr><td colspan="7" class="texto-centro" style="color: var(--text-muted);">No hay articulos registrados en mostrador.</td></tr>`;return}e.innerHTML=``;let a=new Map;r.forEach(t=>{let n=document.createElement(`tr`),r=t.nombre_comercial||`Producto sin nombre`,i=t.precio_venta?`$${parseFloat(t.precio_venta).toFixed(2)}`:`$0.00`,o=parseFloat(t.stock_total)||0,s=parseFloat(t.stock_minimo)||5,c=t.codigo_barras||`SIN-SKU`,l=t.metadata?.talla||t.unidad_medida||`N/A`,u=t.metadata?.colorHex||``,d=t.metadata?.colorNombre||``,f=t.metadata?.subcategoria||``;n.setAttribute(`data-color`,u),n.setAttribute(`data-categoria`,f),u&&d&&a.set(u,d),n.innerHTML=`
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${u?`<div style="width:8px; height:32px; border-radius:4px; background-color:${u};" title="${t.metadata?.colorNombre||``}"></div>`:`<div style="width:8px; height:32px; border-radius:4px; background-color:transparent;"></div>`}
                        ${t.imagen_url?`<img src="${t.imagen_url}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0; background:#fff;" alt="Img">`:`<div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; border:1px solid #e2e8f0; display:flex; justify-content:center; align-items:center;"><span class="material-symbols-rounded" style="font-size:16px; color:#94a3b8;">image</span></div>`}
                        <div class="info-texto">
                            <strong>${r}</strong>
                            <br><small style="color:var(--text-secondary)">Tienda Retail</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="etiqueta-estado">${l}</span>
                </td>
                <td><span class="code-chip">${c}</span></td>
                <td class="texto-derecha"><strong>${i}</strong></td>
                <td class="texto-derecha">
                    <span class="${o<=s?`badge-stock critico`:`badge-stock optimo`}" style="font-weight:bold; padding:4px 8px; border-radius:4px; ${o<=s?`background:#FEE2E2; color:#EF4444;`:`background:#D1FAE5; color:#10B981;`}">
                        ${o} <small>Unids.</small>
                    </span>
                </td>
                <td class="texto-centro">
                    ${o>0?o<=s?`<span class="indicador-ok" style="color: #F59E0B; font-weight:bold;">Stock Bajo</span>`:`<span class="indicador-ok" style="color: #10B981; font-weight:bold;">Stock Optimo</span>`:`<span class="indicador-error" style="color: #EF4444; font-weight:bold;">Agotado</span>`}
                </td>
                <td class="texto-centro acciones-celda">
                    <button class="boton-fantasma-icono btn-imprimir-etiqueta" data-sku="${c}" title="Imprimir Etiqueta" style="background:rgba(137, 194, 217, 0.15); border:none; color:var(--cobalto); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">print</span>
                    </button>
                    <button class="boton-fantasma-icono btn-editar-tienda" data-id="${t.id}" title="Editar" style="background:rgba(242, 116, 5, 0.15); border:none; color:var(--naranja); cursor:pointer; padding:6px; border-radius:8px; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:20px;">edit</span>
                    </button>
                </td>
            `,e.appendChild(n)});let o=document.getElementById(`filtro-color-tienda`);o&&(o.innerHTML=`<option value="todos">Todos los colores</option>`,a.forEach((e,t)=>{let n=document.createElement(`option`);n.value=t.toLowerCase(),n.textContent=`■ ${e}`,n.style.color=t,n.style.fontWeight=`bold`,o.appendChild(n)})),l()}catch(t){console.error(`[ERROR] Fallo al recuperar inventario:`,t.message),e.innerHTML=`<tr><td colspan="7" class="texto-centro texto-peligro">Error de conexion al cargar el inventario.</td></tr>`}}}function o(){let e=document.getElementById(`btn-abrir-modal-tienda`),t=document.getElementById(`contenedor-modal-dinamico`);if(!e||!t){console.warn(`[TIENDA] Boton de nuevo articulo o contenedor dinamico no encontrado.`);return}e.addEventListener(`click`,()=>{t.innerHTML=c();let e=document.getElementById(`nuevoTiendaOverlay`),n=document.getElementById(`modal-nuevo-tienda-bento`),r=document.getElementById(`btn-cerrar-panel-nuevo-tienda`);document.getElementById(`form-nuevo-tienda-bento`);let i=document.getElementById(`tienda-color-hex-bento`),a=document.getElementById(`tienda-color-nombre-bento`);if(!n||!e)return;let o=()=>{n.classList.remove(`abierto`),e.classList.remove(`abierto`),setTimeout(()=>t.innerHTML=``,350)};r&&r.addEventListener(`click`,o),e.addEventListener(`click`,t=>{t.target===e&&o()});let s=document.getElementById(`contenedor-imagen-bento`),l=document.getElementById(`input-imagen-tienda`),u=document.getElementById(`placeholder-imagen`),d=document.getElementById(`preview-imagen-tienda`),f=document.getElementById(`btn-remover-imagen`),p=null;s&&l&&(s.addEventListener(`click`,e=>{e.target!==f&&!f.contains(e.target)&&l.click()}),l.addEventListener(`change`,e=>{let t=e.target.files[0];if(t){let e=new FileReader;e.onload=function(e){let t=new Image;t.onload=function(){let e=document.createElement(`canvas`),n=e.getContext(`2d`);e.width=t.width,e.height=t.height,n.fillStyle=`#FFFFFF`,n.fillRect(0,0,e.width,e.height),n.drawImage(t,0,0),p=e.toDataURL(`image/jpeg`,.95),d.src=p,d.style.display=`block`,u.style.display=`none`,f.style.display=`flex`},t.src=e.target.result},e.readAsDataURL(t)}}),f.addEventListener(`click`,e=>{e.stopPropagation(),l.value=``,p=null,d.src=``,d.style.display=`none`,u.style.display=`flex`,f.style.display=`none`})),i&&a&&i.addEventListener(`input`,e=>{a.value.trim()===``&&(a.value=e.target.value.toUpperCase())});let m=document.getElementById(`tienda-categoria-bento`),h=document.getElementById(`contenedor-talla-dinamico`);m&&h&&(m.addEventListener(`change`,e=>{let t=e.target.value;if(h.style.display=`flex`,t===``)h.style.gridColumn=``,h.style.display=`none`,h.innerHTML=`<input type="hidden" id="tienda-talla-bento" value="">`;else if(t===`alimento`){h.style.gridColumn=`1 / -1`,h.innerHTML=`
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
                    `;let e=()=>{let e=document.getElementById(`tienda-especie-temp`).value,t=document.getElementById(`tienda-tamano-temp`).value,n=document.getElementById(`tienda-peso-numero`).value,r=document.getElementById(`tienda-peso-unidad`).value,i=e?t?`${e} - ${t}`:e:``;n&&(i+=i?` (${n}${r})`:`${n}${r}`),document.getElementById(`tienda-talla-bento`).value=i};document.getElementById(`tienda-especie-temp`).addEventListener(`change`,e),document.getElementById(`tienda-tamano-temp`).addEventListener(`change`,e),document.getElementById(`tienda-peso-numero`).addEventListener(`input`,e),document.getElementById(`tienda-peso-unidad`).addEventListener(`change`,e)}else t===`juguetes`?h.innerHTML=`
                        <label class="info-label" for="tienda-talla-bento">Tamaño</label>
                        <select id="tienda-talla-bento" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="Pequeño">Pequeño</option>
                            <option value="Mediano">Mediano</option>
                            <option value="Grande">Grande</option>
                            <option value="Gigante">Gigante</option>
                        </select>
                    `:t===`accesorios`?h.innerHTML=`
                        <label class="info-label" for="tienda-talla-bento">Talla (Mexico)</label>
                        <select id="tienda-talla-bento" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="CH">Chica (CH)</option>
                            <option value="M">Mediana (M)</option>
                            <option value="G">Grande (G)</option>
                            <option value="EG">Extra Grande (EG)</option>
                        </select>
                    `:t===`higiene`&&(h.innerHTML=`
                        <label class="info-label" for="tienda-talla-bento">Presentacion</label>
                        <select id="tienda-talla-bento" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="100ml">100 ml</option>
                            <option value="250ml">250 ml</option>
                            <option value="500ml">500 ml</option>
                            <option value="1L">1 Litro</option>
                            <option value="Paquete">Paquete / Toallitas</option>
                        </select>
                    `)}),m.dispatchEvent(new Event(`change`)));let g=document.getElementById(`tienda-costo-bento`),_=document.getElementById(`tienda-precio-bento`),v=document.getElementById(`tienda-precio-base-bento`);v&&_&&(v.addEventListener(`input`,e=>{e.isTrusted&&(v.dataset.modificado=`true`,_.dataset.modificado=`true`),_.value=((parseFloat(v.value)||0)*1.16).toFixed(2)}),_.addEventListener(`input`,e=>{e.isTrusted&&(v.dataset.modificado=`true`,_.dataset.modificado=`true`),v.value=((parseFloat(_.value)||0)/1.16).toFixed(2)}));let y=document.createElement(`div`);y.style=`font-size: 11px; color: #6b7280; margin-top: 4px;`,_.parentNode.appendChild(y);let b=()=>{let e=parseFloat(g.value),t=m.value;if(isNaN(e)||e<=0){y.innerHTML=``;return}let n=.3;t===`alimento`?n=.2:t===`accesorios`?n=.5:t===`juguetes`?n=.45:t===`higiene`&&(n=.35);let r=e/(1-n),i=Math.round(r*1.16),a=(i/1.16-e)/e*100;y.innerHTML=`Sugerido: <strong>$${i.toFixed(2)} MXN</strong> (Margen: ${n*100}%, ROI: ${a.toFixed(1)}%, IVA 16% inc.) 
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
            <button type="button" id="btn-aplicar-sugerido-alta" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;let o=y.querySelector(`.info-margen-tooltip-alta`),s=y.querySelector(`.tooltip-content`);o&&s&&(o.addEventListener(`mouseenter`,()=>s.style.display=`block`),o.addEventListener(`mouseleave`,()=>s.style.display=`none`));let c=document.getElementById(`btn-aplicar-sugerido-alta`);c&&c.addEventListener(`click`,e=>{e.preventDefault(),_.dataset.modificado=`true`,v.dataset.modificado=`true`,_.value=i.toFixed(2),_.dispatchEvent(new Event(`input`))}),_.dataset.modificado!==`true`&&(_.value=i.toFixed(2),_.dispatchEvent(new Event(`input`)))};g.addEventListener(`input`,b),m.addEventListener(`change`,b),setTimeout(()=>{e.classList.add(`abierto`),n.classList.add(`abierto`),setTimeout(()=>{let e=document.getElementById(`tienda-nombre-bento`);e&&e.focus()},400)},50)})}function s(){r||(r=!0,document.addEventListener(`submit`,async e=>{if(!e.target||e.target.id!==`form-nuevo-tienda-bento`)return;e.preventDefault(),e.target;let r=document.getElementById(`tienda-nombre-bento`)?.value.trim()??``,i=document.getElementById(`tienda-categoria-bento`)?.value??``,o=parseFloat(document.getElementById(`tienda-precio-bento`)?.value);if(!r){alert(`Por favor, ingresa el nombre del producto.`),document.getElementById(`tienda-nombre-bento`)?.focus();return}if(!i){alert(`Por favor, selecciona una categoría.`),document.getElementById(`tienda-categoria-bento`)?.focus();return}if(isNaN(o)||o<=0){alert(`Por favor, ingresa un precio público válido mayor a $0.`),document.getElementById(`tienda-precio-bento`)?.focus();return}if(i===`alimento`){let e=document.getElementById(`tienda-especie-temp`)?.value??``,t=parseFloat(document.getElementById(`tienda-peso-numero`)?.value);if(!e){alert(`Por favor, selecciona la especie para el alimento.`),document.getElementById(`tienda-especie-temp`)?.focus();return}if(isNaN(t)||t<=0){alert(`Por favor, ingresa un peso numérico válido mayor a 0.`),document.getElementById(`tienda-peso-numero`)?.focus();return}}if(!n?.organizacion_id||!n?.sucursal_id){alert(`Error de sesión: No se pudo identificar tu clínica o sucursal. Recarga la página.`);return}let s=document.querySelector(`button[form="form-nuevo-tienda-bento"]`),c=s?.innerHTML??`Guardar`;s&&(s.disabled=!0,s.innerHTML=`<span class="material-symbols-rounded" style="animation:spin 1s linear infinite;vertical-align:middle;">sync</span> Guardando...`,s.style.opacity=`0.7`);let l=`VP-TIE-`+Date.now().toString().slice(-6),u=parseInt(document.getElementById(`tienda-stock-bento`)?.value)||0,d=document.getElementById(`tienda-talla-bento`),f=d?d.value.trim():``,p=i===`alimento`?parseFloat(document.getElementById(`tienda-peso-numero`)?.value):null,m=i===`alimento`?document.getElementById(`tienda-peso-unidad`)?.value??null:null,h=parseInt(document.getElementById(`tienda-reorden-bento`)?.value)||5,g=document.getElementById(`preview-imagen-tienda`),_=g&&g.src&&g.src.startsWith(`data:image`)?g.src:null,v={organizacion_id:n.organizacion_id,sucursal_id:n.sucursal_id,created_by:n.id,categoria:`tienda`,nombre_comercial:r,unidad_medida:f||`PZA`,precio_venta:o,codigo_barras:l,stock_total:u,stock_minimo:h,imagen_url:_??null,metadata:{subcategoria:i,marca:document.getElementById(`tienda-marca-bento`)?.value.trim()??``,valor_peso:p,unidad_peso:m,colorHex:document.getElementById(`tienda-color-hex-bento`)?.value??``,colorNombre:document.getElementById(`tienda-color-nombre-bento`)?.value.trim()??``,costoProveedor:parseFloat(document.getElementById(`tienda-costo-bento`)?.value)||0,precioBase:parseFloat(document.getElementById(`tienda-precio-base-bento`)?.value)||0,aplica_iva:!0}};try{let{data:e,error:i}=await t.from(`inventario_productos`).insert([v]).select(`id`).single();if(i)throw i;u>0&&(await t.from(`inventario_movimientos`).insert([{organizacion_id:n.organizacion_id,sucursal_id:n.sucursal_id,producto_id:e.id,tipo_movimiento:`entrada_compra`,cantidad:u,created_by:n.id}]),console.log(`[LEDGER] Entrada de inventario registrada: +${u} uds.`));let o=document.getElementById(`modal-nuevo-tienda-bento`),s=document.getElementById(`nuevoTiendaOverlay`),c=document.getElementById(`contenedor-modal-dinamico`);o&&o.classList.remove(`abierto`),s&&s.classList.remove(`abierto`),c&&setTimeout(()=>c.innerHTML=``,350),console.log(`[TIENDA] Artículo "${r}" guardado. SKU: ${l}`),a()}catch(e){console.error(`[TIENDA] Error al registrar producto en Supabase:`,e),alert(`Ocurrió un error al guardar el producto. Revisa la consola para detalles.`)}finally{s&&(s.disabled=!1,s.innerHTML=c,s.style.opacity=`1`)}}))}function c(){return`
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
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">P. Final (16% IVA inc.) <span style="color:#F27405;">*</span></label>
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
    </aside>`}function l(){let e=document.getElementById(`input-busqueda-tienda`),t=document.getElementById(`select-filtro-tienda`),n=document.getElementById(`filtro-color-tienda`),r=document.getElementById(`indicador-color-filtro`),i=document.querySelectorAll(`#tabla-productos-tienda tbody tr`);if(!e||!t||i.length===0)return;let a=null,o=()=>{let n=e.value.toLowerCase().trim(),r=t.value.toLowerCase();i.forEach(e=>{let t=e.textContent.toLowerCase().includes(n),i=!0;r!==`todos`&&(i=(e.getAttribute(`data-categoria`)||``)===r);let o=!0;a&&a!==`todos`&&(o=(e.getAttribute(`data-color`)?e.getAttribute(`data-color`).toLowerCase():``)===a),e.style.display=t&&i&&o?``:`none`})};e.addEventListener(`input`,o),t.addEventListener(`change`,o),n&&n.addEventListener(`change`,e=>{a=e.target.value.toLowerCase(),r&&(a!==`todos`&&a?(r.style.backgroundColor=a,r.style.display=`block`):r.style.display=`none`),o()})}function u(){let e=document.getElementById(`tabla-productos-tienda`);e&&e.addEventListener(`click`,async e=>{let t=e.target.closest(`.btn-editar-tienda`);if(t){e.preventDefault();let n=t.getAttribute(`data-id`);if(!n)return;t.style.opacity=`0.5`,await d(n),t.style.opacity=`1`}})}async function d(e){let r=document.getElementById(`contenedor-modal-dinamico`);if(!r){console.warn(`[TIENDA] Contenedor dinamico de modales no encontrado.`);return}try{let{data:i,error:o}=await t.from(`inventario_productos`).select(`*`).eq(`id`,e).single();if(o||!i)throw o||Error(`Producto no encontrado.`);r.innerHTML=f(i);let s=document.getElementById(`editarTiendaOverlay`),c=document.getElementById(`modal-editar-tienda-bento`),l=document.getElementById(`btn-cerrar-panel-editar-tienda`),u=document.getElementById(`form-editar-tienda-bento`),d=document.getElementById(`tienda-color-hex-bento-edit`),p=document.getElementById(`tienda-color-nombre-bento-edit`),m=document.querySelector(`button[form="form-editar-tienda-bento"]`);if(m&&u&&m.addEventListener(`click`,e=>{e.preventDefault(),u.reportValidity()&&u.dispatchEvent(new Event(`submit`,{cancelable:!0,bubbles:!0}))}),!c||!s)return;let h=()=>{c.classList.remove(`abierto`),s.classList.remove(`abierto`),setTimeout(()=>r.innerHTML=``,350)};l&&l.addEventListener(`click`,h),s.addEventListener(`click`,e=>{e.target===s&&h()});let g=document.getElementById(`contenedor-imagen-bento-edit`),_=document.getElementById(`input-imagen-tienda-edit`),v=document.getElementById(`placeholder-imagen-edit`),y=document.getElementById(`preview-imagen-tienda-edit`),b=document.getElementById(`btn-remover-imagen-edit`),x=i.imagen_url||null;g&&_&&(g.addEventListener(`click`,e=>{e.target!==b&&!b.contains(e.target)&&_.click()}),_.addEventListener(`change`,e=>{let t=e.target.files[0];if(t){let e=new FileReader;e.onload=function(e){let t=new Image;t.onload=function(){let e=document.createElement(`canvas`),n=e.getContext(`2d`);e.width=t.width,e.height=t.height,n.fillStyle=`#FFFFFF`,n.fillRect(0,0,e.width,e.height),n.drawImage(t,0,0),x=e.toDataURL(`image/jpeg`,.95),y.src=x,y.style.display=`block`,v.style.display=`none`,b.style.display=`flex`},t.src=e.target.result},e.readAsDataURL(t)}}),b.addEventListener(`click`,e=>{e.stopPropagation(),_.value=``,x=null,y.src=``,y.style.display=`none`,v.style.display=`flex`,b.style.display=`none`})),d&&p&&d.addEventListener(`input`,e=>{p.value.trim()===``&&(p.value=e.target.value.toUpperCase())});let S=document.getElementById(`tienda-categoria-bento-edit`),C=document.getElementById(`contenedor-talla-dinamico-edit`);S&&C&&(S.addEventListener(`change`,e=>{let t=e.target.value;if(C.style.display=`flex`,t===``)C.style.gridColumn=``,C.innerHTML=`<input type="hidden" id="tienda-talla-bento-edit" value="">`;else if(t===`alimento`){C.style.gridColumn=`1 / -1`,C.innerHTML=`
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
                    `;let e=()=>{let e=document.getElementById(`tienda-especie-temp-edit`).value,t=document.getElementById(`tienda-tamano-temp-edit`).value,n=document.getElementById(`tienda-peso-numero-edit`).value,r=document.getElementById(`tienda-peso-unidad-edit`).value,i=e?t?`${e} - ${t}`:e:``;n&&(i+=i?` (${n}${r})`:`${n}${r}`),document.getElementById(`tienda-talla-bento-edit`).value=i};document.getElementById(`tienda-especie-temp-edit`).addEventListener(`change`,e),document.getElementById(`tienda-tamano-temp-edit`).addEventListener(`change`,e),document.getElementById(`tienda-peso-numero-edit`).addEventListener(`input`,e),document.getElementById(`tienda-peso-unidad-edit`).addEventListener(`change`,e),i.metadata?.valor_peso&&(document.getElementById(`tienda-peso-numero-edit`).value=i.metadata.valor_peso),i.metadata?.unidad_peso&&(document.getElementById(`tienda-peso-unidad-edit`).value=i.metadata.unidad_peso);let t=i.unidad_medida||``,n=t.match(/^(Perro|Gato|Aves|Roedores)/);n&&(document.getElementById(`tienda-especie-temp-edit`).value=n[1]),t.includes(`Cachorro / Kitten`)?document.getElementById(`tienda-tamano-temp-edit`).value=`Cachorro / Kitten`:t.includes(`Adulto Raza Pequeña`)?document.getElementById(`tienda-tamano-temp-edit`).value=`Adulto Raza Pequeña`:t.includes(`Adulto Raza Mediana`)?document.getElementById(`tienda-tamano-temp-edit`).value=`Adulto Raza Mediana`:t.includes(`Adulto Raza Grande`)?document.getElementById(`tienda-tamano-temp-edit`).value=`Adulto Raza Grande`:t.includes(`Senior`)&&(document.getElementById(`tienda-tamano-temp-edit`).value=`Senior`),e()}else t===`juguetes`?C.innerHTML=`
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;" for="tienda-talla-bento-edit">Tamaño</label>
                        <select id="tienda-talla-bento-edit" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="Pequeño" ${i.unidad_medida===`Pequeño`?`selected`:``}>Pequeño</option>
                            <option value="Mediano" ${i.unidad_medida===`Mediano`?`selected`:``}>Mediano</option>
                            <option value="Grande" ${i.unidad_medida===`Grande`?`selected`:``}>Grande</option>
                            <option value="Gigante" ${i.unidad_medida===`Gigante`?`selected`:``}>Gigante</option>
                        </select>
                    `:t===`accesorios`?C.innerHTML=`
                        <label class="info-label" for="tienda-talla-bento-edit">Talla (Mexico)</label>
                        <select id="tienda-talla-bento-edit" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="CH" ${i.unidad_medida===`CH`?`selected`:``}>Chica (CH)</option>
                            <option value="M" ${i.unidad_medida===`M`?`selected`:``}>Mediana (M)</option>
                            <option value="G" ${i.unidad_medida===`G`?`selected`:``}>Grande (G)</option>
                            <option value="EG" ${i.unidad_medida===`EG`?`selected`:``}>Extra Grande (EG)</option>
                        </select>
                    `:t===`higiene`&&(C.innerHTML=`
                        <label class="info-label" for="tienda-talla-bento-edit">Presentacion</label>
                        <select id="tienda-talla-bento-edit" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px;">
                            <option value="">Seleccionar...</option>
                            <option value="100ml" ${i.unidad_medida===`100ml`?`selected`:``}>100 ml</option>
                            <option value="250ml" ${i.unidad_medida===`250ml`?`selected`:``}>250 ml</option>
                            <option value="500ml" ${i.unidad_medida===`500ml`?`selected`:``}>500 ml</option>
                            <option value="1L" ${i.unidad_medida===`1L`?`selected`:``}>1 Litro</option>
                            <option value="Paquete" ${i.unidad_medida===`Paquete`?`selected`:``}>Paquete / Toallitas</option>
                        </select>
                    `)}),S.dispatchEvent(new Event(`change`)));let w=document.getElementById(`tienda-costo-bento-edit`),T=document.getElementById(`tienda-precio-bento-edit`),E=document.getElementById(`tienda-precio-base-bento-edit`);E&&T&&(T.value&&(T.dataset.modificado=`true`,E.dataset.modificado=`true`),E.addEventListener(`input`,e=>{e.isTrusted&&(E.dataset.modificado=`true`,T.dataset.modificado=`true`),T.value=((parseFloat(E.value)||0)*1.16).toFixed(2)}),T.addEventListener(`input`,e=>{e.isTrusted&&(E.dataset.modificado=`true`,T.dataset.modificado=`true`),E.value=((parseFloat(T.value)||0)/1.16).toFixed(2)}));let D=document.createElement(`div`);D.style=`font-size: 11px; color: #6b7280; margin-top: 4px;`,T.parentNode.appendChild(D);let O=()=>{let e=parseFloat(w.value),t=S.value;if(isNaN(e)||e<=0){D.innerHTML=``;return}let n=.3;t===`alimento`?n=.2:t===`accesorios`?n=.5:t===`juguetes`?n=.45:t===`higiene`&&(n=.35);let r=e/(1-n),i=Math.round(r*1.16),a=(i/1.16-e)/e*100;D.innerHTML=`Sugerido: <strong>$${i.toFixed(2)} MXN</strong> (Margen: ${n*100}%, ROI: ${a.toFixed(1)}%, IVA 16% inc.) 
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
            <button type="button" id="btn-aplicar-sugerido-edit" style="margin-left: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; color: #10B981; font-weight: bold; transition: all 0.2s;">Aplicar</button>`;let o=D.querySelector(`.info-margen-tooltip-edit`),s=D.querySelector(`.tooltip-content`);o&&s&&(o.addEventListener(`mouseenter`,()=>s.style.display=`block`),o.addEventListener(`mouseleave`,()=>s.style.display=`none`));let c=document.getElementById(`btn-aplicar-sugerido-edit`);c&&c.addEventListener(`click`,e=>{e.preventDefault(),T.value=i.toFixed(2),T.dispatchEvent(new Event(`input`))})};w.addEventListener(`input`,O),S.addEventListener(`change`,O),O(),setTimeout(()=>{s.classList.add(`abierto`),c.classList.add(`abierto`),setTimeout(()=>{let e=document.getElementById(`tienda-nombre-bento-edit`);e&&e.focus()},400)},50),u&&u.addEventListener(`submit`,async e=>{e.preventDefault();let r=document.getElementById(`tienda-nombre-bento-edit`).value.trim(),o=document.getElementById(`tienda-categoria-bento-edit`).value,s=parseFloat(document.getElementById(`tienda-precio-bento-edit`).value);if(!r){alert(`Por favor, ingresa el nombre del producto.`),document.getElementById(`tienda-nombre-bento-edit`).focus();return}if(!o){alert(`Por favor, selecciona una categoria.`),document.getElementById(`tienda-categoria-bento-edit`).focus();return}if(isNaN(s)||s<=0){alert(`Por favor, ingresa un precio publico valido mayor a $0.`),document.getElementById(`tienda-precio-bento-edit`).focus();return}if(o===`alimento`){let e=document.getElementById(`tienda-especie-temp-edit`).value,t=parseFloat(document.getElementById(`tienda-peso-numero-edit`).value);if(!e){alert(`Por favor, selecciona la especie para el alimento.`),document.getElementById(`tienda-especie-temp-edit`).focus();return}if(isNaN(t)||t<=0){alert(`Por favor, ingresa un peso numerico valido mayor a 0.`),document.getElementById(`tienda-peso-numero-edit`).focus();return}}let c=document.querySelector(`button[form="form-editar-tienda-bento"]`),l=c?c.innerHTML:`Actualizar Ficha`;c&&(c.disabled=!0,c.innerHTML=`<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Guardando...`,c.style.opacity=`0.7`);let u=document.getElementById(`tienda-talla-bento-edit`),d=u?u.value.trim():``,f=o===`alimento`?parseFloat(document.getElementById(`tienda-peso-numero-edit`).value):null,p=o===`alimento`?document.getElementById(`tienda-peso-unidad-edit`).value:null,m=parseInt(document.getElementById(`tienda-nuevo-stock-bento`).value)||0,g=parseInt(i.stock_total||0)+m;try{if(!n?.organizacion_id){alert(`Error de sesion: No se pudo identificar tu clinica. Recarga la pagina.`);return}let e={nombre_comercial:r,unidad_medida:d||`PZA`,precio_venta:s,stock_total:g,stock_minimo:parseInt(document.getElementById(`tienda-minimo-bento-edit`).value)||5,imagen_url:x,metadata:{subcategoria:o,marca:document.getElementById(`tienda-marca-bento-edit`).value.trim(),valor_peso:f,unidad_peso:p,colorHex:document.getElementById(`tienda-color-hex-bento-edit`).value,colorNombre:document.getElementById(`tienda-color-nombre-bento-edit`).value.trim(),costoProveedor:parseFloat(w.value)||0,precioBase:parseFloat(E.value)||0,aplica_iva:!0}},{error:c}=await t.from(`inventario_productos`).update(e).eq(`id`,i.id).eq(`organizacion_id`,n.organizacion_id);if(c)throw c;if(m>0){let{error:e}=await t.from(`inventario_movimientos`).insert({organizacion_id:n.organizacion_id,sucursal_id:n.sucursal_id,producto_id:i.id,tipo_movimiento:`entrada_compra`,cantidad:m,motivo_referencia:`Ingreso manual desde edición`,created_by:n.id});e&&console.error(`Error al registrar movimiento:`,e)}alert(`Articulo "${r}" actualizado exitosamente.`),h(),a()}catch(e){console.error(`[ERROR] Fallo al registrar en BD unificada:`,e),alert(`Ocurrio un error al guardar el producto. Revisa la consola para detalles.`)}finally{c&&(c.disabled=!1,c.innerHTML=l,c.style.opacity=`1`)}})}catch(e){console.error(`[ERROR] Fallo al configurar panel de edicion:`,e),alert(`No se pudo cargar la informacion para editar.`)}}function f(e){let t=e.metadata?.colorHex||`#000000`,n=e.metadata?.colorNombre||``;return`
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
            <p class="notif-resumen">SKU: <strong>${e.codigo_barras||`SIN SKU`}</strong></p>
        </div>

        <div class="notif-cuerpo" style="padding:24px;">
            <form id="form-editar-tienda-bento" data-id="${e.id}" style="display:flex; flex-direction:column; gap:16px;" novalidate>
                
                <!-- Subida de Imagen -->
                <div id="contenedor-imagen-bento-edit" style="width:100%; min-height:160px; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border:1.5px dashed #c2d4df; border-radius:12px; background:#f4f7fe; transition:all 0.3s ease;">
                    <input type="file" id="input-imagen-tienda-edit" accept="image/png, image/jpeg, image/webp" style="display:none;">
                    
                    <div id="placeholder-imagen-edit" style="${e.imagen_url?`display:none;`:`display:flex;`} padding:20px; flex-direction:column; align-items:center;">
                        <div style="background:#f8fafc; width:50px; height:50px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin-bottom:10px; border:1px solid #e2e8f0;">
                            <span class="material-symbols-rounded" style="font-size:24px; color:#64748b;">cloud_upload</span>
                        </div>
                        <p style="font-size:13px; font-weight:700; color:#032F40; margin-bottom:4px;">Haz clic para cambiar imagen</p>
                    </div>
                    
                    <img id="preview-imagen-tienda-edit" src="${e.imagen_url||``}" alt="Vista previa" style="${e.imagen_url?`display:block;`:`display:none;`} width:100%; height:100%; object-fit:contain; background-color:white; position:absolute; top:0; left:0; border-radius:10px;">
                    
                    <div id="btn-remover-imagen-edit" style="${e.imagen_url?`display:flex;`:`display:none;`} position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:28px; height:28px; justify-content:center; align-items:center; cursor:pointer; backdrop-filter:blur(4px);">
                        <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                    </div>
                </div>

                <!-- Atributos Comerciales -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Nombre del Producto <span style="color:#F27405;">*</span></label>
                    <input id="tienda-nombre-bento-edit" type="text" value="${e.nombre_comercial||``}" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Marca</label>
                        <input id="tienda-marca-bento-edit" type="text" value="${e.metadata?.marca||``}" placeholder="Ej. Kong Company" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Categoría <span style="color:#F27405;">*</span></label>
                        <select id="tienda-categoria-bento-edit" required style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background:#fff;">
                            <option value="">Seleccionar...</option>
                            <option value="alimento" ${e.metadata?.subcategoria===`alimento`?`selected`:``}>Alimento / Premios</option>
                            <option value="accesorios" ${e.metadata?.subcategoria===`accesorios`?`selected`:``}>Accesorios</option>
                            <option value="juguetes" ${e.metadata?.subcategoria===`juguetes`?`selected`:``}>Juguetes</option>
                            <option value="higiene" ${e.metadata?.subcategoria===`higiene`?`selected`:``}>Higiene</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div id="contenedor-talla-dinamico-edit">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px;">Talla</label>
                        <input id="tienda-talla-bento-edit" type="text" value="${e.unidad_medida||``}" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
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
                            <input id="tienda-color-hex-bento-edit" type="color" value="${t}" style="width:40px; height:42px; border:1.5px solid #e2e8f0; border-radius:8px; padding:2px; cursor:pointer;">
                            <input id="tienda-color-nombre-bento-edit" type="text" value="${n}" placeholder="Nombre (Ej. Rojo)" style="flex:1; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                </div>

                <!-- Financiero & Stock -->
                <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:end;">
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Costo Prov. <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-costo-bento-edit" type="number" step="0.01" min="0" value="${e.metadata?.costoProveedor||``}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">P. Base <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-precio-base-bento-edit" type="number" step="0.01" min="0" value="${e.metadata?.precioBase||``}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
                        </div>
                    </div>
                    <div style="grid-column: 1 / -1; min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">P. Final (16% IVA inc.) <span style="color:#F27405;">*</span></label>
                        <div style="position:relative;">
                            <span style="position:absolute; left:12px; top:11px; color:#64748b; font-weight:600;">$</span>
                            <input id="tienda-precio-bento-edit" type="number" step="0.01" min="0" value="${e.precio_venta||``}" required placeholder="0.00" style="width:100%; padding:11px 14px 11px 26px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; color:#10B981; font-weight:bold;">
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:end;">
                    <div style="min-width:0;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Stock Actual <span style="color:#F27405;">*</span></label>
                        <input id="tienda-stock-bento-edit" type="number" value="${e.stock_total||0}" disabled style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none; background-color: #f1f5f9; cursor: not-allowed; font-weight:bold;">
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
                    <input id="tienda-minimo-bento-edit" type="number" min="1" value="${e.stock_minimo||5}" required placeholder="5" style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:'Montserrat',sans-serif; outline:none;">
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
    `}function p(){let e=document.getElementById(`tabla-productos-tienda`);e&&e.addEventListener(`click`,e=>{let t=e.target.closest(`.btn-imprimir-etiqueta`);if(!t)return;e.preventDefault(),e.stopPropagation();let n=t.getAttribute(`data-sku`),r=t.closest(`tr`);m(n,r.querySelector(`.info-texto strong`)?r.querySelector(`.info-texto strong`).textContent:`Producto`,r.querySelector(`td:nth-child(4) strong`)?r.querySelector(`td:nth-child(4) strong`).textContent:`$0.00`)})}function m(e,t,n){let r=window.open(``,`PRINT`,`height=400,width=600`);r.document.write(`
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
    `);let i=r.document.createElement(`script`);i.src=`https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js`,i.onload=()=>{r.JsBarcode(`#codigo-impresion`,e,{format:`CODE128`,displayValue:!0,fontSize:10,margin:0,height:40,textMargin:2}),r.document.close(),setTimeout(()=>{r.focus(),r.print(),r.close()},350)},r.document.body.appendChild(i)}export{i as inicializarInventarioTienda};