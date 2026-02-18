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

  /* WHATS */
  const LIMITE = 1000 * 60 * 60 * 24 * 30;
  const dados = JSON.parse(localStorage.getItem("verificacaoWhats") || "null");

  if (dados && Date.now() - dados.data < LIMITE) {
    $("verificacaoTelefone").style.display = "none";
    $("formAgendamento").style.display = "block";
  }

  $("btnConfirmarTelefone").onclick = () => {
    const tel = $("telefoneVerificacao").value.replace(/\D/g,"");
    if (tel.length !== 11) return alert("WhatsApp inválido");

    localStorage.setItem("verificacaoWhats", JSON.stringify({telefone:tel,data:Date.now()}));
    $("verificacaoTelefone").style.display="none";
    $("formAgendamento").style.display="block";
  };

  /* PREÇO */
  $("servico").onchange = e => {
    $("preco").value = servicos[e.target.value] ? `R$ ${servicos[e.target.value]}` : "";
  };

  /* DATA */
  $("data").onchange = () => carregarHorarios($("data").value);

  async function carregarHorarios(data){
    $("horarios").innerHTML="";
    const snap = await db.collection("agendamentos").where("data","==",data).get();
    const ocupados = snap.docs.map(d=>d.data().hora);

    for(let h=HORA_ABERTURA;h<HORA_FECHAMENTO;h++){
      if(h===12) continue;
      const hora=`${String(h).padStart(2,"0")}:00`;
      if(ocupados.includes(hora)) continue;

      const b=document.createElement("button");
      b.textContent=hora;
      b.onclick=()=>{$("hora").value=hora;};
      $("horarios").appendChild(b);
    }
  }

  $("formAgendamento").onsubmit = async e => {
    e.preventDefault();
    await db.collection("agendamentos").add({
      nome:$("nome").value,
      telefone:JSON.parse(localStorage.getItem("verificacaoWhats")).telefone,
      data:$("data").value,
      hora:$("hora").value,
      servico:$("servico").value,
      preco:servicos[$("servico").value],
      criadoEm:new Date()
    });
    window.open(`https://wa.me/${WHATSAPP}`);
    alert("Agendado!");
    e.target.reset();
  };

  /* ===== ADMIN ===== */
  async function verificarSenhaAdmin(senha){
    const d=await db.collection("config").doc("admin").get();
    return d.exists && senha===d.data().senha;
  }

  function solicitarSenhaAdmin(){
    const s=prompt("Senha admin:");
    if(!s) return;
    verificarSenhaAdmin(s).then(ok=>{
      if(ok) abrirAdmin();
      else alert("Senha incorreta");
    });
  }

  /* GATILHO 3 TOQUES */
  let toques=0,timer;
  $("tituloApp").addEventListener("touchend",()=>{
    toques++;
    if(toques===1) timer=setTimeout(()=>toques=0,2000);
    if(toques===3){clearTimeout(timer);toques=0;solicitarSenhaAdmin();}
  });

  /* MODAL */
  function abrirAdmin(){
    $("adminModal").style.display="flex";
    const hoje=new Date().toISOString().split("T")[0];
    $("adminData").value=hoje;
    carregarAgenda(hoje);
  }

  $("fecharAdmin").onclick=()=>$("adminModal").style.display="none";
  $("sairAdmin").onclick=()=>$("adminModal").style.display="none";

  $("adminData").onchange=()=>carregarAgenda($("adminData").value);

  async function carregarAgenda(data){
    $("adminLista").innerHTML="...";
    const snap=await db.collection("agendamentos").where("data","==",data).orderBy("hora").get();
    $("adminLista").innerHTML="";
    snap.forEach(doc=>{
      const a=doc.data();
      $("adminLista").innerHTML+=`
        <div>
          <b>${a.hora}</b> - ${a.nome}<br>
          ${a.servico}<br>
          <button onclick="window.open('https://wa.me/55${a.telefone}')">Whats</button>
          <button onclick="db.collection('agendamentos').doc('${doc.id}').delete().then(()=>carregarAgenda('${data}'))">Cancelar</button>
        </div><hr>`;
    });
  }

});