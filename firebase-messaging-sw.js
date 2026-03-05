importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDiAv_3P2Zo94WDiiEBazTc8p68m9_jlJE",
  authDomain:  "barbearia-madruga-oficial.firebaseapp.com",
  projectId: "barbearia-madruga-oficial",
  messagingSenderId: "364300779378",
  appId: "1:364300779378:web:84d38ff82ca410cbfee7eb"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo-192.png"
  });
});