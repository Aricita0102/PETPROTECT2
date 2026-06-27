import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, collection, onSnapshot, addDoc, deleteDoc, query, where, setDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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

const IMGBB_API_KEY = "e4aceff8ee56059de57eebda2830c89a"; 
const CLINICA_ID = "config_principal";

let adminDocId = null;
let diaSeleccionadoParaExcepcion = "General"; 
let asistentesCache = [];

// --- 1. GESTIÓN DE VISTAS DE IMÁGENES ---
const gestionarVistaFotoAdmin = (url) => {
    const imgPreview = document.getElementById('imgPerfilAdminPreview');
    const fotoMiniSidebar = document.getElementById('sidebarFotoAdmin'); 
    if (url) {
        if (imgPreview) { imgPreview.src = url; imgPreview.style.display = 'block'; document.getElementById('textoPerfilAdmin').style.display = 'none'; }
        if (fotoMiniSidebar) { fotoMiniSidebar.style.backgroundImage = `url('${url}')`; fotoMiniSidebar.style.backgroundSize = 'cover'; }
    }
};

const gestionarVistaLogo = (url) => {
    const imgPreview = document.getElementById('imgLogoPreview');
    if (url && imgPreview) { imgPreview.src = url; imgPreview.style.display = 'block'; document.getElementById('textoLogo').style.display = 'none'; }
};

// --- 2. CARGA DE PERFIL Y SEGURIDAD ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        adminDocId = user.uid;
        onSnapshot(doc(db, "usuarios", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const u = docSnap.data();
                document.getElementById('txtNombreAdminSide').innerText = u.nombreCompleto || "Administrador";
                document.getElementById('adjNombreAdmin').value = u.nombreCompleto || "";
                document.getElementById('adjTelefono').value = u.telefono || "";
                document.getElementById('adjCargo').value = u.puesto || "Administrador General";
                document.getElementById('adjCorreo').value = u.correo || user.email;
                const urlFoto = u.fotoUrl || u.fotoPerfil;
                if (urlFoto) gestionarVistaFotoAdmin(urlFoto);
            }
        });
        cargarAsistentesYMedicos();
    } else { window.location.href = "LOGIN.html"; }
});

// --- 3. GESTIÓN PERSONAL MÉDICO (GUARDA TURNOS) ---
async function cargarAsistentesYMedicos() {
    const clinicaSnap = await getDoc(doc(db, "configuracion_clinica", CLINICA_ID));
    if (!clinicaSnap.exists()) return;
    const miCodigo = clinicaSnap.data().codigoAcceso;

    const qAsis = query(collection(db, "usuarios"), where("rol", "==", "asistente"), where("codigoClinica", "==", miCodigo));
    const snapAsis = await getDocs(qAsis);
    asistentesCache = snapAsis.docs.map(d => ({ id: d.id, nombre: d.data().nombreCompleto }));

    const qMed = query(collection(db, "usuarios"), where("rol", "==", "veterinario"), where("codigoClinica", "==", miCodigo));
    const cont = document.getElementById('contenedorGestionPersonal');
    
    onSnapshot(qMed, (snap) => {
        if (!cont) return;
        cont.innerHTML = "";
        document.getElementById('lblConteoVets').innerText = `${snap.size} Médicos Activos`;
        snap.forEach(docMed => {
            const med = docMed.data();
            const id = docMed.id;
            const div = document.createElement('div');
            div.className = "fila-gestion-personal"; 
            div.style = "display:grid; grid-template-columns: 1.5fr 0.8fr 1.2fr 1.5fr auto; align-items:center; gap:15px; background:#fff; padding:15px; border-radius:15px; margin-bottom:10px; border:1px solid #f5f5f5;";
            div.innerHTML = `
                <div><b>Dr. ${med.nombreCompleto || 'Sin Nombre'}</b></div>
                <input type="text" id="cons-${id}" value="${med.consultorio || ''}" class="input-moderno-f" style="padding:8px;">
                <select id="turno-${id}" class="input-moderno-f" style="padding:8px;">
                    <option value="Matutino" ${med.turno === 'Matutino' ? 'selected' : ''}>Matutino</option>
                    <option value="Vespertino" ${med.turno === 'Vespertino' ? 'selected' : ''}>Vespertino</option>
                    <option value="Nocturno" ${med.turno === 'Nocturno' ? 'selected' : ''}>Nocturno</option>
                </select>
                <div class="multi-select-asistentes" style="max-height:80px; overflow-y:auto; border:1px solid #F5F5F5; padding:5px; border-radius:10px;">
                    ${asistentesCache.map(as => `<label style="display:block; font-size:0.75rem;"><input type="checkbox" class="asist-check-${id}" value="${as.id}" ${(med.asistentesIds || []).includes(as.id) ? 'checked' : ''}> ${as.nombre}</label>`).join('')}
                </div>
                <button class="btn-naranja-chico" onclick="vincularPersonal('${id}')" style="margin:0;">Vincular</button>
            `;
            cont.appendChild(div);
        });
    });
}

