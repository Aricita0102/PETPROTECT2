import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    updateEmail, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, updateDoc, 
    collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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

const IMGBB_API_KEY = "e4aceff8ee56059de57eebda2830c89a"; 

// --- 1. MONITOR DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        cargarDatosPerfil(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// --- 2. CARGAR PERFIL Y DATOS DE LA CLÍNICA ---
async function cargarDatosPerfil(uid) {
    const userRef = doc(db, "usuarios", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const d = snap.data();
        
        // Carga de campos de texto básicos
        if(document.getElementById('adjNombre')) document.getElementById('adjNombre').value = d.nombreCompleto || "";
        if(document.getElementById('adjArea')) document.getElementById('adjArea').value = d.areaApoyo || "Recepcion";
        
        // --- RECUPERACIÓN DE MÉDICO ASIGNADO (Corrección: Buscar quien me tiene como asistente) ---
        // Llamamos a una función especial que busca en la base de datos qué veterinario te tiene registrado.
        buscarMiVeterinario(uid);

        // --- RECUPERACIÓN DE DATOS DE SEGURIDAD ---
        if(document.getElementById('adjCorreo')) document.getElementById('adjCorreo').value = d.email || auth.currentUser.email;
        if(document.getElementById('adjCorreoEmergencia')) document.getElementById('adjCorreoEmergencia').value = d.emailEmergencia || "";
        if(document.getElementById('adjTelefono')) document.getElementById('adjTelefono').value = d.telefono || "";
        
        // Sidebar Info
        if(document.getElementById('txtNombreSide')) document.getElementById('txtNombreSide').innerText = d.nombreCompleto || "Asistente";

        // Mapeo de foto
        const urlFoto = d.fotoUrl || d.fotoPerfil;
        if (urlFoto) {
            actualizarVistasFoto(urlFoto);
        }

        if (d.codigoClinica) {
            cargarInfoClinica(d.codigoClinica);
            obtenerEquipo(d.codigoClinica, uid);
        }
    }
}

// --- NUEVA FUNCIÓN: BUSCAR VETERINARIO JEFE ---
async function buscarMiVeterinario(miUid) {
    try {
        // Buscamos usuarios donde el campo 'asistentesIds' contenga mi ID ('array-contains')
        const q = query(
            collection(db, "usuarios"), 
            where("asistentesIds", "array-contains", miUid)
        );
        
        const querySnapshot = await getDocs(q);
        let nombresVets = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.nombreCompleto) {
                nombresVets.push(data.nombreCompleto);
            }
        });

        const textoFinal = nombresVets.length > 0 ? nombresVets.join(", ") : "Sin asignar";
        
        if(document.getElementById('adjMedicoAsignado')) {
            document.getElementById('adjMedicoAsignado').value = textoFinal;
        }

    } catch (e) {
        console.error("Error buscando al veterinario:", e);
        if(document.getElementById('adjMedicoAsignado')) {
            document.getElementById('adjMedicoAsignado').value = "Error al cargar";
        }
    }
}

// --- 3. CARGAR INFO DE LA CLÍNICA ---
async function cargarInfoClinica(codigo) {
    try {
        const q = query(collection(db, "configuracion_clinica"), where("codigoAcceso", "==", codigo));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
            const clinica = doc.data();
            if(document.getElementById('txtNombreClinica')) document.getElementById('txtNombreClinica').innerText = clinica.nombre || "Protect Pet HQ";
            if(document.getElementById('txtDireccionClinica')) document.getElementById('txtDireccionClinica').innerText = clinica.direccion || "Sin dirección";
            
            if (clinica.logoUrl && document.getElementById('imgLogoClinica')) {
                document.getElementById('imgLogoClinica').src = clinica.logoUrl;
            }
        });
    } catch (e) {
        console.error("Error al cargar clínica:", e);
    }
}

// --- 4. SUBIR FOTO A IMGBB ---
const inputFoto = document.getElementById('inputFotoPerfil');
if (inputFoto) {
    inputFoto.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const placeholder = document.getElementById('placeholderFoto');
        if(placeholder) placeholder.innerText = "Subiendo...";

        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                const urlImagen = result.data.url;
                
                await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
                    fotoUrl: urlImagen,
                    fotoPerfil: urlImagen
                });

                actualizarVistasFoto(urlImagen);
                if(placeholder) placeholder.innerText = "Subir Foto";
                alert("¡Imagen actualizada con éxito!");
            } else {
                alert("Error de subida: " + result.error.message);
                if(placeholder) placeholder.innerText = "Error";
            }
        } catch (error) {
            console.error("Error de red:", error);
            if(placeholder) placeholder.innerText = "Error de Red";
        }
    });
}

function actualizarVistasFoto(url) {
    const cont = document.getElementById('fotoPerfilCont');
    const side = document.getElementById('sidebarFotoAsis');
    const placeholder = document.getElementById('placeholderFoto');

    if (cont) cont.style.backgroundImage = `url('${url}')`;
    if (side) side.style.backgroundImage = `url('${url}')`;
    if (placeholder) placeholder.style.display = 'none';
}

