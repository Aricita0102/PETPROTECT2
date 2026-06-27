/**
 * SISTEMA: PET PROTECT (Ecosistema Quetzalia)
 * MÓDULO: Biblioteca de Expedientes
 * ARQUITECTURA: Delegación limpia y tarjetas de catálogo dinámicas.
 */
import '../../../css/modulo_biblioteca_expedientes.css';
import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { cargarModulo } from '../principal_v2.js'; 

// 🚀 IMPORTAMOS SÓLO EL ORQUESTADOR DEL MODAL (Evitamos colisiones)
import { inyectarYMostrarModal } from '../modal/modal_registro_pacientes.js';

// El listener global ha sido movido adentro de inicializarModuloPacientes para mayor confiabilidad en el SPA.

let todasLasMascotas = [];
let canalMascotas = null; 
let canalAlertas = null;

// ==========================================================================
// 🧠 INICIALIZACIÓN DEL MÓDULO
// ==========================================================================
export async function inicializarModuloPacientes() {
    console.log("[PET PROTECT] Inicializando controlador de pacientes...");
    
    const grid = document.getElementById('rejillaPacientes');
    const inputBuscar = document.getElementById('inBuscarPaciente');
    const btnNuevo = document.getElementById('btnNuevoPaciente');

    if (btnNuevo) {
        // Removemos listeners previos clonando el nodo para evitar fugas de memoria en el SPA
        const nuevoBtn = btnNuevo.cloneNode(true);
        btnNuevo.parentNode.replaceChild(nuevoBtn, btnNuevo);
        nuevoBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("[BIBLIOTECA] Clic detectado. Delegando apertura de modal express...");
            await inyectarYMostrarModal();
        });
    }

    if (!grid) return;

    if (inputBuscar) {
        const dropdown = document.getElementById('dropdown-resultados');
        let timeoutBusqueda = null;

        inputBuscar.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase().trim();
            clearTimeout(timeoutBusqueda);

            // 1. Filtrar la cuadrícula principal de fondo (sigue funcionando igual)
            const filtrados = todasLasMascotas.filter(m => {
                const nombre = m.nombre?.toLowerCase() || '';
                const tutor = m.clientes?.nombre_completo?.toLowerCase() || '';
                return nombre.includes(termino) || tutor.includes(termino);
            });
            renderizarCatalogo(filtrados, grid);

            // 2. Lógica del Dropdown Predictivo
            if (termino.length < 2) {
                dropdown.style.display = 'none';
                return;
            }

            timeoutBusqueda = setTimeout(() => {
                const limitados = filtrados.slice(0, 6); // Top 6 resultados para el dropdown
                renderizarResultadosPredictivos(limitados, dropdown);
                dropdown.style.display = 'block';
            }, 200); // Debounce corto porque es local
        });

        // Cerrar dropdown si se hace clic fuera
        document.addEventListener('click', (e) => {
            if (!inputBuscar.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        inputBuscar.addEventListener('focus', () => {
            if (inputBuscar.value.trim().length >= 2) {
                dropdown.style.display = 'block';
            }
        });
    }

    await cargarPacientesIniciales(grid);
    iniciarSuscripcionTiempoReal(grid);
    iniciarSistemaAlertasEmergencia();
}

// ─── Funciones del Buscador Predictivo ──────────────────────────────────────────
function renderizarResultadosPredictivos(resultados, dropdown) {
    if (resultados.length === 0) {
        dropdown.innerHTML = '<div class="resultado-pred-empty">No se encontraron pacientes ni tutores.</div>';
        return;
    }

    dropdown.innerHTML = '';
    resultados.forEach(paciente => {
        const fotoUrl = paciente.foto_url || 'https://cdn-icons-png.flaticon.com/512/2809/2809865.png';
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
            dropdown.style.display = 'none';
            sessionStorage.setItem('idPacienteActivo', paciente.id);
            cargarModulo('MODULO_EXPEDIENTES_HISTORIAL');
        });

        dropdown.appendChild(item);
    });
}

// ==========================================================================
// 🧹 LIMPIEZA DEL MÓDULO (Ciclo de vida SPA)
// ==========================================================================
export function destruirModuloPacientes() {
    console.log("[PET PROTECT] Limpiando suscripciones de la biblioteca...");
    if (canalMascotas) conexionSupabase.removeChannel(canalMascotas);
    if (canalAlertas) conexionSupabase.removeChannel(canalAlertas);
    
    canalMascotas = null;
    canalAlertas = null;
    todasLasMascotas = [];
}

// ==========================================================================
// 🛠️ FUNCIONES AUXILIARES
// ==========================================================================

// Calcula la edad en base a la fecha de nacimiento
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return 'Edad N/D';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
        edad--;
    }
    
    if (edad <= 0) {
        let meses = hoy.getMonth() - nac.getMonth();
        if (meses < 0) meses += 12;
        return meses === 0 ? 'Menos de 1 mes' : `${meses} meses`;
    }
    return `${edad} años`;
}

// Asigna la clase de color correcta según el estatus que viene de la BD
function obtenerClaseEstado(estatus) {
    const estadoNormalizado = estatus?.toLowerCase() || 'activo';
    switch(estadoNormalizado) {
        case 'hospitalizado': return 'critico';
        case 'fallecido': return 'inactivo'; // Asume que tienes una clase para inactivos
        case 'activo':
        default: return 'estable';
    }
}

