import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// --- 1. CONFIGURACIÓN E INICIALIZACIÓN ---
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
const supabase = window.supabase.createClient('https://bzgivtvqpspbliwcvzjo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Z2l2dHZxcHNwYmxpd2N2empvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNTg2NTYsImV4cCI6MjA4MjgzNDY1Nn0.dcVRLXHcgopkj8xaQKU976w5uc3Rpiix0FcbZUZ1zTc');

// --- 2. VARIABLES DE ESTADO ---
let ticketActualId = null;
let ticketActualData = null;
let metodoSeleccionado = null;
let listaCompletaTickets = [];
let nombreCajeroCompleto = "Cajero";

let datosClinica = {
    nombre: "Protect Pet HQ",
    direccion: "Dirección No Disponible",
    logo: "./img/logoprotectpet.jpeg"
};

// --- 3. REFERENCIAS AL DOM ---
const listaTickets = document.getElementById('listaTickets');
const panelDetalle = document.getElementById('detalleCobroActivo');
const estadoVacio = document.getElementById('estadoVacio');
const contadorPendientes = document.getElementById('contadorPendientes');
const btnPagar = document.getElementById('btnProcesarPago');
const btnSoloImprimir = document.getElementById('btnSoloImprimir');
const btnReimprimirPagado = document.getElementById('btnReimprimirPagado');
const btnReenviarWhatsapp = document.getElementById('btnReenviarWhatsapp');
const inputRecibido = document.getElementById('inputRecibido');
const lblCambio = document.getElementById('lblCambio');
const inputBusqueda = document.getElementById('filtroTicket');
const panelCalculadora = document.getElementById('panelCalculadora');
const loadingOverlay = document.getElementById('loadingOverlay'); // Referencia a la capa de carga

function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

// --- 4. MONITOR DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            nombreCajeroCompleto = userDoc.data().nombreCompleto || "Usuario";
            setTxt('txtNombreUsuario', nombreCajeroCompleto);
        }
        cargarDatosClinica();
        iniciarEscuchadorCobros();
    } else {
        window.location.href = "index.html";
    }
});

function cargarDatosClinica() {
    onSnapshot(collection(db, "configuracion_clinica"), (snap) => {
        if (!snap.empty) {
            const d = snap.docs[0].data();
            datosClinica = {
                nombre: d.nombre || "Protect Pet HQ",
                direccion: d.direccion || "Sin dirección",
                logo: d.logoUrl || "./img/conejo.png"
            };
            setTxt('txtNombreClinicaHeader', datosClinica.nombre);
            const printLogo = document.getElementById('printLogoClinica');
            if (printLogo) printLogo.src = datosClinica.logo;
        }
    });
}

// --- 5. LÓGICA DE COLA Y BÚSQUEDA ---
function iniciarEscuchadorCobros() {
    const q = query(collection(db, "avisos_cobro"), orderBy("fecha", "desc"));
    onSnapshot(q, async (snapshot) => {
        const promesas = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const infoExtra = await buscarInfoMascota(data.pacienteNom);
            return { id: docSnap.id, ...data, ...infoExtra };
        });
        
        listaCompletaTickets = await Promise.all(promesas);
        const pendientes = listaCompletaTickets.filter(t => t.estatus === 'pendiente').length;
        if (contadorPendientes) contadorPendientes.innerText = pendientes;
        filtrarYRenderizar();
    });
}

async function buscarInfoMascota(nombreMascota) {
    try {
        const q = query(collection(db, "mascotas"), where("nombre", "==", nombreMascota));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const d = snap.docs[0].data();
            return { 
                duenoNombre: d.duenoNombre || d.dueno?.nombre || "Mostrador", 
                duenoTel: d.duenoTelefono || d.dueno?.tel || "" 
            };
        }
    } catch (e) { console.error(e); }
    return { duenoNombre: "Mostrador", duenoTel: "" };
}

