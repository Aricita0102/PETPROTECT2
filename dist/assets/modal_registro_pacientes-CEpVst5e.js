import{n as e}from"./conexion-DiH-JvMT.js";import{n as t}from"./sesion_store-BSrAgZd7.js";import{a as n,t as r}from"./PRINCIPAL-CEQ5kvRk.js";var i=`<aside id="contenedorRegistro" class="modal-backdrop-premium modal-lateral-backdrop" aria-hidden="true">\r
    <style>\r
        /* Ajuste específico para que coincida exactamente con el tamaño del panel de notificaciones (derecho) */\r
        body div#contenedor-modal-dinamico #contenedorRegistro.modal-backdrop-premium .ventana-modal-bento.grande.modal-lateral-panel {\r
            width: 420px !important;\r
            max-width: 100vw !important;\r
        }\r
        /* Convertir el formulario a una sola columna por el ancho reducido */\r
        body div#contenedor-modal-dinamico #contenedorRegistro .info-grid-2col {\r
            grid-template-columns: 1fr !important;\r
            gap: 16px !important;\r
        }\r
        /* Ajuste responsive de las estadísticas */\r
        body div#contenedor-modal-dinamico #contenedorRegistro .stats-row {\r
            display: grid !important;\r
            grid-template-columns: repeat(3, 1fr) !important;\r
            gap: 8px !important;\r
        }\r
        /* Asegurar que el z-index sea lo suficientemente alto */\r
        body div#contenedor-modal-dinamico #contenedorRegistro.modal-lateral-backdrop {\r
            z-index: 999999 !important;\r
        }\r
    </style>\r
    \r
    <div class="ventana-modal-bento grande modal-lateral-panel">\r
        \r
        <button type="button" class="boton-cerrar-modal-bento btn-cerrar-lateral" id="btnCerrarRegistro" aria-label="Cancelar registro express">\r
            <span class="material-symbols-rounded">close</span>\r
        </button>\r
\r
        <div class="contenido-interno-modal contenido-scrollable">\r
            \r
            <div class="breadcrumbs">\r
                Recepción <span>&gt;</span> Control de Admisión <span>&gt;</span> Triage Express\r
            </div>\r
\r
            <header class="product-header">\r
                <div class="header-title-area">\r
                    <h1 id="titulo-detalle-tienda">INGRESO RÁPIDO DE PACIENTE</h1>\r
                    <span class="code-chip">Prioridad Triage &lt; 60s</span>\r
                </div>\r
                <div class="header-actions">\r
                    <button type="button" class="text-action-btn">Ver Protocolo</button>\r
                </div>\r
            </header>\r
\r
            <form id="formRegistroExpress" novalidate class="dashboard-grid" style="grid-template-columns: 1fr;">\r
                \r
                <div class="grid-column">\r
                    \r
                    <div class="stats-row">\r
                        <div class="stat-box">\r
                            <div class="stat-label">Estado Actual</div>\r
                            <div class="stat-value">Recepción</div>\r
                        </div>\r
                        <div class="stat-box">\r
                            <div class="stat-label">Tipo Ingreso</div>\r
                            <div class="stat-value">Urgencia</div>\r
                        </div>\r
                        <div class="stat-box">\r
                            <div class="stat-label">Tiempo Espera</div>\r
                            <div class="stat-value">0 min</div>\r
                        </div>\r
                    </div>\r
\r
                    <div class="card">\r
                        <div class="section-header">\r
                            <div class="section-title">\r
                                <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);">info</span>\r
                                Biometría del Paciente\r
                            </div>\r
                        </div>\r
                        <div class="info-grid-2col bento-form-grid">\r
                            <div class="form-group span-2">\r
                                <label for="exp_nombre_paciente">Nombre del Paciente <span class="required">*</span></label>\r
                                <input type="text" id="exp_nombre_paciente" name="nombre" required placeholder="Ej. Firulais">\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_especie">Especie <span class="required">*</span></label>\r
                                <select id="exp_especie" name="especie" required>\r
                                    <option value="" disabled selected>Seleccionar Especie...</option>\r
                                    \r
                                    <optgroup label="Más Comunes (Conectados a API)">\r
                                        <option value="canino">Canino (Perro)</option>\r
                                        <option value="felino">Felino (Gato)</option>\r
                                    </optgroup>\r
\r
                                    <optgroup label="Pequeños Mamíferos y Exóticos">\r
                                        <option value="Lagomorfo">Lagomorfo (Conejo)</option>\r
                                        <option value="Roedor">Roedor (Hámster, Cobaya, Chinchilla, Rata)</option>\r
                                        <option value="Mustelido">Mustélido (Hurón)</option>\r
                                        <option value="Porcino">Porcino (Mini Pig / Cerdo Doméstico)</option>\r
                                        <option value="Erinaceomorfo">Erinaceomorfo (Erizo)</option>\r
                                        <option value="Marsupial">Marsupial (Petauro del Azúcar)</option>\r
                                    </optgroup>\r
\r
                                    <optgroup label="Aves">\r
                                        <option value="Ave_Psitaciforme">Psitaciforme (Loro, Periquito, Cacatúa)</option>\r
                                        <option value="Ave_Paseriforme">Paseriforme (Canario, Jilguero)</option>\r
                                        <option value="Ave_Corral">Ave de Corral (Gallina, Pato, Pavo)</option>\r
                                        <option value="Ave_Rapaz">Ave Rapaz (Halcón, Búho)</option>\r
                                    </optgroup>\r
\r
                                    <optgroup label="Reptiles y Anfibios">\r
                                        <option value="Reptil_Chelonio">Chelonio (Tortuga)</option>\r
                                        <option value="Reptil_Squamata">Squamata (Iguana, Camaleón, Lagarto)</option>\r
                                        <option value="Reptil_Serpiente">Serpiente (Pitón, Boa, Culebra)</option>\r
                                        <option value="Anfibio">Anfibio (Rana, Sapo, Ajolote)</option>\r
                                    </optgroup>\r
\r
                                    <optgroup label="Animales Mayores (Granja/Producción)">\r
                                        <option value="Equino">Equino (Caballo, Burro, Mula)</option>\r
                                        <option value="Bovino">Bovino (Vaca, Toro)</option>\r
                                        <option value="Caprino">Caprino (Cabra)</option>\r
                                        <option value="Ovino">Ovino (Oveja, Borrego)</option>\r
                                    </optgroup>\r
\r
                                    <optgroup label="Otros">\r
                                        <option value="Otro">Otra Especie / Indefinido</option>\r
                                    </optgroup>\r
                                </select>\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_raza">Raza <span class="required">*</span></label>\r
                                <input type="text" id="exp_raza" name="raza" required placeholder="Selecciona una especie primero" list="lista-razas">\r
                                <datalist id="lista-razas">\r
                                    <option value="Mestizo"></option>\r
                                </datalist>\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_sexo_repro">Sexo y Reproducción <span class="required">*</span></label>\r
                                <select id="exp_sexo_repro" name="sexo_repro" required>\r
                                    <option value="" disabled selected>Seleccionar...</option>\r
                                    <option value="macho_entero">Macho Entero</option>\r
                                    <option value="macho_castrado">Macho Castrado</option>\r
                                    <option value="hembra_entera">Hembra Entera</option>\r
                                    <option value="hembra_esterilizada">Hembra Esterilizada</option>\r
                                    <option value="indefinido">Indefinido / Desconocido</option>\r
                                </select>\r
                            </div>\r
\r
                            <div class="form-group" style="display: flex; gap: 8px;">\r
                                <div style="flex: 1;">\r
                                    <label for="exp_edad_anios">Edad (Años)</label>\r
                                    <input type="number" id="exp_edad_anios" name="edad_anios" min="0" max="30" placeholder="0">\r
                                </div>\r
                                <div style="flex: 1;">\r
                                    <label for="exp_edad_meses">Meses</label>\r
                                    <input type="number" id="exp_edad_meses" name="edad_meses" min="0" max="11" placeholder="0">\r
                                </div>\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_peso">Peso Exacto (kg) <span class="required">*</span></label>\r
                                <input type="number" id="exp_peso" name="peso" step="0.01" min="0.01" required placeholder="0.00">\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_tipo_sangre">Tipo de Sangre</label>\r
                                <select id="exp_tipo_sangre" name="tipo_sangre">\r
                                    <option value="desconocido" selected>Desconocido</option>\r
                                    <option value="canino_dea1_pos">DEA 1+ (Canino)</option>\r
                                    <option value="canino_dea1_neg">DEA 1- (Canino)</option>\r
                                    <option value="felino_a">Tipo A (Felino)</option>\r
                                    <option value="felino_b">Tipo B (Felino)</option>\r
                                    <option value="felino_ab">Tipo AB (Felino)</option>\r
                                    <option value="otro">Otro</option>\r
                                </select>\r
                            </div>\r
                        </div>\r
                    </div>\r
\r
                    <div class="card" style="padding-bottom: 24px;">\r
                        <div class="section-header" style="margin-bottom: 24px;">\r
                            <div class="section-title">\r
                                <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);">warning</span>\r
                                Alertas de Triage y Manejo\r
                            </div>\r
                        </div>\r
                        \r
                        <div class="form-group-list gap-md">\r
                            <div class="form-group">\r
                                <label for="exp_alergias">Alergias Conocidas</label>\r
                                <input type="text" id="exp_alergias" name="alergias" placeholder="Dejar en blanco si no hay">\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_temperamento">Precauciones de Manejo</label>\r
                                <select id="exp_temperamento" name="temperamento">\r
                                    <option value="docil">Dócil / Amigable</option>\r
                                    <option value="nervioso">Nervioso / Asustadizo</option>\r
                                    <option value="agresivo">Agresivo / Muerde (Requiere Precaución)</option>\r
                                    <option value="venenoso">Especie Venenosa / Peligrosa</option>\r
                                </select>\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_motivo_consulta">Motivo de Ingreso (Breve)</label>\r
                                <textarea id="exp_motivo_consulta" name="motivo_consulta" rows="2" placeholder="Ej. Atropellado, Vómito desde ayer..."></textarea>\r
                            </div>\r
                        </div>\r
                    </div>\r
\r
                    <div class="card">\r
                        <div class="section-header">\r
                            <div class="section-title">\r
                                <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);">person</span>\r
                                Tutor Responsable\r
                            </div>\r
                        </div>\r
                        <div class="info-grid-2col bento-form-grid"> \r
                            <div class="form-group">\r
                                <label for="exp_tutor_nombre">Nombre Completo <span class="required">*</span></label>\r
                                <input type="text" id="exp_tutor_nombre" name="tutor_nombre" required placeholder="Persona que autoriza">\r
                            </div>\r
\r
                            <div class="form-group">\r
                                <label for="exp_tutor_tel">Teléfono de Emergencia <span class="required">*</span></label>\r
                                <input type="tel" id="exp_tutor_tel" name="tutor_telefono" required pattern="[0-9]{10}" placeholder="10 dígitos">\r
                            </div>\r
                        </div>\r
                    </div>\r
\r
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">\r
                        \r
                        <button type="button" id="btn_guardar_expediente" class="btn btn-primary" style="width: 100%; justify-content: center; display: flex; align-items: center; gap: 8px; padding: 12px; font-size: 14px;">\r
                            <span class="material-symbols-rounded" style="font-size: 18px;">save</span>\r
                            Guardar Expediente\r
                        </button>\r
\r
                        <button type="button" id="btn_completar_expediente" class="btn btn-outline" style="width: 100%; justify-content: center; display: none; align-items: center; gap: 8px; padding: 12px; font-size: 14px;">\r
                            <span class="material-symbols-rounded" style="font-size: 18px;">folder_shared</span>\r
                            Completar Expediente\r
                        </button>\r
\r
                        <button type="submit" id="btn_iniciar_consulta" class="btn btn-primary" style="width: 100%; justify-content: center; display: none; align-items: center; gap: 8px; padding: 12px; font-size: 14px; background-color: #059669; border-color: #059669;">\r
                            <span class="material-symbols-rounded" style="font-size: 18px;">emergency</span>\r
                            Iniciar Consulta Ahora\r
                        </button>\r
\r
                    </div>\r
\r
                </div>\r
            </form>\r
        </div>\r
    </div>\r
</aside>`,a=!1,o=null,s={Lagomorfo:[`Cabeza de León`,`Belier`,`Angora`,`Rex`,`Mestizo`],Roedor:[`Hámster Sirio`,`Hámster Ruso`,`Cobaya`,`Chinchilla`,`Rata Dumbo`,`Mestizo`],Mustelido:[`Hurón Sable`,`Hurón Albino`,`Hurón Panda`],Porcino:[`Mini Pig`,`Cerdo Vietnamita`],Erinaceomorfo:[`Erizo Pigmeo Africano`,`Erizo Europeo`],Marsupial:[`Petauro del Azúcar`],Ave_Psitaciforme:[`Periquito`,`Ninfa / Carolina`,`Guacamayo`,`Loro Gris`,`Agapornis`,`Cacatúa`],Ave_Paseriforme:[`Canario`,`Jilguero`,`Diamante Mandarín`],Ave_Corral:[`Gallina`,`Pato`,`Pavo`],Ave_Rapaz:[`Halcón`,`Búho`,`Cernícalo`],Reptil_Chelonio:[`Tortuga de Orejas Rojas`,`Tortuga Sulcata`,`Tortuga Terrestre`],Reptil_Squamata:[`Iguana Verde`,`Dragón Barbudo`,`Camaleón`,`Gecko Leopardo`],Reptil_Serpiente:[`Pitón Bola`,`Boa Constrictor`,`Falsa Coral`],Anfibio:[`Ajolote`,`Rana Arborícola`,`Sapo`],Equino:[`Cuarto de Milla`,`Pura Sangre`,`Árabe`,`Mestizo`],Bovino:[`Holstein`,`Angus`,`Cebú`],Caprino:[`Boer`,`Alpina`],Ovino:[`Dorper`,`Suffolk`,`Pelibuey`],Otro:[]};async function c(){console.log(`[MODAL TRIAGE] Preparando inyección del formulario express...`);let e=document.getElementById(`contenedor-modal-dinamico`);if(!e){console.error(`❌ ERROR: No existe #contenedor-modal-dinamico en la vista principal.`);return}!a&&!document.getElementById(`contenedorRegistro`)&&(e.innerHTML=i,a=!0,await new Promise(e=>setTimeout(e,0)),l());let t=document.getElementById(`contenedorRegistro`);t&&(t.classList.add(`visible`),t.setAttribute(`aria-hidden`,`false`),document.body.style.overflow=`hidden`)}function l(){let e={modal:document.getElementById(`contenedorRegistro`),form:document.getElementById(`formRegistroExpress`),btnCerrar:document.getElementById(`btnCerrarRegistro`),regEspecie:document.getElementById(`exp_especie`),btnGuardar:document.getElementById(`btn_guardar_expediente`),btnConsulta:document.getElementById(`btn_iniciar_consulta`),btnExpediente:document.getElementById(`btn_completar_expediente`)},t=()=>{e.modal.classList.remove(`visible`),e.modal.setAttribute(`aria-hidden`,`true`),document.body.style.overflow=`auto`,e.form&&e.form.reset(),u(null),o=null,e.btnGuardar&&(e.btnGuardar.style.display=`flex`),e.btnExpediente&&(e.btnExpediente.style.display=`none`),e.btnConsulta&&(e.btnConsulta.style.display=`none`)};e.btnCerrar?.addEventListener(`click`,t),e.modal?.addEventListener(`click`,n=>{n.target===e.modal&&t()}),e.regEspecie?.addEventListener(`change`,e=>{u(e.target.value),d(e.target.value)}),e.btnGuardar?.addEventListener(`click`,n=>f(n,e,t)),e.btnConsulta?.addEventListener(`click`,e=>{if(e.preventDefault(),o){let e=o;t(),r(`MODULO_VETERINARIO_CONSULTA`,{paciente_id:e})}}),e.btnExpediente?.addEventListener(`click`,e=>{if(e.preventDefault(),o){let e=o;t(),r(`MODULO_EXPEDIENTES_HISTORIAL`,{paciente_id:e})}})}function u(e){let t=document.getElementById(`exp_especie`),n=document.getElementById(`exp_especie_otra`);n||(n=document.createElement(`input`),n.type=`text`,n.id=`exp_especie_otra`,n.name=`especie_otra`,n.placeholder=`Escribe la especie (Ej. Hurón, Tortuga...)`,n.style.marginTop=`10px`,n.style.display=`none`,n.classList.add(`form-control`),t.parentNode.insertBefore(n,t.nextSibling)),e===`Otro`?(n.style.display=`block`,n.required=!0,n.focus()):(n.style.display=`none`,n.required=!1,n.value=``)}async function d(e){let t=document.getElementById(`exp_raza`),n=document.getElementById(`lista-razas`);if(!(!t||!n)){if(t.value=``,n.innerHTML=``,e===`Otro`){t.placeholder=`Escribe la raza (o 'Desconocida')...`,t.disabled=!1;return}t.placeholder=`Sincronizando catálogo...`,t.disabled=!0;try{let r=[];if(e===`canino`){let e=await(await fetch(`https://dog.ceo/api/breeds/list/all`)).json();for(let[t,n]of Object.entries(e.message))n.length>0?n.forEach(e=>r.push(`${t} ${e}`)):r.push(t);r.push(`Mestizo`)}else e===`felino`?((await(await fetch(`https://api.thecatapi.com/v1/breeds`)).json()).forEach(e=>r.push(e.name)),r.push(`Mestizo / Común`)):r=s[e]||[`Desconocida`,`Mestizo`];r.forEach(e=>{let t=document.createElement(`option`);t.value=e.charAt(0).toUpperCase()+e.slice(1),n.appendChild(t)}),t.placeholder=`Escribe o selecciona la raza...`}catch(e){console.error(`[FALLO AL CARGAR RAZAS]`,e),t.placeholder=`Escribe la raza...`}finally{t.disabled=!1}}}async function f(i,a,s){if(i.preventDefault(),a.form&&!a.form.checkValidity()){a.form.reportValidity();return}let c=a.btnGuardar.innerHTML;a.btnGuardar.disabled=!0,a.btnGuardar.innerHTML=`<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Guardando...`;try{let i=await t();if(!i)throw Error(`Sesión clínica no válida.`);let c=i.user.id,l=i.perfil,u=document.getElementById(`exp_tutor_tel`)?.value.trim()||``;u=u.replace(/\D/g,``).substring(0,10);let d=document.getElementById(`exp_tutor_nombre`)?.value.trim(),f=null,{data:p,error:m}=await e.from(`clientes`).select(`id`).eq(`telefono`,u).eq(`organizacion_id`,l.organizacion_id).maybeSingle();if(m)throw m;if(p)f=p.id;else{let{data:t,error:n}=await e.from(`clientes`).insert([{organizacion_id:l.organizacion_id,sucursal_id:l.sucursal_id,nombre_completo:d,telefono:u,correo:`pendiente@express.com`,direccion:`Pendiente de actualización`,created_by:c}]).select().single();if(n)throw n;f=t.id}let h=document.getElementById(`exp_especie`)?.value;if(h===`Otro`){let e=document.getElementById(`exp_especie_otra`);h=e?e.value.trim():`Desconocida`}let g=document.getElementById(`exp_sexo_repro`)?.value||`indefinido`,_=document.getElementById(`exp_alergias`)?.value.trim()||`Sin alergias conocidas`,v=document.getElementById(`exp_temperamento`)?.value||`docil`,y=`MOTIVO: ${document.getElementById(`exp_motivo_consulta`)?.value.trim()||`Sin especificar`} | MANEJO: ${v}`,b=parseInt(document.getElementById(`exp_edad_anios`)?.value)||0,x=parseInt(document.getElementById(`exp_edad_meses`)?.value)||0,S=null;if(b>0||x>0){let e=new Date;e.setFullYear(e.getFullYear()-b),e.setMonth(e.getMonth()-x),S=e.toISOString().split(`T`)[0]}let{data:C,error:w}=await e.from(`pacientes`).insert([{cliente_id:f,organizacion_id:l.organizacion_id,nombre:document.getElementById(`exp_nombre_paciente`)?.value.trim(),especie:h,raza:document.getElementById(`exp_raza`)?.value.trim()||`Mestizo`,sexo:g,peso_actual:parseFloat(document.getElementById(`exp_peso`)?.value)||0,fecha_nacimiento:S,alergias:_,notas_comportamiento:y,foto_url:null,estatus:`activo`,created_by:c}]).select().single();if(w)throw w;let T=C.id;o=T,C.clientes={nombre_completo:d,telefono:u},window.pacientePreCargado=C,a.btnGuardar.style.display=`none`,s(),await n(`Paciente creado con éxito`,`¿Deseas Iniciar Consulta de inmediato con este paciente?
(Confirmar = Iniciar Consulta, Cancelar = Ir a Expedientes)`,`check_circle`,`#10b981`)?(sessionStorage.setItem(`idPacienteActivo`,T),sessionStorage.setItem(`iniciarConsultaDirecta`,`true`),r(`MODULO_VETERINARIO_CONSULTA`)):r(`MODULO_BIBLIOTECA_EXPEDIENTES`)}catch(e){console.error(`Error en registro:`,e),alert(`Error de integridad: `+e.message),a.btnGuardar.disabled=!1,a.btnGuardar.innerHTML=c}}export{c as inyectarYMostrarModal};