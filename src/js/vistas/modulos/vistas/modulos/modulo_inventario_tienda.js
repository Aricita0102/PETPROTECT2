/**
 * MÓDULO: Inventario de Tienda (PET PROTECT)
 * DESCRIPCIÓN: Gestión de productos retail, control de stock y modales de registro y detalle.
 * ARQUITECTURA: Vite / Supabase
 */

export function inicializarInventarioTienda() {
    console.log("🛍️ [TIENDA] Inicializando catálogo de mostrador...");

    inicializarBuscadorYFiltrosTienda();
    configurarModalNuevoProducto();
    configurarModalBentoDinamico();
}

// ==========================================
// 1. LÓGICA DEL MODAL: NUEVO PRODUCTO
// ==========================================
function configurarModalNuevoProducto() {
    const btnAbrirModal = document.getElementById('btn-abrir-modal-tienda');
    const modalTienda = document.getElementById('modal-nuevo-producto-tienda');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-tienda');
    const btnCancelarModal = document.getElementById('btn-cancelar-tienda');
    const formNuevoProducto = document.getElementById('form-nuevo-producto-tienda');

    if (!btnAbrirModal || !modalTienda || !formNuevoProducto) {
        console.warn("⚠️ [TIENDA] Elementos del modal de registro no encontrados.");
        return;
    }

    const abrirModal = () => {
        modalTienda.classList.add('visible');
        modalTienda.setAttribute('aria-hidden', 'false');
        setTimeout(() => document.getElementById('prod-nombre').focus(), 300);
    };

    const cerrarModal = () => {
        modalTienda.classList.remove('visible');
        modalTienda.setAttribute('aria-hidden', 'true');
        formNuevoProducto.reset(); 
    };

    btnAbrirModal.addEventListener('click', abrirModal);
    btnCerrarModal.addEventListener('click', cerrarModal);
    btnCancelarModal.addEventListener('click', cerrarModal);

    // Cierre por clic fuera del contenedor (Backdrop)
    modalTienda.addEventListener('click', (e) => {
        if (e.target === modalTienda) cerrarModal();
    });

    // Envío y guardado (Preparado para Supabase)
    formNuevoProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnGuardar = formNuevoProducto.querySelector('button[type="submit"]');
        const contenidoOriginalBtn = btnGuardar.innerHTML;
        
        // UI Proactiva: Estado de carga
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Guardando...`;
        btnGuardar.style.opacity = "0.7";
        btnGuardar.style.cursor = "not-allowed";

        // Empaquetando los datos, incluyendo color y talla
        const nuevoArticulo = {
            nombre: document.getElementById('prod-nombre').value.trim(),
            marca: document.getElementById('prod-marca').value.trim(),
            categoria: document.getElementById('prod-categoria').value,
            colorHexadecimal: document.getElementById('prod-color-hex') ? document.getElementById('prod-color-hex').value : '#000000',
            colorNombre: document.getElementById('prod-color-nombre') ? document.getElementById('prod-color-nombre').value.trim() : '',
            talla: document.getElementById('prod-talla') ? document.getElementById('prod-talla').value.trim() : '',
            sku: document.getElementById('prod-sku').value.trim(),
            precioPublico: parseFloat(document.getElementById('prod-precio').value),
            stockActual: parseInt(document.getElementById('prod-stock').value, 10) || 0,
            stockMinimo: parseInt(document.getElementById('prod-minimo').value, 10) || 5
        };

        console.log("📦 [TIENDA] Paquete listo para BD:", nuevoArticulo);

        try {
            // Ejemplo de inserción Supabase:
            // const { error } = await supabase.from('productos_tienda').insert([nuevoArticulo]);
            // if (error) throw error;

            await new Promise(resolve => setTimeout(resolve, 1200)); 
            
            alert(`✅ ¡Artículo "${nuevoArticulo.nombre}" registrado con éxito!`);
            cerrarModal();

        } catch (error) {
            console.error("💥 [ERROR BD] Fallo al registrar producto:", error);
            alert("Hubo un error al conectar con el servidor. Revisa tu conexión.");
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = contenidoOriginalBtn;
            btnGuardar.style.opacity = "1";
            btnGuardar.style.cursor = "pointer";
        }
    });
}

// ==========================================
// 2. BUSCADOR Y FILTROS EN TIEMPO REAL
// ==========================================
function inicializarBuscadorYFiltrosTienda() {
    const inputBusqueda = document.getElementById('input-busqueda-tienda');
    const selectFiltro = document.getElementById('select-filtro-tienda');
    const filasTabla = document.querySelectorAll('#tabla-productos-tienda tbody tr');

    if (!inputBusqueda || !selectFiltro || filasTabla.length === 0) return;

    const aplicarFiltros = () => {
        const terminoBusqueda = inputBusqueda.value.toLowerCase().trim();
        const criterioCategoria = selectFiltro.value.toLowerCase();

        filasTabla.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            const cumpleBusqueda = textoFila.includes(terminoBusqueda);
            
            // Lógica de filtro por categoría basada en la estructura del HTML
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
// 3. INYECCIÓN DEL PANEL BENTO LATERAL (DETALLE DE TIENDA)
// ==========================================
function configurarModalBentoDinamico() {
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');
    const tablaProductos = document.getElementById('tabla-productos-tienda');

    if (tablaProductos && contenedorModalDinamico) {
        tablaProductos.addEventListener('click', async (e) => {
            // Buscamos el botón específico de edición de la tabla de tienda
            const botonEditar = e.target.closest('.btn-editar-tienda') || e.target.closest('.boton-fantasma-icono');
            
            if (botonEditar) {
                e.preventDefault();
                botonEditar.style.opacity = '0.5';

                try {
                    // Ruta actualizada al archivo correcto de la tienda
                    const basePath = window.location.pathname.includes('/PETPROTECT') ? '/PETPROTECT' : '';
                    const rutaModal = `${basePath}/MODAL_INFORMACION_PRODUCTO_TIENDA.html`; 

                    const respuesta = await fetch(rutaModal);
                    if (!respuesta.ok) throw new Error("Fallo al obtener el layout del panel Bento de Tienda.");
                    
                    const htmlModal = await respuesta.text();
                    contenedorModalDinamico.innerHTML = htmlModal;

                    // Referencias a los IDs del nuevo HTML de tienda
                    const modalFondoTienda = document.getElementById('modal-detalle-tienda');
                    const btnCerrarPanelTienda = document.getElementById('btn-cerrar-panel-tienda');

                    if (modalFondoTienda) {
                        const cerrarPanelBento = () => {
                            modalFondoTienda.classList.remove('visible');
                            modalFondoTienda.setAttribute('aria-hidden', 'true');
                            setTimeout(() => contenedorModalDinamico.innerHTML = '', 300);
                        };

                        if (btnCerrarPanelTienda) btnCerrarPanelTienda.addEventListener('click', cerrarPanelBento);
                        
                        modalFondoTienda.addEventListener('click', (evento) => {
                            if (evento.target === modalFondoTienda) cerrarPanelBento();
                        });

                        // Animación de entrada
                        setTimeout(() => {
                            modalFondoTienda.classList.add('visible');
                            modalFondoTienda.setAttribute('aria-hidden', 'false');
                            botonEditar.style.opacity = '1';
                        }, 50);
                    }

                } catch (error) {
                    console.error("💥 [ERROR DE INYECCIÓN] No se pudo levantar el panel Bento:", error);
                    alert("Error de red al cargar los detalles del artículo.");
                    botonEditar.style.opacity = '1';
                }
            }
        });
    }
}