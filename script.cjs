const fs = require('fs');
let html = fs.readFileSync('c:/xampp/htdocs/PETPROTECT/MODULO_AGENDA.html', 'utf8');

html = html.replace(
  '<div><div class="resumen-label">Citas hoy</div><div class="resumen-value">8</div></div>',
  '<div><div class="resumen-label">Citas hoy</div><div class="resumen-value" id="res-citas-hoy">-</div></div>'
);
html = html.replace(
  '<div><div class="resumen-label">Confirmadas</div><div class="resumen-value">5</div></div>',
  '<div><div class="resumen-label">Confirmadas</div><div class="resumen-value" id="res-confirmadas">-</div></div>'
);
html = html.replace(
  '<div><div class="resumen-label">En espera</div><div class="resumen-value">2</div></div>',
  '<div><div class="resumen-label">En espera</div><div class="resumen-value" id="res-en-espera">-</div></div>'
);
html = html.replace(
  '<div><div class="resumen-label">Urgencias</div><div class="resumen-value">1</div></div>',
  '<div><div class="resumen-label">Urgencias</div><div class="resumen-value" id="res-urgencias">-</div></div>'
);

const regexCitasDia = /(<div class="vista activa" id="vista-dia" data-vista="dia">[\s\S]*?<div class="agenda-card")>/;
html = html.replace(regexCitasDia, '$1 id="lista-citas-dia">');

const startCitas = html.indexOf('<div class="agenda-card" id="lista-citas-dia">');
if (startCitas > -1) {
    const nextDiv = html.indexOf('</div>\n      </div>\n      <!-- fin vista-dia -->', startCitas);
    if (nextDiv > -1) {
        const before = html.substring(0, startCitas + '<div class="agenda-card" id="lista-citas-dia">'.length);
        const after = html.substring(nextDiv);
        html = before + '\n        <!-- Citas dinámicas inyectadas aquí -->\n      ' + after;
    }
}

html = html.replace('<div class="detalle-cita">', '<div class="detalle-cita" id="detalle-cita-panel">');
html = html.replace('<div class="av">RO</div>', '<div class="av" id="det-avatar">-</div>');
html = html.replace('<div class="nombre">Rocky</div>', '<div class="nombre" id="det-nombre">Selecciona una cita</div>');
html = html.replace('<div class="sub">Canino · Labrador · 4 años</div>', '<div class="sub" id="det-sub"></div>');

html = html.replace('<div class="info-item"><div class="l">Peso</div><div class="v">28.5 kg</div></div>', '<div class="info-item"><div class="l">Peso</div><div class="v" id="det-peso">-</div></div>');
html = html.replace('<div class="info-item"><div class="l">Edad</div><div class="v">4 años</div></div>', '<div class="info-item"><div class="l">Edad</div><div class="v" id="det-edad">-</div></div>');
html = html.replace('<div class="info-item"><div class="l">Propietario</div><div class="v">Jorge Pérez</div></div>', '<div class="info-item"><div class="l">Propietario</div><div class="v" id="det-propietario">-</div></div>');
html = html.replace('<div class="info-item"><div class="l">Teléfono</div><div class="v">55 9988 2211</div></div>', '<div class="info-item"><div class="l">Teléfono</div><div class="v" id="det-telefono">-</div></div>');

html = html.replace('<button class="btn-iniciar">', '<button class="btn-iniciar" id="btn-det-iniciar">');
html = html.replace('<button class="btn-llegada">', '<button class="btn-llegada" id="btn-det-llegada">');
html = html.replace('<button class="btn-no-asistio">', '<button class="btn-no-asistio" id="btn-det-no-asistio">');

const btnExp = '<button class="btn-secundario">\n              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\n              Abrir expediente\n            </button>';
const btnExpNew = '<button class="btn-secundario" id="btn-det-expediente">\n              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\n              Abrir expediente\n            </button>';
html = html.replace(btnExp, btnExpNew);

