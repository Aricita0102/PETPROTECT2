/**
 * SISTEMA: PET PROTECT (Ecosistema Quetzalia)
 * MÓDULO: Configuración Maestra Veterinaria (Controlador Global)
 * RUTA: /src/js/vistas/modulos/modulo_configuracion_logica.js
 * ARQUITECTURA: SPA Modular, Prevención de Fugas de Memoria, Sincronización Supabase
 */

import { conexionSupabase } from '../../infraestructura/conexion.js';

// ==========================================
// 1. ESTADO GLOBAL DEL MÓDULO Y LIMPIEZA
// ==========================================
let referenciasEventos = []; // 🛡️ Array vital para prevenir Memory Leaks
let uidUsuarioActual = "";
let organizacionIdActual = "";
let rolActual = "";
let especialidadesCheckeadas = [];

/**
 * Helper de Grado Médico: Registra eventos y los guarda para su posterior destrucción
 */
const registrarEvento = (elemento, tipoEvento, funcion) => {
    if (elemento) {
        elemento.addEventListener(tipoEvento, funcion);
        referenciasEventos.push({ elemento, tipoEvento, funcion });
    }
};

// ==========================================
// 2. CICLO DE VIDA DEL MÓDULO (INYECCIÓN SPA)
// ==========================================

export async function iniciarModuloConfiguracion() {
    console.info("⚙️ [MÓDULO AJUSTES] Iniciando calibración de preferencias y Supabase...");
    
    try {
        // 1. Verificación de Seguridad Zero-Trust
        const { data: { user }, error: authError } = await conexionSupabase.auth.getUser();
        if (authError || !user) {
            console.warn("Seguridad: Sesión no válida en módulo de configuración.");
            window.location.assign("/LOGIN.html");
            return;
        }

        uidUsuarioActual = user.id;

        // 2. Carga de datos operativos
        await cargarDatosPerfil();
        
        // 3. Inicialización de componentes UI
        configurarTabsEstiloGoogle();
        configurarAcordeonAdmin();
        gestionarEspecialidadesUI();
        configurarEventosToggles();
        initMenuResponsivo();
        inicializarEventosFormularios();
        
    } catch (error) {
        console.error("Error en la inicialización de Configuración:", error);
    }
}

export function destruirModulo() {
    console.log("🧹 [MÓDULO AJUSTES] Desmontando configuración y limpiando memoria...");
    // Remover todos los Event Listeners de forma limpia
    referenciasEventos.forEach(ref => {
        if (ref.elemento) ref.elemento.removeEventListener(ref.tipoEvento, ref.funcion);
    });
    referenciasEventos = []; // Vaciar el recolector de basura
}

// ==========================================
// 3. LÓGICA DE NEGOCIO Y BASE DE DATOS
// ==========================================

const cargarDatosPerfil = async () => {
    // Recuperamos Perfil, Organización y Sucursal en una sola llamada
    const { data: perfil, error } = await conexionSupabase
        .from('perfiles')
        .select(`
            *,
            organizaciones (*),
            sucursales (*)
        `)
        .eq('id', uidUsuarioActual)
        .single();

    if (!error && perfil) {
        organizacionIdActual = perfil.organizacion_id;
        rolActual = perfil.rol;
        
        adaptarInterfazPorRol(perfil);
        renderizarDatosPerfil(perfil);
        
        // Pasamos el ID y el plan de suscripción para evaluar el código
        const planActual = perfil.organizaciones ? perfil.organizaciones.plan_suscripcion : 'basico';
        recuperarCodigoVinculacion(perfil.organizacion_id, planActual);
    } else {
        console.error("Error al cargar datos del perfil:", error);
    }
};

