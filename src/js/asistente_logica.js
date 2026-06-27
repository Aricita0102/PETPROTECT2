import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { 
    getFirestore, doc, onSnapshot, updateDoc, serverTimestamp, addDoc,
    collection, query, getDocs, limit, where, orderBy 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// --- 1. CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAiViaTebE25FgFqnp4j8glDxaENcKqrrk",
    authDomain: "protect-pet.firebaseapp.com",
    projectId: "protect-pet",
    storageBucket: "protect-pet.firebasestorage.app",
    messagingSenderId: "143773812000",
    appId: "1:143773812000:web:2d59e3f38aa6caf7948345"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables Globales
const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const hoyIso = new Date().toISOString().split('T')[0];
let usuarioActual = null;

// Inicializar Fecha
const txtFecha = document.getElementById('fechaActual');
if(txtFecha) txtFecha.innerText = "Hoy es " + new Date().toLocaleDateString('es-ES', opciones);

// ============================================================
// 2. MONITOR DE SESIÓN Y SEGURIDAD (CORE)
// ============================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioActual = user;
        const userRef = doc(db, "usuarios", user.uid);
        
        // Escucha en TIEMPO REAL (Seguridad)
        onSnapshot(userRef, (docSnap) => {
            // Referencias a elementos de interfaz generales
            const loader = document.getElementById('pantallaCarga');
            if (loader) loader.style.display = "none"; // Quitar carga

            if (docSnap.exists()) {
                const datos = docSnap.data();
                
                // Actualizar UI del Perfil
                actualizarPerfilUI(datos);

                // Lógica de Acceso Robusta
                gestionarAcceso(datos);
            } else {
                console.error("Error crítico: Usuario sin perfil.");
            }
        }, (error) => {
            console.error("Error de seguridad:", error);
            logout();
        });
    } else {
        localStorage.removeItem("userEmail");
        window.location.href = "index.html"; 
    }
});

// ============================================================
// 3. GESTIÓN DE PANTALLAS Y BLOQUEO
// ============================================================
function gestionarAcceso(datos) {
    const bloqueo = document.getElementById('seccionBloqueo');
    const contenido = document.getElementById('contenidoPrincipal');
    
    // REGLA DE ORO: Solo entra si es 'activo' Y tiene rol 'asistente'
    const accesoPermitido = datos.estatus === "activo" && datos.rol === "asistente";

    if (accesoPermitido) {
        // --- ACCESO CONCEDIDO ---
        if (bloqueo) bloqueo.style.display = "none";
        if (contenido) contenido.style.display = "flex";
        
        // Cargar datos del dashboard
        cargarResumenDashboard();
        cargarNotificacionesCombinadas();
    } else {
        // --- ACCESO DENEGADO / BLOQUEADO ---
        if (bloqueo) bloqueo.style.display = "flex";
        if (contenido) contenido.style.display = "none";
        
        gestionarPantallaBloqueo(datos);
    }
}

