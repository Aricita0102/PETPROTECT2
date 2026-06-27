export function obtenerCSSPlantillaTicket() {
    return `
/* ============================================================
   PETPROTECT · TICKET DE VENTA / SERVICIO VETERINARIO
   ============================================================ */

:root{
  --cobalto: #032F40;
  --cobalto-suave: #0a4a63;
  --naranja: #F27405;
  --naranja-texto: #c65f04;
  --blanco: #FFFFFF;
  --papel: #FFFFFF;
  --tinta: #16242b;
  --tinta-muted: #6b7c84;
  --linea: #e1e6e8;
  --linea-fuerte: #032F40;
  --ok-bg: #fff4e9;

  --radio: 10px;
  --ancho-pantalla: 420px;
}

.ticket-pdf-wrapper *{ box-sizing:border-box; margin:0; padding:0; font-family:'Inter',-apple-system,sans-serif; color:var(--tinta); }
.ticket-pdf-wrapper{ background:#fff; display:flex; flex-direction:column; align-items:center; }

.ticket{ width:100%; max-width:var(--ancho-pantalla); background:var(--papel); overflow:hidden; position:relative; }

/* ---- franja superior de marca ---- */
.ticket-topbar{ height:5px; background:var(--naranja); }

/* ---- ENCABEZADO ---- */
.ticket-header{ padding:22px 24px 18px; text-align:center; position:relative; }

.doc-kicker{ display:inline-flex; align-items:center; gap:6px; background:none; border:1px solid var(--naranja); color:var(--naranja-texto); font-size:9.5px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; padding:4px 10px; border-radius:20px; margin-bottom:14px; }
.doc-kicker svg{ width:11px; height:11px; flex-shrink:0; }

.brand-logo-slot{ width:56px; height:56px; margin:0 auto 10px; border-radius:14px; background:var(--cobalto); display:flex; align-items:center; justify-content:center; overflow:hidden; }
.brand-logo-slot img{ width:100%; height:100%; object-fit:contain; }
.brand-logo-slot .logo-fallback{ color:#fff; font-family:'Playfair Display',serif; font-style:italic; font-weight:700; font-size:22px; }

.brand-name{ font-family:'Playfair Display',serif; font-style:italic; font-weight:700; font-size:30px; color:var(--cobalto); letter-spacing:-0.5px; line-height:1; }
.brand-name em{ color:var(--naranja); font-style:normal; }

.brand-sub{ font-size:9px; letter-spacing:4px; text-transform:uppercase; color:var(--tinta-muted); margin-top:4px; font-weight:600; }

.clinic-contact{ margin-top:14px; font-size:11px; color:var(--tinta-muted); line-height:1.85; }
.clinic-contact strong{ display:block; color:var(--cobalto); font-size:12px; font-weight:700; letter-spacing:0.2px; margin-bottom:2px; }
.contact-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:4px 14px; margin-top:8px; font-size:10.5px; color:var(--tinta-muted); }
.contact-grid span{ display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
.contact-grid svg{ width:11px; height:11px; flex-shrink:0; color:var(--naranja); }
.contact-grid b{ color:var(--cobalto); font-weight:600; }

/* ---- DIVISOR ---- */
.sep{ border:none; border-top:1px dashed var(--linea); margin:0 24px; }
.sep-solid{ border:none; border-top:1.5px solid var(--cobalto); margin:0 24px; }

/* ---- DATOS DEL TICKET ---- */
.meta-section{ padding:16px 24px; }
.meta-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px 16px; }
.meta-item{ display:flex; flex-direction:column; gap:2px; }
.meta-item.full{ grid-column:1 / -1; }
.meta-label{ font-size:8.5px; letter-spacing:1.5px; text-transform:uppercase; color:var(--tinta-muted); font-weight:700; display:flex; align-items:center; gap:4px; }
.meta-label svg{ width:10px; height:10px; color:var(--naranja); flex-shrink:0; }
.meta-value{ font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:600; color:var(--cobalto); }
.meta-value.folio{ font-size:13px; font-weight:700; letter-spacing:0.3px; }

/* ---- SECCIONES DE CONCEPTOS ---- */
.items-wrapper{ padding:18px 24px 4px; }

.category-block{ margin-bottom:18px; }
.category-block:last-child{ margin-bottom:0; }

.category-heading{ display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.category-icon{ width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.category-icon svg{ width:13px; height:13px; color:#fff; }
.category-icon.cat-servicios{ background:var(--naranja); }
.category-icon.cat-productos{ background:var(--cobalto); }
.category-icon.cat-estudios{ background:var(--cobalto-suave); }

.category-title{ font-size:10.5px; font-weight:800; letter-spacing:1.8px; text-transform:uppercase; color:var(--cobalto); }
.category-line{ flex:1; height:1px; background:var(--linea); }

.concept-cols{ display:grid; grid-template-columns:2.6fr 0.5fr 1fr 1.1fr; gap:4px; padding:0 2px 6px; font-size:7.5px; letter-spacing:1px; text-transform:uppercase; color:var(--tinta-muted); font-weight:700; }
.concept-cols span:nth-child(2){ text-align:center; }
.concept-cols span:nth-child(3){ text-align:right; }
.concept-cols span:nth-child(4){ text-align:right; }

.concept-row{ display:grid; grid-template-columns:2.6fr 0.5fr 1fr 1.1fr; gap:4px; padding:8px 2px; border-top:1px solid var(--linea); align-items:start; }
.concept-row:first-of-type{ border-top:none; }
.concept-desc{ font-size:12px; font-weight:600; color:var(--tinta); line-height:1.35; }
.concept-meta{ font-size:9.5px; color:var(--tinta-muted); margin-top:2px; }
.concept-qty{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--tinta-muted); text-align:center; padding-top:1px; }
.concept-unit{ font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--tinta-muted); text-align:right; padding-top:1px; }
.concept-amount{ font-family:'JetBrains Mono',monospace; font-size:12.5px; font-weight:700; color:var(--cobalto); text-align:right; padding-top:1px; white-space:nowrap; }

.tax-tag{ display:inline-block; font-size:7.5px; font-weight:700; letter-spacing:0.4px; color:var(--naranja-texto); background:#fff4e9; border-radius:3px; padding:1px 4px; margin-left:5px; vertical-align:middle; }

/* ---- RESUMEN FINANCIERO ---- */
.summary-section{ padding:16px 24px; }
.summary-row{ display:flex; justify-content:space-between; align-items:baseline; font-size:11.5px; padding:4px 0; color:var(--tinta-muted); }
.summary-row .v{ font-family:'JetBrains Mono',monospace; font-weight:600; color:var(--tinta); }
.summary-row.discount .v{ color:var(--naranja-texto); font-weight:700; }
.summary-row.tax .v{ color:var(--cobalto); }

.summary-divider{ border-top:1px dashed var(--linea); margin:8px 0; }

.total-bar{ margin:14px 0 0; background:var(--cobalto); border-radius:10px; padding:16px 18px; display:flex; justify-content:space-between; align-items:center; }
.total-label{ font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:rgba(255,255,255,0.65); font-weight:700; }
.total-amount{ font-family:'JetBrains Mono',monospace; font-size:24px; font-weight:700; color:#fff; letter-spacing:-0.5px; }
.total-amount span{ color:var(--naranja); font-size:14px; margin-right:2px; }
.total-currency{ font-size:10.5px; color:rgba(255,255,255,0.5); font-weight:500; margin-left:4px; }

/* ---- MÉTODO DE PAGO ---- */
.payment-section{ padding:16px 24px; }
.payment-method-badge{ display:inline-flex; align-items:center; gap:7px; background:var(--cobalto); color:#fff; font-size:11px; font-weight:700; padding:6px 12px; border-radius:20px; margin-bottom:10px; }
.payment-method-badge svg{ width:13px; height:13px; color:var(--naranja); }
.payment-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; }
.payment-item .meta-label{ margin-bottom:2px; }
.payment-item .meta-value{ font-size:13px; }
.payment-mixed-list{ display:flex; flex-direction:column; gap:5px; margin-top:4px; }
.payment-mixed-row{ display:flex; justify-content:space-between; font-size:11px; color:var(--tinta-muted); }
.payment-mixed-row .v{ font-family:'JetBrains Mono',monospace; font-weight:600; color:var(--cobalto); }

/* ---- LEALTAD ---- */
.loyalty-section{ padding:14px 24px; }
.loyalty-card{ background:#fff; border:1.5px solid var(--naranja); border-radius:10px; padding:13px 16px; display:flex; align-items:center; gap:12px; }
.loyalty-icon{ width:34px; height:34px; border-radius:50%; background:var(--naranja); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.loyalty-icon svg{ width:17px; height:17px; color:#fff; }
.loyalty-text{ flex:1; }
.loyalty-title{ font-size:10px; font-weight:700; color:var(--naranja-texto); letter-spacing:0.3px; }
.loyalty-detail{ font-size:10.5px; color:#8a5a1f; margin-top:2px; }
.loyalty-points{ text-align:right; }
.loyalty-points .big{ font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:700; color:var(--naranja-texto); line-height:1; }
.loyalty-points .small{ font-size:8.5px; text-transform:uppercase; letter-spacing:1px; color:#8a5a1f; margin-top:2px; }

/* ---- FIRMA / LEYENDAS LEGALES ---- */
.legal-section{ padding:14px 24px; text-align:center; }
.legal-text{ font-size:9px; color:var(--tinta-muted); line-height:1.7; }

/* ---- CÓDIGO DE BARRAS / FOLIO FINAL ---- */
.barcode-section{ padding:10px 24px 4px; text-align:center; }
.barcode-section svg{ width:100%; max-width:230px; height:34px; }
.barcode-caption{ font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:2px; color:var(--tinta-muted); margin-top:4px; }

/* ---- AGRADECIMIENTO ---- */
.thanks-section{ text-align:center; padding:8px 24px 20px; }
.thanks-text{ font-family:'Playfair Display',serif; font-style:italic; font-size:22px; font-weight:700; color:var(--cobalto); }
.thanks-sub{ font-size:9.5px; color:var(--tinta-muted); margin-top:4px; letter-spacing:0.3px; }
.software-credit{ text-align:center; font-size:8px; letter-spacing:1.5px; text-transform:uppercase; color:var(--tinta-muted); opacity:0.55; padding:0 24px 14px; font-weight:600; }
.ticket-bottombar{ height:5px; background:var(--cobalto); }

@media print{
  @page{ size:80mm auto; margin:0; }
  .ticket-pdf-wrapper{ background:#fff !important; }
  .ticket-topbar, .ticket-bottombar{ height:2px; background:#000 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .total-bar, .loyalty-card{ background:#fff !important; border:1.5px solid #000 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .total-label{ color:#444 !important; }
  .total-amount, .total-amount span{ color:#000 !important; }
  .total-currency{ color:#666 !important; }
  .brand-logo-slot{ background:#000 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .doc-kicker{ background:#fff !important; border:1px solid #000; color:#000 !important; }
  .payment-method-badge{ background:#fff !important; border:1px solid #000; color:#000 !important; }
  .loyalty-icon{ background:#000 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .loyalty-title, .loyalty-detail, .loyalty-points .big, .loyalty-points .small{ color:#000 !important; }
  .category-icon{ background:#eee !important; }
  .category-icon svg{ color:#000 !important; }
  .tax-tag{ background:#fff !important; border:1px solid #000; color:#000 !important; }
  .software-credit{ color:#666 !important; opacity:1; }
  .concept-row, .category-block{ break-inside:avoid; page-break-inside:avoid; }
  .category-heading{ break-after:avoid; page-break-after:avoid; }
  * { color-adjust:exact; }
}
`;
}

