document.addEventListener("DOMContentLoaded", () => {

/* ===== CONFIG ===== */
const WHATSAPP = "5535998066403";
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

/* ===============================
   🔐 VERIFICAÇÃO DE WHATSAPP (30 DIAS)
================================== */
const divVerificacao = $("verificacaoTelefone");
const btnConfirmarTelefone = $("btnConfirmarTelefone");
const inputTelefoneVerificacao = $("telefoneVerificacao");
const formAgendamento = $("formAgendamento");

const LIMITE = 1000 * 60 * 60 * 24 * 30; // 30 dias
const dadosSalvos = localStorage.getItem("verificacaoWhats");

if (dadosSalvos) {
  const dados = JSON.parse(dadosSalvos);
  if (Date.now() - dados.data < LIMITE) {
    divVerificacao.style.display = "none";
    formAgendamento.style.display = "block";
  } else {
    localStorage.removeItem("verificacaoWhats");
    divVerificacao.style.display = "block";
    formAgendamento.style.display = "none";
  }
} else {
  divVerificacao.style.display = "block";
  formAgendamento.style.display = "none";
}

btnConfirmarTelefone.addEventListener("click", () => {
  const telefone = inputTelefoneVerificacao.value.replace(/\D/g, "");

  if (telefone.length < 10 || telefone.length > 11) {
    alert("Digite um WhatsApp válido com DDD");
    return;
  }

  localStorage.setItem("verificacaoWhats", JSON.stringify({
    telefone,
    data: Date.now()
  }));

  window.open(
    `https://wa.me/55${telefone}?text=${encodeURIComponent(
      "✅ Número confirmado para agendamento na Barbearia Madruga"
    )}`,
    "_blank"
  );

  divVerificacao.style.display = "none";
  formAgendamento.style.display = "block";
});

/* ===============================
   📅 AGENDAMENTO
================================== */
const horariosDiv = $("horarios");
const horaInput = $("hora");
const dataInput = $("data");
const precoInput = $("preco");

const hoje = new Date();
hoje.setHours(0,0,0,0);
dataInput.min = hoje.toISOString().split("T")[0];

$("servico").addEventListener("change", e => {
  precoInput.value = servicos[e.target.value]
    ? `R$ ${servicos[e.target.value]}`
    : "";
});

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

    const hora = String(h).padStart(2,"0") + ":00";
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

formAgendamento.addEventListener("submit", async e => {
  e.preventDefault();

  if (!horaInput.value) {
    alert("Selecione um horário");
    return;
  }

  const dados = localStorage.getItem("verificacaoWhats");
  if (!dados) {
    alert("Confirme seu WhatsApp para continuar");
    location.reload();
    return;
  }

  const { telefone } = JSON.parse(dados);

  await db.collection("agendamentos").add({
    nome: $("nome").value,
    telefone,
    data: dataInput.value,
    hora: horaInput.value,
    servico: $("servico").value,
    preco: servicos[$("servico").value],
    criadoEm: new Date()
  });

  window.open(
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
`📌 NOVO AGENDAMENTO
👤 ${$("nome").value}
📅 ${dataInput.value}
⏰ ${horaInput.value}
✂️ ${$("servico").value}`
    )}`
  );

  alert("Agendamento confirmado!");
  formAgendamento.reset();
  horariosDiv.innerHTML = "";
  precoInput.value = "";
});

});