function gestionarPantallaBloqueo(datos) {
    const msgEstatus = document.getElementById('msgEstatus');
    const inputCodigo = document.getElementById('inputCodigoClinica');
    const btnVincular = document.getElementById('btnVincular');
    const btnEditar = document.getElementById('btnEditarSolicitud');

    // Limpieza previa
    if (msgEstatus) msgEstatus.className = "";

    if (datos.estatus === "suspendido") {
        // CASO 1: SUSPENDIDO
        if (msgEstatus) {
            msgEstatus.innerHTML = `⛔ <strong>ACCESO SUSPENDIDO</strong><br>Tu cuenta ha sido inhabilitada temporalmente.<br>Contacta a tu administrador.`;
            msgEstatus.style.color = "#D32F2F"; 
        }
        // Ocultamos inputs por seguridad
        if (inputCodigo) inputCodigo.style.display = 'none';
        if (btnVincular) btnVincular.style.display = 'none';
        if (btnEditar) btnEditar.style.display = 'none';

    } else if (datos.estatus === "revision") {
        // CASO 2: EN REVISIÓN
        if (msgEstatus) {
            msgEstatus.innerText = `Solicitud enviada a ${datos.nombreClinica || 'la clínica'}. Esperando aprobación...`;
            msgEstatus.style.color = "#F27405";
        }
        if (inputCodigo) {
            inputCodigo.value = datos.codigoClinica || "";
            inputCodigo.style.display = 'block';
            inputCodigo.disabled = true;
        }
        if (btnVincular) btnVincular.style.display = 'none';
        
        // Permitir editar por si se equivocó de código
        if (btnEditar) {
            btnEditar.style.display = "block";
            btnEditar.onclick = () => {
                inputCodigo.disabled = false;
                inputCodigo.value = "";
                inputCodigo.focus();
                btnVincular.style.display = "block";
                btnVincular.disabled = false;
                btnVincular.innerText = "Reenviar Solicitud";
                btnEditar.style.display = "none";
            };
        }

    } else {
        // CASO 3: NUEVO / RECHAZADO / SIN VINCULAR
        if (msgEstatus) {
            msgEstatus.innerText = "Ingresa el código proporcionado por tu clínica.";
            msgEstatus.style.color = "#666";
        }
        if (inputCodigo) {
            inputCodigo.style.display = 'block';
            inputCodigo.disabled = false;
            inputCodigo.value = "";
        }
        if (btnVincular) {
            btnVincular.style.display = 'block';
            btnVincular.disabled = false;
            btnVincular.innerText = "Solicitar Activación";
        }
        if (btnEditar) btnEditar.style.display = "none";
    }
}

// ============================================================
// 4. LÓGICA DE VINCULACIÓN SEGURA
// ============================================================
const btnVincularAction = document.getElementById('btnVincular');
if (btnVincularAction) {
    btnVincularAction.addEventListener('click', async () => {
        const inputCodigo = document.getElementById('inputCodigoClinica');
        
        if (!inputCodigo || !inputCodigo.value.trim()) { 
            alert("Por favor, ingresa el código."); 
            return; 
        }

        // Sanitización
        const codigoIngresado = inputCodigo.value.trim().toUpperCase();

        try {
            btnVincularAction.innerText = "Verificando...";
            btnVincularAction.disabled = true;

            // 1. Buscamos al ADMIN que tenga este codigoClinica
            const q = query(
                collection(db, "usuarios"), 
                where("codigoClinica", "==", codigoIngresado),
                where("rol", "==", "administrador")
            );
            
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const adminDoc = querySnapshot.docs[0];
                const adminData = adminDoc.data();

                // 2. Actualizamos el perfil del ASISTENTE
                await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
                    estatus: "revision",          // Estado seguro: Espera aprobación
                    rol: "asistente",             // Aseguramos rol
                    codigoClinica: codigoIngresado, // El código que usó
                    clinicaId: codigoIngresado,   // Redundancia para filtros
                    adminId: adminDoc.id,         // Vínculo con el jefe
                    nombreClinica: adminData.nombreClinica || "Clínica Veterinaria",
                    fechaSolicitud: serverTimestamp()
                });
                
                alert("¡Solicitud enviada! Avisa a tu administrador.");
            } else {
                alert("Código no válido o no pertenece a un administrador.");
                btnVincularAction.disabled = false;
                btnVincularAction.innerText = "Solicitar Activación";
            }

        } catch (error) { 
            console.error("Error al vincular:", error);
            alert("Error de conexión.");
            btnVincularAction.disabled = false;
            btnVincularAction.innerText = "Solicitar Activación";
        }
    });
}

// ============================================================
// 5. UI HELPERS (PERFIL)
// ============================================================
function actualizarPerfilUI(datos) {
    const nombreLateral = document.getElementById('nombreLateral');
    const rolLateral = document.getElementById('txtRolLateral');
    const saludoHeader = document.getElementById('saludoHorario');
    const avatarDiv = document.getElementById('avatarLetras'); 

    const nombreReal = datos.nombreCompleto || datos.nombre || "Asistente";
    const primerNombre = nombreReal.split(" ")[0];

    if (nombreLateral) nombreLateral.innerText = nombreReal;
    if (rolLateral) rolLateral.innerText = (datos.rol || "ASISTENTE").toUpperCase();
    if (saludoHeader) saludoHeader.innerText = `Hola, ${primerNombre}`;

    const urlFoto = datos.fotoPerfil || datos.fotoUrl;
    if (avatarDiv) {
        if (urlFoto) {
            avatarDiv.style.backgroundImage = `url('${urlFoto}')`;
            avatarDiv.style.backgroundSize = "cover";
            avatarDiv.style.backgroundPosition = "center";
            avatarDiv.innerText = ""; 
        } else {
            avatarDiv.style.backgroundImage = "none";
            avatarDiv.innerText = nombreReal.substring(0, 2).toUpperCase();
        }
    }
}