const renderizarDatosPerfil = (u) => {
    // --- COMPARTIDO ---
    if (document.getElementById('adjNombre')) document.getElementById('adjNombre').value = u.nombre_completo || "";
    if (document.getElementById('adjCorreo')) document.getElementById('adjCorreo').value = u.correo || "";
    if (document.getElementById('adjTelefono')) document.getElementById('adjTelefono').value = u.telefono || "";
    if (document.getElementById('adjCorreoEmergencia')) document.getElementById('adjCorreoEmergencia').value = u.correo_emergencia || "";
    if (document.getElementById('txtNombreSide')) document.getElementById('txtNombreSide').innerText = u.nombre_completo || "Usuario";

    // --- DATOS CLÍNICA (HEADER E IDENTIDAD) ---
    if (u.organizaciones) {
        if (document.getElementById('txtNombreClinicaHeader')) document.getElementById('txtNombreClinicaHeader').innerText = u.organizaciones.nombre_legal || "Protect Pet HQ";
        if (document.getElementById('nombreClinica')) document.getElementById('nombreClinica').value = u.organizaciones.nombre_legal || "";
    }
    
    if (u.sucursales) {
        if (document.getElementById('direccionClinica')) document.getElementById('direccionClinica').value = u.sucursales.direccion || "";
    }

    // --- ESPECÍFICOS DE VETERINARIO ---
    if (rolActual !== 'asistente') {
        if (document.getElementById('adjCedula')) document.getElementById('adjCedula').value = u.cedula_profesional || "";
        if (document.getElementById('adjConsultorio')) document.getElementById('adjConsultorio').value = u.consultorio || "No asignado";
        if (document.getElementById('adjTurno')) document.getElementById('adjTurno').value = u.turno || "Pendiente";
        
        if (u.especialidades) {
            especialidadesCheckeadas = u.especialidades;
            const checks = document.querySelectorAll('#contenedorCheckboxes input');
            checks.forEach(c => c.checked = u.especialidades.includes(c.value));
            const txtEsp = document.getElementById('txtEspecialidadesSeleccionadas');
            if (txtEsp) txtEsp.innerText = u.especialidades.join(", ") || "Seleccionar...";
        }
    }

    // --- TOGGLES OPERATIVOS ---
    if (rolActual === 'superadmin') {
        if (document.getElementById('chkModoMedico')) document.getElementById('chkModoMedico').checked = u.funge_como_medico;
        if (document.getElementById('chkModoAsistente')) document.getElementById('chkModoAsistente').checked = u.funge_como_asistente;
    }

    // --- FOTO DE PERFIL ---
    const marco = document.getElementById('fotoPerfilCont');
    const mini = document.getElementById('sidebarFotoUsuario');
    const placeholder = document.getElementById('placeholderFoto');

    if (u.avatar_url) {
        const url = u.avatar_url;
        [marco, mini].forEach(el => {
            if (el) {
                el.style.backgroundImage = `url('${url}')`;
                el.style.backgroundColor = "transparent";
            }
        });
        if (placeholder) placeholder.style.display = "none";
    } else {
        [marco, mini].forEach(el => {
            if (el) {
                el.style.backgroundImage = "none";
                el.style.backgroundColor = "#F27405";
            }
        });
        if (placeholder) {
            placeholder.style.display = "block";
            placeholder.innerText = "Subir Foto";
        }
    }
};

const recuperarCodigoVinculacion = async (orgId, plan) => {
    const displayElement = document.getElementById('displayCodigo');
    if (!orgId || !displayElement) return;

    if (plan.toLowerCase() === 'basico' || plan.toLowerCase() === 'inicial') {
        displayElement.innerText = "No aplica en tu plan actual";
        displayElement.style.fontSize = "0.8rem";
        displayElement.style.color = "#89C2D9";
        return;
    }

    const { data: invitacion, error } = await conexionSupabase
        .from('invitaciones')
        .select('codigo_acceso')
        .eq('organizacion_id', orgId)
        .limit(1)
        .single();

    if (!error && invitacion) {
        displayElement.innerText = invitacion.codigo_acceso;
    } else {
        displayElement.innerText = "Generar código...";
    }
};

