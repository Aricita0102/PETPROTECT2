// ==========================================
// CONTROLADOR DASHBOARD ADMINISTRADOR (SUPABASE)
// Archivo: /src/js/admin_dashboard_logica.js
// ==========================================
import { conexionSupabase } from './infraestructura/conexion.js';
import { obtenerSesionActiva } from './infraestructura/sesion_store.js';

let usuarioActualId = "";
let organizacionIdActual = "";
let egresosMensuales = 0;

// --- 1. UTILS: FECHA ---
const actualizarFecha = () => {
    const elFecha = document.getElementById('fechaActual');
    if (elFecha) {
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fechaHoy = new Date().toLocaleDateString('es-ES', opciones);
        elFecha.innerText = `Hoy es ${fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)}`;
    }
};

// --- 2. CORE: INICIALIZACIÓN Y PERFIL ---
async function inicializarDashboard() {
    try {
        // Verificar sesión activa a través del Singleton (0ms)
        const sesion = await obtenerSesionActiva();
        
        if (!sesion) {
            window.location.href = "LOGIN.html";
            return;
        }

        usuarioActualId = sesion.user.id;
        actualizarFecha();

        const perfil = sesion.perfil;
        organizacionIdActual = perfil.organizacion_id;
        actualizarUIPerfil(perfil);

        // Cargar datos iniciales
        await Promise.all([
            actualizarContadores(),
            actualizarTabla(),
            cargarFinanzas(),
            obtenerCodigoClinica()
        ]);

        // Iniciar listeners en tiempo real (Equivalente a onSnapshot)
        iniciarMonitoresTiempoReal();

    } catch (error) {
        console.error("[Dashboard] Error de inicialización:", error.message);
    }
}

function actualizarUIPerfil(u) {
    const txtNombreSide = document.getElementById('txtNombreAdminSide');
    const txtRolSide = document.getElementById('txtRolAdminSide'); 
    const saludo = document.getElementById('saludoNombre');
    const fotoSide = document.getElementById('sidebarFotoAdmin');

    if (txtNombreSide) txtNombreSide.innerText = u.nombre_completo || "Administrador";
    if (saludo) saludo.innerText = (u.nombre_completo) ? u.nombre_completo.split(" ")[0] : "Admin";
    if (txtRolSide) txtRolSide.innerText = (u.rol || "ADMINISTRADOR").toUpperCase();
    
    if (u.avatar_url && fotoSide) {
        fotoSide.style.backgroundImage = `url('${u.avatar_url}')`;
        fotoSide.style.backgroundSize = 'cover';
        fotoSide.style.backgroundPosition = 'center';
        fotoSide.style.backgroundColor = 'transparent';
    }
}

// --- 3. MONITOR DE MÉTRICAS (CONTADORES EXACTOS) ---
async function actualizarContadores() {
    const lblActivos = document.getElementById('contActivos');
    const lblPendientes = document.getElementById('contPendientes');

    // A. Contar Activos en esta clínica (usando count de Supabase)
    const { count: countActivos } = await conexionSupabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionIdActual)
        .eq('estatus', 'activo');

    if (lblActivos) lblActivos.innerText = (countActivos || 0).toString().padStart(2, '0');

    // B. Contar Pendientes / En revisión en esta clínica
    const { count: countPendientes } = await conexionSupabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionIdActual)
        .in('estatus', ['revision', 'pendiente']);

    if (lblPendientes) lblPendientes.innerText = (countPendientes || 0).toString().padStart(2, '0');
}

