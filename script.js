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

  const dia = new Date(data + "T00:00").getDay();
  if (dia === 0 || dia === 1) {
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
      document.querySelectorAll(".hora-btn")
        .forEach(b => b.classList.remove("ativa"));
      btn.classList.add("ativa");
      horaInput.value = hora;
    };

    horariosDiv.appendChild(btn);
  }
}

dataInput.addEventListener("change", () => {
  if (dataInput.value) carregarHorarios(dataInput.value);
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

/* ===== ÁREA ADMIN ===== */
const btnAdmin = $("btnAdmin");
const areaAdmin = $("areaAdmin");
const btnSair = $("btnSairAdmin");
const listaAg = $("listaAgendamentos");
const listaHist = $("listaHistorico");
const btnRel = $("btnRelatorioDiario");

let taps = 0;
$("h1").onclick = () => {
  if (++taps === 5) {
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
  agora.setSeconds(0,0);

  const snap = await db.collection("agendamentos").get();

  snap.forEach(doc => {
    const a = doc.data();
    const [A,M,D] = a.data.split("-").map(Number);
    const [H,Mi] = a.hora.split(":").map(Number);
    const dataHora = new Date(A, M-1, D, H, Mi);

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
        await db.collection("agendamentos").doc(doc.id).delete();
        carregarAdmin();
      };
      li.appendChild(btn);
      listaAg.appendChild(li);
    } else {
      listaHist.appendChild(li);
    }
  });
}

/* ===== RELATÓRIO ===== */
btnRel.onclick = async () => {
  const hoje = new Date().toISOString().split("T")[0];
  const snap = await db.collection("agendamentos")
    .where("data", "==", hoje)
    .get();

  if (snap.empty) return alert("Nenhum atendimento hoje");

  let total = 0;
  let txt = `📊 RELATÓRIO DO DIA\n📅 ${hoje}\n\n`;

  snap.forEach(d => {
    const a = d.data();
    txt += `⏰ ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}\n`;
    total += Number(a.preco);
  });

  txt += `\n💰 Total: R$ ${total}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`);
};

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

});