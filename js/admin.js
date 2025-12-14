// ----------------------------Lógica do ADMIN(LgcAdm:4)------------
document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ admin.js carregado!");

    // 1. Verifica se é professor
    verificarAcessoAdmin();

    // 2. Configura logout
    document.getElementById('logout-admin').addEventListener('click', function () {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    // 3. Configura formulário de criar tarefa
    const formTarefa = document.getElementById('form-criar-tarefa');
    if (formTarefa) {
        formTarefa.addEventListener('submit', function (event) {
            event.preventDefault();
            criarTarefa();
        });
    }

    // 4. Carrega tarefas existentes
    carregarTarefas();

    // 5. Configura sistema de questões
    const btnAddQuestao = document.getElementById('btn-add-questao');
    if (btnAddQuestao) {
        btnAddQuestao.addEventListener('click', adicionarNovaQuestao);
        adicionarNovaQuestao(); // Inicia com uma questão
    }
});




// LgcAdm-Function 4.1: se o aluno não estiver logado ele está expulso
function verificarAcessoAdmin() {
    const tipoUsuario = sessionStorage.getItem('tipoUsuario');
    if (tipoUsuario !== 'professor') {
        alert('Acesso restrito para professores!');
        window.location.href = 'index.html';
    }
}




// LgcAdm-Function 4.2: função para criar tarefa
function criarTarefa() {
    // Pega valores do formulário
    const titulo = document.getElementById('titulo-tarefa').value.trim();
    const dataEntrega = document.getElementById('data-entrega').value;
    const tipo = document.getElementById('tipo-tarefa').value;

    // Validação dos dados, evita questões com partes vazias
    if (!titulo) {
        mostrarMensagem('erro', 'Por favor, informe o título da tarefa!');
        document.getElementById('titulo-tarefa').focus();
        return;
    }

    if (!dataEntrega) {
        mostrarMensagem('erro', 'Por favor, selecione uma data de entrega!');
        document.getElementById('data-entrega').focus();
        return;
    }

    // Verifica se a data é no passado
    const hoje = new Date();
    const dataSelecionada = new Date(dataEntrega);
    if (dataSelecionada < hoje) {
        if (!confirm('A data de entrega está no passado. Deseja continuar?')) {
            return;
        }
    }

    // Coletar questões
    const questoes = [];
    let totalPontos = 0;
    let temQuestoesInvalidas = false;

    document.querySelectorAll('.questao-item').forEach((questaoDiv, index) => {
        // Verifica se é o template (deve ser ignorado)
        if (questaoDiv.id === 'questao-template') return;

        const enunciado = questaoDiv.querySelector('.enunciado-questao').value.trim();
        const tipoQuestao = questaoDiv.querySelector('.tipo-questao').value;
        const pontos = parseFloat(questaoDiv.querySelector('.pontos-questao').value) || 1.0;
        const markingScheme = questaoDiv.querySelector('.marking-scheme') ?
            questaoDiv.querySelector('.marking-scheme').value.trim() : '';

        // Valida questão
        if (!enunciado) {
            mostrarMensagem('erro', `Questão #${index + 1} está sem enunciado!`);
            temQuestoesInvalidas = true;
            return;
        }

        const questao = {
            id: Date.now() + index,
            enunciado: enunciado,
            tipo: tipoQuestao,
            pontos: pontos,
            markingScheme: markingScheme || "Sem marking scheme definido."
        };

        // Se for múltipla escolha, coletar alternativas
        if (tipoQuestao === 'multipla_escolha') {
            const alternativas = [];
            let respostaCorreta = null;

            questaoDiv.querySelectorAll('.alternativa-item').forEach((altDiv, altIndex) => {
                const texto = altDiv.querySelector('.alternativa-texto').value.trim();
                const correta = altDiv.querySelector('.alternativa-correta').checked;

                if (texto) {
                    alternativas.push(texto);
                    if (correta) respostaCorreta = altIndex;
                }
            });

            questao.alternativas = alternativas;
            questao.respostaCorreta = respostaCorreta;
        }

        questoes.push(questao);
        totalPontos += pontos;
    });

    // Validar se tem questões válidas
    if (temQuestoesInvalidas) {
        return;
    }

    if (questoes.length === 0) {
        mostrarMensagem('erro', 'Adicione pelo menos uma questão!');
        return;
    }

    // Criar objeto da tarefa
    const novaTarefa = {
        id: Date.now(),
        titulo: titulo,
        tipo: tipo,
        dataEntrega: dataEntrega,
        dataCriacao: new Date().toISOString(),
        status: 'ativa',
        professor: sessionStorage.getItem('emailUsuario') || 'Professor',
        questoes: questoes,
        totalPontos: totalPontos,
        entregas: 0,
        notaMedia: null
    };

    // Salva no localStorage
    salvarTarefa(novaTarefa);

    // Limpa formulário
    document.getElementById('form-criar-tarefa').reset();

    // Limpar questões
    document.getElementById('lista-questoes').innerHTML = '';
    window.contadorQuestoes = 0;
    adicionarNovaQuestao(); // Adicionar uma questão em branco

    // Atualiza lista e mostra mensagem
    carregarTarefas();
    mostrarMensagem('sucesso', `Tarefa "${titulo}" criada com ${questoes.length} questão(ões)!`);
}




