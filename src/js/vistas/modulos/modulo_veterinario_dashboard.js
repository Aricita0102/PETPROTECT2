// ==========================================
// CONTROLADOR DASHBOARD VETERINARIO (SUPABASE)
// Archivo: /src/js/veterinario_dashboard_logica.js
// ==========================================
import '../../../css/modulo_veteri_dashboard.css';
import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";
import { iniciarTourSiEsPrimeraVez, conectarBotonTourDashboard } from '../../tour/modulo_veterinario_dashboard_tour.js';

import { cargarModulo } from '../principal_v2.js';
import QRCode from 'qrcode';
import { alertaCustom } from '../../utilidades/ui_alertas.js';

let usuarioActualId = null;
let organizacionIdActual = null;
let planOrganizacion = "INICIAL";
let suscripcionCanalCitas = null;

const actualizarFechaUI = () => {
    const txtFecha = document.getElementById('fechaActual');
    if (txtFecha) {
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        txtFecha.innerText = new Date().toLocaleDateString('es-ES', opciones);
    }
};

export async function inicializarModuloDashboard() {
    try {
        actualizarFechaUI();

        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) {
            console.error("ERROR CRÍTICO DE INICIALIZACIÓN: No hay sesión activa.");
            alert("Error de consola detectado. Revisa con F12.");
            // window.location.assign("LOGIN.html");
            return;
        }

        usuarioActualId = sesion.user.id;
        organizacionIdActual = sesion.perfil.organizacion_id;

        // 3. Guardán de clínica
        if (!sesion.perfil.organizacion_id || sesion.perfil.rol === 'nuevo') {
            window.location.assign("ONBOARDING.html");
            return;
        }

        // 4. Obtener Plan (solo este query es necesario, no estaba en el perfil)
        const { data: orgData } = await conexionSupabase
            .from('organizaciones')
            .select('plan_suscripcion')
            .eq('id', organizacionIdActual)
            .single();

        if (orgData) planOrganizacion = (orgData.plan_suscripcion || "INICIAL").toUpperCase();

        // 5. Renderizado de UI y Validación de acceso
        actualizarPerfilUI(sesion.perfil);
        gestionarAccesoVeterinario(sesion.perfil);

        // 6. Conectar botón cerrar sesión
        document.querySelectorAll('#btnCerrarSesion').forEach(btn => btn.addEventListener('click', cerrarSesionApp));

        // 7. Caballo de Troya: Forzar renderizado del widget de horario cada que carga el Dashboard
        setTimeout(() => {
            if (typeof window.actualizarWidgetHorarioGlobal === 'function') {
                window.actualizarWidgetHorarioGlobal();
            }
        }, 100); // Pequeño delay para asegurar que el DOM de la vista ya fue inyectado

    } catch (error) {
        console.error("ERROR CRÍTICO DE INICIALIZACIÓN:", error);
        alert("Error de consola detectado. Revisa con F12.");
    }
}

function gestionarAccesoVeterinario(perfil) {
    const loader = document.getElementById('pantallaCarga');
    const contenidoPrincipal = document.getElementById('contenidoPrincipal');
    const btnRegresarAdmin = document.getElementById('btnRegresarAdmin');

    // Seguridad: Roles
    if (perfil.rol === "asistente") {
        alert("Acceso denegado. Redirigiendo a panel de asistente.");
        window.location.assign("ASISTENTE_DASHBOARD.html");
        return;
    }

    if (perfil.estatus === "suspendido") {
        alert("⛔ Cuenta suspendida.");
        cerrarSesionApp();
        return;
    }

    // --- ÉXITO: MOSTRAR CONTENIDO Y QUITAR LOADER ---
    if (contenidoPrincipal) contenidoPrincipal.style.display = "flex";
    if (loader) loader.style.display = "none"; // 👈 Aquí se oculta al confirmar acceso

    // Configurar Puente de Regreso
    if (btnRegresarAdmin) {
        if (perfil.rol === 'superadmin' && planOrganizacion !== 'INICIAL') {
            btnRegresarAdmin.style.display = "block"; 
            btnRegresarAdmin.onclick = (e) => {
                e.preventDefault();
                window.location.assign("PRINCIPAL.html");
            };
        } else {
            btnRegresarAdmin.remove();
        }
    }
    
    // Cargar datos operativos reales
    // requestAnimationFrame garantiza que el DOM ya está pintado
    configurarBtnNuevoIngreso();
    configurarBotonScanner();
    configurarBuscadorPredictivo();
    conectarBotonTourDashboard(); 
    requestAnimationFrame(() => {
        cargarMetricasCasosClinicos();
        iniciarTourSiEsPrimeraVez();
        configurarFiltrosIngresos();
        cargarMetricasIngresos();
        cargarAgendaDelDia();
        cargarHistorialCasosClinicos();
        monitorearAtendidosMes();
    });
    iniciarSistemaAlertas();
}

// ─── Reloj y Horario (Widget) REMOVIDO POR ROLLBACK ────────────────────────

