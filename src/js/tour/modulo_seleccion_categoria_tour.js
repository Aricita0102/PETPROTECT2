// ==========================================
// TOUR GUIADO — SELECCIÓN CATEGORÍA INVENTARIO
// ==========================================
import '../../css/modulo_veteri_dashboard_tour.css';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const CLAVE_TOUR_COMPLETADO = 'tour_seleccion_categoria_completado';

/**
 * Construye los pasos del tour dinámicamente.
 */
function construirPasos() {
    const pasosDeseados = [
        {
            element: '[data-testid="btn-volver-dashboard"]',
            popover: {
                title: 'Menú de navegación',
                description: 'Usa este botón para regresar rápidamente al Dashboard en cualquier momento.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#catTiendaMostrador',
            popover: {
                title: 'Tienda y Mostrador',
                description: 'Para productos de venta libre orientados al público general. Ej: Alimento de mantenimiento, premios, correas, ropa, juguetes y accesorios.',
                side: 'bottom'
            }
        },
        {
            element: '#catDietasPrescripcion',
            popover: {
                title: 'Dietas de Prescripción',
                description: 'Para alimento medicado o terapéutico que requiere indicación del Veterinario. Ej: Dietas renales, hepáticas, urinarias, gastrointestinales e hipoalergénicas.',
                side: 'bottom'
            }
        },
        {
            element: '#catCentroImpresion',
            popover: {
                title: 'Centro de Impresión',
                description: 'Genera rápidamente etiquetas y códigos de barras. Muy útil para etiquetar productos fraccionados o material re-empaquetado al ingresar nuevo stock.',
                side: 'top'
            }
        },
        {
            element: '#catFarmaciaClinica',
            popover: {
                title: 'Próximamente',
                description: 'Los módulos de Farmacia Clínica e Insumos Médicos están deshabilitados temporalmente porque se encuentran en construcción. ¡Estarán disponibles en una próxima actualización!',
                side: 'right'
            }
        }
    ];

    // Filtramos solo los elementos que existen en el DOM
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
            localStorage.setItem(CLAVE_TOUR_COMPLETADO, 'true');
        }
    });
}

/**
 * Inicia el tour manualmente (ej. al presionar el botón "Guía de uso").
 */
export function iniciarTourSeleccionCategoria() {
    const pasos = construirPasos();
    if (pasos.length === 0) return;
    crearInstanciaTour().drive();
}

export function iniciarTourSeleccionCategoriaSiEsPrimeraVez() {
    if (localStorage.getItem(CLAVE_TOUR_COMPLETADO) === 'true') return;
    setTimeout(() => {
        iniciarTourSeleccionCategoria();
    }, 400);
}