// LgcAdm-Function 4.3: função para salvar tarefa no session storage
function salvarTarefa(tarefa) {
    // Pega tarefas existentes do localStorage
    let tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];

    // Adiciona nova tarefa
    tarefas.push(tarefa);

    // Salva de volta no localStorage
    localStorage.setItem('tarefas', JSON.stringify(tarefas));
    console.log(`✅ Tarefa "${tarefa.titulo}" salva com ID: ${tarefa.id}`);
}




// LgcAdm-Function 4.4: carregar tarefas quando necessário
function carregarTarefas() {
    console.log("📋 Carregando tarefas do professor...");

    const container = document.getElementById('lista-tarefas');
    const semTarefas = document.getElementById('sem-tarefas');

    // Verifica se os elementos existem
    if (!container || !semTarefas) {
        console.log("⚠️ Elementos ainda não carregados - tentando novamente...");
        setTimeout(carregarTarefas, 500);
        return;
    }

    // Pega tarefas do localStorage
    let tarefas = [];
    try {
        const tarefasJSON = localStorage.getItem('tarefas');
        tarefas = tarefasJSON ? JSON.parse(tarefasJSON) : [];
        console.log(`Encontradas ${tarefas.length} tarefas no total`);
    } catch (error) {
        console.error("❌ Erro ao ler localStorage:", error);
        mostrarMensagem('erro', 'Erro ao carregar tarefas!');
        return;
    }

    // Filtra apenas tarefas criadas por este professor
    const emailProfessor = sessionStorage.getItem('emailUsuario');
    const tarefasProfessor = tarefas.filter(t => {
        if (!t.professor) return true;
        return t.professor === emailProfessor;
    });

    console.log(`Professor tem ${tarefasProfessor.length} tarefas`);

    // Se não houver tarefas
    if (tarefasProfessor.length === 0) {
        semTarefas.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    semTarefas.style.display = 'none';

    // Ordena por data de criação (mais recente primeiro)
    tarefasProfessor.sort((a, b) => {
        const dataA = new Date(a.dataCriacao || 0);
        const dataB = new Date(b.dataCriacao || 0);
        return dataB - dataA;
    });

    // Limpa container
    container.innerHTML = '';

    // Adiciona cada tarefa
    tarefasProfessor.forEach(tarefa => {
        const item = document.createElement('div');
        item.className = 'tarefa-item';

        // Determina classe do badge baseado no tipo
        let classeBadge = 'badge-exercicio';
        if (tarefa.tipo === 'prova') classeBadge = 'badge-prova';
        if (tarefa.tipo === 'trabalho') classeBadge = 'badge-trabalho';

        // Formata tipo para exibição
        let tipoDisplay = 'Exercício';
        if (tarefa.tipo === 'prova') tipoDisplay = 'Prova';
        if (tarefa.tipo === 'trabalho') tipoDisplay = 'Trabalho';

        // Formata data de entrega
        const dataEntregaFormatada = formatarData(tarefa.dataEntrega);
        const dataCriacaoFormatada = formatarData(tarefa.dataCriacao);

        // Verifica se tem questões
        const numQuestoes = tarefa.questoes ? tarefa.questoes.length : 0;
        const totalPontos = tarefa.totalPontos || 0;

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h3 style="margin: 0; display: flex; align-items: center;">
                        ${tarefa.titulo}
                        <span class="badge-tipo ${classeBadge}">${tipoDisplay}</span>
                        <span class="badge-status badge-ativa">Ativa</span>
                    </h3>
                    <div style="opacity: 0.9; margin-top: 10px;">
                        <div style="display: flex; gap: 20px; font-size: 14px;">
                            <div><strong>📝 Questões:</strong> ${numQuestoes}</div>
                            <div><strong>⭐ Pontos:</strong> ${totalPontos}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 20px; align-items: center;">
                <div style="display: flex; gap: 20px; font-size: 14px; opacity: 0.8;">
                    <div>
                        <strong>📅 Entrega:</strong> ${dataEntregaFormatada}
                    </div>
                    <div>
                        <strong>👨‍🏫 Criada em:</strong> ${dataCriacaoFormatada}
                    </div>
                    <div>
                        <strong>📊 Entregas:</strong> ${tarefa.entregas || 0}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="editarTarefa(${tarefa.id})" class="btn-acao btn-editar">
                        ✏️ Editar
                    </button>
                    <button onclick="excluirTarefa(${tarefa.id})" class="btn-acao btn-excluir">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}




// LgcAdm-Function 4.5: Formata os dados do input(nesse caos data) em dados fáceis de ler pelo javascript
function formatarData(dataString) {
    //verifica se a data existe
    if (!dataString) return 'Data não definida';

    //verifica se a data é valida no formato javascript
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return 'Data inválida';

    //cira datas de referência, hoje e a data input
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    // Formatação para ver se a data é hoje ou amanhã
    if (data.toDateString() === hoje.toDateString()) {
        return 'Hoje';
    } else if (data.toDateString() === amanha.toDateString()) {
        return 'Amanhã';
    }

    return data.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    });
}




// LgcAdm-Function 4.6: Lógica da mensagem de feedback
function mostrarMensagem(tipo, texto) {
    let mensagemDiv;

    if (tipo === 'sucesso') {
        mensagemDiv = document.getElementById('mensagem-sucesso') || criarElementoMensagem('sucesso');
        mensagemDiv.style.background = 'rgba(76, 175, 80, 0.2)';
        mensagemDiv.style.borderColor = 'rgba(76, 175, 80, 0.4)';
        mensagemDiv.style.color = '#81c784';
    } else {
        mensagemDiv = document.getElementById('mensagem-erro') || criarElementoMensagem('erro');
        mensagemDiv.style.background = 'rgba(244, 67, 54, 0.2)';
        mensagemDiv.style.borderColor = 'rgba(244, 67, 54, 0.4)';
        mensagemDiv.style.color = '#f44336';
    }

    mensagemDiv.textContent = texto;
    mensagemDiv.style.display = 'block';

    // Remove a mensagem após 5 segundos
    setTimeout(() => {
        mensagemDiv.style.display = 'none';
    }, 5000);
}



// LgcAdm-Function 4.7: Criar o espaço da mensagem
function criarElementoMensagem(tipo) {
    //cria uma div
    const div = document.createElement('div');
    //da um id a div
    div.id = `mensagem-${tipo}`;
    //estiliza a div
    div.style.cssText = `
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        display: none;
    `;
    //escolhe onde vai inserir a div no geral
    const container = document.querySelector('.admin-container');
    //escolhe onde vai inserir a div especificamente
    const primeiraSecao = document.querySelector('.crud-section');
    container.insertBefore(div, primeiraSecao);

    return div;
}



// LgcAdm-Function 4.8: Função de editar tarefa (não feita ainda)
function editarTarefa(id) {
    alert(`Editar tarefa ${id} - Implemente esta função!`);
}



// LgcAdm-Function 4.9: Função para excluir tarefa
function excluirTarefa(id) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        let tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
        tarefas = tarefas.filter(t => t.id !== id);
        localStorage.setItem('tarefas', JSON.stringify(tarefas));
        carregarTarefas();
        mostrarMensagem('sucesso', 'Tarefa excluída com sucesso!');
    }
}



