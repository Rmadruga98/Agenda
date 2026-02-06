document.addEventListener("DOMContentLoaded", () => {

  /* ===== CONFIG ===== */
  const WHATSAPP_BARBEARIA = "5535998066403";
  const SENHA_ADMIN = "madruga123";
  const HORA_ABERTURA = 8;
  const HORA_FECHAMENTO = 19;

  let adminAtivo = false;

  /* ===== ELEMENTOS ===== */
  const form = document.getElementById("formAgendamento");
  const inputData = document.getElementById("data");
  const inputHora = document.getElementById("hora");
  const horariosContainer = document.getElementById("horarios");
  const selectServico = document.getElementById("servico");
  const inputPreco = document.getElementById("preco");
  const mensagem = document.getElementById("mensagem");

  const listaAgendamentos = document.getElementById("listaAgendamentos");
  const listaHistorico = document.getElementById("listaHistorico");

  const btnLimparHistorico = document.getElementById("btnLimparHistorico");
  const btnRelatorioDiario = document.getElementById("btnRelatorioDiario");
  const btnInstalar = document.getElementById("btnInstalar");

  const titulo = document.querySelector("h1");
  const tituloAgenda = document.getElementById("tituloAgenda");
  const tituloHistorico = document.getElementById("tituloHistorico");

  /* ===== SERVIÇOS ===== */
  const servicos = {
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

  /* ===== ADMIN UI ===== */
  function esconderAdmin() {
    tituloAgenda.style.display = "none";
    listaAgendamentos.style.display = "none";
    tituloHistorico.style.display = "none";
    listaHistorico.style.display = "none";
    btnLimparHistorico.style.display = "none";
    btnRelatorioDiario.style.display = "none";
  }

  function mostrarAdmin() {
    tituloAgenda.style.display = "block";
    listaAgendamentos.style.display = "block";
    tituloHistorico.style.display = "block";
    listaHistorico.style.display = "block";
    btnLimparHistorico.style.display = "block";
    btnRelatorioDiario.style.display = "block";
  }

  esconderAdmin();

  /* ===== HORÁRIOS ===== */
  function renderizarHorarios(data) {
    horariosContainer.innerHTML = "";
    inputHora.value = "";

    const dia = new Date(data + "T00:00").getDay();
    if (dia === 0 || dia === 1) {
      mensagem.textContent = "❌ Não atendemos domingo e segunda";
      mensagem.style.color = "red";
      inputData.value = "";
      return;
    }

    const agora = new Date();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
      const hora = `${String(h).padStart(2,"0")}:00`;
      const dataHora = new Date(`${data}T${hora}`);

      if (dataHora <= agora) continue;
      if (lista.some(a => a.dataISO === data && a.hora === hora)) continue;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hora-btn";
      btn.textContent = hora;

      btn.onclick = () => {
        document.querySelectorAll(".hora-btn").forEach(b => b.classList.remove("ativa"));
        btn.classList.add("ativa");
        inputHora.value = hora;
      };

      horariosContainer.appendChild(btn);
    }
  }

  inputData.addEventListener("change", () => {
    if (inputData.value) renderizarHorarios(inputData.value);
  });

  /* ===== PREÇO ===== */
  selectServico.addEventListener("change", () => {
    inputPreco.value = `R$ ${servicos[selectServico.value] || ""}`;
  });

  /* ===== FORMATAR DATA ===== */
  function formatarData(d) {
    const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    const dt = new Date(d + "T00:00");
    return `${dias[dt.getDay()]} • ${dt.toLocaleDateString("pt-BR")}`;
  }

  /* ===== SUBMIT ===== */
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!inputHora.value) return alert("Selecione um horário");

    const agendamento = {
      nome: nome.value,
      telefone: telefone.value,
      dataISO: inputData.value,
      data: formatarData(inputData.value),
      hora: inputHora.value,
      servico: selectServico.value,
      preco: servicos[selectServico.value]
    };

    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
    lista.push(agendamento);
    localStorage.setItem("agendamentos", JSON.stringify(lista));

    window.open(`https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(
`📌 NOVO AGENDAMENTO
👤 ${agendamento.nome}
📞 ${agendamento.telefone}
📅 ${agendamento.data}
⏰ ${agendamento.hora}
✂️ ${agendamento.servico}
💰 R$ ${agendamento.preco}`)}`, "_blank");

    mensagem.textContent = "✅ Agendamento confirmado!";
    mensagem.style.color = "lime";

    form.reset();
    inputPreco.value = "";
    horariosContainer.innerHTML = "";
    carregarAgendamentos();
  });

  /* ===== LISTAGEM ===== */
  function carregarAgendamentos() {
    listaAgendamentos.innerHTML = "";
    listaHistorico.innerHTML = "";

    const agora = new Date();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    lista.forEach((a, i) => {
      const dh = new Date(`${a.dataISO}T${a.hora}`);
      const li = document.createElement("li");
      li.textContent = `${a.data} | ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}`;

      if (dh > agora) {
        if (adminAtivo) {
          const btn = document.createElement("button");
          btn.textContent = "❌";
          btn.style.marginLeft = "10px";
          btn.onclick = () => {
            lista.splice(i, 1);
            localStorage.setItem("agendamentos", JSON.stringify(lista));
            carregarAgendamentos();
          };
          li.appendChild(btn);
        }
        listaAgendamentos.appendChild(li);
      } else {
        li.classList.add("realizado");
        listaHistorico.appendChild(li);
      }
    });
  }

  /* ===== LIMPAR HISTÓRICO ===== */
btnLimparHistorico.addEventListener("click", () => {
  if (!confirm("Deseja apagar apenas os atendimentos já realizados?")) return;

  const agora = new Date();

  const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

  const novaLista = lista.filter(a => {
    const dataHora = new Date(`${a.dataISO}T${a.hora}`);
    return dataHora > agora; // mantém apenas futuros
  });

  localStorage.setItem("agendamentos", JSON.stringify(novaLista));
  carregarAgendamentos();

  alert("Histórico antigo apagado com sucesso ✔");
});

  /* ===== ADMIN ===== */
  let cliques = 0;
  titulo.addEventListener("click", () => {
    cliques++;
    if (cliques === 3) {
      cliques = 0;
      if (prompt("Senha admin:") !== SENHA_ADMIN) return alert("Senha incorreta");
      adminAtivo = true;
      mostrarAdmin();
      carregarAgendamentos();
      setTimeout(() => {
        adminAtivo = false;
        esconderAdmin();
        carregarAgendamentos();
      }, 5 * 60 * 1000);
    }
  });

  /* ===== PWA ===== */
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstalar.style.display = "block";
  });

  btnInstalar.addEventListener("click", () => {
    deferredPrompt?.prompt();
    deferredPrompt = null;
    btnInstalar.style.display = "none";
  });

  carregarAgendamentos();
});