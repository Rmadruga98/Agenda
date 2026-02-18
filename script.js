document.addEventListener("DOMContentLoaded", () => {

  /* ================= CONFIG ================= */
  const WHATSAPP = "5535998066403";
  const SENHA_ADMIN = "madruga123"; // Consider removing for production.
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
    if (telefone.length !== 11) { // Brazilian phone number standard
      alert("Digite um WhatsApp válido com 11 dígitos");
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
    precoInput.value = servicos[e.target.value] ? `R$ ${servicos[e.target.value]}` : "";
  };

  async function carregarHorarios(data) {
    try {
      horariosDiv.innerHTML = "";
      horaInput.value = "";

      const datasLiberadas = [new Date().toISOString().split("T")[0]]; // Today's date
      const dia = new Date(data + "T00:00").getDay();
      if (!datasLiberadas.includes(data)) {
        if (dia === 0 || dia === 1) {
          alert("Não atendemos domingo e segunda");
          dataInput.value = "";
          return;
        }
      }

      const snap = await db.collection("agendamentos")
        .where("data", "==", data)
        .get();

      const ocupados = snap.docs.map(d => d.data().hora);

      const agora = new Date();
      const hojeISO = agora.toISOString().split("T")[0];

      for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
        if (h === 12) continue;

        const hora = String(h).padStart(2, "0") + ":00";
        if (ocupados.includes(hora)) continue;

        /* 🔒 BLOQUEIO DE HORÁRIOS PASSADOS (ÚNICA ALTERAÇÃO) */
        if (data === hojeISO) {
          const [H] = hora.split(":").map(Number);
          if (H <= agora.getHours()) continue;
        }
        /* 🔒 FIM DO BLOQUEIO */

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
    } catch (error) {
      console.error("Error loading times:", error);
      alert("Ocorreu um erro ao carregar os horários, tente novamente mais tarde.");
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

    try {
      await db.collection("agendamentos").add(agendamento);

      const msgBarbearia = `
*NOVO AGENDAMENTO*
👤 ${agendamento.nome}
📱 ${agendamento.telefone}
📅 ${agendamento.data}
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
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      alert("Ocorreu um erro ao confirmar o agendamento, tente novamente.");
    }
  };
});