document.addEventListener("DOMContentLoaded", () => {

/* ===== CONFIG ===== */
const WHATSAPP = "5535998066403";
const SENHA_ADMIN = "madruga123";
const HORA_ABERTURA = 8;
const HORA_FECHAMENTO = 19;

/* ===== SERVIÇOS ===== */
const servicos = {
  "Corte Simples": 30,
  "Corte Degradê": 35,
  "Corte Navalhado": 38,
  "Barba": 20,
  "Corte + Barba": 55,
  "Sobrancelha": 10,
  "Pezinho": 20,
  "Corte + Barba + Sobrancelha": 60,
  "Pigmentação + Corte": 60,
  "Luzes + Corte": 75,
  "Platinado + Corte": 110
};

const $ = id => document.getElementById(id);
const db = window.db;

/* ===== DATA COM DIA DA SEMANA ===== */
function formatarDataComDia(dataISO) {
  const dias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const [a,m,d] = dataISO.split("-").map(Number);
  const data = new Date(a, m - 1, d);
  return `${dias[data.getDay()]} – ${data.toLocaleDateString("pt-BR")}`;
}

/* ===== CONFIRMAÇÃO VISUAL + SOM ===== */
function mostrarConfirmacao() {
  const overlay = document.createElement("div");
  overlay.className = "confirmacao";
  overlay.innerHTML = `
    <div class="confirmacao-box">
      <div class="check">✔️</div>
      <p>Agendamento confirmado!</p>
    </div>
  `;
  document.body.appendChild(overlay);

  if (navigator.vibrate) navigator.vibrate([200,100,200]);

  setTimeout(() => overlay.remove(), 1800);
}

/* ===== ELEMENTOS ===== */
const horariosDiv = $("horarios");
const horaInput = $("hora");
const dataInput = $("data");
const precoInput = $("preco");
const form = $("formAgendamento");

// 🔒 BLOQUEAR DATAS PASSADAS
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

// ✅ DATAS LIBERADAS MANUALMENTE (EXCEÇÕES)
const datasLiberadas = [
"2026-02-16"
];

// define o mínimo como hoje
dataInput.min = hoje.toISOString().split("T")[0];

/* ===== PREÇO ===== */
$("servico").addEventListener("change", e => {
  precoInput.value = servicos[e.target.value]
    ? `R$ ${servicos[e.target.value]}`
    : "";
});

/* ===== HORÁRIOS ===== */
async function carregarHorarios(data) {
  horariosDiv.innerHTML = "";
  horaInput.value = "";


  const snap = await db.collection("agendamentos")
    .where("data", "==", data)
    .get();

  const ocupados = snap.docs.map(d => d.data().hora);

  for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
    if (h === 12) continue;

    const hora = String(h).padStart(2, "0") + ":00";
    if (ocupados.includes(hora)) continue;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hora-btn";
    btn.textContent = hora;

    btn.onclick = () => {
      document.querySelectorAll(".hora-btn")
        .forEach(b => b.classList.remove("ativa"));
      btn.classList.add("ativa");
      horaInput.value = hora;
    };

    horariosDiv.appendChild(btn);
  }
}

dataInput.addEventListener("change", () => {
  const dataSelecionada = dataInput.value;

  // se for exceção, libera direto
  if (datasLiberadas.includes(dataSelecionada)) {
    carregarHorarios(dataSelecionada);
    return;
  }

  // valida dia da semana
  const dia = new Date(dataSelecionada + "T00:00").getDay();
  if (dia === 0 || dia === 1) {
    alert("Não atendemos domingo e segunda");
    dataInput.value = "";
    return;
  }

  carregarHorarios(dataSelecionada);
});

/* ===== AGENDAR ===== */
form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!horaInput.value) return alert("Selecione um horário");

  const ag = {
    nome: $("nome").value,
    telefone: $("telefone").value,
    data: dataInput.value,
    hora: horaInput.value,
    servico: $("servico").value,
    preco: servicos[$("servico").value],
    criadoEm: new Date()
  };

  await db.collection("agendamentos").add(ag);

  window.open(
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
`📌 NOVO AGENDAMENTO
👤 ${ag.nome}
📅 ${formatarDataComDia(ag.data)}
⏰ ${ag.hora}
✂️ ${ag.servico}
💰 R$ ${ag.preco}`
    )}`
  );

  mostrarConfirmacao();
  form.reset();
  horariosDiv.innerHTML = "";
  precoInput.value = "";
});

// ===== ADMIN (VERSÃO ESTÁVEL PARA CELULAR/PWA) =====
const btnAdmin = document.getElementById("btnAdmin");
const areaAdmin = document.getElementById("areaAdmin");
const btnSairAdmin = document.getElementById("btnSairAdmin");
const listaAg = document.getElementById("listaAgendamentos");
const listaHist = document.getElementById("listaHistorico");
const btnRel = document.getElementById("btnRelatorioDiario");

// 🔒 gesto secreto (5 toques no título)
let taps = 0;
document.querySelector("h1").addEventListener("click", () => {
  taps++;
  if (taps === 5) {
    btnAdmin.style.display = "block";
    alert("🔓 Modo administrador liberado");
  }
});

// login admin
btnAdmin.addEventListener("click", async () => {
  const senha = prompt("Digite a senha do administrador:");
  if (senha !== SENHA_ADMIN) {
    alert("Senha incorreta");
    return;
  }

  areaAdmin.style.display = "block";
  btnAdmin.style.display = "none";
  carregarAdmin();
});

// sair admin
btnSairAdmin.addEventListener("click", () => {
  areaAdmin.style.display = "none";
  btnAdmin.style.display = "block";
});

// carregar agenda + histórico
async function carregarAdmin() {
  listaAg.innerHTML = "";
  listaHist.innerHTML = "";

  const agora = new Date();
  agora.setSeconds(0, 0);

  const snapshot = await db.collection("agendamentos").get();

  if (snapshot.empty) {
    listaAg.innerHTML = "<li>Nenhum agendamento encontrado</li>";
    return;
  }

  snapshot.forEach(doc => {
    const a = doc.data();

    const [A, M, D] = a.data.split("-").map(Number);
    const [H, Mi] = a.hora.split(":").map(Number);
    const dataHora = new Date(A, M - 1, D, H, Mi);

    const li = document.createElement("li");
    li.innerHTML = `
      📅 ${a.data} ⏰ ${a.hora}<br>
      👤 ${a.nome}<br>
      ✂️ ${a.servico} — R$ ${a.preco}
    `;

    if (dataHora >= agora) {
      const btn = document.createElement("button");
      btn.textContent = "❌ Remover";

      btn.addEventListener("click", async () => {
        if (!confirm("Remover este agendamento?")) return;
        await db.collection("agendamentos").doc(doc.id).delete();
        carregarAdmin();
      });

      li.appendChild(btn);
      listaAg.appendChild(li);
    } else {
      li.style.opacity = "0.6";
      listaHist.appendChild(li);
    }
  });
}

// relatório do dia
btnRel.addEventListener("click", async () => {
  const hoje = new Date().toISOString().split("T")[0];
  const snap = await db.collection("agendamentos").where("data", "==", hoje).get();

  if (snap.empty) {
    alert("Nenhum atendimento hoje");
    return;
  }

  let total = 0;
  let texto = `📊 RELATÓRIO DO DIA\n📅 ${hoje}\n\n`;

  snap.forEach(d => {
    const a = d.data();
    texto += `⏰ ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}\n`;
    total += Number(a.preco);
  });

  texto += `\n💰 Total do dia: R$ ${total}`;

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`);
});


