import { conexionSupabase } from '../../infraestructura/conexion.js';

// ==========================================================================
// 1. INICIALIZACIÓN DEL MÓDULO (Llamado por principal_v2.js)
// ==========================================================================
export async function inicializarModuloAgenda() {
    console.log("📅 [AGENDA] Módulo cargado correctamente.");
    configurarFechaCabecera();
    renderizarLineaTiempoMock();
    configurarListenersBotones();
}

// ==========================================================================
// 2. MANEJADORES DE INTERFAZ
// ==========================================================================
const configurarFechaCabecera = () => {
    const txtFechaActual = document.getElementById('txtFechaActual');
    const txtFechaLargaSeleccionada = document.getElementById('txtFechaLargaSeleccionada');
    
    const opcionesFormato = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaHoy = new Date().toLocaleDateString('es-MX', opcionesFormato);
    
    const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);
    
    if(txtFechaActual) txtFechaActual.textContent = fechaFormateada;
    if(txtFechaLargaSeleccionada) txtFechaLargaSeleccionada.textContent = "Hoy, " + new Date().getDate();
};

const configurarListenersBotones = () => {
    
    // --- LÓGICA DE PESTAÑAS (DÍA, SEMANA, MES) ---
    const botonesVista = document.querySelectorAll('.btn-vista');
    
    botonesVista.forEach(botonActual => {
        botonActual.addEventListener('click', () => {
            const vistaId = botonActual.getAttribute('data-vista');
            if (!vistaId) return;

            botonesVista.forEach(btn => btn.classList.remove('activo'));
            botonActual.classList.add('activo');

            const vistas = ['vista-dia', 'vista-semana', 'vista-mes'];
            vistas.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = (id === 'vista-' + vistaId) ? 'block' : 'none';
            });
        });
    });

    // --- LÓGICA DE FORMULARIO ---
    const btnGuardarCita = document.getElementById('btnGuardarCita');
    if(btnGuardarCita) {
        btnGuardarCita.addEventListener('click', (eventoGenerado) => {
            eventoGenerado.preventDefault();
            btnGuardarCita.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Guardado`;
            setTimeout(() => {
                btnGuardarCita.innerHTML = `<span class="material-symbols-rounded">event_available</span> Confirmar Cita`;
                const form = document.getElementById('formularioNuevaCita');
                if(form) form.reset();
            }, 2000);
        });
    }
};

// ==========================================================================
// 3. RENDERIZADO (MOCK)
// ==========================================================================
const renderizarLineaTiempoMock = () => {
    const contenedorCitasDinamicas = document.getElementById('contenedorCitasDinamicas');
    const contadorCitasActivas = document.getElementById('contadorCitasActivas');
    
    const arregloCitasMock = [
        { hora: "09:00", paciente: "Max (Golden Retriever)", estado: "estadoConfirmada", motivo: "Vacuna Quíntuple" },
        { hora: "10:30", paciente: "Luna (Siamesa)", estado: "estadoConsulta", motivo: "Revisión general" }
    ];

    if(contadorCitasActivas) contadorCitasActivas.textContent = `${arregloCitasMock.length} Programadas`;

    if(contenedorCitasDinamicas) {
        contenedorCitasDinamicas.innerHTML = arregloCitasMock.map(c => `
            <div class="tarjetaCitaSola ${c.estado}">
                <div class="horaCita">${c.hora}</div>
                <div class="infoCitaPac"><h4>${c.paciente}</h4><p>${c.motivo}</p></div>
            </div>
        `).join('');
    }
};

// ==========================================================================
// 4. DESTRUCCIÓN (LIMPIEZA SPA)
// ==========================================================================
export function destruirModulo() {
    console.log("🧹 [AGENDA] Módulo desmontado.");
}