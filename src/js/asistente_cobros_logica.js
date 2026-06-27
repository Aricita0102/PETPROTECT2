import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, query, getDocs, limit, doc, getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = { /* Tu configuración actual */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let carritoCobro = [];
let pacienteSeleccionado = null;
let clinicaCodigo = "";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
            const d = snap.data();
            clinicaCodigo = d.codigoClinica;
            document.getElementById('txtNombreSide').innerText = d.nombreCompleto;
            if (d.fotoPerfil || d.fotoUrl) {
                document.getElementById('sidebarFotoAsis').style.backgroundImage = `url('${d.fotoPerfil || d.fotoUrl}')`;
            }
        }
    } else { window.location.href = "index.html"; }
});

// --- BUSCADOR DE PACIENTES PARA COBRO ---
document.getElementById('busquedaPacientePago').addEventListener('input', async (e) => {
    const texto = e.target.value.toLowerCase();
    const resDiv = document.getElementById('resBusquedaPago');
    if (texto.length < 2) { resDiv.style.display = 'none'; return; }

    const q = query(collection(db, "mascotas"), limit(5));
    const snap = await getDocs(q);
    let html = "";
    snap.forEach(doc => {
        const m = doc.data();
        if (m.nombre.toLowerCase().includes(texto)) {
            html += `<div class="item-resultado" onclick="seleccionarParaPago('${doc.id}', '${m.nombre}', '${m.dueno.nombre}')">
                        <strong>${m.nombre}</strong> - ${m.dueno.nombre}
                    </div>`;
        }
    });
    resDiv.innerHTML = html;
    resDiv.style.display = 'block';
});

window.seleccionarParaPago = (id, nombre, dueno) => {
    pacienteSeleccionado = { id, nombre, dueno };
    document.getElementById('pagoNombreMascota').innerText = nombre;
    document.getElementById('pagoNombreDueno').innerText = dueno;
    document.getElementById('resBusquedaPago').style.display = 'none';
    document.getElementById('busquedaPacientePago').value = "";
};

// --- GESTIÓN DEL CARRITO ---
document.getElementById('btnAgregarConcepto').onclick = () => {
    const concepto = document.getElementById('inConcepto').value;
    const precio = parseFloat(document.getElementById('inPrecio').value);

    if (!concepto || isNaN(precio)) return alert("Completa el concepto y precio.");

    carritoCobro.push({ concepto, precio });
    renderCarrito();
    document.getElementById('inConcepto').value = "";
    document.getElementById('inPrecio').value = "";
};

function renderCarrito() {
    const tabla = document.getElementById('listaVentaTemporal');
    let html = "";
    let total = 0;
    carritoCobro.forEach((item, index) => {
        total += item.precio;
        html += `<tr>
            <td>${item.concepto}</td>
            <td>$${item.precio.toFixed(2)}</td>
            <td><button onclick="eliminarDelCarrito(${index})" style="color:red; border:none; background:none; cursor:pointer;">Eliminar</button></td>
        </tr>`;
    });
    tabla.innerHTML = html;
    document.getElementById('pagoTotalTxt').innerText = total.toFixed(2);
}

window.eliminarDelCarrito = (i) => {
    carritoCobro.splice(i, 1);
    renderCarrito();
};

// --- FINALIZAR COBRO ---
document.getElementById('btnFinalizarCobro').onclick = async () => {
    if (!pacienteSeleccionado || carritoCobro.length === 0) {
        return alert("Debes seleccionar un paciente y agregar al menos un concepto.");
    }

    try {
        await addDoc(collection(db, "pagos_realizados"), {
            pacienteId: pacienteSeleccionado.id,
            mascota: pacienteSeleccionado.nombre,
            dueno: pacienteSeleccionado.dueno,
            conceptos: carritoCobro,
            total: parseFloat(document.getElementById('pagoTotalTxt').innerText),
            metodo: document.getElementById('metodoPago').value,
            fecha: serverTimestamp(),
            codigoClinica: clinicaCodigo,
            asistenteId: auth.currentUser.uid
        });

        alert("✅ Cobro registrado y guardado en caja.");
        location.reload(); // Limpiar pantalla
    } catch (e) { console.error(e); }
};