// LgcAdm-Function 4.10: se o aluno não estiver logado ele está expulso
function mostrarEntregasParaCorrecao() {
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];

    // Filtra apenas entregas sem nota (não corrigidas)
    const entregasSemNota = entregas.filter(e => e.notaTotal === null || e.notaTotal === undefined);

    console.log(`📝 ${entregasSemNota.length} entrega(s) aguardando correção`);

    if (entregasSemNota.length === 0) {
        mostrarMensagem('sucesso', '✅ Todas as entregas já foram corrigidas!');
        return;
    }

    // Cria interface para correção
    criarInterfaceCorrecao(entregasSemNota, tarefas);
}



// LgcAdm-Function 4.11: se o aluno não estiver logado ele está expulso
function criarInterfaceCorrecao(entregas, tarefas) {
    // Remove interface existente
    const interfaceExistente = document.getElementById('interface-correcao');
    if (interfaceExistente) interfaceExistente.remove();

    const container = document.querySelector('.admin-container');

    const interfaceDiv = document.createElement('div');
    interfaceDiv.id = 'interface-correcao';
    interfaceDiv.innerHTML = `
        <div class="crud-section">
            <h2>✏️ Correção de Tarefas</h2>
            <p style="opacity: 0.8; margin-bottom: 20px;">
                ${entregas.length} entrega(s) aguardando correção
            </p>
            
            <div id="lista-correcoes" class="lista-tarefas">
                <!-- Entregas serão listadas aqui -->
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="fecharInterfaceCorrecao()" class="btn-secundario">
                    Voltar ao Painel
                </button>
            </div>
        </div>
    `;

    container.appendChild(interfaceDiv);

    // Lista cada entrega
    const lista = document.getElementById('lista-correcoes');

    entregas.forEach(entrega => {
        const tarefa = tarefas.find(t => t.id === entrega.tarefaId);
        if (!tarefa) return;

        // Cria container para esta entrega
        const item = document.createElement('div');
        item.className = 'tarefa-item';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h3 style="margin: 0;">
                        ${tarefa.titulo}
                        <span style="font-size: 14px; opacity: 0.8;">(ID: ${entrega.id})</span>
                    </h3>
                    <p style="opacity: 0.9; margin-top: 5px;">
                        <strong>Aluno:</strong> ${entrega.alunoNome} (${entrega.alunoEmail})
                    </p>
                </div>
                <div>
                    <span class="badge-status" style="background: rgba(255, 193, 7, 0.2); color: #ffc107;">
                        Aguardando Correção
                    </span>
                </div>
            </div>
            
            <div id="questoes-correcao-${entrega.id}" style="margin-top: 20px;">
                <!-- Questões serão carregadas aqui -->
            </div>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                            Nota Total (0-${tarefa.totalPontos}):
                        </label>
                        <input type="number" id="nota-total-${entrega.id}" 
                               min="0" max="${tarefa.totalPontos}" step="0.5" 
                               style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                            Comentário/Feedback Geral:
                        </label>
                        <textarea id="comentario-${entrega.id}" rows="3" 
                                  style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white;"
                                  placeholder="Digite feedback geral para o aluno..."></textarea>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button onclick="salvarCorrecaoCompleta(${entrega.id}, ${tarefa.totalPontos})" class="btn-primario">
                        ✅ Salvar Correção Completa
                    </button>
                </div>
            </div>
        `;

        lista.appendChild(item);

        // Agora adiciona cada questão separadamente
        const questoesContainer = document.getElementById(`questoes-correcao-${entrega.id}`);

        if (!entrega.respostas || entrega.respostas.length === 0) {
            questoesContainer.innerHTML = '<p style="opacity: 0.7; font-style: italic;">Nenhuma resposta encontrada.</p>';
            return;
        }

        // Para cada questão da tarefa
        tarefa.questoes.forEach((questaoTarefa, questaoIndex) => {
            // Encontra a resposta do aluno para esta questão
            const respostaAluno = entrega.respostas.find(r => r.questaoId === questaoTarefa.id);

            const questaoDiv = document.createElement('div');
            questaoDiv.className = 'questao-correcao';
            questaoDiv.style.cssText = `
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                border-left: 4px solid #6366f1;
            `;

            questaoDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h4 style="margin: 0; font-size: 16px;">
                            Questão ${questaoIndex + 1} - ${questaoTarefa.pontos} pontos
                        </h4>
                        <p style="opacity: 0.9; margin-top: 8px; font-size: 15px;">
                            ${questaoTarefa.enunciado}
                        </p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- RESPOSTA DO ALUNO -->
                    <div>
                        <div style="background: rgba(99, 102, 241, 0.1); padding: 15px; border-radius: 8px;">
                            <strong style="color: #8b5cf6; display: block; margin-bottom: 8px;">✅ Resposta do Aluno:</strong>
                            <p style="white-space: pre-wrap; opacity: 0.9; margin: 0;">
                                ${respostaAluno ? respostaAluno.resposta || "(Não respondida)" : "(Não respondida)"}
                            </p>
                        </div>
                    </div>
                    
                    <!-- MARKING SCHEME (RESPOSTA ESPERADA) -->
                    <div>
                        <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px;">
                            <strong style="color: #4CAF50; display: block; margin-bottom: 8px;">📖 Marking Scheme:</strong>
                            <p style="white-space: pre-wrap; opacity: 0.9; margin: 0;">
                                ${questaoTarefa.markingScheme || "Sem marking scheme definido."}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- NOTA PARA ESTA QUESTÃO -->
                <div style="margin-top: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                        Nota para esta questão (0-${questaoTarefa.pontos}):
                    </label>
                    <input type="number" id="nota-questao-${entrega.id}-${questaoTarefa.id}" 
                           min="0" max="${questaoTarefa.pontos}" step="0.5" value="0"
                           style="width: 150px; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white;">
                    <small style="opacity: 0.7; margin-left: 10px;">
                        Máximo: ${questaoTarefa.pontos} pontos
                    </small>
                </div>
            `;

            questoesContainer.appendChild(questaoDiv);
        });
    });
}



