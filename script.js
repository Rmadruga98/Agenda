document.addEventListener("DOMContentLoaded", () => {

  /* ===== CONFIG ===== */
  const WHATSAPP = "5535998066403";
  const HORA_ABERTURA = 8;
  const HORA_FECHAMENTO = 20;

  const $ = id => document.getElementById(id);
  const db = window.db;
  const auth = firebase.auth();

  /* ===== TOAST ===== */
  function mostrarMensagem(texto) {
    const msg = document.createElement("div");
    msg.className = "toast";
    msg.textContent = texto;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
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

  const form = $("formAgendamento");
  const dataInput = $("data");
  const horaInput = $("hora");
  const horariosDiv = $("horarios");
  const precoInput = $("preco");
  const servicoSelect = $("servico");

  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  dataInput.min = hoje.toISOString().split("T")[0];

  function formatarDataComDia(dataISO) {
    const dias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
    const [a,m,d] = dataISO.split("-").map(Number);
    const data = new Date(a, m - 1, d);
    return `${dias[data.getDay()]} – ${data.toLocaleDateString("pt-BR")}`;
  }

  servicoSelect.addEventListener("change", e => {
    const valor = servicos[e.target.value];
    precoInput.value = valor ? `R$ ${valor}` : "";
  });

/*===== HORÁRIOS ===== */
async function carregarHorarios(data) {

  try {

    horariosDiv.innerHTML = "";
    horaInput.value = "";

    const dataSelecionada = new Date(data + "T00:00");

    // ❌ Não atende domingo (0) e segunda (1)
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

    let horaFechamentoDia = HORA_FECHAMENTO;
    const diaSemana = dataSelecionada.getDay();

    // Terça e Quarta até 20h
    if (diaSemana === 2 || diaSemana === 3) {
      horaFechamentoDia = 21;
    }

    // Quinta e Sexta até 17h
    if (diaSemana === 4 || diaSemana === 5) {
      horaFechamentoDia = 18; // mostra até 18:00
    }

    // Sábado até 16h
    if (diaSemana === 6) {
      horaFechamentoDia = 17;
    }

    for (let h = HORA_ABERTURA; h < horaFechamentoDia; h++) {

      if (h === 12) continue;

      const hora = String(h).padStart(2,"0")+":00";

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
      btn.type="button";
      btn.className="hora-btn";
      btn.textContent=hora;

      btn.onclick = () => {
        document.querySelectorAll(".hora-btn").forEach(b=>b.classList.remove("ativa"));
        btn.classList.add("ativa");
        horaInput.value = hora;
      };

      horariosDiv.appendChild(btn);
    }

    // 🔥 Se não tiver horário disponível
    if (horariosDiv.innerHTML === "") {
      horariosDiv.innerHTML = "<p class='dia-bloqueado'>⚠️ Todos horários já foram preenchidos</p>";
    }

  } catch (error) {

    console.error("Erro ao carregar horários:", error);
    horariosDiv.innerHTML = "<p class='dia-bloqueado'>Erro ao carregar horários</p>";

  }
}

  dataInput.addEventListener("change", ()=>{
    if(dataInput.value) carregarHorarios(dataInput.value);
  });

  /* ===== AGENDAR ===== */
  form.addEventListener("submit", async e=>{
    e.preventDefault();

    const nome = $("nome").value.trim();
    const telefone = $("telefone").value.trim();
    const servico = servicoSelect.value;

    if(!nome || !telefone || !dataInput.value || !horaInput.value || !servico){
      mostrarMensagem("Preencha todos os campos.");
      return;
    }

    const codigoCancelamento = Math.floor(1000 + Math.random() * 9000);

    const ag = {
      nome,
      telefone,
      data:dataInput.value,
      hora:horaInput.value,
      servico,
      preco:servicos[servico],
      codigoCancelamento,
      criadoEm:new Date()
    };

    await db.collection("agendamentos").add(ag);

    mostrarMensagem("Agendamento realizado com sucesso!");

const mensagem = 
`📌 NOVO AGENDAMENTO CONFIRMADO✅

👤 ${ag.nome}
📅 ${formatarDataComDia(ag.data)}
⏰ ${ag.hora}
✂️ ${ag.servico}
💰 R$ ${ag.preco}

🔐 Código para cancelamento: ${codigoCancelamento}

⚠️ Guarde esse código caso precise cancelar.
⚠️ Cancelamento com 1 hora de antecedência.`;

const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;

setTimeout(() => {
  window.location.href = url;
}, 500);

form.reset();
horariosDiv.innerHTML="";
  });

  /* ===== MEUS AGENDAMENTOS ===== */

  const btnMeus = $("btnMeusAgendamentos");
  const areaMeus = $("areaMeusAgendamentos");
  const btnConsultar = $("btnConsultarAgendamentos");
  const listaMeus = $("listaMeusAgendamentos");

  if (btnMeus) {
    btnMeus.onclick = () => {
      areaMeus.style.display =
        areaMeus.style.display === "none" ? "block" : "none";
    };
  }

  if (btnConsultar) {

    btnConsultar.onclick = async () => {

      const telefone = $("telefoneConsulta").value.trim();
      const codigoDigitado = $("codigoConsulta").value.trim();

      if (!telefone || !codigoDigitado) {
        mostrarMensagem("Digite telefone e código.");
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

        if (
          dataHora >= agora &&
          Number(a.codigoCancelamento) === Number(codigoDigitado)
        ) {

          encontrou = true;

          const li = document.createElement("li");
          li.innerHTML = `
            📅 ${formatarDataComDia(a.data)}<br>
            ⏰ ${a.hora}<br>
            ✂️ ${a.servico}<br>
          `;

          const btnCancelar = document.createElement("button");
          btnCancelar.textContent = "❌ Cancelar";
          btnCancelar.style.marginTop="8px";
          btnCancelar.style.background="#c0392b";
          btnCancelar.style.color="white";

          btnCancelar.onclick=async()=>{

            if(!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

            await db.collection("agendamentos").doc(doc.id).delete();

            window.open(
              `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
`❌ CANCELAMENTO DE AGENDAMENTO

👤 ${a.nome}
📅 ${formatarDataComDia(a.data)}
⏰ ${a.hora}
✂️ ${a.servico}
📱 ${a.telefone}`)}`
            );

            mostrarMensagem("Agendamento cancelado com sucesso!");
            li.remove();
          };

          li.appendChild(btnCancelar);
          listaMeus.appendChild(li);
        }

      });

      if (!encontrou) {
        listaMeus.innerHTML =
          "<li>Nenhum agendamento encontrado ou código incorreto.</li>";
      }

    };

  }

  /* ===== BLOQUEAR DIA ===== */

  const btnBloquearDia = $("btnBloquearDia");
  const dataBloqueio = $("dataBloqueio");

  if (btnBloquearDia) {
    btnBloquearDia.addEventListener("click", async () => {

      if (!auth.currentUser) {
        mostrarMensagem("Faça login como administrador.");
        return;
      }

      if (!dataBloqueio.value) {
        mostrarMensagem("Selecione uma data.");
        return;
      }

      await db.collection("diasBloqueados")
        .doc(dataBloqueio.value)
        .set({ criadoEm: new Date() });

      mostrarMensagem("Dia bloqueado com sucesso!");
      dataBloqueio.value="";
      carregarDiasBloqueados();
    });
  }

  async function carregarDiasBloqueados() {

    const lista = $("listaDiasBloqueados");
    if (!lista) return;

    lista.innerHTML="";

    const snapshot = await db.collection("diasBloqueados").get();

    if(snapshot.empty){
      lista.innerHTML="<li>Nenhum dia bloqueado</li>";
      return;
    }

    snapshot.forEach(doc=>{
      const li=document.createElement("li");
      li.innerHTML=`
        📅 ${doc.id}
        <button class="btn-desbloquear">Desbloquear</button>
      `;

      li.querySelector("button").onclick=async()=>{
        if(!auth.currentUser){
          mostrarMensagem("Você precisa estar logado.");
          return;
        }
        await db.collection("diasBloqueados").doc(doc.id).delete();
        mostrarMensagem("Dia desbloqueado!");
        carregarDiasBloqueados();
      };

      lista.appendChild(li);
    });
  }

  /* ===== AGENDA ATIVA ===== */

async function carregarAdmin() {

  const listaAg = $("listaAgendamentos");
  const listaHist = $("listaHistorico");

  const qtdHojeEl = $("qtdHoje");
  const faturamentoHojeEl = $("faturamentoHoje");
  const proximoClienteEl = $("proximoCliente");

  if (!listaAg || !listaHist) return;

  listaAg.innerHTML = "";
  listaHist.innerHTML = "";

  let qtdHoje = 0;
  let faturamentoHoje = 0;
  let proximoCliente = null;

  const snapshot = await db.collection("agendamentos")
    .orderBy("data")
    .orderBy("hora")
    .get();

  const agora = new Date();
  const hojeStr = agora.toISOString().split("T")[0];

  let dataAtual = "";

  snapshot.forEach(doc => {

    const a = doc.data();

    const [A, M, D] = a.data.split("-").map(Number);
    const [H, Mi] = a.hora.split(":").map(Number);
    const dataHora = new Date(A, M - 1, D, H, Mi);

    // ===== DASHBOARD =====
    if (a.data === hojeStr) {
      qtdHoje++;
      faturamentoHoje += Number(a.preco);
    }

    if (dataHora > agora) {
      if (!proximoCliente || dataHora < proximoCliente.dataHora) {
        proximoCliente = {
          nome: a.nome,
          hora: a.hora,
          dataHora
        };
      }
    }

    // ===== AGENDA ATIVA =====
    if (dataHora >= agora) {

      // Criar título da data se mudou
      if (a.data !== dataAtual) {

        dataAtual = a.data;

        const tituloData = document.createElement("h3");
        tituloData.style.marginTop = "20px";
        tituloData.textContent = formatarDataComDia(a.data);

        listaAg.appendChild(tituloData);
      }

      const li = document.createElement("li");
      li.innerHTML = `
        ⏰ ${a.hora} – ✂️ ${a.servico}<br>
        👤 ${a.nome}<br>
        📱 ${a.telefone}
      `;

      const btnRemover = document.createElement("button");
      btnRemover.textContent = "❌ Remover";
      btnRemover.style.marginTop = "8px";
      btnRemover.style.background = "#c0392b";
      btnRemover.style.color = "white";

      btnRemover.onclick = async () => {
        if (!confirm("Deseja remover este agendamento?")) return;
        await db.collection("agendamentos").doc(doc.id).delete();
        mostrarMensagem("Agendamento removido com sucesso!");
        carregarAdmin();
      };

      li.appendChild(btnRemover);
      listaAg.appendChild(li);

    } else {

      // ===== HISTÓRICO =====
      const li = document.createElement("li");
      li.style.opacity = "0.6";
      li.innerHTML = `
        📅 ${formatarDataComDia(a.data)}<br>
        ⏰ ${a.hora}<br>
        ✂️ ${a.servico}<br>
        👤 ${a.nome}<br>
        📱 ${a.telefone}
      `;

      listaHist.appendChild(li);
    }

  });

  // ===== ATUALIZAR DASHBOARD =====
  if (qtdHojeEl) qtdHojeEl.textContent = qtdHoje;
  if (faturamentoHojeEl) faturamentoHojeEl.textContent = `R$ ${faturamentoHoje}`;

  if (proximoClienteEl) {
    if (proximoCliente) {
      proximoClienteEl.textContent =
        `${proximoCliente.nome} às ${proximoCliente.hora}`;
    } else {
      proximoClienteEl.textContent = "Nenhum";
    }
  }

}

  /* ===== ADMIN LOGIN ===== */

  const btnAdmin=$("btnAdmin");
  const areaLoginAdmin=$("areaLoginAdmin");
  const areaAdmin=$("areaAdmin");
  const btnLoginAdmin=$("btnLoginAdmin");
  const btnSairAdmin=$("btnSairAdmin");

  let taps=0;

  document.querySelector("h1").addEventListener("click",()=>{
    taps++;
    if(taps===5){
      btnAdmin.style.display="block";
      mostrarMensagem("Modo administrador liberado");
      taps=0;
    }
  });

  btnAdmin.onclick=()=>{
    areaLoginAdmin.style.display="block";
    btnAdmin.style.display="none";
  };

  btnLoginAdmin.onclick=async()=>{
    const email=$("emailAdmin").value.trim();
    const senha=$("senhaAdmin").value.trim();

    if(!email||!senha){
      mostrarMensagem("Preencha email e senha");
      return;
    }

    await auth.signInWithEmailAndPassword(email,senha);
    areaLoginAdmin.style.display="none";
    areaAdmin.style.display="block";
    carregarAdmin();
    carregarDiasBloqueados();
  };

  btnSairAdmin.onclick=async()=>{
    await auth.signOut();
    areaAdmin.style.display="none";
    btnAdmin.style.display="block";
  };

  /* ===== PWA ===== */

  let deferredPrompt=null;
  const btnInstalar=$("btnInstalar");

  if(btnInstalar){

    btnInstalar.style.display="none";

   window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstalar.style.display = "block";
});

    btnInstalar.onclick=async()=>{
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice;
      if(choice.outcome==="accepted"){
        btnInstalar.style.display="none";
      }
      deferredPrompt=null;
    };

    window.addEventListener("appinstalled",()=>{
      btnInstalar.style.display="none";
    });

    if(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone===true
    ){
      btnInstalar.style.display="none";
    }
  }

});