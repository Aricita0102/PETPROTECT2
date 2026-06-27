import { conexionSupabase } from './infraestructura/conexion.js';
import StorageService from './infraestructura/storage.js';
import { confirmacionCustom, alertaCustom } from './utilidades/ui_alertas.js';
import { obtenerSesionActiva, actualizarDatosPerfil } from './infraestructura/sesion_store.js';

let referenciasEventos = [];
let uidUsuarioActual = "";
let organizacionIdActual = "";
let sucursalIdActual = "";
let rolActual = "";
let planActual = "inicial";
let especialidadesCheckeadas = [];
let idServicioEnEdicion = null;

// ==========================================
// DELEGACION DE EVENTOS SPA (DIRIGIDA)
// ==========================================
const obtenerContenedorVista = () => document.getElementById('contenedor-principal') || document.body;

const registrarEventoDelegado = (tipoEvento, selector, funcion) => {
    const contenedor = obtenerContenedorVista();
    const wrapper = async (e) => {
        const target = e.target.closest ? e.target.closest(selector) : null;
        if (target) {
            await funcion(e, target);
        }
    };
    contenedor.addEventListener(tipoEvento, wrapper);
    referenciasEventos.push({ elemento: contenedor, tipoEvento, funcion: wrapper });
};

export function destruirModulo() {
    console.log("🧹 [LOG-CONFIG] Destruyendo eventos del modulo de configuracion.");
    referenciasEventos.forEach(ref => {
        if (ref.elemento) ref.elemento.removeEventListener(ref.tipoEvento, ref.funcion);
    });
    referenciasEventos = [];
}

// 🛡️ CORRECCIÓN DE CACHÉ: Evita corromper URLs que ya tienen el signo '?'
const agregarCacheBuster = (url) => {
    if (!url) return url;
    return url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
};

export async function iniciarModuloConfiguracion() {
    console.log("🚀 [LOG-CONFIG] Iniciando modulo de configuracion...");
    try {
        const { data: { user }, error: authError } = await conexionSupabase.auth.getUser();
        if (authError || !user) {
            console.warn("⚠️ [ADVERTENCIA-CONFIG] No hay usuario autenticado. Redirigiendo a login.");
            window.location.assign("LOGIN.html");
            return;
        }

        uidUsuarioActual = user.id;
        console.log("✅ [LOG-CONFIG] Usuario detectado. UID:", uidUsuarioActual);

        await cargarDatosPerfil();
        inicializarEventosDelegados();

        if (organizacionIdActual) {
            await cargarCatalogoServicios();
            // La pasarela de MercadoPago fue eliminada. 
            // Aquí puedes llamar a una futura función cargarMetodosPago() si decides traer las tarjetas desde BD.
        } else {
            console.warn("⚠️ [ADVERTENCIA-CONFIG] No se carga catalogo porque organizacionIdActual esta vacio.");
        }

    } catch (error) {
        console.error("❌ [ERROR CRITICO-CONFIG] Fallo en la inicializacion:", error);
    }
}

// ==========================================
// RECUPERACION DE DATOS (READ)
// ==========================================
const cargarDatosPerfil = async () => {
    console.log("🔍 [LOG-CONFIG] Consultando datos del perfil en Supabase...");
    const { data: perfil, error } = await conexionSupabase
        .from('perfiles')
        .select(`*, organizaciones (*), sucursales (*)`)
        .eq('id', uidUsuarioActual)
        .single();

    if (error) {
        console.error("❌ [ERROR-CONFIG] Fallo al consultar perfil:", error);
        return;
    }

    if (perfil) {
        organizacionIdActual = perfil.organizacion_id;
        sucursalIdActual = perfil.sucursal_id;
        rolActual = perfil.rol;
        planActual = perfil.organizaciones ? perfil.organizaciones.plan_suscripcion : 'inicial';

        console.log("📊 [LOG-CONFIG] Datos obtenidos. OrgID:", organizacionIdActual, "| SucursalID:", sucursalIdActual, "| Rol:", rolActual);

        adaptarInterfazSoloVet();
        renderizarDatosEnFormularios(perfil);
    }
};

