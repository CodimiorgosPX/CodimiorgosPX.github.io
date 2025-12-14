// ----------------------------Lógica das Tarefas(LgcTrf:5)------------
document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ tarefas.js carregado!");

    // Verifica se está logado como aluno
    verificarLoginAluno();

    // Carrega as tarefas
    carregarTarefasAluno();

    // Variável global para tarefa atual no modal
    window.tarefaAtual = null;
});





// LgcTrf-Function 5.1: se o aluno não estiver logado ele está expulso
function verificarLoginAluno() {
    const tipoUsuario = sessionStorage.getItem('tipoUsuario');
    if (tipoUsuario !== 'aluno') {
        alert('Por favor, faça login como aluno primeiro!');
        window.location.href = 'index.html';
    }
}




// LgcTrf-Function 5.2: Carregar as tarefas no banco de dados
function carregarTarefasAluno() {
    // 1. Pega tarefas do localStorage
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    console.log("Tarefas encontradas:", tarefas);

    // 2. Filtra tarefas ativas (não excluídas)
    const tarefasAtivas = tarefas.filter(t => t.status !== 'excluida' && t.status === 'ativa');

    // 3. Elementos do DOM
    const container = document.getElementById('lista-tarefas-aluno');
    const semTarefas = document.getElementById('sem-tarefas');

    // 4. Se não houver tarefas
    if (tarefasAtivas.length === 0) {
        semTarefas.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    // 5. Esconde mensagem "sem tarefas"
    semTarefas.style.display = 'none';

    // 6. Cria cards para cada tarefa
    container.innerHTML = '';

    tarefasAtivas.forEach(tarefa => {
        // Determina status da tarefa
        const status = determinarStatusTarefa(tarefa);

        // Cria o card da tarefa
        const card = criarCardTarefa(tarefa, status);
        container.appendChild(card);
    });
}




// LgcTrf-Function 5.3: Função para classificar tarefas
function determinarStatusTarefa(tarefa) {
    // Verifica se já foi entregue
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];
    const entregaAluno = entregas.find(e =>
        e.tarefaId === tarefa.id &&
        e.alunoEmail === sessionStorage.getItem('emailUsuario')
    );

    if (entregaAluno) {
        return { tipo: 'entregue', texto: 'Entregue' };
    }

    // Verifica se está atrasada
    const hoje = new Date();
    const dataEntrega = new Date(tarefa.dataEntrega);

    if (dataEntrega < hoje) {
        return { tipo: 'atrasado', texto: 'Atrasada' };
    }

    // Se não, está pendente
    return { tipo: 'pendente', texto: 'Pendente' };
}




// LgcTrf-Function 5.4: Função para criar espaço para tarefa
function criarCardTarefa(tarefa, status) {
    const card = document.createElement('div');
    card.className = 'tarefa-card';

    // Formata a data
    const dataFormatada = formatarData(tarefa.dataEntrega);

    // Conta questões
    const numQuestoes = tarefa.questoes ? tarefa.questoes.length : 0;
    const totalPontos = tarefa.totalPontos || 0;

    card.innerHTML = `
        <div class="tarefa-header">
            <div>
                <h3 class="tarefa-titulo">${tarefa.titulo}</h3>
                <span class="status-tarefa status-${status.tipo}">${status.texto}</span>
            </div>
            <span class="tarefa-tipo">${tarefa.tipo}</span>
        </div>
        
        <div style="margin: 15px 0;">
            <div style="display: flex; gap: 20px; font-size: 14px; opacity: 0.9;">
                <div><strong>📝 Questões:</strong> ${numQuestoes}</div>
                <div><strong>⭐ Pontos:</strong> ${totalPontos}</div>
            </div>
        </div>
        
        <div class="tarefa-info">
            <div class="info-item">
                📅 <strong>Entrega:</strong> ${dataFormatada}
            </div>
            <div class="info-item">
                👨‍🏫 <strong>Professor:</strong> ${tarefa.professor || 'Professor'}
            </div>
        </div>
        
        <button class="btn-responder" onclick="abrirTarefa(${tarefa.id})" ${status.tipo === 'entregue' ? 'disabled style="opacity: 0.5;"' : ''}>
            ${status.tipo === 'entregue' ? '✅ Já Respondida' : '📝 Responder Tarefa'}
        </button>
    `;

    return card;
}




