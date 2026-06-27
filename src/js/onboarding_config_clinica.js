// ==========================================
// CONTROLADOR WIZARD: CONFIGURACIÓN MAESTRA
// Archivo: /src/js/onboarding_config_clinica.js
// ==========================================
import { obtenerUsuarioActual, conexionSupabase } from './infraestructura/conexion.js';

// ==========================================
// 🚨 GUARDIÁN DE ESTADO (SEGURIDAD DE RUTA) 🚨
// ==========================================
// Se ejecuta inmediatamente al cargar el script. 
// Si no hay plan seleccionado, expulsa al usuario a la selección de planes.
const planElegidoEnMemoria = localStorage.getItem('PET_PROTECT_PLAN_SELECCIONADO');
if (!planElegidoEnMemoria || planElegidoEnMemoria === "null" || planElegidoEnMemoria.trim() === "") {
    console.warn("[Seguridad] Redirigiendo a selección de planes...");
    window.location.replace('SELECCION_PLAN.html');
}

// ==========================================
// REFERENCIAS DEL DOM
// ==========================================
const track = document.getElementById('wizardTrack');
const cards = document.querySelectorAll('.wizard-card');
const btnAtras = document.getElementById('btnAtras');
const btnSiguiente = document.getElementById('btnSiguiente');
const btnFinalizar = document.getElementById('btnFinalizar');

// Referencia para el botón o enlace de "Cambiar Plan"
const btnRegresarPlanes = document.getElementById('btnRegresarPlanes'); 

let pasoActual = 0;

// ==========================================
// 1. MOTOR DEL WIZARD (DESLIZADOR)
// ==========================================
function actualizarWizard() {
    const translateX = -(pasoActual * 100);
    track.style.transform = `translateX(${translateX}%)`;

    cards.forEach((card, index) => {
        card.classList.toggle('activa', index === pasoActual);
    });

    // Mostramos "Atrás" solo si no estamos en el inicio
    btnAtras.classList.toggle('oculto', pasoActual === 0);
    
    // Si estamos en el último paso, cambiamos el botón Siguiente por Finalizar
    if (pasoActual === cards.length - 1) {
        btnSiguiente.classList.add('oculto');
        btnFinalizar.classList.remove('oculto');
        prepararUltimoPaso();
    } else {
        btnSiguiente.classList.remove('oculto');
        btnFinalizar.classList.add('oculto');
    }
}

btnSiguiente.addEventListener('click', () => {
    // Validación de Identidad (Paso 0)
    if (pasoActual === 0) {
        const nombreClinica = document.getElementById('nombreClinica').value.trim();
        if(!nombreClinica) {
            alert("El Nombre Comercial de la clínica es obligatorio.");
            return;
        }
    }

    if (pasoActual < cards.length - 1) {
        pasoActual++;
        actualizarWizard();
    }
});

btnAtras.addEventListener('click', () => {
    if (pasoActual > 0) {
        pasoActual--;
        actualizarWizard();
    }
});

// ==========================================
// 2. LÓGICA DE PLANES Y RETORNO
// ==========================================

/**
 * Permite al usuario regresar a la pantalla de selección de planes
 * si decide cambiar su suscripción antes de construir la clínica.
 */
function gestionarRetornoAPlanes() {
    const confirmacion = confirm("¿Deseas regresar a la selección de planes? Se perderán los datos introducidos en este formulario.");
    if (confirmacion) {
        // Redirigimos a la pantalla de selección borrando primero el rastro
        localStorage.removeItem('PET_PROTECT_PLAN_SELECCIONADO');
        window.location.href = 'SELECCION_PLAN.html';
    }
}

// Escuchador para el botón de cambio de plan
if (btnRegresarPlanes) {
    btnRegresarPlanes.addEventListener('click', (e) => {
        e.preventDefault();
        gestionarRetornoAPlanes();
    });
}