// ==========================================
// ADAPTACION DE INTERFAZ SEGUN ROL
// ==========================================
const adaptarInterfazSoloVet = () => {
    console.log("🎨 [LOG-CONFIG] Adaptando interfaz para rol:", rolActual);

    const bloqueVet = document.getElementById('bloqueVeterinario');
    if (bloqueVet && (rolActual === 'veterinario' || rolActual === 'superadmin' || rolActual === 'administrador')) {
        bloqueVet.style.display = 'block';
    }

    const bloqueAsistente = document.getElementById('bloqueAsistente');
    if (bloqueAsistente) {
        bloqueAsistente.style.display = (rolActual === 'asistente') ? 'block' : 'none';
    }

    const txtRolSide = document.getElementById('txtRolSide');
    if (txtRolSide) txtRolSide.innerText = rolActual === 'superadmin' ? 'MÉDICO TITULAR' : 'VETERINARIO';

    const grupoMenuAdmin = document.getElementById('grupoMenuAdmin');
    if ((rolActual === 'superadmin' || rolActual === 'administrador') && grupoMenuAdmin) {
        grupoMenuAdmin.style.display = 'block';
    }

    const linkVolver = document.getElementById('linkVolverDashboard');
    if (linkVolver) {
        linkVolver.removeAttribute('href');
        linkVolver.style.cursor = 'pointer';
        linkVolver.onclick = (e) => {
            e.preventDefault();
            if (typeof window.cargarModulo === 'function') {
                window.cargarModulo('MODULO_AGENDA');
            } else {
                window.location.href = 'PRINCIPAL.html';
            }
        };
    }

    // Restricciones de Plan Inicial
    if (planActual === 'inicial' || planActual === 'basico') {
        const elementosOcultar = [
            document.getElementById('navEquipo'), // Nav Lateral Equipo
            document.getElementById('navPersonal'), // Nav Lateral Personal
            document.querySelector('a[data-target="seccionEquipo"]'),
            document.querySelector('a[data-target="seccionPersonal"]'),
            document.getElementById('adjConsultorio')?.parentElement,
            document.getElementById('adjAsistente')?.parentElement,
            document.getElementById('adjTurno')?.parentElement,
            document.getElementById('displayCodigo')?.closest('.tarjetaContenedora')
        ];

        elementosOcultar.forEach(el => {
            if (el) el.style.display = 'none';
        });

        const formDual = document.getElementById('adjCedula')?.closest('.grid-dual');
        if (formDual) formDual.style.gridTemplateColumns = '1fr';
    } else {
        const navEquipo = document.getElementById('navEquipo');
        const navPersonal = document.getElementById('navPersonal');
        if (navEquipo) navEquipo.style.display = 'flex';
        if (navPersonal && (rolActual === 'superadmin' || rolActual === 'administrador')) navPersonal.style.display = 'flex';
    }
};

