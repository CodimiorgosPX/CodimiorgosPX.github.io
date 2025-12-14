// ----------------------------Lógica do Progresso(LgcPgs:3)------------
document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ progresso.js carregado!");

    // Verifica login
    verificarLoginAluno();

    // Carrega todos os dados
    carregarDadosProgresso();

    // Configura atualização automática a cada 30 segundos
    setInterval(carregarDadosProgresso, 30000);
});




// LgcPgs-Function 3.1: se o aluno não estiver logado ele está expulso
function verificarLoginAluno() {
    const tipoUsuario = sessionStorage.getItem('tipoUsuario');
    if (tipoUsuario !== 'aluno') {
        alert('Por favor, faça login como aluno primeiro!');
        window.location.href = 'index.html';
    }
}




// LgcPgs-Function 3.2: carregando dados da área do adm
function carregarDadosProgresso() {
    console.log("Carregando dados de progresso...");

    // Carrega dados do localStorage
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    const entregas = JSON.parse(localStorage.getItem('entregas')) || [];
    const emailAluno = sessionStorage.getItem('emailUsuario');

    // Filtra entregas deste aluno
    const entregasAluno = entregas.filter(e => e.alunoEmail === emailAluno);

    // Calcula estatísticas
    calcularEstatisticas(tarefas, entregasAluno);

    // Atualiza gráfico
    atualizarGrafico(entregasAluno, tarefas);

    // Mostra histórico com marking scheme
    mostrarHistoricoCompleto(entregasAluno, tarefas);

    // Mostra conquistas
    mostrarConquistas(entregasAluno);
}




// LgcPgs-Function 3.3: Calcular a estatísticas
function calcularEstatisticas(tarefas, entregasAluno) {
    const totalTarefas = tarefas.filter(t => t.status === 'ativa').length;
    const tarefasConcluidas = entregasAluno.length;
    const tarefasPendentes = totalTarefas - tarefasConcluidas;

    // Calcula tarefas atrasadas
    const hoje = new Date();
    let tarefasAtrasadas = 0;

    tarefas.forEach(tarefa => {
        const dataEntrega = new Date(tarefa.dataEntrega);
        const foiEntregue = entregasAluno.some(e => e.tarefaId === tarefa.id);

        if (!foiEntregue && dataEntrega < hoje) {
            tarefasAtrasadas++;
        }
    });

    // Calcula média com notaTotal (nova estrutura)
    let somaNotas = 0;
    let notasComNota = 0;

    entregasAluno.forEach(entrega => {
        if (entrega.notaTotal !== null && entrega.notaTotal !== undefined) {
            somaNotas += parseFloat(entrega.notaTotal);
            notasComNota++;
        }
    });

    const media = notasComNota > 0 ? (somaNotas / notasComNota).toFixed(1) : "0.0";

    // Atualiza interface
    document.getElementById('stat-concluidas').textContent = tarefasConcluidas;
    document.getElementById('stat-total').textContent = totalTarefas;
    document.getElementById('stat-pendentes').textContent = tarefasPendentes;
    document.getElementById('stat-atrasadas').textContent = tarefasAtrasadas;
    document.getElementById('stat-media').textContent = media;
}




// LgcPgs-Function 3.4: atualizar a estatísticas após entrega e correção
function atualizarGrafico(entregasAluno, tarefas) {
    const grafico = document.getElementById('grafico-barras');

    // Se não há entregas, mostra mensagem
    if (entregasAluno.length === 0) {
        grafico.innerHTML = '<p style="text-align: center; width: 100%; opacity: 0.7;">Nenhum dado disponível para gráfico.</p>';
        return;
    }

    // Agrupa por tipo de tarefa
    const tipos = {
        'exercicio': { nome: 'Exercícios', notas: [] },
        'prova': { nome: 'Provas', notas: [] },
        'trabalho': { nome: 'Trabalhos', notas: [] }
    };

    // Coleta notas por tipo (usando notaTotal agora)
    entregasAluno.forEach(entrega => {
        if (entrega.notaTotal !== null && entrega.notaTotal !== undefined) {
            // Encontra a tarefa correspondente
            const tarefa = tarefas.find(t => t.id === entrega.tarefaId);
            if (tarefa) {
                const tipo = tarefa.tipo || 'exercicio';
                if (tipos[tipo]) {
                    tipos[tipo].notas.push(parseFloat(entrega.notaTotal));
                }
            }
        }
    });

    // Calcula médias por tipo
    const dadosGrafico = [];
    for (const [tipo, dados] of Object.entries(tipos)) {
        if (dados.notas.length > 0) {
            const media = dados.notas.reduce((a, b) => a + b, 0) / dados.notas.length;
            dadosGrafico.push({
                tipo: dados.nome,
                media: media,
                quantidade: dados.notas.length
            });
        }
    }

    // Se não há dados com notas
    if (dadosGrafico.length === 0) {
        grafico.innerHTML = '<p style="text-align: center; width: 100%; opacity: 0.7;">Aguarde correção das tarefas.</p>';
        return;
    }

    // Encontra a maior média para escalar o gráfico
    const maiorMedia = Math.max(...dadosGrafico.map(d => d.media));
    const escala = 180 / (maiorMedia || 10); // 180px é a altura máxima

    // Gera as barras
    grafico.innerHTML = '';
    dadosGrafico.forEach(dado => {
        const alturaBarra = dado.media * escala;

        const barra = document.createElement('div');
        barra.className = 'barra';
        barra.style.height = `${alturaBarra}px`;
        barra.innerHTML = `
            <div class="barra-valor">${dado.media.toFixed(1)}</div>
            <div class="barra-label">${dado.tipo}<br>(${dado.quantidade})</div>
        `;

        grafico.appendChild(barra);
    });
}