function generarCodigoAleatorio() {
    return 'VET-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function prepararUltimoPaso() {
    // SIN FALLBACKS. Usamos el valor limpio porque el Guardián ya confirmó que existe.
    const planElegido = localStorage.getItem('PET_PROTECT_PLAN_SELECCIONADO');
    const subtitulo = document.getElementById('subtituloEquipo');
    const vistaInicial = document.getElementById('vistaPlanInicial');
    const vistaEquipo = document.getElementById('vistaPlanEquipo');
    const displayCodigo = document.getElementById('displayCodigo');

    // Validación segura
    if (planElegido && planElegido.toUpperCase() === 'INICIAL') {
        subtitulo.textContent = "Entorno optimizado para Médico Independiente.";
        vistaInicial.classList.remove('oculto');
        vistaEquipo.classList.add('oculto');
    } else {
        subtitulo.textContent = "Configurando acceso para tu red de trabajo.";
        vistaInicial.classList.add('oculto');
        vistaEquipo.classList.remove('oculto');
        
        if (displayCodigo.textContent === 'Generando...') {
            displayCodigo.textContent = generarCodigoAleatorio();
        }
    }
}

document.getElementById('btnCopiarCodigo')?.addEventListener('click', function() {
    const codigo = document.getElementById('displayCodigo').textContent;
    navigator.clipboard.writeText(codigo).then(() => {
        const span = this.querySelector('span');
        const original = span.textContent;
        span.textContent = "¡Copiado!";
        setTimeout(() => span.textContent = original, 2000);
    });
});

// ==========================================
// 3. UX: PREVISUALIZACIÓN DE IMÁGENES
// ==========================================
function configurarSubida(idZona, idInput, idPreview, idPlaceholder) {
    const zona = document.getElementById(idZona);
    const input = document.getElementById(idInput);
    const preview = document.getElementById(idPreview);
    const placeholder = document.getElementById(idPlaceholder);

    zona.addEventListener('click', () => input.click());

    input.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                zona.style.background = 'transparent';
            };
            reader.readAsDataURL(file);
        }
    });
}

configurarSubida('zonaLogo', 'inputLogo', 'previewLogo', 'phLogo');
configurarSubida('zonaFirma', 'inputFirma', 'previewFirma', 'phFirma');

// ==========================================
// 4. TRANSACCIÓN FINAL: BASE DE DATOS Y REDIRECCIÓN
// ==========================================

async function subirImagenOrganizada(archivo, orgId, sucId, tipo) {
    if (!archivo) return null;
    
    const extension = archivo.name.split('.').pop();
    const rutaFinal = `${orgId}/${sucId}/${tipo}/${Date.now()}.${extension}`;

    const { data, error } = await conexionSupabase.storage
        .from('recursos_clinica')
        .upload(rutaFinal, archivo, { 
            cacheControl: '3600', 
            upsert: true 
        });

    if (error) {
        console.error(`Error subiendo ${tipo}:`, error.message);
        return null;
    }

    const { data: urlData } = conexionSupabase.storage
        .from('recursos_clinica')
        .getPublicUrl(rutaFinal);

    return urlData.publicUrl;
}