// --- 4. MONITOR DE TABLA (SOLO LOS RECIENTES) ---
async function actualizarTabla() {
    const tablaResumen = document.getElementById('tablaResumenPersonal');
    if (!tablaResumen) return;

    const { data: usuarios, error } = await conexionSupabase
        .from('perfiles')
        .select('*')
        .eq('organizacion_id', organizacionIdActual)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error cargando tabla:", error.message);
        return;
    }

    tablaResumen.innerHTML = "";

    if (!usuarios || usuarios.length === 0) {
        tablaResumen.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#888;">No hay personal registrado en esta clínica.</td></tr>`;
        return;
    }

    usuarios.forEach((u) => {
        const esYo = (u.id === usuarioActualId);
        
        let estatusRaw = u.estatus || "pendiente";
        let estatusLabel = estatusRaw.toUpperCase();
        let claseEstatus = estatusRaw;

        if (estatusRaw === "revision") { estatusLabel = "SOLICITUD"; claseEstatus = "pendiente"; }
        if (estatusRaw === "suspendido") { claseEstatus = "inactivo"; }

        let accionHtml = "";
        if (esYo) {
            accionHtml = `<span style="color: #89C2D9; font-weight: bold; font-size: 0.8rem;">(Tú)</span>`;
        } else if (estatusRaw === "revision" || estatusRaw === "pendiente") {
            accionHtml = `<button class="btn-naranja-chico" onclick="window.location.href='ADMINISTRADOR_GESTION_USUARIOS.html?filtro=pendientes'">Revisar</button>`;
        } else {
            accionHtml = `<button class="btn-naranja-chico" style="background-color: #032F40;" onclick="window.location.href='ADMINISTRADOR_GESTION_USUARIOS.html?filtro=activos'">Ver</button>`;
        }

        const nombreDisplay = u.nombre_completo || u.email || 'Usuario';
        const rolDisplay = (u.rol || 'usuario').toUpperCase();

        tablaResumen.innerHTML += `
            <tr>
                <td><strong>${nombreDisplay}</strong></td>
                <td style="color: #89C2D9; font-weight: bold;">${rolDisplay}</td>
                <td><span class="status ${claseEstatus}">${estatusLabel}</span></td>
                <td>${accionHtml}</td>
            </tr>`;
    });
}

// --- 5. FINANZAS (PUNTO DE EQUILIBRIO) ---
async function cargarFinanzas() {
    const inputEgresos = document.getElementById('inputEgresos');
    const btnGuardar = document.getElementById('btnGuardarEgresos');

    // Cargar gastos fijos guardados previamente
    const { data: config } = await conexionSupabase
        .from('configuracion_finanzas')
        .select('egresos_mensuales')
        .eq('organizacion_id', organizacionIdActual)
        .single();

    if (config) {
        egresosMensuales = parseFloat(config.egresos_mensuales) || 0;
        if (inputEgresos && document.activeElement !== inputEgresos) {
            inputEgresos.value = egresosMensuales > 0 ? egresosMensuales : "";
        }
    }

    // Calcular Punto de Equilibrio actual
    await calcularPuntoEquilibrio();

    // Evento de guardado (Upsert = Update o Insert si no existe)
    if (btnGuardar) {
        btnGuardar.addEventListener('click', async () => {
            const valor = parseFloat(inputEgresos.value);
            if (isNaN(valor) || valor < 0) { alert("Ingresa un monto válido"); return; }
            
            try {
                btnGuardar.innerHTML = `<span class="material-symbols-rounded">sync</span>`;
                btnGuardar.disabled = true;

                const { error } = await conexionSupabase
                    .from('configuracion_finanzas')
                    .upsert({ 
                        organizacion_id: organizacionIdActual,
                        egresos_mensuales: valor,
                        actualizado_por: usuarioActualId,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'organizacion_id' }); // Llave primaria requerida para upsert
                
                if (error) throw error;
                
                egresosMensuales = valor;
                await calcularPuntoEquilibrio();
                
                btnGuardar.innerHTML = `<span class="material-symbols-rounded">save</span>`;
                btnGuardar.disabled = false;

            } catch(e) {
                console.error("Error guardando finanzas:", e);
                alert("Error al guardar en la base de datos.");
                btnGuardar.innerHTML = `<span class="material-symbols-rounded">save</span>`;
                btnGuardar.disabled = false;
            }
        });
    }
}

