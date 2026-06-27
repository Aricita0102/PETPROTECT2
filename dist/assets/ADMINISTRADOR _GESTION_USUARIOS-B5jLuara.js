import"./modulepreload-polyfill-Dezn_h7o.js";import{initializeApp as e}from"https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";import{getAuth as t,onAuthStateChanged as n}from"https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";import{collection as r,doc as i,getDoc as a,getFirestore as o,onSnapshot as s,serverTimestamp as c,updateDoc as l}from"https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";var u=e({apiKey:`AIzaSyAiViaTebE25FgFqnp4j8glDxaENcKqrrk`,authDomain:`protect-pet.firebaseapp.com`,projectId:`protect-pet`,storageBucket:`protect-pet.firebasestorage.app`,messagingSenderId:`143773812000`,appId:`1:143773812000:web:2d59e3f38aa6caf7948345`}),d=o(u),f=t(u),p=document.getElementById(`contenedorPendientes`),m=document.getElementById(`contenedorActivos`),h=document.getElementById(`listaActivosVertical`),g=document.getElementById(`conteoTotal`),_=null,v=null;function y(e){let t=[`fondo-azul`,`fondo-naranja`,`fondo-amarillo`];return t[e.charCodeAt(e.length-1)%t.length]}function b(e){if(!e)return`Reciente`;let t=e.toDate?e.toDate():new Date(e);return`${t.toLocaleDateString()} ${t.toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`})}`}n(f,async e=>{if(e){_=e.uid;let t=await a(i(d,`usuarios`,e.uid));if(t.exists()){let e=t.data();e.rol===`administrador`?(v=(e.codigoClinica||``).trim(),x()):window.location.href=`LOGIN.html`}else window.location.href=`LOGIN.html`}else window.location.href=`LOGIN.html`});function x(){s(r(d,`usuarios`),e=>{if(!p||!h)return;p.innerHTML=``,h.innerHTML=``;let t=0,n=!1;e.forEach(e=>{let r=e.data(),i=e.id,a=r.rol===`administrador`,o=i===_,s=(r.codigoClinica||``).trim(),c=(v||``).trim();!o&&(!c||s!==c)||((r.estatus===`revision`||r.estatus===`suspendido`)&&!a?(S(i,r),n=!0):(r.estatus===`activo`||o)&&(C(i,r,a),t++))}),g&&(g.innerText=t.toString().padStart(2,`0`)),n||(p.innerHTML=`
                <div style="text-align:center; padding:2rem; color:#888; width:100%;">
                    <p>No hay solicitudes pendientes ni usuarios suspendidos.</p>
                </div>`)})}function S(e,t){let n=document.createElement(`div`);n.className=`tarjeta-personal`;let r=t.estatus===`suspendido`,i=t.nombreCompleto||`Usuario`,a=r?`fondo-rojo`:y(e),o=t.fotoUrl?`<img src="${t.fotoUrl}" alt="Foto">`:`<span>${i.charAt(0).toUpperCase()}</span>`,s=t.fechaSolicitud||t.fechaVinculacion;n.innerHTML=`
        <div class="bloque-izquierdo">
            <div class="avatarCircular ${t.fotoUrl?``:a}">${o}</div>
            <div class="info-usuario">
                <span class="nombre-usuario">
                    ${i} 
                    <small style="color:${r?`#D32F2F`:`#F29F05`}; font-weight:bold; margin-left:5px;">
                        ${r?`● SUSPENDIDO`:`● SOLICITUD NUEVA`}
                    </small>
                </span>
                <span class="rol-usuario" style="color:#032F40;">${(t.rol||`Personal`).toUpperCase()}</span>
                <span class="fecha-info">${r?`Suspendido:`:`Solicitó:`} ${b(s)}</span>
                <span class="email-usuario">${t.correo}</span>
            </div>
        </div>
        <div class="bloque-derecho">
            <div class="contenedor-botones">
                <button class="btn-solido btn-rojo" onclick="rechazarVinculacion('${e}', ${r})">
                    ${r?`Expulsar`:`Rechazar`}
                </button>
                <button class="btn-solido btn-azul" onclick="actualizarEstatus('${e}', 'activo')">
                    ${r?`Reactivar Acceso`:`Aceptar Ingreso`}
                </button>
            </div>
        </div>
    `,p.appendChild(n)}function C(e,t,n){let r=document.createElement(`div`);r.className=n?`tarjeta-personal estilo-admin`:`tarjeta-personal`;let i=t.nombreCompleto||`Usuario`,a=t.fotoUrl?`<img src="${t.fotoUrl}" alt="Foto">`:`<span>${i.charAt(0).toUpperCase()}</span>`;r.innerHTML=`
        <div class="bloque-izquierdo">
            <div class="avatarCircular ${t.fotoUrl?``:y(e)}">${a}</div>
            <div class="info-usuario">
                <span class="nombre-usuario">${i}</span>
                <span class="email-usuario">${t.correo}</span>
                ${n?``:`<span class="fecha-info">Activo desde: ${b(t.fechaActivacion)}</span>`}
            </div>
        </div>
        <div class="bloque-derecho">
            ${n?`<span class="rol-usuario" style="color:#F29F05; font-weight:bold;">ADMINISTRADOR (TÚ)</span>`:`
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                    <span class="rol-usuario">${(t.rol||`Personal`).toUpperCase()}</span>
                    <button class="btn-suspender-borde" onclick="confirmarSuspension('${e}', '${i}')">Suspender Acceso</button>
                </div>
            `}
        </div>
    `,h.appendChild(r)}window.actualizarEstatus=async(e,t)=>{try{await l(i(d,`usuarios`,e),{estatus:t,fechaActivacion:c(),codigoClinica:v})}catch(e){console.error(`Error al cambiar estatus: `,e),alert(`Error de red al actualizar usuario.`)}},window.confirmarSuspension=(e,t)=>{confirm(`⚠️ ¿Suspender acceso a ${t}?\n\nNo podrá entrar al sistema hasta que lo reactives.`)&&window.actualizarEstatus(e,`suspendido`)},window.rechazarVinculacion=async(e,t)=>{if(confirm(`¿Confirmas que deseas ${t?`eliminar definitivamente`:`rechazar`} a este usuario? Se desvinculará de tu clínica.`))try{await l(i(d,`usuarios`,e),{estatus:`sin_vincular`,codigoClinica:`sin_codigo`,fechaBaja:c()})}catch(e){console.error(`Error al desvincular:`,e),alert(`Error al desvincular.`)}};var w=e=>{let t=e===`activos`;p.style.display=t?`none`:`flex`,m.style.display=t?`block`:`none`,document.getElementById(`btnPestanaActivos`).classList.toggle(`activa`,t),document.getElementById(`btnPestanaPendientes`).classList.toggle(`activa`,!t)};document.getElementById(`btnPestanaPendientes`).onclick=()=>w(`pendientes`),document.getElementById(`btnPestanaActivos`).onclick=()=>w(`activos`),document.addEventListener(`DOMContentLoaded`,()=>{new URLSearchParams(window.location.search).get(`vista`)===`activos`?w(`activos`):w(`pendientes`)});