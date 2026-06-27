import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { 
    getFirestore, initializeFirestore, doc, getDoc, updateDoc, deleteDoc, 
    collection, onSnapshot, serverTimestamp, query, where, orderBy, getDocs, arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// ============================================================
// 1. CONFIGURACIÓN
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyAiViaTebE25FgFqnp4j8glDxaENcKqrrk",
    authDomain: "protect-pet.firebaseapp.com",
    projectId: "protect-pet",
    storageBucket: "protect-pet.firebasestorage.app",
    messagingSenderId: "143773812000",
    appId: "1:143773812000:web:2d59e3f38aa6caf7948345"
};

const app = initializeApp(firebaseConfig);
// Usamos experimentalForceLongPolling para mayor estabilidad
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const auth = getAuth(app);

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/db8omq2ho/upload";
const CLOUDINARY_PRESET = "preset_protect_pet"; 

// Variables Globales
const urlParams = new URLSearchParams(window.location.search);
const mascotaId = urlParams.get('id'); 
let userActual = null; 
let datosMascotaActual = null; 
let modoEdicion = false;

// ============================================================
// 2. REFERENCIAS DOM
// ============================================================
const dom = {
    // Header & Sidebar
    lblId: document.getElementById('txtIdExpediente'),
    lblNombreHeader: document.getElementById('txtNombrePacienteHeader'),
    
    // Sidebar: Usuario y Sesión
    txtUserSide: document.getElementById('txtUsuarioActual'),
    txtRolSide: document.getElementById('txtRolUsuario'),
    sidebarFoto: document.getElementById('sidebarFotoVet'), // Contenedor de la foto en sidebar
    btnCerrarSesion: document.querySelector('.linkCerrarSesion') || document.getElementById('btnCerrarSesion'),
    
    // Acciones Header
    btnWhatsapp: document.getElementById('btnWhatsapp'),
    btnAccionPrincipal: document.getElementById('btnAccionPrincipal'),
    btnImprimir: document.getElementById('btnImprimirExpediente'),
    btnEliminar: document.getElementById('btnEliminarExpediente'),
    
    // Foto Paciente
    imgPerfil: document.getElementById('imgFotoPaciente'),
    btnCambiarFoto: document.getElementById('btnCambiarFoto'),
    inputFotoEdit: document.getElementById('inputFotoEdit'),

    // Formulario - Identidad
    inNombre: document.getElementById('inNombre'),
    inEspecie: document.getElementById('inEspecie'),
    inRaza: document.getElementById('inRaza'),
    inSexo: document.getElementById('inSexo'),
    inEdad: document.getElementById('inEdad'),
    inColor: document.getElementById('inColor'),

    // Formulario - Propietario (dueno)
    inPropNombre: document.getElementById('inPropNombre'),
    inPropCel: document.getElementById('inPropCelular'),
    inPropEmail: document.getElementById('inPropEmail'),
    inPropDir: document.getElementById('inPropDireccion'),
    
    // Formulario - Emergencia
    inEmergRef: document.getElementById('inEmergenciaRef'),
    inEmergTel: document.getElementById('inEmergenciaTel'),

    // Formulario - Historia (clinico)
    inPeso: document.getElementById('inPeso'),
    inTemp: document.getElementById('inTemp'),
    inFC: document.getElementById('inFC'),
    inFR: document.getElementById('inFR'),
    inAlergias: document.getElementById('inAlergias'),
    inNotas: document.getElementById('inNotasManejo'), 

    // Contenedores
    gridEstudios: document.getElementById('gridEstudios'),
    tablaVacunas: document.getElementById('tablaVacunasBody'),
    timeline: document.getElementById('timelineConsultas'),
    
    // Modales
    modalEstudio: document.getElementById('modalSubidaExpress'),
    modalVacuna: document.getElementById('modalVacunaExpress'),
    modalEmergencia: document.getElementById('modalEmergenciaOverlay')
};

