import { obtenerUsuarioActual } from './infraestructura/conexion.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 0. Redirección si ya hay sesión (Guardián de Sesión)
    const usuarioActivo = await obtenerUsuarioActual();
    if (usuarioActivo) {
        window.location.assign('/PRINCIPAL.html');
        return;
    }
    
    /* ==========================================================================
       1. LÓGICA DEL MENÚ MÓVIL
       ========================================================================== */
    // Seleccionamos los elementos del DOM
    const botonMenu = document.querySelector('.botonMenuMovil');
    const menuNavegacion = document.querySelector('.menu');

    // Validamos que los elementos existan para evitar errores
    if (botonMenu && menuNavegacion) {
        // Escuchamos el evento de clic en el botón (Hamburguesa)
        botonMenu.addEventListener('click', () => {
            
            // Alternamos la clase 'activo' (que definimos en el CSS para mostrarlo)
            menuNavegacion.classList.toggle('activo');
            
            // lectores de pantalla si está abierto
            const estaAbierto = menuNavegacion.classList.contains('activo');
            botonMenu.setAttribute('aria-expanded', estaAbierto);
        });

        // Cerrar el menú si hacen clic en un enlace
        const enlacesMenu = menuNavegacion.querySelectorAll('a');
        enlacesMenu.forEach(enlace => {
            enlace.addEventListener('click', () => {
                menuNavegacion.classList.remove('activo');
                botonMenu.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ==========================================================================
       2. LÓGICA DE ANIMACIÓN 3D AL HACER SCROLL (Intersection Observer)
       ========================================================================== */
    // Seleccionamos todas las secciones que llevan la clase 'seccion-animada'
    const seccionesAnimadas = document.querySelectorAll('.seccion-animada');

    // Solo ejecutamos si hay secciones para animar
    if (seccionesAnimadas.length > 0) {
        const opcionesObserver = {
            root: null, // Usa la ventana del navegador (viewport)
            threshold: 0.15, // Se activa cuando el 15% de la sección ya es visible en pantalla
            rootMargin: "0px"
        };

        const observador = new IntersectionObserver((entradas, observador) => {
            entradas.forEach(entrada => {
                // Si la sección entra en el área visible...
                if (entrada.isIntersecting) {
                    // Agregamos la clase que dispara el efecto 3D en el CSS
                    entrada.target.classList.add('aparecer');
                    
                    // Opcional: Dejamos de observar la sección para que la animación 
                    // solo ocurra la primera vez que bajas. Si quieres que se repita siempre, 
                    // simplemente borra la línea de abajo.
                    observador.unobserve(entrada.target);
                }
            });
        }, opcionesObserver);

        // Le asignamos el observador a cada sección individualmente
        seccionesAnimadas.forEach(seccion => {
            observador.observe(seccion);
        });
    }
});