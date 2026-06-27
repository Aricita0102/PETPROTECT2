// ==========================================
// TOUR GUIADO — EXPEDIENTE HISTORIAL (FULL)
// ==========================================
import '../../css/modulo_veteri_dashboard_tour.css';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const CLAVE_TOUR_EXPEDIENTE = 'tour_expediente_completado';

// Helper para cambiar de pestaña automáticamente durante el tour
function abrirPestana(targetSelector) {
    const tabBtn = document.querySelector(`[data-target="${targetSelector}"]`);
    if (tabBtn) tabBtn.click();
}

function construirPasos() {
    const pasosDeseados = [
        // ----------------- NAVEGACIÓN GLOBAL -----------------
        {
            element: '#navegacion-pestanas',
            popover: {
                title: 'Navegación del Expediente',
                description: 'Desde este menú superior puedes transitar por todas las áreas clínicas del paciente: Resumen, Historial, Estudios y Documentos legales.',
                side: 'bottom'
            }
        },
        
        // ----------------- PESTAÑA: RESUMEN -----------------
        {
            element: '.dashboard-header-card',
            popover: {
                title: 'Perfil y Acciones Rápidas',
                description: 'Aquí siempre tendrás a la vista los datos principales (Edad, Sexo, Tutor). También puedes agendar citas rápidamente.',
                side: 'bottom'
            },
            onHighlightStarted: () => abrirPestana('seccion-resumen')
        },
        {
            element: '#seccion-resumen .dashboard-grid',
            popover: {
                title: 'Panel de Control de Salud',
                description: 'Un vistazo rápido a las alertas médicas, última visita, evolución gráfica de su peso y nutrición actual.',
                side: 'top'
            },
            onHighlightStarted: () => abrirPestana('seccion-resumen')
        },

        // ----------------- PESTAÑA: HISTORIAL CLÍNICO -----------------
        {
            element: '#seccion-historial .panel-identidad .card:nth-child(1)',
            popover: {
                title: 'Identidad y Rasgos',
                description: 'Consulta o edita la foto, especie, raza y todos los identificadores oficiales (Microchip, SINIIGA).',
                side: 'right'
            },
            onHighlightStarted: () => abrirPestana('seccion-historial')
        },
        {
            element: '#seccion-historial .panel-identidad .card:nth-child(2)',
            popover: {
                title: 'Información del Tutor',
                description: 'Datos de contacto directo y número de emergencia siempre a la mano.',
                side: 'right'
            },
            onHighlightStarted: () => abrirPestana('seccion-historial')
        },
        {
            element: '#seccion-historial .panel-identidad .card:nth-child(3)',
            popover: {
                title: 'Alertas Médicas Críticas',
                description: 'Alergias, enfermedades crónicas y cirugías previas para evitar negligencias.',
                side: 'right'
            },
            onHighlightStarted: () => abrirPestana('seccion-historial')
        },
        {
            element: '#seccion-historial .panel-identidad .card:nth-child(4)',
            popover: {
                title: 'Manejo Integral',
                description: 'Notas sobre el temperamento (si muerde, tiene ansiedad), dieta específica y estado reproductivo.',
                side: 'right'
            },
            onHighlightStarted: () => abrirPestana('seccion-historial')
        },
        {
            element: '#btn-nueva-consulta-expediente',
            popover: {
                title: 'Añadir Consulta',
                description: 'Presiona este botón para iniciar una nueva consulta. Todo lo que registres se anclará automáticamente a esta línea de tiempo.',
                side: 'bottom'
            },
            onHighlightStarted: () => abrirPestana('seccion-historial')
        },
        {
            element: '.contenedor-timeline',
            popover: {
                title: 'Registro Clínico (Línea de Tiempo)',
                description: 'El historial completo, ordenado por fecha. Haz clic en cualquier Consulta, Vacuna o Estudio para desplegar sus notas y PDF.',
                side: 'left'
            },
            onHighlightStarted: () => abrirPestana('seccion-historial')
        },

        // ----------------- PESTAÑA: ESTUDIOS E IMÁGENES -----------------
        {
            element: '#seccion-estudios .panel-filtros',
            popover: {
                title: 'Filtros de Gabinete',
                description: 'Filtra el archivo por fechas o por modalidad (Radiografías, Ecos, Laboratorio, Citologías).',
                side: 'right'
            },
            onHighlightStarted: () => abrirPestana('seccion-estudios')
        },
        {
            element: '#btn-registrar-nuevo-estudio',
            popover: {
                title: 'Registrar Orden Médica',
                description: 'Crea una orden de estudio de imagen o laboratorio y adjunta los archivos DICOM o PDF cuando estén listos.',
                side: 'left'
            },
            onHighlightStarted: () => abrirPestana('seccion-estudios')
        },
        {
            element: '#contenedor-tabla-estudios',
            popover: {
                title: 'Archivo de Estudios',
                description: 'Listado completo de todos los estudios realizados al paciente.',
                side: 'top'
            },
            onHighlightStarted: () => abrirPestana('seccion-estudios')
        },

        // ----------------- PESTAÑA: DOCUMENTOS -----------------
        {
            element: '.documentos-bento-grid',
            popover: {
                title: 'Métricas Documentales',
                description: 'Conteo rápido del volumen de archivos clasificados por tipo (Consentimientos, Certificados, etc).',
                side: 'bottom'
            },
            onHighlightStarted: () => abrirPestana('seccion-documentos')
        },
        {
            element: '#btnAbrirModalNuevoDoc',
            popover: {
                title: 'Añadir Papelería',
                description: 'Puedes subir un archivo físico escaneado, o pedirle al sistema que genere automáticamente un formato (ej. Responsiva Anestésica).',
                side: 'left'
            },
            onHighlightStarted: () => abrirPestana('seccion-documentos')
        },
        {
            element: '#listaDocumentosExpediente',
            popover: {
                title: 'Bóveda de Archivos',
                description: 'Tu repositorio seguro. Puedes previsualizar, imprimir o descargar cualquier documento legal o clínico asociado.',
                side: 'top'
            },
            onHighlightStarted: () => abrirPestana('seccion-documentos')
        }
    ];

    // No filtramos por existencia porque los elementos están en display:none y document.querySelector() sí los encuentra en el DOM.
    // Solo validamos que no devuelvan nulo si es que el HTML cambiase.
    return pasosDeseados.filter((paso) => document.querySelector(paso.element));
}

function crearInstanciaTour() {
    return driver({
        showProgress: true,
        progressText: 'Sección {{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        doneBtnText: 'Terminar Tour',
        popoverClass: 'tour-veterinario', 
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.65,
        stagePadding: 6,
        stageRadius: 12,
        steps: construirPasos(),
        onDestroyed: () => {
            localStorage.setItem(CLAVE_TOUR_EXPEDIENTE, 'true');
            // Al terminar, volvemos al historial
            abrirPestana('seccion-historial');
        }
    });
}

export function iniciarTourExpediente() {
    const pasos = construirPasos();
    if (pasos.length === 0) return;
    crearInstanciaTour().drive();
}

export function iniciarTourExpedienteSiEsPrimeraVez() {
    if (localStorage.getItem(CLAVE_TOUR_EXPEDIENTE) === 'true') return;
    setTimeout(() => {
        iniciarTourExpediente();
    }, 400);
}