// LgcAdm-Function 4.12: se o aluno não estiver logado ele está expulso
function salvarCorrecaoCompleta(entregaId, totalPontosTarefa) {
    const notaTotalInput = document.getElementById(`nota-total-${entregaId}`);
    const comentarioInput = document.getElementById(`comentario-${entregaId}`);

    const notaTotal = parseFloat(notaTotalInput.value);
    const comentario = comentarioInput.value.trim();

    // Validação
    if (isNaN(notaTotal) || notaTotal < 0 || notaTotal > totalPontosTarefa) {
        mostrarMensagem('erro', `Por favor, insira uma nota válida entre 0 e ${totalPontosTarefa}!`);
        notaTotalInput.focus();
        return;
    }

    // Atualiza a entrega
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];
    const entregaIndex = entregas.findIndex(e => e.id === entregaId);

    if (entregaIndex === -1) {
        mostrarMensagem('erro', 'Entrega não encontrada!');
        return;
    }

    // Coletar notas por questão
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    const tarefa = tarefas.find(t => t.id === entregas[entregaIndex].tarefaId);

    if (tarefa) {
        tarefa.questoes.forEach(questao => {
            const notaQuestaoInput = document.getElementById(`nota-questao-${entregaId}-${questao.id}`);
            if (notaQuestaoInput) {
                const notaQuestao = parseFloat(notaQuestaoInput.value) || 0;

                // Atualiza a resposta específica desta questão
                const respostaIndex = entregas[entregaIndex].respostas.findIndex(r => r.questaoId === questao.id);
                if (respostaIndex !== -1) {
                    entregas[entregaIndex].respostas[respostaIndex].nota = notaQuestao;
                }
            }
        });
    }

    // Atualiza dados gerais da entrega
    entregas[entregaIndex].notaTotal = notaTotal;
    entregas[entregaIndex].correcao = comentario || null;
    entregas[entregaIndex].status = 'corrigido';
    entregas[entregaIndex].dataCorrecao = new Date().toISOString();
    entregas[entregaIndex].professor = sessionStorage.getItem('emailUsuario');

    // Salva
    localStorage.setItem('entregas', JSON.stringify(entregas));

    // Atualiza nota média na tarefa
    atualizarNotaMediaTarefa(entregas[entregaIndex].tarefaId);

    // Feedback
    mostrarMensagem('sucesso', `✅ Correção salva! Nota total: ${notaTotal}/${totalPontosTarefa}`);

    // Remove o item da lista
    const item = document.getElementById(`nota-total-${entregaId}`).closest('.tarefa-item');
    if (item) item.remove();

    // Se não há mais itens, fecha a interface
    const lista = document.getElementById('lista-correcoes');
    if (lista.children.length === 0) {
        fecharInterfaceCorrecao();
    }
}



