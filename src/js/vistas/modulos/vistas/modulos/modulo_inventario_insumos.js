/**
 * MÓDULO: Inventario de Insumos Clínicos (PET PROTECT)
 * DESCRIPCIÓN: Gestión de material de curación, quirúrgico y descartables.
 * ARQUITECTURA: Vite / Supabase
 */

export function inicializarInventarioInsumos() {
    console.log("🩹 [INSUMOS] Inicializando catálogo de material clínico...");

    inicializarBuscadorYFiltrosInsumos();
    configurarModalNuevoInsumo();
    configurarModalBentoDinamico();
}

// ==========================================
// 1. LÓGICA DEL MODAL: NUEVO INSUMO
// ==========================================
function configurarModalNuevoInsumo() {
    const btnAbrirModal = document.getElementById('btn-abrir-modal-insumo');
    const modalInsumo = document.getElementById('modal-nuevo-insumo');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-insumo');
    const btnCancelarModal = document.getElementById('btn-cancelar-insumo');
    const formNuevoInsumo = document.getElementById('form-nuevo-insumo');

    if (!btnAbrirModal || !modalInsumo || !formNuevoInsumo) {
        console.warn("⚠️ [INSUMOS] Elementos del modal de registro no encontrados.");
        return;
    }

    const abrirModal = () => {
        modalInsumo.classList.add('visible');
        modalInsumo.setAttribute('aria-hidden', 'false');
        setTimeout(() => document.getElementById('ins-nombre').focus(), 300);
    };

    const cerrarModal = () => {
        modalInsumo.classList.remove('visible');
        modalInsumo.setAttribute('aria-hidden', 'true');
        formNuevoInsumo.reset(); 
    };

    btnAbrirModal.addEventListener('click', abrirModal);
    btnCerrarModal.addEventListener('click', cerrarModal);
    btnCancelarModal.addEventListener('click', cerrarModal);

    modalInsumo.addEventListener('click', (e) => {
        if (e.target === modalInsumo) cerrarModal();
    });

    formNuevoInsumo.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnGuardar = formNuevoInsumo.querySelector('button[type="submit"]');
        const contenidoOriginalBtn = btnGuardar.innerHTML;
        
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Guardando...`;
        btnGuardar.style.opacity = "0.7";
        btnGuardar.style.cursor = "not-allowed";

        const nuevoInsumo = {
            nombre: document.getElementById('ins-nombre').value.trim(),
            marca: document.getElementById('ins-marca').value.trim(),
            categoria: document.getElementById('ins-categoria').value,
            unidad: document.getElementById('ins-unidad').value,
            codigo: document.getElementById('ins-codigo').value.trim(),
            stockActual: parseInt(document.getElementById('ins-stock').value, 10) || 0,
            stockMinimo: parseInt(document.getElementById('ins-minimo').value, 10) || 5,
            esEsteril: document.getElementById('ins-esteril').checked
        };

        console.log("📦 [INSUMOS] Paquete listo para BD:", nuevoInsumo);

        try {
            // Aquí iría tu inserción a Supabase
            await new Promise(resolve => setTimeout(resolve, 1200)); 
            alert(`✅ ¡Insumo "${nuevoInsumo.nombre}" registrado correctamente!`);
            cerrarModal();
        } catch (error) {
            console.error("💥 [ERROR BD] Fallo al registrar insumo:", error);
            alert("Error al conectar con el servidor.");
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = contenidoOriginalBtn;
            btnGuardar.style.opacity = "1";
            btnGuardar.style.cursor = "pointer";
        }
    });
}

// ==========================================
// 2. BUSCADOR Y FILTROS
// ==========================================
function inicializarBuscadorYFiltrosInsumos() {
    const inputBusqueda = document.getElementById('input-busqueda-insumo');
    const selectFiltro = document.getElementById('select-filtro-insumo');
    const filasTabla = document.querySelectorAll('#tabla-productos-insumos tbody tr');

    if (!inputBusqueda || !selectFiltro || filasTabla.length === 0) return;

    const aplicarFiltros = () => {
        const terminoBusqueda = inputBusqueda.value.toLowerCase().trim();
        const criterioCategoria = selectFiltro.value.toLowerCase();

        filasTabla.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            const cumpleBusqueda = textoFila.includes(terminoBusqueda);
            
            let cumpleFiltro = true;
            if (criterioCategoria !== 'todos') {
                const celdaCategoria = fila.querySelector('td:nth-child(2)').textContent.toLowerCase();
                cumpleFiltro = celdaCategoria.includes(criterioCategoria);
            }

            fila.style.display = (cumpleBusqueda && cumpleFiltro) ? '' : 'none';
        });
    };

    inputBusqueda.addEventListener('input', aplicarFiltros);
    selectFiltro.addEventListener('change', aplicarFiltros);
}

// ==========================================
// 3. INYECCIÓN DEL PANEL BENTO LATERAL
// ==========================================
function configurarModalDetalleBento() {
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');
    const tablaInsumos = document.getElementById('tabla-productos-insumos');

    if (tablaInsumos && contenedorModalDinamico) {
        tablaInsumos.addEventListener('click', async (e) => {
            const botonEditar = e.target.closest('.btn-editar-insumo') || e.target.closest('.boton-fantasma-icono');
            
            if (botonEditar) {
                e.preventDefault();
                botonEditar.style.opacity = '0.5';

                try {
                    const basePath = window.location.pathname.includes('/PETPROTECT') ? '/PETPROTECT' : '';
                    // 🚨 Apuntamos al nuevo HTML del modal de insumos
                    const rutaModal = `${basePath}/MODAL_INFORMACION_PRODUCTO_INSUMO.html`; 

                    const respuesta = await fetch(rutaModal);
                    if (!respuesta.ok) throw new Error("Fallo al obtener el layout del panel Bento de Insumos.");
                    
                    const htmlModal = await respuesta.text();
                    contenedorModalDinamico.innerHTML = htmlModal;

                    const modalFondoInsumo = document.getElementById('modal-detalle-insumo');
                    const btnCerrarPanelInsumo = document.getElementById('btn-cerrar-panel-insumo');

                    if (modalFondoInsumo) {
                        const cerrarPanelBento = () => {
                            modalFondoInsumo.classList.remove('visible');
                            modalFondoInsumo.setAttribute('aria-hidden', 'true');
                            setTimeout(() => contenedorModalDinamico.innerHTML = '', 300);
                        };

                        if (btnCerrarPanelInsumo) btnCerrarPanelInsumo.addEventListener('click', cerrarPanelBento);
                        
                        modalFondoInsumo.addEventListener('click', (evento) => {
                            if (evento.target === modalFondoInsumo) cerrarPanelBento();
                        });

                        setTimeout(() => {
                            modalFondoInsumo.classList.add('visible');
                            modalFondoInsumo.setAttribute('aria-hidden', 'false');
                            botonEditar.style.opacity = '1';
                        }, 50);
                    }

                } catch (error) {
                    console.error("💥 [ERROR DE INYECCIÓN] No se pudo levantar el panel Bento:", error);
                    alert("Error al cargar la ficha del insumo.");
                    botonEditar.style.opacity = '1';
                }
            }
        });
    }
}