const fs = require('fs');
let code = fs.readFileSync('src/js/vistas/modulos/modulo_agenda_logica.js', 'utf8');

let p1 = code.indexOf('// Configurar el intervalo para actualizar el minutero automáticamente');
let p2 = code.indexOf('// ─── Vista Semana ───', p1);
if(p2 === -1) p2 = code.indexOf('// ─── Vista Semana', p1);

if (p1 !== -1 && p2 !== -1) {
    const replacement = `// Configurar el intervalo para actualizar el minutero automáticamente
    if (window._intervaloMinutero) clearInterval(window._intervaloMinutero);
    window._intervaloMinutero = setInterval(() => {
        const minutero = document.getElementById('minutero-dia');
        if (minutero) {
            const now = new Date();
            const pxHora = PIXELS_POR_HORA;
            if (now.getHours() >= HORA_INICIO && now.getHours() <= HORA_FIN) {
                const currentTop = (now.getHours() - HORA_INICIO) * pxHora + (now.getMinutes() / 60) * pxHora;
                minutero.style.top = currentTop + 'px';
            }
        }
    }, 60000);

    // Auto-scroll al minutero
    setTimeout(() => {
        const minutero = document.getElementById('minutero-dia');
        if (minutero) {
            const scrollContainer = document.querySelector('.vista-contenido') || document.getElementById('vista-dia') || document.querySelector('.main-content-scroll') || window;
            if (scrollContainer && scrollContainer.scrollTo) {
                scrollContainer.scrollTo({ top: Math.max(0, minutero.offsetTop - 100), behavior: 'smooth' });
            }
        }
    }, 300);
}

`;
    code = code.substring(0, p1) + replacement + code.substring(p2);
    fs.writeFileSync('src/js/vistas/modulos/modulo_agenda_logica.js', code);
    console.log('Replaced via node script.');
} else {
    console.log('Could not find indices', p1, p2);
}
