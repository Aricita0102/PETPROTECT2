// =====================================================================
// MOTOR AVANZADO DE PLANTILLAS DE DOCUMENTOS (PETPROTECT)
// =====================================================================

export const ESTILOS_PLANTILLAS = `
<style>
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
  .plantilla-doc * { box-sizing:border-box; }
  .plantilla-doc {
    font-family:'Inter', sans-serif;
    color:var(--gray-dark);
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  #documento{
    background:var(--blanco-puro);
    position:relative;
    overflow:hidden;
    width:100%;
    max-width: 800px;
    margin: 0 auto;
    padding:46px 54px 0;
  }
  .doc-header{
    display:flex; justify-content:space-between; align-items:flex-start; gap:18px;
    position:relative; z-index:1;
  }
  .clinic-id{ display:flex; gap:14px; align-items:flex-start; }
  .logo-wrap{
    width:52px; height:52px; flex:none;
    display:flex; align-items:center; justify-content:center;
    color:var(--cobalto);
  }
  .logo-wrap img{ width:100%; height:100%; object-fit:contain; }
  .clinic-name{
    font-family:'Playfair Display', serif; font-weight:700; font-size:23px;
    color:var(--cobalto); margin:0 0 4px 0; line-height:1.1;
  }
  .clinic-meta{ font-size:11px; line-height:1.65; color:var(--gray-mid); }
  .clinic-meta span{ display:block; }
  .doc-meta{ text-align:right; flex:none; }
  .doc-title{
    font-family:'Poppins', sans-serif; font-weight:700; font-size:13px;
    letter-spacing:0.07em; text-transform:uppercase; color:var(--naranja); margin-bottom:6px;
  }
  .doc-meta .meta-row{ font-size:11.5px; color:var(--gray-dark); margin-top:2px; }
  .doc-meta .meta-row strong{ color:var(--cobalto); font-weight:700; }
  .accent-bar{ height:2px; margin:16px 0 22px; background:var(--naranja); }
  .section{ position:relative; z-index:1; margin-bottom:18px; }
  .section-title{
    display:flex; align-items:center; gap:8px;
    font-family:'Poppins', sans-serif; font-weight:600; font-size:11.5px;
    letter-spacing:0.09em; text-transform:uppercase; color:var(--cobalto); margin-bottom:10px;
  }
  .section-title svg{ width:15px; height:15px; color:var(--naranja); flex:none; }
  .section-title::after{ content:''; flex:1; height:1px; background:var(--gray-line); margin-left:6px; }
  .info-list{ display:flex; flex-direction:column; gap:0; }
  .info-list.row{ flex-direction:row; flex-wrap:wrap; gap:28px; }
  .info-line{ font-size:12.5px; line-height:1.85; }
  .info-line .lbl{ color:var(--gray-mid); margin-right:5px; }
  .info-line .val{ color:var(--gray-dark); font-weight:600; outline: none; padding: 2px 4px; border-radius: 4px; }
  .info-line .val[contenteditable="true"]:hover { background: #f1f5f9; cursor: text; }
  .row-with-signature{ display:flex; justify-content:space-between; gap:24px; flex-wrap:wrap; }
  .signatures{ display:flex; gap:22px; flex-wrap:wrap; justify-content:flex-end; }
  .firma-box{ flex:none; width:170px; display:flex; flex-direction:column; align-items:center; }
  .firma-area{
    width:100%; height:54px; border-bottom:1.2px solid var(--cobalto);
    display:flex; align-items:flex-end; justify-content:center; padding-bottom:4px;
  }
  .firma-area img{ max-height:50px; max-width:100%; object-fit:contain; }
  .firma-caption{ margin-top:6px; font-size:10px; letter-spacing:0.03em; color:var(--gray-mid); text-align:center; }
  .data-card{
    background:var(--cobalto-tint); border-left:3px solid var(--naranja);
    padding:16px 20px; display:grid; grid-template-columns:repeat(4, 1fr); gap:12px 18px;
  }
  .data-card .field.span2{ grid-column:span 2; }
  .field .f-label{
    display:block; font-size:9.5px; letter-spacing:0.06em; text-transform:uppercase;
    color:var(--gray-mid); margin-bottom:3px;
  }
  .field .f-value{ font-size:13px; font-weight:700; color:var(--cobalto); word-break:break-word; outline: none; }
  .field .f-value[contenteditable="true"]:hover { background: rgba(255,255,255,0.5); cursor: text; border-radius: 4px; }
  .field.text .f-value{ font-weight:400; color:var(--gray-dark); line-height:1.55; }
  .paragraph-group{ display:flex; flex-direction:column; gap:10px; }
  table.data-table{ width:100%; border-collapse:collapse; font-size:12px; }
  .data-table thead th{
    background:var(--cobalto); color:var(--blanco-puro);
    font-family:'Poppins', sans-serif; font-weight:600; font-size:10px;
    letter-spacing:0.04em; text-transform:uppercase; text-align:left; padding:9px 10px;
  }
  .data-table tbody td{
    padding:9px 10px; border-bottom:1px solid var(--gray-line); color:var(--gray-dark); vertical-align:top;
  }
  .data-table tbody td:first-child{ font-weight:700; color:var(--cobalto); }
  ul.checklist{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:7px; }
  ul.checklist li{ display:flex; align-items:flex-start; gap:8px; font-size:12.5px; color:var(--gray-dark); line-height:1.5; outline:none; }
  ul.checklist li[contenteditable="true"]:hover { background: #f1f5f9; cursor: text; border-radius: 4px; }
  .check-mark{
    flex:none; width:15px; height:15px; border:1.3px solid var(--naranja); color:var(--naranja);
    display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:700; margin-top:1px;
  }
  .highlight-strip{
    display:flex; gap:26px; flex-wrap:wrap;
    border-top:1px solid var(--gray-line); border-bottom:1px solid var(--gray-line); padding:12px 2px;
  }
  .doc-footer{ margin-top:22px; position:relative; z-index:1; }
  .legal-notice{
    display:flex; gap:8px; align-items:flex-start;
    font-size:10.5px; line-height:1.55; color:var(--gray-mid); font-style:italic;
  }
  .legal-notice svg{ width:15px; height:15px; color:var(--naranja); flex:none; margin-top:1px; }
  .foot-meta{
    display:flex; justify-content:space-between; margin-top:12px;
    font-size:10px; color:var(--gray-mid); letter-spacing:0.02em;
  }
  .bottom-deco{ position:relative; height:128px; margin-top:6px; z-index:0; }
  .bottom-deco svg{ position:absolute; bottom:-42px; stroke:var(--deco-color); fill:none; }
  .bottom-deco .dog-shape{ left:-4%; width:280px; height:auto; }
  .bottom-deco .cat-shape{ left:190px; width:230px; height:auto; }
</style>
`;

