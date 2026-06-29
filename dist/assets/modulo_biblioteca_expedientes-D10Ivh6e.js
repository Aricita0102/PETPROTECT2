import{n as e}from"./conexion-DiH-JvMT.js";import{n as t}from"./sesion_store-BSrAgZd7.js";import{t as n}from"./PRINCIPAL-De25Fd-p.js";import{inyectarYMostrarModal as r}from"./modal_registro_pacientes-D0WgGfV4.js";var i=[],a=null,o=null;async function s(){console.log(`[PET PROTECT] Inicializando controlador de pacientes...`);let e=document.getElementById(`rejillaPacientes`),t=document.getElementById(`inBuscarPaciente`),n=document.getElementById(`btnNuevoPaciente`);if(n){let e=n.cloneNode(!0);n.parentNode.replaceChild(e,n),e.addEventListener(`click`,async e=>{e.preventDefault(),console.log(`[BIBLIOTECA] Clic detectado. Delegando apertura de modal express...`),await r()})}if(e){if(t){let n=document.getElementById(`dropdown-resultados`),r=null;t.addEventListener(`input`,t=>{let a=t.target.value.toLowerCase().trim();clearTimeout(r);let o=i.filter(e=>{let t=e.nombre?.toLowerCase()||``,n=e.clientes?.nombre_completo?.toLowerCase()||``;return t.includes(a)||n.includes(a)});if(p(o,e),a.length<2){n&&(n.style.display=`none`);return}r=setTimeout(()=>{let e=o.slice(0,6);n&&(c(e,n),n.style.display=`block`)},200)}),document.addEventListener(`click`,e=>{t&&!t.contains(e.target)&&n&&!n.contains(e.target)&&n&&(n.style.display=`none`)}),t&&t.addEventListener(`focus`,()=>{t.value.trim().length>=2&&n&&(n.style.display=`block`)})}await f(e),m(e),h()}}function c(e,t){if(e.length===0){t.innerHTML=`<div class="resultado-pred-empty">No se encontraron pacientes ni tutores.</div>`;return}t.innerHTML=``,e.forEach(e=>{let r=e.foto_url||`https://cdn-icons-png.flaticon.com/512/2809/2809865.png`,i=e.nombre||`Desconocido`,a=`${e.especie||`Mascota`} ${e.raza?`· `+e.raza:``}`,o=e.clientes?.nombre_completo||`Sin tutor registrado`,s=document.createElement(`div`);s.className=`resultado-pred-item`,s.innerHTML=`
            <img src="${r}" alt="Foto" class="resultado-pred-foto">
            <div class="resultado-pred-info">
                <p class="resultado-pred-nombre">${i}</p>
                <p class="resultado-pred-detalles">${a}</p>
                <p class="resultado-pred-tutor"><span class="material-symbols-rounded" style="font-size:12px; vertical-align:middle;">person</span> ${o}</p>
            </div>
        `,s.addEventListener(`click`,()=>{t&&(t.style.display=`none`),sessionStorage.setItem(`idPacienteActivo`,e.id),n(`MODULO_EXPEDIENTES_HISTORIAL`)}),t.appendChild(s)})}function l(){console.log(`[PET PROTECT] Limpiando suscripciones de la biblioteca...`),a&&e.removeChannel(a),o&&e.removeChannel(o),a=null,o=null,i=[]}function u(e){if(!e)return`Edad N/D`;let t=new Date,n=new Date(e),r=t.getFullYear()-n.getFullYear(),i=t.getMonth()-n.getMonth();if((i<0||i===0&&t.getDate()<n.getDate())&&r--,r<=0){let e=t.getMonth()-n.getMonth();return e<0&&(e+=12),e===0?`Menos de 1 mes`:`${e} meses`}return`${r} años`}function d(e){switch(e?.toLowerCase()||`activo`){case`hospitalizado`:return`critico`;case`fallecido`:return`inactivo`;default:return`estable`}}async function f(n){try{let r=await t();if(!r)throw Error(`No hay sesión activa`);let a=r.perfil.organizacion_id;if(!a)throw Error(`No se pudo obtener la clínica del usuario`);let{data:o,error:s}=await e.from(`pacientes`).select(`
                id, nombre, especie, raza, sexo, foto_url, created_at, fecha_nacimiento, estatus,
                clientes!inner ( nombre_completo, telefono )
            `).eq(`organizacion_id`,a).order(`created_at`,{ascending:!1});if(s){console.error(`Fallo al cargar catálogo:`,s.message);return}i=o,p(i,n)}catch(e){console.error(`[SEGURIDAD] Error al cargar pacientes:`,e.message)}}function p(e,t){t.innerHTML=``;let r=document.getElementById(`estadoVacioExpedientes`);if(e.length===0){r&&(r.classList.remove(`oculto`),r.innerHTML=`<h2>Sin resultados</h2><p>No se encontraron pacientes que coincidan con la búsqueda.</p>`);return}else r&&r.classList.add(`oculto`);e.forEach(e=>{let r=document.createElement(`article`);r.className=`tarjeta-soft-paciente`;let i=e.raza?` • ${e.raza}`:``,a=e.especie?e.especie.charAt(0).toUpperCase()+e.especie.slice(1):`Desconocida`,o=e.clientes?.nombre_completo||`Sin Asignar`,s=u(e.fecha_nacimiento),c=e.foto_url?`<img src="${e.foto_url}" alt="Foto de ${e.nombre}" class="img-paciente-fluida">`:`<div class="sin-foto-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f4f7fe; color:#64748b; font-weight:600; font-size:1.2rem;">${e.nombre.charAt(0).toUpperCase()}</div>`,l=d(e.estatus),f=e.estatus?e.estatus.charAt(0).toUpperCase()+e.estatus.slice(1):`Activo`,p=new Date(e.created_at).toLocaleDateString(`es-MX`,{day:`2-digit`,month:`short`,year:`numeric`});r.innerHTML=`
            <div class="contenedor-imagen-cuadrada">
                <span class="badge-estado ${l}">${f}</span>
                ${c}
                
                <div class="acciones-flotantes-hover">
                    <button class="btn-accion-circular btn-ver-expediente" aria-label="Ver expediente completo" title="Ver Expediente">
                        <span class="material-symbols-rounded">visibility</span>
                    </button>
                    <button class="btn-accion-circular btn-editar-paciente" aria-label="Editar datos" title="Editar">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                </div>
            </div>
        
            <div class="info-soft-paciente">
                <div class="meta-superior-soft">
                    <span class="especie-raza">${a}${i}</span>
                    <span class="edad-paciente"><span class="material-symbols-rounded icono-chico"></span> ${s}</span>
                </div>
                
                <h3 class="nombre-paciente-soft">${e.nombre}</h3>
                <p class="tutor-paciente-soft">Tutor: ${o}</p>
                
                <div class="datos-inferiores-soft">
                    <span class="ultima-visita-soft">Registrado: <strong>${p}</strong></span>
                </div>
            </div>
        `;let m=r.querySelector(`.btn-ver-expediente`);m.onclick=()=>{sessionStorage.setItem(`idPacienteActivo`,e.id),n(`MODULO_EXPEDIENTES_HISTORIAL`)};let h=r.querySelector(`.img-paciente-fluida`)||r.querySelector(`.sin-foto-placeholder`);h&&(h.style.cursor=`pointer`,h.onclick=()=>{sessionStorage.setItem(`idPacienteActivo`,e.id),n(`MODULO_EXPEDIENTES_HISTORIAL`)}),t.appendChild(r)})}function m(t){a&&e.removeChannel(a),a=e.channel(`cambios-pacientes`).on(`postgres_changes`,{event:`*`,table:`pacientes`,schema:`public`},()=>{f(t)}).subscribe()}function h(){o&&e.removeChannel(o),o=e.channel(`emergencias`).on(`postgres_changes`,{event:`INSERT`,table:`notificaciones`,filter:`tipo=eq.urgencia_medica`},e=>{if(e.new.estado===`activa`){let e=document.getElementById(`modalEmergenciaOverlay`),t=document.getElementById(`audioAlarma`);e&&(e.style.display=`flex`),t&&(t.loop=!0,t.play().catch(()=>{}))}}).subscribe()}export{l as destruirModuloPacientes,s as inicializarModuloPacientes};