// ─── Buscador Predictivo ──────────────────────────────────────────────────────
function configurarBuscadorPredictivo() {
    const inputBusqueda = document.getElementById('inputBusqueda');
    const dropdown = document.getElementById('dropdownResultadosBusqueda');

    if (!inputBusqueda || !dropdown) return;

    let timeoutBusqueda = null;

    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.trim();
        clearTimeout(timeoutBusqueda);

        if (termino.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        timeoutBusqueda = setTimeout(() => realizarBusqueda(termino), 400);
    });

    // Cerrar si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!inputBusqueda.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    inputBusqueda.addEventListener('focus', () => {
        if (inputBusqueda.value.trim().length >= 2) {
            dropdown.style.display = 'block';
        }
    });

    async function realizarBusqueda(termino) {
        if (!organizacionIdActual) return;

        dropdown.innerHTML = '<div class="resultado-pred-empty">Buscando...</div>';
        dropdown.style.display = 'block';

        try {
            // Buscar por nombre de mascota
            const pMascota = conexionSupabase
                .from('pacientes')
                .select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`)
                .eq('organizacion_id', organizacionIdActual)
                .ilike('nombre', `%${termino}%`)
                .limit(5);

            // Buscar por nombre de tutor (usando foreign table filter)
            const pTutor = conexionSupabase
                .from('pacientes')
                .select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`)
                .eq('organizacion_id', organizacionIdActual)
                .ilike('clientes.nombre_completo', `%${termino}%`)
                .limit(5);

            const [resMascota, resTutor] = await Promise.all([pMascota, pTutor]);

            if (resMascota.error) throw resMascota.error;
            if (resTutor.error) throw resTutor.error;

            // Unir y quitar duplicados (por ID)
            const mapaResultados = new Map();
            [...(resMascota.data || []), ...(resTutor.data || [])].forEach(paciente => {
                mapaResultados.set(paciente.id, paciente);
            });

            const resultadosFinales = Array.from(mapaResultados.values()).slice(0, 6);

            renderizarResultadosPredictivos(resultadosFinales);

        } catch (error) {
            console.error('[DASH] Error en buscador:', error);
            dropdown.innerHTML = '<div class="resultado-pred-empty" style="color:red;">Error de búsqueda</div>';
        }
    }

    function renderizarResultadosPredictivos(resultados) {
        if (resultados.length === 0) {
            dropdown.innerHTML = '<div class="resultado-pred-empty">No se encontraron pacientes ni tutores.</div>';
            return;
        }

        dropdown.innerHTML = '';
        resultados.forEach(paciente => {
            const fotoUrl = paciente.foto_url || 'https://cdn-icons-png.flaticon.com/512/2809/2809865.png'; // Fallback genérico
            const nombreMascota = paciente.nombre || 'Desconocido';
            const especieRaza = `${paciente.especie || 'Mascota'} ${paciente.raza ? '· ' + paciente.raza : ''}`;
            const tutorNombre = paciente.clientes?.nombre_completo || 'Sin tutor registrado';

            const item = document.createElement('div');
            item.className = 'resultado-pred-item';
            item.innerHTML = `
                <img src="${fotoUrl}" alt="Foto" class="resultado-pred-foto">
                <div class="resultado-pred-info">
                    <p class="resultado-pred-nombre">${nombreMascota}</p>
                    <p class="resultado-pred-detalles">${especieRaza}</p>
                    <p class="resultado-pred-tutor"><span class="material-symbols-rounded" style="font-size:12px; vertical-align:middle;">person</span> ${tutorNombre}</p>
                </div>
            `;

            item.addEventListener('click', () => {
                sessionStorage.setItem('idPacienteActivo', paciente.id);
                cargarModulo('MODULO_EXPEDIENTES_HISTORIAL');
            });

            dropdown.appendChild(item);
        });
    }
}

// ─── Botón Nuevo Ingreso → Modal de Registro de Paciente ──────────────────────
function configurarBtnNuevoIngreso() {
    const btn = document.getElementById('btnNuevoIngreso');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        try {
            // Importamos el mismo orquestador que usa Biblioteca de Expedientes
            const { inyectarYMostrarModal } = await import('/src/js/vistas/modal/modal_registro_pacientes.js');
            await inyectarYMostrarModal();
        } catch (err) {
            console.error('[DASHBOARD] Error al abrir modal de nuevo paciente:', err);
        }
    });
}

