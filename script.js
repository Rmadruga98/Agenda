document.addEventListener("DOMContentLoaded", () => {
  // ===== CONSTANTES =====
  const WHATSAPP_BARBEARIA = "5535998066403";
  const SENHA_ADMIN = "madruga123";

  // ===== ELEMENTOS =====
  const form = document.getElementById("formAgendamento");
  const listaAgendamentos = document.getElementById("listaAgendamentos");
  const listaHistorico = document.getElementById("listaHistorico");
  const mensagem = document.getElementById("mensagem");
  const selectServico = document.getElementById("servico");
  const selectHora = document.getElementById("hora");
  const inputPreco = document.getElementById("preco");
  const inputData = document.getElementById("data");
  const nomeInput = document.getElementById("nome");
  const telefoneInput = document.getElementById("telefone");
  const btnLembreteBarbearia = document.getElementById("btnLembreteBarbearia");
  const btnLimparHistorico = document.getElementById("btnLimparHistorico");
  const btnRelatorioDiario = document.getElementById("btnRelatorioDiario");

  const titulo = document.querySelector("h1");
  const tituloAgenda = document.getElementById("tituloAgenda");
  const tituloHistorico = document.getElementById("tituloHistorico");

  // ===== CONTROLE ADMIN =====
function mostrarAreaAdmin() {
  tituloAgenda.style.display = "block";
  listaAgendamentos.style.display = "block";
  tituloHistorico.style.display = "block";
  listaHistorico.style.display = "block";
  btnLimparHistorico.style.display = "block";
  btnRelatorioDiario.style.display = "block"; // 👈 AQUI
}

function esconderAreaAdmin() {
  tituloAgenda.style.display = "none";
  listaAgendamentos.style.display = "none";
  tituloHistorico.style.display = "none";
  listaHistorico.style.display = "none";
  btnLimparHistorico.style.display = "none";
  btnRelatorioDiario.style.display = "none"; // 👈 AQUI
}

  // Começa SEMPRE como cliente
  esconderAreaAdmin();

  // ===== PREÇOS =====
const servicos = {
  "Corte Degradê": { preco: 35, duracao: 45 },
  "Corte Navalhado": { preco: 38, duracao: 50 },
  "Barba": { preco: 20, duracao: 30 },
  "Corte + Barba": { preco: 55, duracao: 60 },
  "Sobrancelha": { preco: 10, duracao: 15 },
  "Pezinho": { preco: 20, duracao: 15 },
  "Corte + Barba + Sobrancelha": { preco: 60, duracao: 80 },
  "Pigmentação + Corte": { preco: 60, duracao: 90 },
  "Luzes + Corte": { preco: 75, duracao: 120 },
  "Platinado + Corte": { preco: 110, duracao: 180 }
};

  // ===== HORÁRIOS =====
function gerarHorarios() {
  const h = [];
  for (let i = 8; i < 19; i++) {
    h.push(`${String(i).padStart(2,"0")}:00`);
  }
  return h;
}

  function carregarHorarios() {
    selectHora.innerHTML = `<option disabled selected>Selecione um horário</option>`;
    if (!inputData.value) return;

    const dataSelecionada = inputData.value;
    const agora = new Date();
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

    gerarHorarios().forEach(hora => {
      const dataHora = new Date(`${dataSelecionada}T${hora}`);
      if (dataHora <= agora) return;

      const ocupado = agendamentos.some(a =>
        a.dataISO === dataSelecionada && a.hora === hora
      );
      if (ocupado) return;

      const op = document.createElement("option");
      op.value = hora;
      op.textContent = hora;
      selectHora.appendChild(op);
    });
  }

  inputData.addEventListener("change", carregarHorarios);

  // ===== PREÇO AUTOMÁTICO =====
  selectServico.addEventListener("change", () => {
  if (servicos[selectServico.value]) {
  inputPreco.value = `R$ ${servicos[selectServico.value].preco}`;
}
  });

  // ===== FORMATAR DATA =====
  function formatarData(dataISO) {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const d = new Date(dataISO + "T00:00");
    return `${dias[d.getDay()]} • ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  // ===== CALCULAR HORA FINAL DO SERVIÇO =====
function calcularHoraFim(horaInicio, duracaoMin) {
  const [h, m] = horaInicio.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m + duracaoMin, 0, 0);
  return d.toTimeString().slice(0,5);
}

  // ===== SALVAR AGENDAMENTO =====
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!selectHora.value) return alert("Selecione um horário");

const agendamento = {
  nome: nome.value,
  telefone: telefone.value,
  dataISO: inputData.value,
  data: formatarData(inputData.value),
  hora: selectHora.value,
  servico: selectServico.value,
  preco: servicos[selectServico.value].preco,
  duracao: servicos[selectServico.value].duracao
};

    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
    lista.push(agendamento);
    localStorage.setItem("agendamentos", JSON.stringify(lista));

    mensagem.textContent = "✅ Agendamento confirmado!";
    mensagem.style.color = "lime";

    enviarWhatsappCliente(agendamento);
    carregarAgendamentos();

    form.reset();
    inputPreco.value = "";
    carregarHorarios();
  });

  // ===== LISTAGEM =====
  function carregarAgendamentos() {
    listaAgendamentos.innerHTML = "";
    listaHistorico.innerHTML = "";

    const agora = new Date();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    lista
      .sort((a, b) => new Date(`${a.dataISO}T${a.hora}`) - new Date(`${b.dataISO}T${b.hora}`))
      .forEach(a => {
        const dh = new Date(`${a.dataISO}T${a.hora}`);
        const li = document.createElement("li");
        li.textContent = `${a.data} | ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}`;

        if (dh > agora) {
          listaAgendamentos.appendChild(li);
        } else {
          li.classList.add("realizado");
          listaHistorico.appendChild(li);
        }
      });
  }

  // ===== WHATSAPP CLIENTE =====
  function enviarWhatsappCliente(a) {
    const tel = a.telefone.replace(/\D/g, "");
    const msg = `
💈 Barbearia Madruga

Olá, ${a.nome}! 👋
📅 ${a.data}
⏰ ${a.hora}
✂️ ${a.servico}
💰 R$ ${a.preco}
`;
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ===== BOTÕES =====
  if (btnLembreteBarbearia) {
    btnLembreteBarbearia.addEventListener("click", () => {
      const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
      if (!lista.length) return alert("Nenhum agendamento encontrado.");
      const a = lista[lista.length - 1];

      const msg = `
📌 NOVO AGENDAMENTO
👤 ${a.nome}
📞 ${a.telefone}
📅 ${a.data}
⏰ ${a.hora}
✂️ ${a.servico}
💰 R$ ${a.preco}
`;
      window.open(`https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(msg)}`, "_blank");
    });
  }

  if (btnLimparHistorico) {
    btnLimparHistorico.addEventListener("click", () => {
      if (!confirm("Deseja apagar o histórico?")) return;
      const agora = new Date();
      const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
      const nova = lista.filter(a => new Date(`${a.dataISO}T${a.hora}`) > agora);
      localStorage.setItem("agendamentos", JSON.stringify(nova));
      carregarAgendamentos();
      alert("Histórico apagado.");
    });
  }

  // ===== ATIVAR ADMIN =====
  let cliquesAdmin = 0;
  if (titulo) {
    titulo.addEventListener("click", () => {
      cliquesAdmin++;
      if (cliquesAdmin === 3) {
        cliquesAdmin = 0;
        const senha = prompt("Área restrita. Digite a senha:");
        if (senha !== SENHA_ADMIN) return alert("Senha incorreta.");

        const expira = Date.now() + 5 * 60 * 1000;
        localStorage.setItem("adminExpira", expira);
        mostrarAreaAdmin();
        setTimeout(desativarAdmin, 5 * 60 * 1000);
        alert("Modo administrador ativado por 5 minutos.");
      }
    });
  }

  function desativarAdmin() {
    esconderAreaAdmin();
    localStorage.removeItem("adminExpira");
  }

  const expiraSalvo = localStorage.getItem("adminExpira");
  if (expiraSalvo && Date.now() < expiraSalvo) {
    mostrarAreaAdmin();
    setTimeout(desativarAdmin, expiraSalvo - Date.now());
  }

// ===== RELATÓRIO DIÁRIO DETALHADO =====
if (btnRelatorioDiario) {
  btnRelatorioDiario.addEventListener("click", () => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    let totalClientes = 0;
    let faturamento = 0;
    const servicosRealizados = {};

    lista.forEach(a => {
      const dataAg = new Date(`${a.dataISO}T${a.hora}`);
      dataAg.setHours(0,0,0,0);

      if (dataAg.getTime() === hoje.getTime()) {
        totalClientes++;
        faturamento += Number(a.preco);

        // conta serviços
        servicosRealizados[a.servico] =
          (servicosRealizados[a.servico] || 0) + 1;
      }
    });

    if (!totalClientes) {
      alert("Nenhum atendimento realizado hoje.");
      return;
    }

    let listaServicos = "";
    for (let s in servicosRealizados) {
      listaServicos += `• ${s}: ${servicosRealizados[s]}\n`;
    }

    const dataFormatada = hoje.toLocaleDateString("pt-BR");

    const msg = `
📊 RELATÓRIO DO DIA – ${dataFormatada}

👥 Clientes atendidos: ${totalClientes}
💰 Faturamento total: R$ ${faturamento}

✂️ Serviços realizados:
${listaServicos}

💈 Barbearia Madruga
`;

    window.open(
      `https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  });
}

  // ===== SERVICE WORKER =====
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
  
  carregarHorarios();
  carregarAgendamentos();
  let deferredPrompt;
const btnInstalar = document.getElementById("btnInstalar");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (btnInstalar) {
    btnInstalar.style.display = "block";
  }
});

if (btnInstalar) {
  btnInstalar.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    deferredPrompt = null;
    btnInstalar.style.display = "none";
  });
}
});