// ==========================================
// TOUR GUIADO — DASHBOARD VETERINARIO (Protect Pet / DaAri)
// Archivo: /src/js/modulo_veterinario_dashboard_tour.js
// ==========================================
import '../../css/modulo_veteri_dashboard_tour.css';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const CLAVE_TOUR_COMPLETADO = 'tour_dashboard_veterinario_completado';

/**
 * Construye los pasos del tour. Si algún elemento no existe en el DOM
 * (por ejemplo por rol o por plan), se omite automáticamente.
 */
function construirPasos() {
    const pasosDeseados = [
        {
            element: '#barraBusqueda',
            popover: {
                title: 'Busca a tus pacientes',
                description: 'Escribe el nombre del paciente, del tutor o el ID y aparecerán resultados al instante.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#btnNuevaCita',
            popover: {
                title: 'Agenda una cita',
                description: 'Crea una nueva cita sin salir del Dashboard.',
                side: 'bottom'
            }
        },
        {
            element: '#btnNuevoIngreso',
            popover: {
                title: 'Registra un nuevo ingreso',
                description: 'Da de alta a un paciente nuevo en segundos.',
                side: 'bottom'
            }
        },
        {
            element: '#btnVerHorario',
            popover: {
                title: 'Escáner móvil',
                description: 'Usa tu celular como lector de código de barras conectándolo aquí.',
                side: 'bottom'
            }
        },
        {
            element: '#tarjetaConsultas',
            popover: {
                title: 'Agenda del día',
                description: 'Mira quién está en sala de espera y las próximas consultas.',
                side: 'top'
            }
        },
        {
            element: '#flipperCasos',
            popover: {
                title: 'Casos clínicos',
                description: 'Consulta tus casos atendidos del mes. Dale clic a "Historial" para ver el detalle.',
                side: 'top'
            }
        },
        {
            element: '#tarjetaIngresos',
            popover: {
                title: 'Ingresos',
                description: 'Filtra tus ingresos por origen o por periodo de tiempo.',
                side: 'top'
            }
        },
        {
            element: '#tarjetaNotificaciones',
            popover: {
                title: 'Notificaciones',
                description: 'Aquí verás tus últimas alertas y avisos importantes.',
                side: 'left'
            }
        }
    ];

    // Solo incluir pasos cuyo elemento exista realmente en el DOM
    return pasosDeseados.filter((paso) => document.querySelector(paso.element));
}

function crearInstanciaTour() {
    return driver({
        showProgress: true,
        progressText: 'Paso {{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        doneBtnText: 'Finalizar',
        popoverClass: 'tour-veterinario',
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.65,
        stagePadding: 6,
        stageRadius: 12,
        steps: construirPasos(),
        onDestroyed: () => {
            localStorage.setItem(CLAVE_TOUR_COMPLETADO, 'true');
        }
    });
}

/**
 * Inicia el tour manualmente (por ejemplo desde un botón de ayuda
 * con id="btnIniciarTourDashboard").
 */
export function iniciarTourDashboardVeterinario() {
    const pasos = construirPasos();
    if (pasos.length === 0) return;
    crearInstanciaTour().drive();
}

/**
 * Conecta el botón de ayuda (id="btnIniciarTourDashboard") para que
 * el usuario pueda iniciar el tour manualmente cuando quiera.
 */
export function conectarBotonTourDashboard() {
    const btn = document.getElementById('btnIniciarTourDashboard');
    if (!btn) return;
    btn.addEventListener('click', () => iniciarTourDashboardVeterinario());
}

/**
 * Inicia el tour automáticamente solo la primera vez que el usuario
 * visita el Dashboard. Debe llamarse después de que el contenido
 * principal ya esté pintado en el DOM.
 */
export function iniciarTourSiEsPrimeraVez() {
    if (localStorage.getItem(CLAVE_TOUR_COMPLETADO) === 'true') return;

    const pasos = construirPasos();
    if (pasos.length === 0) return;

    // Pequeño delay para asegurar que el layout terminó de pintarse
    setTimeout(() => {
        crearInstanciaTour().drive();
    }, 400);
}

/**
 * Permite reiniciar el tour (útil para un botón "Ver tour de nuevo"
 * en configuración).
 */
export function reiniciarTourDashboardVeterinario() {
    localStorage.removeItem(CLAVE_TOUR_COMPLETADO);
    iniciarTourDashboardVeterinario();
}
