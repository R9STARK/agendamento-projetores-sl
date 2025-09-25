// script.js
// Importar e configurar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDtS7lwfHQ_PqmT1KZYQ-XGmzRjZYIbUmU",
  authDomain: "projeto-agendamentos-sl.firebaseapp.com",
  projectId: "projeto-agendamentos-sl",
  storageBucket: "projeto-agendamentos-sl.firebasestorage.app",
  messagingSenderId: "608651973909",
  appId: "1:608651973909:web:d60ad775e66dca4b06451c"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("agendamento-form");
    const projetorSelect = document.getElementById("projetor");
    const horariosContainer = document.getElementById("horarios-container");
    const tabelaAgendamentos = document.getElementById("tabela-agendamentos");

    function obterProximoDiaUtil() {
    const hoje = new Date();
    let diaAgendamento = new Date(hoje);

    // Se já passou das 17h, agenda para o próximo dia
    if (hoje.getHours() >= 17) {
        diaAgendamento.setDate(diaAgendamento.getDate() + 1);
    }

    // Pula sábados (6) e domingos (0)
    while (diaAgendamento.getDay() === 6 || diaAgendamento.getDay() === 0) {
        diaAgendamento.setDate(diaAgendamento.getDate() + 1);
    }

    // Formatar data no padrão YYYY-MM-DD sem UTC
    const ano = diaAgendamento.getFullYear();
    const mes = String(diaAgendamento.getMonth() + 1).padStart(2, "0");
    const dia = String(diaAgendamento.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

    async function carregarAgendamentos() {
        const querySnapshot = await getDocs(collection(db, "agendamentos"));
        let agendamentos = [];
        querySnapshot.forEach((doc) => {
            agendamentos.push({ id: doc.id, ...doc.data() });
        });
        return agendamentos;
    }

    async function atualizarHorariosDisponiveis() {
        const projetorSelecionado = projetorSelect.value;
        horariosContainer.innerHTML = "";

        const horarios = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º"];
        const agendamentos = await carregarAgendamentos();
        const dataFormatada = obterProximoDiaUtil();

        const horariosOcupados = agendamentos
            .filter(a => a.projetor === projetorSelecionado && a.data === dataFormatada)
            .map(a => a.horario);
        
        horariosContainer.style.display = "flex";
        horariosContainer.style.flexWrap = "nowrap";
        horariosContainer.style.justifyContent = "center";
        horariosContainer.style.alignItems = "center";
        horariosContainer.style.width = "100%";
        horariosContainer.style.overflow = "hidden";
        horariosContainer.style.padding = "10px";
        horariosContainer.style.whiteSpace = "nowrap";
        
        horarios.forEach(horario => {
            const label = document.createElement("label");
            label.style.display = "inline-flex";
            label.style.alignItems = "center";
            label.style.marginRight = "10px";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = horario;
            checkbox.name = "horario";
            if (horariosOcupados.includes(horario)) {
                checkbox.disabled = true;

                label.classList.add("horario-indisponivel"); // Adiciona classe vermelha
            } else {
                label.classList.add("horario-disponivel"); // Adiciona classe verde

            }
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(horario));
            horariosContainer.appendChild(label);
        });
    }

    async function atualizarListaAgendamentos() {
        if (!tabelaAgendamentos) return;
        tabelaAgendamentos.innerHTML = "<tr><th>Professor</th><th>Item Agendado</th><th>Horários</th></tr>";  // <th>Data</th> - Remove o nome DATA da tabela (Tela de agendamentos)
        
        const agendamentos = await carregarAgendamentos();
        const hoje = new Date().toISOString().split('T')[0]; // Obtém a data de hoje
    
        const agendamentosAtivos = agendamentos.filter(a => a.data >= hoje); // Filtra apenas os agendamentos futuros ou de hoje
    
        const agendamentosAgrupados = {};
        agendamentosAtivos.forEach(a => {
            const chave = `${a.professor}-${a.projetor}-${a.data}`;
            if (!agendamentosAgrupados[chave]) {
                agendamentosAgrupados[chave] = { professor: a.professor, projetor: a.projetor, horarios: [], data: a.data };
            }
            agendamentosAgrupados[chave].horarios.push(a.horario);
        });
    
        Object.values(agendamentosAgrupados).forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${a.professor}</td><td>${a.projetor}</td><td>${a.horarios.sort().join(", ")}</td>`;  // <td>${a.data}</td> - Remove a coluna por completo da tabela (Tela de agendamentos)
            tabelaAgendamentos.appendChild(tr);
        });
    }

    async function atualizarHistoricoAgendamentos() {
        const tabelaHistorico = document.getElementById("tabela-historico");
        if (!tabelaHistorico) return; 
        tabelaHistorico.innerHTML = "<tr><th>Professor</th><th>Item Agendado</th><th>Horários</th><th>Data</th></tr>";  //
        
        const agendamentos = await carregarAgendamentos();
        
        const hoje = new Date();
        const semanaPassada = new Date(hoje);
        semanaPassada.setDate(hoje.getDate() - 7); // Pega registros dos últimos 7 dias
        
        const agendamentosSemana = agendamentos.filter(a => {
            const dataAgendamento = new Date(a.data);
            return dataAgendamento >= semanaPassada && dataAgendamento <= hoje;
        });
    
        const agendamentosAgrupados = {};
        agendamentosSemana.forEach(a => {
            const chave = `${a.professor}-${a.projetor}-${a.data}`;
            if (!agendamentosAgrupados[chave]) {
                agendamentosAgrupados[chave] = { professor: a.professor, projetor: a.projetor, horarios: [], data: a.data };
            }
            agendamentosAgrupados[chave].horarios.push(a.horario);
        });
    
        Object.values(agendamentosAgrupados).forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${a.professor}</td><td>${a.projetor}</td><td>${a.horarios.sort().join(", ")}</td><td>${a.data}</td>`;
            tabelaHistorico.appendChild(tr);
        });
    }
    
    // Chamar a função ao carregar a página de histórico
    document.addEventListener("DOMContentLoaded", atualizarHistoricoAgendamentos);

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const professor = document.getElementById("professor").value;
            const projetor = projetorSelect.value;
            const horariosSelecionados = Array.from(document.querySelectorAll("input[name='horario']:checked"))
                .map(cb => cb.value);
            const dataFormatada = obterProximoDiaUtil();

            if (!professor || !projetor || horariosSelecionados.length === 0) return;

            for (let horario of horariosSelecionados) {
                await addDoc(collection(db, "agendamentos"), { professor, projetor, horario, data: dataFormatada });
            }
            atualizarHorariosDisponiveis();
            atualizarListaAgendamentos();
            form.reset();
        });

        projetorSelect.addEventListener("change", atualizarHorariosDisponiveis);
        atualizarHorariosDisponiveis();
    }
    atualizarListaAgendamentos();


    async function limparAgendamentosDiarios() {
        const agora = new Date();

        if (agora.getHours() >= 17) {
            const dataAtual = agora.toISOString().split('T')[0]; // Obtém a data no formato "YYYY-MM-DD"
            const ultimaLimpeza = localStorage.getItem("ultimaLimpeza");

            if (agora.getHours() === 17 && ultimaLimpeza !== dataAtual) {  
                // Se ainda não foi feita hoje, apaga os agendamentos
                const querySnapshot = await getDocs(collection(db, "agendamentos"));
                querySnapshot.forEach(async (docSnap) => {
                    await deleteDoc(doc(db, "agendamentos", docSnap.id));
                });

                atualizarListaAgendamentos();
                localStorage.setItem("ultimaLimpeza", dataAtual); // Registra a última limpeza
            }
        }
    }

    // Chama a função imediatamente para garantir que a limpeza seja feita quando necessário
    limparAgendamentosDiarios();

    // Verifica a cada 1 minuto
    setInterval(limparAgendamentosDiarios, 60000);



});


