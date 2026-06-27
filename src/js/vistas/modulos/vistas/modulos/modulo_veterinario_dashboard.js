// ==========================================
// CONTROLADOR DASHBOARD VETERINARIO (SUPABASE)
// Archivo: /src/js/veterinario_dashboard_logica.js
// ==========================================
import '../../../css/modulo_veteri_dashboard.css';
import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

import { cargarModulo } from '../principal_v2.js';
import QRCode from 'qrcode';

let usuarioActualId = null;
let organizacionIdActual = null;
let planOrganizacion = "INICIAL";
let suscripcionCanalCitas = null;

const actualizarFechaUI = () => {
    const txtFecha = document.getElementById('fechaActual');
    if (txtFecha) {
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        txtFecha.innerText = new Date().toLocaleDateString('es-ES', opciones);
    }
};

export async function inicializarModuloDashboard() {
    try {
        actualizarFechaUI();

        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) {
            console.error("ERROR CRÍTICO DE INICIALIZACIÓN: No hay sesión activa.");
            alert("Error de consola detectado. Revisa con F12.");
            // window.location.assign("LOGIN.html");
            return;
        }

        usuarioActualId = sesion.user.id;
        organizacionIdActual = sesion.perfil.organizacion_id;

        // 3. Guardán de clínica
        if (!sesion.perfil.organizacion_id || sesion.perfil.rol === 'nuevo') {
            window.location.assign("ONBOARDING.html");
            return;
        }

        // 4. Obtener Plan (solo este query es necesario, no estaba en el perfil)
        const { data: orgData } = await conexionSupabase
            .from('organizaciones')
            .select('plan_suscripcion')
            .eq('id', organizacionIdActual)
            .single();

        if (orgData) planOrganizacion = (orgData.plan_suscripcion || "INICIAL").toUpperCase();

        // 5. Renderizado de UI y Validación de acceso
        actualizarPerfilUI(sesion.perfil);
        gestionarAccesoVeterinario(sesion.perfil);

        // 6. Conectar botón cerrar sesión
        document.querySelectorAll('#btnCerrarSesion').forEach(btn => btn.addEventListener('click', cerrarSesionApp));

        // 7. Caballo de Troya: Forzar renderizado del widget de horario cada que carga el Dashboard
        setTimeout(() => {
            if (typeof window.actualizarWidgetHorarioGlobal === 'function') {
                window.actualizarWidgetHorarioGlobal();
            }
        }, 100); // Pequeño delay para asegurar que el DOM de la vista ya fue inyectado

    } catch (error) {
        console.error("ERROR CRÍTICO DE INICIALIZACIÓN:", error);
        alert("Error de consola detectado. Revisa con F12.");
    }
}

function gestionarAccesoVeterinario(perfil) {
    const loader = document.getElementById('pantallaCarga');
    const contenidoPrincipal = document.getElementById('contenidoPrincipal');
    const btnRegresarAdmin = document.getElementById('btnRegresarAdmin');

    // Seguridad: Roles
    if (perfil.rol === "asistente") {
        alert("Acceso denegado. Redirigiendo a panel de asistente.");
        window.location.assign("ASISTENTE_DASHBOARD.html");
        return;
    }

    if (perfil.estatus === "suspendido") {
        alert("⛔ Cuenta suspendida.");
        cerrarSesionApp();
        return;
    }

    // --- ÉXITO: MOSTRAR CONTENIDO Y QUITAR LOADER ---
    if (contenidoPrincipal) contenidoPrincipal.style.display = "flex";
    if (loader) loader.style.display = "none"; // 👈 Aquí se oculta al confirmar acceso

    // Configurar Puente de Regreso
    if (btnRegresarAdmin) {
        if (perfil.rol === 'superadmin' && planOrganizacion !== 'INICIAL') {
            btnRegresarAdmin.style.display = "block"; 
            btnRegresarAdmin.onclick = (e) => {
                e.preventDefault();
                window.location.assign("PRINCIPAL.html");
            };
        } else {
            btnRegresarAdmin.remove();
        }
    }
    
    // Cargar datos operativos reales
    // requestAnimationFrame garantiza que el DOM ya está pintado
    configurarBtnNuevoIngreso();
    configurarBotonScanner();
    configurarBuscadorPredictivo();
    requestAnimationFrame(() => {
        cargarMetricasCasosClinicos();
        cargarMetricasIngresos();
    });
    iniciarSistemaAlertas();
}

