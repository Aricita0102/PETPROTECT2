import { conexionSupabase } from './infraestructura/conexion.js';

const form = document.getElementById('formRecuperar');
const btnEnviar = document.querySelector('.botonEnviar');
const contenedorErrores = document.getElementById('contenedorErrores');
const contenedorExito = document.getElementById('contenedorExito');

// Función para mostrar mensajes
function mostrarMensaje(tipo, texto) {
    if (tipo === 'error') {
        if(contenedorExito) contenedorExito.style.display = 'none';
        if(contenedorErrores) {
            contenedorErrores.textContent = texto;
            contenedorErrores.style.display = 'block';
        } else {
            alert("Error: " + texto);
        }
    } else {
        if(contenedorErrores) contenedorErrores.style.display = 'none';
        if(contenedorExito) {
            contenedorExito.textContent = texto;
            contenedorExito.style.display = 'block';
        } else {
            alert(texto);
        }
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('correoRecuperar').value.trim();
    if (!email) {
        mostrarMensaje('error', 'Por favor, ingresa tu correo electrónico.');
        return;
    }

    try {
        if(btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.textContent = 'Enviando...';
            btnEnviar.style.opacity = '0.7';
        }
        if(contenedorErrores) contenedorErrores.style.display = 'none';
        if(contenedorExito) contenedorExito.style.display = 'none';

        // Redirige al login para que una vez reseteada, inicie sesión
        const resetURL = window.location.origin + '/LOGIN.html';

        const { error } = await conexionSupabase.auth.resetPasswordForEmail(email, {
            redirectTo: resetURL,
        });

        if (error) {
            throw error;
        }

        mostrarMensaje('exito', '¡Instrucciones enviadas! Revisa tu bandeja de entrada o carpeta de spam.');
        
        form.reset();
        setTimeout(() => {
            window.location.href = "LOGIN.html";
        }, 4000);

    } catch (error) {
        console.error("Error al enviar el correo de recuperación:", error);
        mostrarMensaje('error', 'No pudimos procesar tu solicitud. Verifica que el correo sea correcto.');
    } finally {
        if(btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Enviar instrucciones';
            btnEnviar.style.opacity = '1';
        }
    }
});