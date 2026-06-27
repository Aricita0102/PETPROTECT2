/**
 * SISTEMA: PET PROTECT (Ecosistema Quetzalia) - Gestión Veterinaria SaaS
 * MÓDULO: Controlador Exclusivo del Modal de Registro (Triage Express)
 * DESARROLLADOR: DaAri Studios
 * ARQUITECTURA: Separación de Responsabilidades (SRP) y Singleton DOM
 */
import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { cargarModulo } from '../principal_v2.js';
import StorageService from '../../infraestructura/storage.js';

// IMPORTACIÓN VITE: Síncrona y robusta
import modalRegistroHTML from '/MODAL_REGISTRAR_PACIENTES.html?raw';

let fotoFile = null;
let modalInyectado = false; 
let pacienteRegistradoId = null; // Variable global para almacenar el ID tras guardar

// ==========================================================================
// 1. DICCIONARIO LOCAL DE RAZAS (Para exóticos y granja)
// ==========================================================================
const dbRazasLocal = {
    "Lagomorfo": ["Cabeza de León", "Belier", "Angora", "Rex", "Mestizo"],
    "Roedor": ["Hámster Sirio", "Hámster Ruso", "Cobaya", "Chinchilla", "Rata Dumbo", "Mestizo"],
    "Mustelido": ["Hurón Sable", "Hurón Albino", "Hurón Panda"],
    "Porcino": ["Mini Pig", "Cerdo Vietnamita"],
    "Erinaceomorfo": ["Erizo Pigmeo Africano", "Erizo Europeo"],
    "Marsupial": ["Petauro del Azúcar"],
    "Ave_Psitaciforme": ["Periquito", "Ninfa / Carolina", "Guacamayo", "Loro Gris", "Agapornis", "Cacatúa"],
    "Ave_Paseriforme": ["Canario", "Jilguero", "Diamante Mandarín"],
    "Ave_Corral": ["Gallina", "Pato", "Pavo"],
    "Ave_Rapaz": ["Halcón", "Búho", "Cernícalo"],
    "Reptil_Chelonio": ["Tortuga de Orejas Rojas", "Tortuga Sulcata", "Tortuga Terrestre"],
    "Reptil_Squamata": ["Iguana Verde", "Dragón Barbudo", "Camaleón", "Gecko Leopardo"],
    "Reptil_Serpiente": ["Pitón Bola", "Boa Constrictor", "Falsa Coral"],
    "Anfibio": ["Ajolote", "Rana Arborícola", "Sapo"],
    "Equino": ["Cuarto de Milla", "Pura Sangre", "Árabe", "Mestizo"],
    "Bovino": ["Holstein", "Angus", "Cebú"],
    "Caprino": ["Boer", "Alpina"],
    "Ovino": ["Dorper", "Suffolk", "Pelibuey"],
    "Otro": [] // Se deja vacío para que escriban libremente
};

// ==========================================================================
// 2. MOTOR DE INYECCIÓN DINÁMICA
// ==========================================================================
export async function inyectarYMostrarModal() {
    console.log("[MODAL TRIAGE] Preparando inyección del formulario express...");
    const contenedorDOM = document.getElementById('contenedor-modal-dinamico');

    if (!contenedorDOM) {
        console.error("❌ ERROR: No existe #contenedor-modal-dinamico en la vista principal.");
        return;
    }

    if (!modalInyectado && !document.getElementById('contenedorRegistro')) {
        contenedorDOM.innerHTML = modalRegistroHTML;
        modalInyectado = true;
        
        await new Promise(resolve => setTimeout(resolve, 0)); // Micro-tick
        
        configurarEventosDelModalInyectado();
    }

    const modal = document.getElementById('contenedorRegistro');

    if (modal) {
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; 
    }
}

