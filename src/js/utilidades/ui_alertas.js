/**
 * SISTEMA: PET PROTECT
 * MÓDULO: UI Alertas y Confirmaciones (Servicio Centralizado)
 * DESCRIPCIÓN: Reemplazo Premium (Vanilla JS) para window.alert y window.confirm
 */

function crearModalBase(contenidoHTML) {
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100vw';
    backdrop.style.height = '100vh';
    backdrop.style.backgroundColor = 'rgba(3, 47, 64, 0.4)'; // Cobalto transparente
    backdrop.style.backdropFilter = 'blur(5px)';
    backdrop.style.WebkitBackdropFilter = 'blur(5px)';
    backdrop.style.display = 'flex';
    backdrop.style.justifyContent = 'center';
    backdrop.style.alignItems = 'center';
    backdrop.style.zIndex = '999999';
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.3s ease';

    const modal = document.createElement('div');
    modal.style.backgroundColor = '#ffffff';
    modal.style.borderRadius = '16px';
    modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.05)';
    modal.style.padding = '32px';
    modal.style.maxWidth = '400px';
    modal.style.width = '90%';
    modal.style.textAlign = 'center';
    modal.style.transform = 'translateY(20px) scale(0.95)';
    modal.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    modal.style.fontFamily = "'Montserrat', 'Inter', sans-serif";
    
    modal.innerHTML = contenidoHTML;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Animación de entrada
    requestAnimationFrame(() => {
        backdrop.style.opacity = '1';
        modal.style.transform = 'translateY(0) scale(1)';
    });

    return { backdrop, modal };
}

function cerrarModal(backdrop, modal, callback) {
    backdrop.style.opacity = '0';
    modal.style.transform = 'translateY(-20px) scale(0.95)';
    setTimeout(() => {
        if (document.body.contains(backdrop)) {
            document.body.removeChild(backdrop);
        }
        if (callback) callback();
    }, 300); // Esperar la transición
}

/**
 * Muestra una alerta informativa o de error en pantalla.
 * @param {string} titulo - Título principal de la alerta.
 * @param {string} mensaje - Cuerpo del mensaje.
 * @param {string} tipo - 'info', 'error', 'success', 'warning'
 * @returns {Promise} Resuelve cuando el usuario cierra la alerta.
 */
export function alertaCustom(titulo, mensaje, tipo = 'info') {
    return new Promise((resolve) => {
        let colorIcono = 'var(--cobalto, #032F40)';
        let iconoHtml = 'info';

        if (tipo === 'error') { colorIcono = '#ef4444'; iconoHtml = 'error'; }
        if (tipo === 'success') { colorIcono = '#10b981'; iconoHtml = 'check_circle'; }
        if (tipo === 'warning') { colorIcono = 'var(--naranja, #F27405)'; iconoHtml = 'warning'; }

        // Si el título viene vacío, usamos el primer argumento como mensaje (emulación de alert nativo)
        if (!mensaje) {
            mensaje = titulo;
            titulo = tipo === 'error' ? 'Error' : 'Aviso';
        }

        const html = `
            <span class="material-symbols-rounded" style="font-size: 48px; color: ${colorIcono}; margin-bottom: 16px; display: inline-block;">${iconoHtml}</span>
            <h3 style="margin: 0 0 12px 0; color: var(--cobalto, #032F40); font-size: 20px; font-weight: 700;">${titulo}</h3>
            <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${mensaje}</p>
            <button id="btn-alerta-ok" style="background: var(--naranja, #F27405); color: white; border: none; border-radius: 8px; padding: 12px 32px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.2s, transform 0.1s;">Entendido</button>
        `;

        const { backdrop, modal } = crearModalBase(html);
        const btn = backdrop.querySelector('#btn-alerta-ok');

        btn.onmouseover = () => btn.style.filter = 'brightness(1.1)';
        btn.onmouseout = () => btn.style.filter = 'brightness(1)';
        btn.onmousedown = () => btn.style.transform = 'scale(0.98)';
        btn.onmouseup = () => btn.style.transform = 'scale(1)';

        const closeFunc = () => cerrarModal(backdrop, modal, resolve);

        btn.addEventListener('click', closeFunc);
    });
}

