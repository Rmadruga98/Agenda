document.addEventListener("DOMContentLoaded", () => {

  /* ===== CONFIG ===== */
  const WHATSAPP = "5535998066403";
  const SENHA_ADMIN = "madruga123";
  const HORA_ABERTURA = 8;
  const HORA_FECHAMENTO = 19;

  const $ = id => document.getElementById(id);
  const db = window.db;

  /* ===== MENSAGEM BONITA (TOAST) ===== */
  function mostrarMensagem(texto) {
    const msg = document.createElement("div");
    msg.className = "toast";
    msg.textContent = texto;
    document.body.appendChild(msg);

    setTimeout(() => {
      msg.remove();
    }, 3000);
  }

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

  /* ===== ELEMENTOS ===== */
  const form = $("formAgendamento");
  const dataInput = $("data");
  const horaInput = $("hora");
  const horariosDiv = $("horarios");
  const precoInput = $("preco");
  const servicoSelect = $("servico");

  /* ===== BLOQUEAR DATAS PASSADAS ===== */
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataInput.min = hoje.toISOString().split("T")[0];

  /* ===== FORMATAR DATA ===== */
  function formatarDataComDia(dataISO) {
    const dias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
    const [a,m,d] = dataISO.split("-").map(Number);
    const data = new Date(a, m - 1, d);
    return `${dias[data.getDay()]} – ${data.toLocaleDateString("pt-BR")}`;
  }

  /* ===== PREÇO AUTOMÁTICO ===== */
  servicoSelect.addEventListener("change", e => {
    const valor = servicos[e.target.value];
    precoInput.value = valor ? `R$ ${valor}` : "";
  });

  /* ===== CARREGAR HORÁRIOS ===== */
  async function carregarHorarios(data) {

    horariosDiv.innerHTML = "";
    horaInput.value = "";

    const dataSelecionada = new Date(data + "T00:00");

    if (dataSelecionada.getDay() === 0 || dataSelecionada.getDay() === 1) {
      horariosDiv.innerHTML = "<p class='dia-bloqueado'>❌ Não atendemos domingo e segunda</p>";
      return;
    }

    const bloqueado = await db.collection("diasBloqueados").doc(data).get();
    if (bloqueado.exists) {
      horariosDiv.innerHTML = "<p class='dia-bloqueado'>🔒 Dia bloqueado</p>";
      return;
    }

    const snap = await db.collection("agendamentos")
      .where("data", "==", data)
      .get();

    const ocupados = snap.docs.map(d => d.data().hora);

    for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {

      if (h === 12) continue;

      const hora = String(h).padStart(2, "0") + ":00";

      const dataHora = new Date(
        dataSelecionada.getFullYear(),
        dataSelecionada.getMonth(),
        dataSelecionada.getDate(),
        h
      );

      if (
        dataSelecionada.toDateString() === hoje.toDateString() &&
        new Date() > dataHora
      ) continue;

      if (ocupados.includes(hora)) continue;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hora-btn";
      btn.textContent = hora;

      btn.addEventListener("click", () => {
        document.querySelectorAll(".hora-btn")
          .forEach(b => b.classList.remove("ativa"));

        btn.classList.add("ativa");
        horaInput.value = hora;
      });

      horariosDiv.appendChild(btn);
    }

    if (horariosDiv.innerHTML === "") {
      horariosDiv.innerHTML = "<p class='dia-bloqueado'>Sem horários disponíveis</p>";
    }
  }

  dataInput.addEventListener("change", () => {
    if (dataInput.value) carregarHorarios(dataInput.value);
  });

  /* ===== AGENDAR ===== */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const nome = $("nome").value.trim();
    const telefone = $("telefone").value.trim();
    const servico = servicoSelect.value;

    if (!nome || !telefone || !dataInput.value || !horaInput.value || !servico) {
      mostrarMensagem("Preencha todos os campos.");
      return;
    }

    const ag = {
      nome,
      telefone,
      data: dataInput.value,
      hora: horaInput.value,
      servico,
      preco: servicos[servico],
      criadoEm: new Date()
    };

    await db.collection("agendamentos").add(ag);

    mostrarMensagem("Agendamento realizado com sucesso!");

    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        `📌 NOVO AGENDAMENTO\n👤 ${ag.nome}\n📅 ${formatarDataComDia(ag.data)}\n⏰ ${ag.hora}\n✂️ ${ag.servico}\n💰 R$ ${ag.preco}`
      )}`
    );

    form.reset();
    horariosDiv.innerHTML = "";
  });

  /* ===== ADMIN ===== */
  const btnAdmin = $("btnAdmin");
  const areaAdmin = $("areaAdmin");
  const btnSairAdmin = $("btnSairAdmin");

  let taps = 0;

  document.querySelector("h1").addEventListener("click", () => {
    taps++;
    if (taps === 5) {
      btnAdmin.style.display = "block";
      mostrarMensagem("Modo administrador liberado");
      taps = 0;
    }
  });

  btnAdmin.addEventListener("click", () => {
    const senha = prompt("Digite a senha:");
    if (senha !== SENHA_ADMIN) {
      mostrarMensagem("Senha incorreta");
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

  /* ===== BLOQUEAR DIA ===== */
  const btnBloquearDia = $("btnBloquearDia");
  const dataBloqueio = $("dataBloqueio");

  btnBloquearDia.addEventListener("click", async () => {

    if (!dataBloqueio.value) {
      mostrarMensagem("Selecione uma data");
      return;
    }

    await db.collection("diasBloqueados")
      .doc(dataBloqueio.value)
      .set({ criadoEm: new Date() });

    mostrarMensagem("Dia bloqueado!");
    dataBloqueio.value = "";
    carregarDiasBloqueados();
  });

  /* ===== LISTAR DIAS BLOQUEADOS ===== */
  async function carregarDiasBloqueados() {

    const lista = $("listaDiasBloqueados");
    lista.innerHTML = "";

    const snapshot = await db.collection("diasBloqueados").get();

    if (snapshot.empty) {
      lista.innerHTML = "<li>Nenhum dia bloqueado</li>";
      return;
    }

    snapshot.forEach(doc => {

      const li = document.createElement("li");
      li.innerHTML = `
        📅 ${formatarDataComDia(doc.id)}
        <button class="btn-desbloquear">Desbloquear</button>
      `;

      li.querySelector("button").addEventListener("click", async () => {
        await db.collection("diasBloqueados").doc(doc.id).delete();
        carregarDiasBloqueados();
      });

      lista.appendChild(li);
    });
  }

  /* ===== ADMIN LISTAGEM ===== */
 async function carregarAdmin() {

  const listaAg = $("listaAgendamentos");
  const listaHist = $("listaHistorico");

  const qtdHojeEl = $("qtdHoje");
  const faturamentoHojeEl = $("faturamentoHoje");
  const proximoClienteEl = $("proximoCliente");


  listaAg.innerHTML = "";
  listaHist.innerHTML = "";

  let totalDia = 0;
  let totalMes = 0;
  let qtdHoje = 0;
  let proximoCliente = null;

  const snapshot = await db.collection("agendamentos").get();
  const agora = new Date();

  const hojeStr = agora.toISOString().split("T")[0];
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  snapshot.forEach(doc => {

    const a = doc.data();

    const [A, M, D] = a.data.split("-").map(Number);
    const [H, Mi] = a.hora.split(":").map(Number);

    const dataHora = new Date(A, M - 1, D, H, Mi);

    // ===== CALCULOS =====
    if (a.data === hojeStr) {
      totalDia += Number(a.preco);
      qtdHoje++;

      if (dataHora > agora) {
        if (!proximoCliente || dataHora < proximoCliente.dataHora) {
          proximoCliente = {
            nome: a.nome,
            hora: a.hora,
            dataHora
          };
        }
      }
    }

    if ((M - 1) === mesAtual && A === anoAtual) {
      totalMes += Number(a.preco);
    }

    const li = document.createElement("li");
    li.innerHTML = `
      📅 ${formatarDataComDia(a.data)}<br>
      ⏰ ${a.hora}<br>
      👤 ${a.nome}<br>
      ✂️ ${a.servico} — R$ ${a.preco}
    `;

    if (dataHora >= agora) {

      const btn = document.createElement("button");
      btn.textContent = "❌ Remover";

      btn.addEventListener("click", async () => {
        if (!confirm("Remover agendamento?")) return;
        await db.collection("agendamentos").doc(doc.id).delete();
        carregarAdmin();
      });

      li.appendChild(btn);
      listaAg.appendChild(li);

    } else {
      li.style.opacity = "0.6";
      listaHist.appendChild(li);
    }

  });

  // Atualizar dashboard
  qtdHojeEl.textContent = qtdHoje;
  faturamentoHojeEl.textContent = `R$ ${totalDia}`;

  if (proximoCliente) {
    proximoClienteEl.textContent = `${proximoCliente.nome} às ${proximoCliente.hora}`;
  } else {
    proximoClienteEl.textContent = "Nenhum";
  }

}

/* ===== RELATÓRIO DO DIA ===== */

const btnRelatorio = $("btnRelatorioDiario");

if (btnRelatorio) {

  btnRelatorio.addEventListener("click", async () => {

    const snapshot = await db.collection("agendamentos").get();
    const hoje = new Date().toISOString().split("T")[0];

    let mensagem = `📊 *RELATÓRIO DO DIA*\n\n`;
    let total = 0;
    let contador = 0;

    snapshot.forEach(doc => {
      const a = doc.data();

      if (a.data === hoje) {
        contador++;
        total += Number(a.preco);

        mensagem += `👤 ${a.nome}\n`;
        mensagem += `⏰ ${a.hora}\n`;
        mensagem += `✂️ ${a.servico}\n`;
        mensagem += `💰 R$ ${a.preco}\n\n`;
      }
    });

    if (contador === 0) {
      mostrarMensagem("Nenhum agendamento hoje.");
      return;
    }

    mensagem += `——————————————\n`;
    mensagem += `📅 Total de Clientes: ${contador}\n`;
    mensagem += `💰 Total Faturado: R$ ${total}\n`;

    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`
    );

  });

}