// ─── Métricas Casos Clínicos ──────────────────────────────────────────────────────
async function cargarMetricasCasosClinicos() {
    const elTotal     = document.getElementById('dash-casos-total');
    const elFinal     = document.getElementById('dash-casos-finalizados');
    const elAbiertas  = document.getElementById('dash-casos-abiertas');
    const elPacientes = document.getElementById('dash-pacientes-unicos');

    [elTotal, elFinal, elAbiertas, elPacientes]
        .forEach(el => { if (el) el.textContent = '...'; });

    try {
        if (!organizacionIdActual) throw new Error('organizacion_id no disponible');

        const ahora     = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

        console.log('[DASH] → Casos clínicos, org:', organizacionIdActual, '| desde:', inicioMes);

        // Trae TODAS las consultas del mes con sus campos mínimos.
        // RLS en Supabase deja pasar las filas donde el usuario es medico_id
        // O donde organizacion_id coincide si las políticas son por org.
        const { data, error, count } = await conexionSupabase
            .from('consultas')
            .select('id, finalizada, paciente_id', { count: 'exact' })
            .eq('organizacion_id', organizacionIdActual)
            .gte('created_at', inicioMes);

        if (error) {
            console.error('[DASH] Error al leer consultas:', error.code, error.message);
            throw error;
        }

        const registros       = data || [];
        const total           = registros.length;
        const finalizadas     = registros.filter(c => c.finalizada === true).length;
        const abiertas        = total - finalizadas;
        const pacientesUnicos = new Set(registros.map(c => c.paciente_id)).size;

        console.log('[DASH] ← Casos del mes:', total, '| Finalizadas:', finalizadas, '| Pacientes:', pacientesUnicos);

        const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

        if (elTotal)     elTotal.textContent     = fmt(total);
        if (elFinal)     elFinal.textContent     = fmt(finalizadas);
        if (elAbiertas)  elAbiertas.textContent  = fmt(abiertas);
        if (elPacientes) elPacientes.textContent = fmt(pacientesUnicos);

        // ─── Renderizado de Gráfica de Dona (Casos) ──────────────────────
        const cargarLibreriaChartJS = () => new Promise((resolve) => {
            if (window.Chart) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => resolve();
            document.head.appendChild(script);
        });

        await cargarLibreriaChartJS();

        const ctxCasos = document.getElementById('graficaCasosEstados');
        if (ctxCasos && window.Chart) {
            // Control de SPA: Destrucción previa
            if (window._instanciaGraficaCasos) {
                window._instanciaGraficaCasos.destroy();
            }

            window._instanciaGraficaCasos = new Chart(ctxCasos, {
                type: 'doughnut',
                data: {
                    labels: ['Finalizadas', 'En Revisión'],
                    datasets: [{
                        data: [finalizadas, abiertas],
                        backgroundColor: ['#0f172a', '#f97316'], // Azul marino y Naranja corporativo
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%', // Hace que la dona sea delgada y elegante
                    plugins: {
                        legend: { display: false } // Oculta leyendas para no saturar la tarjeta
                    }
                }
            });
        }

    } catch (err) {
        console.error('[DASH] ✘ Métricas clínicas fallaron:', err.message);
        if (elTotal) elTotal.textContent = '!';
        if (elFinal) elFinal.textContent = '—';
        if (elAbiertas) elAbiertas.textContent = '—';
        if (elPacientes) elPacientes.textContent = '—';
    }
}

function configurarFiltrosIngresos() {
    const listaOrigen = document.querySelectorAll('#listaFiltrosOrigen li');
    const listaTiempo = document.querySelectorAll('#listaFiltrosTiempo li');
    
    listaOrigen.forEach(li => {
        li.addEventListener('click', (e) => {
            listaOrigen.forEach(el => { el.style.color = ''; el.style.fontWeight = 'normal'; });
            e.target.style.color = 'var(--naranja)';
            e.target.style.fontWeight = 'bold';
            
            window.filtroFinanzasOrigen = e.target.getAttribute('data-val');
            document.getElementById('btnFiltrosOrigen').innerHTML = `Origen: ${e.target.innerText} ▼`;
            document.getElementById('menuFiltrosOrigen').style.display = 'none';
            
            cargarMetricasIngresos();
        });
    });

    listaTiempo.forEach(li => {
        li.addEventListener('click', (e) => {
            listaTiempo.forEach(el => { el.style.color = ''; el.style.fontWeight = 'normal'; });
            e.target.style.color = 'var(--naranja)';
            e.target.style.fontWeight = 'bold';
            
            window.filtroFinanzasTiempo = e.target.getAttribute('data-val');
            document.getElementById('btnFiltrosTiempo').innerHTML = `${e.target.innerText} ▼`;
            document.getElementById('menuFiltrosFinanzas').style.display = 'none';
            
            cargarMetricasIngresos();
        });
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#btnFiltrosOrigen') && !e.target.closest('#menuFiltrosOrigen')) {
            const mO = document.getElementById('menuFiltrosOrigen');
            if(mO) mO.style.display = 'none';
        }
        if (!e.target.closest('#btnFiltrosTiempo') && !e.target.closest('#menuFiltrosFinanzas')) {
            const mF = document.getElementById('menuFiltrosFinanzas');
            if(mF) mF.style.display = 'none';
        }
    });
}

// ─── Métricas de Ingresos (Caja Transacciones) ────────────────────────────────────────────────────────
async function cargarMetricasIngresos() {
    const elTotal  = document.getElementById('dash-ingresos-total');
    const elMes    = document.getElementById('dash-ingresos-mes');
    const elSemana = document.getElementById('dash-ingresos-semana');
    const elHoy    = document.getElementById('dash-ingresos-hoy');

    const lblMes = elMes?.nextElementSibling;
    const lblSemana = elSemana?.nextElementSibling;
    const lblHoy = elHoy?.nextElementSibling;

    [elTotal, elMes, elSemana, elHoy].forEach(el => { if (el) el.textContent = '...'; });

    try {
        if (!organizacionIdActual) throw new Error('organizacion_id no disponible');

        const ahora = new Date();
        let fechaInicio, fechaFin;
        
        if (typeof window.filtroFinanzasTiempo === 'undefined') {
            window.filtroFinanzasTiempo = 'mes';
            window.filtroFinanzasOrigen = 'todo';
        }

        if (window.filtroFinanzasTiempo === 'mes_pasado') {
            fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
            fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
        } else if (window.filtroFinanzasTiempo === 'ano') {
            fechaInicio = new Date(ahora.getFullYear(), 0, 1);
            fechaFin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
        } else {
            fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
        }

        console.log(`[DASH] → Ingresos Reales de Caja, org: ${organizacionIdActual}, tiempo: ${window.filtroFinanzasTiempo}, origen: ${window.filtroFinanzasOrigen}`);

        let query = conexionSupabase
            .from('caja_transacciones')
            .select('id, total, created_at, notas')
            .eq('organizacion_id', organizacionIdActual)
            .eq('tipo', 'ingreso')
            .eq('estatus', 'completada')
            .gte('created_at', fechaInicio.toISOString())
            .lte('created_at', fechaFin.toISOString());

        if (window.filtroFinanzasOrigen === 'mostrador') {
            query = query.ilike('notas', '%POS%');
        } else if (window.filtroFinanzasOrigen === 'consulta') {
            query = query.ilike('notas', '%Checkout M%');
        }

        let { data: transacciones, error } = await query;

        if (error) {
            console.warn('[DASH] ⚠️ Error al consultar caja_transacciones:', error);
            transacciones = [];
        }

        // Fetch items manually para evitar error de JOIN
        if (transacciones && transacciones.length > 0 && ['vacunacion', 'cirugia', 'estetica'].includes(window.filtroFinanzasOrigen)) {
            const txIds = transacciones.map(t => t.id);
            const { data: items, error: errorItems } = await conexionSupabase
                .from('caja_transacciones_items')
                .select('transaccion_id, nombre_item')
                .in('transaccion_id', txIds);
            
            if (!errorItems && items) {
                transacciones.forEach(t => {
                    t.caja_transacciones_items = items.filter(i => i.transaccion_id === t.id);
                });
            }
        }

        let lista = transacciones || [];

        // Filtrado adicional en memoria para categorías específicas
        if (['vacunacion', 'cirugia', 'estetica'].includes(window.filtroFinanzasOrigen)) {
            lista = lista.filter(t => {
                if (!t.caja_transacciones_items || !Array.isArray(t.caja_transacciones_items)) return false;
                return t.caja_transacciones_items.some(item => {
                    if (!item.nombre_item) return false;
                    const nombre = item.nombre_item.toLowerCase();
                    if (window.filtroFinanzasOrigen === 'vacunacion') return nombre.includes('vacuna');
                    if (window.filtroFinanzasOrigen === 'cirugia') return nombre.includes('cirug');
                    if (window.filtroFinanzasOrigen === 'estetica') return nombre.includes('estética') || nombre.includes('estetica');
                    return false;
                });
            });
        }
        
        const sumarTotal = (arr) => arr.reduce((acc, t) => acc + parseFloat(t.total || 0), 0);
        
        let totalPeriodo1 = 0, totalPeriodo2 = 0, totalPeriodo3 = 0;
        const totalPrincipal = sumarTotal(lista);
        
        totalPeriodo1 = totalPrincipal; 

        if (window.filtroFinanzasTiempo === 'ano') {
            totalPeriodo2 = totalPrincipal / (ahora.getMonth() + 1);
            const diasTranscurridos = Math.ceil((ahora - new Date(ahora.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24));
            totalPeriodo3 = diasTranscurridos > 0 ? totalPrincipal / diasTranscurridos : 0;
            if (lblSemana && lblSemana.parentElement) lblSemana.parentElement.style.display = 'flex';
        } else if (window.filtroFinanzasTiempo === 'mes_pasado') {
            const diasMesPasado = fechaFin.getDate();
            totalPeriodo2 = 0; 
            if (lblSemana && lblSemana.parentElement) lblSemana.parentElement.style.display = 'none';
            totalPeriodo3 = totalPrincipal / diasMesPasado;
        } else {
            if (lblSemana && lblSemana.parentElement) lblSemana.parentElement.style.display = 'flex';
            const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            const lunesSemana = new Date(inicioHoy);
            lunesSemana.setDate(inicioHoy.getDate() - ((inicioHoy.getDay() + 6) % 7));
            
            const filtrarDesde = (desde) => lista.filter(t => new Date(t.created_at) >= desde);
            totalPeriodo2 = sumarTotal(filtrarDesde(lunesSemana));
            totalPeriodo3 = sumarTotal(filtrarDesde(inicioHoy));
        }

        const $fmt = monto => monto >= 1000 ? `$${(monto / 1000).toFixed(1)}k` : `$${monto.toFixed(0)}`;

        if (elTotal)  elTotal.textContent  = $fmt(totalPrincipal).replace('$', '');
        if (elMes)    elMes.textContent    = $fmt(totalPeriodo1);
        if (elSemana) elSemana.textContent = $fmt(totalPeriodo2);
        if (elHoy)    elHoy.textContent    = $fmt(totalPeriodo3);

        // Cambiar etiquetas según el periodo
        if (lblMes) lblMes.textContent = window.filtroFinanzasTiempo === 'mes_pasado' ? 'Total Mes Pasado' : (window.filtroFinanzasTiempo === 'ano' ? 'Total Año' : 'Este Mes');
        if (lblSemana) lblSemana.textContent = window.filtroFinanzasTiempo === 'ano' ? 'Promedio Mensual' : 'Esta Semana';
        if (lblHoy) lblHoy.textContent = window.filtroFinanzasTiempo === 'ano' ? 'Promedio Diario' : (window.filtroFinanzasTiempo === 'mes_pasado' ? 'Promedio Diario' : 'Hoy');

        const subtitulo = document.querySelector('.seccion-contador p');
        if (subtitulo) {
            let textoOrigen = 'Ingresos';
            switch (window.filtroFinanzasOrigen) {
                case 'mostrador': textoOrigen = 'Mostrador'; break;
                case 'consulta': textoOrigen = 'Consulta'; break;
                case 'vacunacion': textoOrigen = 'Vacunación'; break;
                case 'cirugia': textoOrigen = 'Cirugía'; break;
                case 'estetica': textoOrigen = 'Estética'; break;
            }
            let textoTiempo = window.filtroFinanzasTiempo === 'mes_pasado' ? 'Mes Pasado' : (window.filtroFinanzasTiempo === 'ano' ? 'del Año' : 'del Mes');
            subtitulo.textContent = `${textoOrigen} ${textoTiempo}, $`;
        }

        // ─── Promesa de Carga Dinámica de Chart.js ──────────────────────
        const cargarLibreriaChartJS = () => new Promise((resolve) => {
            if (window.Chart) return resolve();
            console.log("[DASH] Inyectando Chart.js dinámicamente...");
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => resolve();
            document.head.appendChild(script);
        });

        await cargarLibreriaChartJS();

        // ─── Renderizado de Gráfica de Ingresos ────────────────────────────
        const ctxGrafica = document.getElementById('graficaIngresosMensuales');
        if (ctxGrafica && window.Chart) {
            // Destrucción de instancia previa para SPA lifecycle
            if (window._instanciaGraficaIngresos) {
                window._instanciaGraficaIngresos.destroy();
            }

            // Agrupación Time-Series cronológica
            lista.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
            const datosOrdenados = {};
            lista.forEach(t => {
                const fecha = new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                datosOrdenados[fecha] = (datosOrdenados[fecha] || 0) + parseFloat(t.total || 0);
            });
            
            const labels = Object.keys(datosOrdenados);
            const dataPuntos = Object.values(datosOrdenados);

            window._instanciaGraficaIngresos = new Chart(ctxGrafica, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Ingresos',
                        data: dataPuntos,
                        borderColor: '#f97316', // Naranja PET PROTECT
                        backgroundColor: 'rgba(249, 115, 22, 0.15)',
                        borderWidth: 3,
                        pointBackgroundColor: '#0f172a', // Cobalto/Oscuro corporativo
                        pointBorderColor: '#ffffff',
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.4 // Curva suave y moderna
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleFont: { family: 'Inter', size: 13 },
                            bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                            padding: 10,
                            callbacks: {
                                label: function(context) {
                                    return '$' + context.raw.toLocaleString('es-MX', {minimumFractionDigits: 2});
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { display: false }, // Ocultar cuadrícula Y
                            ticks: {
                                font: { family: 'Inter' },
                                color: '#64748b',
                                callback: function(value) {
                                    return '$' + value;
                                }
                            }
                        },
                        x: {
                            grid: { display: false }, // Ocultar cuadrícula X
                            ticks: {
                                font: { family: 'Inter' },
                                color: '#64748b'
                            }
                        }
                    }
                }
            });
        }

    } catch (err) {
        console.error('[DASH] ✘ Métricas ingresos fallaron:', err.message);
        if (elTotal) elTotal.textContent = '!';
        [elMes, elSemana, elHoy].forEach(el => { if (el) el.textContent = '$—'; });
    }
}

