    import { BrowserMultiFormatReader } from '@zxing/browser';
import { conexionSupabase } from '../infraestructura/conexion.js';

let channel = null;
let codeReader = null;
let controls = null;
let scanning = false;
let lastScannedCode = null;
let lastScannedTime = 0;
let currentDeviceId = null;
let videoInputDevices = [];
let torchState = false;

const sesionParams = new URLSearchParams(window.location.search);
const sesionId = sesionParams.get('sesion');

const UI = {
    video: document.getElementById('videoPreview'),
    sessionDisplay: document.getElementById('sessionDisplay'),
    timeDisplay: document.getElementById('timeDisplay'),
    resultBanner: document.getElementById('resultBanner'),
    rCode: document.getElementById('rCode'),
    rMeta: document.getElementById('rMeta'),
    instructionText: document.getElementById('instructionText'),
    camHint: document.getElementById('camHint'),
    btnCerrar: document.getElementById('btnCerrar'),
    btnPauseResume: document.getElementById('btnPauseResume'),
    btnSwitchCam: document.getElementById('btnSwitchCam'),
    btnTorch: document.getElementById('btnTorch'),
    scanFrame: document.getElementById('scanFrame'),
    manualField: document.getElementById('manualField')
};

// 1. Inicialización Principal
async function initEscaner() {
    iniciarReloj();

    if (!sesionId) {
        mostrarError("Sesión Inválida", "Cierra esta ventana e intenta generar el código QR de nuevo.");
        return;
    }

    UI.sessionDisplay.textContent = 'Conectando a caja...';
    
    // Conectar a Supabase Realtime
    channel = conexionSupabase.channel('scanner_' + sesionId, {
        config: {
            broadcast: { ack: true }
        }
    });
    
    channel.on('broadcast', { event: 'ack' }, (payload) => {
        // La caja puede mandar un ACK cuando recibe un código exitosamente
        if(payload.payload && payload.payload.codigo === lastScannedCode) {
            UI.rMeta.textContent = "AGREGADO A CAJA";
            UI.rMeta.style.color = "#4CAF50";
        }
    });

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            UI.sessionDisplay.textContent = '● Conectado (' + sesionId.substring(0,4) + ')';
            UI.sessionDisplay.style.color = '#4CAF50';
            
            // Iniciar lector ZXing
            await inicializarCamara();
        } else if (status === 'CLOSED') {
            UI.sessionDisplay.textContent = '○ Desconectado';
            UI.sessionDisplay.style.color = '#F27405';
        }
    });

    // Event Listeners
    UI.btnCerrar.addEventListener('click', () => window.close());
    
    UI.btnPauseResume.addEventListener('click', () => {
        if (scanning) pausarEscaneo();
        else reanudarEscaneo();
    });

    UI.btnSwitchCam.addEventListener('click', alternarCamara);
    UI.btnTorch.addEventListener('click', alternarLinterna);

    UI.manualField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const v = UI.manualField.value.trim();
            if (v) enviarCodigo(v, 'Manual');
            UI.manualField.value = '';
        }
    });
}

// 2. Control de Cámara (ZXing)
async function inicializarCamara() {
    try {
        codeReader = new BrowserMultiFormatReader();
        videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
            mostrarError("Sin Cámara", "No se detectaron cámaras en este dispositivo.");
            return;
        }

        // Buscar cámara trasera preferentemente
        let selectedDevice = videoInputDevices[0];
        for (const device of videoInputDevices) {
            if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('trasera')) {
                selectedDevice = device;
                break;
            }
        }
        
        currentDeviceId = selectedDevice.deviceId;
        iniciarEscaneo();

    } catch (error) {
        console.error(error);
        mostrarError("Error Cámara", "Debes otorgar permisos de cámara para escanear.");
    }
}

async function iniciarEscaneo() {
    try {
        UI.camHint.textContent = 'DETECTANDO...';
        UI.scanFrame.style.display = 'block';
        UI.btnPauseResume.classList.add('scanning');
        scanning = true;

        controls = await codeReader.decodeFromVideoDevice(currentDeviceId, UI.video, (result, err) => {
            if (result) {
                // Cooldown 1.5s para evitar scans duplicados
                const ahora = Date.now();
                if (result.text === lastScannedCode && (ahora - lastScannedTime) < 1500) {
                    return; 
                }
                
                procesarCodigo(result.text, result.format ? result.format.toString() : 'Auto');
            }
        });

    } catch (e) {
        console.error(e);
        UI.camHint.textContent = 'ERROR DE CÁMARA';
    }
}

function pausarEscaneo() {
    if (controls) {
        controls.stop();
        scanning = false;
        UI.btnPauseResume.classList.remove('scanning');
        UI.camHint.textContent = 'PAUSADO';
        UI.scanFrame.style.display = 'none';
    }
}

function reanudarEscaneo() {
    iniciarEscaneo();
}

async function alternarCamara() {
    if (videoInputDevices.length <= 1) return;
    
    // Cambiar al siguiente dispositivo
    let currentIndex = videoInputDevices.findIndex(d => d.deviceId === currentDeviceId);
    let nextIndex = (currentIndex + 1) % videoInputDevices.length;
    currentDeviceId = videoInputDevices[nextIndex].deviceId;
    
    pausarEscaneo();
    setTimeout(() => reanudarEscaneo(), 300);
}

async function alternarLinterna() {
    if (!controls) return;
    try {
        const stream = UI.video.srcObject;
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
            torchState = !torchState;
            await track.applyConstraints({
                advanced: [{ torch: torchState }]
            });
            UI.btnTorch.classList.toggle('active', torchState);
        } else {
            alert("El dispositivo no soporta linterna.");
        }
    } catch(e) {
        console.warn("Error con linterna", e);
    }
}

// 3. Procesamiento y Envío
function procesarCodigo(codigo, formato) {
    lastScannedCode = codigo;
    lastScannedTime = Date.now();

    // Feedback
    if (navigator.vibrate) navigator.vibrate(200);
    hacerBeep();

    // UI
    UI.rCode.textContent = codigo;
    UI.rMeta.textContent = "ENVIANDO A CAJA...";
    UI.rMeta.style.color = "#B0C4DE";
    
    UI.resultBanner.classList.remove('visible');
    void UI.resultBanner.offsetWidth; // trigger reflow
    UI.resultBanner.classList.add('visible');
    
    UI.instructionText.textContent = "¡Lectura exitosa! Puedes escanear el siguiente código.";

    // Enviar a Caja vía Supabase
    enviarCodigo(codigo, formato);
}

function enviarCodigo(codigo, formato) {
    if (!channel) return;
    
    channel.send({
        type: 'broadcast',
        event: 'scan',
        payload: {
            sesion_id: sesionId,
            codigo_barras: codigo,
            formato: formato,
            fecha: new Date().toISOString()
        }
    }).then(resp => {
        if(resp !== 'ok') console.warn('Supabase no retornó ok:', resp);
    }).catch(err => {
        alert("Error de red al enviar a caja: " + err.message);
    });
}

// 4. Utilidades UI
function mostrarError(titulo, msg) {
    UI.rCode.textContent = titulo;
    UI.rMeta.textContent = msg;
    UI.resultBanner.classList.add('visible');
    UI.camHint.textContent = 'ERROR';
    UI.scanFrame.style.display = 'none';
    UI.btnPauseResume.classList.remove('scanning');
}

function iniciarReloj() {
    setInterval(() => {
        const d = new Date();
        UI.timeDisplay.textContent = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// Generar un Beep corto con Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function hacerBeep() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

// Bootstrap
document.addEventListener('DOMContentLoaded', initEscaner);