const ICONS = {
  medico: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="1.5" width="6" height="2.6" rx="1"/><rect x="4" y="3" width="16" height="18.5" rx="2"/>
    <circle cx="12" cy="10.5" r="2.6"/><path d="M8,17 a4,3.2 0 0,1 8,0"/></svg>`,
  propietario: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M5,20 a7,6.2 0 0,1 14,0"/></svg>`,
  paciente: `<svg viewBox="0 0 24 24" fill="currentColor">
    <ellipse cx="12" cy="16.2" rx="5.2" ry="4"/><circle cx="5.8" cy="9" r="2.1"/><circle cx="12" cy="6.2" r="2.3"/><circle cx="18.2" cy="9" r="2.1"/></svg>`,
  notas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="3" rx="1"/>
    <line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/></svg>`,
  medicamentos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <g transform="rotate(45 12 12)"><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g></svg>`,
  checklist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor" stroke="none"/></svg>`,
  fecha: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="5" width="16" height="15" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/>
    <line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/><polyline points="9,15 11,17 16,12"/></svg>`,
  certificado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12,3 L19,6 V11 C19,16 16,19.5 12,21 C8,19.5 5,16 5,11 V6 Z"/><polyline points="9,12 11,14 15,9.5"/></svg>`,
  consentimiento: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2"/><polyline points="8.5,12 11,14.5 16,9"/></svg>`,
  referencia: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="12" r="2.6"/><line x1="8.4" y1="12" x2="18" y2="12"/><polyline points="14,8 18,12 14,16"/></svg>`,
  vacunas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <g transform="rotate(45 12 12)"><rect x="7" y="9" width="12" height="5" rx="1"/>
    <line x1="19" y1="11.5" x2="22" y2="11.5"/><line x1="5" y1="11.5" x2="7" y2="11.5"/>
    <line x1="10" y1="9" x2="10" y2="14"/><line x1="13" y1="9" x2="13" y2="14"/></g></svg>`
};