// LgcTrf-Function 5.5: Função para formatar dados mais fáceis de ler pelo javascript
function formatarData(dataString) {
    if (!dataString) return 'Data não definida';

    const data = new Date(dataString);
    if (isNaN(data.getTime())) return 'Data inválida';

    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    if (data.toDateString() === hoje.toDateString()) {
        return 'Hoje';
    } else if (data.toDateString() === amanha.toDateString()) {
        return 'Amanhã';
    }

    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}




// LgcTrf-Function 5.5: Função para abrir a tarefa
function abrirTarefa(tarefaId) {
    // Encontra a tarefa
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    const tarefa = tarefas.find(t => t.id === tarefaId);

    if (!tarefa) {
        alert('Tarefa não encontrada!');
        return;
    }

    // Verifica se já respondeu
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];
    const entregaExistente = entregas.find(e =>
        e.tarefaId === tarefaId &&
        e.alunoEmail === sessionStorage.getItem('emailUsuario')
    );

    if (entregaExistente) {
        const reenviar = confirm(
            `Você já enviou esta tarefa.\nDeseja enviar uma nova resposta?`
        );
        if (!reenviar) return;
    }

    // Guarda tarefa atual
    window.tarefaAtual = tarefa;

    // Preenche modal
    document.getElementById('modal-titulo').textContent = tarefa.titulo;

    // Carrega questões
    carregarQuestoesNoModal(tarefa);

    // Mostra modal
    document.getElementById('modal-tarefa').style.display = 'block';
    document.body.style.overflow = 'hidden';
}




// LgcTrf-Function 5.6: Função para responder questões
function carregarQuestoesNoModal(tarefa) {
    const container = document.getElementById('modal-questoes');

    if (!tarefa.questoes || tarefa.questoes.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.7;">Esta tarefa não tem questões definidas.</p>';
        return;
    }

    // Contador de questões
    container.innerHTML = `
        <div class="contador-questoes">
            📝 ${tarefa.questoes.length} questão(ões) • ⭐ ${tarefa.totalPontos || 0} pontos no total
        </div>
    `;

    // Adiciona cada questão
    tarefa.questoes.forEach((questao, index) => {
        const questaoDiv = document.createElement('div');
        questaoDiv.className = 'questao-modal';
        questaoDiv.dataset.questaoId = questao.id;

        let respostaHTML = '';

        // HTML baseado no tipo de questão
        switch (questao.tipo) {
            case 'texto':
                respostaHTML = `
                    <div class="resposta-area">
                        <textarea class="resposta-texto" 
                                  placeholder="Digite sua resposta aqui..." 
                                  data-questao-id="${questao.id}"></textarea>
                    </div>
                `;
                break;

            case 'multipla_escolha':
                let alternativasHTML = '';
                if (questao.alternativas && questao.alternativas.length > 0) {
                    questao.alternativas.forEach((alt, altIndex) => {
                        alternativasHTML += `
                            <label class="alternativa-item-modal">
                                <input type="radio" name="questao_${questao.id}" 
                                       value="${altIndex}" data-questao-id="${questao.id}">
                                <span class="alternativa-texto-modal">${alt}</span>
                            </label>
                        `;
                    });
                } else {
                    alternativasHTML = '<p style="opacity: 0.7; font-style: italic;">Nenhuma alternativa definida.</p>';
                }

                respostaHTML = `
                    <div class="alternativas-lista-modal">
                        ${alternativasHTML}
                    </div>
                `;
                break;

            case 'verdadeiro_falso':
                respostaHTML = `
                    <div class="vf-container">
                        <div class="vf-opcao" onclick="selecionarVF(this, ${questao.id}, 'V')">
                            ✅ Verdadeiro
                        </div>
                        <div class="vf-opcao" onclick="selecionarVF(this, ${questao.id}, 'F')">
                            ❌ Falso
                        </div>
                        <input type="hidden" id="vf_${questao.id}" data-questao-id="${questao.id}" value="">
                    </div>
                `;
                break;
        }

        questaoDiv.innerHTML = `
            <div class="questao-header-modal">
                <div class="questao-titulo-modal">Questão ${index + 1}</div>
                <span class="questao-pontos">${questao.pontos || 1.0} pts</span>
            </div>
            
            <div class="questao-enunciado">
                ${questao.enunciado}
            </div>
            
            ${respostaHTML}
        `;

        container.appendChild(questaoDiv);
    });
}