// ============================================================
// 3. MONITOR DE SESIÓN (CORREGIDO FOTO PERFIL)
// ============================================================
onAuthStateChanged(auth, async (user) => {
    // 1. Verificar Usuario
    const localEmail = localStorage.getItem("userEmail");
    const emailABuscar = user ? user.email : localEmail;

    if (emailABuscar) {
        // Buscar usuario en Firestore
        const qUser = query(collection(db, "usuarios"), where("correo", "==", emailABuscar));
        
        onSnapshot(qUser, async (snap) => {
            if (!snap.empty) {
                const docU = snap.docs[0];
                const data = docU.data();
                userActual = { id: docU.id, ...data };
                
                // --- A. Llenar Sidebar ---
                const rolLimpio = (userActual.rol || "Usuario").toUpperCase();
                const nombreLimpio = userActual.nombreCompleto || userActual.nombre || "Usuario";
                
                // Rol
                if(dom.txtRolSide) dom.txtRolSide.innerText = rolLimpio;

                // Nombre con prefijo
                if(dom.txtUserSide) {
                    let prefijo = "";
                    if (rolLimpio === "VETERINARIO") ;
                    else if (rolLimpio === "ASISTENTE") ;
                    dom.txtUserSide.innerText =  nombreLimpio;
                }

                // --- B. FOTO DE PERFIL (CORRECCIÓN AQUÍ) ---
                // Tu BD usa 'fotoPerfil', otros usan 'fotoUrl' o 'foto'. Buscamos todas.
                if(dom.sidebarFoto) {
                    const urlAvatar = userActual.fotoPerfil || userActual.fotoUrl || userActual.foto || 'https://via.placeholder.com/150?text=Sin+Foto';
                    dom.sidebarFoto.style.backgroundImage = `url('${urlAvatar}')`;
                    dom.sidebarFoto.style.backgroundSize = "cover";
                    dom.sidebarFoto.style.backgroundPosition = "center";
                }

                // Iniciar alertas (Solo si aplica)
                iniciarSistemaAlertas();
            }
        });

        // 2. Cargar Expediente del Paciente
        if (mascotaId) {
            iniciarListenerExpediente();
        } else {
            alert("ID de paciente no encontrado.");
            window.location.href = "VETERINARIO_LISTA_PACIENTES.html";
        }

    } else {
        window.location.href = "index.html"; 
    }
});

// Botón Cerrar Sesión
if (dom.btnCerrarSesion) {
    dom.btnCerrarSesion.onclick = (e) => {
        e.preventDefault();
        if(confirm("¿Deseas cerrar tu sesión actual?")) {
            signOut(auth).then(() => window.location.href = "index.html");
        }
    };
}

// ============================================================
// 4. LÓGICA DEL EXPEDIENTE (LECTURA)
// ============================================================
function iniciarListenerExpediente() {
    // A. Documento Principal
    onSnapshot(doc(db, "mascotas", mascotaId), (docSnap) => {
        if (docSnap.exists()) {
            const m = docSnap.data();
            datosMascotaActual = m;

            // Header
            if(dom.lblId) dom.lblId.innerText = docSnap.id.substring(0, 8).toUpperCase();
            if(dom.lblNombreHeader) dom.lblNombreHeader.innerText = m.nombre || "Sin Nombre";
            
            // Foto Paciente (Prioridad: fotoUrl > foto)
            if(dom.imgPerfil) {
                const urlFoto = m.fotoUrl || m.foto || 'https://via.placeholder.com/300?text=Sin+Foto';
                dom.imgPerfil.style.backgroundImage = `url('${urlFoto}')`;
            }

            // Llenar formulario (Solo si no estamos editando)
            if (!modoEdicion) {
                llenarCamposFormulario(m);
            }

            // Arrays
            renderizarEstudios(m.estudios || []);
            renderizarVacunas(m.vacunas || []);

        } else {
            alert("El expediente ha sido eliminado.");
            window.location.href = "VETERINARIO_LISTA_PACIENTES.html";
        }
    });

    // B. Consultas
    const qConsultas = query(collection(db, "mascotas", mascotaId, "consultas"), orderBy("fecha", "desc"));
    onSnapshot(qConsultas, (snap) => {
        dom.timeline.innerHTML = "";
        if (snap.empty) {
            dom.timeline.innerHTML = `<p style="color:#89C2D9; padding:20px; font-style:italic;">No hay consultas previas.</p>`;
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            let fechaTexto = "--/--/--";
            if(c.fecha && c.fecha.toDate) {
                fechaTexto = c.fecha.toDate().toLocaleDateString();
            } else if (c.fecha) {
                fechaTexto = c.fecha;
            }

            dom.timeline.innerHTML += `
                <div class="item-consulta">
                    <span style="display:block; color:#F27405; font-weight:bold; margin-bottom:5px;">
                        ${fechaTexto} - ${c.medico || 'Veterinario'}
                    </span>
                    <h4 style="margin:0 0 5px 0; color:#032F40;">${c.motivo || 'Consulta General'}</h4>
                    <p style="font-size:0.9rem; color:#475569;">${c.diagnostico || c.observaciones || 'Sin detalles.'}</p>
                </div>`;
        });
    });
}