function actualizarPerfilUI(datos) {
    const tituloBienvenida = document.getElementById('tituloBienvenida');
    if (tituloBienvenida) {
        let primerNombre = datos.nombre_completo ? datos.nombre_completo.replace(/^(Dr\.|Dra\.|Dr|Dra)\s+/i, '').trim().split(" ")[0] : "Doctor";
        tituloBienvenida.textContent = `Bienvenido(a) ${primerNombre}, ¡así están las cosas hoy!`;
    }
}

async function cargarAgendaDelDia() {
    const elEspera = document.getElementById('lista-citas-espera');
    const elHoy = document.getElementById('lista-citas-hoy');
    if (!elEspera || !elHoy) return;

    elEspera.innerHTML = '<div class="item-lista" style="justify-content: center; color: var(--texto-sec); font-size: 0.85rem;">Cargando...</div>';
    elHoy.innerHTML = '<div class="item-lista" style="justify-content: center; color: var(--texto-sec); font-size: 0.85rem;">Cargando...</div>';

    const hoyInicio = new Date();
    hoyInicio.setHours(0,0,0,0);
    const hoyFin = new Date();
    hoyFin.setHours(23,59,59,999);

    const { data: citas, error } = await conexionSupabase
        .from('citas')
        .select('id, paciente_id, estado, fecha_hora, motivo_breve, pacientes ( nombre, clientes ( nombre_completo ) )')
        .eq('organizacion_id', organizacionIdActual)
        .eq('medico_id', usuarioActualId)
        .gte('fecha_hora', hoyInicio.toISOString())
        .lte('fecha_hora', hoyFin.toISOString())
        .order('fecha_hora', { ascending: true });

    if (error) {
        console.error("Error al cargar agenda (citas):", error);
        elEspera.innerHTML = '<div class="item-lista" style="justify-content: center; color: red;">Error al cargar</div>';
        elHoy.innerHTML = '<div class="item-lista" style="justify-content: center; color: red;">Error al cargar</div>';
        return;
    }

    const ahora = new Date();
    const ahoraTime = ahora.getTime();

    const enEspera = [];
    const programadas = [];
    const citasVencidas = [];

    // Identificamos la única cita que el sistema reconocerá como activa (la primera en consulta)
    const citaActivaReal = citas.find(c => c.estado && (c.estado.toLowerCase().includes('en_consulta') || c.estado.toLowerCase() === 'en consulta'));

    citas.forEach(cita => {
        const estadoLC = cita.estado ? cita.estado.toLowerCase() : '';
        const esProgramadaOriginal = !cita.estado || estadoLC.includes('agendada') || estadoLC.includes('programada') || estadoLC.includes('confirmada');
        const esEspera = estadoLC.includes('espera');
        
        // Solo consideraremos que está en consulta si es exactamente la cita activa reconocida
        const enConsulta = citaActivaReal && citaActivaReal.id === cita.id;
        
        // Si se quedó trabada en estado 'en_consulta' pero no es la activa, la tratamos como si fuera programada para que apliquen las reglas de expiración
        const esProgramada = esProgramadaOriginal || (estadoLC.includes('en_consulta') && !enConsulta);
        
        const fechaCita = new Date(cita.fecha_hora).getTime();
        const diffMinutosAntes = (fechaCita - ahoraTime) / 60000;
        const diffMinutosPasados = (ahoraTime - fechaCita) / 60000;

        // Si ya pasaron más de 30 minutos y no está en consulta, se quita y se marca como no asistida
        if ((esProgramada || esEspera) && diffMinutosPasados > 30 && !enConsulta) {
            citasVencidas.push(cita.id);
            return;
        }

        // Cita entra a espera si está marcada así, si ya está en consulta (para retomarla), o si faltan 15 min o menos
        if (esEspera || enConsulta || (esProgramada && diffMinutosAntes <= 15)) {
            enEspera.push(cita);
        } else if (esProgramada) {
            programadas.push(cita);
        }
    });

    if (citasVencidas.length > 0) {
        conexionSupabase.from('citas').update({ estado: 'no_asistio' }).in('id', citasVencidas)
            .then(({error}) => { if (error) console.error("Error al actualizar inasistencias en el dashboard:", error); });
    }

    const renderCitas = (lista, contenedor, msjVacio, mostrarBotonAtender = false) => {
        if (!lista || lista.length === 0) {
            contenedor.innerHTML = `<div class="item-lista" style="justify-content: center; color: var(--texto-sec); font-size: 0.85rem;">${msjVacio}</div>`;
            return;
        }
        
        contenedor.innerHTML = '';
        lista.forEach(cita => {
            const horaStr = new Date(cita.fecha_hora).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'});
            let htmlBoton = '';
            if (mostrarBotonAtender) {
                const enConsulta = citaActivaReal && citaActivaReal.id === cita.id;
                const textoBoton = enConsulta ? 'Retomar' : 'Atender';
                const colorBoton = enConsulta ? 'var(--cobalto)' : 'var(--naranja)';
                
                htmlBoton = `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span style="font-size: 11px; font-weight: bold; color: var(--texto-sec);">${horaStr}</span>
                        <button class="botonMini" style="background: ${colorBoton}; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;" onclick="iniciarConsulta('${cita.id}', '${cita.paciente_id}')">${textoBoton}</button>
                    </div>
                `;
            } else {
                htmlBoton = `<span class="etiqueta etiqueta-info" style="font-size: 11px; font-weight: bold; background: var(--fondo-app); padding: 4px 8px; border-radius: 4px; color: var(--cobalto); border: 1px solid var(--borde);">${horaStr}</span>`;
            }

            const nombreMascota = cita.pacientes?.nombre || 'Sin nombre';
            const motivo = cita.motivo_breve || 'Consulta';
            const dueno = cita.pacientes?.clientes?.nombre_completo || '';

            contenedor.innerHTML += `
                <div class="item-lista" style="padding: 10px; border-bottom: 1px solid var(--borde); display: flex; justify-content: space-between; align-items: center;">
                    <div class="info-principal" style="flex: 1;">
                        <span class="titulo-item" style="font-weight: bold; color: var(--cobalto); font-size: 13px;">${nombreMascota}</span>
                        <span class="subtitulo-item" style="font-size: 11px; color: var(--texto-sec); display: block;">${motivo} ${dueno ? `- ${dueno}` : ''}</span>
                    </div>
                    <div class="accion-item">
                        ${htmlBoton}
                    </div>
                </div>
            `;
        });
    };

    renderCitas(enEspera, elEspera, 'Sala vacía', true);
    renderCitas(programadas, elHoy, 'Sin citas pendientes hoy', false);
}

