/**
 * SISTEMA: PET PROTECT - Módulo de Checkout y Caja (Lógica)
 * ARQUITECTURA: SPA (Vite) / Supabase Exclusivo / Patrón Singleton
 * UBICACIÓN: /src/js/vistas/modulos/modulo_checkout_logica.js
 */

import { conexionSupabase } from '../../infraestructura/conexion.js';
import { obtenerSesionActiva } from '../../infraestructura/sesion_store.js';
import { alertaCustom, confirmacionCustom, promptCustom } from '../../utilidades/ui_alertas.js';
import { obtenerPlantillaTicket } from './ticket_template.js';
import { setHayDatosSinGuardar } from '../principal_v2.js';
import '../../../css/modulo_checkout.css';

const moduloCheckout = {
    estado: {
        pasoActual: 1,
        metodoPago: 'efectivo',
        entregables: { whatsapp: false, impresion: true }, // La impresión física viene activa por defecto
        cargos: [], // Aquí se acumula la cuenta
        paciente: { nombre: 'Sin Identificar', tutor: 'Público General' },
        productosTienda: [],
        organizacionId: null,
        sucursalId: null,
        isProcesandoPago: false
    },

    // ==========================================================================
    // 1. INICIALIZACIÓN Y LECTURA DE SESIÓN
    // ==========================================================================
    inicializar: async function() {
        console.info("💳 [CHECKOUT] Inicializando terminal de pagos...");
        setHayDatosSinGuardar(true);
        
        // ✅ OPTIMIZACIÓN: Singleton — cero peticiones de red adicionales
        const sesion = await obtenerSesionActiva();
        if (!sesion) {
            console.error("No hay usuario autenticado.");
            return;
        }

        this.estado.organizacionId = sesion.perfil.organizacion_id;
        this.estado.sucursalId = sesion.perfil.sucursal_id;

        // B) Importar los datos que dejó el Módulo de Consulta en el Session Storage
        try {
            const rawPac = sessionStorage.getItem('pacienteCheckout');
            if (rawPac && rawPac !== 'undefined') {
                const datosPac = JSON.parse(rawPac);
                if (datosPac) this.estado.paciente = datosPac;
            }
            
            const rawCargos = sessionStorage.getItem('cargosConsultaPendiente');
            if (rawCargos && rawCargos !== 'undefined') {
                const cargosSess = JSON.parse(rawCargos);
                if (cargosSess && cargosSess.length > 0) {
                    this.estado.cargos = cargosSess;
                }
            }
        } catch (e) {
            console.warn("⚠️ [CHECKOUT] No se pudieron recuperar datos de sesión clínica anterior (posible test directo).", e);
        }

        // C) Renderizar UI Base (Ticket lateral y variables de texto)
        document.getElementById('sidebar-paciente').innerText = this.estado.paciente.nombre;
        const fechaTxt = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        
        document.getElementById('sidebar-fecha').innerText = fechaTxt;
        document.getElementById('print-fecha').innerText = fechaTxt;
        document.getElementById('print-paciente').innerText = this.estado.paciente.nombre;
        document.getElementById('print-tutor').innerText = this.estado.paciente.tutor;

        if (this.estado.organizacionId) {
            const { data: org, error: orgError } = await conexionSupabase
                .from('organizaciones')
                .select('nombre_legal, rfc_fiscal')
                .eq('id', this.estado.organizacionId)
                .single();
            if (!orgError && org) {
                const nombreNode = document.getElementById('print-clinica-nombre');
                const rfcNode = document.getElementById('print-clinica-rfc');
                if (nombreNode) nombreNode.innerText = org.nombre_legal || 'PET PROTECT';
                if (rfcNode) rfcNode.innerText = org.rfc_fiscal || 'GENERAL';
            }
        }

        this.actualizarSidebar();
        
        // D) Conectar a Base de Datos para armar los Acordeones de Servicios y Productos
        await this.cargarCatalogosSupabase();
        
        // Empezar directamente en el paso 2 (Servicios), saltando Entregables
        this.avanzarPaso(2);
    },

    // ==========================================================================
    // 2. CONEXIÓN A SUPABASE Y RENDERIZADO DE ACORDEONES (CATEGORÍAS)
    // ==========================================================================
    cargarCatalogosSupabase: async function() {
        if (!this.estado.organizacionId) {
            console.error("❌ [CHECKOUT] No hay organizacionId para cargar catalogos.");
            return;
        }

        try {
            // 1. Traer Servicios (Consultas, Cirugías, Estética, etc.)
            const { data: servicios, error: errSrv } = await conexionSupabase
                .from('catalogo_servicios')
                .select('*')
                .eq('organizacion_id', this.estado.organizacionId)
                .eq('activo', true)
                .order('categoria', { ascending: true });

            if (errSrv) console.error("❌ [CHECKOUT] Error cargando servicios:", errSrv);

            // 1.1 Alerta Proactiva de Catálogo Vacío
            if (!servicios || servicios.length === 0) {
                const irAConfigurar = await confirmacionCustom(
                    'Catálogo Vacío', 
                    'No tienes precios de consulta configurados. ¿Deseas abrir la configuración en una nueva pestaña para agregarlos sin perder esta venta?'
                );
                if (irAConfigurar) {
                    window.open(window.location.origin + window.location.pathname + '#VETERINARIO_CONFIGURACION', '_blank');
                }
            }

            // 2. Traer Productos (Tienda, Dietas)
            const { data: productos, error: errProd } = await conexionSupabase
                .from('inventario_productos')
                .select('*')
                .eq('organizacion_id', this.estado.organizacionId)
                .in('categoria', ['tienda', 'dietas']) // Filtramos solo mostrador y dietas
                .order('categoria', { ascending: true });

            if (errProd) console.error("❌ [CHECKOUT] Error cargando productos:", errProd);

            this.estado.productosTienda = productos || [];

            console.log(`✅ [CHECKOUT] Servicios: ${servicios?.length || 0} | Productos: ${productos?.length || 0}`);

            // Renderizar los datos en el HTML
            this.renderizarAcordeonesServicios(servicios || []);
            this.renderizarAcordeonesProductos(productos || []);

        } catch (error) {
            console.error("Error al descargar catálogos de Supabase:", error);
        }
    },

    renderizarAcordeonesServicios: function(servicios) {
        const contenedor = document.getElementById('contenedor-acordeones-servicios');
        if (!contenedor) return;

        if (servicios.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; padding:20px; color:var(--checkout-texto);">No hay servicios registrados en la configuración.</p>';
            return;
        }

        // Agrupación de servicios utilizando la columna 'categoria' de la BD
        const grupos = servicios.reduce((acc, srv) => {
            const cat = srv.categoria || 'Otros Servicios';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(srv);
            return acc;
        }, {});

        let html = '';
        Object.keys(grupos).forEach((cat, index) => {
            const catId = `srv-cat-${index}`;
            
            // Generar las filas interiores
            const itemsHtml = grupos[cat].map(item => {
                const aplicaIva = item.aplica_iva !== false;
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; border-bottom:1px solid var(--checkout-border);">
                    <div>
                        <span style="font-size:14px; font-weight:bold; display:block; color:var(--checkout-cobalto);">${item.nombre_servicio}</span>
                        ${!aplicaIva ? '<span style="font-size:10px; color:#ef4444; font-weight:bold;">Sin IVA</span>' : ''}
                    </div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <span style="color:var(--checkout-texto); font-weight:bold;">$${parseFloat(item.precio).toFixed(2)}</span>
                        <button onclick="window.moduloCheckout.agregarCargo('${item.id}', '${item.nombre_servicio.replace(/'/g, "\\'")}', ${item.precio}, 'servicio', null, ${aplicaIva})" style="background:var(--checkout-naranja); color:white; border:none; border-radius:8px; width:30px; height:30px; cursor:pointer; font-weight:bold; font-size:16px;">+</button>
                    </div>
                </div>
            `}).join('');

            // Estructura del acordeón
            html += `
            <div class="acordeon-card" style="margin-bottom: 12px; border: 1px solid var(--checkout-border); border-radius: 12px; background: white; overflow:hidden;">
                <div class="acordeon-header" onclick="window.moduloCheckout.toggleAcordeon('${catId}')" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:#f8fafc; cursor:pointer; border-bottom: 1px solid transparent; transition: background 0.3s;">
                    <span style="font-weight:bold; color:var(--checkout-cobalto); font-size:13px; text-transform:uppercase;">${cat}</span>
                    <span class="material-symbols-rounded acordeon-icono-flecha" id="icon-${catId}" style="transition: transform 0.3s; color:var(--checkout-cobalto);">expand_more</span>
                </div>
                <div class="acordeon-contenido" id="content-${catId}" style="display:none;">
                    ${itemsHtml}
                </div>
            </div>`;
        });

        contenedor.innerHTML = html;
    },

    renderizarAcordeonesProductos: function(productos) {
        const contenedor = document.getElementById('contenedor-acordeones-productos');
        if (!contenedor) return;

        if (productos.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; padding:20px; color:var(--checkout-texto);">Inventario vacío.</p>';
            return;
        }

        contenedor.innerHTML = ''; // Limpieza obligatoria del contenedor

        // Agrupación usando la columna 'categoria' ('tienda', 'dietas')
        const grupos = productos.reduce((acc, prod) => {
            const cat = prod.categoria ? prod.categoria.charAt(0).toUpperCase() + prod.categoria.slice(1) : 'Tienda';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(prod);
            return acc;
        }, {});

        let html = '';
        Object.keys(grupos).forEach((cat, index) => {
            const catId = `prod-cat-${index}`;
            
            const itemsHtml = grupos[cat].map(producto => {
                const stockVal = producto.stock_total;
                const btnDisabled = stockVal <= 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : '';
                const aplicaIva = producto.metadata?.aplica_iva !== false;

                return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; border-bottom:1px solid var(--checkout-border);">
                    <div>
                        <span style="font-size:14px; font-weight:bold; display:block; color:var(--checkout-cobalto);">${producto.nombre_comercial}</span>
                        <span id="stock-text-${producto.id}" style="font-size:11px; color:${stockVal <= 0 ? '#ef4444' : 'var(--checkout-texto)'}; font-weight:${stockVal <= 0 ? 'bold' : 'normal'};">Stock disponible: ${stockVal} ${producto.unidad_medida}</span>
                    </div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <span style="color:var(--checkout-texto); font-weight:bold;">$${parseFloat(producto.precio_venta || 0).toFixed(2)}</span>
                        <button id="btn-add-${producto.id}" ${btnDisabled} onclick="window.moduloCheckout.agregarCargo('${producto.id}', '${producto.nombre_comercial.replace(/'/g, "\\'")}', ${producto.precio_venta || 0}, 'producto', ${producto.stock_total}, ${aplicaIva})" style="background:var(--checkout-naranja); color:white; border:none; border-radius:8px; width:30px; height:30px; cursor:pointer; font-weight:bold; font-size:16px;">+</button>
                    </div>
                </div>
                `;
            }).join('');

            // Estructura del acordeón
            html += `
            <div class="acordeon-card" style="margin-bottom: 12px; border: 1px solid var(--checkout-border); border-radius: 12px; background: white; overflow:hidden;">
                <div class="acordeon-header" onclick="window.moduloCheckout.toggleAcordeon('${catId}')" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:#f8fafc; cursor:pointer; border-bottom: 1px solid transparent; transition: background 0.3s;">
                    <span style="font-weight:bold; color:var(--checkout-cobalto); font-size:13px; text-transform:uppercase;">${cat}</span>
                    <span class="material-symbols-rounded acordeon-icono-flecha" id="icon-${catId}" style="transition: transform 0.3s; color:var(--checkout-cobalto);">expand_more</span>
                </div>
                <div class="acordeon-contenido" id="content-${catId}" style="display:none;">
                    ${itemsHtml}
                </div>
            </div>`;
        });

        contenedor.innerHTML = html;
    },

    // Lógica dinámica para la flecha y ocultar/mostrar acordeones
    toggleAcordeon: function(id) {
        const contenido = document.getElementById(`content-${id}`);
        const icono = document.getElementById(`icon-${id}`);
        const header = contenido.previousElementSibling;

        if (contenido.style.display === 'block') {
            contenido.style.display = 'none';
            header.style.borderBottomColor = 'transparent';
            icono.style.transform = 'rotate(0deg)';
        } else {
            contenido.style.display = 'block';
            header.style.borderBottomColor = 'var(--checkout-border)';
            icono.style.transform = 'rotate(180deg)';
        }
    },

    // ==========================================================================
    // 3. CARRITO DE COMPRAS (TICKET LATERAL)
    // ==========================================================================
    agregarCargo: function(id, nombre, precio, tipo = 'servicio', stockMax = null, aplicaIva = true) {
        if (tipo === 'producto') {
            if (stockMax <= 0) {
                alertaCustom("Stock agotado para este producto.");
                return;
            }
            const cantidadEnCarrito = this.estado.cargos.filter(c => c.id === id).length;
            if (cantidadEnCarrito >= stockMax) {
                alertaCustom("No puedes agregar más unidades de las que hay en stock.");
                return;
            }
        }
        
        this.estado.cargos.push({ id, nombre, precio: parseFloat(precio), tipo, aplicaIva });
        this.actualizarSidebar();
        this.calcularCambio();
    },

    quitarCargo: function(index) {
        this.estado.cargos.splice(index, 1);
        this.actualizarSidebar();
        this.calcularCambio();
    },

    actualizarSidebar: function() {
        const list = document.getElementById('sidebar-lista-cargos');
        const printList = document.getElementById('print-items');
        
        document.getElementById('sidebar-items-count').innerText = `${this.estado.cargos.length}`;
        
        // --- INYECCIÓN REACTIVIDAD VISUAL STOCK ---
        if (this.estado.productosTienda) {
            this.estado.productosTienda.forEach(producto => {
                const spanStock = document.getElementById(`stock-text-${producto.id}`);
                const btnAdd = document.getElementById(`btn-add-${producto.id}`);
                if (spanStock && btnAdd) {
                    const cantidadEnCarrito = this.estado.cargos.filter(c => c.id === producto.id).length;
                    const stockVal = producto.stock_total - cantidadEnCarrito;
                    spanStock.innerText = `Stock disponible: ${stockVal} ${producto.unidad_medida}`;
                    
                    if (stockVal <= 0) {
                        spanStock.style.color = '#ef4444';
                        spanStock.style.fontWeight = 'bold';
                        btnAdd.disabled = true;
                        btnAdd.style.opacity = '0.4';
                        btnAdd.style.cursor = 'not-allowed';
                    } else {
                        spanStock.style.color = 'var(--checkout-texto)';
                        spanStock.style.fontWeight = 'normal';
                        btnAdd.disabled = false;
                        btnAdd.style.opacity = '1';
                        btnAdd.style.cursor = 'pointer';
                    }
                }
            });
        }
        // ------------------------------------------

        let htmlList = ''; 
        let printHtml = '';

        this.estado.cargos.forEach((c, index) => {
            htmlList += `
            <div style="display:flex; justify-content:space-between; margin-bottom: 12px; font-size:13px;">
                <div style="flex:1; padding-right:8px;">
                    <div style="font-weight:bold; color:var(--checkout-cobalto);">${c.nombre}</div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="font-weight:bold; color:var(--checkout-texto);">$${c.precio.toFixed(2)}</span>
                    <button onclick="window.moduloCheckout.quitarCargo(${index})" style="color:var(--checkout-rojo); background:none; border:none; font-size:18px; cursor:pointer;" title="Eliminar cargo">×</button>
                </div>
            </div>`;
            printHtml += `1 x ${c.nombre.substring(0, 18)}... $${c.precio.toFixed(2)}<br>`;
        });

        list.innerHTML = htmlList;
        printList.innerHTML = printHtml;

        const t = this.obtenerTotales();
        
        // UI Sidebar
        document.getElementById('sidebar-sub').innerText = `$${t.subtotal.toFixed(2)}`;
        document.getElementById('sidebar-iva').innerText = `$${t.iva.toFixed(2)}`;
        document.getElementById('sidebar-total').innerText = `$${t.total.toFixed(2)}`;
        
        // UI Ticket Impresión
        document.getElementById('print-sub').innerText = `$${t.subtotal.toFixed(2)}`;
        document.getElementById('print-iva').innerText = `$${t.iva.toFixed(2)}`;
        document.getElementById('print-total').innerText = `$${t.total.toFixed(2)}`;
    },

    obtenerTotales: function() {
        let subtotalReal = 0;
        let ivaReal = 0;
        let totalGeneral = 0;

        this.estado.cargos.forEach(cargo => {
            const precioBaseItem = cargo.precio; // Asumimos que el precio traido es el Base
            subtotalReal += precioBaseItem;

            if (cargo.aplicaIva !== false) {
                // IVA Aditivo
                const ivaDelItem = precioBaseItem * 0.16;
                ivaReal += ivaDelItem;
                totalGeneral += (precioBaseItem + ivaDelItem);
            } else {
                totalGeneral += precioBaseItem;
            }
        });

        return { subtotal: subtotalReal, iva: ivaReal, total: totalGeneral };
    },

    // ==========================================================================
    // 4. FLUJO DE PAGO Y NAVEGACIÓN (STEPPER)
    // ==========================================================================
    avanzarPaso: function(paso) {
        if (paso === 4 && this.estado.cargos.length === 0) { 
            alertaCustom("La cuenta no puede estar en ceros para cobrar."); 
            return; 
        }
        
        this.estado.pasoActual = paso;
        
        for (let i = 1; i <= 5; i++) {
            // Ocultar/Mostrar vistas
            const el = document.getElementById(`view-step-${i}`);
            if(el) { el.classList.toggle('active', i === paso); }
            
            // Actualizar bolitas superiores
            const nav = document.getElementById(`step-nav-${i}`);
            const line = document.getElementById(`line-nav-${i}`);
            
            if(nav) {
                nav.classList.remove('active', 'completed');
                if (i < paso) nav.classList.add('completed');
                if (i === paso) nav.classList.add('active');
            }
            if(line) {
                line.classList.remove('completed');
                if (i < paso) line.classList.add('completed');
            }
        }
    },

    toggleEntregable: function(tipo) {
        this.estado.entregables[tipo] = !this.estado.entregables[tipo];
        const card = document.getElementById(`card-${tipo}`);
        
        if (this.estado.entregables[tipo]) {
            card.style.borderColor = tipo === 'whatsapp' ? '#25D366' : 'var(--checkout-cobalto)';
            card.style.background = tipo === 'whatsapp' ? '#f0fdf4' : '#e0f2fe';
        } else {
            card.style.borderColor = 'var(--checkout-border)';
            card.style.background = 'white';
        }
    },

    setMetodoPago: function(metodo) {
        this.estado.metodoPago = metodo;
        document.querySelectorAll('.acordeon-card.metodo').forEach(el => {
            el.style.borderColor = 'var(--checkout-border)';
            el.style.background = 'white';
            el.querySelector('div').style.color = 'var(--checkout-texto)';
        });
        
        const activo = document.getElementById(`metodo-${metodo}`);
        activo.style.borderColor = 'var(--checkout-naranja)';
        activo.style.background = 'var(--checkout-naranja-claro)';
        activo.querySelector('div').style.color = 'var(--checkout-naranja)';
        
        document.getElementById('panel-efectivo').style.display = metodo === 'efectivo' ? 'block' : 'none';
    },

    calcularCambio: function() {
        const totals = this.obtenerTotales();
        const recibido = parseFloat(document.getElementById('input-monto-recibido').value) || 0;
        const display = document.getElementById('display-cambio');
        
        const cambio = recibido - totals.total;
        
        if (cambio < 0 && recibido > 0) {
            display.innerText = "Insuficiente";
            display.style.color = "var(--checkout-rojo)";
        } else {
            display.innerText = `$${cambio > 0 ? cambio.toFixed(2) : '0.00'}`;
            display.style.color = "var(--checkout-cobalto)";
        }
    },

    procesarPago: async function(event) {
        if (this.estado.isProcesandoPago) return;
        
        if (this.estado.cargos.length === 0) { 
            alertaCustom("La cuenta está en ceros."); 
            return; 
        }

        this.estado.isProcesandoPago = true;

        const sesion = await obtenerSesionActiva();
        const usuarioId = sesion?.user?.id || sesion?.perfil?.id;

        if (this.estado.metodoPago === 'efectivo') {
            const totals = this.obtenerTotales();
            const recibido = parseFloat(document.getElementById('input-monto-recibido').value) || 0;
            if (recibido < totals.total) {
                alertaCustom("El monto recibido en efectivo es insuficiente para liquidar la cuenta.");
                this.estado.isProcesandoPago = false;
                return;
            }
        }

        // --- LÓGICA DE INVENTARIO: DESCONTAR PRODUCTOS ---
        try {
            if (event && event.currentTarget) {
                event.currentTarget.disabled = true;
                event.currentTarget.innerHTML = "Procesando... <span class='material-symbols-rounded' style='animation: spin 2s linear infinite;'>sync</span>";
            }

            const productosRaw = this.estado.cargos.filter(c => c.tipo === 'producto' && c.id && c.id.length > 10);
            const productosAgrupados = {};
            productosRaw.forEach(p => {
                if (!productosAgrupados[p.id]) {
                    productosAgrupados[p.id] = { ...p, cantidad: 0 };
                }
                productosAgrupados[p.id].cantidad += (p.cantidad || 1);
            });
            const productosDeduct = Object.values(productosAgrupados);
            
            for (let prod of productosDeduct) {
                const { data: item } = await conexionSupabase
                    .from('inventario_productos')
                    .select('stock_total, stock_minimo, nombre_comercial')
                    .eq('id', prod.id)
                    .single();
                    
                if (item) {
                    const cantidadDeducir = prod.cantidad;
                    const nuevoStock = Math.max(0, parseFloat(item.stock_total) - cantidadDeducir);
                    
                    // 1. Actualizar stock
                    const { error: errUpdate } = await conexionSupabase
                        .from('inventario_productos')
                        .update({ stock_total: nuevoStock })
                        .eq('id', prod.id);
                        
                    if (errUpdate) {
                        console.error("❌ [CHECKOUT] Error al actualizar stock:", errUpdate);
                        throw new Error("No se pudo actualizar el stock del producto.");
                    }
                        
                    // 2. Registrar movimiento
                    const { error: errInsert } = await conexionSupabase
                        .from('inventario_movimientos')
                        .insert({
                            organizacion_id: this.estado.organizacionId,
                            sucursal_id: this.estado.sucursalId,
                            producto_id: prod.id,
                            tipo_movimiento: 'salida_venta',
                            cantidad: cantidadDeducir,
                            motivo_referencia: 'Venta en mostrador / Checkout',
                            created_by: usuarioId
                        });

                    if (errInsert) {
                        console.error("❌ [CHECKOUT] Error al registrar movimiento:", errInsert);
                        throw new Error("No se pudo registrar el movimiento de inventario.");
                    }
                }
            }

            // --- LÓGICA DE FINANZAS: REGISTRAR TRANSACCIÓN EN CAJA ---
            const totals = this.obtenerTotales();
            const subtotalDesc = totals.subtotal;
            const ivaDesc      = totals.total - totals.subtotal;

            const { data: transaccion, error: errTrans } = await conexionSupabase
                .from('caja_transacciones')
                .insert([{
                    organizacion_id: this.estado.organizacionId,
                    sucursal_id: this.estado.sucursalId,
                    cajero_id: usuarioId,
                    cliente_id: this.estado.paciente.cliente_id || null,
                    tipo: 'ingreso',
                    metodo_pago: this.estado.metodoPago,
                    subtotal: subtotalDesc,
                    descuento: 0,
                    impuestos: ivaDesc,
                    total: totals.total,
                    estatus: 'completada',
                    notas: this.estado.paciente.nombre && this.estado.paciente.nombre !== 'Sin Identificar' ? 'Cobro desde Checkout Médico | Paciente: ' + this.estado.paciente.nombre : 'Cobro desde Checkout Médico'
                }])
                .select('id')
                .single();

            if (errTrans) {
                console.error("❌ [CHECKOUT] Error al crear transacción:", JSON.stringify(errTrans, null, 2));
                throw new Error("No se pudo registrar la transacción de pago.");
            }

            // Insertar los items de la cuenta en caja_transacciones_items
            if (this.estado.cargos && this.estado.cargos.length > 0) {
                const itemsAgrupados = {};
                this.estado.cargos.forEach(item => {
                    const key = item.id + '_' + item.tipo;
                    if (!itemsAgrupados[key]) {
                        itemsAgrupados[key] = { ...item, cantidad: 0 };
                    }
                    itemsAgrupados[key].cantidad += (item.cantidad || 1);
                });

                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const itemsAInsertar = Object.values(itemsAgrupados).map(item => ({
                    transaccion_id: transaccion.id,
                    referencia_tipo: item.tipo === 'producto' ? 'producto' : 'servicio',
                    referencia_id: item.id && uuidRegex.test(item.id) ? item.id : null,
                    nombre_item: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                    subtotal: item.precio * item.cantidad,
                    tasa_iva: item.aplicaIva !== false ? 16.00 : 0.00
                }));

                const { error: errItems } = await conexionSupabase
                    .from('caja_transacciones_items')
                    .insert(itemsAInsertar);

                if (errItems) {
                    console.error("❌ [CHECKOUT] Error exacto al insertar:", JSON.stringify(errItems, null, 2));
                    throw new Error("No se guardaron los detalles del ticket.");
                }
            }

            document.getElementById('print-metodo').innerText = this.estado.metodoPago.toUpperCase();
            console.info("✅ Pago validado, stock descontado y transacción registrada. Pasando a confirmación...");
            this.estado.isProcesandoPago = false;
            this.avanzarPaso(5);

        } catch (error) {
            console.error("❌ Error al procesar pago e inventario:", error);
            alertaCustom("Hubo un error al descontar el inventario de Supabase. Revise la consola.");
            this.estado.isProcesandoPago = false;
            if (event && event.currentTarget) {
                event.currentTarget.disabled = false;
                event.currentTarget.innerHTML = `Registrar Cobro <span class="material-symbols-rounded">check_circle</span>`;
            }
        }
    },

    enviarWhatsApp: async function() { 
        const numero = await promptCustom(
            "Enviar Comprobante por WhatsApp", 
            "Ingrese el número de celular a 10 dígitos al que desea enviar el resumen del cobro:", 
            "", 
            "phone_iphone", 
            "#25D366"
        );
        if (!numero) return;
        
        const totales = this.obtenerTotales();
        let listaNombres = this.estado.cargos.map(c => `- ${c.nombre} ($${c.precio.toFixed(2)})`).join('%0A');
        
        const mensaje = `Hola! Gracias por tu visita. Aquí está el comprobante de *${this.estado.paciente.nombre}*:%0A%0A${listaNombres}%0A%0A*Total Pagado: $${totales.total.toFixed(2)}*`;
        const url = `https://api.whatsapp.com/send?phone=52${numero}&text=${mensaje}`;
        window.open(url, '_blank');
    },

    finalizarFlujo: async function() {
        try {
            // Obtener el perfil completo del usuario actual para la info de la clínica
            const sesion = await obtenerSesionActiva();
            const usuarioId = sesion?.user?.id || sesion?.perfil?.id;
            const { data: perfil } = await conexionSupabase
                .from('perfiles')
                .select('nombre_completo, organizaciones(nombre_legal, logo_url, rfc_fiscal), sucursales(nombre_sucursal, direccion, telefono_recepcion)')
                .eq('id', usuarioId)
                .single();
                
            const orgInfo = perfil?.organizaciones || {};
            const sucInfo = perfil?.sucursales || {};
            const totales = this.obtenerTotales();
            const ahora = new Date();
            const transaccionId = "CHK-" + Date.now();
            
            const ticketData = {
                clinica: {
                    nombreComercial: orgInfo.nombre_legal || "Clínica Veterinaria",
                    nombreLegal: orgInfo.nombre_legal || "Razón Social",
                    logoUrl: orgInfo.logo_url || null,
                    logoIniciales: orgInfo.nombre_legal ? orgInfo.nombre_legal.substring(0, 2).toUpperCase() : "CV",
                    direccion: sucInfo.direccion || "Dirección no registrada",
                    telefono: sucInfo.telefono_recepcion || "",
                    whatsapp: "", 
                    correo: "",
                    sitioWeb: "",
                    rfc: orgInfo.rfc_fiscal || ""
                },
                ticket: {
                    folio: transaccionId.substring(0,10).toUpperCase(),
                    fecha: ahora.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' }),
                    hora: ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }),
                    cajero: perfil?.nombre_completo || "Cajero",
                    caja: "Caja Checkout",
                    sucursal: sucInfo.nombre_sucursal || "Matriz"
                },
                cliente: { nombre: this.estado.paciente.tutor || 'Público General', telefono: "" },
                paciente: { nombre: this.estado.paciente.nombre || 'Sin Identificar', especie: this.estado.paciente.especie || "Mascota" },
                categorias: [
                    {
                        id: "servicios",
                        titulo: "Servicios Clínicos",
                        icono: "stethoscope",
                        items: this.estado.cargos.filter(c => c.tipo === 'servicio').map(item => ({
                            descripcion: item.nombre,
                            cantidad: item.cantidad || 1,
                            precioUnitario: item.precio,
                            tasaIVA: 0
                        }))
                    },
                    {
                        id: "productos",
                        titulo: "Productos (Mostrador / Dietas)",
                        icono: "shopping_bag",
                        items: this.estado.cargos.filter(c => c.tipo === 'producto').map(item => ({
                            descripcion: item.nombre,
                            cantidad: item.cantidad || 1,
                            precioUnitario: item.precio,
                            tasaIVA: 0
                        }))
                    }
                ],
                totales: {
                    subtotal: totales.subtotal,
                    iva: totales.iva,
                    total: totales.total,
                    metodoPago: this.estado.metodoPago === 'efectivo' ? "Efectivo" : 
                                this.estado.metodoPago === 'tarjeta' ? "Tarjeta (Débito/Crédito)" : "Transferencia"
                }
            };
            
            // Disparar evento nativo de impresión si se seleccionó en el paso 1
            if (this.estado.entregables.impresion) {
                const htmlTicket = obtenerPlantillaTicket(JSON.stringify(ticketData));
                const ventanaImpresion = window.open('', '_blank', 'width=400,height=600');
                if (ventanaImpresion) {
                    ventanaImpresion.document.write(htmlTicket);
                    ventanaImpresion.document.close();
                } else {
                    alertaCustom('Por favor, permite las ventanas emergentes (pop-ups) para imprimir el ticket.');
                }
            }
        } catch(e) {
            console.error("Error generando ticket checkout:", e);
        }

        // 1. Limpiamos la basura de sesión para que la próxima consulta entre limpia
        sessionStorage.removeItem('cargosConsultaPendiente');
        sessionStorage.removeItem('pacienteCheckout');
        
        // 2. Transición SPA hacia la Agenda Principal
        setHayDatosSinGuardar(false);
        if (window.cargarModulo) {
            window.cargarModulo('MODULO_AGENDA');
        } else {
            console.warn("Caja finalizada. Enrutador principal SPA (cargarModulo) no detectado en Window.");
        }
    },

    // ==========================================================================
    // ABORTAR CAJA (PROTECCIÓN DE DATOS)
    // ==========================================================================
    cancelarCheckout: async function() {
        if (this.estado.cargos && this.estado.cargos.length > 0) {
            const confirmarSalida = await confirmacionCustom(
                '¿Abandonar la caja?', 
                'Tienes artículos en la cuenta actual. Si sales ahora, se perderá el progreso del cobro. ¿Estás seguro de que deseas salir?'
            );
            if (!confirmarSalida) {
                return; // Detiene la salida y se queda en la caja
            }
        }
        
        // Limpiamos variables si aceptó salir
        this.estado.cargos = [];
        sessionStorage.removeItem('cargosConsultaPendiente');
        sessionStorage.removeItem('pacienteCheckout');
        
        // Cierra el módulo de caja devolviendo a la Agenda o Dashboard
        setHayDatosSinGuardar(false);
        if (window.cargarModulo) {
            window.cargarModulo('MODULO_AGENDA');
        }
    }
};

// 🌟 CRÍTICO: Exponemos el objeto al scope Global para que el HTML maquetado pueda invocar las funciones en los eventos onclick=""
window.moduloCheckout = moduloCheckout;

export async function inicializarCheckout() {
    await moduloCheckout.inicializar();
}