// ==========================================================================
// 3. EVENTOS Y VINCULACIÓN DE UI
// ==========================================================================
function configurarEventosDelModalInyectado() {
    const refs = {
        modal: document.getElementById('contenedorRegistro'),
        form: document.getElementById('formRegistroExpress'),
        btnCerrar: document.getElementById('btnCerrarRegistro'),
        regEspecie: document.getElementById('exp_especie'),
        
        btnGuardar: document.getElementById('btn_guardar_expediente'),
        btnConsulta: document.getElementById('btn_iniciar_consulta'),
        btnExpediente: document.getElementById('btn_completar_expediente')
    };

    const cerrarModal = () => {
        refs.modal.classList.remove('visible');
        refs.modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto'; 
        if (refs.form) refs.form.reset();
        
        // Ocultar campo de "Otra especie" si estaba visible
        gestionarCampoOtraEspecie(null);
        
        fotoFile = null;
        pacienteRegistradoId = null; 
        
        if (refs.btnGuardar) refs.btnGuardar.style.display = 'flex';
        if (refs.btnExpediente) refs.btnExpediente.style.display = 'none';
        if (refs.btnConsulta) refs.btnConsulta.style.display = 'none';
    };

    refs.btnCerrar?.addEventListener('click', cerrarModal);

    refs.modal?.addEventListener('click', (e) => {
        if (e.target === refs.modal) cerrarModal();
    });

    // Evento de cambio de especie (Maneja el input dinámico y las razas)
    refs.regEspecie?.addEventListener('change', (e) => {
        gestionarCampoOtraEspecie(e.target.value);
        cargarRazasDinamicas(e.target.value);
    });

    refs.btnGuardar?.addEventListener('click', (e) => ejecutarGuardado(e, refs));

    refs.btnConsulta?.addEventListener('click', (e) => {
        e.preventDefault();
        if (pacienteRegistradoId) {
            const id = pacienteRegistradoId;
            cerrarModal();
            cargarModulo('MODULO_VETERINARIO_CONSULTA', { paciente_id: id });
        }
    });

    refs.btnExpediente?.addEventListener('click', (e) => {
        e.preventDefault();
        if (pacienteRegistradoId) {
            const id = pacienteRegistradoId;
            cerrarModal();
            cargarModulo('MODULO_EXPEDIENTES_HISTORIAL', { paciente_id: id });
        }
    });
}

// ==========================================================================
// 4. LÓGICA DE UI: "OTRA ESPECIE" Y RAZAS DINÁMICAS
// ==========================================================================
function gestionarCampoOtraEspecie(especieSeleccionada) {
    const selectEspecie = document.getElementById('exp_especie');
    let inputOtra = document.getElementById('exp_especie_otra');

    // Crear el input dinámicamente si no existe
    if (!inputOtra) {
        inputOtra = document.createElement('input');
        inputOtra.type = 'text';
        inputOtra.id = 'exp_especie_otra';
        inputOtra.name = 'especie_otra';
        inputOtra.placeholder = 'Escribe la especie (Ej. Hurón, Tortuga...)';
        inputOtra.style.marginTop = '10px';
        inputOtra.style.display = 'none';
        inputOtra.classList.add('form-control'); // Agrega la clase CSS que uses para tus inputs
        
        // Insertarlo justo después del select de especie
        selectEspecie.parentNode.insertBefore(inputOtra, selectEspecie.nextSibling);
    }

    // Mostrar/Ocultar y requerir según selección
    if (especieSeleccionada === 'Otro') {
        inputOtra.style.display = 'block';
        inputOtra.required = true;
        inputOtra.focus();
    } else {
        inputOtra.style.display = 'none';
        inputOtra.required = false;
        inputOtra.value = ''; // Limpiar si se arrepiente
    }
}

async function cargarRazasDinamicas(especie) {
    const inputRaza = document.getElementById('exp_raza'); 
    let dataList = document.getElementById('lista-razas');

    if (!inputRaza || !dataList) return;

    inputRaza.value = "";
    dataList.innerHTML = ''; // Limpiar opciones anteriores

    // Si es "Otro", simplemente dejamos el campo libre
    if (especie === "Otro") {
        inputRaza.placeholder = "Escribe la raza (o 'Desconocida')...";
        inputRaza.disabled = false;
        return;
    }

    inputRaza.placeholder = "Sincronizando catálogo...";
    inputRaza.disabled = true;

    try {
        let razasList = [];
        if (especie === "canino") { 
            const respuesta = await fetch('https://dog.ceo/api/breeds/list/all');
            const datos = await respuesta.json();
            for (const [raza, subrazas] of Object.entries(datos.message)) {
                if (subrazas.length > 0) {
                    subrazas.forEach(sub => razasList.push(`${raza} ${sub}`));
                } else {
                    razasList.push(raza);
                }
            }
            razasList.push("Mestizo");
        } 
        else if (especie === "felino") { 
            const respuesta = await fetch('https://api.thecatapi.com/v1/breeds');
            const datos = await respuesta.json();
            datos.forEach(gato => razasList.push(gato.name));
            razasList.push("Mestizo / Común");
        }
        else {
            razasList = dbRazasLocal[especie] || ["Desconocida", "Mestizo"];
        }
        
        // Poblar el Datalist
        razasList.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.charAt(0).toUpperCase() + r.slice(1);
            dataList.appendChild(opt);
        });

        inputRaza.placeholder = "Escribe o selecciona la raza...";

    } catch (error) {
        console.error("[FALLO AL CARGAR RAZAS]", error);
        inputRaza.placeholder = "Escribe la raza...";
    } finally {
        inputRaza.disabled = false;
    }
}

