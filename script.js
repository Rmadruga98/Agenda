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
  const db = window.db;
  const auth = window.auth;

  const horariosDiv = $("horarios");
  const dataInput = $("data");
  const horaInput = $("hora");
  const precoInput = $("preco");

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

      const hora = `${String(h).padStart(2,"0")}:00`;
      if (ocupados.includes(hora)) continue;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hora-btn";
      btn.textContent = hora;

      btn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  document.querySelectorAll(".hora-btn")
    .forEach(b => b.classList.remove("ativa"));

  btn.classList.add("ativa");
  horaInput.value = hora;

  console.log("Horário selecionado:", hora);
});

      horariosDiv.appendChild(btn);
    }
  }

  dataInput.addEventListener("change", () => {
    if (dataInput.value) carregarHorarios(dataInput.value);
  });

  $("formAgendamento").addEventListener("submit", async e => {
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
📅 ${ag.data}
⏰ ${ag.hora}
✂️ ${ag.servico}
💰 R$ ${ag.preco}`
      )}`,
      "_blank"
    );

    alert("Agendado com sucesso!");
    location.reload();
  });

});