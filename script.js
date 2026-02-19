document.addEventListener("DOMContentLoaded", () => {

  /* ===== CONFIG ===== */
  const WHATSAPP = "5535998066403";
  const SENHA_ADMIN = "madruga123";
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

  /* ===== DATA COM DIA DA SEMANA ===== */
  function formatarDataComDia(dataISO) {
    const dias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
    const [a,m,d] = dataISO.split("-").map(Number);
    const data = new Date(a, m - 1, d);
    return `${dias[data.getDay()]} – ${data.toLocaleDateString("pt-BR")}`;
  }

  /* ===== ELEMENTOS ===== */
  const horariosDiv = $("horarios");
  const horaInput = $("hora");
  const dataInput = $("data");
  const precoInput = $("preco");
  const form = $("formAgendamento");

  /* ===== BLOQUEAR DATAS PASSADAS ===== */
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataInput.min = hoje.toISOString().split("T")[0];

  /* ===== PREÇO ===== */
  $("servico").addEventListener("change", e => {
    precoInput.value = servicos[e.target.value] ? `R$ ${servicos[e.target.value]}` : "";
  });

  /* ===== HORÁRIOS ===== */
  async function carregarHorarios(data) {
    horariosDiv.innerHTML = "";
    horaInput.value = "";

    const hoje = new Date();
    const dataSelecionada = new Date(data + "T00:00");

    const bloqueado = await db.collection("diasBloqueados").doc(data).get();
    if (bloqueado.exists) {
      horariosDiv.innerHTML = "<p class='dia-bloqueado'>🔒 Dia bloqueado pelo administrador</p>";
      return;
    }

    const dia = dataSelecionada.getDay();
    if (dia === 0 || dia === 1) {
      alert("Não atendemos domingo e segunda");
      dataInput.value = "";
      return;
    }

    const snap = await db.collection("agendamentos").where("data", "==", data).get();
    const ocupados = snap.docs.map(d => d.data().hora);

    for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
      if (h === 12) continue;

      const hora = String(h).padStart(2, "0") + ":00";

      const dataHora = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), dataSelecionada.getDate(), h, 15);

      if (
        dataSelecionada.toDateString() === hoje.toDateString() &&
        hoje > dataHora
      ) continue;

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
    const selecionada = new Date(dataInput.value + "T00:00");
    if (selecionada < hoje) {
      alert("Não é possível agendar datas passadas.");
      dataInput.value = "";
      return;
    }
    if (dataInput.value) carregarHorarios(dataInput.value);
  });

  /* ===== AGENDAR ===== */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!horaInput.value) return alert("Selecione um horário");

    const nome = $("nome").value.trim();
    const telefone = $("telefone").value.trim();
    const servicoValor = $("servico").value;

    if (!nome || !telefone) {
      return alert("Por favor, preencha todos os campos obrigatórios.");
    }

    const ag = {
      nome: nome,
      telefone: telefone,
      data: dataInput.value,
      hora: horaInput.value,
      servico: servicoValor,
      preco: servicos[servicoValor],
      criadoEm: new Date()
    };

    // Lógica para salvar o agendamento
    await db.collection("agendamentos").add(ag);
    alert("Agendamento realizado com sucesso!\n\n⚠️ Cancelamentos avisar com no mínimo 1 hora de antecedência.");

    // Redirecionar para o WhatsApp
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        `📌 NOVO AGENDAMENTO\n👤 ${ag.nome}\n📅 ${formatarDataComDia(dataInput.value)}\n⏰ ${ag.hora}\n✂️ ${ag.servico}\n💰 R$ ${ag.preco}
       
⚠️ *Observação:*
Cancelamentos avisar com no mínimo 1hra de ANTECEDÊNCIA. `
        
      )}`
    );
  });

  /* ===== ADMIN ===== */
  const btnAdmin = $("btnAdmin");
  const areaAdmin = $("areaAdmin");
  const btnSairAdmin = $("btnSairAdmin");
  const listaAg = $("listaAgendamentos");
  const listaHist = $("listaHistorico");
  const btnRel = $("btnRelatorioDiario");
  const listaDiasBloqueados = $("listaDiasBloqueados");

  let taps = 0;
  document.querySelector("h1").addEventListener("click", () => {
    if (++taps === 5) {
      btnAdmin.style.display = "block";
      alert("🔓 Modo administrador liberado");
    }
  });

  btnAdmin.addEventListener("click", async () => {
    if (prompt("Digite a senha do administrador:") !== SENHA_ADMIN) {
      alert("Senha incorreta");
      return;
    }

    areaAdmin.style.display = "block";
    btnAdmin.style.display = "none";

    carregarAdmin();
    carregarDiasBloqueados();
  });

  btnSairAdmin.addEventListener("click", () => {
    areaAdmin.style.display = "none";
    btnAdmin.style.display = "block";
  });

  /* ===== LISTAR DIAS BLOQUEADOS ===== */
  async function carregarDiasBloqueados() {
    if (!listaDiasBloqueados) return;

    listaDiasBloqueados.innerHTML = "";

    const snapshot = await db.collection("diasBloqueados").get();

    if (snapshot.empty) {
      listaDiasBloqueados.innerHTML = "<li>Nenhum dia bloqueado</li>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.id;

      const li = document.createElement("li");
      li.innerHTML = `
        📅 ${formatarDataComDia(data)}
        <button class="btn-desbloquear">Desbloquear</button>
      `;

      li.querySelector(".btn-desbloquear").onclick = async () => {
        await db.collection("diasBloqueados").doc(data).delete();
        carregarDiasBloqueados();
      };

      listaDiasBloqueados.appendChild(li);
    });
  }

  async function carregarAdmin() {
    listaAg.innerHTML = "";
    listaHist.innerHTML = "";

    const agora = new Date();
    agora.setSeconds(0, 0);

    const snapshot = await db.collection("agendamentos").get();

    if (snapshot.empty) {
      listaAg.innerHTML = "<li>Nenhum agendamento encontrado</li>";
      return;
    }

    snapshot.forEach(doc => {
      const a = doc.data();

      const [A, M, D] = a.data.split("-").map(Number);
      const [H, Mi] = a.hora.split(":").map(Number);
      const dataHora = new Date(A, M - 1, D, H, Mi);

      const li = document.createElement("li");
      li.innerHTML = `
        📅 ${a.data} ⏰ ${a.hora}<br>
        👤 ${a.nome}<br>
        ✂️ ${a.servico} — R$ ${a.preco}
      `;

      if (dataHora >= agora) {
        const btn = document.createElement("button");
        btn.textContent = "❌ Remover";

        btn.onclick = async () => {
          if (!confirm("Remover este agendamento?")) return;
          await db.collection("agendamentos").doc(doc.id).delete();
          carregarAdmin();
          alert("Agendamento removido com sucesso!");
        };

        li.appendChild(btn);
        listaAg.appendChild(li);
      } else {
        li.style.opacity = "0.6";
        listaHist.appendChild(li);
      }
    });
  }
  /* ===== BLOQUEAR / DESBLOQUEAR DIA ===== */
const dataBloqueioInput = $("dataBloqueio");
const btnBloquearDia = $("btnBloquearDia");
const btnDesbloquearDia = $("btnDesbloquearDia");

if (btnBloquearDia) {
  btnBloquearDia.addEventListener("click", async () => {
    const data = dataBloqueioInput.value;
    if (!data) return alert("Selecione uma data");

    await db.collection("diasBloqueados").doc(data).set({
      bloqueado: true,
      criadoEm: new Date()
    });

    alert("Dia bloqueado com sucesso!");
    dataBloqueioInput.value = "";
    carregarDiasBloqueados();
  });
}

if (btnDesbloquearDia) {
  btnDesbloquearDia.addEventListener("click", async () => {
    const data = dataBloqueioInput.value;
    if (!data) return alert("Selecione uma data");

    await db.collection("diasBloqueados").doc(data).delete();

    alert("Dia desbloqueado com sucesso!");
    dataBloqueioInput.value = "";
    carregarDiasBloqueados();
  });
}
/* ===== APAGAR HISTÓRICO ===== */
const btnLimparHistorico = $("btnLimparHistorico");

if (btnLimparHistorico) {
  btnLimparHistorico.addEventListener("click", async () => {

    if (!confirm("Tem certeza que deseja apagar todo o histórico?")) return;

    const agora = new Date();
    agora.setSeconds(0, 0);

    const snapshot = await db.collection("agendamentos").get();

    if (snapshot.empty) {
      alert("Nenhum histórico para apagar.");
      return;
    }

    const batch = db.batch();
    let apagou = false;

    snapshot.forEach(doc => {
      const a = doc.data();

      const [A, M, D] = a.data.split("-").map(Number);
      const [H, Mi] = a.hora.split(":").map(Number);
      const dataHora = new Date(A, M - 1, D, H, Mi);

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
  });
}
});