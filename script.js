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

  const horariosDiv = $("horarios");
  const horaInput = $("hora");
  const dataInput = $("data");
  const precoInput = $("preco");
  const form = $("formAgendamento");

  /* PREÇO */
  $("servico").addEventListener("change", e => {
    precoInput.value = servicos[e.target.value]
      ? `R$ ${servicos[e.target.value]}`
      : "";
  });

  /* HORÁRIOS */
  async function carregarHorarios(data) {
    horariosDiv.innerHTML = "";
    horaInput.value = "";

    const dia = new Date(data + "T00:00").getDay();
    if (dia === 0 || dia === 1) {
      alert("Não atendemos domingo e segunda");
      dataInput.value = "";
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
        horaInput.value = hora;
      };

      horariosDiv.appendChild(btn);
    }
  }

  dataInput.addEventListener("change", () => {
    if (dataInput.value) carregarHorarios(dataInput.value);
  });

  /* AGENDAR */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (!horaInput.value) {
      alert("Selecione um horário");
      return;
    }

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

    alert("Agendamento confirmado!");
    form.reset();
    horariosDiv.innerHTML = "";
    precoInput.value = "";
  });

  /* ADMIN */
  const btnAdmin = $("btnAdmin");
  const areaAdmin = $("areaAdmin");
  const btnSairAdmin = $("btnSairAdmin");
  const listaAg = $("listaAgendamentos");
  const listaHist = $("listaHistorico");

  let clicks = 0;
  document.querySelector("h1").onclick = () => {
    if (++clicks === 5) {
      btnAdmin.style.display = "block";
      alert("Modo administrador liberado");
    }
  };

  btnAdmin.onclick = async () => {
    if (prompt("Senha admin:") !== SENHA_ADMIN) return alert("Senha incorreta");
    areaAdmin.style.display = "block";
    btnAdmin.style.display = "none";
    carregarAdmin();
  };

  btnSairAdmin.onclick = () => {
    areaAdmin.style.display = "none";
    btnAdmin.style.display = "block";
  };

  async function carregarAdmin() {
    listaAg.innerHTML = "";
    listaHist.innerHTML = "";

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const snap = await db.collection("agendamentos").get();

    snap.forEach(doc => {
      const a = doc.data();
      const dh = new Date(`${a.data}T${a.hora}`);
      const li = document.createElement("li");

      li.innerHTML = `📅 ${a.data} ⏰ ${a.hora}<br>👤 ${a.nome}<br>✂️ ${a.servico} — R$ ${a.preco}`;

      if (dh >= hoje) {
        const btn = document.createElement("button");
        btn.textContent = "❌ Remover";
        btn.onclick = async () => {
          if (!confirm("Remover agendamento?")) return;
          await db.collection("agendamentos").doc(doc.id).delete();
          carregarAdmin();
        };
        li.appendChild(btn);
        listaAg.appendChild(li);
      } else {
        li.style.opacity = "0.6";
        listaHist.appendChild(li);
      }
    });
  }

  /* RELATÓRIO */
  $("btnRelatorioDiario").onclick = async () => {
    const hoje = new Date().toISOString().split("T")[0];
    const snap = await db.collection("agendamentos").where("data", "==", hoje).get();
    if (snap.empty) return alert("Nenhum atendimento hoje");

    let total = 0;
    let txt = `📊 RELATÓRIO DO DIA\n📅 ${hoje}\n\n`;

    snap.docs.map(d => d.data()).sort((a,b)=>a.hora.localeCompare(b.hora))
      .forEach(a => {
        txt += `⏰ ${a.hora} | ${a.nome} | ${a.servico} | R$ ${a.preco}\n`;
        total += Number(a.preco);
      });

    txt += `\n💰 Total: R$ ${total}`;

    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`);
  };

});