function sectionTitle(icon, label){ return `<div class="section-title">${icon}${label}</div>`; }
function section(titleHtml, bodyHtml){ return bodyHtml ? `<section class="section">${titleHtml}${bodyHtml}</section>` : ''; }
function blockInfoLines(pairs, row){
  const items = pairs.filter(p => p[1]);
  if(!items.length) return '';
  return `<div class="info-list${row ? ' row' : ''}">` +
    items.map(p => `<div class="info-line"><span class="lbl">${p[0]}:</span><span class="val" contenteditable="true">${p[1]}</span></div>`).join('') +
  `</div>`;
}
function blockDataCard(fields){
  const items = fields.filter(f => f.value);
  if(!items.length) return '';
  return `<div class="data-card">` +
    items.map(f => `<div class="field${f.span2 ? ' span2' : ''}"><span class="f-label">${f.label}</span><span class="f-value" contenteditable="true">${f.value}</span></div>`).join('') +
  `</div>`;
}
function blockParagraph(label, text){
  if(!text) return '';
  return `<div class="field text"><span class="f-label">${label}</span><span class="f-value" contenteditable="true">${text}</span></div>`;
}
function blockParagraphGroup(items){
  const html = items.map(i => blockParagraph(i.label, i.text)).filter(h => h).join('');
  return html ? `<div class="paragraph-group">${html}</div>` : '';
}
function blockTable(columns, rows){
  if(!rows || !rows.length) return '';
  const thead = '<tr>' + columns.map(c => `<th>${c.label}</th>`).join('') + '</tr>';
  // Hacemos cada celda editable para que el veterinario pueda ajustar dosis
  const tbody = rows.map(r => '<tr>' + columns.map(c => `<td contenteditable="true" data-label="${c.label}">${r[c.key] ?? ''}</td>`).join('') + '</tr>').join('');
  return `<table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}
function blockChecklist(items){
  if(!items || !items.length) return '';
  return `<ul class="checklist">` + items.map(t => `<li contenteditable="true"><span class="check-mark" contenteditable="false">&#10003;</span>${t}</li>`).join('') + `</ul>`;
}
function blockHighlightStrip(items){
  const list = items.filter(i => i.value);
  if(!list.length) return '';
  return `<div class="highlight-strip">` +
    list.map(i => `<div class="field"><span class="f-label">${i.label}</span><span class="f-value" contenteditable="true">${i.value}</span></div>`).join('') +
  `</div>`;
}
function blockSignatures(list){
  return `<div class="signatures">` + list.map(s => `
    <div class="firma-box">
      <div class="firma-area">${s.url ? `<img src="${s.url}" alt="Firma">` : ''}</div>
      <div class="firma-caption">${s.caption}</div>
    </div>`).join('') + `</div>`;
}

