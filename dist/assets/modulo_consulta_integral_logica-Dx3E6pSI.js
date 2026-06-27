import{i as e,n as t}from"./conexion-DiH-JvMT.js";import{a as n,n as r}from"./PRINCIPAL-DyvZ8TS1.js";function i(){return`
  :root{
    --cobalto:#032F40;
    --naranja:#F27405;
    --blanco-puro:#FFFFFF;

    --cobalto-tint: rgba(3,47,64,0.05);
    --cobalto-line: rgba(3,47,64,0.14);
    --gray-line:#e2e6e8;
    --gray-mid:#6b7a80;
    --gray-dark:#33454b;
    --bg-screen:#eef2f3;
    --deco-color:#dde1e2;
  }

  .receta-pdf-wrapper *{ box-sizing:border-box; margin:0; padding:0; }
  .receta-pdf-wrapper { 
      background:var(--blanco-puro); 
      font-family:'Inter', sans-serif; 
      color:var(--gray-dark); 
      -webkit-print-color-adjust:exact; 
      print-color-adjust:exact; 
  }

  #receta{
    background:var(--blanco-puro);
    position:relative;
    overflow:hidden;
    width:760px;
    padding:46px 54px 0;
    margin: 0 auto;
  }

  /* ===================== ENCABEZADO ===================== */
  .rx-header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:18px;
    position:relative;
    z-index:1;
  }

  .clinic-id{ display:flex; gap:14px; align-items:flex-start; }

  .logo-wrap{
    width:52px; height:52px;
    flex:none;
    display:flex; align-items:center; justify-content:center;
    color:var(--cobalto);
  }
  .logo-wrap img{ width:100%; height:100%; object-fit:contain; }

  .clinic-name{
    font-family:'Playfair Display', serif;
    font-weight:700;
    font-size:23px;
    color:var(--cobalto);
    margin:0 0 4px 0;
    line-height:1.1;
  }

  .clinic-meta{
    font-size:11px;
    line-height:1.65;
    color:var(--gray-mid);
  }
  .clinic-meta span{ display:block; }

  .rx-meta{ text-align:right; flex:none; }
  .rx-title{
    font-family:'Poppins', sans-serif;
    font-weight:700;
    font-size:13px;
    letter-spacing:0.07em;
    text-transform:uppercase;
    color:var(--naranja);
    margin-bottom:6px;
  }
  .rx-meta .meta-row{
    font-size:11.5px;
    color:var(--gray-dark);
    margin-top:2px;
  }
  .rx-meta .meta-row strong{ color:var(--cobalto); font-weight:700; }

  .accent-bar{
    height:2px;
    margin:16px 0 22px;
    background:var(--naranja);
  }

  /* ===================== TÍTULOS DE SECCIÓN ===================== */
  .section{ position:relative; z-index:1; margin-bottom:18px; }

  .section-title{
    display:flex;
    align-items:center;
    gap:8px;
    font-family:'Poppins', sans-serif;
    font-weight:600;
    font-size:11.5px;
    letter-spacing:0.09em;
    text-transform:uppercase;
    color:var(--cobalto);
    margin-bottom:10px;
  }
  .section-title svg{ width:15px; height:15px; color:var(--naranja); flex:none; }
  .section-title::after{
    content:'';
    flex:1;
    height:1px;
    background:var(--gray-line);
    margin-left:6px;
  }

  /* ===================== MÉDICO ===================== */
  .vet-row{ display:flex; justify-content:space-between; gap:24px; }
  .vet-info .info-line{ font-size:12.5px; line-height:1.85; display: flex; align-items: baseline; gap: 5px; }
  .vet-info .info-line .lbl{ color:var(--gray-mid); }
  .vet-info .info-line .val{ color:var(--gray-dark); font-weight:600; }

  .firma-box{ flex:none; width:190px; display:flex; flex-direction:column; align-items:center; }
  .firma-area{
    width:100%; height:54px;
    border-bottom:1.2px solid var(--cobalto);
    display:flex; align-items:flex-end; justify-content:center;
    padding-bottom:4px;
  }
  .firma-area img{ max-height:50px; max-width:100%; object-fit:contain; }
  .firma-caption{ margin-top:6px; font-size:10px; letter-spacing:0.03em; color:var(--gray-mid); text-align:center; }

  /* ===================== PROPIETARIO ===================== */
  .owner-grid{ display:flex; gap:28px; flex-wrap:wrap; }
  .owner-grid .info-line{ font-size:12.5px; line-height:1.85; display: flex; align-items: baseline; gap: 5px; }
  .owner-grid .info-line .lbl{ color:var(--gray-mid); }
  .owner-grid .info-line .val{ color:var(--gray-dark); font-weight:600; }

  /* ===================== TARJETA DE PACIENTE ===================== */
  .patient-card{
    background:var(--cobalto-tint);
    border-left:3px solid var(--naranja);
    padding:16px 20px;
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:12px 18px;
  }
  .patient-card .field.span2{ grid-column:span 2; }
  .patient-card .f-label{
    display:block; font-size:9.5px; letter-spacing:0.06em; text-transform:uppercase;
    color:var(--gray-mid); margin-bottom:3px;
  }
  .patient-card .f-value{ font-size:13px; font-weight:700; color:var(--cobalto); word-break:break-word; }

  /* ===================== DIAGNÓSTICO ===================== */
  .diag-grid{ display:flex; flex-direction:column; gap:10px; }
  .diag-item .f-label{
    display:block; font-size:9.5px; letter-spacing:0.06em; text-transform:uppercase;
    color:var(--gray-mid); margin-bottom:3px;
  }
  .diag-item .f-value{ font-size:13px; color:var(--gray-dark); line-height:1.55; }

  /* ===================== TABLA DE MEDICAMENTOS ===================== */
  table.meds-table{ width:100%; border-collapse:collapse; font-size:12px; }
  .meds-table thead th{
    background:var(--cobalto);
    color:var(--blanco-puro);
    font-family:'Poppins', sans-serif;
    font-weight:600;
    font-size:10px;
    letter-spacing:0.04em;
    text-transform:uppercase;
    text-align:left;
    padding:9px 10px;
  }
  .meds-table tbody td{
    padding:9px 10px;
    border-bottom:1px solid var(--gray-line);
    color:var(--gray-dark);
    vertical-align:top;
  }
  .meds-table tbody td:first-child{ font-weight:700; color:var(--cobalto); }

  /* ===================== INDICACIONES ===================== */
  ul.ind-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:7px; }
  ul.ind-list li{ display:flex; align-items:flex-start; gap:8px; font-size:12.5px; color:var(--gray-dark); line-height:1.5; }
  .ind-check{
    flex:none; width:15px; height:15px; border:1.3px solid var(--naranja); color:var(--naranja);
    display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:700; margin-top:1px;
  }

  /* ===================== PRÓXIMA REVISIÓN ===================== */
  .followup-box{
    display:flex;
    gap:26px;
    flex-wrap:wrap;
    border-top:1px solid var(--gray-line);
    border-bottom:1px solid var(--gray-line);
    padding:12px 2px;
  }
  .followup-box .f-item .f-label{
    font-size:9.5px; letter-spacing:0.06em; text-transform:uppercase; color:var(--gray-mid);
    display:block; margin-bottom:2px;
  }
  .followup-box .f-item .f-value{ font-size:13px; font-weight:700; color:var(--cobalto); }

  /* ===================== AVISO LEGAL / FOOTER ===================== */
  .rx-footer{ margin-top:22px; position:relative; z-index:1; }
  .legal-notice{
    display:flex; gap:8px; align-items:flex-start;
    font-size:10.5px; line-height:1.55; color:var(--gray-mid); font-style:italic;
  }
  .legal-notice svg{ width:15px; height:15px; color:var(--naranja); flex:none; margin-top:1px; }
  .foot-meta{
    display:flex; justify-content:space-between; margin-top:12px;
    font-size:10px; color:var(--gray-mid); letter-spacing:0.02em;
  }

  /* ===================== SILUETA DE FONDO ===================== */
  .bottom-deco{
    position:relative;
    height:128px;
    margin-top:6px;
    z-index:0;
  }
  .bottom-deco svg{ position:absolute; bottom:-42px; stroke:var(--deco-color); fill:none; }
  .bottom-deco .dog-shape{ left:-4%; width:280px; height:auto; }
  .bottom-deco .cat-shape{ left:190px; width:230px; height:auto; }

  /* ===================== IMPRESIÓN ===================== */
  @page{ size:A4; margin:12mm 14mm; }
  @media print{
    body { background: white; }
    .receta-pdf-wrapper { width: 100%; height: 100%; }
    #receta{ box-shadow:none !important; width:100% !important; padding:0; margin: 0; }
  }
    `}function a(e){let t=e.logo_url?`<img src="${e.logo_url}" alt="Logo">`:`
    <svg width="100%" height="100%" viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6,58 C4,38 11,22 23,13 C28,9 32,10 32,18 C36,9 43,8 46,16 C49,8 56,8 59,16 C63,8 71,9 74,18 C84,28 88,40 86,58"
            stroke="#032F40" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,n=e.firma_url?`<img src="${e.firma_url}" style="max-height: 60px; object-fit: contain; display: block; margin: 0 auto; mix-blend-mode: multiply;" crossorigin="anonymous" alt="Firma">`:``,r=[{key:`nombre`,label:`Medicamento`},{key:`concentracion`,label:`Concentración`},{key:`dosis`,label:`Dosis`},{key:`via`,label:`Vía`},{key:`frecuencia`,label:`Frecuencia`},{key:`duracion`,label:`Duración`},{key:`cantidad`,label:`Cantidad`}],i=`<tr>`+r.map(e=>`<th>${e.label}</th>`).join(``)+`</tr>`,a=(e.medicamentos||[]).map(e=>`<tr>`+r.map(t=>`<td data-label="${t.label}">${e[t.key]??``}</td>`).join(``)+`</tr>`).join(``),o=(e.observaciones||[]).map(e=>`<li><span class="ind-check">&#10003;</span>${e}</li>`).join(``);return`
    <div class="receta-pdf-wrapper">
      <div id="receta">
        <!-- ============ 1. ENCABEZADO ============ -->
        <header class="rx-header">
          <div class="clinic-id">
            <div class="logo-wrap">${t}</div>
            <div class="clinic-text">
              <h1 class="clinic-name">${e.nombre_clinica||``}</h1>
              <div class="clinic-meta">
                ${e.direccion?`<span>${e.direccion}</span>`:``}
                ${e.telefono?`<span>Tel: ${e.telefono}</span>`:``}
                ${e.correo?`<span>${e.correo}</span>`:``}
                ${e.rfc?`<span>RFC: ${e.rfc}</span>`:``}
              </div>
            </div>
          </div>
          <div class="rx-meta">
            <div class="rx-title">Receta médica veterinaria</div>
            <div class="meta-row">Folio: <strong>${e.folio_receta||`S/N`}</strong></div>
            <div class="meta-row">Fecha de emisión: <strong>${e.fecha_emision||``}</strong></div>
          </div>
        </header>

        <div class="accent-bar"></div>

        <!-- ============ 2. MÉDICO VETERINARIO ============ -->
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="1.5" width="6" height="2.6" rx="1"/>
              <rect x="4" y="3" width="16" height="18.5" rx="2"/>
              <circle cx="12" cy="10.5" r="2.6"/>
              <path d="M8,17 a4,3.2 0 0,1 8,0"/>
            </svg>
            Médico veterinario responsable
          </div>
          <div class="vet-row">
            <div class="vet-info">
              <div class="info-line"><span class="lbl">Nombre:</span><span class="val">${e.nombre_veterinario||``}</span></div>
              <div class="info-line"><span class="lbl">Cédula profesional:</span><span class="val">${e.cedula_profesional||`N/A`}</span></div>
              ${e.especialidad?`<div class="info-line"><span class="lbl">Especialidad:</span><span class="val">${e.especialidad}</span></div>`:``}
            </div>
            <div class="firma-box">
              <div class="firma-area">${n}</div>
              <div class="firma-caption">Firma del médico veterinario</div>
            </div>
          </div>
        </section>

        <!-- ============ 3. PROPIETARIO ============ -->
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M5,20 a7,6.2 0 0,1 14,0"/>
            </svg>
            Propietario
          </div>
          <div class="owner-grid">
            <div class="info-line"><span class="lbl">Nombre:</span><span class="val">${e.propietario_nombre||``}</span></div>
            <div class="info-line"><span class="lbl">Teléfono:</span><span class="val">${e.propietario_telefono||``}</span></div>
            ${e.propietario_email?`<div class="info-line"><span class="lbl">Correo:</span><span class="val">${e.propietario_email}</span></div>`:``}
          </div>
        </section>

        <!-- ============ 4. PACIENTE ============ -->
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <ellipse cx="12" cy="16.2" rx="5.2" ry="4"/>
              <circle cx="5.8" cy="9" r="2.1"/>
              <circle cx="12" cy="6.2" r="2.3"/>
              <circle cx="18.2" cy="9" r="2.1"/>
            </svg>
            Paciente
          </div>
          <div class="patient-card">
            <div class="field"><span class="f-label">Nombre</span><span class="f-value">${e.paciente_nombre||``}</span></div>
            <div class="field"><span class="f-label">Expediente</span><span class="f-value">${e.expediente_id||``}</span></div>
            <div class="field"><span class="f-label">Especie</span><span class="f-value">${e.especie||``}</span></div>
            <div class="field"><span class="f-label">Raza</span><span class="f-value">${e.raza||``}</span></div>
            <div class="field"><span class="f-label">Sexo</span><span class="f-value">${e.sexo||``}</span></div>
            <div class="field"><span class="f-label">Edad</span><span class="f-value">${e.edad||``}</span></div>
            <div class="field"><span class="f-label">Peso actual</span><span class="f-value">${e.peso||``}</span></div>
            <div class="field span2"><span class="f-label">Color / señas particulares</span><span class="f-value">${e.senas_particulares||``}</span></div>
          </div>
        </section>

        <!-- ============ 5. DIAGNÓSTICO ============ -->
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="4" width="14" height="17" rx="2"/>
              <rect x="9" y="2" width="6" height="3" rx="1"/>
              <line x1="8" y1="11" x2="16" y2="11"/>
              <line x1="8" y1="15" x2="16" y2="15"/>
            </svg>
            Diagnóstico
          </div>
          <div class="diag-grid">
            <div class="diag-item"><span class="f-label">Motivo de consulta</span><span class="f-value">${e.motivo_consulta||``}</span></div>
            ${e.diagnostico?`<div class="diag-item"><span class="f-label">Diagnóstico presuntivo / definitivo</span><span class="f-value">${e.diagnostico}</span></div>`:``}
          </div>
        </section>

        <!-- ============ 6. MEDICAMENTOS ============ -->
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <g transform="rotate(45 12 12)">
                <rect x="4" y="9" width="16" height="6" rx="3"/>
                <line x1="12" y1="9" x2="12" y2="15"/>
              </g>
            </svg>
            Medicamentos prescritos
          </div>
          <table class="meds-table">
            <thead>${i}</thead>
            <tbody>${a}</tbody>
          </table>
        </section>

        <!-- ============ 7. INDICACIONES GENERALES ============ -->
        ${e.observaciones&&e.observaciones.length>0?`
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <line x1="12" y1="11" x2="12" y2="16.5"/>
              <circle cx="12" cy="7.6" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
            Indicaciones generales
          </div>
          <ul class="ind-list">${o}</ul>
        </section>`:``}

        <!-- ============ 8. PRÓXIMA REVISIÓN ============ -->
        ${e.fecha_revision?`
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="5" width="16" height="15" rx="2"/>
              <line x1="4" y1="10" x2="20" y2="10"/>
              <line x1="8" y1="3" x2="8" y2="7"/>
              <line x1="16" y1="3" x2="16" y2="7"/>
              <polyline points="9,15 11,17 16,12"/>
            </svg>
            Próxima revisión
          </div>
          <div class="followup-box">
            <div class="f-item"><span class="f-label">Fecha</span><span class="f-value">${e.fecha_revision}</span></div>
            ${e.hora_revision?`<div class="f-item"><span class="f-label">Hora</span><span class="f-value">${e.hora_revision}</span></div>`:``}
            ${e.motivo_revision?`<div class="f-item"><span class="f-label">Motivo de seguimiento</span><span class="f-value">${e.motivo_revision}</span></div>`:``}
          </div>
        </section>`:``}

        <!-- ============ 9. AVISO LEGAL ============ -->
        <footer class="rx-footer">
          <div class="legal-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12,3 L21,19 H3 Z"/>
              <line x1="12" y1="9" x2="12" y2="14"/>
              <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
            <span>Esta receta es válida únicamente para el paciente descrito. No reutilizar ni administrar medicamentos a otros animales sin valoración médica veterinaria.</span>
          </div>
          <div class="foot-meta">
            <span>${e.folio_receta?`Folio ${e.folio_receta}`:``}</span>
            <span>${e.fecha_emision?`Emitida el ${e.fecha_emision}`:``}</span>
          </div>
        </footer>

        <!-- ============ SILUETA DE FONDO ============ -->
        <div class="bottom-deco">
          <svg class="dog-shape" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M20,100 C10,60 30,20 60,15 C70,10 75,30 70,45 C90,30 112,30 132,46 C127,30 132,10 142,15 C172,20 192,60 182,100 C188,152 142,188 102,188 C60,188 14,152 20,100 Z"
                  stroke-width="3"/>
          </svg>
          <svg class="cat-shape" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M30,120 C20,80 30,40 60,25 L75,55 C85,45 115,45 125,55 L140,25 C170,40 180,80 170,120 C170,160 130,180 100,180 C70,180 30,160 30,120 Z"
                  stroke-width="3"/>
          </svg>
        </div>

      </div>
    </div>
    `}function o(e){let t=window.open(``,`_blank`,`width=850,height=1000`);if(!t){alert(`Por favor, permite las ventanas emergentes (pop-ups) para imprimir la receta.`);return}let n=i(),r=a(e),o=t.document;o.open(),o.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Receta - ${e.paciente_nombre}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                ${n}
            </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 500)">
            ${r}
        </body>
        </html>
    `),o.close()}var s={perfilMedico:null,pacienteActual:null,idCitaVinculada:null,intervaloReloj:null,intervaloCronometro:null,segundosTranscurridos:0},c={canino:{temp:{min:37.5,max:39.2,letalMin:34,letalMax:42.5},fc:{min:60,max:140,letalMin:30,letalMax:250}},felino:{temp:{min:38,max:39.5,letalMin:35,letalMax:43},fc:{min:140,max:220,letalMin:80,letalMax:300}}};async function l(){console.info(`[CLÍNICA] Despertando módulo de Consulta Integral...`),await g(),u(),p(),_(),y(),b(),S(),v(),f(),typeof suscribirAAlertasMedicas==`function`&&suscribirAAlertasMedicas();let e=sessionStorage.getItem(`iniciarConsultaDirecta`),t=sessionStorage.getItem(`idPacienteActivo`);if(e===`true`&&t)sessionStorage.removeItem(`iniciarConsultaDirecta`),await m(t),d();else if(window._agendaDatos){let{pacienteId:e,citaId:t}=window._agendaDatos;s.citaActivaId=t,window._agendaDatos=null,await m(e),d()}}function u(){let e=document.getElementById(`txt-fecha-hora-actual`);e&&(s.intervaloReloj=setInterval(()=>{e.textContent=new Date().toLocaleDateString(`es-MX`,{year:`numeric`,month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`})},1e3))}function d(){let e=document.getElementById(`contenedor-cronometro`),t=document.getElementById(`txt-cronometro-consulta`);!e||!t||(e.hidden=!1,s.segundosTranscurridos=0,clearInterval(s.intervaloCronometro),s.intervaloCronometro=setInterval(()=>{s.segundosTranscurridos++,t.textContent=`${Math.floor(s.segundosTranscurridos/60).toString().padStart(2,`0`)}:${(s.segundosTranscurridos%60).toString().padStart(2,`0`)}`},1e3))}function f(){let e=sessionStorage.getItem(`idCitaActiva`),t=[`in-peso`,`in-temp`,`in-fc`,`in-fr`,`in-mucosas`,`in-tllc`,`in-dolor`,`in-anamnesis`,`in-diagnostico`,`in-indicaciones-receta`],n=()=>{if(r(!0),!e)return;let n={};t.forEach(e=>{let t=document.getElementById(e);t&&(n[e]=t.value)}),localStorage.setItem(`borrador_consulta_`+e,JSON.stringify(n))};if(t.forEach(e=>{let t=document.getElementById(e);t&&(t.addEventListener(`input`,n),t.addEventListener(`change`,n))}),!e)return;let i=localStorage.getItem(`borrador_consulta_`+e);if(i)try{let n=JSON.parse(i),r=!1;t.forEach(e=>{let t=document.getElementById(e);t&&n[e]!==void 0&&n[e]!==``&&(t.value=n[e],r=!0)}),r&&console.info(`[BORRADOR] Datos recuperados exitosamente para la cita `+e)}catch(e){console.warn(`[BORRADOR] No se pudo parsear el borrador`,e)}}function p(){let e=document.getElementById(`input-busqueda-paciente`),n=document.getElementById(`dropdownResultadosConsulta`);if(!e||!n)return;let r=null;e.addEventListener(`input`,e=>{let t=e.target.value.trim();if(clearTimeout(r),t.length<2){n.style.display=`none`;return}r=setTimeout(()=>i(t),400)}),document.addEventListener(`click`,t=>{!e.contains(t.target)&&!n.contains(t.target)&&(n.style.display=`none`)}),e.addEventListener(`focus`,()=>{e.value.trim().length>=2&&(n.style.display=`block`)});async function i(e){if(s.perfilMedico?.organizacionId){n.innerHTML=`<div class="resultado-pred-empty">Buscando...</div>`,n.style.display=`block`;try{let n=t.from(`pacientes`).select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`).eq(`organizacion_id`,s.perfilMedico.organizacionId).ilike(`nombre`,`%${e}%`).limit(5),r=t.from(`pacientes`).select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`).eq(`organizacion_id`,s.perfilMedico.organizacionId).ilike(`clientes.nombre_completo`,`%${e}%`).limit(5),[i,o]=await Promise.all([n,r]);if(i.error)throw i.error;if(o.error)throw o.error;let c=new Map;[...i.data||[],...o.data||[]].forEach(e=>{c.set(e.id,e)}),a(Array.from(c.values()).slice(0,6))}catch(e){console.error(`[CONSULTA] Error en buscador:`,e),n.innerHTML=`<div class="resultado-pred-empty" style="color:red;">Error de búsqueda</div>`}}}function a(t){if(t.length===0){n.innerHTML=`<div class="resultado-pred-empty">No se encontraron pacientes ni tutores.</div>`;return}n.innerHTML=``,t.forEach(t=>{let r=t.foto_url||`https://cdn-icons-png.flaticon.com/512/2809/2809865.png`,i=t.nombre||`Desconocido`,a=`${t.especie||`Mascota`} ${t.raza?`· `+t.raza:``}`,o=t.clientes?.nombre_completo||`Sin tutor registrado`,s=document.createElement(`div`);s.className=`resultado-pred-item`,s.innerHTML=`
                <img src="${r}" alt="Foto" class="resultado-pred-foto">
                <div class="resultado-pred-info">
                    <p class="resultado-pred-nombre">${i}</p>
                    <p class="resultado-pred-detalles">${a}</p>
                    <p class="resultado-pred-tutor"><span class="material-symbols-rounded" style="font-size:12px; vertical-align:middle;">person</span> ${o}</p>
                </div>
            `,s.addEventListener(`click`,async()=>{n.style.display=`none`,e.value=``,await m(t.id),d()}),n.appendChild(s)})}}async function m(e){try{let n=document.getElementById(`txt-nombre-paciente`);n&&(n.textContent=`Cargando datos...`);let r=null;if(window.pacientePreCargado&&window.pacientePreCargado.id===e)r=window.pacientePreCargado,window.pacientePreCargado=null,console.log(`[MEMORIA] Paciente cargado desde sesión temporal`);else{let{data:n,error:i}=await t.from(`pacientes`).select(`*, clientes ( nombre_completo, telefono )`).eq(`id`,e).single();if(i)throw i;r=n}s.pacienteActual=r,document.getElementById(`txt-nombre-paciente`).textContent=r.nombre||`Desconocido`,document.getElementById(`txt-especie-raza-paciente`).textContent=`${r.especie} - ${r.raza||`No especificada`}`;let i=document.getElementById(`in-especie-oculta`);i&&(i.value=r.especie),document.getElementById(`txt-id-oficial`).textContent=r.chip_id||r.siniiga_tatuaje||`Sin ID Oficial`,document.getElementById(`txt-edad-paciente`).textContent=h(r.fecha_nacimiento),document.getElementById(`txt-dueno-paciente`).textContent=r.clientes?.nombre_completo||`Sin tutor`;let a=document.getElementById(`txt-tel-paciente`);a&&(a.textContent=r.clientes?.telefono||`--`);let o=document.getElementById(`txt-estado-reproductivo`);o&&(o.textContent=r.esta_esterilizado?`Esterilizado`:`Entero`);let c=document.getElementById(`txtComportamiento`);c&&(c.textContent=r.temperamento||`No evaluado`);let l=document.getElementById(`img-avatar-paciente`);l&&(r.foto_url?(l.style.backgroundImage=`url('${r.foto_url}')`,l.style.backgroundSize=`cover`,l.style.backgroundPosition=`center`,l.textContent=``):(l.style.backgroundImage=`none`,l.style.backgroundColor=`var(--gris-fondo-sutil)`,l.textContent=r.nombre?r.nombre.charAt(0).toUpperCase():`?`));let u=document.getElementById(`alerta-alergias`),d=document.getElementById(`txt-alergias-paciente`);r.alergias&&r.alergias.toLowerCase()!==`sin alergias conocidas`?(d&&(d.textContent=r.alergias),u&&(u.hidden=!1)):u&&(u.hidden=!0)}catch(e){console.error(`[CONSULTA INTEGRAL] Error al recuperar la información del paciente derivado:`,e),alert(`Ocurrió un error al trasladar los datos del paciente a la consulta.`);let t=document.getElementById(`txt-nombre-paciente`);t&&(t.textContent=`Selecciona Paciente`)}}function h(e){if(!e)return`--`;let t=new Date,n=new Date(e+`T12:00:00Z`),r=t.getFullYear()-n.getFullYear(),i=t.getMonth()-n.getMonth();return(i<0||i===0&&t.getDate()<n.getDate())&&r--,r>0?`${r} años`:`Meses`}async function g(){let n=await e();if(!n)return window.location.assign(`/LOGIN.html`);try{let{data:e,error:r}=await t.from(`perfiles`).select(`
                id, organizacion_id, sucursal_id, nombre_completo, cedula_profesional, firma_url, 
                organizaciones (nombre_legal, rfc_fiscal, logo_url),
                sucursales (nombre_sucursal, direccion, telefono_recepcion)
            `).eq(`id`,n.id).single();if(r)throw r;s.perfilMedico={id:e.id,organizacionId:e.organizacion_id,sucursalId:e.sucursal_id,nombre:e.nombre_completo||`Dr. Sin Nombre`,cedula:e.cedula_profesional,firma_url:e.firma_url,clinica:e.organizaciones||{},sucursal:e.sucursales||{}}}catch(e){console.error(`[SEGURIDAD] Fallo de integridad en identidad:`,e),window.location.assign(`/LOGIN.html`)}}function _(){[`in-temp`,`in-fc`].forEach(e=>{let t=document.getElementById(e);t&&t.addEventListener(`blur`,t=>{if(!s.pacienteActual)return;let n=parseFloat(t.target.value),r=s.pacienteActual.especie.toLowerCase(),i=e===`in-temp`?`temp`:`fc`,a=c[r]?.[i];if(!a||isNaN(n))return;let o=document.getElementById(`error-${i}`);n<=a.letalMin||n>=a.letalMax||n<a.min||n>a.max?(t.target.classList.add(`error-active`),t.target.style.borderColor=`#F27405`,o.textContent=`Fuera de rango normal.`,o.style.color=`#F27405`,o.style.display=`block`):(t.target.classList.remove(`error-active`),t.target.style.borderColor=``,o.style.display=`none`)})})}function v(){document.querySelectorAll(`.control-pills-naranja`).forEach(e=>{let t=e.querySelectorAll(`.pill-btn-naranja`);t.forEach(e=>{e.addEventListener(`click`,e=>{t.forEach(e=>{e.classList.remove(`activo`),e.setAttribute(`aria-checked`,`false`)});let n=e.currentTarget;n.classList.add(`activo`),n.setAttribute(`aria-checked`,`true`)})})})}function y(){let e=document.getElementById(`btn-abrir-modal-farmaco`),t=document.getElementById(`tbody-receta-farmacos`);!e||!t||(e.textContent=`+ Añadir Fila a Receta`,e.addEventListener(`click`,()=>{let e=document.createElement(`tr`);e.className=`fila-receta-manual`,e.innerHTML=`
            <td><input type="text" class="input-base-limpio farmaco-nombre" placeholder="Ej. Meloxicam 1.5mg"></td>
            <td><input type="text" class="input-base-limpio farmaco-dosis" placeholder="Ej. 1 ml / SC"></td>
            <td><input type="text" class="input-base-limpio farmaco-frecuencia" placeholder="Ej. Cada 24 hrs x 3 días"></td>
            <td>
                <select class="input-base-limpio farmaco-tipo">
                    <option value="3">G III (Libre)</option>
                    <option value="2">G II (Retenida)</option>
                    <option value="1">G I (Controlado)</option>
                </select>
            </td>
            <td>
                <button type="button" class="btn-cerrar-sutil" onclick="this.closest('tr').remove()" title="Eliminar fila" style="position:static;">×</button>
            </td>
        `,t.appendChild(e)}))}function b(){let e=document.getElementById(`btn-ver-expediente`),t=document.querySelector(`.rejilla-bento-consulta`),n=document.getElementById(`panel-expediente`),r=document.getElementById(`btn-cerrar-expediente`);e?.addEventListener(`click`,async()=>{if(!s.pacienteActual)return alert(`⚠️ SAFETY FIRST: Seleccione un paciente para ver su expediente.`);t.classList.contains(`expediente-abierto`)?(t.classList.remove(`expediente-abierto`),n&&n.setAttribute(`aria-hidden`,`true`)):(t.classList.add(`expediente-abierto`),n&&n.setAttribute(`aria-hidden`,`false`),await x(s.pacienteActual.id))}),r?.addEventListener(`click`,()=>{t.classList.remove(`expediente-abierto`),n&&n.setAttribute(`aria-hidden`,`true`)});let i=document.getElementById(`btn-limpiar-paciente`);i&&i.addEventListener(`click`,()=>{s.pacienteActual=null,document.getElementById(`txt-nombre-paciente`).textContent=`Selecciona Paciente`,document.getElementById(`txt-especie-raza-paciente`).textContent=`---`;let e=document.getElementById(`in-especie-oculta`);e&&(e.value=``),document.getElementById(`txt-id-oficial`).textContent=`---`,document.getElementById(`txt-edad-paciente`).textContent=`---`,document.getElementById(`txt-dueno-paciente`).textContent=`---`;let r=document.getElementById(`txt-tel-paciente`);r&&(r.textContent=`---`);let i=document.getElementById(`txt-estado-reproductivo`);i&&(i.textContent=`---`);let a=document.getElementById(`txtComportamiento`);a&&(a.textContent=`---`);let o=document.getElementById(`img-avatar-paciente`);o&&(o.style.backgroundImage=`none`,o.textContent=`?`),t.classList.remove(`expediente-abierto`),n&&n.setAttribute(`aria-hidden`,`true`),document.getElementById(`contenedor-buscador-consulta`).style.display=`block`,document.getElementById(`form-consulta-integral`).reset();let c=document.getElementById(`tbody-receta-farmacos`);c&&(c.innerHTML=``),listaFarmacosManuales=[],clearInterval(s.intervaloCronometro);let l=document.getElementById(`contenedor-cronometro`);l&&(l.hidden=!0)})}async function x(e){let n=document.getElementById(`lista-historial-paciente`);if(n){n.innerHTML=`<p>Cargando datos inmutables...</p>`;try{let{data:r,error:i}=await t.from(`consultas`).select(`id, created_at, diagnostico_presuntivo, frecuencia_cardiaca, temperatura, motivo_consulta`).eq(`paciente_id`,e).order(`created_at`,{ascending:!1}).limit(5);if(i)throw i;if(r.length===0){n.innerHTML=`<p class="texto-secundario text-center">No hay registros previos para este paciente.</p>`;return}n.innerHTML=r.map(e=>`
            <div class="item-sistema" style="margin-bottom: 12px; border-left: 4px solid var(--cielo);">
                <span class="texto-secundario" style="font-size: 0.8rem;">${new Date(e.created_at).toLocaleDateString()}</span>
                <strong style="color: var(--cobalto); display: block;">${e.diagnostico_presuntivo||`Sin diagnóstico`}</strong>
                <p style="font-size: 0.85rem; margin: 4px 0;"><strong>Motivo:</strong> ${e.motivo_consulta}</p>
            </div>
        `).join(``)}catch(e){console.error(`Error al cargar expediente:`,e),n.innerHTML=`<p class='error-msg'>Error al recuperar historial.</p>`}}}function S(){let e=document.getElementById(`form-consulta-medica`);e?.addEventListener(`submit`,async i=>{if(i.preventDefault(),!s.pacienteActual)return alert(`⚠️ Seleccione un paciente antes de generar la consulta.`);let a=[],c=!1;if(document.querySelectorAll(`.fila-receta-manual`).forEach(e=>{let t=e.querySelector(`.farmaco-nombre`).value.trim(),n=e.querySelector(`.farmaco-dosis`).value.trim(),r=e.querySelector(`.farmaco-frecuencia`).value.trim(),i=parseInt(e.querySelector(`.farmaco-tipo`).value);t&&((i===1||i===2)&&!s.perfilMedico.cedula&&(c=!0),a.push({farmaco_id:null,nombre_manual:t,dosis_mg_kg:0,dosis_total_ml_tabletas:0,via_admin:n,frecuencia:r,requiere_cuantificada:i===1||i===2}))}),c)return alert(`🛑 SEGURIDAD LEGAL: No cuenta con Cédula Profesional registrada para prescribir medicamentos controlados (Grupos I y II).`);let l=parseFloat(document.getElementById(`in-peso`).value),u=parseFloat(document.getElementById(`in-temp`).value),d=parseInt(document.getElementById(`in-fc`).value),f=parseInt(document.getElementById(`in-fr`).value),p=parseInt(document.getElementById(`in-dolor`).value)||0;if(isNaN(l)||isNaN(u)||isNaN(d)||isNaN(f))return alert(`⚠️ Por favor, rellena todas las constantes vitales con valores numéricos válidos.`);let m=document.getElementById(`btn-finalizar-consulta`);m&&(m.disabled=!0,m.innerHTML=`<span class="material-symbols-rounded spin">sync</span> Guardando...`);try{let{data:i,error:c}=await t.from(`consultas`).insert([{organizacion_id:s.perfilMedico.organizacionId,sucursal_id:s.perfilMedico.sucursalId,paciente_id:s.pacienteActual.id,medico_id:s.perfilMedico.id,finalizada:!0,fecha_cierre:new Date().toISOString(),peso_kg:l,temperatura:u,frecuencia_cardiaca:d,frecuencia_respiratoria:f,estado_mucosas:document.getElementById(`in-mucosas`).value,tiempo_llenado_capilar:document.getElementById(`in-tllc`).value,escala_dolor:p,motivo_consulta:document.getElementById(`in-anamnesis`).value,anamnesis:document.getElementById(`in-anamnesis`).value,diagnostico_presuntivo:document.getElementById(`in-diagnostico`).value,plan_tratamiento:document.getElementById(`in-indicaciones-receta`)?.value||`Sin indicaciones extras.`}]).select(`id`).single();if(c)throw c;if(a.length>0){let e=a.map(e=>({consulta_id:i.id,...e})),{error:n}=await t.from(`recetas_items`).insert(e);n&&console.warn(`Aviso: No se pudo guardar el detalle de la receta en DB`,n)}if(sessionStorage.setItem(`cargosConsultaPendiente`,JSON.stringify([])),sessionStorage.setItem(`pacienteCheckout`,JSON.stringify({nombre:s.pacienteActual?.nombre||`Desconocido`,tutor:document.getElementById(`txt-dueno-paciente`)?.textContent||s.pacienteActual?.clientes?.nombre_completo||`Sin Tutor asignado`,cliente_id:s.pacienteActual?.cliente_id||null})),(a.length>0||document.getElementById(`in-indicaciones-receta`)?.value)&&await n(`Consulta Guardada`,`Consulta guardada exitosamente.

¿Desea imprimir la receta médica ahora?`)){let e=s.perfilMedico.clinica,t=s.perfilMedico.sucursal,n=s.pacienteActual;o({logo_url:e.logo_url||``,nombre_clinica:t.nombre_sucursal||e.nombre_legal||`Clínica Veterinaria`,direccion:t.direccion||``,telefono:t.telefono_recepcion||``,correo:``,rfc:e.rfc_fiscal||``,folio_receta:`RX-${i.id.toString().slice(0,6).toUpperCase()}`,fecha_emision:new Date().toLocaleDateString(`es-MX`),nombre_veterinario:s.perfilMedico?.nombre||`Desconocido`,cedula_profesional:s.perfilMedico?.cedula||`En trámite`,especialidad:`Medicina Veterinaria General`,firma_url:s.perfilMedico.firma_url||``,propietario_nombre:document.getElementById(`txt-dueno-paciente`)?.textContent||n.clientes?.nombre_completo||`Sin nombre`,propietario_telefono:n.clientes?.telefono||``,propietario_email:n?.clientes?.email||``,paciente_nombre:n?.nombre||`Desconocido`,expediente_id:`EXP-${n?.id?.toString().slice(0,6).toUpperCase()||`XXX`}`,especie:n.especie,raza:n.raza,sexo:n.sexo,edad:(e=>{if(!e)return`Desconocida`;let t=new Date,n=new Date(e),r=t.getFullYear()-n.getFullYear(),i=t.getMonth()-n.getMonth();return(i<0||i===0&&t.getDate()<n.getDate())&&r--,r>0?`${r} años`:`Menor de 1 año`})(n.fecha_nacimiento),peso:`${l} kg`,senas_particulares:``,motivo_consulta:document.getElementById(`in-anamnesis`).value,diagnostico:document.getElementById(`in-diagnostico`).value,medicamentos:a.map(e=>({nombre:e.nombre_manual,concentracion:`-`,dosis:e.via_admin,via:`-`,frecuencia:e.frecuencia,duracion:`-`,cantidad:`-`})),observaciones:document.getElementById(`in-indicaciones-receta`)?.value?document.getElementById(`in-indicaciones-receta`).value.split(`\\n`).filter(e=>e.trim()):[],fecha_revision:``,hora_revision:``,motivo_revision:``})}let m=sessionStorage.getItem(`idCitaActiva`);if(m){let{error:e}=await t.from(`citas`).update({estado:`finalizada`}).eq(`id`,m);e&&console.warn(`No se pudo actualizar el estado de la cita a finalizada`,e),localStorage.removeItem(`borrador_consulta_`+m),sessionStorage.removeItem(`idCitaActiva`)}r(!1),clearInterval(s.intervaloCronometro);let h=document.getElementById(`contenedor-cronometro`);h&&(h.hidden=!0),document.getElementById(`btn-limpiar-paciente`)?.click(),e.reset();let g=document.getElementById(`tbody-receta-farmacos`);g&&(g.innerHTML=``),s.pacienteActual=null,window.cargarModulo?window.cargarModulo(`CHECKOUT_FINAL_COBRO`):alert(`✅ Consulta guardada correctamente. Proceda a la caja.`)}catch(e){console.error(`[TRANSACTION ERROR] Fallo al guardar ECOP:`,e),alert(`Error al guardar en base de datos: ${e.message||`Verifica tu conexión y los datos ingresados.`}`)}finally{m&&(m.disabled=!1,m.textContent=`Firmar y Finalizar Consulta`)}})}export{l as inicializarConsultaIntegral};