async function cargarHistorialCasosClinicos() {
    const contenedor = document.getElementById('listaHistorialCasosBack');
    if (!contenedor) return;

    contenedor.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--texto-sec);">Cargando historial...</div>';

    const { data: casos, error } = await conexionSupabase
        .from('consultas')
        .select('id, motivo_consulta, diagnostico_presuntivo, created_at, pacientes ( nombre )')
        .eq('organizacion_id', organizacionIdActual)
        .eq('medico_id', usuarioActualId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error al cargar historial:", error);
        contenedor.innerHTML = '<div style="text-align:center; padding: 20px; color: red;">Error al cargar</div>';
        return;
    }

    if (!casos || casos.length === 0) {
        contenedor.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--texto-sec);">No hay casos recientes.</div>';
        return;
    }

    contenedor.innerHTML = '';
    casos.forEach(caso => {
        const fechaObj = new Date(caso.created_at);
        let fechaStr = '';
        if (!isNaN(fechaObj)) {
            const dateStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
            const timeStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            fechaStr = `${dateStr} • ${timeStr}`;
        }
        const nombreMascota = caso.pacientes?.nombre || 'N/A';
        const diagnostico = caso.diagnostico_presuntivo || 'Sin diagnóstico';

        contenedor.innerHTML += `
            <div style="padding: 12px; border-bottom: 1px solid var(--fondo-app); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--fondo-app)'" onmouseout="this.style.background='transparent'" onclick="window.location.assign('VETERINARIO_CONSULTA.html?idConsulta=${caso.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: var(--cobalto); font-size: 13px;">${nombreMascota}</strong>
                    <span style="font-size: 11px; color: var(--texto-sec); background: white; padding: 2px 6px; border-radius: 10px; border: 1px solid #eee;">${fechaStr}</span>
                </div>
                <div style="font-size: 12px; color: var(--texto-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${caso.motivo_consulta || 'Sin motivo especificado'}
                </div>
                <div style="font-size: 11px; color: var(--naranja); margin-top: 4px;">
                    ${diagnostico}
                </div>
            </div>
        `;
    });
}