/**
 * Pide confirmación al usuario (Reemplazo de window.confirm)
 * @param {string} titulo - Título de la confirmación
 * @param {string} mensaje - Pregunta o advertencia
 * @returns {Promise<boolean>}
 */
export function confirmacionCustom(titulo, mensaje, icono = 'help', color = 'var(--naranja, #F27405)') {
    return new Promise((resolve) => {
        // Fallback nativo emulate
        if (!mensaje) {
            mensaje = titulo;
            titulo = 'Confirmar Acción';
        }

        const html = `
            <span class="material-symbols-rounded" style="font-size: 48px; color: ${color}; margin-bottom: 16px; display: inline-block;">${icono}</span>
            <h3 style="margin: 0 0 12px 0; color: var(--cobalto, #032F40); font-size: 20px; font-weight: 700;">${titulo}</h3>
            <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${mensaje}</p>
            <div style="display: flex; gap: 12px;">
                <button id="btn-conf-cancel" style="flex: 1; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cancelar</button>
                <button id="btn-conf-ok" style="flex: 1; background: var(--cobalto, #032F40); color: white; border: none; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Confirmar</button>
            </div>
        `;

        const { backdrop, modal } = crearModalBase(html);
        const btnOk = backdrop.querySelector('#btn-conf-ok');
        const btnCancel = backdrop.querySelector('#btn-conf-cancel');

        const effectHover = (b) => {
            b.onmouseover = () => b.style.filter = 'brightness(1.1)';
            b.onmouseout = () => b.style.filter = 'brightness(1)';
        };
        effectHover(btnOk);
        effectHover(btnCancel);

        btnCancel.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve(false)));
        btnOk.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve(true)));
    });
}

/**
 * Pide confirmación de alto riesgo (Rojo Mate y Letras Blancas)
 */
export function confirmacionCustomPeligro(titulo, mensaje) {
    return new Promise((resolve) => {
        if (!mensaje) {
            mensaje = titulo;
            titulo = 'Advertencia Crítica';
        }

        const html = `
            <span class="material-symbols-rounded" style="font-size: 48px; color: #ffffff; margin-bottom: 16px; display: inline-block; font-variation-settings: \"FILL\" 0, \"wght\" 300, \"GRAD\" 0, \"opsz\" 48;">warning_amber</span>
            <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 700;">${titulo}</h3>
            <p style="margin: 0 0 24px 0; color: #f8dbdb; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${mensaje}</p>
            <div style="display: flex; gap: 12px;">
                <button id="btn-conf-pel-cancel" style="flex: 1; background: transparent; color: #ffffff; border: 1px solid #ffffff; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cancelar</button>
                <button id="btn-conf-pel-ok" style="flex: 1; background: #ffffff; color: #b91c1c; border: none; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Sí, Cancelar Todo</button>
            </div>
        `;

        const { backdrop, modal } = crearModalBase(html);
        
        // Sobrescribir estilos para que sea rojo mate
        modal.style.backgroundColor = '#b91c1c'; // Rojo mate
        modal.style.color = '#ffffff';

        const btnOk = backdrop.querySelector('#btn-conf-pel-ok');
        const btnCancel = backdrop.querySelector('#btn-conf-pel-cancel');

        const effectHover = (b, hoverBg) => {
            const origBg = b.style.backgroundColor;
            b.onmouseover = () => b.style.backgroundColor = hoverBg;
            b.onmouseout = () => b.style.backgroundColor = origBg;
        };
        effectHover(btnOk, '#f1f5f9');
        effectHover(btnCancel, 'rgba(255,255,255,0.1)');

        btnCancel.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve(false)));
        btnOk.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve(true)));
    });
}

/**
 * Pide confirmación de alto riesgo y solicita un texto al usuario
 */
