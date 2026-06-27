import{n as e}from"./conexion-DiH-JvMT.js";import{n as t}from"./sesion_store-BSrAgZd7.js";var n=null;async function r(){console.log(`[IMPRESIÓN] Inicializando Centro Universal de Etiquetas...`);try{let e=await t();if(!e)throw Error(`Sin sesion activa`);n=e.perfil}catch(e){console.error(`[IMPRESIÓN] Error de auth:`,e);return}let e=document.getElementById(`btn-limpiar-cola`);document.querySelectorAll(`.btn-agregar-cola`),e&&e.addEventListener(`click`,d),m(),o(),await i()}async function i(){let t=document.getElementById(`ci-tabla-body`);if(t)try{let{data:r,error:i}=await e.from(`inventario_productos`).select(`*`).eq(`organizacion_id`,n.organizacion_id).order(`created_at`,{ascending:!1});if(i)throw i;if(!r||r.length===0){t.innerHTML=`
                <tr>
                    <td colspan="3" style="text-align: center; padding: 32px; color: var(--ci-text-muted);">
                        <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;">inventory_2</span>
                        <div style="font-weight: 500;">No hay productos en el inventario.</div>
                    </td>
                </tr>
            `;return}t.innerHTML=``,r.forEach(e=>{let n=document.createElement(`tr`),r=e.codigo_barras||`TEMP-${e.id.split(`-`)[0]}`,i=e.nombre_comercial||`Producto sin nombre`,o=e.categoria||`insumos`,s=o.charAt(0).toUpperCase()+o.slice(1),c=`inventory_2`;o===`farmacia`&&(c=`vaccines`),o===`tienda`&&(c=`shopping_bag`),o===`dietas`&&(c=`set_meal`);let l=``;l=e.imagen_url&&e.imagen_url.trim()!==``?`<img src="${e.imagen_url}" alt="${i}" class="ci-product-cell__img" loading="lazy">`:`
                    <div class="ci-product-cell__icon ci-product-cell__icon--${o}">
                        <span class="material-symbols-rounded" aria-hidden="true">${c}</span>
                    </div>
                `,n.setAttribute(`data-sku`,r),n.setAttribute(`data-nombre`,i),n.setAttribute(`data-area`,o),n.innerHTML=`
                <td>
                    <div class="ci-product-cell">
                        ${l}
                        <div class="ci-product-cell__info">
                            <strong>${i}</strong>
                            <code class="ci-sku">${r}</code>
                        </div>
                    </div>
                </td>
                <td class="ci-table__col--area">
                    <span class="ci-badge ci-badge--${o}">${s}</span>
                </td>
                <td class="ci-table__col--action">
                    <button class="ci-btn ci-btn--add btn-agregar-cola" aria-label="Agregar ${i} a la cola" style="background:rgba(137, 194, 217, 0.15); color:var(--cobalto); border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:4px; transition:all 0.2s;">
                        <span class="material-symbols-rounded" aria-hidden="true" style="font-size:18px;">add</span>
                        <span class="ci-btn__label">Agregar</span>
                    </button>
                </td>
            `,n.querySelector(`.btn-agregar-cola`).addEventListener(`click`,e=>{let t=e.target.closest(`tr`);a(t.getAttribute(`data-sku`),t.getAttribute(`data-nombre`))}),t.appendChild(n)});let o=document.getElementById(`input-busqueda-global`);o&&o.dispatchEvent(new Event(`input`))}catch(e){console.error(`[IMPRESIÓN] Error cargando catálogo:`,e),t.innerHTML=`
            <tr>
                <td colspan="3" style="text-align: center; padding: 32px; color: #EF4444;">
                    <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;">error</span>
                    <div style="font-weight: 500;">Error al cargar el catálogo.</div>
                </td>
            </tr>
        `}}function a(e,t){let n=document.getElementById(`lista-cola-impresion`),r=document.getElementById(`estado-vacio-impresion`),i=document.getElementById(`btn-generar-planilla`);if(!n)return;let a=n.querySelector(`.ci-item[data-sku="${e}"]`);if(a){let e=a.querySelector(`.input-cant`);e.value=parseInt(e.value)+1,p(),a.style.transition=`box-shadow 0.15s`,a.style.boxShadow=`0 0 0 2px #89C2D9`,setTimeout(()=>{a.style.boxShadow=``},700);return}r&&(r.style.display=`none`),n&&(n.style.display=`flex`),i&&(i.disabled=!1);let o=document.createElement(`div`);o.className=`ci-item`,o.setAttribute(`data-sku`,e),o.innerHTML=`
        <div class="ci-item__info" style="display:flex; flex-direction:column; gap:2px; flex:1; min-width:0;">
            <span class="ci-item__name" title="${t}" style="font-size:13px; font-weight:600; color:var(--cobalto); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t}</span>
            <span class="ci-item__sku" style="font-size:11px; color:var(--texto-mut);">SKU: ${e}</span>
        </div>
        <div class="ci-item__controls" style="display:flex; align-items:center; gap:8px;">
            <div class="ci-stepper" aria-label="Cantidad de etiquetas" style="display:flex; align-items:center; border:1px solid var(--borde); border-radius:8px; overflow:hidden; background:white;">
                <button class="btn-restar-cant" aria-label="Disminuir cantidad" style="background:transparent; border:none; padding:4px 8px; cursor:pointer; color:var(--texto-mut); transition:background 0.2s;">
                    <span class="material-symbols-rounded" aria-hidden="true" style="font-size:16px;">remove</span>
                </button>
                <input type="number" class="input-cant" value="1" min="1" max="999" aria-label="Cantidad" style="width:40px; text-align:center; border:none; border-left:1px solid var(--borde); border-right:1px solid var(--borde); font-size:13px; font-weight:600; color:var(--cobalto); outline:none; padding:4px 0;">
                <button class="btn-sumar-cant" aria-label="Aumentar cantidad" style="background:transparent; border:none; padding:4px 8px; cursor:pointer; color:var(--texto-mut); transition:background 0.2s;">
                    <span class="material-symbols-rounded" aria-hidden="true" style="font-size:16px;">add</span>
                </button>
            </div>
            <button class="ci-item__remove btn-eliminar-item" aria-label="Eliminar ${t} de la cola" style="background:rgba(239, 68, 68, 0.1); border:none; color:#EF4444; padding:6px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; transition:background 0.2s;">
                <span class="material-symbols-rounded" aria-hidden="true" style="font-size:18px;">close</span>
            </button>
        </div>
    `,n.appendChild(o),p()}function o(){let e=document.getElementById(`lista-cola-impresion`),t=document.getElementById(`btn-generar-planilla`);e&&(e.addEventListener(`click`,e=>{let t=e.target.closest(`.btn-eliminar-item`),n=e.target.closest(`.btn-sumar-cant`),r=e.target.closest(`.btn-restar-cant`);if(t){let e=t.closest(`.ci-item`);e.style.transition=`opacity 150ms, transform 150ms`,e.style.opacity=`0`,e.style.transform=`scale(0.95)`,setTimeout(()=>{e.remove(),f()},150)}else if(n){let e=n.closest(`.ci-stepper`).querySelector(`.input-cant`),t=parseInt(e.max)||999;parseInt(e.value)<t&&(e.value=parseInt(e.value)+1)}else if(r){let e=r.closest(`.ci-stepper`).querySelector(`.input-cant`);parseInt(e.value)>1&&(e.value=parseInt(e.value)-1)}p()}),e.addEventListener(`input`,e=>{if(e.target.classList.contains(`input-cant`)){let t=parseInt(e.target.value);(isNaN(t)||t<1)&&(e.target.value=1),t>999&&(e.target.value=999),p()}}),t&&t.addEventListener(`click`,s))}function s(){let e=document.querySelectorAll(`.ci-item`),t=document.querySelector(`input[name="tipo_impresora"]:checked`)?.value||`a4`;if(!e.length)return;let n=[];e.forEach(e=>{n.push({sku:e.getAttribute(`data-sku`),nombre:e.querySelector(`.ci-item__name`).textContent.trim(),cantidad:parseInt(e.querySelector(`.input-cant`).value)||1})}),t===`a4`?c(n):l(n)}function c(e){let t=window.open(``,`PRINT`,`height=800,width=800`),n=``,r=[],i=0;e.forEach(e=>{for(let t=0;t<e.cantidad;t++){let t=`barcode-${i}`;n+=`
                <div class="etiqueta-box">
                    <div class="titulo">${e.nombre}</div>
                    <svg id="${t}"></svg>
                    <div class="sku-text">${e.sku}</div>
                </div>
            `,r.push({id:t,sku:e.sku}),i++}}),t.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Planilla A4 — PET PROTECT</title>
            <style>
                @page { margin: 8mm; size: letter; }
                * { box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
                .planilla-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 3mm;
                }
                .etiqueta-box {
                    border: 1px dashed #CBD5E1;
                    padding: 3mm;
                    text-align: center;
                    height: 36mm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1mm;
                    page-break-inside: avoid;
                }
                .titulo {
                    font-size: 9px;
                    font-weight: 700;
                    line-height: 1.3;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    width: 100%;
                }
                .sku-text {
                    font-size: 7px;
                    color: #64748B;
                    font-family: 'Courier New', monospace;
                }
                svg { width: 100%; height: 14mm; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head>
        <body><div class="planilla-grid">${n}</div></body>
        </html>
    `),u(t,r,{format:`CODE128`,displayValue:!1,height:42,margin:0})}function l(e){let t=window.open(``,`PRINT`,`height=400,width=600`),n=``,r=[],i=0;e.forEach(e=>{for(let t=0;t<e.cantidad;t++){let t=`barcode-${i}`;n+=`
                <div class="etiqueta-termica">
                    <div class="titulo">${e.nombre}</div>
                    <svg id="${t}"></svg>
                </div>
            `,r.push({id:t,sku:e.sku}),i++}}),t.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Rollo Térmico — PET PROTECT</title>
            <style>
                @page { margin: 0; size: 50mm 30mm; }
                * { box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
                .etiqueta-termica {
                    width: 48mm;
                    height: 28mm;
                    margin: 0 auto;
                    padding-top: 1.5mm;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    page-break-after: always;
                    overflow: hidden;
                }
                .titulo { font-size: 8px; font-weight: 700; margin-bottom: 1mm; width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                svg { width: 100%; height: 13mm; }
            </style>
        </head>
        <body>${n}</body>
        </html>
    `),u(t,r,{format:`CODE128`,displayValue:!0,fontSize:10,height:32,margin:0})}function u(e,t,n){let r=e.document.createElement(`script`);r.src=`https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js`,r.onload=()=>{t.forEach(t=>{try{e.JsBarcode(`#${t.id}`,t.sku,n)}catch(e){console.warn(`[BARCODE] No se pudo generar código para SKU: ${t.sku}`,e)}}),e.document.close(),setTimeout(()=>{e.focus(),e.print(),e.close()},600)},r.onerror=()=>{console.error(`[BARCODE] No se pudo cargar JsBarcode desde CDN.`),e.document.close(),e.print(),e.close()},e.document.body.appendChild(r)}function d(){let e=document.getElementById(`lista-cola-impresion`);e&&(e.innerHTML=``),f()}function f(){let e=document.getElementById(`lista-cola-impresion`),t=document.getElementById(`estado-vacio-impresion`),n=document.getElementById(`btn-generar-planilla`);e&&(e.querySelector(`.ci-item`)||(e.style.display=`none`,t&&(t.style.display=`flex`),n&&(n.disabled=!0)),p())}function p(){let e=document.querySelectorAll(`.ci-item`),t=document.getElementById(`contador-etiquetas`),n=0;e.forEach(e=>{n+=parseInt(e.querySelector(`.input-cant`)?.value)||0}),t&&(t.textContent=n===0?`0 etiquetas`:`${n} ${n===1?`etiqueta`:`etiquetas`}`)}function m(){let e=document.getElementById(`input-busqueda-global`),t=document.getElementById(`select-area-inventario`),n=document.querySelectorAll(`#tabla-catalogo-impresion tbody tr`),r=document.getElementById(`ci-empty-search`),i=()=>{let i=(e?.value||``).toLowerCase().trim(),a=t?.value||`todos`,o=0;n.forEach(e=>{let t=e.textContent.toLowerCase().includes(i),n=a===`todos`||e.getAttribute(`data-area`)===a,r=t&&n;e.style.display=r?``:`none`,r&&o++}),r&&(r.style.display=o===0?`flex`:`none`)};e&&e.addEventListener(`input`,i),t&&t.addEventListener(`change`,i)}export{r as inicializarCentroImpresion};