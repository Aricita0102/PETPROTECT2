/**
 * MÓDULO: Farmacia Clínica (PET PROTECT)
 * DESCRIPCIÓN: Controlador de inventario médico, gestión de lotes y modal de registro.
 * ARQUITECTURA: Adaptado para entorno Vite / Supabase
 */

export function inicializarFarmacia() {
    console.log("🩺 [FARMACIA] Inicializando sistemas de control de medicamentos...");

    // 1. Captura de Elementos del DOM
    const btnAbrir = document.getElementById('btn-abrir-modal-medicamento');
    const modal = document.getElementById('modalNuevoMedicamento');
    const btnCerrar = document.getElementById('btn-cerrar-modal-medicamento');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const formulario = document.getElementById('form-nuevo-medicamento');

    if (!btnAbrir || !modal || !formulario) {
        console.warn("⚠️ [FARMACIA] Elementos del modal de registro no encontrados en esta vista.");
        return;
    }

    // 2. Lógica de Apertura y Cierre (Clase 'visible' del CSS)
    const abrirModal = () => {
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        // Accesibilidad: Enfocar el primer campo después de la animación
        setTimeout(() => document.getElementById('med-nombre').focus(), 300);
    };

    const cerrarModal = () => {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
        formulario.reset(); 
    };

    // 3. Asignación de Eventos Básicos
    btnAbrir.addEventListener('click', abrirModal);
    btnCerrar.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);

    // Cerrar al hacer clic en el fondo oscuro (fuera de la tarjeta)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });

    // 4. Lógica de Negocio: Procesamiento y Validación del Formulario
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        // Validación Clínica: Verificar que la fecha de caducidad no sea en el pasado o presente
        const inputCaducidad = document.getElementById('med-caducidad').value;
        const fechaCaducidad = new Date(inputCaducidad + 'T00:00:00'); // Evita desfase UTC
        const fechaHoy = new Date();
        fechaHoy.setHours(0, 0, 0, 0); // Normalizamos a medianoche
        
        if (fechaCaducidad <= fechaHoy) {
            alert("⚠️ ALERTA MÉDICA: No puede registrar un lote que ya está caducado o caduca hoy.");
            document.getElementById('med-caducidad').focus();
            return;
        }

        // 5. Estado de Carga (Proactive UX)
        const btnGuardar = formulario.querySelector('button[type="submit"]');
        const contenidoOriginalBtn = btnGuardar.innerHTML;
        
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Registrando...`;
        btnGuardar.style.opacity = "0.7";
        btnGuardar.style.cursor = "not-allowed";

        // Recolección y parseo de datos
        const nuevoMedicamento = {
            nombre: document.getElementById('med-nombre').value.trim(),
            sustancia: document.getElementById('med-sustancia').value.trim(),
            viaAdmin: document.getElementById('med-via').value,
            presentacion: document.getElementById('med-presentacion').value,
            unidad: document.getElementById('med-unidad').value,
            lote: document.getElementById('med-lote').value.trim(),
            caducidad: inputCaducidad, // Se envía en formato YYYY-MM-DD
            stockInicial: parseInt(document.getElementById('med-stock').value, 10),
            stockMinimo: parseInt(document.getElementById('med-minimo').value, 10),
            esControlado: document.getElementById('med-controlado').checked
        };

        console.log("📦 [FARMACIA] Paquete de datos listo para BD:", nuevoMedicamento);

        // 6. Integración con Base de Datos (Supabase)
        try {
            // Ejemplo de inserción real (descomentar cuando conectes tu cliente):
            // const { data, error } = await supabase.from('medicamentos').insert([nuevoMedicamento]);
            // if (error) throw error;

            // Simulación de latencia de red (Eliminar cuando implementes la BD real)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            alert(`✅ ¡Medicamento ${nuevoMedicamento.nombre} registrado exitosamente en Farmacia!`);
            cerrarModal();

        } catch (error) {
            console.error("💥 [ERROR BD] Fallo al registrar el medicamento:", error);
            alert("Error al guardar en el servidor. Verifique su conexión y vuelva a intentarlo.");
        } finally {
            // Restaurar botón siempre, independientemente de si la petición falló o tuvo éxito
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = contenidoOriginalBtn;
            btnGuardar.style.opacity = "1";
            btnGuardar.style.cursor = "pointer";
        }
    });
}