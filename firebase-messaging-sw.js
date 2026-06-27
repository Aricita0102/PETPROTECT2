// Archivo: /firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js");

// Inicializa Firebase en el Service Worker
firebase.initializeApp({
    apiKey: "AIzaSyAiViaTebE25FgFqnp4j8glDxaENcKqrrk",
    authDomain: "protect-pet.firebaseapp.com",
    projectId: "protect-pet",
    storageBucket: "protect-pet.firebasestorage.app",
    messagingSenderId: "143773812000",
    appId: "1:143773812000:web:2d59e3f38aa6caf7948345"
});

// Recupera la instancia de messaging
const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano (cuando la app está cerrada)
messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);
    
    // Personalizar notificación
    const notificationTitle = payload.notification?.title || "Protect Pet Alerta";
    const notificationOptions = {
        body: payload.notification?.body || "Tienes una nueva notificación.",
        icon: "/favicon.ico",
        vibrate: [200, 100, 200, 100, 200, 100, 200], // Patrón de vibración para móviles
        // En navegadores web que soportan 'sound', usualmente móviles
        sound: "default",
        data: {
            url: payload.data?.url || "/"
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejador de clics en la notificación
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const urlToOpen = event.notification.data.url;
    
    // Abrir la URL cuando el usuario hace clic
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
