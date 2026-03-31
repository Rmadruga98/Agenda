document.addEventListener("DOMContentLoaded", () => {

/* ===== DETECTAR NAVEGADOR DO INSTAGRAM ===== */

function detectarInstagram() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (ua.includes("Instagram")) {
    const aviso = document.createElement("div");
    aviso.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);color:#fff;z-index:99999;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;font-size:16px;";
    aviso.innerHTML = `
      <div style="max-width:350px;">
        <h2 style="color:#f1c40f;margin-bottom:10px;">⚠️ Atenção</h2>
        <p style="margin-bottom:15px;">Para agendar corretamente,<br>abra este link no navegador do celular.</p>
        <div style="background:#1c1c1c;padding:12px;border-radius:10px;margin-bottom:15px;">
          👉 Toque nos <b>3 pontinhos</b> no canto superior<br>
          👉 Clique em <b>"Abrir no navegador"</b>
        </div>
        <p style="font-size:13px;color:#aaa;margin-bottom:20px;">(Isso evita erros no agendamento)</p>
        <button id="btnAbrirFora" style="background:#f1c40f;color:#000;border:none;padding:14px 20px;border-radius:10px;font-size:16px;font-weight:bold;width:100%;cursor:pointer;">
          🌐 Siga as instruções acima
        </button>
      </div>
    `;
    document.body.appendChild(aviso);
    document.getElementById("btnAbrirFora").onclick = () => {
      window.location.href = window.location.href;
    };
  }
}