const DOCUMENT_TYPES = {
  receta: {
    titulo: "Receta médica veterinaria",
    avisoLegal: "Esta receta es válida únicamente para el paciente descrito. No reutilizar ni administrar medicamentos a otros animales sin valoración médica veterinaria.",
    render(d){
      return [
        section(sectionTitle(ICONS.medico, "Médico veterinario responsable"),
          `<div class="row-with-signature">
             ${blockInfoLines([["Nombre", d.nombre_veterinario], ["Cédula profesional", d.cedula_profesional], ["Especialidad", d.especialidad]])}
             ${blockSignatures([{ url:d.firma_url, caption:"Firma del médico veterinario" }])}
           </div>`),
        section(sectionTitle(ICONS.propietario, "Propietario"),
          blockInfoLines([["Nombre", d.propietario_nombre], ["Teléfono", d.propietario_telefono], ["Correo", d.propietario_email]], true)),
        section(sectionTitle(ICONS.paciente, "Paciente"),
          blockDataCard([
            { label:"Nombre", value:d.paciente_nombre }, { label:"Expediente", value:d.expediente_id },
            { label:"Especie", value:d.especie }, { label:"Raza", value:d.raza },
            { label:"Sexo", value:d.sexo }, { label:"Edad", value:d.edad },
            { label:"Peso actual", value:d.peso }, { label:"Color / señas particulares", value:d.senas_particulares, span2:true }
          ])),
        section(sectionTitle(ICONS.notas, "Diagnóstico"),
          blockParagraphGroup([{ label:"Motivo de consulta", text:d.motivo_consulta }, { label:"Diagnóstico presuntivo / definitivo", text:d.diagnostico }])),
        section(sectionTitle(ICONS.medicamentos, "Medicamentos prescritos"),
          blockTable([
            { key:'nombre', label:'Medicamento' }, { key:'concentracion', label:'Concentración' }, { key:'dosis', label:'Dosis' },
            { key:'via', label:'Vía' }, { key:'frecuencia', label:'Frecuencia' }, { key:'duracion', label:'Duración' }, { key:'cantidad', label:'Cantidad' }
          ], d.medicamentos)),
        section(sectionTitle(ICONS.checklist, "Indicaciones generales"), blockChecklist(d.observaciones)),
        section(sectionTitle(ICONS.fecha, "Próxima revisión"),
          blockHighlightStrip([{ label:"Fecha", value:d.fecha_revision }, { label:"Hora", value:d.hora_revision }, { label:"Motivo de seguimiento", value:d.motivo_revision }]))
      ].join('');
    }
  },
  certificado_salud: {
    titulo: "Certificado de salud",
    avisoLegal: "Este certificado se expide a solicitud del propietario con base en la exploración física realizada en la fecha indicada. No sustituye estudios de laboratorio o gabinete cuando estos sean requeridos.",
    render(d){
      return [
        section(sectionTitle(ICONS.medico, "Médico veterinario responsable"),
          `<div class="row-with-signature">
             ${blockInfoLines([["Nombre", d.nombre_veterinario], ["Cédula profesional", d.cedula_profesional], ["Especialidad", d.especialidad]])}
             ${blockSignatures([{ url:d.firma_url, caption:"Firma y sello del médico veterinario" }])}
           </div>`),
        section(sectionTitle(ICONS.propietario, "Propietario"),
          blockInfoLines([["Nombre", d.propietario_nombre], ["Teléfono", d.propietario_telefono], ["Correo", d.propietario_email]], true)),
        section(sectionTitle(ICONS.paciente, "Paciente"),
          blockDataCard([
            { label:"Nombre", value:d.paciente_nombre }, { label:"Expediente", value:d.expediente_id },
            { label:"Especie", value:d.especie }, { label:"Raza", value:d.raza },
            { label:"Sexo", value:d.sexo }, { label:"Edad", value:d.edad },
            { label:"Peso actual", value:d.peso }, { label:"Color / señas particulares", value:d.senas_particulares, span2:true }
          ])),
        section(sectionTitle(ICONS.certificado, "Certificación"),
          blockParagraphGroup([
            { label:"Se hace constar que el paciente es apto para", text:d.motivo_certificado },
            { label:"Hallazgos de la exploración física", text:d.hallazgos_clinicos }
          ])),
        section(sectionTitle(ICONS.fecha, "Examen físico y vigencia"),
          blockHighlightStrip([
            { label:"Temperatura", value:d.temperatura }, { label:"Frec. cardiaca", value:d.frecuencia_cardiaca },
            { label:"Frec. respiratoria", value:d.frecuencia_respiratoria }, { label:"Condición corporal", value:d.condicion_corporal },
            { label:"Válido hasta", value:d.vigencia }
          ]))
      ].join('');
    }
  },
  certificado_antirrabico: {
    titulo: "Certificado de Vacunación Antirrábica",
    avisoLegal: "Este documento certifica la aplicación de la vacuna antirrábica detallada, conforme a la normatividad sanitaria vigente.",
    render(d){
      return [
        section(sectionTitle(ICONS.medico, "Médico veterinario responsable"),
          `<div class="row-with-signature">
             ${blockInfoLines([["Nombre", d.nombre_veterinario], ["Cédula profesional", d.cedula_profesional]])}
             ${blockSignatures([{ url:d.firma_url, caption:"Firma y sello del médico veterinario" }])}
           </div>`),
        section(sectionTitle(ICONS.propietario, "Propietario"),
          blockInfoLines([["Nombre", d.propietario_nombre], ["Teléfono", d.propietario_telefono]], true)),
        section(sectionTitle(ICONS.paciente, "Paciente"),
          blockDataCard([
            { label:"Nombre", value:d.paciente_nombre }, { label:"Expediente", value:d.expediente_id },
            { label:"Especie", value:d.especie }, { label:"Raza", value:d.raza },
            { label:"Sexo", value:d.sexo }, { label:"Color / señas particulares", value:d.senas_particulares, span2:true }
          ])),
        section(sectionTitle(ICONS.vacunas, "Información de la Vacuna"),
          blockTable([
            { key:'laboratorio', label:'Laboratorio' }, { key:'marca', label:'Marca Comercial' }, { key:'lote', label:'Lote' },
            { key:'caducidad', label:'Caducidad' }
          ], [{ laboratorio:"Clic para editar", marca:"Clic para editar", lote:"", caducidad:"" }])),
        section(sectionTitle(ICONS.fecha, "Fechas de Aplicación"),
          blockHighlightStrip([
            { label:"Fecha de Aplicación", value:new Date().toLocaleDateString() },
            { label:"Próxima Vacunación", value:"En 1 año" }
          ]))
      ].join('');
    }
  },
  consentimiento_quirurgico: {
    titulo: "Consentimiento informado",
    avisoLegal: "Este documento forma parte del expediente clínico del paciente. La firma confirma la comprensión y aceptación voluntaria de lo aquí descrito.",
    render(d){
      return [
        section(sectionTitle(ICONS.medico, "Médico veterinario responsable"),
          blockInfoLines([["Nombre", d.nombre_veterinario], ["Cédula profesional", d.cedula_profesional], ["Especialidad", d.especialidad]], true)),
        section(sectionTitle(ICONS.propietario, "Propietario"),
          blockInfoLines([["Nombre", d.propietario_nombre], ["Teléfono", d.propietario_telefono], ["Correo", d.propietario_email]], true)),
        section(sectionTitle(ICONS.paciente, "Paciente"),
          blockDataCard([
            { label:"Nombre", value:d.paciente_nombre }, { label:"Expediente", value:d.expediente_id },
            { label:"Especie", value:d.especie }, { label:"Raza", value:d.raza },
            { label:"Sexo", value:d.sexo }, { label:"Edad", value:d.edad }
          ])),
        section(sectionTitle(ICONS.consentimiento, "Procedimiento a realizar"),
          blockParagraphGroup([{ label:"Descripción del procedimiento", text:d.procedimiento }])),
        section(sectionTitle(ICONS.checklist, "Riesgos y consideraciones"), blockChecklist(d.riesgos)),
        section(sectionTitle(ICONS.notas, "Declaración de consentimiento"),
          blockParagraphGroup([{ label:"El propietario declara que", text:d.declaracion }])),
        section(sectionTitle(ICONS.medico, "Firmas"),
          blockSignatures([
            { url:d.firma_propietario_url, caption:"Firma del propietario" },
            { url:d.firma_url, caption:"Firma del médico veterinario" }
          ]))
      ].join('');
    }
  },
  alta_medica: {
    titulo: "Alta Médica / Constancia",
    avisoLegal: "El paciente es dado de alta médica el día de hoy bajo las condiciones indicadas en este documento. Es vital seguir las indicaciones post-alta.",
    render(d){
      return [
        section(sectionTitle(ICONS.medico, "Médico veterinario responsable"),
          `<div class="row-with-signature">
             ${blockInfoLines([["Nombre", d.nombre_veterinario], ["Cédula profesional", d.cedula_profesional]])}
             ${blockSignatures([{ url:d.firma_url, caption:"Firma y sello del médico veterinario" }])}
           </div>`),
        section(sectionTitle(ICONS.propietario, "Propietario"),
          blockInfoLines([["Nombre", d.propietario_nombre], ["Teléfono", d.propietario_telefono], ["Correo", d.propietario_email]], true)),
        section(sectionTitle(ICONS.paciente, "Paciente"),
          blockDataCard([
            { label:"Nombre", value:d.paciente_nombre }, { label:"Expediente", value:d.expediente_id },
            { label:"Especie", value:d.especie }, { label:"Raza", value:d.raza },
            { label:"Sexo", value:d.sexo }, { label:"Edad", value:d.edad }
          ])),
        section(sectionTitle(ICONS.notas, "Resumen de Hospitalización"),
          blockParagraphGroup([
            { label:"Motivo de Ingreso", text:d.motivo_ingreso },
            { label:"Evolución y Tratamiento", text:d.evolucion_tratamiento }
          ])),
        section(sectionTitle(ICONS.checklist, "Indicaciones Post-Alta"), blockChecklist(d.indicaciones_alta))
      ].join('');
    }
  }
};

