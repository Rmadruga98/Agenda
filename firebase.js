// Firebase config (SEU PROJETO)
const firebaseConfig = {
  apiKey: "AIzaSyDiAv_3P2Zo94WDiiEBazTc8p68m9_jlJE",
  authDomain: "barbearia-madruga-oficial.firebaseapp.com",
  projectId: "barbearia-madruga-oficial",
  storageBucket: "barbearia-madruga-oficial.appspot.com",
  messagingSenderId: "364300779378",
  appId: "1:364300779378:web:84d38ff82ca410cbfee7eb"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Auth + Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Login anônimo (OBRIGATÓRIO)
auth.signInAnonymously()
  .then(() => {
    console.log("✅ Login anônimo OK");
  })
  .catch(err => {
    console.error("❌ Erro login anônimo:", err);
  });

// Disponível globalmente
window.auth = auth;
window.db = db;