// ============================================================
// 6. FUNCIONES DEL DASHBOARD
// ============================================================

// Acciones Rápidas
const btnNuevoPaciente = document.querySelector('.btn-accion-rapida.verde');
if (btnNuevoPaciente) {
    btnNuevoPaciente.addEventListener('click', () => {
        window.location.href = "VETERINARIO_LISTA_PACIENTES.html?nuevo=true";
    });
}

// Cargar Resumen (Citas)
function cargarResumenDashboard() {
    const listaEnEspera = document.getElementById('listaEnEspera');
    const listaProximas = document.getElementById('listaProximas');
    const lblEnEspera = document.getElementById('lblEnEspera');

    const q = query(
        collection(db, "agenda_citas"),
        where("fecha", "==", hoyIso),
        orderBy("hora", "asc")
    );

    onSnapshot(q, (snapshot) => {
        if(!listaEnEspera || !listaProximas) return;

        let htmlEspera = "";
        let htmlProximas = "";
        let countEspera = 0;
        let countProximas = 0;

        snapshot.forEach(docSnap => {
            const cita = docSnap.data();
            const htmlItem = `
                <div class="item-agenda-mini ${cita.estado === 'en_espera' ? 'en-espera' : ''}">
                    <div class="dato-hora">${cita.hora}</div>
                    <div class="dato-info">
                        <strong>${cita.mascota} (${cita.dueno})</strong>
                        <small>${cita.motivo || 'Consulta General'}</small>
                    </div>
                </div>`;

            if (cita.estado === "en_espera") {
                htmlEspera += htmlItem;
                countEspera++;
            } else if (cita.estado === "confirmada" && countProximas < 5) {
                htmlProximas += htmlItem;
                countProximas++;
            }
        });

        if (countEspera > 0) {
            listaEnEspera.innerHTML = htmlEspera;
            lblEnEspera.innerText = `${countEspera} Pacientes`;
        } else {
            listaEnEspera.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded">chair</span><p>Sala vacía</p></div>`;
            lblEnEspera.innerText = "0 Pacientes";
        }
        listaProximas.innerHTML = countProximas > 0 ? htmlProximas : `<div class="empty-state"><p>No hay más citas.</p></div>`;
    });
}

