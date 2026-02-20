document.addEventListener("DOMContentLoaded", () => {

  /* ===== CONFIG ===== */
  const WHATSAPP = "5535998066403";
  const SENHA_ADMIN = "madruga123";
  const HORA_ABERTURA = 8;
  const HORA_FECHAMENTO = 19;

  const $ = id => document.getElementById(id);
  const db = window.db;

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

  /* ===== HORÁRIOS ===== */
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

    const ag = {
      nome,
      telefone,
      data:dataInput.value,
      hora:horaInput.value,
      servico,
      preco:servicos[servico],
      criadoEm:new Date()
    };

    await db.collection("agendamentos").add(ag);

    mostrarMensagem("Agendamento realizado com sucesso!");

    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        `📌 NOVO AGENDAMENTO\n👤 ${ag.nome}\n📅 ${formatarDataComDia(ag.data)}\n⏰ ${ag.hora}\n✂️ ${ag.servico}\n💰 R$ ${ag.preco}`
      )}`
    );

    form.reset();
    horariosDiv.innerHTML="";
  });

  /* ===== MEUS AGENDAMENTOS ===== */

  const btnMeus = $("btnMeusAgendamentos");
  const areaMeus = $("areaMeusAgendamentos");
  const btnConsultar = $("btnConsultarAgendamentos");
  const listaMeus = $("listaMeusAgendamentos");

  if(btnMeus){
    btnMeus.onclick = ()=>{
      areaMeus.style.display =
        areaMeus.style.display==="none"?"block":"none";
    };
  }

  if(btnConsultar){

    btnConsultar.onclick = async ()=>{

      const telefone = $("telefoneConsulta").value.trim();

      if(!telefone){
        mostrarMensagem("Digite seu WhatsApp");
        return;
      }

      listaMeus.innerHTML="";

      const snapshot = await db.collection("agendamentos")
        .where("telefone","==",telefone)
        .get();

      const agora = new Date();
      let encontrou=false;

      snapshot.forEach(doc=>{

        const a = doc.data();

        const [A,M,D]=a.data.split("-").map(Number);
        const [H,Mi]=a.hora.split(":").map(Number);
        const dataHora = new Date(A,M-1,D,H,Mi);

        if(dataHora>=agora){

          encontrou=true;

          const li = document.createElement("li");
          li.innerHTML=`
            📅 ${formatarDataComDia(a.data)}<br>
            ⏰ ${a.hora}<br>
            ✂️ ${a.servico}<br>
          `;

          const btnCancelar=document.createElement("button");
          btnCancelar.textContent="❌ Cancelar";
          btnCancelar.style.marginTop="8px";
          btnCancelar.style.background="#c0392b";
          btnCancelar.style.color="white";

          btnCancelar.onclick=async()=>{

            if(!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

            await db.collection("agendamentos").doc(doc.id).delete();

            const mensagem=`
❌ CANCELAMENTO DE AGENDAMENTO

👤 ${a.nome}
📅 ${formatarDataComDia(a.data)}
⏰ ${a.hora}
✂️ ${a.servico}
📱 ${a.telefone}
`;

            window.open(
              `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`
            );

            mostrarMensagem("Agendamento cancelado com sucesso!");

            li.remove();
          };

          li.appendChild(btnCancelar);
          listaMeus.appendChild(li);
        }

      });

      if(!encontrou){
        listaMeus.innerHTML="<li>Nenhum agendamento futuro encontrado.</li>";
      }

    };

  }

});