const FALLBACK_LOGO = `
<svg width="100%" height="100%" viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6,58 C4,38 11,22 23,13 C28,9 32,10 32,18 C36,9 43,8 46,16 C49,8 56,8 59,16 C63,8 71,9 74,18 C84,28 88,40 86,58"
        stroke="#032F40" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function generarPlantillaAvanzada(tipoKey, d) {
  const tipo = DOCUMENT_TYPES[tipoKey] || DOCUMENT_TYPES.receta;
  const logoHtml = d.logo_url ? `<img src="${d.logo_url}" alt="Logo de la clínica">` : FALLBACK_LOGO;
  
  const bodyHtml = tipo.render(d);
  
  // Reemplazar vacíos con cadenas vacías para que no falle
  const valOr = (v, pre="") => v ? `${pre}${v}` : '';

  return `
    ${ESTILOS_PLANTILLAS}
    <div class="plantilla-doc">
      <div id="documento" class="tplContenidoEditableContainer">
        
        <header class="doc-header">
          <div class="clinic-id">
            <div class="logo-wrap" id="logoWrap">${logoHtml}</div>
            <div class="clinic-text">
              <h1 class="clinic-name" contenteditable="true">${valOr(d.nombre_clinica)}</h1>
              <div class="clinic-meta" contenteditable="true">
                <span>${valOr(d.direccion)}</span>
                <span>${valOr(d.telefono, 'Tel: ')}</span>
                <span>${valOr(d.correo)}</span>
                <span style="display:${d.rfc ? 'block' : 'none'}">${valOr(d.rfc, 'RFC: ')}</span>
              </div>
            </div>
          </div>
          <div class="doc-meta">
            <div class="doc-title" contenteditable="true">${valOr(tipo.titulo)}</div>
            <div class="meta-row">Folio: <strong contenteditable="true">${valOr(d.folio_documento)}</strong></div>
            <div class="meta-row">Fecha de emisión: <strong contenteditable="true">${valOr(d.fecha_emision)}</strong></div>
          </div>
        </header>

        <div class="accent-bar"></div>

        <!-- Cuerpo Específico -->
        <div id="documentBody">
          ${bodyHtml}
        </div>

        <footer class="doc-footer">
          <div class="legal-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12,3 L21,19 H3 Z"/>
              <line x1="12" y1="9" x2="12" y2="14"/>
              <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
            <span contenteditable="true">${valOr(d.aviso_legal || tipo.avisoLegal)}</span>
          </div>
          <div class="foot-meta">
            <span>${valOr(d.folio_documento, 'Folio ')}</span>
            <span>${valOr(d.fecha_emision, 'Emitida el ')}</span>
          </div>
        </footer>

        <div class="bottom-deco">
          <svg class="dog-shape" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M20,100 C10,60 30,20 60,15 C70,10 75,30 70,45 C90,30 112,30 132,46 C127,30 132,10 142,15 C172,20 192,60 182,100 C188,152 142,188 102,188 C60,188 14,152 20,100 Z" stroke-width="3"/>
          </svg>
          <svg class="cat-shape" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M30,120 C20,80 30,40 60,25 L75,55 C85,45 115,45 125,55 L140,25 C170,40 180,80 170,120 C170,160 130,180 100,180 C70,180 30,160 30,120 Z" stroke-width="3"/>
          </svg>
        </div>

      </div>
    </div>
  `;
}