// Cargar Notificaciones y Pagos
function cargarNotificacionesCombinadas() {
    const listaNotis = document.getElementById('listaNotificaciones');
    const badge = document.getElementById('badgeNotificaciones');

    if (!listaNotis) return;

    const qPagos = query(
        collection(db, "avisos_cobro"),
        where("estatus", "==", "pendiente"),
        orderBy("fecha", "desc"),
        limit(5)
    );

    onSnapshot(qPagos, (snapshotPagos) => {
        let htmlFinal = "";
        let totalAlertas = 0;

        snapshotPagos.forEach(docSnap => {
            const cobro = docSnap.data();
            totalAlertas++;

            htmlFinal += `
                <div class="item-notificacion tipo-pago">
                    <div class="icono-noti"><span class="material-symbols-rounded">payments</span></div>
                    <div class="contenido-noti">
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <strong>Cobro: ${cobro.pacienteNom}</strong>
                            <small style="color:#F27405; font-weight:bold;">$${(cobro.montoTotal || 0).toFixed(2)}</small>
                        </div>
                        <p>Orden enviada por: ${cobro.atendidoPor || 'Médico Veterinario'}</p>
                        <button class="btn-cobrar-mini" onclick="location.href='ASISTENTE PAGOS.html'">Ver Ticket y Cobrar</button>
                    </div>
                </div>`;
        });

        const qNotis = query(
            collection(db, "notificaciones"),
            where("target", "in", ["asistente", "general"]),
            orderBy("fecha", "desc"),
            limit(5)
        );

        getDocs(qNotis).then(snapNotis => {
            snapNotis.forEach(docG => {
                const n = docG.data();
                totalAlertas++;
                let icono = n.tipo === 'urgencia' ? 'e911_emergency' : 'notifications';
                let color = n.tipo === 'urgencia' ? '#EF4444' : '#032F40';

                htmlFinal += `
                    <div class="item-notificacion tipo-general">
                        <div class="icono-noti"><span class="material-symbols-rounded" style="color:${color}">${icono}</span></div>
                        <div class="contenido-noti">
                            <strong>${n.titulo}</strong>
                            <p>${n.mensaje}</p>
                        </div>
                    </div>`;
            });

            if (totalAlertas > 0) {
                listaNotis.innerHTML = htmlFinal;
                if(badge) badge.innerText = `${totalAlertas} Nuevas`;
            } else {
                listaNotis.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-rounded">notifications_off</span>
                        <p>No hay alertas o cobros pendientes.</p>
                    </div>`;
                if(badge) badge.innerText = "0 Nuevas";
            }
        });
    });
}

// Alerta de Emergencia
const btnEmergencia = document.getElementById('btnAlertaEmergencia');
if (btnEmergencia) {
    btnEmergencia.addEventListener('click', async () => {
        if (!confirm(" ¿ESTÁS SEGURO? \n\nEsto enviará una ALERTA MÉDICA MÁXIMA a todos los veterinarios.")) return;

        try {
            await addDoc(collection(db, "notificaciones"), {
                tipo: "urgencia_medica",
                target: "veterinario",
                titulo: "🚨 EMERGENCIA MÉDICA",
                mensaje: "Se requiere asistencia inmediata en recepción.",
                fecha: serverTimestamp(),
                estado: "activa",
                origen: "Asistente"
            });
            alert(" ALERTA ENVIADA.");
        } catch (error) { console.error(error); }
    });
}

// ============================================================
// 7. BUSCADOR RÁPIDO
// ============================================================
const inputBusquedaHeader = document.getElementById('inputBusqueda');
const contenedorResultados = document.getElementById('resultadosBusqueda');

if (inputBusquedaHeader && contenedorResultados) {
    inputBusquedaHeader.addEventListener('input', async (e) => {
        const texto = e.target.value.trim().toLowerCase();
        if (texto.length < 2) {
            contenedorResultados.style.display = 'none';
            return;
        }

        const q = query(collection(db, "mascotas"), limit(5));
        const querySnapshot = await getDocs(q);
        let htmlResultados = "";
        let coincidencias = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const nombreM = (data.nombre || "").toLowerCase();
            const nombreD = (data.dueno?.nombre || "").toLowerCase();
            const fotoUrl = data.foto || data.fotoUrl || 'https://via.placeholder.com/40x40/E2E8F0/E2E8F0?text=';

            if (nombreM.includes(texto) || nombreD.includes(texto)) {
                coincidencias++;
                htmlResultados += `
                    <div class="item-resultado" onclick="location.href='VETERINARIO_LISTA_PACIENTES.html'"> 
                        <div class="foto-resultado-mini" style="background-image: url('${fotoUrl}')"></div>
                        <div class="info-resultado">
                            <strong>${data.nombre}</strong>
                            <span>Dueño: ${data.dueno?.nombre || 'N/A'}</span>
                        </div>
                    </div>`;
            }
        });
        
        if(coincidencias === 0) {
             htmlResultados = `<div class="item-resultado" style="cursor:default; color:#999; text-align:center; padding: 15px;">Sin resultados</div>`;
        }

        contenedorResultados.innerHTML = htmlResultados;
        contenedorResultados.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!inputBusquedaHeader.contains(e.target) && !contenedorResultados.contains(e.target)) {
            contenedorResultados.style.display = 'none';
        }
    });
}

// ============================================================
// 8. CIERRE DE SESIÓN
// ============================================================
const logout = (e) => {
    if(e) e.preventDefault();
    signOut(auth).then(() => {
        localStorage.removeItem("userEmail");
        window.location.href = "index.html"; 
    });
};

if(document.getElementById('btnCerrarSesion')) document.getElementById('btnCerrarSesion').onclick = logout;
if(document.getElementById('btnCerrarSesionBloqueo')) document.getElementById('btnCerrarSesionBloqueo').onclick = logout;