document.addEventListener("DOMContentLoaded", () => {

  /* ================= CONFIGURAÇÕES ================= */
  const WHATSAPP_BARBEARIA = "5535998066403";
  const SENHA_ADMIN = "madruga123";
  const HORA_ABERTURA = 8;
  const HORA_FECHAMENTO = 19;

  /* ================= ELEMENTOS ================= */
  const form = document.getElementById("formAgendamento");
  const inputData = document.getElementById("data");
  const inputHora = document.getElementById("hora"); // hidden
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

  /* ================= SERVIÇOS ================= */
  const servicos = {
    "Corte Degradê": { preco: 35 },
    "Corte Navalhado": { preco: 38 },
    "Barba": { preco: 20 },
    "Corte + Barba": { preco: 55 },
    "Sobrancelha": { preco: 10 },
    "Pezinho": { preco: 20 },
    "Corte + Barba + Sobrancelha": { preco: 60 },
    "Pigmentação + Corte": { preco: 60 },
    "Luzes + Corte": { preco: 75 },
    "Platinado + Corte": { preco: 110 }
  };

  /* ================= ADMIN ================= */
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

  /* ================= HORÁRIOS EM BOTÕES ================= */
  function renderizarHorarios(dataSelecionada) {
    horariosContainer.innerHTML = "";
    inputHora.value = "";

    const diaSemana = new Date(dataSelecionada + "T00:00").getDay();
    if (diaSemana === 0 || diaSemana === 1) {
      alert("Não atendemos aos domingos e segundas-feiras.");
      inputData.value = "";
      return;
    }

    const agora = new Date();
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

    for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
      const hora = `${String(h).padStart(2, "0")}:00`;
      const dataHora = new Date(`${dataSelecionada}T${hora}`);

      if (dataHora <= agora) continue;

      const ocupado = agendamentos.some(a =>
        a.dataISO === dataSelecionada && a.hora === hora
      );
      if (ocupado) continue;

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
    if (inputData.value) {
      renderizarHorarios(inputData.value);
    }
  });

  /* ================= PREÇO AUTOMÁTICO ================= */
  selectServico.addEventListener("change", () => {
    if (servicos[selectServico.value]) {
      inputPreco.value = `R$ ${servicos[selectServico.value].preco}`;
    }
  });

  /* ================= FORMATAR DATA ================= */
  function formatarData(dataISO) {
    const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    const d = new Date(dataISO + "T00:00");
    return `${dias[d.getDay()]} • ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }

  /* ================= SUBMIT ================= */
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
      preco: servicos[selectServico.value].preco
    };

    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
    lista.push(agendamento);
    localStorage.setItem("agendamentos", JSON.stringify(lista));

    mensagem.textContent = "✅ Agendamento confirmado!";
    mensagem.style.color = "lime";

    enviarWhatsappCliente(agendamento);
    enviarWhatsappBarbearia(agendamento);

    form.reset();
    inputPreco.value = "";
    horariosContainer.innerHTML = "";
    carregarAgendamentos();
  });

  /* ================= LISTAGEM ================= */
  function carregarAgendamentos() {
    listaAgendamentos.innerHTML = "";
    listaHistorico.innerHTML = "";

    const agora = new Date();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];

    lista
      .sort((a,b)=>new Date(`${a.dataISO}T${a.hora}`)-new Date(`${b.dataISO}T${b.hora}`))
      .forEach(a=>{
        const dh = new Date(`${a.dataISO}T${a.hora}`);
        const li = document.createElement("li");
        li.textContent = `${a.data} | ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}`;

        dh > agora
          ? listaAgendamentos.appendChild(li)
          : (li.classList.add("realizado"), listaHistorico.appendChild(li));
      });
  }

  /* ================= WHATSAPP ================= */
  function enviarWhatsappCliente(a) {
    const tel = a.telefone.replace(/\D/g,"");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(
`💈 Barbearia Madruga
📅 ${a.data}
⏰ ${a.hora}
✂️ ${a.servico}
💰 R$ ${a.preco}`)}`, "_blank");
  }

  function enviarWhatsappBarbearia(a) {
    window.open(`https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(
`📌 NOVO AGENDAMENTO
👤 ${a.nome}
📞 ${a.telefone}
📅 ${a.data}
⏰ ${a.hora}
✂️ ${a.servico}
💰 R$ ${a.preco}`)}`, "_blank");
  }

  /* ================= LIMPAR HISTÓRICO ANTIGO ================= */
  btnLimparHistorico.addEventListener("click", () => {
    if (!confirm("Apagar apenas atendimentos antigos?")) return;

    const agora = new Date();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
    const nova = lista.filter(a =>
      new Date(`${a.dataISO}T${a.hora}`) > agora
    );

    localStorage.setItem("agendamentos", JSON.stringify(nova));
    carregarAgendamentos();
  });

  /* ================= RELATÓRIO ================= */
  btnRelatorioDiario.addEventListener("click", ()=>{
    const hoje = new Date().toDateString();
    const lista = JSON.parse(localStorage.getItem("agendamentos")) || [];
    let total = 0, valor = 0, serv = {};

    lista.forEach(a=>{
      if (new Date(a.dataISO).toDateString()===hoje){
        total++; valor+=a.preco;
        serv[a.servico]=(serv[a.servico]||0)+1;
      }
    });

    let txt="";
    for(let s in serv) txt+=`• ${s}: ${serv[s]}\n`;

    window.open(`https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(
`📊 RELATÓRIO DO DIA
👥 ${total}
💰 R$ ${valor}

✂️ Serviços:
${txt}`)}`, "_blank");
  });

  /* ================= ADMIN (3 CLIQUES) ================= */
  let cliques = 0;
  titulo.addEventListener("click", ()=>{
    cliques++;
    if (cliques === 3) {
      cliques = 0;
      const senha = prompt("Área restrita:");
      if (senha !== SENHA_ADMIN) return alert("Senha incorreta");
      mostrarAdmin();
      setTimeout(esconderAdmin, 5 * 60 * 1000);
    }
  });

  /* ================= PWA ================= */
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstalar.style.display = "block";
  });

  btnInstalar.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    btnInstalar.style.display = "none";
  });

  carregarAgendamentos();
});