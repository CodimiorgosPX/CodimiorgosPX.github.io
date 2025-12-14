// Lógica do Aluno(LgcAl:2)
// LgcAl:2.1 Analisa se a página carregou, caso sim...
document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ Área do aluno carregada!");

    // LgcAl:2.1.2 Verifica se está logado
    verificarLoginAluno();

    // LgcAl:2.3 botão de logot
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (confirm('Tem certeza que deseja sair?')) {
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }

    // LgcAl:3 - Carrega as tarefas do aluno (para o alerta em Tauros)
    carregarTarefasAluno();

    // LgcAl:4 - Configura atualização automática (a cada 30 segundos)
    setInterval(carregarTarefasAluno, 30000);

    // LgcAl:5 - REMOVIDO: Não chama setupConstellations()
    // Os links do HTML já funcionam sozinhos
});

// =============================================
// FUNÇÕES DA ÁREA DO ALUNO
// =============================================

// LgcAl:1.1 - Verifica se o usuário está logado como aluno
function verificarLoginAluno() {
    const estaLogado = sessionStorage.getItem('logado');
    const tipoUsuario = sessionStorage.getItem('tipoUsuario');

    if (!estaLogado || tipoUsuario !== 'aluno') {
        alert('Por favor, faça login como aluno primeiro!');
        window.location.href = 'index.html';
    }
}

// LgcAl:2.0 - Função principal para carregar tarefas do aluno
function carregarTarefasAluno() {
    // LgcAl:2.1 Pega as tarefas do banco de dados (localStorage)
    const tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];

    console.log('🔍 Verificando tarefas... Total:', tarefas.length);

    // LgcAl:2.2 Filtra apenas as tarefas ativas
    const tarefasAtivas = tarefas.filter(t => t.status === 'ativa');

    console.log('📋 Tarefas ativas encontradas:', tarefasAtivas.length);
    if (tarefasAtivas.length > 0) {
        console.log('📝 Lista de tarefas ativas:', tarefasAtivas.map(t => t.titulo));
    }

    // LgcAl:2.3 Encontra a constelação de Tauros no HTML
    const constelacaoTauros = document.getElementById('tauros');

    if (!constelacaoTauros) {
        console.error('❌ Elemento #tauros não encontrado!');
        return;
    }

    // LgcAl:2.4 Verifica se existem tarefas pendentes
    const temTarefasPendentes = tarefasAtivas.length > 0;

    console.log('💡 Tem tarefas pendentes?', temTarefasPendentes);

    // LgcAl:2.5 Aplica ou remove o efeito visual de alerta
    if (temTarefasPendentes) {
        // LgcAl:2.5.1 Se TEM tarefas: adiciona classe de alerta
        constelacaoTauros.classList.add('alerta-tarefas-pendentes');
        console.log(`⚠️ ALERTA ATIVADO: ${tarefasAtivas.length} tarefa(s) pendente(s)`);
    } else {
        // LgcAl:2.5.2 Se NÃO TEM tarefas: remove classe de alerta
        constelacaoTauros.classList.remove('alerta-tarefas-pendentes');
        console.log("✅ Nenhuma tarefa pendente - alerta DESATIVADO");
    }

    // LgcAl:2.6 Verifica visualmente no console
    console.log(`🎯 Status final: ${temTarefasPendentes ? 'COM alerta vermelho' : 'SEM alerta vermelho'}`);
}

// LgcTrf-Function.css 2.7.1: Função para calcular a responsividad de Orion a todo instante
function ajustarOrion() {
    console.log(document.querySelector('.area-aluno'));

    const area = document.querySelector('.area-aluno');
    const rect = area.getBoundingClientRect();

    const posOrix = rect.width * 0.50 - 170;
    const posOriy = rect.height * 0.54;

    document.documentElement.style.setProperty('--posicaoorionx', posOrix + 'px');
    document.documentElement.style.setProperty('--posicaooriony', posOriy + 'px');
}

window.addEventListener('resize', ajustarOrion);
ajustarOrion();

// LgcTrf-Function.css 2.7.1: Função para calcular a responsividad de Orion a todo instante
function ajustarTauros() {
    console.log(document.querySelector('.area-aluno'));

    const area = document.querySelector('.area-aluno');
    const rect = area.getBoundingClientRect();

    const posTaux = rect.width * 0.50 - 120;
    const posTauy = rect.height * 0.52;

    document.documentElement.style.setProperty('--posicaotaurosx', posTaux + 'px');
    document.documentElement.style.setProperty('--posicaotaurosy', posTauy + 'px');
}

window.addEventListener('resize', ajustarTauros);
ajustarTauros();

function ajustarPerseus() {
    console.log(document.querySelector('.area-aluno'));

    const area = document.querySelector('.area-aluno');
    const rect = area.getBoundingClientRect();

    const posPerx = rect.width * 0.50 - 40;
    const posPery = rect.height * 0.39;

    document.documentElement.style.setProperty('--posicaoperseusx', posPerx + 'px');
    document.documentElement.style.setProperty('--posicaoperseusy', posPery + 'px');
}

window.addEventListener('resize', ajustarPerseus);
ajustarPerseus();



window.addEventListener('resize', ajustarConstelacao);
ajustarConstelacao();

function verdados() {
    const altura = window.innerHeight;
    const largura = window.innerWidth;

    document.getElementById('saida').textContent =
        `Largura: ${largura}px | Altura: ${altura}px`;
}

document
    .getElementById('botaodeb')
    .addEventListener('click', verdados);

// LgcAl:5.1 - REMOVIDA: Função setupConstellations()
// Não é mais necessária porque os links do HTML já funcionam