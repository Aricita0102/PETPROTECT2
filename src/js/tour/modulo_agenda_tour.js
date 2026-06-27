// ==========================================
// TOUR GUIADO — AGENDA CLÍNICA
// ==========================================
import '../../css/modulo_veteri_dashboard_tour.css';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const CLAVE_TOUR_AGENDA = 'tour_agenda_completado';

function construirPasos() {
    const pasosDeseados = [
        {
            element: '.buscador-predictivo',
            popover: {
                title: 'Buscador Inteligente',
                description: 'Encuentra citas rápidamente buscando por nombre de la mascota, nombre del propietario o número de expediente.',
                side: 'bottom'
            }
        },
        {
            element: 'button[onclick="window.abrirModalNuevaCita()"]',
            popover: {
                title: 'Agendar Cita',
                description: 'Haz clic aquí para crear una nueva cita médica. Podrás buscar pacientes existentes o registrar uno nuevo al vuelo.',
                side: 'bottom'
            }
        },
        {
            element: '.sidebar',
            popover: {
                title: 'Filtros y Mini Calendario',
                description: 'Navega rápidamente entre fechas con el mini calendario y filtra las citas por color según su tipo (Consulta, Cirugía, Vacunación, etc).',
                side: 'right'
            }
        },
        {
            element: '.resumen-row',
            popover: {
                title: 'Panel de Estadísticas',
                description: 'Monitorea en tiempo real el flujo de tu clínica hoy: Cuántas citas tienes confirmadas, canceladas o ya finalizadas.',
                side: 'bottom'
            }
        },
        {
            element: '.toolbar',
            popover: {
                title: 'Navegación Principal',
                description: 'Avanza y retrocede en los días. También puedes cambiar la vista entre Día, Semana y Mes, y filtrar por Estado (Confirmada, No Asistió).',
                side: 'bottom'
            }
        },
        {
            element: '.main-col',
            popover: {
                title: 'Línea de Tiempo (Calendario)',
                description: 'Aquí verás el cronograma de tus citas. Haz clic sobre cualquiera de ellas para abrir los detalles, iniciar la consulta o cancelarla.',
                side: 'left'
            }
        }
    ];

    return pasosDeseados.filter((paso) => document.querySelector(paso.element));
}

function crearInstanciaTour() {
    return driver({
        showProgress: true,
        progressText: 'Paso {{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        doneBtnText: 'Finalizar',
        popoverClass: 'tour-veterinario', // Reutilizamos tu clase premium
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.65,
        stagePadding: 6,
        stageRadius: 12,
        steps: construirPasos(),
        onDestroyed: () => {
            localStorage.setItem(CLAVE_TOUR_AGENDA, 'true');
        }
    });
}

export function iniciarTourAgenda() {
    const pasos = construirPasos();
    if (pasos.length === 0) return;
    crearInstanciaTour().drive();
}

export function iniciarTourAgendaSiEsPrimeraVez() {
    if (localStorage.getItem(CLAVE_TOUR_AGENDA) === 'true') return;
    setTimeout(() => {
        iniciarTourAgenda();
    }, 400);
}
