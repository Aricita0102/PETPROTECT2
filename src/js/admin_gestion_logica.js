import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, query, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// --- 1. Configuración de Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyAiViaTebE25FgFqnp4j8glDxaENcKqrrk",
    authDomain: "protect-pet.firebaseapp.com",
    projectId: "protect-pet",
    storageBucket: "protect-pet.firebasestorage.app",
    messagingSenderId: "143773812000",
    appId: "1:143773812000:web:2d59e3f38aa6caf7948345"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Referencias del DOM ---
const contenedorPendientes = document.getElementById('contenedorPendientes');
const contenedorActivos = document.getElementById('contenedorActivos');
const listaActivosVertical = document.getElementById('listaActivosVertical');
const conteoTotal = document.getElementById('conteoTotal');

let currentAdminId = null;   // ID del administrador
let currentAdminCode = null; // Código de la clínica del administrador

// --- Utilidades Visuales ---
function obtenerColorFondo(uid) {
    const colores = ['fondo-azul', 'fondo-naranja', 'fondo-amarillo'];
    return colores[uid.charCodeAt(uid.length - 1) % colores.length];
}

function formatearFechaHora(timestamp) {
    if (!timestamp) return "Reciente";
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
}

// --- 2. Control de Acceso (Auth Guard) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentAdminId = user.uid; 
        
        // Verificamos rol y obtenemos el código de la clínica para filtrar
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.rol === "administrador") {
                // Guardamos el código asegurando que no tenga espacios
                currentAdminCode = (data.codigoClinica || "").trim(); 
                iniciarEscuchaUsuarios(); 
            } else {
                window.location.href = "LOGIN.html";
            }
        } else {
            window.location.href = "LOGIN.html";
        }
    } else {
        window.location.href = "LOGIN.html"; 
    }
});

// --- 3. Listener en Tiempo Real (FILTRO SOLO POR CODIGOCLINICA) ---
function iniciarEscuchaUsuarios() {
    onSnapshot(collection(db, "usuarios"), (snapshot) => {
        if (!contenedorPendientes || !listaActivosVertical) return;
        
        contenedorPendientes.innerHTML = "";
        listaActivosVertical.innerHTML = "";
        let contadorActivos = 0;
        let haySolicitudes = false;

        snapshot.forEach((docUsuario) => {
            const datos = docUsuario.data();
            const id = docUsuario.id;
            const esAdmin = datos.rol === "administrador";

            // --- FILTRO SIMPLIFICADO ---
            const soyYo = id === currentAdminId;
            
            // Comparamos directamente el campo 'codigoClinica'
            const userCode = (datos.codigoClinica || "").trim();
            const adminCode = (currentAdminCode || "").trim();
            
            const perteneceAMiClinica = userCode === adminCode;

            // Si el código no coincide y no soy yo, lo ignoramos
            if (!soyYo && (!adminCode || !perteneceAMiClinica)) return; 

            // --- CLASIFICACIÓN DE ESTADOS ---

            // CASO A: SOLICITUDES O SUSPENDIDOS (Para gestión)
            if ((datos.estatus === "revision" || datos.estatus === "suspendido") && !esAdmin) {
                renderizarPendiente(id, datos);
                haySolicitudes = true;
            } 
            // CASO B: PERSONAL ACTIVO (Para lista del equipo)
            // Si estatus es 'activo' O es el administrador (siempre activo)
            else if (datos.estatus === "activo" || soyYo) {
                renderizarActivo(id, datos, esAdmin); // Pasamos esAdmin para diferenciar visualmente
                
                // Contamos a todos los que aparecen en la lista de activos (incluido admin)
                contadorActivos++;
            }
        });

        // Actualizamos el contador visual
        if (conteoTotal) conteoTotal.innerText = contadorActivos.toString().padStart(2, '0');
        
        // Feedback visual si no hay pendientes
        if (!haySolicitudes) {
            contenedorPendientes.innerHTML = `
                <div style="text-align:center; padding:2rem; color:#888; width:100%;">
                    <p>No hay solicitudes pendientes ni usuarios suspendidos.</p>
                </div>`;
        }
    });
}