// LgcPgs-Function 3.5: Função mostrar histórico
function mostrarHistoricoCompleto(entregasAluno, tarefas) {
    const container = document.getElementById('historico-tarefas');

    if (entregasAluno.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.7;">Nenhuma entrega registrada ainda.</p>';
        return;
    }

    // Ordena por data (mais recente primeiro)
    entregasAluno.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));

    container.innerHTML = '';

    entregasAluno.forEach(entrega => {
        // Encontra a tarefa correspondente
        const tarefa = tarefas.find(t => t.id === entrega.tarefaId);

        if (!tarefa) return;

        const dataFormatada = formatarData(entrega.dataEntrega);
        const notaTotal = entrega.notaTotal !== null ? parseFloat(entrega.notaTotal) : null;
        const foiCorrigida = entrega.status === 'corrigido' && notaTotal !== null;

        // Determina classe da nota
        let classeNota = 'nota-media';
        let textoNota = 'Aguardando correção';

        if (foiCorrigida) {
            // Calcula porcentagem baseada no total de pontos da tarefa
            const porcentagem = (notaTotal / (tarefa.totalPontos || 10)) * 100;

            if (porcentagem >= 80) classeNota = 'nota-alta';
            else if (porcentagem >= 60) classeNota = 'nota-media';
            else classeNota = 'nota-baixa';

            textoNota = `${notaTotal.toFixed(1)}/${tarefa.totalPontos || 10}`;
        }

        // Cria o item principal
        const item = document.createElement('div');
        item.className = 'tarefa-item-progresso';
        item.innerHTML = `
            <div style="flex: 1; cursor: pointer;" onclick="toggleDetalhesTarefa(${entrega.id})">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong>${tarefa.titulo}</strong>
                        <div style="font-size: 12px; opacity: 0.8;">
                            ${dataFormatada} • ${tarefa.tipo}
                            ${foiCorrigida ? ' • ✅ Corrigida' : ' • ⏳ Aguardando correção'}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 120px;">
                        ${foiCorrigida ?
                `<span class="nota-badge ${classeNota}">${textoNota}</span>` :
                '<span style="opacity: 0.6; font-size: 14px;">Aguardando correção</span>'
            }
                    </div>
                </div>
            </div>
        `;

        container.appendChild(item);

        // Container para detalhes (inicialmente escondido)
        const detalhesDiv = document.createElement('div');
        detalhesDiv.id = `detalhes-${entrega.id}`;
        detalhesDiv.style.cssText = `
            display: none;
            margin-top: 10px;
            padding: 15px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            border-left: 4px solid #6366f1;
        `;

        // Se foi corrigida, mostrar marking scheme e detalhes
        if (foiCorrigida) {
            let detalhesHTML = '';

            // Feedback geral do professor
            if (entrega.correcao) {
                detalhesHTML += `
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 18px; margin-right: 8px;">💬</span>
                            <strong>Feedback do Professor:</strong>
                        </div>
                        <p style="opacity: 0.9; margin: 0; padding-left: 26px;">${entrega.correcao}</p>
                    </div>
                `;
            }

            // Data da correção
            if (entrega.dataCorrecao) {
                const dataCorrecaoFormatada = formatarData(entrega.dataCorrecao);
                detalhesHTML += `
                    <div style="margin-bottom: 20px; font-size: 13px; opacity: 0.7;">
                        📅 Corrigida em: ${dataCorrecaoFormatada}
                    </div>
                `;
            }

            // Detalhes por questão
            if (entrega.respostas && entrega.respostas.length > 0 && tarefa.questoes) {
                detalhesHTML += '<div style="margin-top: 20px;">';
                detalhesHTML += '<h4 style="margin: 0 0 15px 0; font-size: 16px;">📝 Detalhes por Questão:</h4>';

                tarefa.questoes.forEach((questao, index) => {
                    const respostaAluno = entrega.respostas.find(r => r.questaoId === questao.id);
                    const notaQuestao = respostaAluno ? respostaAluno.nota : null;

                    detalhesHTML += `
                        <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <strong>Questão ${index + 1}</strong>
                                <span style="opacity: 0.8;">${questao.pontos} pontos</span>
                            </div>
                            
                            <div style="margin-bottom: 10px;">
                                <div style="font-size: 14px; opacity: 0.9;">${questao.enunciado}</div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                                <!-- RESPOSTA DO ALUNO -->
                                <div>
                                    <div style="background: rgba(99, 102, 241, 0.08); padding: 12px; border-radius: 6px;">
                                        <strong style="color: #8b5cf6; font-size: 13px;">Sua Resposta:</strong>
                                        <p style="margin: 8px 0 0 0; font-size: 14px; white-space: pre-wrap;">${respostaAluno ? respostaAluno.resposta || "(Não respondida)" : "(Não respondida)"}</p>
                                    </div>
                                </div>
                                
                                <!-- MARKING SCHEME -->
                                <div>
                                    <div style="background: rgba(76, 175, 80, 0.08); padding: 12px; border-radius: 6px;">
                                        <strong style="color: #4CAF50; font-size: 13px;">📖 Marking Scheme:</strong>
                                        <p style="margin: 8px 0 0 0; font-size: 14px; white-space: pre-wrap;">${questao.markingScheme || "Sem marking scheme definido."}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- NOTA DA QUESTÃO -->
                            ${notaQuestao !== null ? `
                                <div style="margin-top: 12px; text-align: right;">
                                    <span style="background: ${notaQuestao >= questao.pontos * 0.8 ? 'rgba(76, 175, 80, 0.2)' : notaQuestao >= questao.pontos * 0.6 ? 'rgba(255, 193, 7, 0.2)' : 'rgba(244, 67, 54, 0.2)'}; 
                                          color: ${notaQuestao >= questao.pontos * 0.8 ? '#4CAF50' : notaQuestao >= questao.pontos * 0.6 ? '#FFC107' : '#F44336'};
                                          padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                                        Nota: ${notaQuestao.toFixed(1)}/${questao.pontos}
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });

                detalhesHTML += '</div>';
            }

            detalhesDiv.innerHTML = detalhesHTML;
        } else {
            // Se não foi corrigida ainda
            detalhesDiv.innerHTML = `
                <div style="text-align: center; padding: 20px; opacity: 0.7;">
                    <p>⏳ Aguardando correção do professor...</p>
                    ${entrega.respostas && entrega.respostas.length > 0 ?
                    '<p style="font-size: 13px; margin-top: 10px;">Sua resposta foi enviada e está aguardando avaliação.</p>' :
                    '<p style="font-size: 13px; margin-top: 10px;">Você ainda não enviou respostas para esta tarefa.</p>'
                }
                </div>
            `;
        }

        container.appendChild(detalhesDiv);
    });
}