window.vincularPersonal = async (medId) => {
    const consultorio = document.getElementById(`cons-${medId}`).value;
    const turno = document.getElementById(`turno-${medId}`).value;
    const asistentesIds = Array.from(document.querySelectorAll(`.asist-check-${medId}:checked`)).map(c => c.value);
    await updateDoc(doc(db, "usuarios", medId), { consultorio, turno, asistentesIds });
    alert("Vínculo médico actualizado.");
};

// --- 4. LÓGICA DE HORARIOS ---
const setupHorariosMaster = () => {
    const swPersonalizado = document.getElementById('swHorarioPersonalizado');
    const banner = document.getElementById('bannerDiaActivo');

    document.querySelectorAll('.switch-turno').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const turnoNombre = e.target.value;
            const iniInput = document.getElementById(`ini-${turnoNombre}`);
            const finInput = document.getElementById(`fin-${turnoNombre}`);
            const tarjetaTurno = document.getElementById(`card-${turnoNombre}`);
            if (e.target.checked) {
                iniInput.disabled = false; finInput.disabled = false; tarjetaTurno.classList.add('activo');
            } else {
                iniInput.disabled = true; finInput.disabled = true; tarjetaTurno.classList.remove('activo');
            }
        });
    });

    document.querySelectorAll('.chip-dia span').forEach(span => {
        span.onclick = async () => {
            if (!swPersonalizado.checked) return;
            const dia = span.previousElementSibling.value;
            diaSeleccionadoParaExcepcion = dia;
            document.getElementById('txtNombreDiaActivo').innerText = dia;
            document.getElementById('btnCerrarEdicionDia').style.display = 'block';
            document.getElementById('btnGuardarHorarioDia').style.display = 'block';
            banner.style.backgroundColor = "#032F40"; 
            banner.style.color = "white";

            const snap = await getDoc(doc(db, "configuracion_clinica", CLINICA_ID, "horarios", dia));
            actualizarRelojesUI(snap.exists() ? snap.data() : null);
        };
    });

    document.getElementById('btnGuardarHorarioDia').onclick = async () => {
        if(diaSeleccionadoParaExcepcion === "General") return;
        const config = capturarHorasRelojes();
        await setDoc(doc(db, "configuracion_clinica", CLINICA_ID, "horarios", diaSeleccionadoParaExcepcion), config);
        alert("Horario personalizado para " + diaSeleccionadoParaExcepcion + " guardado.");
        actualizarColoresChips();
    };

    document.getElementById('btnCerrarEdicionDia').onclick = async () => {
        if(confirm("¿Borrar configuración personalizada de este día?")) {
            await deleteDoc(doc(db, "configuracion_clinica", CLINICA_ID, "horarios", diaSeleccionadoParaExcepcion));
            diaSeleccionadoParaExcepcion = "General";
            document.getElementById('txtNombreDiaActivo').innerText = "Horario General";
            document.getElementById('btnCerrarEdicionDia').style.display = 'none';
            document.getElementById('btnGuardarHorarioDia').style.display = 'none';
            banner.style.backgroundColor = ""; banner.style.color = "";
            const snap = await getDoc(doc(db, "configuracion_clinica", CLINICA_ID));
            actualizarRelojesUI(snap.data().horarioGeneral);
            actualizarColoresChips();
        }
    };
};