export function promptCustomPeligro(titulo, mensaje, defaultText = "") {
    return new Promise((resolve) => {
        const html = `
            <span class="material-symbols-rounded" style="font-size: 48px; color: #ffffff; margin-bottom: 16px; display: inline-block; font-weight: 300; font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48;">warning_amber</span>
            <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 700;">${titulo}</h3>
            <p style="margin: 0 0 16px 0; color: #f8dbdb; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${mensaje}</p>
            <div style="text-align: left; margin-bottom: 24px;">
                <label style="color: #ffffff; font-size: 13px; font-weight: 600; display: block; margin-bottom: 8px;">Mensaje a Propietarios:</label>
                <textarea id="prompt-peligro-input" rows="4" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.1); color: #ffffff; font-family: inherit; font-size: 14px; resize: none;">${defaultText}</textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button id="btn-prompt-cancel" style="flex: 1; background: transparent; color: #ffffff; border: 1px solid #ffffff; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cancelar</button>
                <button id="btn-prompt-ok" style="flex: 1; background: #ffffff; color: #b91c1c; border: none; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Sí, Cancelar Todo</button>
            </div>
        `;

        const { backdrop, modal } = crearModalBase(html);
        
        modal.style.backgroundColor = '#b91c1c';
        modal.style.color = '#ffffff';

        const input = backdrop.querySelector('#prompt-peligro-input');
        const btnOk = backdrop.querySelector('#btn-prompt-ok');
        const btnCancel = backdrop.querySelector('#btn-prompt-cancel');

        const effectHover = (b, hoverBg) => {
            const origBg = b.style.backgroundColor;
            b.onmouseover = () => b.style.backgroundColor = hoverBg;
            b.onmouseout = () => b.style.backgroundColor = origBg;
        };
        effectHover(btnOk, '#f1f5f9');
        effectHover(btnCancel, 'rgba(255,255,255,0.1)');

        btnCancel.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve({ confirmado: false, texto: null })));
        btnOk.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve({ confirmado: true, texto: input.value.trim() })));
    });
}

/**
 * Pide confirmación y solicita un texto al usuario (Reemplazo Premium de window.prompt)
 */
export function promptCustom(titulo, mensaje, defaultText = "", icono = 'chat', color = 'var(--cobalto, #032F40)') {
    return new Promise((resolve) => {
        const html = `
            <span class="material-symbols-rounded" style="font-size: 48px; color: ${color}; margin-bottom: 16px; display: inline-block;">${icono}</span>
            <h3 style="margin: 0 0 12px 0; color: var(--cobalto, #032F40); font-size: 20px; font-weight: 700;">${titulo}</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${mensaje}</p>
            <div style="text-align: left; margin-bottom: 24px;">
                <input type="text" id="prompt-input" value="${defaultText}" autocomplete="off" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: var(--cobalto, #032F40); font-family: inherit; font-size: 15px; outline: none; transition: border-color 0.2s;" />
            </div>
            <div style="display: flex; gap: 12px;">
                <button id="btn-prompt-cancel" style="flex: 1; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cancelar</button>
                <button id="btn-prompt-ok" style="flex: 1; background: var(--naranja, #F27405); color: white; border: none; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Aceptar</button>
            </div>
        `;

        const { backdrop, modal } = crearModalBase(html);
        
        const input = backdrop.querySelector('#prompt-input');
        const btnOk = backdrop.querySelector('#btn-prompt-ok');
        const btnCancel = backdrop.querySelector('#btn-prompt-cancel');

        // Enfocar input y seleccionar texto al abrir
        setTimeout(() => {
            input.focus();
            input.select();
        }, 300);

        // Estilos hover
        const effectHover = (b) => {
            b.onmouseover = () => b.style.filter = 'brightness(1.1)';
            b.onmouseout = () => b.style.filter = 'brightness(1)';
        };
        effectHover(btnOk);
        effectHover(btnCancel);

        // Eventos de teclado (Enter para submit)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                cerrarModal(backdrop, modal, () => resolve(input.value.trim()));
            }
        });

        // Click en botones
        btnCancel.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve(null)));
        btnOk.addEventListener('click', () => cerrarModal(backdrop, modal, () => resolve(input.value.trim())));
    });
}
