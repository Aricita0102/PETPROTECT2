export function obtenerPlantillaReporte(datosJSON) {
    const data = JSON.parse(datosJSON);
    
    const fmtMoney = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

    const ingresos = data.resumen.ingresosBrutos || 0;
    const fijos = data.resumen.costosFijos || 0;
    const variables = data.resumen.costosVariables || 0;
    const contribucion = ingresos > 0 ? (ingresos - variables) : 0;
    const margen = ingresos > 0 ? (contribucion / ingresos) : 0;
    const ptoEquilibrio = margen > 0 ? (fijos / margen) : 0;
    const utilidad = ingresos - fijos - variables;
    const margenNeto = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

    const hoy = new Date().toLocaleDateString('es-MX');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte Financiero - ${data.periodo.texto}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
    :root {
        --cobalto: #032F40;
        --cobalto-suave: #0a4a63;
        --naranja: #F27405;
        --cielo: #89C2D9;
        --verde: #166534;
        --verde-bg: #dcfce7;
        --rojo: #dc2626;
        --rojo-bg: #fee2e2;
        --gris: #f8fafc;
        --borde: #e2e8f0;
        --texto: #1e293b;
        --texto-mut: #64748b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; color: var(--texto); }
    body { background: #cbd5e1; display: flex; justify-content: center; padding: 20px; }
    
    .hoja-a4 {
        width: 210mm;
        min-height: 297mm;
        background: white;
        padding: 20mm;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        position: relative;
    }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--cobalto); padding-bottom: 20px; margin-bottom: 25px; }
    .header-left { display: flex; gap: 15px; align-items: center; }
    .logo-box { width: 65px; height: 65px; background: var(--cobalto); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-family: 'Playfair Display', serif; font-size: 28px; font-weight: bold; overflow: hidden; }
    .logo-box img { width: 100%; height: 100%; object-fit: contain; }
    .clinica-info h1 { font-family: 'Playfair Display', serif; font-size: 24px; color: var(--cobalto); margin-bottom: 4px; }
    .clinica-info p { font-size: 11px; color: var(--texto-mut); line-height: 1.4; }
    .report-meta { text-align: right; }
    .report-meta h2 { font-size: 20px; color: var(--naranja); margin-bottom: 5px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
    .report-meta p { font-size: 11px; color: var(--texto-mut); }

    /* SUMMARY CARDS */
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .card { background: var(--gris); border: 1px solid var(--borde); border-radius: 10px; padding: 15px; text-align: center; }
    .card.destacada { background: var(--cobalto); border-color: var(--cobalto); }
    .card.destacada * { color: white; }
    .card-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: var(--texto-mut); margin-bottom: 8px; }
    .card-val { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 800; color: var(--cobalto); }
    .card-val.verde { color: var(--verde); }
    .card-val.rojo { color: var(--rojo); }

    /* BREAKEVEN BOX */
    .breakeven-box { background: #fff8f1; border-left: 4px solid var(--naranja); padding: 20px; border-radius: 0 10px 10px 0; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    .be-info h3 { font-size: 14px; color: var(--naranja); margin-bottom: 6px; text-transform: uppercase; font-weight: 800; }
    .be-info p { font-size: 11px; color: var(--texto-mut); line-height: 1.5; max-width: 400px; }
    .be-value { text-align: right; }
    .be-value span { font-size: 10px; text-transform: uppercase; font-weight: bold; color: var(--texto-mut); display: block; margin-bottom: 4px; }
    .be-value strong { font-family: 'JetBrains Mono', monospace; font-size: 24px; color: var(--cobalto); font-weight: 800; }

    /* TABLES / SPLIT SECTION */
    .split-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .sec-title { font-size: 12px; font-weight: 800; color: var(--cobalto); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--borde); padding-bottom: 8px; margin-bottom: 15px; }
    
    .data-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .data-table th { text-align: left; padding: 8px 0; color: var(--texto-mut); font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 1px; border-bottom: 1px solid var(--borde); }
    .data-table td { padding: 10px 0; border-bottom: 1px dashed var(--borde); }
    .data-table td:last-child, .data-table th:last-child { text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    
    .bar-wrap { width: 100%; background: #e2e8f0; height: 6px; border-radius: 3px; margin-top: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--cielo); }
    .bar-fill.naranja { background: var(--naranja); }

    /* P&L STRUCTURE */
    .pnl-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
    .pnl-table tr.header-row { background: var(--gris); }
    .pnl-table th { text-align: left; padding: 10px 15px; font-weight: 700; text-transform: uppercase; font-size: 10px; color: var(--texto-mut); border-bottom: 2px solid var(--borde); }
    .pnl-table th:last-child { text-align: right; }
    .pnl-table td { padding: 10px 15px; border-bottom: 1px solid var(--borde); }
    .pnl-table td:last-child { text-align: right; font-family: 'JetBrains Mono', monospace; }
    .pnl-table tr.total-row td { font-weight: 800; color: var(--cobalto); font-size: 14px; background: rgba(3, 47, 64, 0.03); }
    .pnl-table tr.indent td:first-child { padding-left: 30px; color: var(--texto-mut); }

    /* FOOTER */
    .footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; border-top: 1px solid var(--borde); padding-top: 15px; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 9px; color: var(--texto-mut); text-transform: uppercase; letter-spacing: 1px; }
    
    @media print {
        body { background: white; padding: 0; }
        .hoja-a4 { box-shadow: none; padding: 15mm; width: 100%; min-height: auto; }
        .footer { position: fixed; bottom: 10mm; left: 15mm; right: 15mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
</style>
</head>
<body>

<div class="hoja-a4">
    <!-- HEADER -->
    <header class="header">
        <div class="header-left">
            <div class="logo-box">
                ${data.clinica.logoUrl ? `<img src="${data.clinica.logoUrl}" alt="Logo">` : data.clinica.logoIniciales}
            </div>
            <div class="clinica-info">
                <h1>${data.clinica.nombreComercial}</h1>
                <p>${data.clinica.direccion}<br>RFC: ${data.clinica.rfc || 'N/A'} | Tel: ${data.clinica.telefono || 'N/A'}</p>
            </div>
        </div>
        <div class="report-meta">
            <h2>ESTADO DE RESULTADOS</h2>
            <p><strong>Periodo:</strong> ${data.periodo.texto}</p>
            <p><strong>Emitido:</strong> ${hoy}</p>
        </div>
    </header>

    <!-- SUMMARY CARDS -->
    <div class="summary-grid">
        <div class="card">
            <div class="card-title">Ingresos Brutos</div>
            <div class="card-val">${fmtMoney(ingresos)}</div>
        </div>
        <div class="card">
            <div class="card-title">Costos (Fijos + Variables)</div>
            <div class="card-val rojo">-${fmtMoney(fijos + variables)}</div>
        </div>
        <div class="card">
            <div class="card-title">Margen Neto</div>
            <div class="card-val" style="color:var(--naranja);">${margenNeto.toFixed(1)}%</div>
        </div>
        <div class="card destacada">
            <div class="card-title" style="color:rgba(255,255,255,0.7);">Utilidad Neta</div>
            <div class="card-val" style="color:white;">${fmtMoney(utilidad)}</div>
        </div>
    </div>

    <!-- P&L TABLE -->
    <h3 class="sec-title">Balance Operativo (P&L)</h3>
    <table class="pnl-table">
        <tr class="header-row">
            <th>Concepto</th>
            <th>Monto</th>
        </tr>
        <tr>
            <td><strong>Ingresos Operativos Totales</strong></td>
            <td style="color:var(--verde);">${fmtMoney(ingresos)}</td>
        </tr>
        <tr>
            <td><strong>Costos Variables Totales</strong></td>
            <td style="color:var(--rojo);">-${fmtMoney(variables)}</td>
        </tr>
        <tr class="indent">
            <td>Inventario, Insumos, Honorarios Médicos Variables</td>
            <td></td>
        </tr>
        <tr class="total-row" style="background:#f8fafc; border-top:2px solid var(--borde);">
            <td style="font-size:12px;">Margen de Contribución</td>
            <td style="font-size:12px;">${fmtMoney(contribucion)}</td>
        </tr>
        <tr>
            <td><strong>Costos Fijos Totales</strong></td>
            <td style="color:var(--rojo);">-${fmtMoney(fijos)}</td>
        </tr>
        <tr class="indent">
            <td>Renta, Nómina, Servicios, Mantenimiento, Publicidad, Software</td>
            <td></td>
        </tr>
        <tr class="total-row">
            <td>Utilidad Neta del Ejercicio</td>
            <td>${fmtMoney(utilidad)}</td>
        </tr>
    </table>

    <!-- BREAKEVEN -->
    <div class="breakeven-box">
        <div class="be-info">
            <h3>Punto de Equilibrio</h3>
            <p>Es la meta de facturación (ingresos) que tu clínica debe alcanzar en el mes para cubrir todos los costos fijos y variables sin reportar pérdidas.</p>
        </div>
        <div class="be-value">
            <span>Meta de Facturación</span>
            <strong>${ptoEquilibrio > 0 && ptoEquilibrio < 99999999 ? fmtMoney(ptoEquilibrio) : 'N/A'}</strong>
        </div>
    </div>

    <!-- DESGLOSES -->
    <div class="split-section">
        <!-- Gastos -->
        <div>
            <h3 class="sec-title">Estructura de Gastos</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th>Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.desgloseEgresos.map(e => `
                    <tr>
                        <td>
                            ${e.categoria}
                            <div class="bar-wrap"><div class="bar-fill naranja" style="width: ${(e.monto / (fijos+variables)) * 100}%"></div></div>
                        </td>
                        <td>${fmtMoney(e.monto)}</td>
                    </tr>
                    `).join('')}
                    ${data.desgloseEgresos.length === 0 ? '<tr><td colspan="2" style="text-align:center;color:#94a3b8;">Sin egresos registrados</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        <!-- Ingresos -->
        <div>
            <h3 class="sec-title">Composición de Ingresos</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th>Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.desgloseIngresos.map(i => `
                    <tr>
                        <td>
                            ${i.categoria}
                            <div class="bar-wrap"><div class="bar-fill" style="width: ${(i.monto / ingresos) * 100}%"></div></div>
                        </td>
                        <td>${fmtMoney(i.monto)}</td>
                    </tr>
                    `).join('')}
                    ${data.desgloseIngresos.length === 0 ? '<tr><td colspan="2" style="text-align:center;color:#94a3b8;">Sin ingresos registrados</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    </div>

    <!-- FOOTER -->
    <footer class="footer">
        <p>Generado automáticamente por PET PROTECT</p>
        <p>USO INTERNO / CONFIDENCIAL</p>
    </footer>
</div>

<script>
    window.onload = () => {
        setTimeout(() => {
            window.print();
        }, 500);
    };
</script>
</body>
</html>`;
}