const guardarCambiosProfesionales = async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true; // UX: Prevenir doble clic

    const datos = {
        nombre_completo: document.getElementById('adjNombre')?.value || "",
    };

    if (rolActual !== 'asistente') {
        datos.cedula_profesional = document.getElementById('adjCedula')?.value || "";
        datos.especialidades = especialidadesCheckeadas;
    }

    const { error } = await conexionSupabase
        .from('perfiles')
        .update(datos)
        .eq('id', uidUsuarioActual);

    if (error) {
        alert("Error al guardar la información. Verifique su conexión.");
    } else {
        // UX: Notificación visual no intrusiva (idealmente cambiar por un Toast)
        if (btnSubmit) {
            const textoOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = "✅ Guardado";
            btnSubmit.style.backgroundColor = "var(--verde-exito, #10B981)";
            setTimeout(() => {
                btnSubmit.innerHTML = textoOriginal;
                btnSubmit.style.backgroundColor = "";
                btnSubmit.disabled = false;
            }, 2000);
        } else {
            alert("✅ Perfil profesional actualizado.");
        }
    }
};

// ==========================================
// 4. CONTROLADORES UI Y EVENTOS SEGUROS
// ==========================================

const inicializarEventosFormularios = () => {
    const formPro = document.getElementById('formPerfilGlobal');
    if (formPro) registrarEvento(formPro, 'submit', guardarCambiosProfesionales);
    
    // Configuración de foto de perfil
    const btnFoto = document.getElementById('btnCambiarFoto');
    const inputFoto = document.getElementById('inputFotoPerfil');

    if (btnFoto && inputFoto) {
        registrarEvento(btnFoto, 'click', () => inputFoto.click());
        
        registrarEvento(inputFoto, 'change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            btnFoto.innerHTML = "Subiendo...";
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${uidUsuarioActual}-${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await conexionSupabase.storage
                    .from('fotos_perfil')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = conexionSupabase.storage
                    .from('fotos_perfil')
                    .getPublicUrl(filePath);

                await conexionSupabase
                    .from('perfiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', uidUsuarioActual);

                btnFoto.innerHTML = "Cambiar Foto";
                cargarDatosPerfil(); // Refrescar en vivo sin recargar la página entera (SPA best practice)
                
            } catch (err) {
                console.error("Error Storage:", err.message);
                alert("No se pudo subir la imagen.");
                btnFoto.innerHTML = "Cambiar Foto";
            }
        });
    }

    // Botón de cerrar sesión local del módulo
    const btnLogout = document.getElementById('btnCerrarSesion');
    if (btnLogout) {
        registrarEvento(btnLogout, 'click', async (e) => {
            e.preventDefault();
            await conexionSupabase.auth.signOut();
            window.location.assign("/LOGIN.html");
        });
    }
};

const configurarEventosToggles = () => {
    const chkMedico = document.getElementById('chkModoMedico');
    const chkAsistente = document.getElementById('chkModoAsistente');

    const manejarToggle = async (e) => {
        const campo = (e.target.id === 'chkModoMedico') ? 'funge_como_medico' : 'funge_como_asistente';
        const { error } = await conexionSupabase
            .from('perfiles')
            .update({ [campo]: e.target.checked })
            .eq('id', uidUsuarioActual);
            
        if(error) {
            console.error("Error actualizando permisos operativos:", error);
            e.target.checked = !e.target.checked; // Revertir visualmente si falló
        }
    };

    if (chkMedico) registrarEvento(chkMedico, 'change', manejarToggle);
    if (chkAsistente) registrarEvento(chkAsistente, 'change', manejarToggle);
};

const configurarTabsEstiloGoogle = () => {
    const menuLinks = document.querySelectorAll('#menuNavegacionOnPage a');
    const secciones = document.querySelectorAll('.seccion-spa');

    menuLinks.forEach(link => {
        registrarEvento(link, 'click', (e) => {
            e.preventDefault();
            menuLinks.forEach(l => l.classList.remove('itemActivo'));
            link.classList.add('itemActivo');

            secciones.forEach(sec => sec.classList.remove('activa'));

            const targetId = link.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('activa');
        });
    });
};

const configurarAcordeonAdmin = () => {
    const btnAcordeon = document.getElementById('btnAcordeonAdmin');
    const submenu = document.getElementById('submenuAdmin');
    const flecha = document.getElementById('flechaAdmin');

    if (btnAcordeon && submenu && flecha) {
        registrarEvento(btnAcordeon, 'click', () => {
            const estaAbierto = submenu.style.display === 'flex';
            if (estaAbierto) {
                submenu.style.display = 'none';
                flecha.classList.remove('rotada');
                btnAcordeon.style.backgroundColor = 'transparent';
                btnAcordeon.style.color = '#89C2D9';
            } else {
                submenu.style.display = 'flex';
                flecha.classList.add('rotada');
                btnAcordeon.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                btnAcordeon.style.color = 'white';
            }
        });
    }
};

