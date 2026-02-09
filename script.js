document.addEventListener("DOMContentLoaded", () => {

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

  const $ = id => document.getElementById(id);

  const horariosContainer = $("horarios");
  const inputHora = $("hora");
  const inputData = $("data");
  const inputPreco = $("preco");
  const form = $("formAgendamento");

  /* ===== FIRESTORE ===== */
  if (!window.db) {
    alert("❌ Firebase não carregou");
    return;
  }
  const db = window.db;

  /* ===== PREÇO ===== */
  $("servico").addEventListener("change", e => {
    const valor = servicos[e.target.value];
    inputPreco.value = valor ? `R$ ${valor}` : "";
  });

  /* ===== HORÁRIOS ===== */
  async function renderizarHorarios(data) {
    horariosContainer.innerHTML = "";
    inputHora.value = "";

    const diaSemana = new Date(data + "T00:00").getDay();
    if (diaSemana === 0 || diaSemana === 1) {
      alert("❌ Não atendemos domingo e segunda-feira");
      inputData.value = "";
      return;
    }

    try {
      const snapshot = await db
        .collection("agendamentos")
        .where("data", "==", data)
        .get();

      const ocupados = snapshot.docs.map(d => d.data().hora);

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
          inputHora.value = hora;
        };

        horariosContainer.appendChild(btn);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar horários");
    }
  }

  inputData.addEventListener("change", () => {
    if (inputData.value) renderizarHorarios(inputData.value);
  });

  /* ===== AGENDAR ===== */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (!inputHora.value) {
      alert("Selecione um horário");
      return;
    }

    const agendamento = {
      nome: $("nome").value.trim(),
      telefone: $("telefone").value.trim(),
      data: inputData.value,
      hora: inputHora.value,
      servico: $("servico").value,
      preco: servicos[$("servico").value],
      criadoEm: new Date()
    };

    try {
      await db.collection("agendamentos").add(agendamento);

      window.open(
        `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
`📌 NOVO AGENDAMENTO
👤 ${agendamento.nome}
📅 ${agendamento.data}
⏰ ${agendamento.hora}
✂️ ${agendamento.servico}
💰 R$ ${agendamento.preco}`
        )}`
      );

      alert("✅ Agendamento confirmado!");
      form.reset();
      horariosContainer.innerHTML = "";
      inputPreco.value = "";

    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar agendamento");
    }
  });

});