function llenarCamposFormulario(m) {
    // Identidad
    dom.inNombre.value = m.nombre || "";
    dom.inEspecie.value = m.especie || "Canino";
    dom.inRaza.value = m.raza || "";
    dom.inSexo.value = m.genero || "Macho";
    dom.inEdad.value = m.edad || "";
    dom.inColor.value = m.color || "";

    // Propietario
    const d = m.dueno || m.propietario || {};
    dom.inPropNombre.value = d.nombre || "";
    dom.inPropEmail.value = d.correo || d.email || "";
    dom.inPropCel.value = d.tel || d.celular || m.tel || "";
    dom.inPropDir.value = d.dir || m.dir || "";

    // Emergencia
    const e = m.emergencia || d.emergencia || {};
    dom.inEmergRef.value = e.nombre || "";
    dom.inEmergTel.value = e.tel || "";

    // Historia (clinico)
    const c = m.clinico || m.historia || {};
    dom.inPeso.value = c.peso || "";
    dom.inTemp.value = c.temp || c.temperatura || "";
    dom.inFC.value = c.fc || "";
    dom.inFR.value = c.fr || "";
    dom.inAlergias.value = c.alergias || "";
    dom.inNotas.value = c.atencion || c.notas_manejo || "";
}

// ============================================================
// 5. BOTONES Y ACCIONES
// ============================================================