const capturarHorasRelojes = () => {
    const config = {};
    ['Matutino', 'Vespertino', 'Nocturno'].forEach(t => {
        const check = document.querySelector(`#card-${t} .switch-turno`);
        config[t] = { 
            activo: check.checked, 
            entrada: document.getElementById(`ini-${t}`).value, 
            salida: document.getElementById(`fin-${t}`).value 
        };
    });
    return config;
};

const actualizarColoresChips = async () => {
    const horariosEspSnap = await getDocs(collection(db, "configuracion_clinica", CLINICA_ID, "horarios"));
    const diasConPersonalizacion = horariosEspSnap.docs.map(doc => doc.id);

    const todosLosDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const seleccionados = Array.from(document.querySelectorAll('#contenedorDiasLaborales input:checked')).map(i => i.value);
    const descansos = todosLosDias.filter(d => !seleccionados.includes(d));

    document.getElementById('badgeDescansos').innerHTML = descansos.map(d => `<span class="badge-descanso">${d}</span>`).join('');

    document.querySelectorAll('.chip-dia').forEach(label => {
        const checkbox = label.querySelector('input');
        const dia = checkbox.value;
        const span = label.querySelector('span');

        if (!checkbox.checked) {
            span.style.backgroundColor = "#89C2D9"; span.style.borderColor = "#89C2D9"; span.style.color = "white";
        } else if (diasConPersonalizacion.includes(dia)) {
            span.style.backgroundColor = "#032F40"; span.style.borderColor = "#032F40"; span.style.color = "white";
        } else {
            span.style.backgroundColor = "#F27405"; span.style.borderColor = "#F27405"; span.style.color = "white";
        }
    });
};

function actualizarRelojesUI(data) {
    ['Matutino', 'Vespertino', 'Nocturno'].forEach(t => {
        const check = document.querySelector(`#card-${t} .switch-turno`);
        const ini = document.getElementById(`ini-${t}`);
        const fin = document.getElementById(`fin-${t}`);
        const card = document.getElementById(`card-${t}`);
        if (data && data[t]) {
            check.checked = data[t].activo; ini.value = data[t].entrada || ""; fin.value = data[t].salida || "";
            ini.disabled = !data[t].activo; fin.disabled = !data[t].activo;
            data[t].activo ? card.classList.add('activo') : card.classList.remove('activo');
        } else {
            check.checked = false; ini.value = ""; fin.value = ""; ini.disabled = true; fin.disabled = true; card.classList.remove('activo');
        }
    });
}