const adaptarInterfazPorRol = (perfil) => {
    const bloqueVet = document.getElementById('bloqueVeterinario');
    const bloqueAsist = document.getElementById('bloqueAsistente');
    const txtRolSide = document.getElementById('txtRolSide');
    const linkVolver = document.getElementById('linkVolverDashboard');
    const grupoMenuAdmin = document.getElementById('grupoMenuAdmin');

    if (rolActual === 'superadmin' || rolActual === 'veterinario') {
        if (bloqueVet) bloqueVet.style.display = 'block';
        if (bloqueAsist) bloqueAsist.remove(); 

        if (rolActual === 'superadmin') {
            if(txtRolSide) txtRolSide.innerText = 'DUEÑO / MÉDICO';
            if(linkVolver) linkVolver.setAttribute('data-target', 'MODULO_AGENDA');
            if (grupoMenuAdmin) grupoMenuAdmin.style.display = 'block';
        } else {
            if(txtRolSide) txtRolSide.innerText = 'VETERINARIO';
            if(linkVolver) linkVolver.setAttribute('data-target', 'MODULO_AGENDA');
        }
    } else if (rolActual === 'asistente') {
        if (bloqueAsist) bloqueAsist.style.display = 'block';
        if (bloqueVet) bloqueVet.remove();
        if (grupoMenuAdmin) grupoMenuAdmin.remove(); 
        
        if(txtRolSide) {
            txtRolSide.innerText = 'ASISTENTE';
            txtRolSide.style.color = '#89C2D9';
        }
        if(linkVolver) linkVolver.setAttribute('data-target', 'MODULO_ASISTENTE_DASHBOARD');
    }
};

const gestionarEspecialidadesUI = () => {
    const trigger = document.getElementById('comboEspecialidades');
    const menu = document.getElementById('contenedorCheckboxes');
    if (!trigger || !menu) return;

    registrarEvento(trigger, 'click', () => {
        menu.style.display = (menu.style.display === "block") ? "none" : "block";
    });
    
    const checks = menu.querySelectorAll('input[type="checkbox"]');
    checks.forEach(c => {
        registrarEvento(c, 'change', () => {
            especialidadesCheckeadas = Array.from(checks).filter(i => i.checked).map(i => i.value);
            const txt = document.getElementById('txtEspecialidadesSeleccionadas');
            if(txt) txt.innerText = especialidadesCheckeadas.join(", ") || "Seleccionar...";
        });
    });
};

const initMenuResponsivo = () => {
    const btnHamburguesa = document.getElementById('btnHamburguesa');
    const iconoHamburguesa = document.getElementById('iconoHamburguesa');
    const contenedorPrincipal = document.querySelector('.interfazVeterinario');
    const enlacesMenu = document.querySelectorAll('.menuInterno a'); 

    if (!btnHamburguesa || !contenedorPrincipal) return;

    registrarEvento(btnHamburguesa, 'click', () => {
        contenedorPrincipal.classList.toggle('sidebar-abierto');
        if(iconoHamburguesa) {
            iconoHamburguesa.textContent = contenedorPrincipal.classList.contains('sidebar-abierto') ? 'close' : 'menu';
        }
    });

    enlacesMenu.forEach(enlace => {
        registrarEvento(enlace, 'click', () => {
            if (window.innerWidth <= 768) {
                contenedorPrincipal.classList.remove('sidebar-abierto');
                if(iconoHamburguesa) iconoHamburguesa.textContent = 'menu';
            }
        });
    });

    registrarEvento(contenedorPrincipal, 'click', (evento) => {
        if (evento.target === contenedorPrincipal && contenedorPrincipal.classList.contains('sidebar-abierto')) {
            contenedorPrincipal.classList.remove('sidebar-abierto');
            if(iconoHamburguesa) iconoHamburguesa.textContent = 'menu';
        }
    });
};