const renderizarDatosEnFormularios = (u) => {
    console.log("📝 [LOG-CONFIG] Renderizando datos en el HTML...");

    const setValueSeguro = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    const setTextSeguro = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setValueSeguro('adjNombre', u.nombre_completo || "");
    setValueSeguro('adjCorreo', u.correo || "");
    setValueSeguro('adjTelefono', u.telefono || "");
    setValueSeguro('adjCorreoEmergencia', u.correo_emergencia || "");
    setValueSeguro('adjCedula', u.cedula_profesional || "");

    if (u.especialidades && Array.isArray(u.especialidades)) {
        especialidadesCheckeadas = u.especialidades;
        document.querySelectorAll('#contenedorCheckboxes input').forEach(c => c.checked = u.especialidades.includes(c.value));
        setTextSeguro('txtEspecialidadesSeleccionadas', u.especialidades.join(", ") || "Seleccionar...");
    }

    // 🛡️ IMPLEMENTACIÓN DEL CACHE BUSTER SEGURO
    if (u.avatar_url) renderizarImagenBackground('fotoPerfilCont', 'placeholderFoto', agregarCacheBuster(u.avatar_url));
    if (u.firma_url) renderizarImagen('imgFirmaPreview', 'placeholderFirma', agregarCacheBuster(u.firma_url));

    if (u.organizaciones) {
        const org = u.organizaciones;
        setTextSeguro('txtNombreClinicaHeader', org.nombre_legal || "Configuración");
        setValueSeguro('nombreClinica', org.nombre_legal || "");
        setValueSeguro('adjNombreLegal', org.nombre_legal || "");
        setValueSeguro('adjRfcFiscal', org.rfc_fiscal || "");
        setTextSeguro('txtPlanActual', org.plan_suscripcion || "basico");

        const lblEstado = document.getElementById('lblEstadoSuscripcion');
        if (lblEstado) {
            lblEstado.innerText = org.estado_suscripcion || "Activa";
            lblEstado.style.background = (org.estado_suscripcion === 'activa' || org.estado_suscripcion === 'Activa') ? '#10B981' : '#E74C3C';
        }

        const expActuales = org.expedientes_actuales || 0;
        const limExp = org.limite_expedientes || 30;
        const porcentajeExp = (limExp > 0) ? Math.min((expActuales / limExp) * 100, 100) : 0;

        setTextSeguro('txtUsoExpedientes', `${expActuales} / ${limExp}`);
        const barExp = document.getElementById('barProgresoExpedientes');
        if (barExp) barExp.style.width = `${porcentajeExp}%`;

        if (org.logo_url) renderizarImagen('imgLogoPreview', 'textoLogo', agregarCacheBuster(org.logo_url));
    }

    if (u.sucursales) {
        setValueSeguro('direccionClinica', u.sucursales.direccion || "");
        if (u.sucursales.horarios) renderizarHorariosUI(u.sucursales.horarios);
    }
};