function filtrarYRenderizar() {
    const termino = inputBusqueda.value.toLowerCase().trim();
    listaTickets.innerHTML = "";
    
    const filtrados = listaCompletaTickets.filter(t => {
        if (termino === "") return t.estatus === 'pendiente';
        return (t.pacienteNom || "").toLowerCase().includes(termino) || 
               (t.duenoNombre || "").toLowerCase().includes(termino) ||
               (t.id || "").toLowerCase().includes(termino);
    });
    
    filtrados.forEach(data => {
        const esPagado = data.estatus === 'pagado';
        const dateObj = data.fecha ? new Date(data.fecha.seconds * 1000) : new Date();
        const fechaStr = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const horaStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const card = document.createElement('div');
        card.className = `card-ticket ${data.id === ticketActualId ? 'seleccionado' : ''} ${esPagado ? 'pagado' : ''}`;
        card.onclick = () => cargarDetalle(data.id, data);
        
        card.innerHTML = `
            <h4>${data.pacienteNom} ${esPagado ? '/ Pagado' : ''}</h4>
            <p class="dueno-mini">Propietario: ${data.duenoNombre}</p>
            <p>Atendió: ${data.atendidoPor || 'Médico Vet:'}</p>
            <div class="precio-preview">$${(data.montoTotal || 0).toFixed(2)}</div>
            <span class="tag-hora">Fecha: ${fechaStr} | Hora: ${horaStr}</span>
        `;
        listaTickets.appendChild(card);
    });
}

inputBusqueda.addEventListener('input', filtrarYRenderizar);

// --- 6. DETALLE Y AGREGAR ITEMS ---
window.cargarDetalle = async (id, data) => {
    ticketActualId = id;
    ticketActualData = data;
    
    estadoVacio.style.display = 'none';
    panelDetalle.style.display = 'flex';
    
    setTxt('lblPaciente', data.pacienteNom);
    setTxt('lblDuenoHeader', data.duenoNombre);
    setTxt('lblMedico', data.atendidoPor || "Médico General");
    setTxt('lblFolio', "#" + id.slice(-6).toUpperCase());
    setTxt('lblTotalGrande', data.montoTotal.toFixed(2));
    setTxt('lblTotalBtn', data.montoTotal.toFixed(2));
    
    const esPagado = data.estatus === 'pagado';
    document.getElementById('zonaPagoContainer').style.display = esPagado ? 'none' : 'block';
    document.getElementById('mensajeYaPagado').style.display = esPagado ? 'block' : 'none';
    document.getElementById('panelAgregarItems').style.display = esPagado ? 'none' : 'block';
    
    const badge = document.getElementById('badgeEstadoTicket');
    badge.innerText = esPagado ? "PAGADO" : "PENDIENTE";
    badge.className = esPagado ? "badge-estado-pagado" : "badge-estado-pendiente";

    renderizarTablaItems();
};

document.getElementById('btnAgregarItem').onclick = () => {
    const concepto = document.getElementById('addConcepto').value.trim();
    const precio = parseFloat(document.getElementById('addPrecio').value);
    const cant = parseInt(document.getElementById('addCant').value);

    if (!concepto || isNaN(precio) || precio <= 0) return alert("Ingrese datos válidos");

    if (!ticketActualData.detalles) ticketActualData.detalles = [];
    ticketActualData.detalles.push({ concepto, precio, cantidad: cant });
    ticketActualData.montoTotal = ticketActualData.detalles.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    
    document.getElementById('addConcepto').value = "";
    document.getElementById('addPrecio').value = "";
    document.getElementById('addCant').value = "1";

    setTxt('lblTotalGrande', ticketActualData.montoTotal.toFixed(2));
    setTxt('lblTotalBtn', ticketActualData.montoTotal.toFixed(2));
    renderizarTablaItems();
};

function renderizarTablaItems() {
    const tbody = document.getElementById('listaItemsTicket');
    tbody.innerHTML = "";
    (ticketActualData.detalles || []).forEach((item, index) => {
        tbody.innerHTML += `<tr>
            <td>${item.concepto}</td>
            <td style="text-align:center;">${item.cantidad}</td>
            <td style="text-align:right;">$${parseFloat(item.precio).toFixed(2)}</td>
            <td style="text-align:right;">$${(item.precio * item.cantidad).toFixed(2)}</td>
            <td style="text-align:center;"><button onclick="quitarItem(${index})" style="background:none; border:none; color:red; cursor:pointer;">×</button></td>
        </tr>`;
    });
}

window.quitarItem = (index) => {
    ticketActualData.detalles.splice(index, 1);
    ticketActualData.montoTotal = ticketActualData.detalles.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    setTxt('lblTotalGrande', ticketActualData.montoTotal.toFixed(2));
    setTxt('lblTotalBtn', ticketActualData.montoTotal.toFixed(2));
    renderizarTablaItems();
};

// --- 7. PAGO Y WHATSAPP ---
window.seleccionarMetodo = (metodo) => {
    metodoSeleccionado = metodo;
    document.querySelectorAll('.btn-metodo').forEach(b => b.classList.remove('activo'));
    document.querySelector(`button[data-metodo="${metodo}"]`)?.classList.add('activo');
    btnPagar.disabled = false;
    panelCalculadora.style.display = metodo === 'Efectivo' ? 'flex' : 'none';
};