// LgcAdm-Function 4.13: se o aluno não estiver logado ele está expulso
function atualizarNotaMediaTarefa(tarefaId) {
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];

    // Filtra entregas desta tarefa com nota
    const entregasTarefa = entregas.filter(e =>
        e.tarefaId === tarefaId && e.notaTotal !== null
    );

    if (entregasTarefa.length === 0) return;

    // Calcula média
    const somaNotas = entregasTarefa.reduce((total, e) => total + e.notaTotal, 0);
    const media = somaNotas / entregasTarefa.length;

    // Atualiza tarefa
    const tarefaIndex = tarefas.findIndex(t => t.id === tarefaId);
    if (tarefaIndex !== -1) {
        tarefas[tarefaIndex].notaMedia = parseFloat(media.toFixed(2));
        localStorage.setItem('tarefas', JSON.stringify(tarefas));
    }
}



// LgcAdm-Function 4.14: se o aluno não estiver logado ele está expulso
function fecharInterfaceCorrecao() {
    const interfaceDiv = document.getElementById('interface-correcao');
    if (interfaceDiv) interfaceDiv.remove();
}

// =============================================
// SISTEMA DE QUESTÕES DINÂMICAS
// =============================================

// Usando window para garantir acesso global
window.contadorQuestoes = 0;