// --- 5. API PAÍSES Y FESTIVOS (SINCRONIZA GUARDADOS) ---
const cargarPaisesYFestivos = async () => {
    const sel = document.getElementById('paisClinica');
    if (!sel) return;
    try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const paises = await res.json();
        paises.sort((a,b) => a.name.common.localeCompare(b.name.common)).forEach(p => {
            const opt = document.createElement('option'); opt.value = p.cca2; opt.innerText = p.name.common; sel.appendChild(opt);
        });

        const clinicaSnap = await getDoc(doc(db, "configuracion_clinica", CLINICA_ID));
        if(clinicaSnap.exists() && clinicaSnap.data().pais) {
            sel.value = clinicaSnap.data().pais;
            setTimeout(() => sel.dispatchEvent(new Event('change')), 500);
        }

        sel.onchange = async () => {
            const container = document.getElementById('listaFestivos');
            if(!sel.value || !container) return;
            container.innerHTML = "Cargando...";
            const resF = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${new Date().getFullYear()}/${sel.value}`);
            const festivos = await resF.json();
            
            // Recuperar qué festivos se marcaron como laborables
            const d = (await getDoc(doc(db, "configuracion_clinica", CLINICA_ID))).data();
            const guardados = d?.festivosLaborales || [];
            
            container.innerHTML = festivos.map(f => `
                <div class="festivo-item">
                    <span>${f.localName}</span>
                    <input type="checkbox" class="festivo-check" value="${f.date}" ${guardados.includes(f.date) ? 'checked' : ''}>
                </div>
            `).join('');
        };
    } catch(err) { console.error(err); }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    setupHorariosMaster();
    cargarPaisesYFestivos();
    cargarCatalogoServicios();

    document.getElementById('btnGuardarHorarios').onclick = async () => {
        const config = capturarHorasRelojes();
        const diasTrabajo = Array.from(document.querySelectorAll('#contenedorDiasLaborales input:checked')).map(cb => cb.value);
        const festivosMarcados = Array.from(document.querySelectorAll('.festivo-check:checked')).map(cb => cb.value);

        await updateDoc(doc(db, "configuracion_clinica", CLINICA_ID), { 
            horarioGeneral: config, 
            diasLaborales: diasTrabajo,
            festivosLaborales: festivosMarcados 
        });
        alert("Configuración de horarios y festivos guardada.");
        actualizarColoresChips();
    };

    document.getElementById('btnActualizarIdentidad').onclick = async () => {
        await updateDoc(doc(db, "configuracion_clinica", CLINICA_ID), { 
            nombre: document.getElementById('nombreClinica').value, 
            direccion: document.getElementById('direccionClinica').value, 
            pais: document.getElementById('paisClinica').value 
        });
        alert("Identidad guardada.");
    };

    document.getElementById('btnCerrarSesion').onclick = () => signOut(auth).then(() => window.location.href = "LOGIN.html");

    onSnapshot(doc(db, "configuracion_clinica", CLINICA_ID), (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            document.getElementById('nombreClinica').value = d.nombre || "";
            document.getElementById('direccionClinica').value = d.direccion || "";
            document.getElementById('displayCodigo').innerText = d.codigoAcceso || "PP-0000";
            if(d.logoUrl) gestionarVistaLogo(d.logoUrl);
            if(d.pais) document.getElementById('paisClinica').value = d.pais;
            if(d.diasLaborales) {
                document.querySelectorAll('#contenedorDiasLaborales input').forEach(cb => cb.checked = d.diasLaborales.includes(cb.value));
            }
            if(diaSeleccionadoParaExcepcion === "General") actualizarRelojesUI(d.horarioGeneral);
            actualizarColoresChips();
        }
    });

    document.getElementById('contenedorDiasLaborales').addEventListener('change', actualizarColoresChips);
});

const cargarCatalogoServicios = () => {
    const cont = document.getElementById('listaServiciosConfig');
    onSnapshot(collection(db, "clinica_servicios"), (snap) => {
        if (!cont) return; cont.innerHTML = "";
        snap.forEach(d => {
            const s = d.data();
            cont.innerHTML += `<div class="tag-miembro" style="display:grid; grid-template-columns: 1fr 1.5fr 0.8fr auto; align-items:center; background:#fff; padding:12px; border-radius:15px; margin-bottom:10px; border:1px solid #f0f0f0;"><small style="color:#89C2D9; font-weight:bold;">${s.categoria}</small><b>${s.nombre}</b><span style="color:#F27405;">$${s.precio}</span><button onclick="eliminarServicio('${d.id}')">×</button></div>`;
        });
    });
};
window.eliminarServicio = async (id) => { if (confirm("¿Eliminar?")) await deleteDoc(doc(db, "clinica_servicios", id)); };