const modalHtml = `
<!-- MODAL NUEVA CITA -->
<div id="modal-nueva-cita" class="modal-superpuesto" style="display:none;">
  <div class="modal-contenido">
    <div class="modal-header">
      <h3>Agendar Nueva Cita</h3>
      <button class="btn-cerrar-modal" id="btn-cerrar-modal-cita">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="modal-body">
      <form id="form-nueva-cita">
        <div class="form-group">
          <label>Buscar Paciente / Propietario</label>
          <div style="position:relative;">
            <input type="text" id="input-buscar-paciente-cita" class="input-moderno-f" placeholder="Escribe nombre del paciente o tutor..." autocomplete="off">
            <div id="resultados-paciente-cita" class="dropdown-resultados-pred" style="display:none;"></div>
          </div>
          <input type="hidden" id="cita-paciente-id">
        </div>
        <div class="grid-2-col">
          <div class="form-group">
            <label>Fecha</label>
            <input type="date" id="cita-fecha" class="input-moderno-f" required>
          </div>
          <div class="form-group">
            <label>Hora</label>
            <input type="time" id="cita-hora" class="input-moderno-f" required>
          </div>
        </div>
        <div class="grid-2-col">
          <div class="form-group">
            <label>Duración (min)</label>
            <input type="number" id="cita-duracion" class="input-moderno-f" value="30" min="10" step="10" required>
          </div>
          <div class="form-group">
            <label>Tipo de Cita</label>
            <select id="cita-tipo" class="input-moderno-f" required>
              <option value="consulta">Consulta general</option>
              <option value="vacunacion">Vacunación</option>
              <option value="desparasitacion">Desparasitación</option>
              <option value="cirugia">Cirugía</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="urgencia">Urgencia</option>
              <option value="procedimiento">Procedimiento</option>
              <option value="grooming">Grooming</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Motivo</label>
          <input type="text" id="cita-motivo" class="input-moderno-f" placeholder="Ej. Revisión anual" required>
        </div>
        <div class="form-group">
          <label>Notas (Opcional)</label>
          <textarea id="cita-notas" class="input-moderno-f" rows="2" placeholder="Detalles adicionales..."></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secundario" id="btn-cancelar-modal-cita">Cancelar</button>
          <button type="submit" class="btn-cobalto">Guardar Cita</button>
        </div>
      </form>
    </div>
  </div>
</div>
`;

html = html.replace('</div>\n</div>\n\n<script>', modalHtml + '\n</div>\n</div>\n\n<script>');

const modalCss = `
  /* ===== Modal ===== */
  .modal-superpuesto {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(3, 47, 64, 0.4);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
  }
  .modal-contenido {
    background: var(--blanco-puro); border-radius: 16px;
    width: 100%; max-width: 500px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .modal-header {
    padding: 16px 20px; border-bottom: 1px solid var(--borde);
    display: flex; justify-content: space-between; align-items: center;
  }
  .modal-header h3 { font-size: 16px; font-weight: 700; margin: 0; color: var(--cobalto); }
  .btn-cerrar-modal {
    background: none; border: none; cursor: pointer; color: var(--texto-sec);
  }
  .btn-cerrar-modal svg { width: 20px; height: 20px; }
  .modal-body { padding: 20px; }
  .form-group { margin-bottom: 14px; }
  .form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--texto-fuerte); }
  .input-moderno-f {
    width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--borde);
    font-size: 13px; font-family: inherit; color: var(--texto-fuerte);
  }
  .input-moderno-f:focus { border-color: var(--naranja); outline: none; }
  .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--borde); }
  .btn-cobalto {
    background: var(--cobalto); color: var(--blanco-puro); border: none; border-radius: 8px;
    padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .btn-cobalto:hover { background: var(--cobalto-suave); }
</style>
`;
html = html.replace('</style>', modalCss);

fs.writeFileSync('c:/xampp/htdocs/PETPROTECT/MODULO_AGENDA.html', html, 'utf8');
console.log('HTML modificado exitosamente.');