window.calcularCambio = () => {
    const recibido = parseFloat(inputRecibido.value) || 0;
    const total = ticketActualData.montoTotal;
    const cambio = recibido - total;
    lblCambio.innerText = cambio > 0 ? `$${cambio.toFixed(2)}` : "$0.00";
};

function enviarWhatsApp(data) {
    if (!data.duenoTel) return alert("No hay teléfono registrado.");
    const mensaje = `Hola *${data.duenoNombre}*, le saludamos de *${datosClinica.nombre}* 🐾.%0A%0AAdjuntamos el comprobante de pago de la consulta de *${data.pacienteNom}*.%0A%0A🔹 *Folio:* ${data.id.slice(-6).toUpperCase()}%0A🔹 *Total:* $${data.montoTotal.toFixed(2)}%0A🔹 *Atendió:* ${data.atendidoPor || 'Médico General'}%0A%0APuede descargar su ticket aquí: ${data.ticketUrl}%0A%0A¡Gracias por su confianza!`;
    window.open(`https://wa.me/${data.duenoTel.replace(/\D/g, '')}?text=${mensaje}`, '_blank');
}

btnReenviarWhatsapp.onclick = () => enviarWhatsApp(ticketActualData);

// --- 8. PROCESO DE PAGO FINAL (CON PANTALLA DE CARGA) ---
btnPagar.onclick = async () => {
    if (!ticketActualId || btnPagar.disabled) return;
    
    // Activar pantalla de carga
    loadingOverlay.style.display = 'flex';
    btnPagar.disabled = true;

    const ticketEl = document.getElementById('ticketImpresion');
    try {
        ticketEl.style.display = 'block';
        prepararTicketVisual();
        await new Promise(r => setTimeout(r, 1500)); // Tiempo para renderizado y QR

        const opt = {
            margin: 0,
            filename: `Ticket_${ticketActualId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
            jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(ticketEl).output('blob');
        const fileName = `tickets/${ticketActualId}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage.from('tickets').upload(fileName, pdfBlob, { contentType: 'application/pdf' });

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('tickets').getPublicUrl(fileName);

        await updateDoc(doc(db, "avisos_cobro", ticketActualId), {
            estatus: "pagado",
            metodoPago: metodoSeleccionado,
            fechaPago: serverTimestamp(),
            cobradoPor: nombreCajeroCompleto,
            detalles: ticketActualData.detalles,
            montoTotal: ticketActualData.montoTotal,
            ticketUrl: publicUrl
        });

        ticketActualData.ticketUrl = publicUrl;
        
        // Quitar carga antes de los diálogos
        loadingOverlay.style.display = 'none';
        
        alert("✅ Pago registrado con éxito.");
        if(confirm("¿Desea enviar el ticket por WhatsApp ahora?")) enviarWhatsApp(ticketActualData);
        location.reload();

    } catch (error) {
        loadingOverlay.style.display = 'none';
        alert("Error: " + error.message);
    } finally {
        ticketEl.style.display = 'none';
        btnPagar.disabled = false;
    }
};

function prepararTicketVisual() {
    setTxt('printNombreClinica', datosClinica.nombre);
    setTxt('printDireccionClinica', datosClinica.direccion);
    setTxt('printFolio', "#" + ticketActualId.slice(-6).toUpperCase());
    setTxt('printCajero', nombreCajeroCompleto.toUpperCase());
    setTxt('printFechaHora', new Date().toLocaleString());
    setTxt('printTotal', ticketActualData.montoTotal.toFixed(2));
    
    const tbody = document.getElementById('printItems');
    tbody.innerHTML = "";
    ticketActualData.detalles.forEach(i => {
        tbody.innerHTML += `<tr><td>${i.cantidad}</td><td>${i.concepto}</td><td style="text-align:right;">$${(i.precio * i.cantidad).toFixed(2)}</td></tr>`;
    });

    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, { text: ticketActualId, width: 80, height: 80 });
}

// Reimpresión manual (No necesita overlay de carga largo)
const ejecutarImpresionManual = async () => {
    if (!ticketActualId) return;
    const ticketEl = document.getElementById('ticketImpresion');
    ticketEl.style.display = 'block';
    prepararTicketVisual();
    await new Promise(r => setTimeout(r, 800)); 
    window.print();
    ticketEl.style.display = 'none';
};

btnSoloImprimir.onclick = ejecutarImpresionManual;
if(btnReimprimirPagado) btnReimprimirPagado.onclick = ejecutarImpresionManual;