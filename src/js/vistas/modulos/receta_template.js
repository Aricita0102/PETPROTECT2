export function obtenerCSSPlantillaReceta() {
    return `
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
    `;
}

export function obtenerDOMInnerReceta(d) {
    const fallbackLogo = `
    <svg width="100%" height="100%" viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6,58 C4,38 11,22 23,13 C28,9 32,10 32,18 C36,9 43,8 46,16 C49,8 56,8 59,16 C63,8 71,9 74,18 C84,28 88,40 86,58"
            stroke="#032F40" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const logoHtml = d.logo_url ? `<img src="${d.logo_url}" alt="Logo">` : fallbackLogo;
    const firmaHtml = d.firma_url ? `<img src="${d.firma_url}" style="max-height: 60px; object-fit: contain; display: block; margin: 0 auto; mix-blend-mode: multiply;" crossorigin="anonymous" alt="Firma">` : '';

    const colsMed = [
        { key:'nombre', label:'Medicamento' },
        { key:'concentracion', label:'Concentración' },
        { key:'dosis', label:'Dosis' },
        { key:'via', label:'Vía' },
        { key:'frecuencia', label:'Frecuencia' },
        { key:'duracion', label:'Duración' },
        { key:'cantidad', label:'Cantidad' }
    ];
    const medHead = '<tr>' + colsMed.map(c => `<th>${c.label}</th>`).join('') + '</tr>';
    const medBody = (d.medicamentos || []).map(m =>
        '<tr>' + colsMed.map(c => `<td data-label="${c.label}">${m[c.key] ?? ''}</td>`).join('') + '</tr>'
    ).join('');

    const indBody = (d.observaciones || []).map(item => `<li><span class="ind-check">&#10003;</span>${item}</li>`).join('');

    return `
    <div class="receta-pdf-wrapper">
      <div id="receta">
        <!-- ============ 1. ENCABEZADO ============ -->
        <header class="rx-header">
          <div class="clinic-id">
            <div class="logo-wrap">${logoHtml}</div>
            <div class="clinic-text">
              <h1 class="clinic-name">${d.nombre_clinica || ''}</h1>
              <div class="clinic-meta">
                ${d.direccion ? `<span>${d.direccion}</span>` : ''}
                ${d.telefono ? `<span>Tel: ${d.telefono}</span>` : ''}
                ${d.correo ? `<span>${d.correo}</span>` : ''}
                ${d.rfc ? `<span>RFC: ${d.rfc}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="rx-meta">
            <div class="rx-title">Receta médica veterinaria</div>
            <div class="meta-row">Folio: <strong>${d.folio_receta || 'S/N'}</strong></div>
            <div class="meta-row">Fecha de emisión: <strong>${d.fecha_emision || ''}</strong></div>
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
              <div class="info-line"><span class="lbl">Nombre:</span><span class="val">${d.nombre_veterinario || ''}</span></div>
              <div class="info-line"><span class="lbl">Cédula profesional:</span><span class="val">${d.cedula_profesional || 'N/A'}</span></div>
              ${d.especialidad ? `<div class="info-line"><span class="lbl">Especialidad:</span><span class="val">${d.especialidad}</span></div>` : ''}
            </div>
            <div class="firma-box">
              <div class="firma-area">${firmaHtml}</div>
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
            <div class="info-line"><span class="lbl">Nombre:</span><span class="val">${d.propietario_nombre || ''}</span></div>
            <div class="info-line"><span class="lbl">Teléfono:</span><span class="val">${d.propietario_telefono || ''}</span></div>
            ${d.propietario_email ? `<div class="info-line"><span class="lbl">Correo:</span><span class="val">${d.propietario_email}</span></div>` : ''}
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
            <div class="field"><span class="f-label">Nombre</span><span class="f-value">${d.paciente_nombre || ''}</span></div>
            <div class="field"><span class="f-label">Expediente</span><span class="f-value">${d.expediente_id || ''}</span></div>
            <div class="field"><span class="f-label">Especie</span><span class="f-value">${d.especie || ''}</span></div>
            <div class="field"><span class="f-label">Raza</span><span class="f-value">${d.raza || ''}</span></div>
            <div class="field"><span class="f-label">Sexo</span><span class="f-value">${d.sexo || ''}</span></div>
            <div class="field"><span class="f-label">Edad</span><span class="f-value">${d.edad || ''}</span></div>
            <div class="field"><span class="f-label">Peso actual</span><span class="f-value">${d.peso || ''}</span></div>
            <div class="field span2"><span class="f-label">Color / señas particulares</span><span class="f-value">${d.senas_particulares || ''}</span></div>
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
            <div class="diag-item"><span class="f-label">Motivo de consulta</span><span class="f-value">${d.motivo_consulta || ''}</span></div>
            ${d.diagnostico ? `<div class="diag-item"><span class="f-label">Diagnóstico presuntivo / definitivo</span><span class="f-value">${d.diagnostico}</span></div>` : ''}
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
            <thead>${medHead}</thead>
            <tbody>${medBody}</tbody>
          </table>
        </section>

        <!-- ============ 7. INDICACIONES GENERALES ============ -->
        ${d.observaciones && d.observaciones.length > 0 ? `
        <section class="section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <line x1="12" y1="11" x2="12" y2="16.5"/>
              <circle cx="12" cy="7.6" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
            Indicaciones generales
          </div>
          <ul class="ind-list">${indBody}</ul>
        </section>` : ''}

        <!-- ============ 8. PRÓXIMA REVISIÓN ============ -->
        ${d.fecha_revision ? `
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
            <div class="f-item"><span class="f-label">Fecha</span><span class="f-value">${d.fecha_revision}</span></div>
            ${d.hora_revision ? `<div class="f-item"><span class="f-label">Hora</span><span class="f-value">${d.hora_revision}</span></div>` : ''}
            ${d.motivo_revision ? `<div class="f-item"><span class="f-label">Motivo de seguimiento</span><span class="f-value">${d.motivo_revision}</span></div>` : ''}
          </div>
        </section>` : ''}

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
            <span>${d.folio_receta ? `Folio ${d.folio_receta}` : ''}</span>
            <span>${d.fecha_emision ? `Emitida el ${d.fecha_emision}` : ''}</span>
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
    `;
}

export function imprimirRecetaEnNuevaVentana(datosReceta) {
    const ventanaImpresion = window.open('', '_blank', 'width=850,height=1000');
    if (!ventanaImpresion) {
        alert('Por favor, permite las ventanas emergentes (pop-ups) para imprimir la receta.');
        return;
    }

    const css = obtenerCSSPlantillaReceta();
    const html = obtenerDOMInnerReceta(datosReceta);

    const doc = ventanaImpresion.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Receta - ${datosReceta.paciente_nombre}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                ${css}
            </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 500)">
            ${html}
        </body>
        </html>
    `);
    doc.close();
}