async function calcularPuntoEquilibrio() {
    // Obtener cobros pagados de la clínica
    const { data: ventas } = await conexionSupabase
        .from('avisos_cobro')
        .select('monto_total')
        .eq('organizacion_id', organizacionIdActual)
        .eq('estatus', 'pagado');

    let totalIngresos = 0;
    let numeroVentas = 0;

    if (ventas) {
        ventas.forEach(v => {
            totalIngresos += parseFloat(v.monto_total) || 0;
            numeroVentas++;
        });
    }

    const txtEquilibrio = document.getElementById('txtClientesMeta');
    const txtDetalle = document.getElementById('txtDetalleEquilibrio');

    if (numeroVentas > 0 && egresosMensuales > 0) {
        const ticketPromedio = totalIngresos / numeroVentas;
        const clientesNecesarios = Math.ceil(egresosMensuales / ticketPromedio);
        
        if(txtEquilibrio) txtEquilibrio.innerText = clientesNecesarios;
        if(txtDetalle) txtDetalle.innerText = `Meta de clientes (Ticket Promedio: $${ticketPromedio.toFixed(2)})`;
        
    } else if (egresosMensuales > 0) {
        if(txtEquilibrio) txtEquilibrio.innerText = "--";
        if(txtDetalle) txtDetalle.innerText = "Esperando ventas para calcular...";
    } else {
        if(txtEquilibrio) txtEquilibrio.innerText = "0";
        if(txtDetalle) txtDetalle.innerText = "Ingresa tus gastos fijos para iniciar";
    }
}

// --- 6. CÓDIGO CLÍNICA (SISTEMA DE INVITACIONES) ---
async function obtenerCodigoClinica() {
    const txtCodigo = document.getElementById('codigoActual');
    if (!txtCodigo) return;

    // Buscamos el código que generamos en el onboarding dentro de la tabla 'invitaciones'
    const { data: invitacion } = await conexionSupabase
        .from('invitaciones')
        .select('codigo_acceso')
        .eq('organizacion_id', organizacionIdActual)
        .limit(1)
        .single();

    txtCodigo.innerText = invitacion ? invitacion.codigo_acceso : "SIN-CÓDIGO";
}

// --- 7. MONITORES EN TIEMPO REAL (REEMPLAZO DE ONSNAPSHOT) ---
function iniciarMonitoresTiempoReal() {
    // Escuchar cambios en la tabla perfiles (nuevos usuarios, altas, suspensiones)
    conexionSupabase.channel('monitoreo_equipo')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => {
            console.log("[Realtime] Cambio detectado en el personal. Actualizando interfaz...");
            actualizarContadores();
            actualizarTabla();
        })
        .subscribe();

    // Escuchar cambios en la tabla de cobros para ajustar el punto de equilibrio en vivo
    conexionSupabase.channel('monitoreo_finanzas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos_cobro' }, () => {
            console.log("[Realtime] Nuevo cobro registrado. Recalculando finanzas...");
            calcularPuntoEquilibrio();
        })
        .subscribe();
}

// --- 8. EVENTOS GLOBALES ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Arrancar el motor del dashboard
    inicializarDashboard();

    // Botón Cerrar Sesión
    const btnCerrar = document.getElementById('btnCerrarSesion');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', async (e) => {
            e.preventDefault();
            await conexionSupabase.auth.signOut();
            window.location.href = "LOGIN.html";
        });
    }

    // Botón Ver Solicitudes
    const btnSolicitudes = document.getElementById('btnVerSolicitudes');
    if(btnSolicitudes) {
        btnSolicitudes.addEventListener('click', () => {
            window.location.href = 'ADMINISTRADOR_GESTION_USUARIOS.html?filtro=pendientes';
        });
    }
});