// ─── Reloj y Horario (Widget) REMOVIDO POR ROLLBACK ────────────────────────

// ─── Buscador Predictivo ──────────────────────────────────────────────────────
function configurarBuscadorPredictivo() {
    const inputBusqueda = document.getElementById('inputBusqueda');
    const dropdown = document.getElementById('dropdownResultadosBusqueda');

    if (!inputBusqueda || !dropdown) return;

    let timeoutBusqueda = null;

    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.trim();
        clearTimeout(timeoutBusqueda);

        if (termino.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        timeoutBusqueda = setTimeout(() => realizarBusqueda(termino), 400);
    });

    // Cerrar si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!inputBusqueda.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    inputBusqueda.addEventListener('focus', () => {
        if (inputBusqueda.value.trim().length >= 2) {
            dropdown.style.display = 'block';
        }
    });

    async function realizarBusqueda(termino) {
        if (!organizacionIdActual) return;

        dropdown.innerHTML = '<div class="resultado-pred-empty">Buscando...</div>';
        dropdown.style.display = 'block';

        try {
            // Buscar por nombre de mascota
            const pMascota = conexionSupabase
                .from('pacientes')
                .select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`)
                .eq('organizacion_id', organizacionIdActual)
                .ilike('nombre', `%${termino}%`)
                .limit(5);

            // Buscar por nombre de tutor (usando foreign table filter)
            const pTutor = conexionSupabase
                .from('pacientes')
                .select(`id, nombre, especie, raza, foto_url, clientes!inner(nombre_completo)`)
                .eq('organizacion_id', organizacionIdActual)
                .ilike('clientes.nombre_completo', `%${termino}%`)
                .limit(5);

            const [resMascota, resTutor] = await Promise.all([pMascota, pTutor]);

            if (resMascota.error) throw resMascota.error;
            if (resTutor.error) throw resTutor.error;

            // Unir y quitar duplicados (por ID)
            const mapaResultados = new Map();
            [...(resMascota.data || []), ...(resTutor.data || [])].forEach(paciente => {
                mapaResultados.set(paciente.id, paciente);
            });

            const resultadosFinales = Array.from(mapaResultados.values()).slice(0, 6);

            renderizarResultadosPredictivos(resultadosFinales);

        } catch (error) {
            console.error('[DASH] Error en buscador:', error);
            dropdown.innerHTML = '<div class="resultado-pred-empty" style="color:red;">Error de búsqueda</div>';
        }
    }

    function renderizarResultadosPredictivos(resultados) {
        if (resultados.length === 0) {
            dropdown.innerHTML = '<div class="resultado-pred-empty">No se encontraron pacientes ni tutores.</div>';
            return;
        }

        dropdown.innerHTML = '';
        resultados.forEach(paciente => {
            const fotoUrl = paciente.foto_url || 'https://cdn-icons-png.flaticon.com/512/2809/2809865.png'; // Fallback genérico
            const nombreMascota = paciente.nombre || 'Desconocido';
            const especieRaza = `${paciente.especie || 'Mascota'} ${paciente.raza ? '· ' + paciente.raza : ''}`;
            const tutorNombre = paciente.clientes?.nombre_completo || 'Sin tutor registrado';

            const item = document.createElement('div');
            item.className = 'resultado-pred-item';
            item.innerHTML = `
                <img src="${fotoUrl}" alt="Foto" class="resultado-pred-foto">
                <div class="resultado-pred-info">
                    <p class="resultado-pred-nombre">${nombreMascota}</p>
                    <p class="resultado-pred-detalles">${especieRaza}</p>
                    <p class="resultado-pred-tutor"><span class="material-symbols-rounded" style="font-size:12px; vertical-align:middle;">person</span> ${tutorNombre}</p>
                </div>
            `;

            item.addEventListener('click', () => {
                sessionStorage.setItem('idPacienteActivo', paciente.id);
                cargarModulo('MODULO_EXPEDIENTES_HISTORIAL');
            });

            dropdown.appendChild(item);
        });
    }
}

// ─── Botón Nuevo Ingreso → Modal de Registro de Paciente ──────────────────────
function configurarBtnNuevoIngreso() {
    const btn = document.getElementById('btnNuevoIngreso');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        try {
            // Importamos el mismo orquestador que usa Biblioteca de Expedientes
            const { inyectarYMostrarModal } = await import('/src/js/vistas/modal/modal_registro_pacientes.js');
            await inyectarYMostrarModal();
        } catch (err) {
            console.error('[DASHBOARD] Error al abrir modal de nuevo paciente:', err);
        }
    });
}

// ─── Métricas Casos Clínicos ──────────────────────────────────────────────────────
async function cargarMetricasCasosClinicos() {
    const elTotal     = document.getElementById('dash-casos-total');
    const elFinal     = document.getElementById('dash-casos-finalizados');
    const elAbiertas  = document.getElementById('dash-casos-abiertas');
    const elPacientes = document.getElementById('dash-pacientes-unicos');

    [elTotal, elFinal, elAbiertas, elPacientes]
        .forEach(el => { if (el) el.textContent = '...'; });

    try {
        if (!organizacionIdActual) throw new Error('organizacion_id no disponible');

        const ahora     = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

        console.log('[DASH] → Casos clínicos, org:', organizacionIdActual, '| desde:', inicioMes);

        // Trae TODAS las consultas del mes con sus campos mínimos.
        // RLS en Supabase deja pasar las filas donde el usuario es medico_id
        // O donde organizacion_id coincide si las políticas son por org.
        const { data, error, count } = await conexionSupabase
            .from('consultas')
            .select('id, finalizada, paciente_id', { count: 'exact' })
            .eq('organizacion_id', organizacionIdActual)
            .gte('created_at', inicioMes);

        if (error) {
            console.error('[DASH] Error al leer consultas:', error.code, error.message);
            throw error;
        }

        const registros       = data || [];
        const total           = registros.length;
        const finalizadas     = registros.filter(c => c.finalizada === true).length;
        const abiertas        = total - finalizadas;
        const pacientesUnicos = new Set(registros.map(c => c.paciente_id)).size;

        console.log('[DASH] ← Casos del mes:', total, '| Finalizadas:', finalizadas, '| Pacientes:', pacientesUnicos);

        const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

        if (elTotal)     elTotal.textContent     = fmt(total);
        if (elFinal)     elFinal.textContent     = fmt(finalizadas);
        if (elAbiertas)  elAbiertas.textContent  = fmt(abiertas);
        if (elPacientes) elPacientes.textContent = fmt(pacientesUnicos);

    } catch (err) {
        console.error('[DASH] ✘ Métricas clínicas fallaron:', err.message);
        if (elTotal) elTotal.textContent = '!';
        if (elFinal) elFinal.textContent = '—';
        if (elAbiertas) elAbiertas.textContent = '—';
        if (elPacientes) elPacientes.textContent = '—';
    }
}

// ─── Métricas de Ingresos (Caja Transacciones) ────────────────────────────────────────────────────────
async function cargarMetricasIngresos() {
    const elTotal  = document.getElementById('dash-ingresos-total');
    const elMes    = document.getElementById('dash-ingresos-mes');
    const elSemana = document.getElementById('dash-ingresos-semana');
    const elHoy    = document.getElementById('dash-ingresos-hoy');

    [elTotal, elMes, elSemana, elHoy]
        .forEach(el => { if (el) el.textContent = '...'; });

    try {
        if (!organizacionIdActual) throw new Error('organizacion_id no disponible');

        const ahora     = new Date();
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const lunesSemana = new Date(inicioHoy);
        lunesSemana.setDate(inicioHoy.getDate() - ((inicioHoy.getDay() + 6) % 7)); // ISO lunes
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

        console.log('[DASH] → Ingresos Reales de Caja, org:', organizacionIdActual);

        // Consultar transacciones de ingreso reales completadas
        const { data: transacciones, error } = await conexionSupabase
            .from('caja_transacciones')
            .select('total, created_at')
            .eq('organizacion_id', organizacionIdActual)
            .eq('tipo', 'ingreso')
            .eq('estatus', 'completada')
            .gte('created_at', inicioMes.toISOString());

        if (error) {
            // Si la tabla aún no existe, fallará aquí sin romper el resto del dashboard
            if (error.code === '42P01') {
                console.warn('[DASH] ⚠️ Tabla caja_transacciones aún no creada en Supabase. Corre el SQL.');
            } else {
                throw error;
            }
        }

        const lista = transacciones || [];

        const sumarTotal = (arr) => arr.reduce((acc, t) => acc + parseFloat(t.total || 0), 0);
        const filtrarDesde = (desde) => lista.filter(t => new Date(t.created_at) >= desde);

        const totalMes    = sumarTotal(lista);
        const totalSemana = sumarTotal(filtrarDesde(lunesSemana));
        const totalHoy    = sumarTotal(filtrarDesde(inicioHoy));

        // Formato monetario
        const $fmt = monto => monto >= 1000
            ? `$${(monto / 1000).toFixed(1)}k`
            : `$${monto.toFixed(0)}`;

        if (elTotal)  elTotal.textContent  = $fmt(totalMes).replace('$', ''); // Número grande sin $
        if (elMes)    elMes.textContent    = $fmt(totalMes);
        if (elSemana) elSemana.textContent = $fmt(totalSemana);
        if (elHoy)    elHoy.textContent    = $fmt(totalHoy);

        console.log('[DASH] ← Ingresos Totales Mes:', totalMes);

    } catch (err) {
        console.error('[DASH] ✘ Métricas ingresos fallaron:', err.message);
        if (elTotal) elTotal.textContent = '!';
        [elMes, elSemana, elHoy].forEach(el => { if (el) el.textContent = '$—'; });
    }
}

function actualizarPerfilUI(datos) {
    const tituloBienvenida = document.getElementById('tituloBienvenida');
    if (tituloBienvenida) {
        let primerNombre = datos.nombre_completo ? datos.nombre_completo.replace(/^(Dr\.|Dra\.|Dr|Dra)\s+/i, '').trim().split(" ")[0] : "Doctor";
        tituloBienvenida.textContent = `Bienvenido(a) ${primerNombre}, ¡así están las cosas hoy!`;
    }
}

async function cargarCitasEnEspera() {
    const hoy = new Date().toISOString().split('T')[0];
    const contenedor = document.getElementById('contenedorCitasEspera');
    const contador = document.getElementById('contadorEspera');

    const { data: citas } = await conexionSupabase
        .from('agenda_citas')
        .select('*')
        .eq('organizacion_id', organizacionIdActual)
        .eq('medico_id', usuarioActualId) 
        .eq('estado', 'en_espera')
        .eq('fecha', hoy)
        .order('hora', { ascending: true });

    renderizarCitas(citas, contenedor, contador);
}

function renderizarCitas(citas, contenedor, contador) {
    if (!contenedor) return;
    contenedor.innerHTML = "";
    let total = 0;

    if (citas && citas.length > 0) {
        citas.forEach((cita) => {
            total++;
            contenedor.innerHTML += `
                <div class="citaFila" style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: bold; color: #032F40;">${cita.hora}</div>
                    <div style="flex: 1; margin-left: 15px;">
                        <strong style="color: #89C2D9;">${cita.nombre_mascota}</strong>
                        <p style="font-size: 0.8rem; margin: 0;">${cita.nombre_dueno}</p>
                    </div>
                    <button class="botonMini" style="background: #F27405; color: white; border: none; padding: 5px 10px; border-radius: 5px;" onclick="iniciarConsulta('${cita.id}', '${cita.paciente_id}')">Atender</button>
                </div>`;
        });
    } else {
        contenedor.innerHTML = `<div style="text-align: center; padding: 2rem;"><p>Sala vacía.</p></div>`;
    }
    if (contador) contador.innerText = `${total} citas`;
}

window.iniciarConsulta = async (idCita, idPaciente) => {
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    await conexionSupabase.from('agenda_citas').update({ estado: "en_consulta", hora_inicio_real: hora }).eq('id', idCita);
    window.location.assign(`VETERINARIO_CONSULTA.html?idCita=${idCita}&idPaciente=${idPaciente}`);
};



async function monitorearAtendidosMes() {
    const d = new Date();
    const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const { count } = await conexionSupabase.from('agenda_citas').select('*', { count: 'exact', head: true })
        .eq('medico_id', usuarioActualId).eq('estado', 'finalizada').gte('fecha', inicio);
    if (document.getElementById('txtPacientesAtendidos')) document.getElementById('txtPacientesAtendidos').innerText = count || 0;
}

let canalAlertasInventario = null;

function iniciarSistemaAlertas() {
    // 1. Cargar notificaciones existentes (Calculadas desde inventario_productos)
    cargarNotificacionesDashboard();

    // 2. Escuchar cambios en tiempo real en la tabla inventario_productos
    if (canalAlertasInventario) {
        conexionSupabase.removeChannel(canalAlertasInventario);
    }

    canalAlertasInventario = conexionSupabase.channel('alertas_inventario');
    
    canalAlertasInventario
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'inventario_productos', 
            filter: `organizacion_id=eq.${organizacionIdActual}` 
        }, (p) => {
            // Si el nuevo stock total cruzó el umbral del mínimo
            if (parseFloat(p.new.stock_total || 0) <= parseFloat(p.new.stock_minimo || 0)) {
                cargarNotificacionesDashboard();
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e=>console.log(e));
            }
        })
        .subscribe();

    // 3. Inicializar Firebase Cloud Messaging
    inicializarFirebasePush();
}

async function cargarNotificacionesDashboard() {
    const lista = document.getElementById('listaNotificacionesDashboard');
    if (!lista) return;

    let todasNotificaciones = [];

    // Revisar el stock real actual de tienda y dietas
    const { data: dataInv, error: errorInv } = await conexionSupabase
        .from('inventario_productos')
        .select('id, nombre_comercial, stock_total, stock_minimo, categoria, updated_at')
        .eq('organizacion_id', organizacionIdActual)
        .in('categoria', ['tienda', 'dietas', 'farmacia']); // Incluimos todo para que no falte

    if (!errorInv && dataInv) {
        const stockCritico = dataInv.filter(p => parseFloat(p.stock_total || 0) <= parseFloat(p.stock_minimo || 0));
        
        // Agregar cada producto crítico como una notificación
        stockCritico.forEach(p => {
            todasNotificaciones.push({
                tipo: 'alerta_stock',
                titulo: `Inventario Crítico (${p.categoria})`,
                mensaje: `El producto "${p.nombre_comercial}" está en nivel bajo o agotado (Stock: ${p.stock_total}).`,
                created_at: p.updated_at || new Date().toISOString()
            });
        });
    } else {
        console.error("Error al cargar inventario para notificaciones:", errorInv);
    }

    // Ordenar y limitar a las últimas 6
    todasNotificaciones.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const notificacionesMostrar = todasNotificaciones.slice(0, 6);

    if (notificacionesMostrar.length === 0) {
        lista.innerHTML = `<li class="item-notificacion" style="justify-content: center; color: #888; font-size: 0.9rem;">No hay notificaciones recientes.</li>`;
        return;
    }

    let html = '';
    notificacionesMostrar.forEach(n => {
        let icono = 'inventory_2';
        let claseAlerta = 'alerta';

        const d = new Date(n.created_at);
        // Si no hay fecha de update, mostrar Hoy
        let fechaText = 'Actualizado';

        html += `
        <li class="item-notificacion">
            <span class="material-symbols-rounded icono-notif ${claseAlerta}">${icono}</span>
            <div class="texto-notif">
                <strong>${n.titulo || 'Notificación'}</strong>
                <span>${n.mensaje || ''}</span>
                <span class="fecha-notif" style="color:#d9534f; font-weight:bold;">${fechaText}</span>
            </div>
        </li>`;
    });
    lista.innerHTML = html;
}

// ====================================================================================
// FIREBASE CLOUD MESSAGING (PUSH BACKGROUND)
// ====================================================================================
async function inicializarFirebasePush() {
    const firebaseConfig = {
        apiKey: "AIzaSyAiViaTebE25FgFqnp4j8glDxaENcKqrrk",
        authDomain: "protect-pet.firebaseapp.com",
        projectId: "protect-pet",
        storageBucket: "protect-pet.firebasestorage.app",
        messagingSenderId: "143773812000",
        appId: "1:143773812000:web:2d59e3f38aa6caf7948345"
    };

    try {
        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // Solicitar permisos al navegador
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notificaciones Push permitidas.');
            
            // Reemplaza "TU_VAPID_KEY" con la llave VAPID de tu proyecto Firebase (pestaña Cloud Messaging)
            // Si la omites, algunas versiones de Firebase pueden fallar.
            try {
                const token = await getToken(messaging, { 
                    vapidKey: 'BMT-Y4k8D4d6aN5cM_E2v4d7b7B_9O3q3bQxXj-yL9m5yN1d6hZ_3qT7xL8v9A_b2zZ5k4mJ_9tY1yN5qT8' // VAPID Placeholder
                });
                
                if (token) {
                    console.log('Firebase Token obtenido:', token);
                    // Aquí deberías guardar este token en Supabase en el perfil del usuario:
                    // await conexionSupabase.from('perfiles').update({ fcm_token: token }).eq('id', usuarioActualId);
                }
            } catch (err) {
                console.warn('No se pudo obtener el token VAPID. Faltan llaves válidas:', err);
            }

            // Escuchar mensajes cuando la app está ABIERTA (Foreground)
            onMessage(messaging, (payload) => {
                console.log('Mensaje recibido en foreground ', payload);
                const notificationTitle = payload.notification?.title || 'Protect Pet';
                const notificationOptions = {
                    body: payload.notification?.body,
                    icon: '/favicon.ico'
                };

                new Notification(notificationTitle, notificationOptions);
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e=>console.log(e));
            });

        } else {
            console.log('Permiso de notificaciones denegado.');
        }
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
    }
}


let scannerChannel = null;

function configurarBotonScanner() {
    const btnScanner = document.getElementById('btnVerHorario');
    const modalEscaner = document.getElementById('escanerOverlay');
    const btnCerrar = document.getElementById('btnCerrarEscanerModal');
    const qrCanvas = document.getElementById('escanerQrCanvas');
    const pinTxt = document.getElementById('escanerPinTxt');
    const statusIcon = document.getElementById('escanerStatusIcon');
    const statusTxt = document.getElementById('escanerStatusTxt');
    const feedbackBox = document.getElementById('escanerFeedback');
    const feedbackCode = document.getElementById('escanerFeedbackCode');

    if (!btnScanner || !modalEscaner) return;

    btnScanner.addEventListener('click', () => {
        modalEscaner.style.display = 'flex';
        iniciarSesionScanner();
    });

    btnCerrar.addEventListener('click', () => {
        modalEscaner.style.display = 'none';
        // NO removemos el canal aquí para que siga escuchando en background
    });

    async function iniciarSesionScanner() {
        // Generar PIN aleatorio de 6 caracteres
        const sesionId = Math.random().toString(36).substring(2, 8).toUpperCase();
        pinTxt.textContent = sesionId;

        // Limpiar UI
        statusIcon.textContent = 'pending';
        statusIcon.style.color = '#F27405';
        statusTxt.textContent = 'Esperando conexión...';
        statusTxt.style.color = '#6b7a80';
        feedbackBox.style.display = 'none';

        // Generar URL para el QR
        let baseUrl = window.location.origin;
        if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            baseUrl = 'https://protect-pet.web.app'; // Usar la URL en vivo si estamos en entorno local, para que el celular lo alcance
        }
        const escanerUrl = `${baseUrl}/ESCANER_MOVIL.html?sesion=${sesionId}`;
        
        try {
            await QRCode.toCanvas(qrCanvas, escanerUrl, {
                width: 180,
                margin: 2,
                color: {
                    dark: '#032F40',
                    light: '#FFFFFF'
                }
            });
        } catch (e) {
            console.error('Error generando QR', e);
        }

        // Conectar a Supabase Realtime
        if (scannerChannel) {
            conexionSupabase.removeChannel(scannerChannel);
        }

        scannerChannel = conexionSupabase.channel(`scanner_${sesionId}`, {
            config: {
                broadcast: { ack: true }
            }
        });
        
        scannerChannel.on('broadcast', { event: 'scan' }, (payload) => {
            const data = payload.payload;
            
            // Mostrar feedback
            feedbackBox.style.display = 'block';
            feedbackCode.textContent = data.codigo_barras;

            // Reproducir sonido
            const beep = new Audio('https://www.soundjay.com/button/beep-07.wav');
            beep.play().catch(e=>console.log(e));

            // Guardar código escaneado en variable global para que otros módulos (como Caja Registradora) lo puedan consumir
            window.ultimoCodigoEscaneado = data.codigo_barras;
            
            // Emitir evento global (CustomEvent) para que la caja registradora lo escuche
            window.dispatchEvent(new CustomEvent('escanerRemotoDetectado', { detail: data.codigo_barras }));

            // Enviar acuse de recibo al celular
            scannerChannel.send({
                type: 'broadcast',
                event: 'ack',
                payload: { codigo: data.codigo_barras }
            });
            
            setTimeout(() => {
                feedbackBox.style.display = 'none';
            }, 3000);
        });

        scannerChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                statusIcon.textContent = 'check_circle';
                statusIcon.style.color = '#4CAF50';
                statusTxt.textContent = 'Escáner conectado (Esperando lecturas...)';
                statusTxt.style.color = '#4CAF50';
            }
        });
    }
}

async function cerrarSesionApp(e) {
    if(e) e.preventDefault();
    await conexionSupabase.auth.signOut();
    // window.location.assign("LOGIN.html");
}
