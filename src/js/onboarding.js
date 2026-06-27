// ==========================================
// CONTROLADOR DE ONBOARDING: INICIO DE FLUJO
// Archivo: /src/js/onboarding.js
// ==========================================
import { conexionSupabase } from './infraestructura/conexion.js';

// ==========================================
// CONFIGURACIÓN DE INTERFAZ Y MOVIMIENTO
// ==========================================
const capaFondo = document.querySelector('.fondo-difuminado');

document.addEventListener('mousemove', (evento) => {
    const x = (evento.clientX / window.innerWidth) * 100;
    const y = (evento.clientY / window.innerHeight) * 100;
    if (capaFondo) {
        capaFondo.style.left = `${x}%`;
        capaFondo.style.top = `${y}%`;
    }
});

// ==========================================
// REFERENCIAS DEL DOM
// ==========================================
const botonCrear = document.querySelector('[data-tipo="administrador"]');
const botonUnirse = document.querySelector('[data-tipo="colaborador"]');
const modalCodigo = document.getElementById('modal-codigo');
const botonCerrarModal = document.getElementById('cerrar-modal');

// Elementos Internos del Modal
const entradaCodigo = document.getElementById('entrada-invitacion');
const btnValidar = document.getElementById('validar-invitacion');
const btnEditar = document.getElementById('boton-editar-codigo');
const estatusArea = document.getElementById('contenedor-estatus');
const iconoBloqueo = document.getElementById('icono-bloqueo');
const feedback = document.getElementById('feedback-codigo');

// ==========================================
// GESTIÓN DE ESTADOS DEL MODAL
// ==========================================

function bloquearInterfazRevision() {
    entradaCodigo.disabled = true;
    btnValidar.classList.add('oculto');
    estatusArea.classList.remove('oculto');
    iconoBloqueo.classList.remove('oculto');
    btnEditar.classList.remove('oculto');
    
    feedback.textContent = "Tu solicitud ha sido enviada. Espera la aprobación del administrador.";
    feedback.className = "ayudaTexto texto-alerta";
}

function permitirEdicionCodigo() {
    entradaCodigo.disabled = false;
    btnValidar.classList.remove('oculto');
    estatusArea.classList.add('oculto');
    iconoBloqueo.classList.add('oculto');
    btnEditar.classList.add('oculto');
    
    entradaCodigo.focus();
    feedback.textContent = "";
}

// ==========================================
// ACCIÓN: FUNDAR CLÍNICA (ENLACE INTELIGENTE)
// ==========================================
if (botonCrear) {
    botonCrear.addEventListener('click', async () => {
        try {
            const { data: { user } } = await conexionSupabase.auth.getUser();
            if (!user) throw new Error("Sesión no válida");

            // Bloqueo visual preventivo para feedback de carga
            botonCrear.textContent = "Trazando ruta...";
            botonCrear.disabled = true;

            // 1. Elevación de privilegios (Dueño de la clínica)
            const { error } = await conexionSupabase
                .from('perfiles')
                .update({ 
                    rol: 'superadmin', 
                    activo: true,
                    onboarding_listo: false 
                })
                .eq('id', user.id);

            if (error) throw error;

            // 2. LIMPIEZA ABSOLUTA DE PLANES ANTERIORES
            // Destruimos cualquier plan "fantasma" que haya en memoria
            localStorage.removeItem('PET_PROTECT_PLAN_SELECCIONADO');

            // 3. REDIRECCIÓN ESTRICTA
            // Ya no hay condicionales (if/else). Siempre vamos a planes.
            setTimeout(() => {
                console.log("[Sistema] Iniciando selección de plan...");
                window.location.href = 'SELECCION_PLAN.html'; 
            }, 1000);

        } catch (error) {
            console.error("Fallo en inicialización:", error.message);
            botonCrear.disabled = false;
            botonCrear.textContent = "Configurar Nueva Clínica";
            alert("Ocurrió un error al preparar tu entorno. Intenta nuevamente.");
        }
    });
}

// ==========================================
// ACCIONES: UNIRSE A EQUIPO (MODAL)
// ==========================================

botonUnirse.addEventListener('click', () => {
    modalCodigo.style.display = 'flex';
});

botonCerrarModal.addEventListener('click', () => {
    modalCodigo.style.opacity = '0';
    setTimeout(() => {
        modalCodigo.style.display = 'none';
        modalCodigo.style.opacity = '1';
    }, 300);
});

entradaCodigo.addEventListener('input', function() {
    this.value = this.value.toUpperCase().replace(/\s/g, '');
    if (this.value.length > 0) {
        feedback.textContent = "";
    }
});

btnValidar.addEventListener('click', async () => {
    const codigo = entradaCodigo.value.trim();

    if (codigo.length !== 8) {
        feedback.textContent = "Error: El código debe contener exactamente 8 caracteres.";
        feedback.className = "ayudaTexto texto-error";
        return;
    }

    try {
        btnValidar.textContent = "Verificando...";
        btnValidar.disabled = true;

        setTimeout(() => {
            bloquearInterfazRevision();
            btnValidar.textContent = "Verificar Identidad";
            btnValidar.disabled = false;
        }, 1500);

    } catch (error) {
        alert("No se pudo procesar el código.");
        btnValidar.disabled = false;
    }
});

btnEditar.addEventListener('click', permitirEdicionCodigo);