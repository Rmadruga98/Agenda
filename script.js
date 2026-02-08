document.addEventListener("DOMContentLoaded", () => {

  /* ===== CONFIG ===== */
  const SENHA_ADMIN = "madruga123";
  const WHATSAPP = "5535998066403";
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

  /* ===== ELEMENTOS ===== */
  const $ = id => document.getElementById(id);

  const titulo = document.querySelector("h1");
  const form = $("formAgendamento");
  const horariosContainer = $("horarios");
  const inputHora = $("hora");
  const inputData = $("data");
  const inputPreco = $("preco");

  const tituloAgenda = $("tituloAgenda");
  const listaAgendamentos = $("listaAgendamentos");
  const tituloHistorico = $("tituloHistorico");
  const listaHistorico = $("listaHistorico");
  const btnLimparHistorico = $("btnLimparHistorico");
  const btnRelatorioDiario = $("btnRelatorioDiario");

  /* ===== ADMIN ===== */
  function esconder(el) { if (el) el.style.display = "none"; }
  function mostrar(el) { if (el) el.style.display = "block"; }

  function esconderAdmin() {
    esconder(tituloAgenda);
    esconder(listaAgendamentos);
    esconder(tituloHistorico);
    esconder(listaHistorico);
    esconder(btnLimparHistorico);
    esconder(btnRelatorioDiario);
  }

  function mostrarAdmin() {
    mostrar(tituloAgenda);
    mostrar(listaAgendamentos);
    mostrar(tituloHistorico);
    mostrar(listaHistorico);
    mostrar(btnLimparHistorico);
    mostrar(btnRelatorioDiario);
  }

  esconderAdmin();

  /* ===== PREÇO ===== */
  $("servico").addEventListener("change", e => {
    inputPreco.value = "R$ " + (servicos[e.target.value] || "");
  });

  /* ===== HORÁRIOS ===== */
  function renderizarHorarios(data) {
    horariosContainer.innerHTML = "";
    inputHora.value = "";

    const dia = new Date(data + "T00:00").getDay();
    if (dia === 0 || dia === 1) {
      alert("Não atendemos domingo e segunda");
      inputData.value = "";
      return;
    }

    const agora = new Date();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {

      // ⛔ BLOQUEIA 12:00 (almoço)
      if (h === 12) continue;

      const hora = String(h).padStart(2, "0") + ":00";
      const dataHora = new Date(`${data}T${hora}`);
      if (dataHora <= agora) continue;

      const ocupado = lista.some(a => a.data === data && a.hora === hora);
      if (ocupado) continue;

      const btn = document.createElement("button");
      btn.type = "button"; // 🔒 nunca submete form
      btn.className = "hora-btn";
      btn.textContent = hora;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll(".hora-btn")
          .forEach(b => b.classList.remove("ativa"));

        btn.classList.add("ativa");
        inputHora.value = hora;
      });

      horariosContainer.appendChild(btn);
    }
  }

  inputData.addEventListener("change", () => {
    if (inputData.value) renderizarHorarios(inputData.value);
  });

  /* ===== AGENDAR ===== */
  form.addEventListener("submit", e => {
    e.preventDefault();

    if (!inputHora.value) {
      alert("Selecione um horário");
      return;
    }

    const agendamento = {
      nome: $("nome").value,
      telefone: $("telefone").value,
      data: inputData.value,
      hora: inputHora.value,
      servico: $("servico").value,
      preco: servicos[$("servico").value]
    };

    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
    lista.push(agendamento);
    localStorage.setItem("agendamentos", JSON.stringify(lista));

    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
`📌 NOVO AGENDAMENTO
👤 ${agendamento.nome}
📞 ${agendamento.telefone}
📅 ${agendamento.data}
⏰ ${agendamento.hora}
✂️ ${agendamento.servico}
💰 R$ ${agendamento.preco}`
      )}`,
      "_blank"
    );

    alert("Agendamento confirmado!");
    form.reset();
    horariosContainer.innerHTML = "";
    inputPreco.value = "";
    carregarAgendamentos();
  });

  /* ===== LISTAGEM ===== */
  function carregarAgendamentos() {
    listaAgendamentos.innerHTML = "";
    listaHistorico.innerHTML = "";

    const agora = new Date();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    lista.forEach((a, index) => {
      const dataHora = new Date(`${a.data}T${a.hora}`);
      const li = document.createElement("li");

      li.textContent = `${a.data} | ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}`;

      if (dataHora > agora) {
        const btn = document.createElement("button");
        btn.textContent = "❌";
        btn.style.marginLeft = "10px";

        btn.onclick = () => {
          if (!confirm("Deseja cancelar este agendamento?")) return;
          lista.splice(index, 1);
          localStorage.setItem("agendamentos", JSON.stringify(lista));
          carregarAgendamentos();
        };

        li.appendChild(btn);
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
      const dataHora = new Date(`${a.data}T${a.hora}`);
      return dataHora > agora;
    });

    localStorage.setItem("agendamentos", JSON.stringify(novaLista));
    carregarAgendamentos();
    alert("Histórico apagado com sucesso ✔");
  });

/* ===== RELATÓRIO DO DIA ===== */
if (btnRelatorioDiario) {
  btnRelatorioDiario.addEventListener("click", () => {

    const hoje = new Date().toISOString().split("T")[0];
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    const atendimentosHoje = lista.filter(a => a.data === hoje);

    if (atendimentosHoje.length === 0) {
      alert("Nenhum atendimento registrado para hoje.");
      return;
    }

    let total = 0;
    let texto = `📊 *RELATÓRIO DO DIA*\n📅 ${hoje}\n\n`;

    atendimentosHoje.forEach(a => {
      texto += `⏰ ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}\n`;
      total += Number(a.preco);
    });

    texto += `\n💰 *Total do dia:* R$ ${total}`;

    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`,
      "_blank"
    );
  });
}

  /* ===== ADMIN LOGIN ===== */
  let cliques = 0;
  titulo.addEventListener("click", () => {
    cliques++;
    if (cliques === 3) {
      cliques = 0;
      if (prompt("Senha admin:") === SENHA_ADMIN) {
        mostrarAdmin();
        carregarAgendamentos();
      } else {
        alert("Senha incorreta");
      }
    }
  });
/* ===== PWA - BOTÃO INSTALAR ===== */
let deferredPrompt;
const btnInstalar = document.getElementById("btnInstalar");

if (btnInstalar) {
  btnInstalar.style.display = "none";

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstalar.style.display = "block";
  });

  btnInstalar.addEventListener("click", () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      btnInstalar.style.display = "none";
    });
  });
}
  carregarAgendamentos();

});