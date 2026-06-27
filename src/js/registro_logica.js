import { conexionSupabase } from './infraestructura/conexion.js';

// Elementos del DOM
const formulario = document.getElementById('formularioRegistro');
const inputPass = document.getElementById('passRegistro');
const inputConfirmPass = document.getElementById('confirmPassRegistro');
const inputTelefono = document.getElementById('telefonoRegistro');
const barraFuerza = document.getElementById('barraFuerza');
const mensajeFuerza = document.getElementById('mensajeFuerza');
const mensajeConfirmacion = document.getElementById('mensajeConfirmacion');
const btnRegistrar = document.getElementById('btnRegistrar');
const checkTerminos = document.getElementById('terminosPrivacidad');

// Iconos SVG Universales
const ICONO_OJO_ABIERTO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const ICONO_OJO_CERRADO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

// ==========================================
// VALIDACIÓN: TELÉFONO (SOLO NÚMEROS)
// ==========================================
inputTelefono.addEventListener('input', function() {
    // Filtra cualquier caracter que no sea número
    this.value = this.value.replace(/[^0-9]/g, '');
    
    // Limita a 10 dígitos
    if (this.value.length > 10) {
        this.value = this.value.slice(0, 10);
    }
});

// ==========================================
// SEMÁFORO DE SEGURIDAD
// ==========================================
inputPass.addEventListener('input', function() {
    const password = this.value;
    let nivelFuerza = 0;

    if (password.length >= 8) nivelFuerza++;
    if (/[A-Z]/.test(password)) nivelFuerza++;
    if (/[0-9]/.test(password)) nivelFuerza++;
    if (/[^A-Za-z0-9]/.test(password)) nivelFuerza++;

    barraFuerza.className = 'barraFuerza';
    mensajeFuerza.className = 'ayudaTexto';

    if (password.length === 0) {
        barraFuerza.style.width = '0%';
        mensajeFuerza.textContent = '';
    } else if (nivelFuerza <= 2) {
        barraFuerza.style.width = '33%';
        barraFuerza.classList.add('fuerza-baja');
        mensajeFuerza.classList.add('texto-error');
        mensajeFuerza.textContent = 'Fuerza: Débil';
    } else if (nivelFuerza === 3) {
        barraFuerza.style.width = '66%';
        barraFuerza.classList.add('fuerza-media');
        mensajeFuerza.classList.add('texto-alerta');
        mensajeFuerza.textContent = 'Fuerza: Media';
    } else {
        barraFuerza.style.width = '100%';
        barraFuerza.classList.add('fuerza-alta');
        mensajeFuerza.classList.add('texto-exito');
        mensajeFuerza.textContent = 'Fuerza: Segura';
    }
    validarCoincidencia(); 
});

// ==========================================
// RETROALIMENTACIÓN DE COINCIDENCIA
// ==========================================
function validarCoincidencia() {
    const pass = inputPass.value;
    const confirm = inputConfirmPass.value;

    mensajeConfirmacion.className = 'ayudaTexto';

    if (confirm === '') {
        mensajeConfirmacion.textContent = '';
        return;
    }

    if (pass === confirm) {
        mensajeConfirmacion.textContent = '✓ Las contraseñas coinciden';
        mensajeConfirmacion.classList.add('texto-exito');
    } else {
        mensajeConfirmacion.textContent = '✗ Las contraseñas no coinciden';
        mensajeConfirmacion.classList.add('texto-error');
    }
}
inputConfirmPass.addEventListener('input', validarCoincidencia);

// ==========================================
// LÓGICA DEL OJITO (SVG)
// ==========================================
document.querySelectorAll('.btn-toggle-pass').forEach(boton => {
    boton.innerHTML = ICONO_OJO_ABIERTO;
    boton.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const esPass = input.type === 'password';
        input.type = esPass ? 'text' : 'password';
        this.innerHTML = esPass ? ICONO_OJO_CERRADO : ICONO_OJO_ABIERTO;
    });
});

// ==========================================
// ENVÍO DE FORMULARIO A SUPABASE
// ==========================================
formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombreRegistro').value.trim();
    const correo = document.getElementById('correoRegistro').value.trim();
    const telefono = inputTelefono.value;
    const pass = inputPass.value;
    const confirm = inputConfirmPass.value;

    if (pass !== confirm) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    if (telefono.length !== 10) {
        alert("El teléfono debe tener exactamente 10 dígitos.");
        return;
    }

    try {
        btnRegistrar.textContent = "Procesando...";
        btnRegistrar.disabled = true;

        const { data, error } = await conexionSupabase.auth.signUp({
            email: correo,
            password: pass,
            options: {
                data: { nombre_completo: nombre, telefono: telefono }
            }
        });

        if (error) throw error;

        alert("¡Registro exitoso! Bienvenido.");
        window.location.href = "/ONBOARDING.html";

    } catch (error) {
        alert("Error: " + error.message);
        btnRegistrar.textContent = "Registrarme con correo";
        btnRegistrar.disabled = false;
    }
});

checkTerminos.addEventListener('change', function() {
    btnRegistrar.disabled = !this.checked;
});