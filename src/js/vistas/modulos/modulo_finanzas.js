/**
 * Módulo de Finanzas - PET PROTECT
 * Lógica MVC para inicializar gráficas y comportamiento con datos reales.
 */

import '../../../css/modulo_finanzas.css';
import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import * as XLSX from 'xlsx';
import regression from 'regression';
import { obtenerPlantillaReporte } from './reporte_financiero_template.js';

let organizacionIdActual = null;
let sucursalIdActual = null;
let usuarioIdActual = null;
let instanciasGraficas = {};
let suscripcionFinanzas = null;

async function recargarFinanzasSilencioso() {
    if (!organizacionIdActual) return;
    try {
        const datos = await ModeloFinanzas.obtenerDatos(organizacionIdActual);
        const procesado = ControladorFinanzas.procesarDatos(datos);
        VistaFinanzas.renderizar(procesado);
    } catch (e) {
        console.warn("Fallo recarga silenciosa de finanzas", e);
    }
}

export async function inicializarFinanzas() {
    console.log("[MÓDULO FINANZAS] Inicializando...");

    const contenedor = document.querySelector('.layout-finanzas-con-barra');
    let loader = document.getElementById('loader-finanzas');
    
    // Crear el loader Lottie si no existe
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loader-finanzas';
        loader.style = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: var(--bg); z-index: 50;";
        loader.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
                <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
                <lottie-player src="/json/lottiecarga.json" background="transparent" speed="1" style="width: 450px; height: 450px; margin: 0 auto;" loop autoplay></lottie-player>
                <p style="margin-top: -30px; font-weight: 600; color: var(--cobalto); font-size: 1.2rem; text-align: center; width: 100%;">Ratoncitos trabajando...</p>
            </div>
        `;
        if (contenedor) contenedor.parentElement.style.position = 'relative';
        if (contenedor) contenedor.parentElement.appendChild(loader);
    }

    if (contenedor) {
        contenedor.style.opacity = '0';
        contenedor.style.transition = 'opacity 0.4s ease';
    }

    // Inicializar historial visual inmediatamente, sin depender de los datos.
    VistaFinanzas.inicializarHistorialReportes();

    try {
        const sesion = await obtenerSesionActiva();
        if (!sesion || !sesion.perfil || !sesion.perfil.organizacion_id) {
            console.error("No hay sesión u organización activa.");
            return;
        }

        organizacionIdActual = sesion.perfil.organizacion_id;
        sucursalIdActual = sesion.perfil.sucursal_id;
        usuarioIdActual = sesion.perfil.id;

        const datos = await ModeloFinanzas.obtenerDatos(organizacionIdActual);
        const procesado = ControladorFinanzas.procesarDatos(datos);
        VistaFinanzas.renderizar(procesado);

        // Ocultar Lottie y mostrar contenido suavemente
        setTimeout(() => {
            if (loader) loader.style.display = 'none';
            if (contenedor) contenedor.style.opacity = '1';
        }, 800); // Pequeño delay para apreciar la animación

        if (!suscripcionFinanzas && organizacionIdActual) {
            suscripcionFinanzas = conexionSupabase.channel('finanzas-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'caja_transacciones', filter: `organizacion_id=eq.${organizacionIdActual}` }, recargarFinanzasSilencioso)
                .subscribe();
        }

    } catch (error) {
        console.error("Error al inicializar finanzas:", error);
        if (loader) loader.style.display = 'none';
        if (contenedor) contenedor.style.opacity = '1';
    }
}

// ==========================================
// MODELO: Interacción con Supabase
// ==========================================
const ModeloFinanzas = {
    async obtenerDatos(orgId) {
        const ahora = new Date();
        const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
        const finMesActual = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString();
        const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString();
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0).toISOString();

        const [transaccionesMesActual, transaccionesMesAnterior, clientes, items, servicios, productos, sucursalBase] = await Promise.all([
            conexionSupabase.from('caja_transacciones')
                .select('*')
                .eq('organizacion_id', orgId)
                .gte('created_at', inicioMesActual)
                .lte('created_at', finMesActual)
                .neq('estatus', 'cancelada'),
                
            conexionSupabase.from('caja_transacciones')
                .select('id, tipo, total, estatus')
                .eq('organizacion_id', orgId)
                .gte('created_at', inicioMesAnterior)
                .lte('created_at', finMesAnterior)
                .neq('estatus', 'cancelada'),

            conexionSupabase.from('clientes')
                .select('id, nombre_completo')
                .eq('organizacion_id', orgId),
                
            conexionSupabase.from('caja_transacciones_items')
                .select('id, transaccion_id, referencia_tipo, referencia_id, nombre_item, subtotal, cantidad')
                .gte('created_at', inicioMesActual)
                .lte('created_at', finMesActual),

            conexionSupabase.from('catalogo_servicios')
                .select('id, categoria')
                .eq('organizacion_id', orgId),

            conexionSupabase.from('inventario_productos')
                .select('id, categoria')
                .eq('organizacion_id', orgId),

            conexionSupabase.from('sucursales')
                .select('*')
                .eq('id', sucursalIdActual)
                .single()
        ]);

        let organizacionData = null;
        if (sucursalBase.data) {
            const org = await conexionSupabase.from('organizaciones').select('*').eq('id', sucursalBase.data.organizacion_id).single();
            organizacionData = org.data;
        }

        const payloadFinanzas = {
            txMesActual: transaccionesMesActual.data || [],
            txMesAnterior: transaccionesMesAnterior.data || [],
            clientes: clientes.data || [],
            items: items.data || [],
            servicios: servicios.data || [],
            productos: productos.data || [],
            inicioHoy: inicioHoy,
            clinicaInfo: {
                sucursal: sucursalBase.data,
                organizacion: organizacionData
            }
        };

        window._cacheReporteFinanzas = payloadFinanzas;
        return payloadFinanzas;
    }
};

// ==========================================
// CONTROLADOR: Lógica de Negocio y KPIs
// ==========================================
const ControladorFinanzas = {
    procesarDatos(datos) {
        const { txMesActual, txMesAnterior, clientes, items, servicios, productos, inicioHoy } = datos;

        let ingresosMesActual = 0, gastosMesActual = 0, ingresosHoy = 0;
        let ctasPorCobrar = 0, countCtasPorCobrar = 0, countIngresos = 0;
        const clientesGasto = {};
        const horasAfluencia = Array(24).fill(0);

        txMesActual.forEach(tx => {
            if (tx.tipo === 'ingreso') {
                if (tx.estatus === 'completada') {
                    ingresosMesActual += tx.total;
                    countIngresos++;
                    if (tx.created_at >= inicioHoy) ingresosHoy += tx.total;
                } else if (tx.estatus === 'pendiente') {
                    ctasPorCobrar += tx.total;
                    countCtasPorCobrar++;
                }
            } else if (tx.tipo === 'egreso' && tx.estatus === 'completada') {
                gastosMesActual += tx.total;
            }
        });

        let ingresosMesAnterior = 0, gastosMesAnterior = 0;
        txMesAnterior.forEach(tx => {
            if (tx.tipo === 'ingreso' && tx.estatus === 'completada') ingresosMesAnterior += tx.total;
            if (tx.tipo === 'egreso' && tx.estatus === 'completada') gastosMesAnterior += tx.total;
        });

        const utilidadNeta = ingresosMesActual - gastosMesActual;
        const utilidadAnterior = ingresosMesAnterior - gastosMesAnterior;
        const ticketPromedio = countIngresos > 0 ? ingresosMesActual / countIngresos : 0;

        const calcPct = (actual, anterior) => anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : (actual > 0 ? 100 : 0);
        const pctIngresos = calcPct(ingresosMesActual, ingresosMesAnterior);
        const pctGastos = calcPct(gastosMesActual, gastosMesAnterior);
        const pctUtilidad = calcPct(utilidadNeta, utilidadAnterior);

        const ingresosPorDia = Array(31).fill(0);
        const ingresosAnteriorPorDia = Array(31).fill(0);
        const metodosPago = { efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0 };
        const rankServicios = {}, rankProductos = {}, rankGastos = {};
        const mapaClientes = {};
        const mapaIdProductos = {};
        const ultimosGastos = [];
        
        clientes.forEach(c => mapaClientes[c.id] = c.nombre_completo);

        // Día pico calculation
        const diasSemana = Array(7).fill(0);

        txMesActual.forEach(tx => {
            const fechaTx = new Date(tx.created_at);
            const dia = fechaTx.getDate() - 1;
            
            if (tx.tipo === 'ingreso' && tx.estatus === 'completada') {
                ingresosPorDia[dia] += tx.total;
                diasSemana[fechaTx.getDay()] += 1;
                horasAfluencia[fechaTx.getHours()] += 1;
                
                if (metodosPago[tx.metodo_pago] !== undefined) {
                    metodosPago[tx.metodo_pago] += tx.total;
                }
                
                if (tx.cliente_id) {
                    clientesGasto[tx.cliente_id] = (clientesGasto[tx.cliente_id] || 0) + tx.total;
                }
            }
        });

        txMesAnterior.forEach(tx => {
            const dia = new Date(tx.created_at).getDate() - 1;
            if (tx.tipo === 'ingreso' && tx.estatus === 'completada') {
                ingresosAnteriorPorDia[dia] += tx.total;
            }
        });

        const mapaCatServicios = {};
        if (servicios) servicios.forEach(s => mapaCatServicios[s.id] = s.categoria || 'Servicios Varios');
        
        const mapaCatProductos = {};
        if (productos) productos.forEach(p => mapaCatProductos[p.id] = p.categoria || 'Tienda');

        const categoriasIngreso = {};

        items.forEach(item => {
            const tx = txMesActual.find(t => t.id === item.transaccion_id);
            if (!tx || tx.estatus !== 'completada') return;

            if (tx.tipo === 'ingreso') {
                let cat = 'Otros';
                if (item.referencia_tipo === 'consulta') {
                    cat = 'Consultas Médicas';
                } else if (item.referencia_tipo === 'servicio') {
                    cat = mapaCatServicios[item.referencia_id] || 'Servicios Varios';
                } else if (item.referencia_tipo === 'producto') {
                    let catDB = mapaCatProductos[item.referencia_id] || 'Farmacia';
                    cat = catDB.charAt(0).toUpperCase() + catDB.slice(1);
                }
                
                categoriasIngreso[cat] = (categoriasIngreso[cat] || 0) + item.subtotal;

                if (item.referencia_tipo === 'servicio' || item.referencia_tipo === 'consulta') {
                    rankServicios[item.nombre_item] = (rankServicios[item.nombre_item] || 0) + item.subtotal;
                } else if (item.referencia_tipo === 'producto') {
                    rankProductos[item.nombre_item] = (rankProductos[item.nombre_item] || 0) + item.subtotal;
                    mapaIdProductos[item.nombre_item] = item.referencia_id;
                }
            } else if (tx.tipo === 'egreso') {
                rankGastos[item.nombre_item || tx.notas || 'Gasto'] = (rankGastos[item.nombre_item] || 0) + item.subtotal;
                ultimosGastos.push({
                    id: tx.id,
                    nombre: item.nombre_item || tx.notas || 'Gasto',
                    valor: item.subtotal,
                    fecha: tx.created_at
                });
            }
        });

        ultimosGastos.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

        const topServiciosFull = Object.entries(rankServicios).sort((a,b) => b[1]-a[1]);
        const topProductosFull = Object.entries(rankProductos).sort((a,b) => b[1]-a[1]);

        const topServicios = topServiciosFull.slice(0,5);
        const topProductos = topProductosFull.slice(0,5);
        
        const peorServicio = topServiciosFull.length > 0 ? topServiciosFull[topServiciosFull.length - 1] : null;
        const peorProducto = topProductosFull.length > 0 ? topProductosFull[topProductosFull.length - 1] : null;

        const topGastos = Object.entries(rankGastos).sort((a,b) => b[1]-a[1]).slice(0,5);
        
        const topClientes = Object.entries(clientesGasto)
            .sort((a,b) => b[1]-a[1])
            .slice(0,5)
            .map(c => ({ nombre: mapaClientes[c[0]] || 'Cliente Casual', total: c[1] }));

        const maxDiaSemana = diasSemana.indexOf(Math.max(...diasSemana));
        const nombresDias = ['domingos','lunes','martes','miércoles','jueves','viernes','sábados'];
        
        const maxAfluencia = Math.max(...horasAfluencia);
        let horaPicoFormato = 'N/A';
        if (maxAfluencia > 0) {
            const maxHora = horasAfluencia.indexOf(maxAfluencia);
            if (maxHora === 0) horaPicoFormato = '12 AM';
            else if (maxHora === 12) horaPicoFormato = '12 PM';
            else horaPicoFormato = maxHora > 12 ? `${maxHora-12} PM` : `${maxHora} AM`;
        }

        const margenUtilidad = ingresosMesActual > 0 ? Math.round((utilidadNeta / ingresosMesActual) * 100) : 0;
        
        // REGRESIÓN: Calcular la predicción lineal de ingresos para el mes
        const diaActual = new Date().getDate();
        const datosParaRegresion = [];
        for (let i = 0; i < diaActual; i++) {
            // Pasamos día e ingreso. Nota: si un día es 0 afecta la regresión, pero es comportamiento real
            datosParaRegresion.push([i, ingresosPorDia[i]]);
        }
        
        let prediccionPorDia = Array(31).fill(0);
        if (datosParaRegresion.length > 1) {
            const result = regression.linear(datosParaRegresion);
            for (let i = 0; i < 31; i++) {
                let y = result.predict(i)[1];
                prediccionPorDia[i] = y > 0 ? y : 0; // No predecir ingresos negativos
            }
        }
        
        return {
            kpis: {
                ingresosHoy, ingresosMesActual, gastosMesActual, utilidadNeta, ticketPromedio, ctasPorCobrar,
                pctIngresos, pctGastos, pctUtilidad, countCtasPorCobrar
            },
            tendencias: { ingresosPorDia, ingresosAnteriorPorDia, prediccionPorDia },
            categorias: categoriasIngreso,
            metodosPago,
            rankings: { topServicios, topProductos, topGastos, topClientes, ultimosGastos },
            movimientos: txMesActual.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10).map(tx => ({
                ...tx,
                detalles: items.filter(i => i.transaccion_id === tx.id)
            })),
            mapaClientes,
            analisis: { 
                topServicios, topProductos, peorServicio, peorProducto, topClientes, ticketPromedio,
                diaPico: nombresDias[maxDiaSemana], pctUtilidad, margenUtilidad, horaPicoFormato,
                mapaIdProductos
            }
        };
    }
};

// ==========================================
// VISTA: Actualización del DOM y Chart.js
// ==========================================
const VistaFinanzas = {
    renderizar(procesado) {
        this.inicializarHistorialReportes();
        this.renderizarResumen(procesado);
        this.renderizarGraficaPrincipal(procesado);
        this.renderizarDona(procesado);
        this.renderizarUltimosMovimientos(procesado);
        this.actualizarAnalisis(procesado.analisis);
    },

    inicializarHistorialReportes() {
        setTimeout(() => {
            const contenedor = document.getElementById('lista-meses-historial');
            if (!contenedor) {
                console.warn("No se encontró lista-meses-historial en el DOM");
                return;
            }
            contenedor.innerHTML = '';
            
            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const fechaActual = new Date();
            let mesActual = fechaActual.getMonth();
            let anioActual = fechaActual.getFullYear();
            
            // Generar ultimos 12 meses
            for (let i = 0; i < 12; i++) {
                const m = mesActual;
                const a = anioActual;
                const btn = document.createElement('button');
                btn.style.cssText = "width:100%; text-align:left; padding:10px 15px; border:none; background:transparent; font-size:12px; font-weight:600; color:#032F40; cursor:pointer; border-bottom:1px solid #E4EAF2; transition:background 0.2s;";
                btn.onmouseover = () => btn.style.background = '#F4F7FE';
                btn.onmouseout = () => btn.style.background = 'transparent';
                btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle; margin-right:6px; color:#64748B;">calendar_month</span> ${meses[m]} ${a}`;
                
                btn.onclick = () => {
                    const drop = document.getElementById('dropdown-historial-reportes');
                    if (drop) drop.style.display = 'none';
                    if (window.generarReporteHistorico) window.generarReporteHistorico(m, a, meses[m]);
                };
                
                contenedor.appendChild(btn);

                mesActual--;
                if (mesActual < 0) {
                    mesActual = 11;
                    anioActual--;
                }
            }
        }, 100);
    },

    renderizarResumen(procesado) {
        this.actualizarKPIs(procesado.kpis);
        this.renderizarMovimientos(procesado.movimientos, procesado.mapaClientes);
        this.renderizarRankingGeneral(procesado.rankings.topServicios, '#lista-top-servicios');
        this.renderizarRankingGeneral(procesado.rankings.topProductos, '#lista-top-productos');
        this.renderizarListaGastos(procesado.rankings.ultimosGastos);
        
        this.renderizarRankingClientes(procesado.rankings.topClientes);
        
        const docIngresos = document.getElementById('estado-res-ingresos');
        const docGastos = document.getElementById('estado-res-gastos');
        const docUtilidad = document.getElementById('estado-res-utilidad');
        const docTotalGastosHeader = document.getElementById('total-gastos-header');

        if (docIngresos) docIngresos.textContent = `+ ${this.formatM(procesado.kpis.ingresosMesActual)}`;
        if (docGastos) docGastos.textContent = `- ${this.formatM(procesado.kpis.gastosMesActual)}`;
        if (docUtilidad) docUtilidad.textContent = this.formatM(procesado.kpis.utilidadNeta);
        if (docTotalGastosHeader) docTotalGastosHeader.textContent = `${this.formatM(procesado.kpis.gastosMesActual)} total`;

        this.actualizarAnalisis(procesado.analisis);
        
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
            script.onload = () => this.inicializarGraficas(procesado);
            document.head.appendChild(script);
        } else {
            this.inicializarGraficas(procesado);
        }
    },

    formatM(valor) {
        return '$' + parseFloat(valor).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    },

    formatPct(valor) {
        const sign = valor >= 0 ? '+' : '';
        return `${sign}${valor}%`;
    },

    inyectarEnKpi(labelName, htmlValor, htmlSub) {
        const labels = document.querySelectorAll('.resumen-label');
        labels.forEach(l => {
            if (l.textContent.trim() === labelName) {
                const valDiv = l.nextElementSibling;
                if (valDiv && valDiv.classList.contains('kpi-value')) valDiv.innerHTML = htmlValor;
                
                const subDiv = valDiv.nextElementSibling;
                if (subDiv && subDiv.classList.contains('kpi-change') && htmlSub !== undefined) {
                    subDiv.innerHTML = htmlSub;
                    subDiv.className = 'kpi-change ' + (htmlSub.includes('-') ? 'kpi-down' : (htmlSub.includes('+') && htmlSub !== '+0%' ? 'kpi-up' : 'kpi-neutral'));
                }
            }
        });
    },

    actualizarKPIs(kpis) {
        this.inyectarEnKpi('Ingresos del día', this.formatM(kpis.ingresosHoy));
        this.inyectarEnKpi('Ingresos del mes', this.formatM(kpis.ingresosMesActual), this.formatPct(kpis.pctIngresos));
        this.inyectarEnKpi('Gastos del mes', this.formatM(kpis.gastosMesActual), this.formatPct(kpis.pctGastos));
        this.inyectarEnKpi('Utilidad neta', this.formatM(kpis.utilidadNeta), this.formatPct(kpis.pctUtilidad));
        this.inyectarEnKpi('Ticket promedio', this.formatM(kpis.ticketPromedio));

        const metaDoc = document.querySelector('.valor-actual-meta');
        if (metaDoc) metaDoc.textContent = this.formatM(kpis.ingresosMesActual);
    },

    renderizarMovimientos(movimientos, mapaClientes) {
        const tbody = document.querySelector('.tabla-datos tbody');
        if (!tbody) return;
        
        let html = '';
        movimientos.forEach(tx => {
            const f = new Date(tx.created_at);
            const fechaStr = `${f.getDate().toString().padStart(2,'0')} ${f.toLocaleString('es',{month:'short'})}`;
            const horaStr = `${f.getHours().toString().padStart(2,'0')}:${f.getMinutes().toString().padStart(2,'0')}`;
            
            let claseEstado = tx.estatus === 'completada' ? 'estado-pagado' : 'estado-pendiente';
            let labelEstado = tx.estatus === 'completada' ? 'Pagado' : (tx.estatus === 'pendiente' ? 'Pendiente' : 'Cancelado');
            let metodoPagoDisplay = tx.metodo_pago || 'Mixto';
            
            let colorMonto = '';
            let prefijoMonto = '';

            let cliente = tx.cliente_id && mapaClientes[tx.cliente_id] ? mapaClientes[tx.cliente_id] : 'Venta de mostrador';
            if (tx.tipo === 'egreso') {
                cliente = 'Gasto operativo';
                colorMonto = 'color: var(--rojo);';
                prefijoMonto = '-';
                if (tx.estatus === 'completada') {
                    claseEstado = 'estado-vencido'; // Rojo para los gastos
                    labelEstado = 'Realizado';
                }
                metodoPagoDisplay = 'Salida';
            }

            let notasConcepto = tx.notas || 'Servicio/Producto';
            let pacienteNombre = '-';
            
            if (notasConcepto.includes('| Paciente: ')) {
                const partes = notasConcepto.split('| Paciente: ');
                notasConcepto = partes[0].trim();
                pacienteNombre = partes[1].trim();
            }
            
            html += `
            <tr style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''" data-tx-id="${tx.id}">
                <td><div class="subtexto-tabla">${fechaStr} &middot; ${horaStr}</div></td>
                <td><div class="nombre-tabla">${cliente}</div></td>
                <td><div class="subtexto-tabla" style="color:var(--cobalto); font-weight:600;">${pacienteNombre}</div></td>
                <td>${notasConcepto}</td>
                <td><span class="insignia-cielo">${metodoPagoDisplay}</span></td>
                <td class="valor-total-tabla" style="${colorMonto}">${prefijoMonto}${this.formatM(tx.total)}</td>
                <td><span class="pildora-estado ${claseEstado}">${labelEstado}</span></td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="7">No hay movimientos recientes.</td></tr>';

        tbody.querySelectorAll('tr[data-tx-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const txId = tr.getAttribute('data-tx-id');
                const tx = movimientos.find(m => m.id === txId);
                if (tx) window.mostrarDetalleMovimiento(tx, mapaClientes);
            });
        });
    },

    renderizarRankingClientes(topClientes) {
        const listaClientes = document.querySelector('.lista-clientes-top');
        if (!listaClientes) return;
        
        let html = '';
        const colores = ['fondo-cobalto', 'fondo-cielo-claro', 'fondo-naranja', 'fondo-verde', 'fondo-gris'];
        
        topClientes.forEach((c, index) => {
            const iniciales = c.nombre.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
            const bgClass = colores[index % colores.length];
            html += `
            <div class="item-cliente-top">
                <div class="avatar-cliente ${bgClass}">${iniciales}</div>
                <div class="info-cliente-top">
                    <div class="nombre-ranking">${c.nombre}</div>
                    <div class="subtexto-tabla">Cliente VIP</div>
                </div>
                <span class="valor-ranking">${this.formatM(c.total)}</span>
            </div>`;
        });
        listaClientes.innerHTML = html || '<div style="text-align: center; color: var(--texto-mut); padding: 20px; font-size: 12px;">Sin datos suficientes</div>';
    },

    renderizarRankingGeneral(datosArray, selectorId) {
        const contenedor = document.querySelector(selectorId);
        if (!contenedor) return;
        
        if (!datosArray || datosArray.length === 0) {
            contenedor.innerHTML = '<div style="text-align: center; color: var(--texto-mut); padding: 20px; font-size: 12px;">Sin datos suficientes</div>';
            return;
        }

        const maxMonto = Math.max(...datosArray.map(d => d[1]));
        const clasesColor = ['fondo-cobalto', 'fondo-cobalto', 'fondo-naranja', 'fondo-naranja', 'fondo-cielo-claro'];
        
        let html = '';
        datosArray.forEach((item, index) => {
            const nombre = item[0];
            const valor = item[1];
            const pct = maxMonto > 0 ? (valor / maxMonto) * 100 : 0;
            const colorClass = clasesColor[index] || 'fondo-gris';
            
            html += `
            <div class="item-ranking">
              <span class="numero-ranking cielo">${index + 1}</span>
              <div class="info-ranking">
                <div class="nombre-ranking">${nombre}</div>
                <div class="barra-ranking"><div class="relleno-ranking ${colorClass}" style="width:${pct}%;"></div></div>
              </div>
              <span class="valor-ranking">${this.formatM(valor)}</span>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    renderizarListaGastos(gastos) {
        const contenedor = document.querySelector('#lista-gastos-negocio');
        if (!contenedor) return;
        
        if (!gastos || gastos.length === 0) {
            contenedor.innerHTML = '<div style="text-align: center; color: var(--texto-mut); padding: 20px; font-size: 12px;">Sin datos suficientes</div>';
            return;
        }

        let html = '';
        gastos.forEach((g, index) => {
            html += `
            <div class="item-ranking" style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid var(--borde); margin-bottom:8px;">
                <div style="display:flex; flex-direction:column;">
                    <div class="nombre-ranking" style="font-weight:600; color:var(--cobalto);">${g.nombre}</div>
                    <div style="font-size:11px; color:var(--texto-mut);">${new Date(g.fecha).toLocaleDateString('es-MX')}</div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="valor-ranking" style="color:var(--rojo); font-weight:700;">${this.formatM(g.valor)}</span>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-editar-gasto" title="Editar gasto" data-id="${g.id}" data-nombre="${g.nombre}" data-valor="${g.valor}" style="background:var(--cobalto); border:none; cursor:pointer; color:#ffffff; padding:4px; border-radius:4px; display:flex; align-items:center; justify-content:center;">
                            <span class="material-symbols-rounded" style="font-size:14px; font-variation-settings: 'wght' 400;">edit</span>
                        </button>
                        <button class="btn-eliminar-gasto" title="Eliminar gasto" data-id="${g.id}" style="background:var(--naranja); border:none; cursor:pointer; color:#ffffff; padding:4px; border-radius:4px; display:flex; align-items:center; justify-content:center;">
                            <span class="material-symbols-rounded" style="font-size:14px; font-variation-settings: 'wght' 400;">delete</span>
                        </button>
                    </div>
                </div>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    actualizarAnalisis(ai) {
        const grid = document.querySelector('.cuadricula-analisis');
        if (!grid) return;

        const topS = ai.topServicios.length > 0 ? ai.topServicios[0][0] : 'Consultas';
        const topSVal = ai.topServicios.length > 0 ? this.formatM(ai.topServicios[0][1]) : '$0';
        
        let peorNombre = 'Ninguno';
        let peorEsProducto = false;
        if (ai.peorProducto) {
            peorNombre = ai.peorProducto[0];
            peorEsProducto = true;
        } else if (ai.peorServicio) {
            peorNombre = ai.peorServicio[0];
        }
        
        const topP = ai.topProductos.length > 0 ? ai.topProductos[0][0] : 'Ninguno';

        const defaultImg = (letra) => `https://placehold.co/40x40/f4f7fe/032f40?text=${letra}`;

        const html = `
        <div class="tarjeta" style="border: 1px solid var(--borde); padding: 16px; background: white; border-radius: 8px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
                <span class="material-symbols-rounded" style="font-variation-settings: 'wght' 300, 'FILL' 0; color: var(--cobalto); font-size: 18px;">verified</span>
                <span style="font-size:11px; font-weight:800; color:var(--cobalto); text-transform:uppercase; letter-spacing:0.5px;">ESTRELLA DEL MES</span>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <p style="margin:0; font-size:13px; color:var(--texto-mut); line-height:1.4;">Tu servicio estrella es <span style="font-weight:700; color:var(--naranja);">${topS}</span> con ${topSVal}. ¡Promociónalo más!</p>
            </div>
        </div>

        <div class="tarjeta" style="border: 1px solid var(--borde); padding: 16px; background: white; border-radius: 8px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
                <span class="material-symbols-rounded" style="font-variation-settings: 'wght' 300, 'FILL' 0; color: var(--naranja); font-size: 18px;">trending_down</span>
                <span style="font-size:11px; font-weight:800; color:var(--cobalto); text-transform:uppercase; letter-spacing:0.5px;">ÁREA DE OPORTUNIDAD</span>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <img id="img-ai-peor" src="${defaultImg(peorNombre.charAt(0).toUpperCase())}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border:1px solid var(--borde); flex-shrink:0;">
                <p style="margin:0; font-size:13px; color:var(--texto-mut); line-height:1.4;">Lo menos vendido fue <span style="font-weight:700; color:var(--naranja);">${peorNombre}</span>. Considera armar un paquete o retirarlo.</p>
            </div>
        </div>

        <div class="tarjeta" style="border: 1px solid var(--borde); padding: 16px; background: white; border-radius: 8px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
                <span class="material-symbols-rounded" style="font-variation-settings: 'wght' 300, 'FILL' 0; color: var(--cielo); font-size: 18px;">inventory_2</span>
                <span style="font-size:11px; font-weight:800; color:var(--cobalto); text-transform:uppercase; letter-spacing:0.5px;">PRODUCTO LÍDER</span>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <img id="img-ai-top-prod" src="${defaultImg(topP.charAt(0).toUpperCase())}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border:1px solid var(--borde); flex-shrink:0;">
                <p style="margin:0; font-size:13px; color:var(--texto-mut); line-height:1.4;">La venta de productos destaca gracias a <span style="font-weight:700; color:var(--naranja);">${topP}</span>, que fue lo más vendido.</p>
            </div>
        </div>

        <div class="tarjeta" style="border: 1px solid var(--borde); padding: 16px; background: white; border-radius: 8px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                <span class="material-symbols-rounded" style="font-variation-settings: 'wght' 300, 'FILL' 0; color: var(--naranja); font-size: 18px;">calendar_month</span>
                <span style="font-size:11px; font-weight:800; color:var(--cobalto); text-transform:uppercase; letter-spacing:0.5px;">MAYOR AFLUENCIA</span>
            </div>
            <p style="margin:0; font-size:13px; color:var(--texto-mut); line-height:1.4;">Los <span style="font-weight:700; color:var(--naranja); text-transform:capitalize;">${ai.diaPico}</span> concentran la mayor cantidad de visitas.</p>
        </div>

        <div class="tarjeta" style="border: 1px solid var(--borde); padding: 16px; background: white; border-radius: 8px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                <span class="material-symbols-rounded" style="font-variation-settings: 'wght' 300, 'FILL' 0; color: var(--cielo); font-size: 18px;">schedule</span>
                <span style="font-size:11px; font-weight:800; color:var(--cobalto); text-transform:uppercase; letter-spacing:0.5px;">HORA PICO</span>
            </div>
            <p style="margin:0; font-size:13px; color:var(--texto-mut); line-height:1.4;">${ai.horaPicoFormato !== 'N/A' ? `Las <span style="font-weight:700; color:var(--naranja);">${ai.horaPicoFormato}</span> es el horario más ocupado.` : 'Registra tus primeras consultas.'}</p>
        </div>

        <div class="tarjeta" style="border: 1px solid var(--borde); padding: 16px; background: white; border-radius: 8px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                <span class="material-symbols-rounded" style="font-variation-settings: 'wght' 300, 'FILL' 0; color: var(--cobalto); font-size: 18px;">query_stats</span>
                <span style="font-size:11px; font-weight:800; color:var(--cobalto); text-transform:uppercase; letter-spacing:0.5px;">RENTABILIDAD</span>
            </div>
            <p style="margin:0; font-size:13px; color:var(--texto-mut); line-height:1.4;">Retienes <span style="font-weight:700; color:var(--naranja);">$${ai.margenUtilidad}</span> libres por cada $100 ingresados.</p>
        </div>`;
        grid.innerHTML = html;

        // Fetch de imágenes de forma asíncrona desde Supabase
        const cargarImagenBD = (nombreBusqueda, imgElementId) => {
            if (!nombreBusqueda || nombreBusqueda === 'Ninguno' || typeof conexionSupabase === 'undefined' || typeof organizacionIdActual === 'undefined') return;
            
            const refId = (ai.mapaIdProductos && ai.mapaIdProductos[nombreBusqueda]) ? ai.mapaIdProductos[nombreBusqueda] : null;
            let query = conexionSupabase.from('inventario_productos').select('imagen_url');
            
            if (refId) {
                query = query.eq('id', refId);
            } else {
                query = query.ilike('nombre_comercial', `%${nombreBusqueda.trim()}%`).eq('organizacion_id', organizacionIdActual);
            }

            query.limit(1)
                .then(({data, error}) => {
                    if (data && data.length > 0 && data[0].imagen_url) {
                        const imgEl = document.getElementById(imgElementId);
                        if (imgEl) imgEl.src = data[0].imagen_url;
                    }
                }).catch(e => console.error("Error al buscar imagen de AI:", e));
        };

        cargarImagenBD(topS, 'img-ai-top-serv');
        cargarImagenBD(peorNombre, 'img-ai-peor');
        cargarImagenBD(topP, 'img-ai-top-prod');
    },

    inicializarGraficas(datos) {
        const colorCobalto = '#032F40';
        const colorNaranja = '#F27405';
        const colorCielo = '#89C2D9';
        const colorVerde = '#27AE60';
        const colorGris = '#7F8C8D';

        const ctxPrincipal = document.getElementById('graficaPrincipal');
        if (ctxPrincipal) {
            if (instanciasGraficas.principal) instanciasGraficas.principal.destroy();
            
            const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            const labelsDias = Array.from({length: diasMes}, (_, i) => i + 1);

            instanciasGraficas.principal = new Chart(ctxPrincipal, {
                type: 'line',
                data: {
                    labels: labelsDias,
                    datasets: [
                        {
                            label: 'Mes actual',
                            data: datos.tendencias.ingresosPorDia.slice(0, diasMes),
                            borderColor: colorCobalto,
                            backgroundColor: 'transparent',
                            borderWidth: 3,
                            tension: 0.4,
                            pointRadius: 0
                        },
                        {
                            label: 'Mes anterior',
                            data: datos.tendencias.ingresosAnteriorPorDia.slice(0, diasMes),
                            borderColor: colorCielo,
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            tension: 0.4,
                            borderDash: [5, 5],
                            pointRadius: 0
                        },
                        {
                            label: 'Tendencia Proyectada',
                            data: datos.tendencias.prediccionPorDia ? datos.tendencias.prediccionPorDia.slice(0, diasMes) : [],
                            borderColor: '#8E44AD', // Púrpura elegante para predicción
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            tension: 0.4,
                            borderDash: [3, 3],
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { border: { display: false }, grid: { color: '#E4EAF2' } }
                    }
                }
            });
        }

        const ctxDona = document.getElementById('graficaDonaCategoria');
        if (ctxDona) {
            if (instanciasGraficas.dona) instanciasGraficas.dona.destroy();
            
            const cats = Object.keys(datos.categorias);
            const vals = Object.values(datos.categorias);

            instanciasGraficas.dona = new Chart(ctxDona, {
                type: 'doughnut',
                data: {
                    labels: cats,
                    datasets: [{
                        data: vals,
                        backgroundColor: [colorCobalto, colorNaranja, colorCielo, colorVerde, colorGris, '#9B59B6', '#34495E', '#E67E22', '#1ABC9C', '#F1C40F'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { display: false } }
                }
            });
        }
    }
};

// ==========================================
// CONTROL DE MODAL DE GASTOS
// ==========================================
// Se usa event delegation a nivel document.body para que funcione con HTML inyectado dinámicamente
if (!window.finanzasListenerAgregado) {
    document.body.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-registrar-gasto')) {
            const modal = document.getElementById('modal-gasto');
            if (modal) {
                delete modal.dataset.editId;
                document.getElementById('gasto-categoria').value = 'Servicios (luz, agua)';
                document.getElementById('gasto-monto').value = '';
                document.getElementById('gasto-notas').value = '';
                modal.style.display = 'block';
            }
        }

        if (e.target.closest('.btn-editar-gasto')) {
            const btn = e.target.closest('.btn-editar-gasto');
            const modal = document.getElementById('modal-gasto');
            if (modal) {
                document.getElementById('gasto-categoria').value = btn.dataset.nombre;
                document.getElementById('gasto-monto').value = btn.dataset.valor;
                modal.dataset.editId = btn.dataset.id;
                modal.style.display = 'block';
            }
        }

        if (e.target.closest('.btn-eliminar-gasto')) {
            const btn = e.target.closest('.btn-eliminar-gasto');
            const id = btn.dataset.id;
            if (confirm('¿Estás seguro de eliminar este gasto de forma permanente?')) {
                try {
                    await conexionSupabase.from('caja_transacciones_items').delete().eq('transaccion_id', id);
                    await conexionSupabase.from('caja_transacciones').delete().eq('id', id);
                    
                    const loader = document.getElementById('loader-finanzas');
                    if (loader) loader.style.display = 'flex';
                    
                    const datos = await ModeloFinanzas.obtenerDatos(organizacionIdActual);
                    const procesado = ControladorFinanzas.procesarDatos(datos);
                    VistaFinanzas.renderizar(procesado);
                    
                    if (loader) loader.style.display = 'none';
                } catch (err) {
                    console.error("Error al eliminar gasto", err);
                    alert("No se pudo eliminar el gasto.");
                }
            }
        }

        if (e.target.closest('#btn-cerrar-gasto')) {
            const modal = document.getElementById('modal-gasto');
            if (modal) modal.style.display = 'none';
        }

        if (e.target.closest('#btn-guardar-gasto')) {
            const btnGuardar = e.target.closest('#btn-guardar-gasto');
            const categoria = document.getElementById('gasto-categoria').value;
            const montoStr = document.getElementById('gasto-monto').value;
            const notas = document.getElementById('gasto-notas').value;
            const monto = parseFloat(montoStr);

            if (!monto || monto <= 0) {
                alert("Por favor ingresa un monto válido.");
                return;
            }

            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';

            try {
                const modal = document.getElementById('modal-gasto');
                const editId = modal ? modal.dataset.editId : null;

                if (editId) {
                    const { error: errorTx } = await conexionSupabase
                        .from('caja_transacciones')
                        .update({ total: monto, notas: notas || categoria })
                        .eq('id', editId);
                    if (errorTx) throw errorTx;

                    const { error: errorItem } = await conexionSupabase
                        .from('caja_transacciones_items')
                        .update({ nombre_item: categoria, precio_unitario: monto, subtotal: monto })
                        .eq('transaccion_id', editId);
                    if (errorItem) throw errorItem;
                } else {
                    const { data: txGuardada, error: errorTx } = await conexionSupabase
                        .from('caja_transacciones')
                        .insert([{
                            organizacion_id: organizacionIdActual,
                            sucursal_id: sucursalIdActual,
                            cajero_id: usuarioIdActual,
                            cliente_id: null,
                            tipo: 'egreso',
                            total: monto,
                            estatus: 'completada',
                            metodo_pago: 'efectivo',
                            notas: notas || categoria
                        }])
                        .select()
                        .single();

                    if (errorTx) throw errorTx;

                    const { error: errorItem } = await conexionSupabase
                        .from('caja_transacciones_items')
                        .insert([{
                            transaccion_id: txGuardada.id,
                            referencia_tipo: 'servicio',
                            nombre_item: categoria,
                            cantidad: 1,
                            precio_unitario: monto,
                            subtotal: monto
                        }]);

                    if (errorItem) throw errorItem;
                }

                if (modal) modal.style.display = 'none';
                
                document.getElementById('gasto-monto').value = '';
                document.getElementById('gasto-notas').value = '';

                // Refrescar el módulo entero
                const loader = document.getElementById('loader-finanzas');
                if (loader) loader.style.display = 'flex';
                
                const datos = await ModeloFinanzas.obtenerDatos(organizacionIdActual);
                const procesado = ControladorFinanzas.procesarDatos(datos);
                VistaFinanzas.renderizar(procesado);
                
                if (loader) loader.style.display = 'none';

            } catch (error) {
                console.error("Error al registrar gasto:", error);
                alert("Error al guardar: " + (error.message || JSON.stringify(error)));
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Guardar Gasto';
            }
        }
        if (e.target.closest('#btn-exportar-excel')) {
            e.preventDefault();
            try {
                const btnExportar = e.target.closest('#btn-exportar-excel');
                const textoOriginal = btnExportar.innerHTML;
                btnExportar.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">sync</span> Exportando...';
                btnExportar.disabled = true;

                setTimeout(() => {
                    const tabla = document.querySelector('.tabla-datos');
                    if (tabla) {
                        const wb = XLSX.utils.table_to_book(tabla, { sheet: "Movimientos" });
                        XLSX.writeFile(wb, "Movimientos_Finanzas_PetProtect.xlsx");
                    }
                    btnExportar.innerHTML = textoOriginal;
                    btnExportar.disabled = false;
                }, 100); // Pequeño delay para mostrar el loader
            } catch (err) {
                console.error("Error al exportar:", err);
                alert("Hubo un error al generar el archivo Excel.");
            }
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target.id === 'buscador-gastos') {
            const term = e.target.value.toLowerCase();
            const filas = document.querySelectorAll('.tabla-datos tbody tr');
            filas.forEach(fila => {
                const textoFila = fila.innerText.toLowerCase();
                if (textoFila.includes(term)) {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        }
    });

    window.finanzasListenerAgregado = true;
}

window.mostrarDetalleMovimiento = (tx, mapaClientes) => {
    const panel = document.getElementById('panel-detalle-movimiento');
    const contenido = document.getElementById('contenido-detalle-movimiento');
    if (!panel || !contenido) return;

    const fecha = new Date(tx.created_at);
    const fechaStr = fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    const cliente = tx.cliente_id && mapaClientes[tx.cliente_id] ? mapaClientes[tx.cliente_id] : (tx.tipo === 'egreso' ? 'Gasto Operativo' : 'Venta de mostrador');
    
    let colorTotal = tx.tipo === 'ingreso' ? 'var(--verde)' : 'var(--rojo)';
    let signo = tx.tipo === 'ingreso' ? '+' : '-';
    let estadoLabel = tx.estatus === 'completada' ? 'Pagado' : (tx.estatus === 'pendiente' ? 'Pendiente' : 'Cancelado');
    let metodoDisplay = tx.metodo_pago || 'Mixto';

    if (tx.tipo === 'egreso') {
        if (tx.estatus === 'completada') estadoLabel = 'Realizado';
        metodoDisplay = 'Salida';
    }

    let detallesHtml = '';
    if (tx.detalles && tx.detalles.length > 0) {
        detallesHtml = tx.detalles.map(d => `
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px;">
                <div style="color:var(--cobalto);">
                    <span style="font-weight:600;">${d.cantidad}x</span> ${d.nombre_item.substring(0, 20)}
                </div>
                <div style="font-weight:600; color:var(--texto-mut);">$${parseFloat(d.subtotal).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
        `).join('');
    } else {
        detallesHtml = `<div style="color:var(--texto-mut); font-style:italic; font-size:11px;">Sin detalles (${tx.notas || 'N/A'})</div>`;
    }

    contenido.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 12px;">
            <div style="font-size: 20px; font-weight: 800; color: ${colorTotal};">${signo}$${parseFloat(tx.total).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            <div style="background: ${tx.estatus === 'completada' ? '#dcfce7' : '#fef08a'}; color: ${tx.estatus === 'completada' ? '#166534' : '#854d0e'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">${estadoLabel}</div>
        </div>

        <div style="font-size: 11px; color: var(--texto-mut); margin-bottom: 12px; display:flex; flex-direction:column; gap:4px;">
            <div><span style="font-weight:700; color:var(--cobalto);">Fecha:</span> ${fechaStr}</div>
            <div><span style="font-weight:700; color:var(--cobalto);">Involucrado:</span> ${cliente}</div>
            <div><span style="font-weight:700; color:var(--cobalto);">Método:</span> <span style="text-transform: capitalize;">${metodoDisplay}</span></div>
            <div><span style="font-weight:700; color:var(--cobalto);">ID:</span> <span style="font-family:monospace;">${tx.id.slice(-8)}</span></div>
        </div>

        <div style="font-size: 10px; font-weight: 700; color: var(--texto-mut); text-transform:uppercase; margin-bottom: 6px;">Conceptos</div>
        <div style="max-height: 100px; overflow-y: auto; margin-bottom: 12px; padding-right:4px;">
            ${detallesHtml}
        </div>

        ${tx.tipo !== 'egreso' ? `
        <button onclick="window.reimprimirTicket('${tx.id}', this)" style="width: 100%; padding: 8px; background: transparent; color: var(--cobalto); border: 1px solid var(--borde); border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: background 0.2s;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='transparent'">
            <span class="material-symbols-rounded" style="font-size: 16px;">print</span> Reimprimir Ticket
        </button>
        ` : ''}
    `;

    panel.style.display = 'block';
};

window.reimprimirTicket = async (txId, btnElement) => {
    const txtOrig = btnElement.innerHTML;
    btnElement.innerHTML = '<span class="material-symbols-rounded" style="font-size: 18px;">sync</span> Procesando...';
    btnElement.disabled = true;

    try {
        const { conexionSupabase } = await import('../../infraestructura/conexion.js');
        const { obtenerPlantillaTicket } = await import('./ticket_template.js');
        const { data: tx } = await conexionSupabase.from('caja_transacciones').select('*, clientes(nombre_completo), organizaciones(*), sucursales(*)').eq('id', txId).single();
        const { data: items } = await conexionSupabase.from('caja_transacciones_items').select('*').eq('transaccion_id', txId);

        const org = tx.organizaciones || {};
        const suc = tx.sucursales || {};
        const ahora = new Date(tx.created_at);

        const itemsTicket = items.map(item => ({
            descripcion: item.nombre_item,
            cantidad: item.cantidad,
            precioUnitario: item.precio_unitario || (item.subtotal / item.cantidad),
            tasaIVA: 16
        }));

        const clienteNom = tx.clientes ? tx.clientes.nombre_completo : (tx.tipo === 'egreso' ? 'Gasto Operativo' : 'Venta Mostrador');

        const ticketData = {
            clinica: {
                nombreComercial: org.nombre_comercial || org.nombre_legal || "PET PROTECT",
                nombreLegal: org.nombre_legal || "PET PROTECT",
                logoUrl: org.logo_url || null,
                logoIniciales: (org.nombre_comercial || org.nombre_legal || "PP").substring(0, 2).toUpperCase(),
                direccion: suc.direccion || "Dirección no registrada",
                telefono: suc.telefono || "",
                whatsapp: "",
                correo: org.correo_contacto || "",
                sitioWeb: org.sitio_web || "",
                rfc: org.rfc_fiscal || ""
            },
            ticket: {
                folio: tx.id.substring(0,8).toUpperCase(),
                fecha: ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' }),
                hora: ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }),
                cajero: clienteNom,
                caja: "Reimpresión",
                sucursal: suc.nombre || "Matriz"
            },
            categorias: [
                {
                    id: "productos",
                    titulo: "Conceptos",
                    icono: "package",
                    items: itemsTicket
                }
            ],
            pago: {
                metodo: tx.metodo_pago || 'efectivo',
                efectivoRecibido: tx.total,
                cambio: 0,
                referencia: ""
            }
        };

        const htmlTicketString = obtenerPlantillaTicket(JSON.stringify(ticketData));

        const ventanaImpresion = window.open('', '_blank', 'width=400,height=600');
        if (ventanaImpresion) {
            ventanaImpresion.document.write(htmlTicketString);
            ventanaImpresion.document.close();
            ventanaImpresion.focus();
            setTimeout(() => {
                ventanaImpresion.print();
                ventanaImpresion.close();
            }, 300);
        } else {
            alert('Por favor, permite las ventanas emergentes (pop-ups) para reimprimir el ticket.');
        }

    } catch(e) {
        console.error(e);
        alert("Error al intentar imprimir el ticket.");
    } finally {
        btnElement.innerHTML = txtOrig;
        btnElement.disabled = false;
    }
};

window.generarReporteHistorico = async (mesIndex, anio, nombreMes) => {
    // Abrir ventana INMEDIATAMENTE para evitar bloqueo de popups del navegador
    const ventanaPdf = window.open('', '_blank');
    if (!ventanaPdf) {
        alert("Por favor habilita las ventanas emergentes (pop-ups) para ver el reporte.");
        return;
    }
    ventanaPdf.document.write('<div style="font-family:sans-serif; padding:50px; text-align:center; color:#032F40;"><h2>Generando tu Reporte Financiero...</h2><p>Calculando punto de equilibrio y extrayendo historial.</p></div>');

    try {
        const cache = window._cacheReporteFinanzas;
        if (!cache || !cache.clinicaInfo) {
            ventanaPdf.close();
            alert("Información de la clínica no disponible. Recarga la página.");
            return;
        }

        const orgId = organizacionIdActual;
        const inicioMes = new Date(anio, mesIndex, 1).toISOString();
        const finMes = new Date(anio, mesIndex + 1, 0, 23, 59, 59).toISOString();

        // 1. Obtener transacciones del mes
        const txResp = await conexionSupabase.from('caja_transacciones')
            .select('*')
            .eq('organizacion_id', orgId)
            .gte('created_at', inicioMes)
            .lte('created_at', finMes)
            .neq('estatus', 'cancelada');

        const transacciones = txResp.data || [];

        // 2. Separar ingresos y gastos (y clasificar Fijos vs Variables)
        let ingresosBrutos = 0;
        let costosFijos = 0;
        let costosVariables = 0;
        const desgloseIngresos = {};
        const desgloseEgresos = {};

        transacciones.forEach(tx => {
            if (tx.estatus !== 'completada') return;

            if (tx.tipo === 'ingreso') {
                ingresosBrutos += tx.total;
                const cat = "Servicios y Productos Generales"; // Podría cruzarse con items, pero simplificamos
                desgloseIngresos[cat] = (desgloseIngresos[cat] || 0) + tx.total;
            } else if (tx.tipo === 'egreso') {
                const cat = tx.notas || 'General';
                desgloseEgresos[cat] = (desgloseEgresos[cat] || 0) + tx.total;
                
                // Clasificación sencilla de fijos vs variables basada en las notas
                const lcat = cat.toLowerCase();
                if (lcat.includes('renta') || lcat.includes('nómina') || lcat.includes('nomina') || lcat.includes('servicios') || lcat.includes('mantenimiento') || lcat.includes('publicidad') || lcat.includes('software')) {
                    costosFijos += tx.total;
                } else {
                    costosVariables += tx.total; // Inventario, insumos, honorarios eventuales
                }
            }
        });

        // 3. Preparar JSON para el Template
        const orgInfo = cache.clinicaInfo.organizacion || {};
        const sucInfo = cache.clinicaInfo.sucursal || {};

        let iniciales = "PP";
        const nombreParaIniciales = orgInfo.nombre_legal || sucInfo.nombre_sucursal || "Clínica";
        if (nombreParaIniciales) {
            const p = nombreParaIniciales.split(' ');
            iniciales = p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : nombreParaIniciales.substring(0,2).toUpperCase();
        }

        const payloadPlantilla = {
            clinica: {
                nombreComercial: orgInfo.nombre_legal || sucInfo.nombre_sucursal || "Clínica Veterinaria",
                direccion: sucInfo.direccion || "Dirección no registrada",
                rfc: orgInfo.rfc_fiscal,
                telefono: sucInfo.telefono_recepcion,
                logoUrl: orgInfo.logo_url,
                logoIniciales: iniciales
            },
            periodo: {
                texto: `${nombreMes} ${anio}`
            },
            resumen: {
                ingresosBrutos,
                costosFijos,
                costosVariables
            },
            desgloseIngresos: Object.keys(desgloseIngresos).map(k => ({ categoria: k, monto: desgloseIngresos[k] })).sort((a,b)=>b.monto-a.monto),
            desgloseEgresos: Object.keys(desgloseEgresos).map(k => ({ categoria: k, monto: desgloseEgresos[k] })).sort((a,b)=>b.monto-a.monto)
        };

        const html = obtenerPlantillaReporte(JSON.stringify(payloadPlantilla));

        ventanaPdf.document.open();
        ventanaPdf.document.write(html);
        ventanaPdf.document.close();

    } catch (error) {
        if (ventanaPdf) ventanaPdf.close();
        console.error("Error al generar reporte histórico:", error);
        alert("Ocurrió un error generando el reporte. Revisa la consola.");
    }
};

window.generarReporteFinanciero = () => {
    if (!window._cacheReporteFinanzas || !window._cacheReporteFinanzas.txMesActual) {
        alert("Aún no se han cargado los datos financieros. Por favor espera un momento.");
        return;
    }

    const { txMesActual, clientes } = window._cacheReporteFinanzas;
    
    // Mapeo rápido de clientes para nombre completo
    const mapaClientes = {};
    clientes.forEach(c => mapaClientes[c.id] = c.nombre_completo);

    // Encabezados del CSV
    let csvContent = "Fecha,Hora,Folio,Tipo,Concepto_O_Cliente,Metodo_Pago,Estatus,Total_MXN\n";

    // Filas
    txMesActual.forEach(tx => {
        const fechaObj = new Date(tx.created_at);
        const fecha = fechaObj.toLocaleDateString('es-MX');
        const hora = fechaObj.toLocaleTimeString('es-MX');
        const folio = tx.id.slice(-8).toUpperCase();
        const tipo = tx.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
        
        let concepto = "Venta General / Mostrador";
        if (tx.tipo === 'egreso') {
            concepto = tx.notas || "Gasto de Operación";
        } else if (tx.cliente_id && mapaClientes[tx.cliente_id]) {
            concepto = mapaClientes[tx.cliente_id];
        }

        // Limpiar concepto de comillas para CSV
        concepto = `"${concepto.replace(/"/g, '""')}"`;
        
        const metodo = tx.metodo_pago ? tx.metodo_pago.toUpperCase() : "N/A";
        const estatus = tx.estatus ? tx.estatus.toUpperCase() : "N/A";
        const total = parseFloat(tx.total).toFixed(2);

        csvContent += `${fecha},${hora},${folio},${tipo},${concepto},${metodo},${estatus},${total}\n`;
    });

    // Añadir BOM (Byte Order Mark) para que Excel detecte UTF-8 y muestre bien los acentos
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Finanzas_${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
