document.addEventListener("DOMContentLoaded", () => {

  /* ================= CONFIG ================= */
  const WHATSAPP = "5535998066403";
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

  /* ================= VERIFICAÇÃO WHATS ================= */
  const divVerificacao = $("verificacaoTelefone");
  const btnConfirmarTelefone = $("btnConfirmarTelefone");
  const inputTelefone = $("telefoneVerificacao");
  const formAgendamento = $("formAgendamento");

  const LIMITE = 1000 * 60 * 60 * 24 * 30;
  const salvo = JSON.parse(localStorage.getItem("verificacaoWhats") || "null");

  if (salvo && Date.now() - salvo.data < LIMITE) {
    divVerificacao.style.display = "none";
    formAgendamento.style.display = "block";
  }

  btnConfirmarTelefone.onclick = () => {
    const tel = inputTelefone.value.replace(/\D/g, "");
    if (tel.length !== 11) {
      alert("Digite um WhatsApp válido com 11 dígitos");
      return;
    }

    localStorage.setItem("verificacaoWhats", JSON.stringify({
      telefone: tel,
      data: Date.now()
    }));

    window.open(`https://wa.me/55${tel}`, "_blank");

    divVerificacao.style.display = "none";
    formAgendamento.style.display = "block";
  };

  /* ================= AGENDAMENTO ================= */
  const horariosDiv = $("horarios");
  const horaInput = $("hora");
  const dataInput = $("data");
  const precoInput = $("preco");

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataInput.min = hoje.toISOString().split("T")[0];

  $("servico").onchange = e => {
    precoInput.value = servicos[e.target.value]
      ? `R$ ${servicos[e.target.value]}`
      : "";
  };

  dataInput.addEventListener("input", () => {
    if (!dataInput.value) return;

    const dia = new Date(dataInput.value + "T00:00").getDay();
    if (dia === 0 || dia === 1) {
      alert("Não atendemos domingo e segunda-feira");
      dataInput.value = "";
      horariosDiv.innerHTML = "";
      return;
    }

    carregarHorarios(dataInput.value);
  });

  async function carregarHorarios(data) {
    horariosDiv.innerHTML = "";
    horaInput.value = "";

    const snap = await db.collection("agendamentos")
      .where("data", "==", data)
      .get();

    const ocupados = snap.docs.map(d => d.data().hora);
    const agora = new Date();
    const hojeISO = agora.toISOString().split("T")[0];

    for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
      if (h === 12) continue;
      if (data === hojeISO && h <= agora.getHours()) continue;

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
        horaInput.value = hora;
      };

      horariosDiv.appendChild(btn);
    }
  }

  formAgendamento.onsubmit = async e => {
    e.preventDefault();

    if (!horaInput.value) {
      alert("Selecione um horário");
      return;
    }

    const dados = JSON.parse(localStorage.getItem("verificacaoWhats"));

    await db.collection("agendamentos").add({
      nome: $("nome").value,
      telefone: dados.telefone,
      data: dataInput.value,
      hora: horaInput.value,
      servico: $("servico").value,
      preco: servicos[$("servico").value],
      criadoEm: new Date()
    });

    window.open(`https://wa.me/${WHATSAPP}`, "_blank");

    alert("Agendamento confirmado!");
    formAgendamento.reset();
    horariosDiv.innerHTML = "";
    precoInput.value = "";
  };

  /* ================= ADMIN ================= */

  async function verificarSenhaAdmin(senha) {
    const doc = await db.collection("config").doc("admin").get();
    return doc.exists && senha === doc.data().senha;
  }

  function solicitarSenhaAdmin() {
    const senha = prompt("Senha do administrador:");
    if (!senha) return;

    verificarSenhaAdmin(senha).then(ok => {
      if (ok) abrirAdminModal();
      else alert("Senha incorreta");
    });
  }

  /* ================= GATILHO ADMIN (3 TOQUES) ================= */
  const titulo = document.getElementById("tituloApp");
  let toques = 0;
  let timer = null;

  function registrarToque() {
    toques++;

    if (toques === 1) {
      timer = setTimeout(() => {
        toques = 0;
      }, 2000);
    }

    if (toques === 3) {
      clearTimeout(timer);
      toques = 0;
      solicitarSenhaAdmin();
    }
  }

  if (titulo) {
    titulo.addEventListener("touchend", registrarToque);
    titulo.addEventListener("click", registrarToque);
  }

  /* ================= MODAL ADMIN ================= */
  const adminModal = $("adminModal");
  const adminLista = $("adminLista");
  const adminData = $("adminData");
  const fecharAdmin = $("fecharAdmin");
  const sairAdmin = $("sairAdmin");

  function abrirAdminModal() {
    adminModal.style.display = "flex";
    const hoje = new Date().toISOString().split("T")[0];
    adminData.value = hoje;
    carregarAgendaAdmin(hoje);
  }

  fecharAdmin.onclick = () => {
    adminModal.style.display = "none";
  };

  sairAdmin.onclick = () => {
    adminModal.style.display = "none";
  };

  adminData.onchange = () => {
    if (adminData.value) carregarAgendaAdmin(adminData.value);
  };

  async function carregarAgendaAdmin(data) {
    adminLista.innerHTML = "Carregando...";

    const snap = await db.collection("agendamentos")
      .where("data", "==", data)
      .orderBy("hora")
      .get();

    if (snap.empty) {
      adminLista.innerHTML = "Nenhum agendamento";
      return;
    }

    adminLista.innerHTML = "";

    snap.forEach(doc => {
      const a = doc.data();

      const div = document.createElement("div");
      div.className = "admin-item";

      div.innerHTML = `
        <strong>⏰ ${a.hora} — ${a.nome}</strong><br>
        ✂️ ${a.servico}<br>
        📱 ${a.telefone}<br>
        <button onclick="window.open('https://wa.me/55${a.telefone}')">📤 WhatsApp</button>
        <button class="cancelar">❌ Cancelar</button>
      `;

      div.querySelector(".cancelar").onclick = async () => {
        if (!confirm("Cancelar este agendamento?")) return;
        await db.collection("agendamentos").doc(doc.id).delete();
        carregarAgendaAdmin(data);
      };

      adminLista.appendChild(div);
    });
  }

});