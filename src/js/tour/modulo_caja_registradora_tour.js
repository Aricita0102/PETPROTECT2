// ==========================================
// TOUR GUIADO — CAJA REGISTRADORA (POS)
// ==========================================
import '../../css/modulo_veteri_dashboard_tour.css';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const CLAVE_TOUR_CAJA = 'tour_caja_registradora_completado';

function construirPasos() {
    const pasosDeseados = [
        {
            element: '#btn-caja-fullscreen',
            popover: {
                title: 'Modo Inmersivo',
                description: 'Activa la Pantalla Completa para evitar distracciones y operar la caja como un Punto de Venta tradicional de escritorio.',
                side: 'bottom'
            }
        },
        {
            element: '.caja-buscador-wrap',
            popover: {
                title: 'Buscador y Escáner',
                description: 'Escribe el nombre del producto, o mejor aún: usa el Escáner para leer el código de barras y agregarlo al ticket al instante.',
                side: 'bottom'
            }
        },
        {
            element: '.categorias',
            popover: {
                title: 'Filtros Rápidos',
                description: 'Navega ágilmente entre los catálogos de Tienda, Farmacia o Dietas con un solo clic.',
                side: 'top'
            }
        },
        {
            element: '#caja-grid-productos',
            popover: {
                title: 'Catálogo Visual',
                description: 'Toca cualquier producto con stock disponible para agregarlo a la cuenta del cliente. Si no hay existencias, el sistema lo bloqueará por seguridad.',
                side: 'right'
            }
        },
        {
            element: '.ticket',
            popover: {
                title: 'Cuenta del Cliente',
                description: 'Aquí verás todo lo que estás cobrando. Usa los controles (+ / -) para ajustar las cantidades o elimina ítems si hay un error.',
                side: 'left'
            }
        },
        {
            element: '#caja-resumen',
            popover: {
                title: 'Resumen Financiero',
                description: 'El sistema calcula automáticamente el Subtotal, el desglose de IVA (16%) y el total de la venta.',
                side: 'left'
            }
        },
        {
            element: '#caja-btn-cobrar',
            popover: {
                title: 'Liquidar y Entregar',
                description: 'Cuando el ticket esté listo, presiona Cobrar. Podrás elegir el método de pago, calcular el cambio y enviar el ticket por WhatsApp o imprimirlo.',
                side: 'top'
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
            localStorage.setItem(CLAVE_TOUR_CAJA, 'true');
        }
    });
}

export function iniciarTourCajaRegistradora() {
    const pasos = construirPasos();
    if (pasos.length === 0) return;
    crearInstanciaTour().drive();
}

export function iniciarTourCajaRegistradoraSiEsPrimeraVez() {
    if (localStorage.getItem(CLAVE_TOUR_CAJA) === 'true') return;
    setTimeout(() => {
        iniciarTourCajaRegistradora();
    }, 400);
}