/* ===== BOTÃO INSTALAR APP (PWA) ===== */
let deferredPrompt = null;
const btnInstalar = $("btnInstalar");

btnInstalar.style.display = "none";

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstalar.style.display = "block";
});

btnInstalar.onclick = async () => {
  if (!deferredPrompt) return alert("Instalação indisponível agora");
  deferredPrompt.prompt();
  const res = await deferredPrompt.userChoice;
  if (res.outcome === "accepted") btnInstalar.style.display = "none";
  deferredPrompt = null;
};

window.addEventListener("appinstalled", () => {
  btnInstalar.style.display = "none";
});
const btnLimparHistorico = document.getElementById("btnLimparHistorico");

if (btnLimparHistorico) {
  btnLimparHistorico.addEventListener("click", async () => {

    if (!confirm("Apagar TODO o histórico? Essa ação não pode ser desfeita.")) {
      return;
    }

    const agora = new Date();
    agora.setSeconds(0, 0);

    const snapshot = await db.collection("agendamentos").get();

    const batch = db.batch();
    let apagou = false;

    snapshot.forEach(doc => {
      const a = doc.data();
      const [A, M, D] = a.data.split("-").map(Number);
      const [H, Mi] = a.hora.split(":").map(Number);
      const dataHora = new Date(A, M - 1, D, H, Mi);

      // só apaga históricos (passados)
      if (dataHora < agora) {
        batch.delete(doc.ref);
        apagou = true;
      }
    });

    if (!apagou) {
      alert("Nenhum histórico para apagar.");
      return;
    }

    await batch.commit();
    alert("Histórico apagado com sucesso!");
    carregarAdmin();

  });
}
});