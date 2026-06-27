export function inicializarMenuInventario() {
    console.log("🛠️ [MÓDULO SELECCIÓN INVENTARIO] Inicializando...");

    const btnAbrirGuia = document.getElementById('btn-abrir-guia-uso');
    const modalGuia = document.getElementById('modal-guia-uso');
    const btnCerrarGuia = document.getElementById('btn-cerrar-guia-uso');
    const btnEntendido = document.getElementById('btn-entendido-guia');

    if (btnAbrirGuia && modalGuia) {
        btnAbrirGuia.addEventListener('click', () => {
            modalGuia.style.display = 'flex';
            // Pequeño timeout para la transición
            setTimeout(() => {
                modalGuia.style.opacity = '1';
                const panel = modalGuia.querySelector('.ventana-modal-bento');
                if(panel) panel.style.transform = 'translateY(0)';
            }, 10);
        });
        
        const cerrarModal = () => {
            modalGuia.style.opacity = '0';
            const panel = modalGuia.querySelector('.ventana-modal-bento');
            if(panel) panel.style.transform = 'translateY(20px)';
            setTimeout(() => {
                modalGuia.style.display = 'none';
            }, 300);
        };

        if(btnCerrarGuia) btnCerrarGuia.addEventListener('click', cerrarModal);
        if(btnEntendido) btnEntendido.addEventListener('click', cerrarModal);
        
        // Cerrar al hacer clic en el backdrop oscuro
        modalGuia.addEventListener('click', (e) => {
            if(e.target === modalGuia) {
                cerrarModal();
            }
        });
        
        // Efecto hover sobre el botón de cerrar
        if(btnCerrarGuia) {
            btnCerrarGuia.addEventListener('mouseenter', () => {
                btnCerrarGuia.style.background = 'rgba(242, 116, 5, 0.1)';
                btnCerrarGuia.style.color = 'var(--naranja)';
            });
            btnCerrarGuia.addEventListener('mouseleave', () => {
                btnCerrarGuia.style.background = 'rgba(3, 47, 64, 0.05)';
                btnCerrarGuia.style.color = '#6b7a80';
            });
        }
    }
}