// Função para mostrar/ocultar detalhes da tarefa
window.toggleDetalhesTarefa = function (entregaId) {
    const detalhes = document.getElementById(`detalhes-${entregaId}`);
    if (detalhes) {
        detalhes.style.display = detalhes.style.display === 'none' ? 'block' : 'none';
    }
};




// LgcPgs-Function 3.6: Função para formatar dados em dados mais fáceis de ler pelo javascript
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




// LgcPgs-Function 3.7: Função para mostrar conquistas
function mostrarConquistas(entregasAluno) {
    const container = document.getElementById('conquistas');
    if (!container) return;

    const conquistas = [];
    const tarefasCorrigidas = entregasAluno.filter(e => e.status === 'corrigido').length;

    // Conquistas baseadas em desempenho
    if (tarefasCorrigidas >= 1) {
        conquistas.push({ icone: '🏆', titulo: 'Primeira Entrega', desc: 'Completou 1 tarefa' });
    }
    if (tarefasCorrigidas >= 5) {
        conquistas.push({ icone: '⭐', titulo: 'Dedicado', desc: '5 tarefas completadas' });
    }

    // Conquista por nota alta
    const mediaAlta = entregasAluno.some(e => {
        const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
        const tarefa = tarefas.find(t => t.id === e.tarefaId);
        if (e.notaTotal && tarefa) {
            const porcentagem = (e.notaTotal / tarefa.totalPontos) * 100;
            return porcentagem >= 90;
        }
        return false;
    });

    if (mediaAlta) {
        conquistas.push({ icone: '👑', titulo: 'Excelência', desc: 'Nota acima de 90%' });
    }

    // Conquista por pontualidade
    const hoje = new Date();
    const entregasNoPrazo = entregasAluno.filter(e => {
        const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
        const tarefa = tarefas.find(t => t.id === e.tarefaId);
        if (tarefa && e.dataEntrega) {
            const dataEntrega = new Date(tarefa.dataEntrega);
            const dataEnvio = new Date(e.dataEntrega);
            return dataEnvio <= dataEntrega;
        }
        return false;
    }).length;

    if (entregasNoPrazo >= 3) {
        conquistas.push({ icone: '⏰', titulo: 'Pontual', desc: '3 entregas no prazo' });
    }

    // Exibe conquistas
    if (conquistas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; opacity: 0.7; grid-column: 1 / -1;">
                <p>Continue completando tarefas para desbloquear conquistas!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    conquistas.forEach(conquista => {
        const div = document.createElement('div');
        div.className = 'conquista';
        div.innerHTML = `
            <div class="conquista-icone">${conquista.icone}</div>
            <div class="conquista-titulo">${conquista.titulo}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">${conquista.desc}</div>
        `;
        container.appendChild(div);
    });
}