// --- 5. RECUPERAR EQUIPO MÉDICO ---
async function obtenerEquipo(codigoClinica, miUid) {
    const contenedor = document.getElementById('listaMiembrosEquipo');
    if (!contenedor) return;

    try {
        const qEquipo = query(collection(db, "usuarios"), where("codigoClinica", "==", codigoClinica));
        const qAdmin = query(collection(db, "usuarios"), where("codigoAccesoPropio", "==", codigoClinica));

        const [snapEquipo, snapAdmin] = await Promise.all([getDocs(qEquipo), getDocs(qAdmin)]);
        
        let htmlEquipo = "";
        let listaTotal = [];

        snapAdmin.forEach(doc => listaTotal.push({ id: doc.id, ...doc.data() }));
        snapEquipo.forEach(doc => {
            if (!listaTotal.find(m => m.id === doc.id)) {
                listaTotal.push({ id: doc.id, ...doc.data() });
            }
        });

        listaTotal.forEach((miembro) => {
            const esMismoUsuario = miembro.id === miUid;
            const urlFotoMiembro = miembro.fotoUrl || miembro.fotoPerfil || 'https://via.placeholder.com/45';
            
            htmlEquipo += `
                <div class="tag-miembro ${esMismoUsuario ? 'usuario-actual' : ''}">
                    <div class="info-miembro-fila">
                        <div class="bloque-nombre-foto">
                            <img src="${urlFotoMiembro}" class="foto-miembro-lista" onerror="this.src='https://via.placeholder.com/45'">
                            <div>
                                <p class="nombre-m">${miembro.nombreCompleto || 'Usuario'}</p>
                                <p style="font-size: 0.7rem; color: #89C2D9; font-weight: bold;">${(miembro.rol || 'PERSONAL').toUpperCase()}</p>
                            </div>
                        </div>
                        <div class="consultorio-m">${miembro.consultorio || 'Gral.'}</div>
                    </div>
                </div>`;
        });
        contenedor.innerHTML = htmlEquipo;
    } catch (e) {
        console.error("Error cargando el equipo:", e);
    }
}

// --- 6. GUARDAR CAMBIOS FORMULARIOS ---

const formAsis = document.getElementById('formPerfilAsistente');
if(formAsis){
    formAsis.onsubmit = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
                nombreCompleto: document.getElementById('adjNombre').value,
                areaApoyo: document.getElementById('adjArea').value
            });
            document.getElementById('txtNombreSide').innerText = document.getElementById('adjNombre').value;
            alert("¡Información actualizada!");
        } catch (e) { alert("Error al guardar."); }
    };
}

const formSeg = document.getElementById('formSeguridadCuenta');
if(formSeg){
    formSeg.onsubmit = async (e) => {
        e.preventDefault();
        
        const nuevoEmail = document.getElementById('adjCorreo').value;
        const nuevoEmailEmergencia = document.getElementById('adjCorreoEmergencia').value;
        const nuevoTelefono = document.getElementById('adjTelefono').value;

        try {
            let mensajeExtra = "";

            if (nuevoEmail !== auth.currentUser.email) {
                await updateEmail(auth.currentUser, nuevoEmail);
                mensajeExtra = "\nNOTA: Has cambiado tu correo. Usa el nuevo para iniciar sesión la próxima vez.";
            }

            await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
                email: nuevoEmail,
                emailEmergencia: nuevoEmailEmergencia,
                telefono: nuevoTelefono
            });
            
            alert("¡Datos de seguridad guardados correctamente!" + mensajeExtra);

        } catch (e) { 
            console.error(e);
            if (e.code === 'auth/requires-recent-login') {
                alert("Por seguridad, para cambiar tu correo electrónico debes cerrar sesión y volver a entrar.");
            } else if (e.code === 'auth/email-already-in-use') {
                alert("El correo electrónico ya está en uso.");
            } else {
                alert("Error al guardar datos: " + e.message);
            }
        }
    };
}

// --- 7. RECUPERAR CONTRASEÑA ---
const btnPass = document.getElementById('btnCambiarPass');
if(btnPass){
    btnPass.onclick = async (e) => {
        e.preventDefault();
        const emailUsuario = auth.currentUser.email;
        
        if(confirm(`¿Deseas enviar un correo para restablecer tu contraseña a: ${emailUsuario}?`)){
            try {
                await sendPasswordResetEmail(auth, emailUsuario);
                alert("¡Correo enviado! Revisa tu bandeja de entrada.");
            } catch (error) {
                console.error(error);
                alert("Error al enviar correo: " + error.message);
            }
        }
    };
}

// --- 8. CERRAR SESIÓN (CORREGIDO PARA ESPERAR AL DOM) ---
document.addEventListener("DOMContentLoaded", () => {
    const btnSalir = document.getElementById('btnCerrarSesion');
    
    if (btnSalir) {
        btnSalir.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Cerrando sesión...");
            try {
                await signOut(auth);
                // El onAuthStateChanged detectará el cierre y redirigirá
            } catch (error) {
                console.error("Error al salir:", error);
            }
        });
    } else {
        console.warn("Botón de cerrar sesión no encontrado.");
    }
});