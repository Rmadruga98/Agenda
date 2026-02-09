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

  const horariosContainer = $("horarios");
  const inputHora = $("hora");
  const inputData = $("data");
  const inputPreco = $("preco");
  const form = $("formAgendamento");

  /* ===== PREÇO ===== */
  $("servico").addEventListener("change", e => {
    inputPreco.value = servicos[e.target.value]
      ? `R$ ${servicos[e.target.value]}`
      : "";
  });

  /* ===== HORÁRIOS ===== */
  async function renderizarHorarios(data) {
    horariosContainer.innerHTML = "";
    inputHora.value = "";

    const dia = new Date(data + "T00:00").getDay();
    if (dia === 0 || dia === 1) {
      alert("Não atendemos domingo e segunda");
      inputData.value = "";
      return;
    }

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
      nome: $("nome").value,
      telefone: $("telefone").value,
      data: inputData.value,
      hora: inputHora.value,
      servico: $("servico").value,
      preco: servicos[$("servico").value],
      criadoEm: new Date()
    };

    await db.collection("agendamentos").add(agendamento);

    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
`📌 NOVO AGENDAMENTO
👤 ${agendamento.nome}
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
  });

  /* ===== ÁREA ADMIN ===== */
  const btnAdmin = $("btnAdmin");
  const areaAdmin = $("areaAdmin");
  const btnSairAdmin = $("btnSairAdmin");
  const listaAgendamentos = $("listaAgendamentos");
  const btnRelatorioDiario = $("btnRelatorioDiario");

  let toques = 0;
  document.querySelector("h1").addEventListener("click", () => {
    toques++;
    if (toques === 5) {
      btnAdmin.style.display = "block";
      alert("Modo administrador liberado");
    }
  });

  btnAdmin.addEventListener("click", async () => {
    const senha = prompt("Senha do administrador:");
    if (senha !== SENHA_ADMIN) {
      alert("Senha incorreta");
      return;
    }

    areaAdmin.style.display = "block";
    btnAdmin.style.display = "none";
    carregarAgendaAdmin();
  });

  btnSairAdmin.addEventListener("click", () => {
    areaAdmin.style.display = "none";
    btnAdmin.style.display = "block";
  });

  async function carregarAgendaAdmin() {
    listaAgendamentos.innerHTML = "";

    const snapshot = await db.collection("agendamentos")
      .orderBy("data")
      .orderBy("hora")
      .get();

    snapshot.forEach(doc => {
      const a = doc.data();
      const li = document.createElement("li");

      li.innerHTML = `
        📅 ${a.data} ⏰ ${a.hora}<br>
        👤 ${a.nome}<br>
        ✂️ ${a.servico} — R$ ${a.preco}
        <br>
        <button onclick="excluirAgendamento('${doc.id}')">🗑 Excluir</button>
      `;

      listaAgendamentos.appendChild(li);
    });
  }

  window.excluirAgendamento = async function(id) {
    if (!confirm("Excluir este agendamento?")) return;
    await db.collection("agendamentos").doc(id).delete();
    carregarAgendaAdmin();
  };

  /* ===== RELATÓRIO DO DIA ===== */
  if (btnRelatorioDiario) {
    btnRelatorioDiario.addEventListener("click", async () => {

      const hoje = new Date().toISOString().split("T")[0];

      const snapshot = await db
        .collection("agendamentos")
        .where("data", "==", hoje)
        .orderBy("hora")
        .get();

      if (snapshot.empty) {
        alert("Nenhum atendimento registrado hoje.");
        return;
      }

      let total = 0;
      let texto = `📊 *RELATÓRIO DO DIA*\n📅 ${hoje}\n\n`;

      snapshot.forEach(doc => {
        const a = doc.data();
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

});