function fmtMoney(n){
  const fixed = (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
  const [entero, decimales] = fixed.split(".");
  const negativo = entero.startsWith("-");
  const enteroAbs = negativo ? entero.slice(1) : entero;
  const conComas = enteroAbs.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (negativo ? "-" : "") + conComas + "." + decimales;
}

function escapeHtml(str){
  if (str === null || str === undefined) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

function calcularResumen(data){
  let subtotalIVA0 = 0;
  let subtotalIVA16 = 0;
  data.categorias.forEach(cat => {
    cat.items.forEach(item => {
      const importe = round2(item.cantidad * item.precioUnitario);
      if (item.tasaIVA === 16){ subtotalIVA16 = round2(subtotalIVA16 + importe); } 
      else { subtotalIVA0 = round2(subtotalIVA0 + importe); }
    });
  });
  const descuento = round2(data.descuento || 0);
  const baseGravable = round2(Math.max(subtotalIVA16 - descuento, 0));
  const iva = round2(baseGravable * 0.16);
  const total = round2(subtotalIVA0 + baseGravable + iva);
  return { subtotalIVA0, subtotalIVA16, descuento, iva, total };
}

const ICONS = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A8.8 8.8 0 0 0 12.05 4a8.78 8.78 0 0 0-8.78 8.78c0 1.6.43 3.1 1.18 4.4L4 22l4.93-1.4a8.74 8.74 0 0 0 4.12 1.03h.01A8.78 8.78 0 0 0 21.8 12.78a8.8 8.8 0 0 0-4.2-6.46zM12.06 19.9a7.18 7.18 0 0 1-3.66-1l-.26-.15-2.91.78.78-2.84-.17-.27a7.2 7.2 0 0 1-1.13-3.86 7.22 7.22 0 0 1 7.22-7.22 7.2 7.2 0 0 1 7.21 7.24 7.22 7.22 0 0 1-7.21 7.32zm3.95-5.42c-.21-.11-1.27-.63-1.47-.7-.2-.07-.34-.11-.49.11-.14.21-.56.7-.69.84-.13.14-.25.16-.47.05-1.27-.63-2.1-1.13-2.94-2.56-.22-.38.22-.35.63-1.17.07-.14.04-.27-.02-.38-.07-.11-.6-1.45-.82-1.98-.22-.52-.45-.62-.46-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.72.34-.25.27-.96.94-.96 2.29 0 1.35.98 2.65 1.12 2.83.14.18 1.93 2.95 4.68 4.02 2.32.9 2.32.6 3.04.52.71-.07 1.27-.5 1.45-.78.18-.27.18-.5.13-.55-.05-.05-.18-.11-.39-.22z"></path></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
  hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
  drawer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"></rect><line x1="2" y1="11" x2="22" y2="11"></line><line x1="9" y1="16" x2="15" y2="16"></line></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18"></path><path d="M2 22h20"></path><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"></path></svg>',
  paw: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6.5" cy="9.5" r="2.5"></circle><circle cx="17.5" cy="9.5" r="2.5"></circle><circle cx="9" cy="5" r="2"></circle><circle cx="15" cy="5" r="2"></circle><path d="M12 11c-3 0-6.5 2.3-6.5 5.5C5.5 19 7.7 20 9.7 20c1.1 0 1.6-.6 2.3-.6s1.2.6 2.3.6c2 0 4.2-1 4.2-3.5C18.5 13.3 15 11 12 11z"></path></svg>',
  stethoscope: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2c-.13 0-.2.13-.2.3z"></path><path d="M8 2v3a4 4 0 0 0 8 0V2"></path><path d="M12 9v7a5 5 0 0 0 10 0v-3"></path><circle cx="20" cy="10" r="2"></circle></svg>',
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="7" y1="12" x2="17" y2="12"></line></svg>',
  cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="3"></circle><line x1="6" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
  transfer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
  mixed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="14" height="10" rx="2"></rect><path d="M22 9v6a2 2 0 0 1-2 2H8"></path><circle cx="9" cy="10" r="2"></circle></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
};

const PAYMENT_ICON = { efectivo:"cash", tarjeta:"card", transferencia:"transfer", mixto:"mixed" };
const PAYMENT_LABEL = { efectivo:"Pago en efectivo", tarjeta:"Pago con tarjeta", transferencia:"Pago por transferencia", mixto:"Pago mixto" };

function renderLogo(clinica){
  if (clinica.logoUrl){ return `<div class="brand-logo-slot"><img src="${escapeHtml(clinica.logoUrl)}" alt="${escapeHtml(clinica.nombreComercial)}"></div>`; }
  return `<div class="brand-logo-slot"><span class="logo-fallback">${escapeHtml(clinica.logoIniciales || "PP")}</span></div>`;
}

function renderHeader(data){
  const c = data.clinica;
  return `
    <div class="ticket-header">
      <div class="doc-kicker">${ICONS.shield}Comprobante de servicio</div>
      ${renderLogo(c)}
      <div class="brand-name">${escapeHtml(c.nombreComercial)}</div>
      <div class="brand-sub">Clínica Veterinaria</div>
      <div class="clinic-contact"><strong>${escapeHtml(c.nombreLegal)}</strong>${escapeHtml(c.direccion)}</div>
      <div class="contact-grid">
        ${c.telefono ? `<span>${ICONS.phone}${escapeHtml(c.telefono)}</span>` : ""}
        ${c.whatsapp ? `<span>${ICONS.whatsapp}${escapeHtml(c.whatsapp)}</span>` : ""}
        ${c.correo ? `<span>${ICONS.mail}${escapeHtml(c.correo)}</span>` : ""}
        ${c.sitioWeb ? `<span>${ICONS.globe}${escapeHtml(c.sitioWeb)}</span>` : ""}
        ${c.rfc ? `<span>${ICONS.hash}RFC <b>${escapeHtml(c.rfc)}</b></span>` : ""}
      </div>
    </div>`;
}

function renderMeta(data){
  const t = data.ticket;
  
  // Agregar condicionalmente la sección de paciente y cliente si existen
  let pacienteClienteHtml = "";
  if ((data.cliente && data.cliente.nombre) || (data.paciente && data.paciente.nombre && data.paciente.nombre !== 'Sin Identificar')) {
    pacienteClienteHtml = `
      <div style="border-top:1px dashed var(--linea); margin-top:14px; padding-top:14px; width:100%;">
        <div class="meta-grid" style="margin-top:0;">
          <div class="meta-item full">
            <span class="meta-label">${ICONS.user}Cliente / Tutor</span>
            <span class="meta-value" style="color:var(--tinta);">${escapeHtml(data.cliente?.nombre || 'Público General')}</span>
          </div>
          ${data.paciente && data.paciente.nombre && data.paciente.nombre !== 'Sin Identificar' ? `
          <div class="meta-item full">
            <span class="meta-label">${ICONS.paw}Paciente</span>
            <span class="meta-value">${escapeHtml(data.paciente.nombre)} <span style="font-size:10px; color:var(--tinta-muted); font-weight:normal;">(${escapeHtml(data.paciente.especie)})</span></span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="meta-section">
      <div class="meta-grid">
        <div class="meta-item full"><span class="meta-label">${ICONS.hash}Folio</span><span class="meta-value folio">${escapeHtml(t.folio)}</span></div>
        <div class="meta-item"><span class="meta-label">${ICONS.calendar}Fecha</span><span class="meta-value">${escapeHtml(t.fecha)}</span></div>
        <div class="meta-item"><span class="meta-label">${ICONS.clock}Hora</span><span class="meta-value">${escapeHtml(t.hora)}</span></div>
        <div class="meta-item"><span class="meta-label">${ICONS.user}Cajero</span><span class="meta-value">${escapeHtml(t.cajero)}</span></div>
        <div class="meta-item"><span class="meta-label">${ICONS.drawer}Caja</span><span class="meta-value">${escapeHtml(t.caja)}</span></div>
        <div class="meta-item full"><span class="meta-label">${ICONS.building}Sucursal</span><span class="meta-value">${escapeHtml(t.sucursal)}</span></div>
      </div>
      ${pacienteClienteHtml}
    </div>`;
}

function renderConceptRow(item){
  const importe = round2(item.cantidad * item.precioUnitario);
  const ivaTag = item.tasaIVA === 16 ? `<span class="tax-tag">IVA 16%</span>` : `<span class="tax-tag">IVA 0%</span>`;
  return `
    <div class="concept-row">
      <div>
        <div class="concept-desc">${escapeHtml(item.descripcion)}${ivaTag}</div>
        ${item.nota ? `<div class="concept-meta">${escapeHtml(item.nota)}</div>` : ""}
      </div>
      <div class="concept-qty">${item.cantidad}</div>
      <div class="concept-unit">$${fmtMoney(item.precioUnitario)}</div>
      <div class="concept-amount">$${fmtMoney(importe)}</div>
    </div>`;
}

function renderCategoryBlock(cat){
  const iconKey = cat.icono || "package";
  const itemsHtml = cat.items.map(renderConceptRow).join("");
  return `
    <div class="category-block">
      <div class="category-heading">
        <div class="category-icon cat-${cat.id}">${ICONS[iconKey] || ICONS.package}</div>
        <div class="category-title">${escapeHtml(cat.titulo)}</div>
        <div class="category-line"></div>
      </div>
      <div class="concept-cols"><span>Descripción</span><span>Cant.</span><span>P. Unit.</span><span>Importe</span></div>
      ${itemsHtml}
    </div>`;
}

function renderItems(data){
  if (!data.categorias || data.categorias.length === 0) return '';
  const blocks = data.categorias.filter(cat => cat.items && cat.items.length > 0).map(renderCategoryBlock).join("");
  return `<div class="items-wrapper">${blocks}</div>`;
}

function renderSummary(data, resumen){
  return `
    <div class="summary-section">
      <div class="summary-row"><span>Subtotal IVA 0%</span><span class="v">$${fmtMoney(resumen.subtotalIVA0)}</span></div>
      <div class="summary-row"><span>Subtotal IVA 16%</span><span class="v">$${fmtMoney(resumen.subtotalIVA16)}</span></div>
      ${resumen.descuento > 0 ? `<div class="summary-row discount"><span>Descuento${data.descuentoMotivo ? " · " + escapeHtml(data.descuentoMotivo) : ""}</span><span class="v">−$${fmtMoney(resumen.descuento)}</span></div>` : ""}
      <div class="summary-divider"></div>
      <div class="summary-row tax"><span>IVA (16%)</span><span class="v">+$${fmtMoney(resumen.iva)}</span></div>
    </div>
    <div style="padding:0 24px;">
      <div class="total-bar">
        <span class="total-label">Total a pagar</span>
        <span class="total-amount"><span>$</span>${fmtMoney(resumen.total)}<span class="total-currency">MXN</span></span>
      </div>
    </div>`;
}

function renderPayment(data){
  const pago = data.pago;
  if (!pago) return '';
  const iconKey = PAYMENT_ICON[pago.metodo] || "cash";
  const label = PAYMENT_LABEL[pago.metodo] || "Pago";
  let detalleHtml = "";
  if (pago.metodo === "efectivo"){
    detalleHtml = `<div class="payment-grid"><div class="payment-item"><div class="meta-label">Monto recibido</div><div class="meta-value">$${fmtMoney(pago.efectivoRecibido || 0)}</div></div><div class="payment-item"><div class="meta-label">Cambio</div><div class="meta-value" style="color:var(--naranja-texto);">$${fmtMoney(pago.cambio || 0)}</div></div></div>`;
  } else if (pago.metodo === "mixto" && pago.mixto){
    detalleHtml = `<div class="payment-mixed-list">${pago.mixto.map(p => `<div class="payment-mixed-row"><span>${escapeHtml(p.medio)}${p.referencia ? " · " + escapeHtml(p.referencia) : ""}</span><span class="v">$${fmtMoney(p.monto)}</span></div>`).join("")}</div>`;
  } else {
    detalleHtml = `<div class="payment-grid"><div class="payment-item"><div class="meta-label">Referencia</div><div class="meta-value">${escapeHtml(pago.referencia || "—")}</div></div></div>`;
  }
  return `<div class="payment-section"><div class="payment-method-badge">${ICONS[iconKey]}${label}</div>${detalleHtml}</div>`;
}

function renderLoyalty(data){
  const l = data.lealtad;
  if (!l || !l.participa) return "";
  return `
    <div class="loyalty-section">
      <div class="loyalty-card">
        <div class="loyalty-icon">${ICONS.star}</div>
        <div class="loyalty-text">
          <div class="loyalty-title">Programa de lealtad PetProtect</div>
          <div class="loyalty-detail">+${l.puntosObtenidos} puntos obtenidos en esta visita</div>
        </div>
        <div class="loyalty-points">
          <div class="big">${l.puntosAcumulados.toLocaleString("es-MX")}</div>
          <div class="small">Pts. acumulados</div>
        </div>
      </div>
    </div>`;
}

function renderLegal(data){ 
  return `<div class="legal-section"><div class="legal-text">Este comprobante ampara los servicios y/o productos veterinarios descritos.<br>Conserve este documento para cualquier aclaración o garantía.</div></div>`; 
}

function renderBarcode(data){
  const folio = data.ticket.folio;
  let bars = ""; let x = 0;
  for (let i = 0; i < folio.length; i++){
    const code = folio.charCodeAt(i);
    const width = (code % 4) + 1;
    if (code % 2 === 0){ bars += `<rect x="${x}" y="0" width="${width}" height="34" fill="#032F40"/>`; }
    x += width + 2;
  }
  return `<div class="barcode-section"><svg viewBox="0 0 ${x} 34" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${bars}</svg><div class="barcode-caption">${escapeHtml(folio)}</div></div>`;
}

export function obtenerDOMInnerTicket(data) {
  const resumen = calcularResumen(data);
  return `
    <div class="ticket-pdf-wrapper">
      <div class="ticket">
        <div class="ticket-topbar"></div>
        ${renderHeader(data)}
        <hr class="sep">
        ${renderMeta(data)}
        <hr class="sep">
        ${renderItems(data)}
        <hr class="sep-solid">
        ${renderSummary(data, resumen)}
        <hr class="sep">
        ${renderPayment(data)}
        ${renderLoyalty(data)}
        <hr class="sep">
        ${renderLegal(data)}
        ${renderBarcode(data)}
        <div class="thanks-section">
          <div class="thanks-text">¡Gracias por su confianza!</div>
          <div class="thanks-sub">${escapeHtml(data.clinica.nombreComercial)}</div>
        </div>
        <div class="software-credit">PetProtect v1</div>
        <div class="ticket-bottombar"></div>
      </div>
    </div>
  `;
}

export function obtenerPlantillaTicket(TICKET_DATA_JSON) {
  const data = JSON.parse(TICKET_DATA_JSON);
  const htmlContent = obtenerDOMInnerTicket(data);
  const cssContent = obtenerCSSPlantillaTicket();
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ticket</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${cssContent}
</style>
</head>
<body>
${htmlContent}
<script>
  window.onload = () => {
    window.print();
    // setTimeout(() => window.close(), 500); // Opcional, cerrar despues de imprimir
  };
</script>
</body>
</html>`;
}