// LgcAdm-Function 4.15: se o aluno não estiver logado ele está expulso
function adicionarNovaQuestao() {
    console.log("🎯 adicionarNovaQuestao chamada!");

    window.contadorQuestoes++;
    const template = document.getElementById('questao-template');

    if (!template) {
        console.error("❌ Template não encontrado!");
        return;
    }

    const novaQuestao = template.cloneNode(true);
    novaQuestao.removeAttribute('id');
    novaQuestao.style.display = 'block';

    // Atualiza número da questão
    const numeroSpan = novaQuestao.querySelector('.questao-numero');
    if (numeroSpan) {
        numeroSpan.textContent = `Questão #${window.contadorQuestoes}`;
    }

    // Configurar evento para o botão de adicionar alternativa
    const btnAddAlt = novaQuestao.querySelector('.btn-add-alternativa');
    if (btnAddAlt) {
        btnAddAlt.addEventListener('click', function () {
            adicionarAlternativa(this);
        });
    }

    // Adicionar à lista
    const lista = document.getElementById('lista-questoes');
    if (lista) {
        lista.appendChild(novaQuestao);
        console.log("✅ Questão adicionada!");
    } else {
        console.error("❌ Lista de questões não encontrada!");
    }

    atualizarContadores();
}



// LgcAdm-Function 4.16: se o aluno não estiver logado ele está expulso
function removerQuestao(botao) {
    const questao = botao.closest('.questao-item');
    if (document.querySelectorAll('.questao-item:not([id="questao-template"])').length > 1) {
        questao.remove();
        window.contadorQuestoes = document.querySelectorAll('.questao-item:not([id="questao-template"])').length;
        renumberQuestoes();
        atualizarContadores();
    } else {
        alert('A tarefa precisa ter pelo menos uma questão!');
    }
}



// LgcAdm-Function 4.17: se o aluno não estiver logado ele está expulso
function renumberQuestoes() {
    const questoes = document.querySelectorAll('.questao-item:not([id="questao-template"])');
    questoes.forEach((questao, index) => {
        const numeroSpan = questao.querySelector('.questao-numero');
        if (numeroSpan) {
            numeroSpan.textContent = `Questão #${index + 1}`;
        }
    });
    window.contadorQuestoes = questoes.length;
}



// LgcAdm-Function 4.18: se o aluno não estiver logado ele está expulso
function alterarTipoQuestao(select) {
    const questao = select.closest('.questao-item');
    const alternativasContainer = questao.querySelector('.alternativas-container');

    if (select.value === 'multipla_escolha') {
        alternativasContainer.style.display = 'block';
    } else {
        alternativasContainer.style.display = 'none';
    }
}



// LgcAdm-Function 4.19: se o aluno não estiver logado ele está expulso
function adicionarAlternativa(botao) {
    const container = botao.closest('.alternativas-lista');
    const alternativaItem = container.querySelector('.alternativa-item').cloneNode(true);

    // Limpar valores
    alternativaItem.querySelector('.alternativa-texto').value = '';
    alternativaItem.querySelector('.alternativa-correta').checked = false;

    // Renomear radio button
    const questaoNum = botao.closest('.questao-item').querySelector('.questao-numero').textContent.match(/\d+/)[0];
    const radio = alternativaItem.querySelector('.alternativa-correta');
    radio.name = `correta_questao_${questaoNum}`;

    // Inserir antes do botão
    container.insertBefore(alternativaItem, botao);
}



// LgcAdm-Function 4.20: se o aluno não estiver logado ele está expulso
function atualizarContadores() {
    // Atualizar total de questões (ignorando o template)
    const totalQuestoes = document.querySelectorAll('.questao-item:not([id="questao-template"])').length;
    document.getElementById('total-questoes').textContent = totalQuestoes;

    // Calcular total de pontos
    let totalPontos = 0;
    document.querySelectorAll('.questao-item:not([id="questao-template"]) .pontos-questao').forEach(input => {
        totalPontos += parseFloat(input.value) || 0;
    });

    document.getElementById('total-pontos').textContent = totalPontos.toFixed(1);
}