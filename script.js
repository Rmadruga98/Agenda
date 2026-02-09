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

const horarios = $("horarios");
const horaInput = $("hora");
const dataInput = $("data");
const precoInput = $("preco");
const form = $("formAgendamento");

/* PREÇO */
$("servico").onchange = e => {
  precoInput.value = servicos[e.target.value]
    ? `R$ ${servicos[e.target.value]}`
    : "";
};

/* HORÁRIOS */
async function carregarHorarios(data) {
  horarios.innerHTML = "";
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
      document.querySelectorAll(".hora-btn").forEach(b => b.classList.remove("ativa"));
      btn.classList.add("ativa");
      horaInput.value = hora;
    };

    horarios.appendChild(btn);
  }
}

dataInput.onchange = () => {
  if (dataInput.value) carregarHorarios(dataInput.value);
};

/* AGENDAR */
form.onsubmit = async e => {
  e.preventDefault();
  if (!horaInput.value) return alert("Selecione um horário");

  const ag = {
    nome: $("nome").value,
    telefone: $("telefone").value,
    data: dataInput.value,
    hora: horaInput.value,
    servico: $("servico").value,
    preco: servicos[$("servico").value]
  };

  await db.collection("agendamentos").add(ag);

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    `📌 AGENDAMENTO\n👤 ${ag.nome}\n📅 ${ag.data}\n⏰ ${ag.hora}\n✂️ ${ag.servico}\n💰 R$ ${ag.preco}`
  )}`);

  alert("Agendamento confirmado!");
  form.reset();
  horarios.innerHTML = "";
  precoInput.value = "";
};

/* ADMIN */
const btnAdmin = $("btnAdmin");
const areaAdmin = $("areaAdmin");
const btnSair = $("btnSairAdmin");
const listaAg = $("listaAgendamentos");
const listaHist = $("listaHistorico");

let clicks = 0;
$("h1").onclick = () => {
  clicks++;
  if (clicks === 5) {
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
  const snap = await db.collection("agendamentos").get();

  snap.forEach(doc => {
    const a = doc.data();
    const [y,m,d] = a.data.split("-").map(Number);
    const [h,mi] = a.hora.split(":").map(Number);
    const dataHora = new Date(y, m-1, d, h, mi);

    const li = document.createElement("li");
    li.innerHTML = `📅 ${a.data} ⏰ ${a.hora}<br>👤 ${a.nome}<br>✂️ ${a.servico} — R$ ${a.preco}`;

    if (dataHora >= agora) {
      const btn = document.createElement("button");
      btn.textContent = "❌ Remover";
      btn.onclick = async () => {
        if (confirm("Remover agendamento?")) {
          await db.collection("agendamentos").doc(doc.id).delete();
          carregarAdmin();
        }
      };
      li.appendChild(btn);
      listaAg.appendChild(li);
    } else {
      listaHist.appendChild(li);
    }
  });
}

});