// --- 4. Renderizado: Tarjetas Pendientes / Suspendidos ---
function renderizarPendiente(id, datos) {
    const tarjeta = document.createElement('div');
    tarjeta.className = "tarjeta-personal";
    
    const esSuspendido = datos.estatus === "suspendido";
    const nombre = datos.nombreCompleto || "Usuario";
    const claseColor = esSuspendido ? 'fondo-rojo' : obtenerColorFondo(id);
    
    const avatar = datos.fotoUrl 
        ? `<img src="${datos.fotoUrl}" alt="Foto">` 
        : `<span>${nombre.charAt(0).toUpperCase()}</span>`;

    const fechaMostrar = datos.fechaSolicitud || datos.fechaVinculacion;

    tarjeta.innerHTML = `
        <div class="bloque-izquierdo">
            <div class="avatarCircular ${!datos.fotoUrl ? claseColor : ''}">${avatar}</div>
            <div class="info-usuario">
                <span class="nombre-usuario">
                    ${nombre} 
                    <small style="color:${esSuspendido ? '#D32F2F' : '#F29F05'}; font-weight:bold; margin-left:5px;">
                        ${esSuspendido ? '● SUSPENDIDO' : '● SOLICITUD NUEVA'}
                    </small>
                </span>
                <span class="rol-usuario" style="color:#032F40;">${(datos.rol || 'Personal').toUpperCase()}</span>
                <span class="fecha-info">${esSuspendido ? 'Suspendido:' : 'Solicitó:'} ${formatearFechaHora(fechaMostrar)}</span>
                <span class="email-usuario">${datos.correo}</span>
            </div>
        </div>
        <div class="bloque-derecho">
            <div class="contenedor-botones">
                <button class="btn-solido btn-rojo" onclick="rechazarVinculacion('${id}', ${esSuspendido})">
                    ${esSuspendido ? 'Expulsar' : 'Rechazar'}
                </button>
                <button class="btn-solido btn-azul" onclick="actualizarEstatus('${id}', 'activo')">
                    ${esSuspendido ? 'Reactivar Acceso' : 'Aceptar Ingreso'}
                </button>
            </div>
        </div>
    `;
    contenedorPendientes.appendChild(tarjeta);
}

// --- 5. Renderizado: Tarjetas Personal Activo ---
function renderizarActivo(id, datos, esAdmin) {
    const tarjeta = document.createElement('div');
    tarjeta.className = esAdmin ? "tarjeta-personal estilo-admin" : "tarjeta-personal";
    
    const nombre = datos.nombreCompleto || "Usuario";
    const avatar = datos.fotoUrl 
        ? `<img src="${datos.fotoUrl}" alt="Foto">` 
        : `<span>${nombre.charAt(0).toUpperCase()}</span>`;

    tarjeta.innerHTML = `
        <div class="bloque-izquierdo">
            <div class="avatarCircular ${!datos.fotoUrl ? obtenerColorFondo(id) : ''}">${avatar}</div>
            <div class="info-usuario">
                <span class="nombre-usuario">${nombre}</span>
                <span class="email-usuario">${datos.correo}</span>
                ${!esAdmin ? `<span class="fecha-info">Activo desde: ${formatearFechaHora(datos.fechaActivacion)}</span>` : ''}
            </div>
        </div>
        <div class="bloque-derecho">
            ${esAdmin ? '<span class="rol-usuario" style="color:#F29F05; font-weight:bold;">ADMINISTRADOR (TÚ)</span>' : `
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                    <span class="rol-usuario">${(datos.rol || 'Personal').toUpperCase()}</span>
                    <button class="btn-suspender-borde" onclick="confirmarSuspension('${id}', '${nombre}')">Suspender Acceso</button>
                </div>
            `}
        </div>
    `;
    listaActivosVertical.appendChild(tarjeta);
}

// --- 6. Acciones de Base de Datos ---

window.actualizarEstatus = async (id, nuevoEstatus) => {
    try {
        await updateDoc(doc(db, "usuarios", id), { 
            estatus: nuevoEstatus,
            fechaActivacion: serverTimestamp(),
            // Aseguramos que el código se mantenga
            codigoClinica: currentAdminCode 
        });
    } catch (e) { 
        console.error("Error al cambiar estatus: ", e); 
        alert("Error de red al actualizar usuario.");
    }
};

window.confirmarSuspension = (id, nombre) => {
    if(confirm(`⚠️ ¿Suspender acceso a ${nombre}?\n\nNo podrá entrar al sistema hasta que lo reactives.`)) {
        window.actualizarEstatus(id, 'suspendido');
    }
};

window.rechazarVinculacion = async (id, esSuspendido) => {
    const accion = esSuspendido ? "eliminar definitivamente" : "rechazar";
    const mensaje = `¿Confirmas que deseas ${accion} a este usuario? Se desvinculará de tu clínica.`;
    
    if(confirm(mensaje)) {
        try {
            await updateDoc(doc(db, "usuarios", id), { 
                estatus: "sin_vincular", 
                codigoClinica: "sin_codigo", // Rompemos el vínculo por código
                // ELIMINADA LA LÍNEA QUE CAMBIABA EL ROL A 'usuario'
                // El rol se mantiene intacto (ej. 'veterinario' o 'asistente')
                fechaBaja: serverTimestamp() 
            });
        } catch (e) {
            console.error("Error al desvincular:", e);
            alert("Error al desvincular.");
        }
    }
};

// --- 7. Navegación ---
const activarPestana = (tipo) => {
    const isActivos = tipo === 'activos';
    
    contenedorPendientes.style.display = isActivos ? "none" : "flex";
    contenedorActivos.style.display = isActivos ? "block" : "none";
    
    document.getElementById('btnPestanaActivos').classList.toggle('activa', isActivos);
    document.getElementById('btnPestanaPendientes').classList.toggle('activa', !isActivos);
};

document.getElementById('btnPestanaPendientes').onclick = () => activarPestana('pendientes');
document.getElementById('btnPestanaActivos').onclick = () => activarPestana('activos');

// --- 8. Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const vista = params.get('vista');
    
    if(vista === 'activos') {
        activarPestana('activos');
    } else {
        activarPestana('pendientes');
    }
});