  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAFZtBJPQWRv6k3ZbfMWeJCEhAFag67JBc",
    authDomain: "barbearia-madruga-ba6e2.firebaseapp.com",
    projectId: "barbearia-madruga-ba6e2",
    storageBucket: "barbearia-madruga-ba6e2.appspot.com",
    messagingSenderId: "827262254177",
    appId: "1:827262254177:web:93e420c86710c0078cfe20"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // deixa disponível pro sistema
  window.db = db;