// ==========================================
// CONTROLADOR DASHBOARD VETERINARIO (SUPABASE)
// Archivo: /src/js/veterinario_dashboard_logica.js
// ==========================================
import { conexionSupabase } from './conexion.js';

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

async function inicializarDashboardVeterinario() {
    try {
        actualizarFechaUI();

        // 1. Verificar sesión
        const { data: { user }, error: authError } = await conexionSupabase.auth.getUser();
        if (authError || !user) {
            window.location.assign("LOGIN.html");
            return;
        }
        usuarioActualId = user.id;

        // 2. Obtener perfil
        const { data: perfil, error: perfilError } = await conexionSupabase
            .from('perfiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (perfilError || !perfil) {
            alert("Error de cuenta. Contacte soporte.");
            cerrarSesionApp();
            return;
        }

        // 3. Guardián de clínica
        if (!perfil.organizacion_id || perfil.rol === 'nuevo') {
            window.location.assign("ONBOARDING.html");
            return;
        }

        organizacionIdActual = perfil.organizacion_id;

        // 4. Obtener Plan
        const { data: orgData } = await conexionSupabase
            .from('organizaciones')
            .select('plan_suscripcion')
            .eq('id', organizacionIdActual)
            .single();
        
        if (orgData) planOrganizacion = (orgData.plan_suscripcion || "INICIAL").toUpperCase();

        // 5. Renderizado de UI y Validación de acceso
        actualizarPerfilUI(perfil);
        gestionarAccesoVeterinario(perfil);

    } catch (error) {
        console.error("Error de inicialización:", error);
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
                window.location.assign("ADMINISTRADOR_DASHBOARD.html");
            };
        } else {
            btnRegresarAdmin.remove();
        }
    }
    
    // Cargar datos operativos
    cargarCitasEnEspera();
    monitorearAtendidosMes(); 
    iniciarSistemaAlertas();
}

function actualizarPerfilUI(datos) {
    const nombreLateral = document.getElementById('nombreLateral');
    const saludoHeader = document.getElementById('saludoHorario');
    const contenedorFoto = document.getElementById('fotoLateral');
    const nombreReal = datos.nombre_completo || "Veterinario";

    if (nombreLateral) nombreLateral.innerText = nombreReal;
    if (saludoHeader) saludoHeader.innerText = `Hola, Dr. ${nombreReal.split(" ")[0]}`;

    if (contenedorFoto && datos.avatar_url) {
        contenedorFoto.style.backgroundImage = `url('${datos.avatar_url}')`;
    }
}

async function cargarCitasEnEspera() {
    // Usamos el formato adecuado para comparar con fecha_hora (timestamp)
    const hoy = new Date().toISOString().split('T')[0];
    const contenedor = document.getElementById('contenedorCitasEspera');
    const contador = document.getElementById('contadorEspera');

    const { data: citas, error } = await conexionSupabase
        .from('citas') // <--- CAMBIADO DE 'agenda_citas' A 'citas'
        .select('*')
        .eq('organizacion_id', organizacionIdActual)
        .eq('medico_id', usuarioActualId) 
        .eq('estado', 'en_espera')
        // Filtramos por fecha_hora usando el formato ISO (YYYY-MM-DD)
        .gte('fecha_hora', `${hoy}T00:00:00`)
        .lte('fecha_hora', `${hoy}T23:59:59`)
        .order('fecha_hora', { ascending: true }); // <--- CAMBIADO 'hora' A 'fecha_hora'

    if (error) {
        console.error("Error al cargar citas:", error);
        return;
    }

    renderizarCitas(citas, contenedor, contador);
}

function renderizarCitas(citas, contenedor, contador) {
    if (!contenedor) return;
    contenedor.innerHTML = "";
    let total = 0;

    if (citas && citas.length > 0) {
        citas.forEach((cita) => {
            total++;
            contenedor.innerHTML += `
                <div class="citaFila" style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: bold; color: #032F40;">${cita.hora}</div>
                    <div style="flex: 1; margin-left: 15px;">
                        <strong style="color: #89C2D9;">${cita.nombre_mascota}</strong>
                        <p style="font-size: 0.8rem; margin: 0;">${cita.nombre_dueno}</p>
                    </div>
                    <button class="botonMini" style="background: #F27405; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="iniciarConsulta('${cita.id}', '${cita.paciente_id}')">Atender</button>
                </div>`;
        });
    } else {
        contenedor.innerHTML = `<div style="text-align: center; padding: 2rem;"><p>Sala vacía.</p></div>`;
    }
    if (contador) contador.innerText = `${total} citas`;
}

window.iniciarConsulta = async (idCita, idPaciente) => {
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    await conexionSupabase.from('agenda_citas').update({ estado: "en_consulta", hora_inicio_real: hora }).eq('id', idCita);
    window.location.assign(`VETERINARIO_CONSULTA.html?idCita=${idCita}&idPaciente=${idPaciente}`);
};

async function monitorearAtendidosMes() {
    const d = new Date();
    const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const { count } = await conexionSupabase.from('agenda_citas').select('*', { count: 'exact', head: true })
        .eq('medico_id', usuarioActualId).eq('estado', 'finalizada').gte('fecha', inicio);
    if (document.getElementById('txtPacientesAtendidos')) document.getElementById('txtPacientesAtendidos').innerText = count || 0;
}

function iniciarSistemaAlertas() {
    conexionSupabase.channel('alertas').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `organizacion_id=eq.${organizacionIdActual}` }, (p) => {
        if (p.new.tipo === 'urgencia_medica' && p.new.origen_id !== usuarioActualId) {
            document.getElementById('modalEmergenciaOverlay').style.display = "flex";
            document.getElementById('audioAlarma').play();
        }
    }).subscribe();
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarDashboardVeterinario();
    document.querySelectorAll('#btnCerrarSesion').forEach(btn => btn.addEventListener('click', cerrarSesionApp));
});

async function cerrarSesionApp(e) {
    if(e) e.preventDefault();
    await conexionSupabase.auth.signOut();
    window.location.assign("LOGIN.html");
}