// A. WhatsApp
if(dom.btnWhatsapp) {
    dom.btnWhatsapp.onclick = () => {
        const celular = dom.inPropCel.value.replace(/\D/g, ''); 
        if (celular.length >= 10) {
            const msg = `Hola, le escribimos de Protect Pet sobre su mascota ${dom.inNombre.value}.`;
            window.open(`https://wa.me/52${celular}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            alert("No hay un número de celular válido registrado.");
        }
    };
}

// B. Botón Dual: Editar / Guardar
if(dom.btnAccionPrincipal) {
    dom.btnAccionPrincipal.innerHTML = `<span class="material-symbols-rounded">edit_note</span> Habilitar Edición`;
    
    dom.btnAccionPrincipal.onclick = async () => {
        if (!modoEdicion) {
            // --> MODO EDICIÓN
            modoEdicion = true;
            toggleInputs(false); 
            dom.btnAccionPrincipal.innerHTML = `<span class="material-symbols-rounded">save</span> Guardar Cambios`;
            dom.btnAccionPrincipal.style.backgroundColor = "#F27405"; 
            dom.btnCambiarFoto.style.display = "block"; 
            
        } else {
            // --> GUARDAR
            try {
                dom.btnAccionPrincipal.innerHTML = `Guardando...`;
                dom.btnAccionPrincipal.disabled = true;
                
                const emailModificador = userActual?.correo || userActual?.email || auth.currentUser?.email || "usuario_desconocido";

                const updateData = {
                    nombre: dom.inNombre.value,
                    especie: dom.inEspecie.value,
                    raza: dom.inRaza.value,
                    genero: dom.inSexo.value,
                    edad: dom.inEdad.value,
                    color: dom.inColor.value,
                    
                    dueno: {
                        nombre: dom.inPropNombre.value,
                        tel: dom.inPropCel.value,
                        correo: dom.inPropEmail.value,
                        dir: dom.inPropDir.value
                    },
                    emergencia: {
                        nombre: dom.inEmergRef.value,
                        tel: dom.inEmergTel.value
                    },
                    clinico: {
                        peso: dom.inPeso.value,
                        temp: dom.inTemp.value,
                        fc: dom.inFC.value,
                        fr: dom.inFR.value,
                        alergias: dom.inAlergias.value,
                        atencion: dom.inNotas.value
                    },
                    
                    ultimaModificacion: serverTimestamp(),
                    modificadoPor: emailModificador 
                };

                await updateDoc(doc(db, "mascotas", mascotaId), updateData);
                
                alert("✅ Expediente actualizado correctamente.");
                
                modoEdicion = false;
                toggleInputs(true);
                dom.btnAccionPrincipal.disabled = false;
                dom.btnAccionPrincipal.innerHTML = `<span class="material-symbols-rounded">edit_note</span> Habilitar Edición`;
                dom.btnAccionPrincipal.style.backgroundColor = "#032F40";
                dom.btnCambiarFoto.style.display = "none";

            } catch (e) {
                console.error("Error al guardar:", e);
                alert("Error al guardar: " + e.message);
                dom.btnAccionPrincipal.disabled = false;
                dom.btnAccionPrincipal.innerHTML = "Reintentar";
            }
        }
    };
}

// C. Eliminar Expediente
if(dom.btnEliminar) {
    dom.btnEliminar.onclick = async () => {
        const confirmacion = confirm(`🚨 PELIGRO: ¿Estás seguro de ELIMINAR a ${dom.inNombre.value}?\n\nEsta acción borrará todo el historial y no se puede deshacer.`);
        if (confirmacion) {
            try {
                await deleteDoc(doc(db, "mascotas", mascotaId));
                alert("Expediente eliminado.");
                window.location.href = "VETERINARIO_LISTA_PACIENTES.html";
            } catch (e) {
                alert("Error: " + e.message);
            }
        }
    };
}

// D. Imprimir
if(dom.btnImprimir) {
    dom.btnImprimir.onclick = () => window.print();
}

function toggleInputs(bloquear) {
    const inputs = document.querySelectorAll('.input-moderno-f, .input-vital');
    inputs.forEach(inp => {
        if(bloquear) {
            inp.setAttribute('readonly', true);
            inp.classList.add('input-lectura');
            if(inp.tagName === 'SELECT') inp.setAttribute('disabled', true);
        } else {
            inp.removeAttribute('readonly');
            inp.classList.remove('input-lectura');
            if(inp.tagName === 'SELECT') inp.removeAttribute('disabled');
        }
    });
}

// ============================================================
// 6. CAMBIO DE FOTO (CLOUDINARY)
// ============================================================
if (dom.btnCambiarFoto && dom.inputFotoEdit) {
    dom.btnCambiarFoto.onclick = () => dom.inputFotoEdit.click();

    dom.inputFotoEdit.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const originalText = dom.btnCambiarFoto.innerHTML;
            dom.btnCambiarFoto.innerText = "Subiendo...";
            dom.btnCambiarFoto.disabled = true;
            
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", CLOUDINARY_PRESET);

            const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
            const data = await res.json();

            if (data.secure_url) {
                await updateDoc(doc(db, "mascotas", mascotaId), {
                    fotoUrl: data.secure_url // Preferimos fotoUrl como estándar
                });
                // Actualización visual inmediata
                dom.imgPerfil.style.backgroundImage = `url('${data.secure_url}')`;
                alert("Foto actualizada con éxito.");
            }
            dom.btnCambiarFoto.innerHTML = originalText;
            dom.btnCambiarFoto.disabled = false;
        } catch (error) {
            console.error(error);
            alert("Error al subir imagen");
            dom.btnCambiarFoto.innerText = "Error";
        }
    };
}

// ============================================================
// 7. MODALES (ESTUDIOS Y VACUNAS)
// ============================================================

// --- ESTUDIOS ---
const btnSubir = document.getElementById('btnSubirEstudio'); 
if (btnSubir) btnSubir.onclick = () => dom.modalEstudio.style.display = "flex";

document.getElementById('btnCancelarSubida').onclick = () => {
    dom.modalEstudio.style.display = "none";
    document.getElementById('inNombreEstudio').value = "";
    document.getElementById('inFileEstudio').value = "";
};

document.getElementById('btnConfirmarSubida').onclick = async () => {
    const nombre = document.getElementById('inNombreEstudio').value;
    const file = document.getElementById('inFileEstudio').files[0];
    const btn = document.getElementById('btnConfirmarSubida');

    if (!nombre || !file) return alert("Completa los campos.");

    try {
        btn.innerText = "Subiendo...";
        btn.disabled = true;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_PRESET);

        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await res.json();

        if (data.secure_url) {
            await updateDoc(doc(db, "mascotas", mascotaId), {
                estudios: arrayUnion({
                    titulo: nombre,
                    nombre: nombre,
                    url: data.secure_url,
                    fecha: new Date().toISOString(),
                    tipo: "archivo"
                })
            });
            alert("Archivo subido.");
            document.getElementById('btnCancelarSubida').click();
        }
    } catch (e) { alert("Error al subir."); } finally { btn.innerText = "Subir"; btn.disabled = false; }
};

function renderizarEstudios(lista) {
    dom.gridEstudios.innerHTML = "";
    if (lista.length === 0) {
        dom.gridEstudios.innerHTML = `<p style="color:#aaa; font-style:italic; width:100%;">Sin archivos adjuntos.</p>`;
        return;
    }
    lista.forEach(est => {
        const a = document.createElement('a');
        a.className = "chip-archivo";
        a.href = est.url; a.target = "_blank";
        a.innerHTML = `<span class="material-symbols-rounded">description</span> ${est.titulo || est.nombre || 'Archivo'}`;
        dom.gridEstudios.appendChild(a);
    });
}

// --- VACUNAS ---
const btnVac = document.getElementById('btnAgregarVacuna');
if (btnVac) btnVac.onclick = () => dom.modalVacuna.style.display = "flex";

document.getElementById('btnCancelarVacuna').onclick = () => {
    dom.modalVacuna.style.display = "none";
    document.getElementById('inNombreVacuna').value = "";
    document.getElementById('inFechaVacuna').value = "";
};

document.getElementById('btnConfirmarVacuna').onclick = async () => {
    const nombre = document.getElementById('inNombreVacuna').value;
    const fecha = document.getElementById('inFechaVacuna').value;
    const refuerzo = document.getElementById('inRefuerzoVacuna').value;

    if (!nombre || !fecha) return alert("Nombre y fecha requeridos.");

    try {
        await updateDoc(doc(db, "mascotas", mascotaId), {
            vacunas: arrayUnion({
                nombre: nombre,
                fecha: fecha,
                refuerzo: refuerzo || "No definido",
                veterinario: userActual.nombreCompleto || "Sistema" 
            })
        });
        alert("Vacuna registrada.");
        document.getElementById('btnCancelarVacuna').click();
    } catch (e) { alert("Error: " + e.message); }
};

function renderizarVacunas(lista) {
    dom.tablaVacunas.innerHTML = "";
    if (lista.length === 0) {
        dom.tablaVacunas.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:#aaa;">Sin vacunas registradas.</td></tr>`;
        return;
    }
    lista.forEach(vac => {
        dom.tablaVacunas.innerHTML += `
            <tr>
                <td><strong>${vac.nombre}</strong></td>
                <td>${vac.fecha}</td>
                <td>${vac.refuerzo || '-'}</td>
                <td>${vac.veterinario || 'Sistema'}</td>
            </tr>`;
    });
}

// ============================================================
// 8. SISTEMA DE ALERTA DE EMERGENCIA
// ============================================================
function iniciarSistemaAlertas() {
    // Verificar si es veterinario para escuchar alertas
    if (!userActual || (userActual.rol || "").toLowerCase().trim() !== 'veterinario') return;

    const modalEmergencia = dom.modalEmergencia;
    const audioAlarma = document.getElementById('audioAlarma');
    const btnEntendido = document.getElementById('btnEntendidoEmergencia');

    const q = query(
        collection(db, "notificaciones"),
        where("target", "==", "veterinario"),
        where("tipo", "==", "urgencia_medica"),
        where("estado", "==", "activa")
    );

    onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            if(modalEmergencia) modalEmergencia.style.display = "flex";
            if(audioAlarma) {
                audioAlarma.loop = true;
                audioAlarma.play().catch(e => console.log("Interacción requerida"));
            }
            const idNoti = snapshot.docs[0].id;
            if (btnEntendido) {
                btnEntendido.onclick = async () => {
                    if(audioAlarma) { audioAlarma.pause(); audioAlarma.currentTime = 0; }
                    if(modalEmergencia) modalEmergencia.style.display = "none";
                    await updateDoc(doc(db, "notificaciones", idNoti), {
                        estado: "atendida",
                        atendidoPor: userActual.email
                    });
                };
            }
        } else {
            if(modalEmergencia) modalEmergencia.style.display = "none";
            if(audioAlarma) { audioAlarma.pause(); audioAlarma.currentTime = 0; }
        }
    });
}