/* ===== PWA – INSTALAR APP ===== */

let deferredPrompt = null;
const btnInstalar = $("btnInstalar");

if (btnInstalar) {

  btnInstalar.style.display = "none";

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (!window.matchMedia('(display-mode: standalone)').matches) {
      btnInstalar.style.display = "block";
    }
  });

  btnInstalar.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      btnInstalar.style.display = "none";
    }

    deferredPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    btnInstalar.style.display = "none";
  });

  if (window.matchMedia('(display-mode: standalone)').matches) {
    btnInstalar.style.display = "none";
  }
}

/* ===== MEUS AGENDAMENTOS ===== */

const btnMeus = $("btnMeusAgendamentos");
const areaMeus = $("areaMeusAgendamentos");
const btnConsultar = $("btnConsultarAgendamentos");
const listaMeus = $("listaMeusAgendamentos");

if (btnMeus) {

  btnMeus.addEventListener("click", () => {
    areaMeus.style.display = 
      areaMeus.style.display === "none" ? "block" : "none";
  });

}

if (btnConsultar) {

  btnConsultar.addEventListener("click", async () => {

    const telefone = $("telefoneConsulta").value.trim();

    if (!telefone) {
      mostrarMensagem("Digite seu WhatsApp");
      return;
    }

    listaMeus.innerHTML = "";

    const snapshot = await db.collection("agendamentos")
      .where("telefone", "==", telefone)
      .get();

    const agora = new Date();
    let encontrou = false;

    snapshot.forEach(doc => {

      const a = doc.data();

      const [A, M, D] = a.data.split("-").map(Number);
      const [H, Mi] = a.hora.split(":").map(Number);
      const dataHora = new Date(A, M - 1, D, H, Mi);

      if (dataHora >= agora) {

        encontrou = true;

        const li = document.createElement("li");
        li.innerHTML = `
          📅 ${formatarDataComDia(a.data)}<br>
          ⏰ ${a.hora}<br>
          ✂️ ${a.servico}
        `;

        listaMeus.appendChild(li);
      }

    });

    if (!encontrou) {
      listaMeus.innerHTML = "<li>Nenhum agendamento futuro encontrado.</li>";
    }

  });

}
});