window.iniciarConsulta = async (idCita, idPaciente) => {
    // 1. Obtener la cita activa reconocida por el sistema (la primera en_consulta)
    const { data: citasActivas } = await conexionSupabase
        .from('citas')
        .select('id, estado')
        .eq('organizacion_id', organizacionIdActual)
        .eq('estado', 'en_consulta')
        .eq('medico_id', usuarioActualId)
        .limit(1);

    // 2. Si hay una consulta activa registrada, SOLO podemos acceder a ESA
    if (citasActivas && citasActivas.length > 0) {
        const idCitaActivaReal = citasActivas[0].id;
        if (idCita !== idCitaActivaReal) {
            if (typeof alertaCustom === 'function') {
                alertaCustom('Consulta en curso', 'Ya tienes una consulta activa en este momento. Termínala antes de iniciar otra.', 'warning');
            } else {
                alert('Ya tienes una consulta activa en este momento. Termínala antes de iniciar otra.');
            }
            return;
        }
    } else {
        // 3. Si no hay activas, marcamos esta nueva como en_consulta
        const hora = new Date().toISOString();
        await conexionSupabase.from('citas').update({ estado: "en_consulta", hora_llegada_real: hora }).eq('id', idCita);
    }

    // 3. Preparar el estado para el módulo de consulta
    window._agendaDatos = { citaId: idCita, pacienteId: idPaciente };
    sessionStorage.setItem('idCitaActiva', idCita);
    sessionStorage.setItem('idPacienteActivo', idPaciente);
    sessionStorage.setItem('iniciarConsultaDirecta', 'true');

    // 4. Navegar al módulo de consulta
    if (typeof window.cargarModulo === 'function') {
        window.cargarModulo('MODULO_VETERINARIO_CONSULTA');
    } else {
        // Fallback
        window.location.assign(`VETERINARIO_CONSULTA.html?idCita=${idCita}&idPaciente=${idPaciente}`);
    }
};