// LgcTrf-Function 5.7: Função para abrir a tarefa
function selecionarVF(elemento, questaoId, valor) {
    // Remove seleção de todos os botões desta questão
    const container = elemento.closest('.vf-container');
    container.querySelectorAll('.vf-opcao').forEach(btn => {
        btn.classList.remove('selecionada');
    });

    // Seleciona o clicado
    elemento.classList.add('selecionada');

    // Atualiza input hidden
    document.getElementById(`vf_${questaoId}`).value = valor;
}




// LgcTrf-Function 5.8: Função para fechar as tarefas
function fecharModalTarefa() {
    document.getElementById('modal-tarefa').style.display = 'none';
    document.body.style.overflow = 'auto';
    window.tarefaAtual = null;
}




// LgcTrf-Function 5.9: Função para enviar respostas
function enviarRespostas() {
    if (!window.tarefaAtual) return;

    const tarefa = window.tarefaAtual;
    const respostas = [];
    let todasRespondidas = true;

    // Coletar respostas de cada questão
    tarefa.questoes.forEach(questao => {
        let resposta = '';

        switch (questao.tipo) {
            case 'texto':
                const textarea = document.querySelector(`textarea[data-questao-id="${questao.id}"]`);
                resposta = textarea ? textarea.value.trim() : '';
                if (!resposta) todasRespondidas = false;
                break;

            case 'multipla_escolha':
                const radio = document.querySelector(`input[name="questao_${questao.id}"]:checked`);
                if (radio) {
                    const altIndex = parseInt(radio.value);
                    resposta = questao.alternativas && questao.alternativas[altIndex]
                        ? `Alternativa ${String.fromCharCode(65 + altIndex)}`
                        : `Opção ${altIndex + 1}`;
                } else {
                    todasRespondidas = false;
                }
                break;

            case 'verdadeiro_falso':
                const vfInput = document.getElementById(`vf_${questao.id}`);
                resposta = vfInput ? vfInput.value : '';
                if (!resposta) todasRespondidas = false;
                break;
        }

        respostas.push({
            questaoId: questao.id,
            resposta: resposta,
            nota: null,
            pontosQuestao: questao.pontos || 1.0
        });
    });

    // Validar se todas foram respondidas
    if (!todasRespondidas) {
        const continuar = confirm('Algumas questões não foram respondidas. Deseja enviar mesmo assim?');
        if (!continuar) return;
    }

    // Criar entrega
    const novaEntrega = {
        id: Date.now(),
        tarefaId: tarefa.id,
        tarefaTitulo: tarefa.titulo,
        alunoEmail: sessionStorage.getItem('emailUsuario'),
        alunoNome: sessionStorage.getItem('emailUsuario').split('@')[0],
        respostas: respostas,
        dataEntrega: new Date().toISOString(),
        notaTotal: null,
        status: 'entregue',
        correcao: null,
        dataCorrecao: null,
        professor: null
    };

    // Salvar no localStorage
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];

    // Remove entrega anterior se existir
    const entregasFiltradas = entregas.filter(e =>
        !(e.tarefaId === tarefa.id && e.alunoEmail === novaEntrega.alunoEmail)
    );

    entregasFiltradas.push(novaEntrega);
    localStorage.setItem('entregas', JSON.stringify(entregasFiltradas));

    // Atualizar contador de entregas na tarefa
    atualizarContadorEntregas(tarefa.id);

    // Fechar modal e atualizar lista
    fecharModalTarefa();
    carregarTarefasAluno();

    // Mostrar mensagem
    alert('✅ Respostas enviadas com sucesso! Aguarde a correção do professor.');
}




// LgcTrf-Function 5.10: Função para atualizar o número de entregas e atualizar que foi entregue
function atualizarContadorEntregas(tarefaId) {
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];

    const contador = entregas.filter(e => e.tarefaId === tarefaId).length;

    // Atualiza a tarefa
    const tarefaIndex = tarefas.findIndex(t => t.id === tarefaId);
    if (tarefaIndex !== -1) {
        tarefas[tarefaIndex].entregas = contador;
        localStorage.setItem('tarefas', JSON.stringify(tarefas));
    }
}

// Fechar modal com ESC
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.tarefaAtual) {
        fecharModalTarefa();
    }
});