// ==========================================================================
// 5. PERSISTENCIA: SUPABASE + LÓGICA DE NEGOCIO
// ==========================================================================
async function ejecutarGuardado(e, refs) {
    e.preventDefault();
    
    if (refs.form && !refs.form.checkValidity()) {
        refs.form.reportValidity();
        return;
    }
    
    const textoOriginalBtn = refs.btnGuardar.innerHTML;
    refs.btnGuardar.disabled = true;
    refs.btnGuardar.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Guardando...`;

    try {
        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) throw new Error("Sesión clínica no válida.");
        const userId = sesion.user.id;
        const perfil = sesion.perfil;

        // --- ACTUALIZACIÓN DE TELÉFONO ---
        // Limpiamos todo lo que no sea número y aseguramos que tenga un máximo de 10 caracteres
        let telefonoTutor = document.getElementById('exp_tutor_tel')?.value.trim() || '';
        telefonoTutor = telefonoTutor.replace(/\D/g, '').substring(0, 10);
        
        const nombreTutor = document.getElementById('exp_tutor_nombre')?.value.trim();
        
        let clienteId = null;

        const { data: clienteExistente, error: errBusquedaCliente } = await conexionSupabase
            .from('clientes')
            .select('id')
            .eq('telefono', telefonoTutor)
            .eq('organizacion_id', perfil.organizacion_id)
            .maybeSingle();

        if (errBusquedaCliente) throw errBusquedaCliente;

        if (clienteExistente) {
            clienteId = clienteExistente.id;
        } else {
            const { data: nuevoCliente, error: errC } = await conexionSupabase
                .from('clientes')
                .insert([{
                    organizacion_id: perfil.organizacion_id,
                    sucursal_id: perfil.sucursal_id,
                    nombre_completo: nombreTutor,
                    telefono: telefonoTutor,
                    correo: 'pendiente@express.com',
                    direccion: 'Pendiente de actualización',
                    created_by: userId
                }])
                .select().single();
            if (errC) throw errC;
            clienteId = nuevoCliente.id;
        }

        // Resolución de Especie (Si es 'Otro', toma el valor del input generado)
        let especieFinal = document.getElementById('exp_especie')?.value;
        if (especieFinal === 'Otro') {
            const inputOtra = document.getElementById('exp_especie_otra');
            especieFinal = inputOtra ? inputOtra.value.trim() : 'Desconocida';
        }

        // Compilar datos médicos
        const sexoRepro = document.getElementById('exp_sexo_repro')?.value || 'indefinido';
        const alergias = document.getElementById('exp_alergias')?.value.trim() || 'Sin alergias conocidas';
        const temperamento = document.getElementById('exp_temperamento')?.value || 'docil';
        const motivo = document.getElementById('exp_motivo_consulta')?.value.trim() || 'Sin especificar';
        const notasCompiladas = `MOTIVO: ${motivo} | MANEJO: ${temperamento}`;

        // Cálculo de fecha_nacimiento aproximada a partir de Edad
        const edadAnios = parseInt(document.getElementById('exp_edad_anios')?.value) || 0;
        const edadMeses = parseInt(document.getElementById('exp_edad_meses')?.value) || 0;
        let fechaNacimiento = null;

        if (edadAnios > 0 || edadMeses > 0) {
            let d = new Date();
            d.setFullYear(d.getFullYear() - edadAnios);
            d.setMonth(d.getMonth() - edadMeses);
            fechaNacimiento = d.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        }

        // Creación del Paciente
        const { data: nuevoPaciente, error: errPaciente } = await conexionSupabase
            .from('pacientes')
            .insert([{
                cliente_id: clienteId,
                organizacion_id: perfil.organizacion_id,
                nombre: document.getElementById('exp_nombre_paciente')?.value.trim(),
                especie: especieFinal, // Usa la especie resuelta
                raza: document.getElementById('exp_raza')?.value.trim() || 'Mestizo',
                sexo: sexoRepro, // Mantenemos el estado reproductivo exacto del select
                peso_actual: parseFloat(document.getElementById('exp_peso')?.value) || 0,
                fecha_nacimiento: fechaNacimiento, // Guardamos la fecha calculada
                alergias: alergias, // Campo directo en BD
                notas_comportamiento: notasCompiladas,
                foto_url: null, 
                estatus: 'activo',
                created_by: userId
            }])
            .select().single();

        if (errPaciente) throw errPaciente;
        
        pacienteRegistradoId = nuevoPaciente.id;

        // Éxito
        refs.btnGuardar.style.display = 'none';
        if (refs.btnExpediente) refs.btnExpediente.style.display = 'flex';
        if (refs.btnConsulta) refs.btnConsulta.style.display = 'flex';

    } catch (error) {
        console.error("Error en registro:", error);
        alert("Error de integridad: " + error.message);
        refs.btnGuardar.disabled = false;
        refs.btnGuardar.innerHTML = textoOriginalBtn;
    }
}