// ==========================================
// CONTROLADORES DE EVENTOS
// ==========================================
const inicializarEventosDelegados = () => {
    console.log("🔌 [LOG-CONFIG] Asignando listeners mediante Event Delegation...");

    // 💼 MOSTRAR FORMULARIO DE NUEVA FORMA DE PAGO
    registrarEventoDelegado('click', '#btnAgregarMetodoPago', (e, target) => {
        // Aquí puedes abrir tu propio modal para guardar una tarjeta nueva
        console.log("💳 Abriendo formulario para nueva tarjeta...");
        alert("Esta acción abrirá el formulario seguro para vincular una nueva tarjeta.");
    });

    // 1. TABS Y MENU
    registrarEventoDelegado('click', '#menuNavegacionOnPage a', (e, target) => {
        if(target.classList.contains('btn-acordeon-menu') || target.closest('.btn-acordeon-menu')) return;
        e.preventDefault();
        document.querySelectorAll('#menuNavegacionOnPage a').forEach(l => l.classList.remove('itemActivo'));
        target.classList.add('itemActivo');
        document.querySelectorAll('.seccion-spa').forEach(sec => sec.classList.remove('activa'));
        const targetSection = document.getElementById(target.getAttribute('data-target'));
        if (targetSection) targetSection.classList.add('activa');
    });

    registrarEventoDelegado('click', '#btnAcordeonAdmin', (e, target) => {
        const submenu = document.getElementById('submenuAdmin');
        const flecha = document.getElementById('flechaAdmin');
        if (submenu && flecha) {
            const estaAbierto = submenu.style.display === 'flex';
            submenu.style.display = estaAbierto ? 'none' : 'flex';
            flecha.classList.toggle('rotada', !estaAbierto);
        }
    });

    registrarEventoDelegado('click', '#comboEspecialidades', () => {
        const menu = document.getElementById('contenedorCheckboxes');
        if (menu) menu.style.display = (menu.style.display === "block") ? "none" : "block";
    });

    registrarEventoDelegado('change', '#contenedorCheckboxes input[type="checkbox"]', () => {
        const checks = document.querySelectorAll('#contenedorCheckboxes input[type="checkbox"]');
        especialidadesCheckeadas = Array.from(checks).filter(i => i.checked).map(i => i.value);
        const txt = document.getElementById('txtEspecialidadesSeleccionadas');
        if (txt) txt.innerText = especialidadesCheckeadas.join(", ") || "Seleccionar...";
    });

    const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    diasSemana.forEach(dia => {
        registrarEventoDelegado('change', `#chk${dia}`, (e, target) => {
            const isChecked = target.checked;
            const ini = document.getElementById(`ini-${dia}`);
            const fin = document.getElementById(`fin-${dia}`);
            const lbl = document.getElementById(`estado${dia}`);
            if (ini) ini.disabled = !isChecked;
            if (fin) fin.disabled = !isChecked;
            if (lbl) {
                lbl.innerText = isChecked ? "Abierto" : "Cerrado";
                lbl.style.color = isChecked ? "var(--cobalto)" : "#E74C3C";
            }
        });
    });

    // 2. FORMULARIO PERFIL PROFESIONAL
    registrarEventoDelegado('submit', '#formPerfilGlobal', async (e, target) => {
        e.preventDefault();
        const btn = target.querySelector('button[type="submit"]');
        animarBoton(btn, "Guardando...");

        const adjNombre = document.getElementById('adjNombre');
        const adjCedula = document.getElementById('adjCedula');

        const datos = {
            nombre_completo: adjNombre.value.trim(),
            especialidades: especialidadesCheckeadas
        };
        if (adjCedula) datos.cedula_profesional = adjCedula.value.trim();

        const { error } = await conexionSupabase.from('perfiles').update(datos).eq('id', uidUsuarioActual);
        if (error) {
            alert("Error al guardar perfil.");
            animarBoton(btn, "Error", "Actualizar Información");
            return;
        }
        animarBoton(btn, "✓ Guardado", "Actualizar Información");
    });

    // 3. SEGURIDAD DE CUENTA (CONTACTO)
    registrarEventoDelegado('submit', '#formSeguridadCuenta', async (e, target) => {
        e.preventDefault();
        const btn = target.querySelector('button[type="submit"]');
        animarBoton(btn, "Guardando...");

        const correoEmergencia = document.getElementById('adjCorreoEmergencia');
        const telefono = document.getElementById('adjTelefono');

        const datos = {
            correo_emergencia: correoEmergencia.value.trim(),
            telefono: telefono.value.trim()
        };

        const { error } = await conexionSupabase.from('perfiles').update(datos).eq('id', uidUsuarioActual);
        if (error) {
            alert("Error al guardar los datos de contacto.");
            animarBoton(btn, "Error", "Guardar Cambios");
            return;
        }
        animarBoton(btn, "✓ Guardado", "Guardar Cambios");
    });

    // MODAL Y CAMBIO DE CONTRASEÑA
    registrarEventoDelegado('click', '#btnAbrirModalPass', () => {
        document.getElementById('modalCambioPassword').classList.add('activo');
        document.getElementById('inNuevaPass').value = '';
        document.getElementById('inConfirmarPass').value = '';
        document.getElementById('msgErrorPass').style.display = 'none';
    });

    registrarEventoDelegado('click', '#btnCerrarModalPass', () => {
        document.getElementById('modalCambioPassword').classList.remove('activo');
    });

    registrarEventoDelegado('submit', '#formNuevaPassword', async (e, target) => {
        e.preventDefault();
        const pass1 = document.getElementById('inNuevaPass').value;
        const pass2 = document.getElementById('inConfirmarPass').value;
        const msgError = document.getElementById('msgErrorPass');

        if (pass1 !== pass2) {
            msgError.style.display = 'block';
            return;
        }
        msgError.style.display = 'none';
        
        const btn = target.querySelector('button');
        animarBoton(btn, "Actualizando...");

        const { error } = await conexionSupabase.auth.updateUser({ password: pass1 });
        if (error) {
            alert("Error al actualizar la contraseña: " + error.message);
            animarBoton(btn, "Error", "Procesar Cambio Seguro");
        } else {
            alert("Contraseña actualizada con éxito.");
            document.getElementById('modalCambioPassword').classList.remove('activo');
            animarBoton(btn, "Actualizar", "Procesar Cambio Seguro");
        }
    });

    // 4. DATOS FISCALES
    registrarEventoDelegado('submit', '#formDatosFiscales', async (e, target) => {
        e.preventDefault();
        if (!organizacionIdActual) return alert("Error: No hay organización vinculada.");
        
        const btn = target.querySelector('button[type="submit"]');
        animarBoton(btn, "Guardando...");

        const nombreLegal = document.getElementById('adjNombreLegal');
        const rfcFiscal = document.getElementById('adjRfcFiscal');

        const { error } = await conexionSupabase.from('organizaciones').update({
            nombre_legal: nombreLegal.value.trim(),
            rfc_fiscal: rfcFiscal.value.trim()
        }).eq('id', organizacionIdActual);

        if (error) {
            alert("Error al guardar fiscales.");
            animarBoton(btn, "Error", "Actualizar Cédula");
        } else {
            animarBoton(btn, "✓ Guardado", "Actualizar Cédula");
        }
    });

    // 5. IDENTIDAD INSTITUCIONAL
    registrarEventoDelegado('click', '#btnActualizarIdentidad', async (e, target) => {
        const nombreLegalInput = document.getElementById('nombreClinica');
        const direccionInput = document.getElementById('direccionClinica');
        if (!nombreLegalInput || !direccionInput) return alert("Componentes HTML no encontrados.");

        const nombreLegal = nombreLegalInput.value.trim();
        const dirFisica = direccionInput.value.trim();
        if (!organizacionIdActual || !sucursalIdActual) return alert("No tienes clínica vinculada en la base de datos.");

        animarBoton(target, "Actualizando...", "Actualizar Clínica");

        try {
            const { error: errOrg } = await conexionSupabase.from('organizaciones').update({ nombre_legal: nombreLegal }).eq('id', organizacionIdActual);
            if (errOrg) throw errOrg;

            const { error: errSuc } = await conexionSupabase.from('sucursales').update({ direccion: dirFisica }).eq('id', sucursalIdActual);
            if (errSuc) throw errSuc;

            animarBoton(target, "✓ Actualizado", "Actualizar Clínica");
        } catch (err) {
            console.error("[ERROR-CONFIG] Identidad:", err);
            animarBoton(target, "Error", "Actualizar Clínica");
            alert("Error al actualizar identidad.");
        }
    });

    // 6. SUBIDA DE IMAGENES (CON DESTRUCTOR DE CACHÉ)
    registrarEventoDelegado('click', '#btnCambiarFoto', (e) => {
        e.stopPropagation(); document.getElementById('inputFotoPerfil')?.click();
    });
    registrarEventoDelegado('click', '#btnDispararLogo', (e) => {
        e.stopPropagation(); document.getElementById('inputLogo')?.click();
    });
    registrarEventoDelegado('click', '#btnDispararFirma', (e) => {
        e.stopPropagation(); document.getElementById('inputFirmaMedico')?.click();
    });

    registrarEventoDelegado('change', 'input[type="file"]', async (e, target) => {
        const file = target.files[0];
        if (!file) return;

        let entidad = "", subFolder = "", tablaBD = "", idFilaActual = "";

        if (target.id === 'inputFotoPerfil') {
            entidad = 'personal'; subFolder = 'avatar'; tablaBD = 'perfiles'; idFilaActual = uidUsuarioActual;
        } else if (target.id === 'inputLogo') {
            entidad = 'branding'; subFolder = ''; tablaBD = 'organizaciones'; idFilaActual = organizacionIdActual;
        } else if (target.id === 'inputFirmaMedico') {
            entidad = 'personal'; subFolder = 'firmas'; tablaBD = 'perfiles'; idFilaActual = uidUsuarioActual;
        } else return;

        if (!idFilaActual) return alert(`Error interno: ID vacío para ${tablaBD}.`);

        try {
            const orgIdParaStorage = organizacionIdActual || idFilaActual;
            const res = await StorageService.uploadToProtectPet(conexionSupabase, {
                file, orgId: orgIdParaStorage, entity: entidad, entityId: idFilaActual, subFolder
            });

            if (res && res.fullUrl) {
                const columna = subFolder === 'avatar' ? 'avatar_url' : (subFolder === 'firmas' ? 'logo_url' : 'logo_url'); // Corrección temporal de la validación
                const dbCol = subFolder === 'avatar' ? 'avatar_url' : (subFolder === 'firmas' ? 'firma_url' : 'logo_url');
                const { error } = await conexionSupabase.from(tablaBD).update({ [dbCol]: res.fullUrl }).eq('id', idFilaActual);

                if (error) return alert("Imagen subida, pero no guardada en perfil.");

                // Uso del cache buster seguro
                const urlFresca = agregarCacheBuster(res.fullUrl);
                if (target.id === 'inputFotoPerfil') renderizarImagenBackground('fotoPerfilCont', 'placeholderFoto', urlFresca);
                if (target.id === 'inputLogo') renderizarImagen('imgLogoPreview', 'textoLogo', urlFresca);
                if (target.id === 'inputFirmaMedico') renderizarImagen('imgFirmaPreview', 'placeholderFirma', urlFresca);

                alert("Archivo actualizado con éxito.");
            } else {
                alert(`Error en Storage: ${res ? res.error : 'Desconocido'}`);
            }
        } catch (err) {
            console.error("[ERROR CRITICO-CONFIG] Excepción en subida:", err);
            alert("Ocurrió un error inesperado al subir.");
        }
    });

    registrarEventoDelegado('click', '#btnBorrarFirma', async () => {
        const { error } = await conexionSupabase.from('perfiles').update({ firma_url: null }).eq('id', uidUsuarioActual);
        if (!error) {
            const imgFirma = document.getElementById('imgFirmaPreview');
            const placeholderFirma = document.getElementById('placeholderFirma');
            if (imgFirma) imgFirma.style.display = 'none';
            if (placeholderFirma) placeholderFirma.style.display = 'flex';
        } else {
            alert("Error al borrar la firma.");
        }
    });

    // 7. HORARIOS
    registrarEventoDelegado('click', '#btnGuardarHorarios', async (e, target) => {
        if (!sucursalIdActual) return alert("No hay sucursal asociada");
        animarBoton(target, "Guardando...", "Guardar Horario");
        
        const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
        let horariosObj = {};

        dias.forEach(dia => {
            const chk = document.getElementById(`chk${dia}`);
            const ini = document.getElementById(`ini-${dia}`);
            const fin = document.getElementById(`fin-${dia}`);
            if (chk && ini && fin) {
                horariosObj[dia.toLowerCase()] = { abierto: chk.checked, inicio: ini.value, fin: fin.value };
            }
        });

        const { error } = await conexionSupabase.from('sucursales').update({ horarios: horariosObj }).eq('id', sucursalIdActual);
        if (error) {
            alert("Error al guardar horarios.");
            animarBoton(target, "Error", "Guardar Horario");
        } else {
            animarBoton(target, "✓ Guardado", "Guardar Horario");
        }
    });

    // ==========================================
    // 8. LÓGICA CRUD DE SERVICIOS
    // ==========================================
    registrarEventoDelegado('submit', '#formCatalogoServicios', async (e, target) => {
        e.preventDefault();
        const nombre = document.getElementById('inNombreServicio').value.trim();
        const precio = parseFloat(document.getElementById('inPrecioServicio').value);
        const cat = document.getElementById('inCatServicio').value;
        const btn = document.getElementById('btnGuardarServicio');
        
        animarBoton(btn, "Guardando...");

        if (idServicioEnEdicion) {
            // UPDATE
            const { error } = await conexionSupabase.from('catalogo_servicios')
                .update({ nombre_servicio: nombre, precio: precio, categoria: cat })
                .eq('id', idServicioEnEdicion);
            if (!error) {
                idServicioEnEdicion = null;
                btn.innerHTML = "+ Agregar Servicio";
                document.getElementById('btnCancelarEdicionServicio').style.display = 'none';
                document.getElementById('tituloFormServicio').innerText = "Agregar al Catálogo";
            }
        } else {
            // INSERT
            await conexionSupabase.from('catalogo_servicios')
                .insert([{ organizacion_id: organizacionIdActual, nombre_servicio: nombre, precio: precio, categoria: cat }]);
        }

        document.getElementById('formCatalogoServicios').reset();
        await cargarCatalogoServicios();
    });

    registrarEventoDelegado('click', '.btn-eliminar-servicio', async (e, target) => {
        const confirmar = await confirmacionCustom('Eliminar Servicio', '¿Seguro que deseas eliminar este servicio del catálogo?');
        if (!confirmar) return;
        const id = target.closest('button').getAttribute('data-id');
        await conexionSupabase.from('catalogo_servicios').delete().eq('id', id);
        await cargarCatalogoServicios();
    });

    registrarEventoDelegado('click', '.btn-editar-servicio', (e, target) => {
        const btn = target.closest('button');
        idServicioEnEdicion = btn.getAttribute('data-id');
        document.getElementById('inNombreServicio').value = btn.getAttribute('data-nombre');
        document.getElementById('inPrecioServicio').value = btn.getAttribute('data-precio');
        document.getElementById('inCatServicio').value = btn.getAttribute('data-cat');
        
        document.getElementById('btnGuardarServicio').innerHTML = "Guardar Cambios";
        document.getElementById('btnCancelarEdicionServicio').style.display = 'block';
        document.getElementById('tituloFormServicio').innerText = "Editar Servicio";
    });

    registrarEventoDelegado('click', '#btnCancelarEdicionServicio', () => {
        idServicioEnEdicion = null;
        document.getElementById('formCatalogoServicios').reset();
        document.getElementById('btnGuardarServicio').innerHTML = "+ Agregar Servicio";
        document.getElementById('btnCancelarEdicionServicio').style.display = 'none';
        document.getElementById('tituloFormServicio').innerText = "Agregar al Catálogo";
    });

    // 7. GUARDADO DE HORARIOS VIA EVENT DELEGATION
    registrarEventoDelegado('click', '#btnGuardarHorarios', async (e, target) => {
        e.preventDefault();
        const btnSubmit = target;
        
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = "Guardando...";
        btnSubmit.disabled = true;

        console.log("[1] Event Delegation interceptó clic de Guardar Horario...");
        
        try {
            const { perfil } = await obtenerSesionActiva();
            if (!perfil) throw new Error("No hay perfil activo en caché.");

            const diasHTML = document.querySelectorAll('.fila-dia-horario'); 
            if (diasHTML.length === 0) console.warn("[ADVERTENCIA] No se encontraron las filas de los días en el DOM.");

            const payloadHorario = [];

            diasHTML.forEach(fila => {
                const nombreDia = fila.querySelector('.dia-nombre').textContent.trim();
                const checkboxApertura = fila.querySelector('input[type="checkbox"]');
                const inputsHora = fila.querySelectorAll('input[type="time"]');
                
                const estaAbierto = checkboxApertura ? checkboxApertura.checked : false;
                const apertura = inputsHora[0] ? inputsHora[0].value : null;
                const cierre = inputsHora[1] ? inputsHora[1].value : null;

                payloadHorario.push({
                    dia: nombreDia,
                    abierto: estaAbierto,
                    apertura: apertura,
                    cierre: cierre
                });
            });

            console.log("[2] Payload construido para enviar:", payloadHorario);

            if (payloadHorario.length === 0) throw new Error("El payload está vacío, abortando guardado.");

            console.log(`[3] Ejecutando update en Supabase para el perfil ID: ${perfil.id}`);
            const { data, error } = await conexionSupabase
                .from('perfiles')
                .update({ horario_atencion: payloadHorario })
                .eq('id', perfil.id)
                .select(); // Forzamos el select para ver la respuesta

            if (error) {
                console.error("[ERROR SUPABASE]:", error);
                throw error;
            }
            
            console.log("[4] Respuesta exitosa de Supabase:", data);

            // Actualizar el estado global y la UI
            if (typeof actualizarDatosPerfil === 'function') {
                actualizarDatosPerfil({ horario_atencion: payloadHorario });
            }
            if (typeof window.actualizarWidgetHorarioGlobal === 'function') {
                window.actualizarWidgetHorarioGlobal();
            }

            console.log("[5] ¡Proceso terminado! Disparando alerta de éxito.");
            alertaCustom("Horario Actualizado", "Tus horarios de atención se han guardado correctamente.", "success");

        } catch (error) {
            console.error("[ERROR CRÍTICO EN GUARDADO]:", error);
            alertaCustom("Error al Guardar", "Hubo un problema al guardar los horarios. Revisa tu conexión.", "error");
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
};

// ==========================================
// FUNCIONES AUXILIARES (UI, API Y STORAGE)
// ==========================================
const escaparHTML = (cadena) => {
    if (!cadena) return "";
    return String(cadena).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

// Renderizado del Catálogo con botones de Edición y Eliminación
const cargarCatalogoServicios = async () => {
    if (!organizacionIdActual) return;

    const { data, error } = await conexionSupabase
        .from('catalogo_servicios')
        .select('*')
        .eq('organizacion_id', organizacionIdActual)
        .eq('activo', true)
        .order('nombre_servicio', { ascending: true });

    const contenedor = document.getElementById('listaServiciosConfig');
    if (!contenedor) return;

    if (error || !data || data.length === 0) {
        contenedor.innerHTML = `<p style="font-size: 0.8rem; color: var(--texto-secundario); text-align: center;">El catálogo está vacío o hubo un error.</p>`;
        return;
    }

    contenedor.innerHTML = data.map(serv => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--fondo-tarjeta); padding: 12px; border-radius: 8px; border: 1px solid var(--borde-suave); margin-bottom: 8px;">
            <div>
                <strong style="color: var(--texto-oscuro);">${escaparHTML(serv.nombre_servicio)}</strong><br>
                <span style="font-size:0.75rem; color:var(--texto-secundario);">${escaparHTML(serv.categoria)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="color: var(--naranja); font-weight: bold; font-size: 1.1rem;">$${parseFloat(serv.precio).toFixed(2)}</div>
                <div class="acciones-servicio">
                    <button type="button" class="btn-icono-accion editar btn-editar-servicio" data-id="${serv.id}" data-nombre="${escaparHTML(serv.nombre_servicio)}" data-precio="${serv.precio}" data-cat="${serv.categoria}"><span class="material-symbols-rounded" style="font-size: 1.1rem;">edit</span></button>
                    <button type="button" class="btn-icono-accion eliminar btn-eliminar-servicio" data-id="${serv.id}"><span class="material-symbols-rounded" style="font-size: 1.1rem;">delete</span></button>
                </div>
            </div>
        </div>
    `).join('');
};

const renderizarHorariosUI = (horariosObj) => {
    const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    dias.forEach(dia => {
        const info = horariosObj[dia.toLowerCase()];
        if (info) {
            const chk = document.getElementById(`chk${dia}`);
            const lbl = document.getElementById(`estado${dia}`);
            const ini = document.getElementById(`ini-${dia}`);
            const fin = document.getElementById(`fin-${dia}`);

            if (chk) chk.checked = info.abierto;
            if (ini) { ini.value = info.inicio; ini.disabled = !info.abierto; }
            if (fin) { fin.value = info.fin; fin.disabled = !info.abierto; }
            if (lbl) {
                lbl.innerText = info.abierto ? "Abierto" : "Cerrado";
                lbl.style.color = info.abierto ? "var(--cobalto)" : "#E74C3C";
            }
        }
    });
};

const renderizarImagen = (imgId, placeholderId, url) => {
    const img = document.getElementById(imgId);
    const place = document.getElementById(placeholderId);
    if (img) { img.src = url; img.style.display = 'block'; }
    if (place) place.style.display = 'none';
};

const renderizarImagenBackground = (contId, placeholderId, url) => {
    const cont = document.getElementById(contId);
    const place = document.getElementById(placeholderId);
    if (cont) {
        cont.style.backgroundImage = `url('${url}')`;
        cont.style.backgroundColor = "transparent";
        cont.style.backgroundSize = "cover";
        cont.style.backgroundPosition = "center";
    }
    if (place) place.style.display = 'none';
};

const animarBoton = (btn, textoTemporal, textoOriginal = null) => {
    if (!btn) return;
    const txtBase = textoOriginal || btn.innerHTML;
    btn.innerHTML = textoTemporal;
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = txtBase; btn.disabled = false; }, 2000);
};