btnFinalizar.addEventListener('click', async () => {
    const inputNombre = document.getElementById('nombreClinica').value.trim();
    const inputRFC = document.getElementById('rfcClinica').value.trim();
    const inputDireccion = document.getElementById('direccionClinica').value.trim();
    const inputTelefono = document.getElementById('telefonoClinica').value.trim();
    const fileLogo = document.getElementById('inputLogo').files[0];
    const fileFirma = document.getElementById('inputFirma').files[0];
    
    const planElegidoStr = localStorage.getItem('PET_PROTECT_PLAN_SELECCIONADO');
    if (!planElegidoStr) return; // Salida de seguridad
    const planElegido = planElegidoStr.toUpperCase();
    
    const codigoGenerado = document.getElementById('displayCodigo').textContent;

    // Captura del Horario de Operación Estandarizado (JSONB Array)
    const mapaNombresCortos = {
        'Lun': 'Lunes', 'Mar': 'Martes', 'Mie': 'Miércoles',
        'Jue': 'Jueves', 'Vie': 'Viernes', 'Sab': 'Sábado', 'Dom': 'Domingo'
    };
    const diasCompletos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const inputsDias = document.querySelectorAll('.selector-dias-smart input[type="checkbox"]:checked');
    const diasSeleccionados = Array.from(inputsDias).map(input => mapaNombresCortos[input.value] || input.value);
    
    const aperturaVal = document.getElementById('horaApertura').value;
    const cierreVal = document.getElementById('horaCierre').value;
    
    const payloadHorario = diasCompletos.map(dia => {
        const estaAbierto = diasSeleccionados.includes(dia);
        return {
            dia: dia,
            abierto: estaAbierto,
            apertura: estaAbierto ? aperturaVal : null,
            cierre: estaAbierto ? cierreVal : null
        };
    });

    console.log("[ONBOARDING] Horario formateado en estándar JSONB:", payloadHorario);

    try {
        btnFinalizar.innerHTML = "Finalizando cimientos...";
        btnFinalizar.disabled = true;

        const usuarioActual = await obtenerUsuarioActual();
        if (!usuarioActual) throw new Error("Sesión inválida.");

        // Definición de cuotas según plan
        const limites = {
            usuarios: planElegido === 'HOSPITAL' ? 50 : (planElegido === 'PRO' ? 5 : 1),
            expedientes: planElegido === 'INICIAL' ? 100 : 5000
        };

        // A. Crear Organización
        const { data: orgData, error: errOrg } = await conexionSupabase
            .from('organizaciones')
            .insert([{ 
                nombre_legal: inputNombre,
                rfc_fiscal: inputRFC || null,
                plan_suscripcion: planElegido.toLowerCase(),
                creador_id: usuarioActual.id,
                limite_usuarios: limites.usuarios,
                limite_expedientes: limites.expedientes,
                estado_suscripcion: 'activo',
                activo: true
            }])
            .select().single();

        if (errOrg) throw errOrg;

        // B. Crear Sucursal Matriz
        const { data: sucData, error: errSuc } = await conexionSupabase
            .from('sucursales')
            .insert([{ 
                organizacion_id: orgData.id,
                nombre_sucursal: 'Matriz Principal',
                direccion: inputDireccion || null,
                telefono_recepcion: inputTelefono || null
            }])
            .select().single();

        if (errSuc) throw errSuc;

        // C. Subir Imágenes (OrgId/SucId/Tipo)
        await subirImagenOrganizada(fileLogo, orgData.id, sucData.id, 'logos');
        await subirImagenOrganizada(fileFirma, orgData.id, sucData.id, 'firmas');

        // D. Actualizar Perfil (es_dueno y onboarding_listo)
        const { error: errPerfil } = await conexionSupabase
            .from('perfiles')
            .update({ 
                organizacion_id: orgData.id,
                sucursal_id: sucData.id,
                rol: 'superadmin',
                es_dueno: true,
                onboarding_listo: true,
                horario_atencion: payloadHorario
            })
            .eq('id', usuarioActual.id);

        if (errPerfil) throw errPerfil;

        // E. Registrar Invitación si aplica
        if (planElegido !== 'INICIAL') {
            const fechaExp = new Date();
            fechaExp.setDate(fechaExp.getDate() + 30);
            await conexionSupabase.from('invitaciones').insert([{
                codigo_acceso: codigoGenerado,
                organizacion_id: orgData.id,
                sucursal_id: sucData.id,
                rol_otorgado: 'veterinario',
                usos_disponibles: planElegido === 'PRO' ? 3 : 100,
                creado_por: usuarioActual.id,
                fecha_expiracion: fechaExp.toISOString()
            }]);
        }

        // Limpieza y Salto
        localStorage.removeItem('PET_PROTECT_PLAN_SELECCIONADO');

        setTimeout(() => {
            const destino = 'PRINCIPAL.html'; // SPA handle everything
            window.location.replace(destino); // replace para evitar retrocesos al wizard
        }, 800);

    } catch (error) {
        console.error("[Sistema] Error crítico:", error);
        alert("Ocurrió un error al registrar la clínica. Revisa tu conexión.");
        btnFinalizar.innerHTML = "Construir Clínica";
        btnFinalizar.disabled = false;
    }
});

actualizarWizard();