async function monitorearAtendidosMes() {
    const d = new Date();
    const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const { count } = await conexionSupabase.from('agenda_citas').select('*', { count: 'exact', head: true })
        .eq('medico_id', usuarioActualId).eq('estado', 'finalizada').gte('fecha', inicio);
    if (document.getElementById('txtPacientesAtendidos')) document.getElementById('txtPacientesAtendidos').innerText = count || 0;
}

let canalAlertasInventario = null;

function iniciarSistemaAlertas() {
    // 1. Cargar notificaciones existentes (Calculadas desde inventario_productos)
    cargarNotificacionesDashboard();

    // 2. Escuchar cambios en tiempo real en la tabla inventario_productos
    if (canalAlertasInventario) {
        conexionSupabase.removeChannel(canalAlertasInventario);
    }

    canalAlertasInventario = conexionSupabase.channel('alertas_inventario');
    
    canalAlertasInventario
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'inventario_productos', 
            filter: `organizacion_id=eq.${organizacionIdActual}` 
        }, (p) => {
            // El panel de notificaciones ya maneja esto, pero podemos disparar su recarga si queremos.
            // Por ahora solo reproducimos el sonido en el dashboard.
            if (parseFloat(p.new.stock_total || 0) <= parseFloat(p.new.stock_minimo || 0)) {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e=>console.log(e));
            }
        })
        .subscribe();

    // Sincronizar widget con el panel de notificaciones central
    window.removeEventListener('petprotect:notifs_actualizadas', cargarNotificacionesDashboard);
    window.addEventListener('petprotect:notifs_actualizadas', cargarNotificacionesDashboard);
    
    const btnVerMas = document.getElementById('btnVerNotificaciones');
    if (btnVerMas) {
        btnVerMas.addEventListener('click', () => {
            document.getElementById('btn-notificaciones')?.click();
        });
    }

    // 3. Inicializar Firebase Cloud Messaging
    inicializarFirebasePush();
}

async function cargarNotificacionesDashboard() {
    const lista = document.getElementById('listaNotificacionesDashboard');
    if (!lista) return;

    // Usar la fuente de verdad centralizada (panel_notificaciones.js)
    const todasNotificaciones = window._petprotect_notifs || [];

    // Ordenar y limitar a las últimas 4
    const notificacionesMostrar = todasNotificaciones.slice(0, 4);

    if (notificacionesMostrar.length === 0) {
        lista.innerHTML = `<li class="item-notificacion" style="justify-content: center; color: #888; font-size: 0.9rem;">No hay notificaciones activas. ¡Todo bien!</li>`;
        return;
    }

    const metaMap = {
        stock:    { icono: 'inventory_2', color: 'var(--naranja, #f97316)' },
        cita:     { icono: 'calendar_month', color: 'var(--cobalto-suave, #89c2d9)' },
        lote:     { icono: 'warning', color: '#ef4444' },
        vacuna:   { icono: 'vaccines', color: '#10b981' },
        caja:     { icono: 'point_of_sale', color: 'var(--cobalto, #032f40)' }
    };

    let html = '';
    notificacionesMostrar.forEach(n => {
        const meta = metaMap[n.tipo] || { icono: 'notifications', color: '#666' };

        // Tiempo relativo simple
        const diffMinutos = Math.floor((new Date() - new Date(n.created_at)) / 60000);
        let fechaText = '';
        if (diffMinutos < 60) fechaText = diffMinutos < 1 ? 'Ahora' : `Hace ${diffMinutos}m`;
        else if (diffMinutos < 1440) fechaText = `Hace ${Math.floor(diffMinutos/60)}h`;
        else fechaText = `Hace ${Math.floor(diffMinutos/1440)}d`;

        html += `
        <li class="item-notificacion" style="cursor:pointer;" onclick="document.getElementById('btn-notificaciones')?.click();">
            <span class="material-symbols-rounded icono-notif" style="color: ${meta.color}">${meta.icono}</span>
            <div class="texto-notif">
                <strong>${n.titulo || 'Notificación'}</strong>
                <span style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${n.mensaje || ''}</span>
                <span class="fecha-notif" style="color:var(--naranja); font-weight:bold;">${fechaText}</span>
            </div>
        </li>`;
    });
    lista.innerHTML = html;
}

