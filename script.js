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
  const tabelaPrecos = {
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

  // ===== HORÁRIOS =====
  function gerarHorarios() {
    const h = [];
    for (let i = 8; i < 19; i++) {
      h.push(`${String(i).padStart(2, "0")}:00`);
      h.push(`${String(i).padStart(2, "0")}:30`);
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
    inputPreco.value = `R$ ${tabelaPrecos[selectServico.value] || ""}`;
  });

  // ===== FORMATAR DATA =====
  function formatarData(dataISO) {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const d = new Date(dataISO + "T00:00");
    return `${dias[d.getDay()]} • ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  // ===== SALVAR AGENDAMENTO =====
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!selectHora.value) return alert("Selecione um horário");

    const agendamento = {
      nome: nomeInput.value,
      telefone: telefoneInput.value,
      dataISO: inputData.value,
      data: formatarData(inputData.value),
      hora: selectHora.value,
      servico: selectServico.value,
      preco: tabelaPrecos[selectServico.value]
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

  // ===== RELATÓRIO DIÁRIO =====
  if (btnRelatorioDiario) {
    btnRelatorioDiario.addEventListener("click", () => {
      const hoje = new Date().toDateString();
      const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

      let total = 0;
      let valor = 0;

      lista.forEach(a => {
        if (new Date(a.dataISO).toDateString() === hoje) {
          total++;
          valor += Number(a.preco);
        }
      });

      if (!total) return alert("Nenhum atendimento hoje.");

      const msg = `
📊 RELATÓRIO DO DIA
👥 Clientes: ${total}
💰 Total: R$ ${valor}
`;
      window.open(`https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(msg)}`, "_blank");
    });
  }

  // ===== SERVICE WORKER =====
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
  
  carregarHorarios();
  carregarAgendamentos();
});