// ==========================================================================
// 🚨 RENDERIZADO DEL CATÁLOGO Y SUSCRIPCIONES
// ==========================================================================
async function cargarPacientesIniciales(grid) {
    try {
        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) throw new Error("No hay sesión activa");

        const organizacionId = sesion.perfil.organizacion_id;
        if (!organizacionId) throw new Error("No se pudo obtener la clínica del usuario");

        // 2. Traer pacientes SÓLO de esta organización
        const { data, error } = await conexionSupabase
            .from('pacientes')
            .select(`
                id, nombre, especie, raza, sexo, foto_url, created_at, fecha_nacimiento, estatus,
                clientes!inner ( nombre_completo, telefono )
            `)
            .eq('organizacion_id', organizacionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fallo al cargar catálogo:", error.message);
            return;
        }
        
        todasLasMascotas = data;
        renderizarCatalogo(todasLasMascotas, grid);
    } catch (err) {
        console.error("[SEGURIDAD] Error al cargar pacientes:", err.message);
    }
}

function renderizarCatalogo(lista, grid) {
    grid.innerHTML = "";
    
    const estadoVacio = document.getElementById('estadoVacioExpedientes');
    if (lista.length === 0) {
        if(estadoVacio) {
            estadoVacio.classList.remove('oculto');
            estadoVacio.innerHTML = `<h2>Sin resultados</h2><p>No se encontraron pacientes que coincidan con la búsqueda.</p>`;
        }
        return;
    } else {
        if(estadoVacio) estadoVacio.classList.add('oculto');
    }

    lista.forEach(m => {
        const article = document.createElement('article');
        article.className = "tarjeta-soft-paciente"; 
        
        // Formateo de datos
        const razaTexto = m.raza ? ` • ${m.raza}` : '';
        const especieTexto = m.especie ? m.especie.charAt(0).toUpperCase() + m.especie.slice(1) : 'Desconocida';
        const nombreTutor = m.clientes?.nombre_completo || 'Sin Asignar';
        const edadTexto = calcularEdad(m.fecha_nacimiento);
        
        // 💡 FOTO: Si no hay foto_url, no renderizamos la etiqueta img para evitar placehold.co
        const imgHtml = m.foto_url 
            ? `<img src="${m.foto_url}" alt="Foto de ${m.nombre}" class="img-paciente-fluida">` 
            : `<div class="sin-foto-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f4f7fe; color:#64748b; font-weight:600; font-size:1.2rem;">${m.nombre.charAt(0).toUpperCase()}</div>`;

        const claseBadge = obtenerClaseEstado(m.estatus);
        const textoBadge = m.estatus ? m.estatus.charAt(0).toUpperCase() + m.estatus.slice(1) : 'Activo';
        
        // Fecha de registro para mostrar si no hay citas
        const fechaRegistro = new Date(m.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

        // Inyectamos el HTML exacto de tu diseño
        article.innerHTML = `
            <div class="contenedor-imagen-cuadrada">
                <span class="badge-estado ${claseBadge}">${textoBadge}</span>
                ${imgHtml}
                
                <div class="acciones-flotantes-hover">
                    <button class="btn-accion-circular btn-ver-expediente" aria-label="Ver expediente completo" title="Ver Expediente">
                        <span class="material-symbols-rounded">visibility</span>
                    </button>
                    <button class="btn-accion-circular btn-editar-paciente" aria-label="Editar datos" title="Editar">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                </div>
            </div>
        
            <div class="info-soft-paciente">
                <div class="meta-superior-soft">
                    <span class="especie-raza">${especieTexto}${razaTexto}</span>
                    <span class="edad-paciente"><span class="material-symbols-rounded icono-chico"></span> ${edadTexto}</span>
                </div>
                
                <h3 class="nombre-paciente-soft">${m.nombre}</h3>
                <p class="tutor-paciente-soft">Tutor: ${nombreTutor}</p>
                
                <div class="datos-inferiores-soft">
                    <span class="ultima-visita-soft">Registrado: <strong>${fechaRegistro}</strong></span>
                </div>
            </div>
        `;
        
        // 🌟 EL PUENTE DE NAVEGACIÓN: Agregamos el id al sessionStorage antes de abrir el módulo
        const btnVer = article.querySelector('.btn-ver-expediente');
        btnVer.onclick = () => {
            sessionStorage.setItem('idPacienteActivo', m.id);
            cargarModulo('MODULO_EXPEDIENTES_HISTORIAL');
        };

        const imgClick = article.querySelector('.img-paciente-fluida');
        imgClick.style.cursor = 'pointer';
        imgClick.onclick = () => {
            sessionStorage.setItem('idPacienteActivo', m.id);
            cargarModulo('MODULO_EXPEDIENTES_HISTORIAL');
        };

        grid.appendChild(article);
    });
}

function iniciarSuscripcionTiempoReal(grid) {
    if (canalMascotas) {
        conexionSupabase.removeChannel(canalMascotas);
    }
    
    canalMascotas = conexionSupabase.channel('cambios-pacientes')
        .on('postgres_changes', { event: '*', table: 'pacientes', schema: 'public' }, () => {
            cargarPacientesIniciales(grid);
        })
        .subscribe();
}

function iniciarSistemaAlertasEmergencia() {
    if (canalAlertas) {
        conexionSupabase.removeChannel(canalAlertas);
    }

    canalAlertas = conexionSupabase.channel('emergencias')
        .on('postgres_changes', { event: 'INSERT', table: 'notificaciones', filter: 'tipo=eq.urgencia_medica' }, (payload) => {
            if (payload.new.estado === 'activa') {
                const overlay = document.getElementById('modalEmergenciaOverlay');
                const audio = document.getElementById('audioAlarma');
                if (overlay) overlay.style.display = "flex";
                if (audio) { audio.loop = true; audio.play().catch(() => {}); }
            }
        })
        .subscribe();
}