/**
 * @file modulo_seleccion_categoria.js
 * @description Módulo de control para la selección de categorías de inventario dentro de la SPA.
 * @module MenuInventario
 */

// Importamos la función centralizada de inyección del orquestador maestro
import { cargarModulo } from './vistas/principal_v2.js';
import { iniciarTourSeleccionCategoria, iniciarTourSeleccionCategoriaSiEsPrimeraVez } from './tour/modulo_seleccion_categoria_tour.js';

// Lista blanca de módulos de inventario autorizados (Seguridad Frontend)
const MODULOS_INVENTARIO_VALIDOS = [
  'MODULO_VETERINARIO_DASHBOARD',
  'MODULO_INVENTARIO_FARMACIA',
  'MODULO_INVENTARIO_TIENDA',
  'MODULO_INVENTARIO_INSUMOS',
  'MODULO_INVENTARIO_DIETAS',
  'MODULO_CENTRO_IMPRESION'
];

/**
 * Inicializa los eventos del menú de inventario.
 * Debe ser llamada cuando el componente se inyecte en el DOM.
 */
export function inicializarMenuInventario() {
  const contenedorInventario = document.getElementById('moduloSeleccionInventario');

  // Validación de seguridad y robustez
  if (!contenedorInventario) {
    console.warn('[PET PROTECT] Advertencia: Módulo de selección de inventario no encontrado en el DOM.');
    return;
  }

  // Delegación de eventos: un solo listener para todo el contenedor de categorías
  contenedorInventario.addEventListener('click', manejarNavegacionInventario);

  // Iniciar el tour interactivo al hacer clic en "Guía de uso"
  const btnGuiaUso = document.getElementById('btn-abrir-guia-uso');
  if (btnGuiaUso) {
    btnGuiaUso.addEventListener('click', () => iniciarTourSeleccionCategoria());
  }

  iniciarTourSeleccionCategoriaSiEsPrimeraVez();

  console.log('✔ [INVENTARIO] Listeners de categorías inicializados correctamente.');
}

/**
 * Maneja los clics dentro del módulo y delega la inyección al Orquestador SPA.
 * @param {Event} evento - Evento de clic del DOM.
 */
function manejarNavegacionInventario(evento) {
  // Buscamos el ancestro más cercano que contenga el atributo 'data-target'
  // Evita problemas si el usuario hace clic directamente en el icono (span) o en los textos
  const elementoClickeado = evento.target.closest('[data-target]');

  if (!elementoClickeado) return;

  const destinoClave = elementoClickeado.getAttribute('data-target');

  // Prevenimos cualquier comportamiento por defecto si se usaron etiquetas de enlace nativas
  evento.preventDefault();

  // Validación de seguridad (RBAC / Filtro Frontend)
  if (MODULOS_INVENTARIO_VALIDOS.includes(destinoClave)) {
    console.log(`🚀 [INVENTARIO] Redirección interna SPA hacia: ${destinoClave}`);
    
    // Ejecutamos la inyección controlada dentro del contenedor principal sin recargar
    cargarModulo(destinoClave);
  } else {
    console.error(`[PET PROTECT] Error de Seguridad: El módulo solicitado '${destinoClave}' no está registrado o autorizado.`);
  }
}