// ====================================================================================
// FIREBASE CLOUD MESSAGING (PUSH BACKGROUND)
// ====================================================================================
async function inicializarFirebasePush() {
    const firebaseConfig = {
        apiKey: "AIzaSyAiViaTebE25FgFqnp4j8glDxaENcKqrrk",
        authDomain: "protect-pet.firebaseapp.com",
        projectId: "protect-pet",
        storageBucket: "protect-pet.firebasestorage.app",
        messagingSenderId: "143773812000",
        appId: "1:143773812000:web:2d59e3f38aa6caf7948345"
    };

    try {
        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // Solicitar permisos al navegador
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notificaciones Push permitidas.');
            
            // Reemplaza "TU_VAPID_KEY" con la llave VAPID de tu proyecto Firebase (pestaña Cloud Messaging)
            // Si la omites, algunas versiones de Firebase pueden fallar.
            try {
                const token = await getToken(messaging, { 
                    vapidKey: 'BMT-Y4k8D4d6aN5cM_E2v4d7b7B_9O3q3bQxXj-yL9m5yN1d6hZ_3qT7xL8v9A_b2zZ5k4mJ_9tY1yN5qT8' // VAPID Placeholder
                });
                
                if (token) {
                    console.log('Firebase Token obtenido:', token);
                    // Aquí deberías guardar este token en Supabase en el perfil del usuario:
                    // await conexionSupabase.from('perfiles').update({ fcm_token: token }).eq('id', usuarioActualId);
                }
            } catch (err) {
                console.warn('No se pudo obtener el token VAPID. Faltan llaves válidas:', err);
            }

            // Escuchar mensajes cuando la app está ABIERTA (Foreground)
            onMessage(messaging, (payload) => {
                console.log('Mensaje recibido en foreground ', payload);
                const notificationTitle = payload.notification?.title || 'Protect Pet';
                const notificationOptions = {
                    body: payload.notification?.body,
                    icon: '/favicon.ico'
                };

                new Notification(notificationTitle, notificationOptions);
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e=>console.log(e));
            });

        } else {
            console.log('Permiso de notificaciones denegado.');
        }
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
    }
}


let scannerChannel = null;

function configurarBotonScanner() {
    const btnScanner = document.getElementById('btnVerHorario');
    const modalEscaner = document.getElementById('escanerOverlay');
    const btnCerrar = document.getElementById('btnCerrarEscanerModal');
    const qrCanvas = document.getElementById('escanerQrCanvas');
    const pinTxt = document.getElementById('escanerPinTxt');
    const statusIcon = document.getElementById('escanerStatusIcon');
    const statusTxt = document.getElementById('escanerStatusTxt');
    const feedbackBox = document.getElementById('escanerFeedback');
    const feedbackCode = document.getElementById('escanerFeedbackCode');

    if (!btnScanner || !modalEscaner) return;

    btnScanner.addEventListener('click', () => {
        // Mover el modal al body para evitar que el contexto de apilamiento lo deje por debajo del nav
        if (modalEscaner.parentElement !== document.body) {
            document.body.appendChild(modalEscaner);
        }
        modalEscaner.style.display = 'flex';
        iniciarSesionScanner();
    });

    btnCerrar.addEventListener('click', () => {
        modalEscaner.style.display = 'none';
        // NO removemos el canal aquí para que siga escuchando en background
    });

    async function iniciarSesionScanner() {
        // Generar PIN aleatorio de 6 caracteres
        const sesionId = Math.random().toString(36).substring(2, 8).toUpperCase();
        pinTxt.textContent = sesionId;

        // Limpiar UI
        statusIcon.textContent = 'pending';
        statusIcon.style.color = '#F27405';
        statusTxt.textContent = 'Esperando conexión...';
        statusTxt.style.color = '#6b7a80';
        feedbackBox.style.display = 'none';

        // Generar URL para el QR
        let baseUrl = window.location.origin;
        if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            baseUrl = 'https://protect-pet.web.app'; // Usar la URL en vivo si estamos en entorno local, para que el celular lo alcance
        }
        const escanerUrl = `${baseUrl}/ESCANER_MOVIL.html?sesion=${sesionId}`;
        
        try {
            await QRCode.toCanvas(qrCanvas, escanerUrl, {
                width: 180,
                margin: 2,
                color: {
                    dark: '#032F40',
                    light: '#FFFFFF'
                }
            });
        } catch (e) {
            console.error('Error generando QR', e);
        }

        // Conectar a Supabase Realtime
        if (scannerChannel) {
            conexionSupabase.removeChannel(scannerChannel);
        }

        scannerChannel = conexionSupabase.channel(`scanner_${sesionId}`, {
            config: {
                broadcast: { ack: true }
            }
        });
        
        scannerChannel.on('broadcast', { event: 'scan' }, (payload) => {
            const data = payload.payload;
            
            // Mostrar feedback
            feedbackBox.style.display = 'block';
            feedbackCode.textContent = data.codigo_barras;

            // Reproducir sonido
            const beep = new Audio('https://www.soundjay.com/button/beep-07.wav');
            beep.play().catch(e=>console.log(e));

            // Guardar código escaneado en variable global para que otros módulos (como Caja Registradora) lo puedan consumir
            window.ultimoCodigoEscaneado = data.codigo_barras;
            
            // Emitir evento global (CustomEvent) para que la caja registradora lo escuche
            window.dispatchEvent(new CustomEvent('escanerRemotoDetectado', { detail: data.codigo_barras }));

            // Enviar acuse de recibo al celular
            scannerChannel.send({
                type: 'broadcast',
                event: 'ack',
                payload: { codigo: data.codigo_barras }
            });
            
            setTimeout(() => {
                feedbackBox.style.display = 'none';
            }, 3000);
        });

        scannerChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                statusIcon.textContent = 'check_circle';
                statusIcon.style.color = '#4CAF50';
                statusTxt.textContent = 'Escáner conectado (Esperando lecturas...)';
                statusTxt.style.color = '#4CAF50';
            }
        });
    }
}

async function cerrarSesionApp(e) {
    if(e) e.preventDefault();
    await conexionSupabase.auth.signOut();
    // window.location.assign("LOGIN.html");
}
