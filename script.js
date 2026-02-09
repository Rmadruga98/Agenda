document.addEventListener("DOMContentLoaded", () => {

const WHATSAPP = "5535998066403";
const SENHA_ADMIN = "madruga123";
const HORA_ABERTURA = 8;
const HORA_FECHAMENTO = 19;

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

/* ================= AGENDAMENTO ================= */

const horariosDiv = $("horarios");
const horaInput = $("hora");
const dataInput = $("data");
const precoInput = $("preco");
const form = $("formAgendamento");

$("servico").addEventListener("change", e => {
  precoInput.value = servicos[e.target.value]
    ? `R$ ${servicos[e.target.value]}`
    : "";
});

async function carregarHorarios(data) {
  horariosDiv.innerHTML = "";
  horaInput.value = "";

  const diaSemana = new Date(data + "T00:00").getDay();
  if (diaSemana === 0 || diaSemana === 1) {
    alert("Não atendemos domingo e segunda");
    dataInput.value = "";
    return;
  }

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
      document.querySelectorAll(".hora-btn").forEach(b => b.classList.remove("ativa"));
      btn.classList.add("ativa");
      horaInput.value = hora;
    };

    horariosDiv.appendChild(btn);
  }
}

dataInput.addEventListener("change", () => {
  if (dataInput.value) carregarHorarios(dataInput.value);
});

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
📅 ${ag.data}
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

/* ================= ADMIN ================= */

const btnAdmin = $("btnAdmin");
const areaAdmin = $("areaAdmin");
const btnSair = $("btnSairAdmin");
const listaAg = $("listaAgendamentos");
const listaHist = $("listaHistorico");
const btnRel = $("btnRelatorioDiario");

let taps = 0;
document.querySelector("h1").onclick = () => {
  taps++;
  if (taps === 5) {
    btnAdmin.style.display = "block";
    alert("Modo administrador liberado");
  }
};

btnAdmin.onclick = () => {
  if (prompt("Senha admin:") !== SENHA_ADMIN) return alert("Senha incorreta");
  areaAdmin.style.display = "block";
  btnAdmin.style.display = "none";
  carregarAdmin();
};

btnSair.onclick = () => {
  areaAdmin.style.display = "none";
  btnAdmin.style.display = "block";
};

async function carregarAdmin() {
  listaAg.innerHTML = "";
  listaHist.innerHTML = "";

  const agora = new Date();

  const snapshot = await db.collection("agendamentos").get();

  if (snapshot.empty) {
    listaAg.innerHTML = "<li>Nenhum agendamento</li>";
    return;
  }

  snapshot.forEach(doc => {
    const a = doc.data();

    const [ano, mes, dia] = a.data.split("-").map(Number);
    const [h, m] = a.hora.split(":").map(Number);
    const dataHora = new Date(ano, mes - 1, dia, h, m);

    const li = document.createElement("li");
    li.innerHTML = `
📅 ${a.data} ⏰ ${a.hora}<br>
👤 ${a.nome}<br>
✂️ ${a.servico} — R$ ${a.preco}
`;

    if (dataHora >= agora) {
      const btn = document.createElement("button");
      btn.textContent = "❌ Remover";
      btn.onclick = async () => {
        if (!confirm("Remover agendamento?")) return;
        await db.collection("agendamentos").doc(doc.id).delete();
        carregarAdmin();
      };
      li.appendChild(btn);
      listaAg.appendChild(li);
    } else {
      li.style.opacity = "0.6";
      listaHist.appendChild(li);
    }
  });
}

/* ================= RELATÓRIO ================= */

btnRel.onclick = async () => {
  const hoje = new Date().toISOString().split("T")[0];

  const snap = await db.collection("agendamentos")
    .where("data", "==", hoje)
    .get();

  if (snap.empty) return alert("Nenhum atendimento hoje");

  let total = 0;
  let texto = `📊 RELATÓRIO DO DIA\n📅 ${hoje}\n\n`;

  snap.forEach(d => {
    const a = d.data();
    texto += `⏰ ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}\n`;
    total += Number(a.preco);
  });

  texto += `\n💰 Total: R$ ${total}`;

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`);
};

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

  // 🔊 TOCAR SOM
  const som = document.getElementById("somConfirmacao");
  if (som) {
    som.currentTime = 0;
    som.play().catch(() => {});
  }

  // 📳 Vibração (se suportado)
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }

  setTimeout(() => {
    overlay.remove();
  }, 1800);
}
// ===== BOTÃO INSTALAR PWA =====
let deferredPrompt;
const btnInstalar = document.getElementById("btnInstalar");

if (btnInstalar) {
  btnInstalar.style.display = "none";

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstalar.style.display = "block";
  });

  btnInstalar.addEventListener("click", async () => {
    if (!deferredPrompt) {
      alert("Instalação disponível apenas após publicar o site.");
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstalar.style.display = "none";
  });
}
});