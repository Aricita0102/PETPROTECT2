/**
 * MÓDULO: Farmacia Clínica (PET PROTECT)
 * DESCRIPCIÓN: Controlador de inventario médico, gestión de lotes, buscador y modal de registro/edición.
 * ARQUITECTURA: Vite / Supabase
 */

export function inicializarFarmacia() {
    console.log("🩺 [FARMACIA] Inicializando sistemas de control de medicamentos...");

    // ==========================================
    // 1. INICIALIZAR BUSCADOR Y FILTROS
    // ==========================================
    inicializarBuscadorYFiltros();

    // ==========================================
    // 2. MODAL TRADICIONAL: NUEVO MEDICAMENTO
    // ==========================================
    const btnAbrir = document.getElementById('btn-abrir-modal-medicamento');
    const modalNuevo = document.getElementById('modalNuevoMedicamento');
    const btnCerrar = document.getElementById('btn-cerrar-modal-medicamento');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const formulario = document.getElementById('form-nuevo-medicamento');

    if (btnAbrir && modalNuevo && formulario) {
        const abrirModalNuevo = () => {
            modalNuevo.classList.add('visible');
            modalNuevo.setAttribute('aria-hidden', 'false');
            setTimeout(() => document.getElementById('med-nombre').focus(), 300);
        };

        const cerrarModalNuevo = () => {
            modalNuevo.classList.remove('visible');
            modalNuevo.setAttribute('aria-hidden', 'true');
            formulario.reset(); 
        };

        btnAbrir.addEventListener('click', abrirModalNuevo);
        btnCerrar.addEventListener('click', cerrarModalNuevo);
        btnCancelar.addEventListener('click', cerrarModalNuevo);

        modalNuevo.addEventListener('click', (e) => {
            if (e.target === modalNuevo) cerrarModalNuevo();
        });

        // 🔄 Optimizado para Supabase con async/await
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inputCaducidad = document.getElementById('med-caducidad').value;
            const fechaCaducidad = new Date(inputCaducidad + 'T00:00:00'); // Evita desfase UTC
            const fechaHoy = new Date();
            fechaHoy.setHours(0, 0, 0, 0); 
            
            if (fechaCaducidad <= fechaHoy) {
                alert("⚠️ ALERTA MÉDICA: No puede registrar un lote que ya está caducado o caduca hoy.");
                document.getElementById('med-caducidad').focus();
                return;
            }

            const btnGuardar = formulario.querySelector('button[type="submit"]');
            const contenidoOriginalBtn = btnGuardar.innerHTML;
            
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Registrando...`;
            btnGuardar.style.opacity = "0.7";
            btnGuardar.style.cursor = "not-allowed";

            // Empaquetado de datos (Añade id de campos si te faltan en el HTML)
            const nuevoMedicamento = {
                nombre: document.getElementById('med-nombre')?.value.trim(),
                caducidad: inputCaducidad
                // Añade el resto de tus campos aquí
            };

            try {
                // TODO: Reemplazar con llamada real a Supabase
                // const { error } = await supabase.from('medicamentos').insert([nuevoMedicamento]);
                // if (error) throw error;

                await new Promise(resolve => setTimeout(resolve, 1200)); // Simulación de red
                
                alert(`✅ ¡Fármaco registrado exitosamente!`);
                cerrarModalNuevo();

            } catch (error) {
                console.error("💥 [ERROR BD] Fallo al registrar:", error);
                alert("Error al guardar en el servidor. Verifique su conexión.");
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = contenidoOriginalBtn;
                btnGuardar.style.opacity = "1";
                btnGuardar.style.cursor = "pointer";
            }
        });
    }

    // ==========================================================================
    // 3. NUEVO: MODAL BENTO DINÁMICO (DETALLE / EDICIÓN DE PRODUCTO)
    // ==========================================================================
    const contenedorModalDinamico = document.getElementById('contenedor-modal-dinamico');
    const contenedorTabla = document.querySelector('.tabla-contenedor');

    if (contenedorTabla && contenedorModalDinamico) {
        // Delegación de eventos
        contenedorTabla.addEventListener('click', async (e) => {
            const botonEditar = e.target.closest('.boton-fantasma-icono');
            
            if (botonEditar) {
                e.preventDefault();
                console.log("🛠️ [FARMACIA] Solicitando historia clínica del fármaco (Panel Bento)...");
                botonEditar.style.opacity = '0.5';

                try {
                    const basePath = window.location.pathname.includes('/PETPROTECT') ? '/PETPROTECT' : '';
                    const rutaModal = `${basePath}/MODAL_INFORMACIÓN_PRODUCTO.html`;

                    const respuesta = await fetch(rutaModal);
                    if (!respuesta.ok) throw new Error("Fallo al obtener el layout del panel Bento.");
                    
                    const htmlModal = await respuesta.text();
                    contenedorModalDinamico.innerHTML = htmlModal;

                    // 🚨 NUEVO: Configuración de eventos de cierre DESPUÉS de inyectar el HTML
                    const modalFondo = document.getElementById('modal-detalle-producto');
                    const btnCerrarPanel = document.getElementById('btn-cerrar-panel-detalle');

                    if (modalFondo) {
                        const cerrarPanelBento = () => {
                            modalFondo.classList.remove('visible');
                            modalFondo.setAttribute('aria-hidden', 'true');
                            // Limpieza del DOM tras la animación
                            setTimeout(() => {
                                contenedorModalDinamico.innerHTML = '';
                            }, 300);
                        };

                        if (btnCerrarPanel) btnCerrarPanel.addEventListener('click', cerrarPanelBento);
                        
                        modalFondo.addEventListener('click', (evento) => {
                            if (evento.target === modalFondo) cerrarPanelBento();
                        });

                        // Disparo de la animación
                        setTimeout(() => {
                            modalFondo.classList.add('visible');
                            modalFondo.setAttribute('aria-hidden', 'false');
                            botonEditar.style.opacity = '1';
                        }, 50);
                    }

                } catch (error) {
                    console.error("💥 [ERROR DE INYECCIÓN] No se pudo levantar el panel Bento:", error);
                    alert("Error de conexión al cargar la información médica del producto. Revisa la ruta del archivo.");
                    botonEditar.style.opacity = '1';
                }
            }
        });
    }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function inicializarBuscadorYFiltros() {
    const inputBusqueda = document.querySelector('.buscador-universal-bento input');
    const selectFiltro = document.querySelector('.filtros-tabla select');
    const filasTabla = document.querySelectorAll('.tabla-saas tbody tr');

    if (!inputBusqueda || !selectFiltro || filasTabla.length === 0) return;

    const aplicarFiltros = () => {
        const terminoBusqueda = inputBusqueda.value.toLowerCase().trim();
        const criterioFiltro = selectFiltro.value;

        filasTabla.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            const cumpleBusqueda = textoFila.includes(terminoBusqueda);

            let cumpleFiltro = true;
            const badgeEstado = fila.querySelector('.badge-estado');
            
            if (criterioFiltro !== 'todos' && badgeEstado) {
                if (criterioFiltro === 'critico' && !badgeEstado.classList.contains('critico')) cumpleFiltro = false;
                if (criterioFiltro === 'caducar' && !badgeEstado.classList.contains('advertencia')) cumpleFiltro = false;
            }

            fila.style.display = (cumpleBusqueda && cumpleFiltro) ? '' : 'none';
        });
    };

    inputBusqueda.addEventListener('input', aplicarFiltros);
    selectFiltro.addEventListener('change', aplicarFiltros);
}