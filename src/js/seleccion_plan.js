import { obtenerUsuarioActual }from './infraestructura/conexion.js';

// ==========================================
// LÓGICA DE SELECCIÓN DE PLAN (LA ADUANA)
// ==========================================
const botonesPlan = document.querySelectorAll('.boton-plan');

botonesPlan.forEach(boton => {
    boton.addEventListener('click', async function(evento) {
        evento.preventDefault();

        // 1. Verificación de Seguridad (Aprovechando conexion.js)
        // Evitamos que un usuario sin sesión elija un plan y avance a la configuración
        const usuario = await obtenerUsuarioActual();
        if (!usuario) {
            alert("Sesión expirada o no válida. Por favor, inicia sesión nuevamente.");
            window.location.href = '/LOGIN.html';
            return;
        }

        // 2. Capturamos el plan elegido desde el atributo HTML (ej. data-plan="PRO")
        const planElegido = this.getAttribute('data-plan');
        
        if (!planElegido) return;

        // 3. Micro-interacción: Bloquear todos los botones para prevenir múltiples clics
        botonesPlan.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });

        // 4. Feedback visual en el botón que el usuario clickeó
        this.textContent = "Aprovisionando entorno...";
        this.style.opacity = '1'; 

        // 5. Guardar la decisión en el almacenamiento local del navegador
        // Esta es la "memoria" que leeremos en la pantalla de CONFIG_CLINICA
        // para hacer el INSERT final en la tabla 'organizaciones'
        localStorage.setItem('PET_PROTECT_PLAN_SELECCIONADO', planElegido);

        console.log(`[Sistema] Licencia seleccionada en caché: ${planElegido}. Preparando redirección...`);

        // 6. Redirección con un pequeño retraso psicológico
        // Hace sentir al usuario que el sistema está construyendo su espacio
        setTimeout(() => {
            window.location.href = '/ONBOARDING_CONFIG_CLINICA.html';
        }, 800);
    });
});