detectarInstagram();

  /* ===== CONFIG ===== */
  const WHATSAPP = "5535998066403";
  const HORA_ABERTURA = 8;

  const $ = id => document.getElementById(id);
  const db = window.db;
  const auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  let proximoCliente = null;

  /* ===== FIREBASE NOTIFICAÇÕES ===== */
  let messaging = null;
  if (firebase.messaging && firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
  }

  /* ===== ATIVAR NOTIFICAÇÕES ===== */
  async function ativarNotificacoes() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        if (!messaging) return;
        const token = await messaging.getToken({
          vapidKey: "BFxMHW4NyJl9QWwIWXYqQDq7XCW1TufXeM32xmKQXLPpOS8-quleDiW_eolIyqaw7pTDPrTKoGqoOrV-NxtvRWk"
        });
        console.log("Token de notificação:", token);
      }
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);
    }
  }
  if ("Notification" in window) {
    ativarNotificacoes();
  }

  /* ===== SERVIÇOS ===== */
  const servicos = {
    "Corte Simples":               30,
    "Corte Degradê":               35,
    "Corte Navalhado":             38,
    "Barba":                       20,
    "Corte + Barba":               55,
    "Sobrancelha":                 10,
    "Pezinho":                     20,
    "Corte + Barba + Sobrancelha": 60,
    "Pigmentação + Corte":         60,
    "Luzes + Corte":               75,
    "Platinado + Corte":          110
  };

  /* ===== HORÁRIO POR DIA (0=Dom...6=Sáb) ===== */
  const horarioFechamentoPorDia = {
    0: null,  // domingo → fechado
    1: null,  // segunda → fechado
    2: 21,    // terça
    3: 21,    // quarta
    4: 18,    // quinta
    5: 18,    // sexta
    6: 17     // sábado
  };

  /* ===== REFS DOM ===== */
  const form          = $("formAgendamento");
  const dataInput     = $("data");
  const horaInput     = $("hora");
  const horariosDiv   = $("horarios");
  const precoInput    = $("preco");
  const servicoSelect = $("servico");
  const precoBox      = $("precoBox");
  const precoValor    = $("precoValor");

  /* ===== DATA MÍNIMA = HOJE ===== */
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataInput.min = hoje.toISOString().split("T")[0];

  /* ===== UTILITÁRIOS ===== */

  function formatarDataComDia(dataISO) {
    const dias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
    const [a, m, d] = dataISO.split("-").map(Number);
    const dt = new Date(a, m - 1, d);
    return `${dias[dt.getDay()]} – ${dt.toLocaleDateString("pt-BR")}`;
  }

  function formatarTelefone(valor) {
    const nums = valor.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2)  return nums;
    if (nums.length <= 7)  return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
    if (nums.length <= 11) return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
    return valor;
  }

  function telefoneParaNumeros(v) {
    return v.replace(/\D/g, "");
  }

  function mostrarMensagem(texto, tipo = "sucesso") {
    // Remove toasts anteriores para evitar acúmulo
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const msg = document.createElement("div");
    msg.className = "toast" + (tipo === "erro" ? " toast-erro" : "");
    msg.textContent = texto;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3600);
  }

  /* ===== MODAL DE CONFIRMAÇÃO CUSTOMIZADO (substitui confirm()) ===== */
  function confirmarAcao(mensagem) {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.style.zIndex = "2000";
      overlay.innerHTML = `
        <div class="modal-box">
          <h3 style="margin-bottom:14px;">⚠️ Confirmação</h3>
          <p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.8);margin-bottom:20px;">${mensagem}</p>
          <div class="modal-btns">
            <button class="btn-modal-cancelar" id="btnConfirmNao">❌ Não</button>
            <button class="btn-modal-confirmar" id="btnConfirmSim">✅ Sim</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector("#btnConfirmSim").onclick = () => { overlay.remove(); resolve(true); };
      overlay.querySelector("#btnConfirmNao").onclick = () => { overlay.remove(); resolve(false); };
    });
  }

  /* ===== MÁSCARAS ===== */
  function aplicarMascaraTel(inputEl) {
    inputEl.addEventListener("input", () => {
      inputEl.value = formatarTelefone(inputEl.value);
    });
  }

  aplicarMascaraTel($("telefone"));
  aplicarMascaraTel($("telefoneConsulta"));

  /* ===== PREÇO AO SELECIONAR SERVIÇO ===== */
  servicoSelect.addEventListener("change", e => {
    const valor = servicos[e.target.value];
    if (valor) {
      precoInput.value = valor;
      precoValor.textContent = `R$ ${valor},00`;
      precoBox.style.display = "flex";
    } else {
      precoBox.style.display = "none";
    }
  });

  /* ===== CARREGAR HORÁRIOS ===== */
  async function carregarHorarios(data) {
    try {
      horariosDiv.innerHTML = `<p class="loading-horarios"><span class="spinner"></span> Verificando horários...</p>`;
      horaInput.value = "";

      const dataSelecionada = new Date(data + "T00:00");
      const diaSemana = dataSelecionada.getDay();
      const horaFechamentoDia = horarioFechamentoPorDia[diaSemana];

      if (horaFechamentoDia === null) {
        horariosDiv.innerHTML = "<p class='dia-bloqueado'>❌ Não atendemos domingo e segunda-feira</p>";
        atualizarContador(0);
        return;
      }

      const bloqueado = await db.collection("diasBloqueados").doc(data).get();
      if (bloqueado.exists) {
        horariosDiv.innerHTML = "<p class='dia-bloqueado'>🔒 Dia bloqueado pelo barbeiro</p>";
        atualizarContador(0);
        return;
      }

      const [snap, bloqueadosSnap] = await Promise.all([
        db.collection("agendamentos").where("data", "==", data).get(),
        db.collection("horariosBloqueados").where("data", "==", data).get()
      ]);

      const ocupados = snap.docs
        .map(d => d.data())
        .filter(a => !a.cancelado)
        .map(a => a.hora);

      const bloqueados = bloqueadosSnap.docs.map(d => d.data().hora);

      let horariosDisponiveis = 0;
      horariosDiv.innerHTML = "";
      const agoraReal = new Date();

      for (let h = HORA_ABERTURA; h < horaFechamentoDia; h++) {
        if (h === 12) continue; // almoço

        const hora = String(h).padStart(2, "0") + ":00";
        const dataHora = new Date(
          dataSelecionada.getFullYear(),
          dataSelecionada.getMonth(),
          dataSelecionada.getDate(),
          h
        );

        // Ocultar horários passados no dia de hoje
        if (dataSelecionada.toDateString() === hoje.toDateString() && agoraReal >= dataHora) continue;
        if (ocupados.includes(hora) || bloqueados.includes(hora)) continue;

        horariosDisponiveis++;

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

      atualizarContador(horariosDisponiveis);

      if (horariosDiv.innerHTML === "") {
        horariosDiv.innerHTML = `<p class='dia-bloqueado' style="text-align:center;width:100%;display:block;">⚠️ Todos os horários já estão preenchidos</p>`;
      }

      // Scroll suave até os horários após carregamento
      setTimeout(() => {
        horariosDiv.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);

      // Atualizar label com horário de funcionamento
      const labelHorario = $("horarioLabel");
      if (labelHorario) {
        const nomesDias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
        labelHorario.textContent = `${nomesDias[diaSemana]}: das ${HORA_ABERTURA}h às ${horaFechamentoDia - 1}h`;
      }

    } catch (error) {
      console.error("Erro ao carregar horários:", error);
      horariosDiv.innerHTML = "<p class='dia-bloqueado'>⚠️ Erro ao carregar horários. Tente novamente.</p>";
    }
  }

  /* ===== ATUALIZAR CONTADOR DE HORÁRIOS ===== */
  function atualizarContador(horariosDisponiveis) {
    const contador = $("contadorHorarios");
    if (!contador) return;

    if (horariosDisponiveis === 0) {
      contador.textContent = "";
      contador.style.display = "none";
      return;
    }

    contador.style.display = "block";

    if (horariosDisponiveis === 1) {
      contador.textContent = "🔥 Último horário disponível!";
      contador.className = "contador-horarios contador-critico";
    } else if (horariosDisponiveis <= 3) {
      contador.textContent = `⚠️ Últimos ${horariosDisponiveis} horários disponíveis`;
      contador.className = "contador-horarios contador-alerta";
    } else {
      contador.textContent = `📅 ${horariosDisponiveis} horários disponíveis neste dia`;
      contador.className = "contador-horarios";
    }
  }

  dataInput.addEventListener("change", () => {
    if (dataInput.value) carregarHorarios(dataInput.value);
  });

  /* ===== MODAL DE CONFIRMAÇÃO DE AGENDAMENTO ===== */
  const modal      = $("modalConfirmacao");
  const modalResumo = $("modalResumo");
  let dadosAgendamento = null;

  $("modalCancelar").onclick = () => {
    modal.style.display = "none";
    dadosAgendamento = null;
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = false;
    $("btnAgendarText").style.display = "";
    $("btnAgendarLoading").style.display = "none";
  };

  $("modalConfirmar").onclick = () => {
    modal.style.display = "none";
    if (dadosAgendamento) confirmarAgendamento(dadosAgendamento);
  };

  /* ===== AGENDAR ===== */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const btnSubmit = form.querySelector("button[type='submit']");
    btnSubmit.disabled = true;
    $("btnAgendarText").style.display = "none";
    $("btnAgendarLoading").style.display = "";

    const nome     = $("nome").value.trim();
    const telefone = telefoneParaNumeros($("telefone").value.trim());
    const servico  = servicoSelect.value;

    if (!nome || !telefone || !dataInput.value || !horaInput.value || !servico) {
      mostrarMensagem("Preencha todos os campos.", "erro");
      btnSubmit.disabled = false;
      $("btnAgendarText").style.display = "";
      $("btnAgendarLoading").style.display = "none";
      return;
    }

    if (nome.length < 2) {
      mostrarMensagem("Nome muito curto. Digite seu nome completo.", "erro");
      btnSubmit.disabled = false;
      $("btnAgendarText").style.display = "";
      $("btnAgendarLoading").style.display = "none";
      return;
    }

    if (telefone.length !== 11) {
      mostrarMensagem("WhatsApp inválido. Use 11 dígitos com DDD.", "erro");
      btnSubmit.disabled = false;
      $("btnAgendarText").style.display = "";
      $("btnAgendarLoading").style.display = "none";
      return;
    }

    dadosAgendamento = { nome, telefone, servico };

    modalResumo.innerHTML = `
      👤 <strong>${nome}</strong><br>
      📱 ${formatarTelefone(telefone)}<br>
      📅 ${formatarDataComDia(dataInput.value)}<br>
      ⏰ ${horaInput.value}<br>
      ✂️ ${servico}<br>
      💰 <strong>R$ ${servicos[servico]},00</strong>
    `;

    $("btnAgendarText").style.display = "";
    $("btnAgendarLoading").style.display = "none";
    btnSubmit.disabled = false;

    modal.style.display = "flex";
  });

  async function confirmarAgendamento({ nome, telefone, servico }) {
    const btnSubmit = form.querySelector("button[type='submit']");
    btnSubmit.disabled = true;
    $("btnAgendarText").style.display = "none";
    $("btnAgendarLoading").style.display = "";

    const codigoCancelamento = Math.floor(1000 + Math.random() * 9000);

    const ag = {
      nome,
      telefone,
      data: dataInput.value,
      hora: horaInput.value,
      servico,
      preco: servicos[servico],
      codigoCancelamento,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // ✅ Anti-conflito: verifica apenas agendamentos válidos (não cancelados)
      const verifica = await db.collection("agendamentos")
        .where("data", "==", ag.data)
        .where("hora", "==", ag.hora)
        .get();

      const existeValido = verifica.docs.some(doc => !doc.data().cancelado);

      if (existeValido) {
        mostrarMensagem("⚡ Esse horário acabou de ser reservado! Escolha outro.", "erro");
        btnSubmit.disabled = false;
        $("btnAgendarText").style.display = "";
        $("btnAgendarLoading").style.display = "none";
        carregarHorarios(ag.data);
        return;
      }

      await db.collection("agendamentos").add(ag);

    } catch (error) {
      console.error(error);
      mostrarMensagem("Erro ao salvar agendamento. Tente novamente.", "erro");
      btnSubmit.disabled = false;
      $("btnAgendarText").style.display = "";
      $("btnAgendarLoading").style.display = "none";
      return;
    }

    mostrarMensagem("✅ Agendamento realizado com sucesso!");

    const mensagem =
`📌 NOVO AGENDAMENTO CONFIRMADO ✅

👤 ${ag.nome}
📅 ${formatarDataComDia(ag.data)}
⏰ ${ag.hora}
✂️ ${ag.servico}
💰 R$ ${ag.preco},00

🔐 Código de cancelamento: *${codigoCancelamento}*

⚠️ Guarde este código caso precise cancelar.
⚠️ Cancelamentos com no mínimo 1 hora de antecedência.

Barber Madruga 💈`;

    const url = `https://wa.me/55${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;

    form.reset();
    horariosDiv.innerHTML = `<div class="hint-horario">👆 Selecione uma data para ver os horários disponíveis</div>`;
    precoBox.style.display = "none";
    atualizarContador(0);
    btnSubmit.disabled = false;
    $("btnAgendarText").style.display = "";
    $("btnAgendarLoading").style.display = "none";

    try {
      mostrarMensagem("📲 Abrindo WhatsApp...");
      setTimeout(() => { window.location.href = url; }, 600);
    } catch (e) {
      mostrarMensagem("⚠️ Não foi possível abrir o WhatsApp", "erro");
    }
  }

  /* ===== MEUS AGENDAMENTOS ===== */

  const btnMeus      = $("btnMeusAgendamentos");
  const areaMeus     = $("areaMeusAgendamentos");
  const btnConsultar = $("btnConsultarAgendamentos");
  const listaMeus    = $("listaMeusAgendamentos");

  if (btnMeus) {
    btnMeus.onclick = () => {
      const aberto = areaMeus.style.display !== "none";
      areaMeus.style.display = aberto ? "none" : "block";
      btnMeus.textContent = aberto ? "📋 Ver meus agendamentos" : "🔼 Fechar";
      if (!aberto) {
        setTimeout(() => areaMeus.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    };
  }

  if (btnConsultar) {
    btnConsultar.onclick = async () => {
      const telefone       = telefoneParaNumeros($("telefoneConsulta").value.trim());
      const codigoDigitado = $("codigoConsulta").value.trim();

      if (!telefone || !codigoDigitado) {
        mostrarMensagem("Digite o telefone e o código.", "erro");
        return;
      }

      $("btnConsultarText").style.display = "none";
      $("btnConsultarLoading").style.display = "";
      btnConsultar.disabled = true;
      listaMeus.innerHTML = "";

      try {
        const snapshot = await db.collection("agendamentos")
          .where("telefone", "==", telefone)
          .get();

        let encontrou = false;

        snapshot.forEach(doc => {
          const a = doc.data();
          const [A, M, D] = a.data.split("-").map(Number);
          const [H, Mi]   = a.hora.split(":").map(Number);
          const dataHora  = new Date(A, M - 1, D, H, Mi);
          const agora     = new Date();
          const diferencaMin = (dataHora - agora) / 60000;

          // Validar código
          if (Number(a.codigoCancelamento) !== Number(codigoDigitado)) return;

          encontrou = true;

          const li = document.createElement("li");
          li.innerHTML = `
            📅 ${formatarDataComDia(a.data)}<br>
            ⏰ ${a.hora}<br>
            ✂️ ${a.servico}<br>
            💰 R$ ${a.preco},00
          `;

          // Visual cancelado
          if (a.cancelado) {
            li.style.opacity = "0.4";
            li.style.textDecoration = "line-through";
            li.innerHTML += "<br><span style='color:#ff6b6b;font-weight:600;'>❌ Cancelado</span>";
          }

          // Botão cancelar (apenas futuros com > 60 min de antecedência)
          if (!a.cancelado && diferencaMin >= 60) {
            const btnCancelar = document.createElement("button");
            btnCancelar.textContent = "❌ Cancelar agendamento";
            btnCancelar.className = "btn-cancelar-cliente";

            btnCancelar.onclick = async () => {
              btnCancelar.disabled = true;
              btnCancelar.textContent = "⏳ Aguardando...";

              const confirmado = await confirmarAcao(
                "Tem certeza que deseja cancelar?<br><br>Esse horário será liberado para outro cliente."
              );

              if (!confirmado) {
                btnCancelar.disabled = false;
                btnCancelar.textContent = "❌ Cancelar agendamento";
                return;
              }

              // Revalida tempo antes de cancelar
              const agoraAtual = new Date();
              const diffAtual  = (dataHora - agoraAtual) / 60000;

              if (diffAtual < 60) {
                mostrarMensagem("⚠️ Cancelamento permitido apenas com 1h de antecedência", "erro");
                btnCancelar.disabled = false;
                btnCancelar.textContent = "❌ Cancelar agendamento";
                return;
              }

              btnCancelar.textContent = "⏳ Cancelando...";

              await db.collection("agendamentos").doc(doc.id).update({
                cancelado: true,
                telefone: a.telefone,
                codigoCancelamento: a.codigoCancelamento
              });

              mostrarMensagem("✅ Agendamento cancelado!");

              const mensagemCancelamento =
`❌ CANCELAMENTO DE AGENDAMENTO

👤 ${a.nome}
📅 ${formatarDataComDia(a.data)}
⏰ ${a.hora}
✂️ ${a.servico}

Seu horário foi cancelado com sucesso.

Barber Madruga 💈`;

              const url = `https://wa.me/55${WHATSAPP}?text=${encodeURIComponent(mensagemCancelamento)}`;
              window.open(url, "_blank");

              li.style.opacity = "0.4";
              li.style.textDecoration = "line-through";
              btnCancelar.remove();
              li.innerHTML += "<br><span style='color:#ff6b6b;font-weight:600;'>❌ Cancelado</span>";
            };

            li.appendChild(btnCancelar);
          }

          // Aviso se agendamento já passou e não está cancelado
          if (!a.cancelado && diferencaMin < 0) {
            li.innerHTML += "<br><span style='color:#888;font-size:12px;'>✔️ Atendimento realizado</span>";
          }

          listaMeus.appendChild(li);
        });

        if (!encontrou) {
          listaMeus.innerHTML = "<li style='border-left-color:#666;color:#aaa;'>Nenhum agendamento encontrado ou código incorreto.</li>";
        }

      } catch (err) {
        console.error(err);
        mostrarMensagem("Erro ao consultar agendamentos.", "erro");
      }

      $("btnConsultarText").style.display = "";
      $("btnConsultarLoading").style.display = "none";
      btnConsultar.disabled = false;
    };
  }

  /* ===== BLOQUEAR DIA ===== */
  const btnBloquearDia = $("btnBloquearDia");
  const dataBloqueio   = $("dataBloqueio");

  if (btnBloquearDia) {
    btnBloquearDia.addEventListener("click", async () => {
      if (!auth.currentUser) { mostrarMensagem("Faça login como administrador.", "erro"); return; }
      if (!dataBloqueio.value) { mostrarMensagem("Selecione uma data.", "erro"); return; }

      btnBloquearDia.disabled = true;
      btnBloquearDia.textContent = "⏳ Bloqueando...";

      await db.collection("diasBloqueados")
        .doc(dataBloqueio.value)
        .set({ criadoEm: firebase.firestore.FieldValue.serverTimestamp() });

      mostrarMensagem(`✅ Dia ${formatarDataComDia(dataBloqueio.value)} bloqueado!`);
      dataBloqueio.value = "";
      btnBloquearDia.disabled = false;
      btnBloquearDia.textContent = "🔒 Bloquear Dia";
      carregarDiasBloqueados();
    });
  }

  /* ===== BLOQUEAR HORÁRIO ===== */
  const btnBloquearHorario = $("btnBloquearHorario");
  const dataBloqueioHora   = $("dataBloqueioHora");
  const horaBloqueio       = $("horaBloqueio");

  if (btnBloquearHorario) {
    btnBloquearHorario.onclick = async () => {
      if (!auth.currentUser) { mostrarMensagem("Faça login como administrador.", "erro"); return; }
      if (!dataBloqueioHora.value || !horaBloqueio.value) { mostrarMensagem("Selecione data e hora.", "erro"); return; }

      btnBloquearHorario.disabled = true;
      btnBloquearHorario.textContent = "⏳ Bloqueando...";

      await db.collection("horariosBloqueados").add({
        data: dataBloqueioHora.value,
        hora: horaBloqueio.value.slice(0, 5),
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });

      mostrarMensagem("⛔ Horário bloqueado com sucesso!");
      carregarHorariosBloqueados();

      dataBloqueioHora.value = "";
      horaBloqueio.value = "";
      btnBloquearHorario.disabled = false;
      btnBloquearHorario.textContent = "⛔ Bloquear Horário";
    };
  }

  /* ===== DESBLOQUEAR HORÁRIO ===== */
  async function carregarHorariosBloqueados() {
    const lista = $("listaHorariosBloqueados");
    if (!lista) return;

    lista.innerHTML = "<li style='color:#666;'>Carregando...</li>";

    const snapshot = await db.collection("horariosBloqueados")
      .orderBy("data")
      .get();

    if (snapshot.empty) {
      lista.innerHTML = "<li style='color:#666;'>Nenhum horário bloqueado</li>";
      return;
    }

    lista.innerHTML = "";

    snapshot.forEach(doc => {
      const h  = doc.data();
      const li = document.createElement("li");
      li.innerHTML = `📅 ${formatarDataComDia(h.data)}&nbsp;&nbsp;⏰ ${h.hora}`;

      const btnDesbloquear = document.createElement("button");
      btnDesbloquear.textContent = "🔓 Desbloquear";
      btnDesbloquear.style.cssText = "margin-top:8px;background:#2a2a2a;color:#d4af37;border:1px solid #d4af37;padding:6px;width:100%;";

      btnDesbloquear.onclick = async () => {
        if (!auth.currentUser) { mostrarMensagem("Faça login como administrador.", "erro"); return; }
        btnDesbloquear.disabled = true;
        btnDesbloquear.textContent = "⏳...";
        await db.collection("horariosBloqueados").doc(doc.id).delete();
        mostrarMensagem("✅ Horário desbloqueado!");
        carregarHorariosBloqueados();
      };

      li.appendChild(btnDesbloquear);
      lista.appendChild(li);
    });
  }

  /* ===== DIAS BLOQUEADOS ===== */
  async function carregarDiasBloqueados() {
    const lista = $("listaDiasBloqueados");
    if (!lista) return;

    lista.innerHTML = `<li style="color:#666;font-style:italic;">Carregando...</li>`;

    const snapshot = await db.collection("diasBloqueados").get();

    if (snapshot.empty) {
      lista.innerHTML = "<li style='color:#666;border-left-color:#444;'>Nenhum dia bloqueado</li>";
      return;
    }

    lista.innerHTML = "";

    // Ordenar por data
    const docs = snapshot.docs.sort((a, b) => (a.id > b.id ? 1 : -1));

    docs.forEach(doc => {
      const li = document.createElement("li");
      li.innerHTML = `📅 ${formatarDataComDia(doc.id)}`;

      const btnDesbloquear = document.createElement("button");
      btnDesbloquear.textContent = "🔓 Desbloquear";
      btnDesbloquear.style.cssText = "margin-top:8px;background:#2a2a2a;color:#d4af37;border:1px solid #d4af37;font-size:12px;padding:6px 12px;width:100%;";

      btnDesbloquear.onclick = async () => {
        if (!auth.currentUser) { mostrarMensagem("Você precisa estar logado.", "erro"); return; }
        btnDesbloquear.disabled = true;
        btnDesbloquear.textContent = "⏳...";
        await db.collection("diasBloqueados").doc(doc.id).delete();
        mostrarMensagem("✅ Dia desbloqueado!");
        carregarDiasBloqueados();
      };

      li.appendChild(btnDesbloquear);
      lista.appendChild(li);
    });
  }

  /* ===== CHAMAR PRÓXIMO CLIENTE ===== */
  const btnChamarProximo = $("btnChamarProximo");

  if (btnChamarProximo) {
    btnChamarProximo.onclick = () => {
      if (!proximoCliente) {
        mostrarMensagem("Nenhum cliente na agenda para hoje.");
        return;
      }

      const mensagem =
`Olá ${proximoCliente.nome}, seu horário é o próximo! 💈
A Barbearia Madruga já está te aguardando.

📅 ${formatarDataComDia(proximoCliente.data)}
⏰ ${proximoCliente.hora}
✂️ ${proximoCliente.servico}`;

      const url = `https://wa.me/55${proximoCliente.telefone}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, "_blank");
      mostrarMensagem(`📲 Chamando ${proximoCliente.nome}...`);
    };
  }

  /* ===== CARREGAR ADMIN ===== */
  async function carregarAdmin() {
    const listaAg   = $("listaAgendamentos");
    const listaHist = $("listaHistorico");

    const qtdHojeEl                = $("qtdHoje");
    const faturamentoHojeEl        = $("faturamentoHoje");
    const proximoClienteEl         = $("proximoCliente");
    const faturamentoMesEl         = $("faturamentoMes");
    const qtdMesEl                 = $("qtdMes");
    const faturamentoMesAnteriorEl = $("faturamentoMesAnterior");

    if (!listaAg || !listaHist) return;

    listaAg.innerHTML   = `<li style="color:#666;font-style:italic;">Carregando...</li>`;
    listaHist.innerHTML = `<li style="color:#666;font-style:italic;">Carregando...</li>`;

    proximoCliente = null;

    db.collection("agendamentos")
      .orderBy("data")
      .orderBy("hora")
      .onSnapshot(snapshot => {

        let qtdHoje = 0, faturamentoHoje = 0;
        let faturamentoMes = 0, qtdMes = 0, faturamentoMesAnterior = 0;
        proximoCliente = null;

        listaAg.innerHTML   = "";
        listaHist.innerHTML = "";

        const agora          = new Date();
        const hojeStr        = agora.toISOString().split("T")[0];
        const mesAtual       = agora.getMonth();
        const anoAtual       = agora.getFullYear();
        const mesAnterior    = mesAtual === 0 ? 11 : mesAtual - 1;
        const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

        let dataAtual    = "";
        let totalAtivo   = 0;
        let totalHistorico = 0;

        snapshot.forEach(doc => {
          const a = doc.data();
          if (a.cancelado) return;

          const [A, M, D] = a.data.split("-").map(Number);
          const [H, Mi]   = a.hora.split(":").map(Number);
          const dataHora  = new Date(A, M - 1, D, H, Mi);

          // Dashboard hoje
          if (a.data === hojeStr) {
            qtdHoje++;
            faturamentoHoje += Number(a.preco);
          }

          // Próximo cliente (futuro mais próximo)
          if (dataHora > agora) {
            if (!proximoCliente || dataHora < proximoCliente.dataHora) {
              proximoCliente = { nome: a.nome, hora: a.hora, telefone: a.telefone, servico: a.servico, data: a.data, dataHora };
            }
          }

          // Faturamento mês atual
          if (dataHora.getMonth() === mesAtual && dataHora.getFullYear() === anoAtual) {
            faturamentoMes += Number(a.preco);
            qtdMes++;
          }

          // Faturamento mês anterior
          if (dataHora.getMonth() === mesAnterior && dataHora.getFullYear() === anoMesAnterior) {
            faturamentoMesAnterior += Number(a.preco);
          }

          // ===== AGENDA ATIVA =====
          if (dataHora >= agora) {
            totalAtivo++;

            if (a.data !== dataAtual) {
              dataAtual = a.data;
              const tituloData = document.createElement("h3");
              tituloData.textContent = formatarDataComDia(a.data);
              tituloData.style.cssText = "margin:18px 0 8px;font-size:14px;color:#d4af37;text-transform:uppercase;letter-spacing:1px;";
              listaAg.appendChild(tituloData);
            }

            const li = document.createElement("li");

            if (a.chamado) {
              li.style.borderLeft = "4px solid #27ae60";
              li.style.background = "#1a2f1a";
            }

            // Destaque no próximo da fila
            if (proximoCliente && a.nome === proximoCliente.nome && a.hora === proximoCliente.hora && a.data === proximoCliente.data) {
              li.style.borderLeft = "4px solid #d4af37";
              li.style.background = "#2a2200";
            }

            li.innerHTML = `
              <strong>⏰ ${a.hora}</strong> — ✂️ ${a.servico} — 💰 R$ ${a.preco},00<br>
              👤 ${a.nome} &nbsp;|&nbsp; 📱 ${formatarTelefone(a.telefone)}
            `;

            // Botão Remover
            const btnRemover = document.createElement("button");
            btnRemover.textContent = "❌ Remover";
            btnRemover.style.cssText = "margin-top:8px;background:#c0392b;color:white;font-size:12px;padding:7px 14px;";

            btnRemover.onclick = async () => {
              const confirmado = await confirmarAcao(`Remover agendamento de <strong>${a.nome}</strong> às ${a.hora}?`);
              if (!confirmado) return;
              btnRemover.disabled = true;
              btnRemover.textContent = "⏳...";
              try {
                await db.collection("agendamentos").doc(doc.id).update({
                  cancelado: true,
                  telefone: a.telefone,
                  codigoCancelamento: a.codigoCancelamento
                });
                mostrarMensagem("✅ Agendamento removido!");
                li.remove();
              } catch (erro) {
                console.error(erro);
                mostrarMensagem("❌ Erro ao remover", "erro");
                btnRemover.disabled = false;
                btnRemover.textContent = "❌ Remover";
              }
            };

            // Botão WhatsApp
            const btnMensagem = document.createElement("button");
            btnMensagem.textContent = "💬 WhatsApp";
            btnMensagem.style.cssText = "margin-top:8px;margin-left:6px;background:#27ae60;color:white;font-size:12px;padding:7px 14px;";

            btnMensagem.onclick = () => {
              const mensagemCliente =
`Olá ${a.nome}!

Seu horário foi confirmado na Barbearia Madruga 💈

📅 ${formatarDataComDia(a.data)}
⏰ ${a.hora}
✂️ ${a.servico}

Qualquer dúvida estou por aqui!`;
              window.open(`https://wa.me/55${a.telefone}?text=${encodeURIComponent(mensagemCliente)}`, "_blank");
            };

            li.appendChild(btnRemover);
            li.appendChild(btnMensagem);
            listaAg.appendChild(li);

          } else {
            // ===== HISTÓRICO =====
            totalHistorico++;
            const li = document.createElement("li");
            li.style.opacity = "0.55";
            li.style.borderLeftColor = "#444";
            li.innerHTML = `
              📅 ${formatarDataComDia(a.data)} &nbsp;⏰ ${a.hora}<br>
              ✂️ ${a.servico} — 💰 R$ ${a.preco},00<br>
              👤 ${a.nome} | 📱 ${formatarTelefone(a.telefone)}
            `;
            listaHist.appendChild(li);
          }
        });

        if (totalAtivo === 0)     listaAg.innerHTML   = "<li style='color:#666;border-left-color:#444;'>Nenhum agendamento ativo</li>";
        if (totalHistorico === 0) listaHist.innerHTML = "<li style='color:#666;border-left-color:#444;'>Nenhum histórico</li>";

        // Atualizar dashboard
        if (qtdHojeEl)                qtdHojeEl.textContent                = qtdHoje;
        if (faturamentoHojeEl)        faturamentoHojeEl.textContent        = `R$ ${faturamentoHoje},00`;
        if (proximoClienteEl)         proximoClienteEl.textContent         = proximoCliente ? `${proximoCliente.nome} às ${proximoCliente.hora}` : "Nenhum";
        if (faturamentoMesEl)         faturamentoMesEl.textContent         = `R$ ${faturamentoMes},00`;
        if (qtdMesEl)                 qtdMesEl.textContent                 = qtdMes;
        if (faturamentoMesAnteriorEl) faturamentoMesAnteriorEl.textContent = `R$ ${faturamentoMesAnterior},00`;

        // Atualiza estado visual do botão chamar próximo
        if (btnChamarProximo) {
          btnChamarProximo.disabled = !proximoCliente;
          btnChamarProximo.style.opacity = proximoCliente ? "1" : "0.45";
        }
      });
  }

  /* ===== RELATÓRIO DIÁRIO ===== */
  const btnRelatorio = $("btnRelatorioDiario");
  if (btnRelatorio) {
    btnRelatorio.addEventListener("click", async () => {
      if (!auth.currentUser) { mostrarMensagem("Faça login como administrador.", "erro"); return; }

      btnRelatorio.disabled = true;
      btnRelatorio.textContent = "⏳ Gerando relatório...";

      try {
        const agora   = new Date();
        const hojeStr = agora.toISOString().split("T")[0];

        const snap = await db.collection("agendamentos")
          .where("data", "==", hojeStr)
          .orderBy("hora")
          .get();

        // Filtra cancelados para o relatório
        const docs = snap.docs.filter(doc => !doc.data().cancelado);

        if (docs.length === 0) {
          mostrarMensagem("Nenhum agendamento ativo hoje para gerar relatório.");
          btnRelatorio.disabled = false;
          btnRelatorio.textContent = "📊 Enviar relatório do dia";
          return;
        }

        let linhas = "";
        let totalFaturamento = 0;

        docs.forEach(doc => {
          const a = doc.data();
          linhas += `  • ${a.hora} — ${a.nome} — ${a.servico} (R$ ${a.preco},00)\n`;
          totalFaturamento += Number(a.preco);
        });

        const relatorio =
`📊 RELATÓRIO DO DIA — ${agora.toLocaleDateString("pt-BR")}

${linhas}
─────────────────────
👥 Total de atendimentos: ${docs.length}
💰 Faturamento total: R$ ${totalFaturamento},00
─────────────────────

Barber Madruga 💈`;

        window.open(`https://wa.me/55${WHATSAPP}?text=${encodeURIComponent(relatorio)}`, "_blank");
        mostrarMensagem("✅ Relatório gerado com sucesso!");

      } catch (err) {
        console.error(err);
        mostrarMensagem("Erro ao gerar relatório.", "erro");
      }

      btnRelatorio.disabled = false;
      btnRelatorio.textContent = "📊 Enviar relatório do dia";
    });
  }

  /* ===== LIMPAR HISTÓRICO ===== */
  const btnLimpar = $("btnLimparHistorico");
  if (btnLimpar) {
    btnLimpar.addEventListener("click", async () => {
      if (!auth.currentUser) return;

      const confirmado = await confirmarAcao("Deseja apagar TODO o histórico?<br><br>⚠️ Esta ação <strong>não pode</strong> ser desfeita.");
      if (!confirmado) return;

      btnLimpar.disabled = true;
      btnLimpar.textContent = "⏳ Apagando...";

      const agora = new Date();
      const snap  = await db.collection("agendamentos").get();
      const batch = db.batch();
      let count   = 0;

      snap.forEach(doc => {
        const a = doc.data();
        const [A, M, D] = a.data.split("-").map(Number);
        const [H, Mi]   = a.hora.split(":").map(Number);
        const dataHora  = new Date(A, M - 1, D, H, Mi);
        if (dataHora < agora) { batch.delete(doc.ref); count++; }
      });

      if (count > 0) {
        await batch.commit();
        mostrarMensagem(`✅ ${count} registros do histórico apagados!`);
      } else {
        mostrarMensagem("Nenhum histórico para apagar.");
      }

      btnLimpar.disabled = false;
      btnLimpar.textContent = "🧹 Apagar histórico";
    });
  }

  /* ===== REFRESH ADMIN ===== */
  const btnRefresh = $("btnRefreshAdmin");
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      carregarAdmin();
      carregarDiasBloqueados();
      carregarHorariosBloqueados();
      mostrarMensagem("🔄 Dados atualizados!");
    };
  }

  /* ===== ADMIN LOGIN ===== */
  const btnAdmin       = $("btnAdmin");
  const areaLoginAdmin = $("areaLoginAdmin");
  const areaAdmin      = $("areaAdmin");
  const btnLoginAdmin  = $("btnLoginAdmin");
  const btnSairAdmin   = $("btnSairAdmin");
  const erroLogin      = $("erroLogin");

  auth.onAuthStateChanged(user => {
    const autorizado = localStorage.getItem("barbeariaAdminAutorizado");
    if (user && autorizado === "true") {
      areaAdmin.style.display = "block";
      areaLoginAdmin.style.display = "none";
      btnAdmin.style.display = "none";
      carregarAdmin();
      carregarDiasBloqueados();
      carregarHorariosBloqueados();
      escutarNovosAgendamentos();
    }
  });

  let taps = 0;
  document.querySelector("h1").addEventListener("click", () => {
    taps++;
    if (taps === 5) {
      btnAdmin.style.display = "block";
      mostrarMensagem("🔓 Modo administrador liberado");
      taps = 0;
    }
  });

  btnAdmin.onclick = () => {
    areaLoginAdmin.style.display = "block";
    btnAdmin.style.display = "none";
    erroLogin.style.display = "none";
  };

  btnLoginAdmin.onclick = async () => {
    const email = $("emailAdmin").value.trim();
    const senha = $("senhaAdmin").value.trim();

    if (!email || !senha) {
      erroLogin.textContent = "Preencha email e senha.";
      erroLogin.style.display = "block";
      return;
    }

    $("btnLoginText").style.display = "none";
    $("btnLoginLoading").style.display = "";
    btnLoginAdmin.disabled = true;
    erroLogin.style.display = "none";

    try {
      await auth.signInWithEmailAndPassword(email, senha);
      localStorage.setItem("barbeariaAdminAutorizado", "true");
      areaLoginAdmin.style.display = "none";
      areaAdmin.style.display = "block";
      carregarAdmin();
      carregarDiasBloqueados();
      carregarHorariosBloqueados();
      escutarNovosAgendamentos();
      mostrarMensagem("✅ Login realizado com sucesso!");
    } catch (err) {
      console.error(err);
      const mensagensErro = {
        "auth/wrong-password":    "Senha incorreta.",
        "auth/user-not-found":    "E-mail não encontrado.",
        "auth/invalid-email":     "E-mail inválido.",
        "auth/too-many-requests": "Muitas tentativas. Tente mais tarde.",
        "auth/invalid-credential":"E-mail ou senha incorretos."
      };
      erroLogin.textContent = mensagensErro[err.code] || "Erro ao fazer login.";
      erroLogin.style.display = "block";
    }

    $("btnLoginText").style.display = "";
    $("btnLoginLoading").style.display = "none";
    btnLoginAdmin.disabled = false;
  };

  $("senhaAdmin").addEventListener("keydown", e => {
    if (e.key === "Enter") btnLoginAdmin.click();
  });

  btnSairAdmin.onclick = async () => {
    const confirmado = await confirmarAcao("Deseja realmente sair da área administrativa?");
    if (!confirmado) return;
    await auth.signOut();
    localStorage.removeItem("barbeariaAdminAutorizado");
    areaAdmin.style.display = "none";
    areaLoginAdmin.style.display = "none";
    btnAdmin.style.display = "none";
    mostrarMensagem("👋 Sessão encerrada");
  };

  /* ===== PWA ===== */
  let deferredPrompt = null;
  const btnInstalar  = $("btnInstalar");

  if (btnInstalar) {
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredPrompt = e;
      btnInstalar.style.display = "block";
      mostrarMensagem("📲 Instale o app para agendar mais rápido!");
    });

    btnInstalar.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") btnInstalar.style.display = "none";
      deferredPrompt = null;
    };

    window.addEventListener("appinstalled", () => {
      btnInstalar.style.display = "none";
    });

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      btnInstalar.style.display = "none";
    }
  }

  /* ===== ESCUTAR NOVOS AGENDAMENTOS (ADMIN) ===== */
  function escutarNovosAgendamentos() {
    let primeiraExecucao = true;

    db.collection("agendamentos")
      .orderBy("criadoEm", "desc")
      .limit(1)
      .onSnapshot(snapshot => {
        if (primeiraExecucao) { primeiraExecucao = false; return; }

        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            const a = change.doc.data();
            mostrarMensagem(`🔔 Novo agendamento: ${a.nome} às ${a.hora}`);
            const audio = new Audio("notificacao.mp3");
            audio.volume = 1;
            audio.play().catch(() => {});
          }
        });
      });
  }

});
