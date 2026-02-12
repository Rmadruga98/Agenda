document.addEventListener("DOMContentLoaded", () => {

/* ================= CONFIG ================= */
const WHATSAPP = "5535998066403";
const SENHA_ADMIN = "madruga123";
const HORA_ABERTURA = 8;
const HORA_FECHAMENTO = 19;

/* ================= SERVIÇOS ================= */
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

/* ================= VERIFICAÇÃO WHATS (30 DIAS) ================= */
const divVerificacao = $("verificacaoTelefone");
const btnConfirmarTelefone = $("btnConfirmarTelefone");
const inputTelefoneVerificacao = $("telefoneVerificacao");
const formAgendamento = $("formAgendamento");

const LIMITE = 1000 * 60 * 60 * 24 * 30;
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

btnConfirmarTelefone.onclick = e => {
  e.preventDefault();
  const telefone = inputTelefoneVerificacao.value.replace(/\D/g, "");
  if (telefone.length < 10 || telefone.length > 11) {
    alert("Digite um WhatsApp válido");
    return;
  }

  localStorage.setItem("verificacaoWhats", JSON.stringify({
    telefone,
    data: Date.now()
  }));

  window.open(`https://wa.me/55${telefone}`, "_blank");

  divVerificacao.style.display = "none";
  formAgendamento.style.display = "block";
};

/* ================= AGENDAMENTO ================= */
const horariosDiv = $("horarios");
const horaInput = $("hora");
const dataInput = $("data");
const precoInput = $("preco");

const hoje = new Date();
hoje.setHours(0,0,0,0);
dataInput.min = hoje.toISOString().split("T")[0];

$("servico").onchange = e => {
  precoInput.value = servicos[e.target.value]
    ? `R$ ${servicos[e.target.value]}`
    : "";
};

async function carregarHorarios(data) {
  horariosDiv.innerHTML = "";
  horaInput.value = "";

  // ===== DATAS LIBERADAS MANUALMENTE =====
const datasLiberadas = [
  "2026-02-15"
];

const dia = new Date(data + "T00:00").getDay();

// Se for exceção, libera mesmo sendo domingo ou segunda
if (!datasLiberadas.includes(data)) {
  if (dia === 0 || dia === 1) {
    alert("Não atendemos domingo e segunda");
    dataInput.value = "";
    return;
  }
}

  const snap = await db.collection("agendamentos").where("data","==",data).get();
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

dataInput.onchange = () => {
  if (dataInput.value) carregarHorarios(dataInput.value);
};

formAgendamento.onsubmit = async e => {
  e.preventDefault();
  if (!horaInput.value) return alert("Selecione um horário");

  const { telefone } = JSON.parse(localStorage.getItem("verificacaoWhats"));

  const agendamento = {
    nome: $("nome").value,
    telefone,
    data: dataInput.value,
    hora: horaInput.value,
    servico: $("servico").value,
    preco: servicos[$("servico").value],
    criadoEm: new Date()
  };

  // salva no Firestore
  await db.collection("agendamentos").add(agendamento);
  
  function formatarDataCompleta(dataISO) {
  const dias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
  ];

  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);

  const diaSemana = dias[data.getDay()];
  const dataBR = data.toLocaleDateString("pt-BR");

  return `${diaSemana} - ${dataBR}`;
}

  // 🔥 ENVIA PARA O WHATSAPP DA BARBEARIA
  const msgBarbearia = `
* NOVO AGENDAMENTO 
👤 ${agendamento.nome}
📱 ${agendamento.telefone}
📅 ${formatarDataCompleta(agendamento.data)}
⏰ ${agendamento.hora}
✂️ ${agendamento.servico}
💰 R$ ${agendamento.preco}

⚠️ *Observação:*
Cancelamentos avisar com no mínimo 1hra de ANTECEDÊNCIA.
`;

  window.open(
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msgBarbearia)}`,
    "_blank"
  );

  alert("Agendamento confirmado!");

  formAgendamento.reset();
  horariosDiv.innerHTML = "";
  precoInput.value = "";
};

/* ================= ADMIN ================= */
const btnAdmin = $("btnAdmin");
const areaAdmin = $("areaAdmin");
const btnSairAdmin = $("btnSairAdmin");
const listaAg = $("listaAgendamentos");
const listaHist = $("listaHistorico");

let taps = 0;
document.querySelector("h1").onclick = () => {
  if (++taps === 5) {
    btnAdmin.style.display = "block";
    alert("Modo administrador liberado");
  }
};

btnAdmin.onclick = () => {
  if (prompt("Senha admin:") !== SENHA_ADMIN) return;
  areaAdmin.style.display = "block";
  btnAdmin.style.display = "none";
  carregarAdmin();
};

btnSairAdmin.onclick = () => {
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
    const [A,M,D] = a.data.split("-").map(Number);
    const [H,Mi] = a.hora.split(":").map(Number);
    const dataHora = new Date(A,M-1,D,H,Mi);

    const li = document.createElement("li");
    li.innerHTML = `${a.data} ${a.hora}<br>${a.nome}`;

    if (dataHora >= agora) {
      const btn = document.createElement("button");
      btn.textContent = "Remover";
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

/* ================= PWA – INSTALAR APP ================= */
let deferredPrompt;
const btnInstalar = $("btnInstalar");
btnInstalar.style.display = "none";

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstalar.style.display = "block";
});

btnInstalar.onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const res = await deferredPrompt.userChoice;
  if (res.outcome === "accepted") btnInstalar.style.display = "none";
  deferredPrompt = null;
};

window.addEventListener("appinstalled", () => {
  btnInstalar.style.display = "none";
});
/* ================= LIMPAR HISTÓRICO ================= */

const btnLimparHistorico = document.getElementById("btnLimparHistorico");

if (btnLimparHistorico) {
  btnLimparHistorico.addEventListener("click", async () => {

    if (!confirm("Apagar TODO o histórico? Essa ação não pode ser desfeita.")) {
      return;
    }

    try {

      const agora = new Date();
      agora.setSeconds(0, 0);

      const snapshot = await db.collection("agendamentos").get();

      if (snapshot.empty) {
        alert("Nenhum histórico encontrado.");
        return;
      }

      const batch = db.batch();
      let apagou = false;

      snapshot.forEach(doc => {
        const a = doc.data();

        if (!a.data || !a.hora) return;

        const [A, M, D] = a.data.split("-").map(Number);
        const [H, Mi] = a.hora.split(":").map(Number);
        const dataHora = new Date(A, M - 1, D, H, Mi);

        // só apaga agendamentos PASSADOS
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

    } catch (erro) {
      console.error("Erro ao apagar histórico:", erro);
      alert("Erro ao apagar histórico. Veja o console.");
    }

  });
}

});